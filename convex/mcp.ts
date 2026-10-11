// better todo MCP server: lets each user connect their own AI agents
// (Grok Bot, Claude, Cursor, ...) to their todos, notes and projects.
// Tools act only as the verified user; all data access lives in mcpTools.ts.

import { McpServer, tool, type McpUser, type ToolCtx } from "@convex-dev/mcp";
import type { Auth } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { vNoteSummary, vTodoOut } from "./mcpTools";
import {
  matchInCode,
  pickCandidate,
  type MatchCandidate,
} from "./lib/typesafe";

// Writes act on a smart match only above this probability
const WRITE_MATCH_CONFIDENCE = 0.85;
// Lower bar for projects: a wrong pick only files a todo, and "ask" phrases
// scored at most 0.24 in convex/mcpEval.ts
const PROJECT_MATCH_CONFIDENCE = 0.65;

const MAX_TODO_CHARS = 2_000;
const MAX_NOTE_CHARS = 50_000;
const MAX_MATCH_CHARS = 200;

const INSTRUCTIONS = `better todo is the user's daily todo list with day notes, full-page notes and projects.
- Dates are YYYY-MM-DD. Leaving out "date" means today in the user's timezone.
- Call list_today or search before editing, and use the ids they return. Never guess ids.
- complete_todo, update_todo and update_note accept "match" text instead of an id. If the match is ambiguous, nothing changes and you get candidates back: ask the user which one they meant, then retry with its id.
- Projects are referred to by name. add_todo never creates projects; an unknown name returns the existing ones.
- There are no delete tools.`;

const vType = v.union(v.literal("todo"), v.literal("h1"), v.literal("h2"), v.literal("h3"));

const vRanked = v.object({
  id: v.string(),
  text: v.string(),
  date: v.optional(v.string()),
  project: v.optional(v.string()),
  probability: v.optional(v.number()),
});

type Ranked = {
  id: string;
  text: string;
  date?: string;
  project?: string;
  probability?: number;
};

type Resolution =
  | { kind: "resolved"; id: string; matchConfidence?: number }
  | { kind: "ambiguous"; candidates: Array<Ranked> };

function checkLength(value: string | undefined, max: number, field: string) {
  if (value !== undefined && value.length > max) {
    throw new ConvexError(`${field} is too long (max ${max} characters).`);
  }
}

function requireTarget(id: string | undefined, match: string | undefined) {
  if (!id && !match?.trim()) {
    throw new ConvexError('Pass "id" (from list_today or search) or "match" text.');
  }
  checkLength(match, MAX_MATCH_CHARS, "match");
}

function toRanked(candidate: MatchCandidate, probability?: number): Ranked {
  return {
    id: candidate.id,
    text: candidate.text,
    date: candidate.date,
    project: candidate.project,
    probability: probability === undefined ? undefined : Math.round(probability * 100) / 100,
  };
}

// Turn loose text into one of the user's own records. Code matches first;
// TypeSafe (when configured) picks among the candidates; anything uncertain
// comes back as ranked candidates so the agent can ask the user.
async function resolveByMatch(
  match: string,
  candidates: Array<MatchCandidate>,
  kind: "todo" | "note",
): Promise<Resolution> {
  if (candidates.length === 0) {
    throw new ConvexError(
      `No ${kind} matches "${match}". Call list_today or search to find it.`,
    );
  }

  const inCode = matchInCode(match, candidates);
  if (inCode.id) {
    return { kind: "resolved", id: inCode.id };
  }
  if (inCode.exactTies.length > 0) {
    return { kind: "ambiguous", candidates: inCode.exactTies.map((c) => toRanked(c)) };
  }

  const pick = await pickCandidate({
    phrase: match,
    candidates,
    minConfidence: WRITE_MATCH_CONFIDENCE,
    kind,
  });
  if (pick?.id) {
    return { kind: "resolved", id: pick.id, matchConfidence: pick.confidence };
  }

  const ranked = pick
    ? pick.ranked.slice(0, 10).map((c) => toRanked(c, c.probability))
    : candidates.slice(0, 10).map((c) => toRanked(c));
  return { kind: "ambiguous", candidates: ranked };
}

