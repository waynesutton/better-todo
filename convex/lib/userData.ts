// Shared todo and note logic used by the app UI, the in-app agent, and MCP.
// Callers resolve the userId (Clerk identity or verified MCP user) first.

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type TodoType = "todo" | "h1" | "h2" | "h3";

// Load one todo and confirm the caller owns it.
//
// The alternative, querying by_user and matching _id, walks the user's entire
// todo range and pulls every one of those documents into the transaction's read
// set. Any unrelated todo write then conflicts with it, which is what made
// board drags and deletes retry. A direct get reads exactly one document.
export async function getOwnedTodo(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<"todos">,
): Promise<Doc<"todos"> | null> {
  const todo = await ctx.db.get(id);
  if (!todo || todo.userId !== userId) {
    return null;
  }
  return todo;
}

// Same single-document ownership check for date and folder notes
export async function getOwnedNote(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<"notes">,
): Promise<Doc<"notes"> | null> {
  const note = await ctx.db.get(id);
  if (!note || note.userId !== userId) {
    return null;
  }
  return note;
}

// Same check for full-page notes
export async function getOwnedFullPageNote(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  id: Id<"fullPageNotes">,
): Promise<Doc<"fullPageNotes"> | null> {
  const note = await ctx.db.get(id);
  if (!note || note.userId !== userId) {
    return null;
  }
  return note;
}

export async function createTodoForUser(
  ctx: MutationCtx,
  userId: string,
  args: {
    content: string;
    type: TodoType;
    date?: string;
    folderId?: Id<"folders">;
    parentId?: Id<"todos">;
    position?: "top" | "bottom";
    pinned?: boolean;
  },
): Promise<Id<"todos">> {
  // Timestamp ordering avoids reading sibling todos, so rapid creates don't
  // conflict. "top" uses a negative timestamp so it sorts before existing ones.
  const order = args.position === "top" ? -Date.now() : Date.now();

  return await ctx.db.insert("todos", {
    userId,
    date: args.date,
    folderId: args.folderId,
    content: args.content,
    type: args.type,
    completed: false,
    archived: false,
    order,
    parentId: args.parentId,
    collapsed: args.type !== "todo", // Headers start collapsed
    ...(args.pinned !== undefined ? { pinned: args.pinned } : {}),
  });
}

// Patch an already ownership-checked todo. Completing archives it and records
// completedAt; uncompleting reverses both. Streaks update for plain date todos.
export async function updateTodoForUser(
  ctx: MutationCtx,
  todo: Doc<"todos">,
  args: {
    content?: string;
    completed?: boolean;
    collapsed?: boolean;
    archived?: boolean;
    pinned?: boolean;
    backlog?: boolean;
    date?: string;
  },
): Promise<void> {
  const updates: Partial<Doc<"todos">> = {};
  if (args.content !== undefined) updates.content = args.content;
  if (args.collapsed !== undefined) updates.collapsed = args.collapsed;
  if (args.pinned !== undefined) updates.pinned = args.pinned;
  if (args.backlog !== undefined) updates.backlog = args.backlog;
  if (args.date !== undefined) updates.date = args.date;

  if (args.completed !== undefined) {
    updates.completed = args.completed;
    if (args.completed) {
      updates.archived = true;
      updates.completedAt = Date.now();
    } else {
      updates.archived = false;
      updates.completedAt = undefined;
    }
  }

  if (args.archived !== undefined) {
    updates.archived = args.archived;
  }

  await ctx.db.patch(todo._id, updates);

  // Only track streaks for regular date-based todos (not folder/backlog/pinned)
  if (
    (args.completed !== undefined || args.archived !== undefined) &&
    todo.date &&
    !todo.folderId &&
    !todo.backlog &&
    !todo.pinned
  ) {
    await ctx.scheduler.runAfter(0, internal.streaks.updateStreak, {
      userId: todo.userId,
      date: todo.date,
    });
  }
}

export async function createNoteForUser(
  ctx: MutationCtx,
  userId: string,
  args: {
    title: string;
    content?: string;
    date?: string;
    folderId?: Id<"folders">;
  },
): Promise<Id<"notes">> {
  return await ctx.db.insert("notes", {
    userId,
    date: args.date,
    folderId: args.folderId,
    title: args.title,
    content: args.content ?? "",
    order: Date.now(),
    collapsed: false,
  });
}

// Patch an already ownership-checked note
export async function updateNoteForUser(
  ctx: MutationCtx,
  noteId: Id<"notes">,
  args: {
    title?: string;
    content?: string;
    collapsed?: boolean;
    pinnedToTop?: boolean;
  },
): Promise<void> {
  const updates: Partial<Doc<"notes">> = {};
  if (args.title !== undefined) updates.title = args.title;
  if (args.content !== undefined) updates.content = args.content;
  if (args.collapsed !== undefined) updates.collapsed = args.collapsed;
  if (args.pinnedToTop !== undefined) updates.pinnedToTop = args.pinnedToTop;
  await ctx.db.patch(noteId, updates);
}
