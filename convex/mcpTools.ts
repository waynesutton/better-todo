// Internal functions behind the MCP tools in convex/mcp.ts.
// Every function takes the verified MCP user, acts only as user.userId, and
// re-checks ownership of every id the model sends. Writes log one mcpActivity
// row in the same transaction.

import { ConvexError, v } from "convex/values";
import { vMcpUser, type McpUser } from "@convex-dev/mcp";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getUserTimezone, isValidDate, todayFor } from "./lib/time";
import {
  createNoteForUser,
  createTodoForUser,
  getOwnedFullPageNote,
  getOwnedNote,
  getOwnedTodo,
  updateTodoForUser,
} from "./lib/userData";

const vUser = vMcpUser(v.string());

const PREVIEW_CHARS = 200;
const MAX_NOTE_CHARS = 500_000;

// Shared result shapes (mirrored as tool `returns` in convex/mcp.ts)
export const vTodoOut = v.object({
  id: v.string(),
  content: v.string(),
  completed: v.boolean(),
  type: v.union(v.literal("todo"), v.literal("h1"), v.literal("h2"), v.literal("h3")),
  date: v.optional(v.string()),
  project: v.optional(v.string()),
});

export const vNoteSummary = v.object({
  id: v.string(),
  kind: v.union(v.literal("note"), v.literal("fullPageNote")),
  title: v.string(),
  preview: v.string(),
  date: v.optional(v.string()),
  project: v.optional(v.string()),
});

export const vCandidate = v.object({
  id: v.string(),
  text: v.string(),
  date: v.optional(v.string()),
  project: v.optional(v.string()),
});

// ---------- helpers ----------

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function requireScope(user: McpUser, scope: string) {
  if (!user.scopes.includes(scope)) {
    throw new ConvexError(`This connection does not have the ${scope} scope.`);
  }
}

// Read tools can return several kinds; each kind needs its own read scope
function canRead(user: McpUser, scope: "todos:read" | "notes:read") {
  return user.scopes.includes(scope);
}

function requireDate(date: string) {
  if (!isValidDate(date)) {
    throw new ConvexError(`"${date}" is not a valid date. Use YYYY-MM-DD.`);
  }
}

// Date from the model, or today in the user's timezone
async function resolveDate(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  date: string | undefined,
  now: number,
): Promise<string> {
  if (date !== undefined) {
    requireDate(date);
    return date;
  }
  return todayFor(await getUserTimezone(ctx, userId), now);
}

async function getOwnedFolder(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  folderId: Id<"folders">,
): Promise<Doc<"folders"> | null> {
  const folder = await ctx.db.get(folderId);
  if (!folder || folder.userId !== userId) {
    return null;
  }
  return folder;
}

// Names for the folders referenced by a set of rows, owner-checked
async function folderNames(
  ctx: QueryCtx,
  userId: string,
  folderIds: Array<Id<"folders"> | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(folderIds.filter((id): id is Id<"folders"> => !!id))];
  const folders = await Promise.all(unique.map((id) => getOwnedFolder(ctx, userId, id)));
  const names = new Map<string, string>();
  for (const folder of folders) {
    if (folder) names.set(folder._id, folder.name);
  }
  return names;
}

function todoOut(todo: Doc<"todos">, project?: string) {
  return {
    id: todo._id as string,
    content: todo.content,
    completed: todo.completed,
    type: todo.type,
    date: todo.date,
    project,
  };
}