async function resolveTodo(
  ctx: ToolCtx,
  user: McpUser,
  args: { id?: string; match?: string },
  includeCompleted: boolean,
): Promise<Resolution> {
  requireTarget(args.id, args.match);
  if (args.id) return { kind: "resolved", id: args.id };
  const match = args.match!.trim();
  const candidates = await ctx.runQuery(internal.mcpTools.todoCandidates, {
    user,
    match,
    now: Date.now(),
    includeCompleted,
  });
  return resolveByMatch(match, candidates, "todo");
}

async function resolveNote(
  ctx: ToolCtx,
  user: McpUser,
  args: { id?: string; match?: string },
): Promise<Resolution> {
  requireTarget(args.id, args.match);
  if (args.id) return { kind: "resolved", id: args.id };
  const match = args.match!.trim();
  const candidates = await ctx.runQuery(internal.mcpTools.noteCandidates, {
    user,
    match,
    now: Date.now(),
  });
  return resolveByMatch(match, candidates, "note");
}

// Project by exact name (case-insensitive) or id, then a smart match.
// Never creates projects; unknown names list the user's real ones.
async function resolveProject(
  ctx: ToolCtx,
  user: McpUser,
  project: string,
): Promise<{ id: Id<"folders">; matchConfidence?: number }> {
  const folders = await ctx.runQuery(internal.mcpTools.listFolders, { user });
  const wanted = project.trim().toLowerCase();

  const byId = folders.find((f) => f.id === project.trim());
  if (byId) return { id: byId.id };

  const names = folders.map((f) => f.name);
  if (folders.length === 0) {
    throw new ConvexError("The user has no projects yet. Omit project to add to today.");
  }

  // Exact name, then a single substring match ("launch" -> "Launch Week")
  const candidates = folders.map((f) => ({ id: f.id, text: f.name }));
  const inCode = matchInCode(wanted, candidates);
  const codeMatch = folders.find((f) => f.id === inCode.id);
  if (codeMatch) return { id: codeMatch.id };

  const pick = await pickCandidate({
    phrase: project,
    candidates,
    minConfidence: PROJECT_MATCH_CONFIDENCE,
    kind: "project",
  });
  if (pick?.id) {
    const folder = folders.find((f) => f.id === pick.id);
    if (folder) return { id: folder.id, matchConfidence: pick.confidence };
  }

  const suggestions = pick ? pick.ranked.slice(0, 5).map((c) => c.text) : names.slice(0, 20);
  throw new ConvexError(
    `No project named "${project}". ${pick ? "Closest" : "Existing"} projects: ${suggestions.join(", ")}.`,
  );
}