function noteTitle(title: string | undefined, content: string): string {
  if (title && title.trim()) return title.trim();
  const firstLine = content.split("\n").find((line) => line.trim());
  return firstLine ? clip(firstLine.replace(/^#+\s*/, ""), 80) : "Untitled";
}

async function logActivity(
  ctx: MutationCtx,
  user: McpUser,
  entry: {
    tool: string;
    summary: string;
    targetDate?: string;
    matchConfidence?: number;
  },
) {
  await ctx.db.insert("mcpActivity", {
    userId: user.userId,
    connectionId: user.connectionId,
    clientId: user.clientId,
    tool: entry.tool,
    summary: clip(entry.summary, 120),
    targetDate: entry.targetDate,
    matchConfidence: entry.matchConfidence,
    createdAt: Date.now(),
  });
}

// Same message for "missing" and "not yours" so ids can't be probed
function notFound(kind: "todo" | "note" | "project"): ConvexError<string> {
  return new ConvexError(
    `No ${kind} with that id. Call list_today or search to get current ids.`,
  );
}

async function loadOwnedTodo(ctx: MutationCtx, userId: string, rawId: string) {
  const id = ctx.db.normalizeId("todos", rawId);
  const todo = id ? await getOwnedTodo(ctx, userId, id) : null;
  if (!todo) throw notFound("todo");
  return todo;
}

type OwnedNote =
  | { kind: "note"; doc: Doc<"notes"> }
  | { kind: "fullPageNote"; doc: Doc<"fullPageNotes"> };

// Note ids may point at a day/project note or a full-page note
async function loadOwnedAnyNote(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  rawId: string,
): Promise<OwnedNote> {
  const noteId = ctx.db.normalizeId("notes", rawId);
  if (noteId) {
    const doc = await getOwnedNote(ctx, userId, noteId);
    if (doc) return { kind: "note", doc };
  }
  const pageId = ctx.db.normalizeId("fullPageNotes", rawId);
  if (pageId) {
    const doc = await getOwnedFullPageNote(ctx, userId, pageId);
    if (doc) return { kind: "fullPageNote", doc };
  }
  throw notFound("note");
}

// ---------- reads ----------

export const listFolders = internalQuery({
  args: { user: vUser },
  returns: v.array(v.object({ id: v.id("folders"), name: v.string() })),
  handler: async (ctx, { user }) => {
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .take(255);
    return folders
      .filter((f) => !f.archived)
      .sort((a, b) => a.order - b.order)
      .map((f) => ({ id: f._id, name: f.name }));
  },
});

export const listDay = internalQuery({
  args: { user: vUser, date: v.optional(v.string()), now: v.number() },
  returns: v.object({
    date: v.string(),
    timezone: v.string(),
    todos: v.array(vTodoOut),
    notes: v.array(vNoteSummary),
  }),
  handler: async (ctx, { user, date, now }) => {
    const timezone = await getUserTimezone(ctx, user.userId);
    const day = date ?? todayFor(timezone, now);
    requireDate(day);

    const [todos, notes, pages] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user.userId).eq("date", day))
        .take(300),
      ctx.db
        .query("notes")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user.userId).eq("date", day))
        .take(50),
      ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user.userId).eq("date", day))
        .take(50),
    ]);

    // Match the day view: no backlog or project todos, no archived pages
    const dayTodos = !canRead(user, "todos:read")
      ? []
      : todos
          .filter((t) => !t.backlog && !t.folderId)
          .sort((a, b) => a.order - b.order)
          .map((t) => todoOut(t));

    const dayNotes = !canRead(user, "notes:read") ? [] : [
      ...notes
        .filter((n) => !n.folderId)
        .map((n) => ({
          id: n._id as string,
          kind: "note" as const,
          title: noteTitle(n.title, n.content),
          preview: clip(n.content, PREVIEW_CHARS),
          date: n.date,
        })),
      ...pages
        .filter((p) => !p.folderId && !p.archived)
        .map((p) => ({
          id: p._id as string,
          kind: "fullPageNote" as const,
          title: noteTitle(p.title, p.content),
          preview: clip(p.content, PREVIEW_CHARS),
          date: p.date,
        })),
    ];

    return { date: day, timezone, todos: dayTodos, notes: dayNotes };
  },
});

export const todoCandidates = internalQuery({
  args: {
    user: vUser,
    match: v.string(),
    now: v.number(),
    includeCompleted: v.boolean(),
  },
  returns: v.array(vCandidate),
  handler: async (ctx, { user, match, now, includeCompleted }) => {
    const today = todayFor(await getUserTimezone(ctx, user.userId), now);

    const [todays, found] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user.userId).eq("date", today))
        .take(100),
      ctx.db
        .query("todos")
        .withSearchIndex("search_content", (q) =>
          q.search("content", match).eq("userId", user.userId),
        )
        .take(25),
    ]);

    const seen = new Set<string>();
    const rows: Array<Doc<"todos">> = [];
    // Search hits first (most relevant), then today's list
    for (const todo of [...found, ...todays]) {
      if (seen.has(todo._id)) continue;
      seen.add(todo._id);
      if (todo.type !== "todo") continue;
      if (!includeCompleted && todo.completed) continue;
      rows.push(todo);
      if (rows.length >= 25) break;
    }

    const names = await folderNames(ctx, user.userId, rows.map((t) => t.folderId));
    return rows.map((t) => ({
      id: t._id as string,
      text: t.content,
      date: t.date,
      project: t.folderId ? names.get(t.folderId) : undefined,
    }));
  },
});

export const noteCandidates = internalQuery({
  args: { user: vUser, match: v.string(), now: v.number() },
  returns: v.array(vCandidate),
  handler: async (ctx, { user, match, now }) => {
    const today = todayFor(await getUserTimezone(ctx, user.userId), now);

    const [todays, noteTitles, pageTitles, pageBodies] = await Promise.all([
      ctx.db
        .query("notes")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user.userId).eq("date", today))
        .take(25),
      ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", match).eq("userId", user.userId),
        )
        .take(10),
      ctx.db
        .query("fullPageNotes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", match).eq("userId", user.userId),
        )
        .take(10),
      ctx.db
        .query("fullPageNotes")
        .withSearchIndex("search_content", (q) =>
          q.search("content", match).eq("userId", user.userId),
        )
        .take(5),
    ]);

    const seen = new Set<string>();
    const out: Array<{ id: string; text: string; date?: string; folderId?: Id<"folders"> }> = [];
    const push = (doc: Doc<"notes"> | Doc<"fullPageNotes">) => {
      if (seen.has(doc._id) || out.length >= 25) return;
      if ("archived" in doc && doc.archived) return;
      seen.add(doc._id);
      out.push({
        id: doc._id,
        text: noteTitle(doc.title, doc.content),
        date: doc.date,
        folderId: doc.folderId,
      });
    };
    [...noteTitles, ...pageTitles, ...pageBodies, ...todays].forEach(push);

    const names = await folderNames(ctx, user.userId, out.map((n) => n.folderId));
    return out.map((n) => ({
      id: n.id,
      text: n.text,
      date: n.date,
      project: n.folderId ? names.get(n.folderId) : undefined,
    }));
  },
});