// Explicit type breaks a TypeScript inference cycle with the exports below
export const mcp: McpServer = new McpServer(components.mcp, {
  name: "better-todo",
  title: "better todo",
  version: "1.0.0",
  instructions: INSTRUCTIONS,
  consentUrl: process.env.MCP_CONSENT_URL ?? "https://better-todo.co/connect",
  scopes: {
    "todos:read": "See your todos",
    "todos:write": "Add, edit and complete your todos",
    "notes:read": "Read your notes",
    "notes:write": "Add and edit your notes",
    "projects:read": "See your projects",
  },
  tools: {
    list_today: tool({
      title: "List a day",
      description:
        "List the todos, day notes and full-page notes for a day. Omit date for today in the user's timezone. Returns ids to use with other tools.",
      args: { date: v.optional(v.string()) },
      returns: v.object({
        date: v.string(),
        timezone: v.string(),
        todos: v.array(vTodoOut),
        notes: v.array(vNoteSummary),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "todos:read",
      handler: async (ctx, args, user) =>
        ctx.runQuery(internal.mcpTools.listDay, { user, date: args.date, now: Date.now() }),
    }),

    search: tool({
      title: "Search",
      description:
        "Search the user's todos, notes and full-page notes by text. Returns up to 25 results with ids, dates and project names.",
      args: { query: v.string(), limit: v.optional(v.number()) },
      returns: v.object({
        results: v.array(
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
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "todos:read",
      handler: async (ctx, args, user) => {
        const query = args.query.trim();
        if (!query) throw new ConvexError("query can't be empty.");
        checkLength(query, MAX_MATCH_CHARS, "query");
        const limit = Math.max(1, Math.min(25, Math.floor(args.limit ?? 15)));
        return {
          results: await ctx.runQuery(internal.mcpTools.search, { user, query, limit }),
        };
      },
    }),

    add_todo: tool({
      title: "Add a todo",
      description:
        'Add a todo. Omit date for today in the user\'s timezone, or pass project (a name from list_projects) to add it to a project instead of a day. position "top" puts it first. type h1/h2/h3 adds a section header.',
      args: {
        content: v.string(),
        date: v.optional(v.string()),
        project: v.optional(v.string()),
        position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
        type: v.optional(vType),
      },
      returns: vTodoOut,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      scope: "todos:write",
      handler: async (ctx, args, user) => {
        const content = args.content.trim();
        if (!content) throw new ConvexError("content can't be empty.");
        checkLength(content, MAX_TODO_CHARS, "content");
        if (args.project && args.date) {
          throw new ConvexError("Pass either date or project, not both.");
        }

        const folder = args.project ? await resolveProject(ctx, user, args.project) : null;
        return ctx.runMutation(internal.mcpTools.addTodo, {
          user,
          content,
          date: args.date,
          folderId: folder?.id,
          position: args.position ?? "bottom",
          type: args.type ?? "todo",
          matchConfidence: folder?.matchConfidence,
        });
      },
    }),

    add_note: tool({
      title: "Add a note",
      description:
        "Add a markdown note to a day. Omit date for today in the user's timezone.",
      args: { title: v.string(), content: v.string(), date: v.optional(v.string()) },
      returns: vNoteSummary,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      scope: "notes:write",
      handler: async (ctx, args, user) => {
        const title = args.title.trim();
        if (!title) throw new ConvexError("title can't be empty.");
        checkLength(title, 200, "title");
        checkLength(args.content, MAX_NOTE_CHARS, "content");
        return ctx.runMutation(internal.mcpTools.addNote, {
          user,
          title,
          content: args.content,
          date: args.date,
        });
      },
    }),

    complete_todo: tool({
      title: "Complete a todo",
      description:
        'Mark a todo done, by id or by "match" text (e.g. "call Jamie"). If the match is ambiguous nothing changes and candidates come back; ask the user which one, then retry with its id.',
      args: { id: v.optional(v.string()), match: v.optional(v.string()) },
      returns: v.object({
        status: v.union(
          v.literal("completed"),
          v.literal("already_completed"),
          v.literal("ambiguous"),
        ),
        todo: v.optional(vTodoOut),
        candidates: v.optional(v.array(vRanked)),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      scope: "todos:write",
      handler: async (ctx, args, user) => {
        const target = await resolveTodo(ctx, user, args, false);
        if (target.kind === "ambiguous") {
          return { status: "ambiguous" as const, candidates: target.candidates };
        }
        const result = await ctx.runMutation(internal.mcpTools.completeTodo, {
          user,
          todoId: target.id,
          matchConfidence: target.matchConfidence,
        });
        return {
          status: result.alreadyCompleted
            ? ("already_completed" as const)
            : ("completed" as const),
          todo: result.todo,
        };
      },
    }),

    update_todo: tool({
      title: "Update a todo",
      description:
        'Edit a todo by id or "match" text: change content, move it to another date (YYYY-MM-DD), pin it, or reopen/complete it. Ambiguous matches change nothing and return candidates.',
      args: {
        id: v.optional(v.string()),
        match: v.optional(v.string()),
        content: v.optional(v.string()),
        date: v.optional(v.string()),
        pinned: v.optional(v.boolean()),
        completed: v.optional(v.boolean()),
      },
      returns: v.object({
        status: v.union(v.literal("updated"), v.literal("ambiguous")),
        todo: v.optional(vTodoOut),
        candidates: v.optional(v.array(vRanked)),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      scope: "todos:write",
      handler: async (ctx, args, user) => {
        const content = args.content?.trim();
        if (args.content !== undefined && !content) {
          throw new ConvexError("content can't be empty.");
        }
        checkLength(content, MAX_TODO_CHARS, "content");

        const target = await resolveTodo(ctx, user, args, true);
        if (target.kind === "ambiguous") {
          return { status: "ambiguous" as const, candidates: target.candidates };
        }
        const todo = await ctx.runMutation(internal.mcpTools.updateTodo, {
          user,
          todoId: target.id,
          content,
          date: args.date,
          pinned: args.pinned,
          completed: args.completed,
          matchConfidence: target.matchConfidence,
        });
        return { status: "updated" as const, todo };
      },
    }),

    update_note: tool({
      title: "Update a note",
      description:
        'Edit a day note or full-page note by id or "match" title. mode "append" (default) adds content to the end; "replace" overwrites it. Ambiguous matches change nothing and return candidates.',
      args: {
        id: v.optional(v.string()),
        match: v.optional(v.string()),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        mode: v.optional(v.union(v.literal("append"), v.literal("replace"))),
      },
      returns: v.object({
        status: v.union(v.literal("updated"), v.literal("ambiguous")),
        note: v.optional(vNoteSummary),
        candidates: v.optional(v.array(vRanked)),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      scope: "notes:write",
      handler: async (ctx, args, user) => {
        checkLength(args.title, 200, "title");
        checkLength(args.content, MAX_NOTE_CHARS, "content");

        const target = await resolveNote(ctx, user, args);
        if (target.kind === "ambiguous") {
          return { status: "ambiguous" as const, candidates: target.candidates };
        }
        const note = await ctx.runMutation(internal.mcpTools.updateNote, {
          user,
          noteId: target.id,
          title: args.title?.trim() || undefined,
          content: args.content,
          mode: args.mode ?? "append",
          matchConfidence: target.matchConfidence,
        });
        return { status: "updated" as const, note };
      },
    }),

    get_note: tool({
      title: "Read a note",
      description:
        "Read the full markdown content of a day note or full-page note by id (from list_today, search or get_project).",
      args: { id: v.string() },
      returns: v.object({
        id: v.string(),
        kind: v.union(v.literal("note"), v.literal("fullPageNote")),
        title: v.string(),
        content: v.string(),
        truncated: v.boolean(),
        date: v.optional(v.string()),
        project: v.optional(v.string()),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "notes:read",
      handler: async (ctx, args, user) =>
        ctx.runQuery(internal.mcpTools.getNote, {
          user,
          noteId: args.id,
          maxChars: 100_000,
        }),
    }),

    list_projects: tool({
      title: "List projects",
      description: "List the user's active projects by name.",
      args: {},
      returns: v.object({
        projects: v.array(v.object({ id: v.string(), name: v.string() })),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "projects:read",
      handler: async (ctx, _args, user) => ({
        projects: await ctx.runQuery(internal.mcpTools.listFolders, { user }),
      }),
    }),

    get_project: tool({
      title: "Open a project",
      description:
        "Show a project's open todos and notes. Pass the project name (or id from list_projects).",
      args: { project: v.string() },
      returns: v.object({
        id: v.string(),
        name: v.string(),
        todos: v.array(vTodoOut),
        completedCount: v.number(),
        notes: v.array(vNoteSummary),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "projects:read",
      handler: async (ctx, args, user) => {
        checkLength(args.project, MAX_MATCH_CHARS, "project");
        const folder = await resolveProject(ctx, user, args.project);
        return ctx.runQuery(internal.mcpTools.getProject, { user, folderId: folder.id });
      },
    }),
  },
});

// Consent page and Settings use these. getUserId returns the Clerk subject,
// the same id every existing row is keyed by (single issuer).
export const {
  getAuthRequest,
  findAuthRequest,
  authorize,
  listConnections,
  revokeConnection,
  createApiKey,
} = mcp.api({
  getUserId: async (ctx: { auth: Auth }) =>
    (await ctx.auth.getUserIdentity())?.subject ?? null,
});

// CLI and tests only (deploy credentials required):
// npx convex run mcp:createApiKeyForUser '{"userId":"<clerk user id>"}'
export const { createApiKeyForUser } = mcp.internalApi();