export const search = internalQuery({
  args: { user: vUser, query: v.string(), limit: v.number() },
  returns: v.array(
    v.object({
      kind: v.union(v.literal("todo"), v.literal("note"), v.literal("fullPageNote")),
      id: v.string(),
      title: v.string(),
      preview: v.string(),
      date: v.optional(v.string()),
      project: v.optional(v.string()),
      completed: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, { user, query, limit }) => {
    const per = Math.min(limit, 25);
    const [todos, noteBodies, noteTitles, pageBodies, pageTitles] = await Promise.all([
      ctx.db
        .query("todos")
        .withSearchIndex("search_content", (q) =>
          q.search("content", query).eq("userId", user.userId),
        )
        .take(per),
      ctx.db
        .query("notes")
        .withSearchIndex("search_content", (q) =>
          q.search("content", query).eq("userId", user.userId),
        )
        .take(per),
      ctx.db
        .query("notes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", query).eq("userId", user.userId),
        )
        .take(per),
      ctx.db
        .query("fullPageNotes")
        .withSearchIndex("search_content", (q) =>
          q.search("content", query).eq("userId", user.userId),
        )
        .take(per),
      ctx.db
        .query("fullPageNotes")
        .withSearchIndex("search_title", (q) =>
          q.search("title", query).eq("userId", user.userId),
        )
        .take(per),
    ]);

    const names = await folderNames(ctx, user.userId, [
      ...todos.map((t) => t.folderId),
      ...noteBodies.map((n) => n.folderId),
      ...noteTitles.map((n) => n.folderId),
      ...pageBodies.map((p) => p.folderId),
      ...pageTitles.map((p) => p.folderId),
    ]);
    const projectOf = (folderId: Id<"folders"> | undefined) =>
      folderId ? names.get(folderId) : undefined;

    const seen = new Set<string>();
    const results: Array<{
      kind: "todo" | "note" | "fullPageNote";
      id: string;
      title: string;
      preview: string;
      date?: string;
      project?: string;
      completed?: boolean;
    }> = [];

    // Interleave kinds so one busy table doesn't crowd out the others
    const showTodos = canRead(user, "todos:read");
    const showNotes = canRead(user, "notes:read");
    const lists = [
      todos.map((t) => ({
        kind: "todo" as const,
        id: t._id as string,
        title: clip(t.content, 120),
        preview: clip(t.content, PREVIEW_CHARS),
        date: t.date,
        project: projectOf(t.folderId),
        completed: t.completed,
      })),
      [...noteTitles, ...noteBodies].map((n) => ({
        kind: "note" as const,
        id: n._id as string,
        title: noteTitle(n.title, n.content),
        preview: clip(n.content, PREVIEW_CHARS),
        date: n.date,
        project: projectOf(n.folderId),
      })),
      [...pageTitles, ...pageBodies]
        .filter((p) => !p.archived)
        .map((p) => ({
          kind: "fullPageNote" as const,
          id: p._id as string,
          title: noteTitle(p.title, p.content),
          preview: clip(p.content, PREVIEW_CHARS),
          date: p.date,
          project: projectOf(p.folderId),
        })),
    ];
    const visible = [showTodos ? lists[0] : [], showNotes ? lists[1] : [], showNotes ? lists[2] : []];
    for (let i = 0; results.length < limit; i++) {
      let added = false;
      for (const list of visible) {
        const item = list[i];
        if (!item) continue;
        added = true;
        if (seen.has(item.id) || results.length >= limit) continue;
        seen.add(item.id);
        results.push(item);
      }
      if (!added) break;
    }
    return results;
  },
});

export const getProject = internalQuery({
  args: { user: vUser, folderId: v.id("folders") },
  returns: v.object({
    id: v.string(),
    name: v.string(),
    todos: v.array(vTodoOut),
    completedCount: v.number(),
    notes: v.array(vNoteSummary),
  }),
  handler: async (ctx, { user, folderId }) => {
    const folder = await getOwnedFolder(ctx, user.userId, folderId);
    if (!folder) throw notFound("project");

    const [todos, notes, pages] = await Promise.all([
      ctx.db
        .query("todos")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", user.userId).eq("folderId", folderId),
        )
        .take(300),
      ctx.db
        .query("notes")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", user.userId).eq("folderId", folderId),
        )
        .take(50),
      ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", user.userId).eq("folderId", folderId),
        )
        .take(50),
    ]);

    const open = todos.filter((t) => !t.completed).sort((a, b) => a.order - b.order);
    const showTodos = canRead(user, "todos:read");
    return {
      id: folder._id as string,
      name: folder.name,
      todos: showTodos ? open.map((t) => todoOut(t, folder.name)) : [],
      completedCount: showTodos ? todos.length - open.length : 0,
      notes: !canRead(user, "notes:read") ? [] : [
        ...notes.map((n) => ({
          id: n._id as string,
          kind: "note" as const,
          title: noteTitle(n.title, n.content),
          preview: clip(n.content, PREVIEW_CHARS),
          project: folder.name,
        })),
        ...pages
          .filter((p) => !p.archived)
          .map((p) => ({
            id: p._id as string,
            kind: "fullPageNote" as const,
            title: noteTitle(p.title, p.content),
            preview: clip(p.content, PREVIEW_CHARS),
            project: folder.name,
          })),
      ],
    };
  },
});

export const getNote = internalQuery({
  args: { user: vUser, noteId: v.string(), maxChars: v.number() },
  returns: v.object({
    id: v.string(),
    kind: v.union(v.literal("note"), v.literal("fullPageNote")),
    title: v.string(),
    content: v.string(),
    truncated: v.boolean(),
    date: v.optional(v.string()),
    project: v.optional(v.string()),
  }),
  handler: async (ctx, { user, noteId, maxChars }) => {
    const note = await loadOwnedAnyNote(ctx, user.userId, noteId);
    const doc = note.doc;
    const names = await folderNames(ctx, user.userId, [doc.folderId]);
    return {
      id: doc._id as string,
      kind: note.kind,
      title: noteTitle(doc.title, doc.content),
      content: doc.content.slice(0, maxChars),
      truncated: doc.content.length > maxChars,
      date: doc.date,
      project: doc.folderId ? names.get(doc.folderId) : undefined,
    };
  },
});

// ---------- writes ----------

export const addTodo = internalMutation({
  args: {
    user: vUser,
    content: v.string(),
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    position: v.union(v.literal("top"), v.literal("bottom")),
    type: v.union(v.literal("todo"), v.literal("h1"), v.literal("h2"), v.literal("h3")),
    matchConfidence: v.optional(v.number()),
  },
  returns: vTodoOut,
  handler: async (ctx, args) => {
    requireScope(args.user, "todos:write");
    const userId = args.user.userId;

    let folder: Doc<"folders"> | null = null;
    let date: string | undefined;
    if (args.folderId) {
      folder = await getOwnedFolder(ctx, userId, args.folderId);
      if (!folder || folder.archived) throw notFound("project");
    } else {
      date = await resolveDate(ctx, userId, args.date, Date.now());
    }

    const todoId = await createTodoForUser(ctx, userId, {
      content: args.content,
      type: args.type,
      date,
      folderId: folder?._id,
      position: args.position,
    });

    await logActivity(ctx, args.user, {
      tool: "add_todo",
      summary: folder
        ? `Added todo to ${folder.name}: ${args.content}`
        : `Added todo: ${args.content}`,
      targetDate: date,
      matchConfidence: args.matchConfidence,
    });

    const todo = await ctx.db.get(todoId);
    if (!todo) throw new Error("Todo vanished after insert");
    return todoOut(todo, folder?.name);
  },
});

export const addNote = internalMutation({
  args: {
    user: vUser,
    title: v.string(),
    content: v.string(),
    date: v.optional(v.string()),
  },
  returns: vNoteSummary,
  handler: async (ctx, args) => {
    requireScope(args.user, "notes:write");
    const date = await resolveDate(ctx, args.user.userId, args.date, Date.now());

    const noteId = await createNoteForUser(ctx, args.user.userId, {
      title: args.title,
      content: args.content,
      date,
    });

    await logActivity(ctx, args.user, {
      tool: "add_note",
      summary: `Added note: ${args.title}`,
      targetDate: date,
    });

    return {
      id: noteId as string,
      kind: "note" as const,
      title: args.title,
      preview: clip(args.content, PREVIEW_CHARS),
      date,
    };
  },
});

export const completeTodo = internalMutation({
  args: {
    user: vUser,
    todoId: v.string(),
    matchConfidence: v.optional(v.number()),
  },
  returns: v.object({
    alreadyCompleted: v.boolean(),
    todo: vTodoOut,
  }),
  handler: async (ctx, { user, todoId, matchConfidence }) => {
    requireScope(user, "todos:write");
    const todo = await loadOwnedTodo(ctx, user.userId, todoId);

    // Idempotent: completing twice is a no-op and isn't logged again
    if (todo.completed) {
      return { alreadyCompleted: true, todo: todoOut(todo) };
    }

    await updateTodoForUser(ctx, todo, { completed: true });
    await logActivity(ctx, user, {
      tool: "complete_todo",
      summary: `Completed: ${todo.content}`,
      targetDate: todo.date,
      matchConfidence,
    });

    return { alreadyCompleted: false, todo: { ...todoOut(todo), completed: true } };
  },
});

export const updateTodo = internalMutation({
  args: {
    user: vUser,
    todoId: v.string(),
    content: v.optional(v.string()),
    date: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    completed: v.optional(v.boolean()),
    matchConfidence: v.optional(v.number()),
  },
  returns: vTodoOut,
  handler: async (ctx, args) => {
    requireScope(args.user, "todos:write");
    const todo = await loadOwnedTodo(ctx, args.user.userId, args.todoId);

    if (
      args.content === undefined &&
      args.date === undefined &&
      args.pinned === undefined &&
      args.completed === undefined
    ) {
      throw new ConvexError("Nothing to update. Pass content, date, pinned or completed.");
    }

    const changes: Array<string> = [];

    if (
      args.content !== undefined ||
      args.pinned !== undefined ||
      (args.completed !== undefined && args.completed !== todo.completed)
    ) {
      await updateTodoForUser(ctx, todo, {
        content: args.content,
        pinned: args.pinned,
        completed: args.completed !== todo.completed ? args.completed : undefined,
      });
      if (args.content !== undefined) changes.push("edited");
      if (args.pinned !== undefined) changes.push(args.pinned ? "pinned" : "unpinned");
      if (args.completed !== undefined && args.completed !== todo.completed) {
        changes.push(args.completed ? "completed" : "reopened");
      }
    }

    // Moving to a day takes it out of any project, same as the UI
    if (args.date !== undefined && args.date !== todo.date) {
      requireDate(args.date);
      await ctx.db.patch(todo._id, {
        date: args.date,
        folderId: undefined,
        order: Date.now(),
      });
      changes.push(`moved to ${args.date}`);
    }

    const updated = await ctx.db.get(todo._id);
    if (!updated) throw notFound("todo");

    if (changes.length > 0) {
      await logActivity(ctx, args.user, {
        tool: "update_todo",
        summary: `Updated todo (${changes.join(", ")}): ${updated.content}`,
        targetDate: updated.date,
        matchConfidence: args.matchConfidence,
      });
    }

    return todoOut(updated);
  },
});

export const updateNote = internalMutation({
  args: {
    user: vUser,
    noteId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    mode: v.union(v.literal("replace"), v.literal("append")),
    matchConfidence: v.optional(v.number()),
  },
  returns: vNoteSummary,
  handler: async (ctx, args) => {
    requireScope(args.user, "notes:write");
    const note = await loadOwnedAnyNote(ctx, args.user.userId, args.noteId);

    if (args.title === undefined && args.content === undefined) {
      throw new ConvexError("Nothing to update. Pass title or content.");
    }

    let content = note.doc.content;
    if (args.content !== undefined) {
      content =
        args.mode === "append" && content.trim()
          ? `${content.replace(/\s+$/, "")}\n\n${args.content}`
          : args.content;
    }
    if (content.length > MAX_NOTE_CHARS) {
      throw new ConvexError("That would make the note too long. Start a new note instead.");
    }

    const patch: { title?: string; content?: string } = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.content !== undefined) patch.content = content;

    if (note.kind === "note") {
      await ctx.db.patch(note.doc._id, patch);
    } else {
      await ctx.db.patch(note.doc._id, patch);
    }

    const title = noteTitle(args.title ?? note.doc.title, content);
    await logActivity(ctx, args.user, {
      tool: "update_note",
      summary:
        args.content !== undefined && args.mode === "append"
          ? `Appended to note: ${title}`
          : `Updated note: ${title}`,
      targetDate: note.doc.date,
      matchConfidence: args.matchConfidence,
    });

    return {
      id: note.doc._id as string,
      kind: note.kind,
      title,
      preview: clip(content, PREVIEW_CHARS),
      date: note.doc.date,
    };
  },
});
