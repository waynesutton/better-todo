import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Default columns every board starts with. Returned as virtual rows until the
// user makes their first edit, so the board works without any writes.
const DEFAULT_COLUMNS = [
  { key: "todo", label: "To do", order: 0, isDone: false },
  { key: "doing", label: "Doing", order: 1, isDone: false },
  { key: "done", label: "Done", order: 2, isDone: true },
  { key: "backlog", label: "Backlog", order: 3, isDone: false },
] as const;

const columnValidator = v.object({
  key: v.string(),
  label: v.string(),
  order: v.number(),
  isDone: v.boolean(),
});

// Reject junk numbers coming from the client before they reach the database
function safeOrder(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid order value");
  }
  return Math.max(0, Math.min(100000, Math.trunc(value)));
}

// A card inserted between two others gets the midpoint of their positions, so
// the client can place it without renumbering the column. Those midpoints are
// fractional and can sit anywhere on the timestamp scale `order` uses, so this
// keeps the float instead of truncating it.
function safePosition(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid card position");
  }
  return Math.max(-1e15, Math.min(1e15, value));
}

// Where cards belong when they have no placement of their own, and where they
// land when their column is deleted. Anchored to the seeded "todo" key rather
// than "whichever column is leftmost", so adding or dragging a column never
// pulls untouched cards out of To do. The board resolves the same way.
function homeColumn<T extends { key: string; isDone?: boolean }>(
  columns: Array<T>,
): T {
  return (
    columns.find((column) => column.key === "todo" && !column.isDone) ??
    columns.find((column) => !column.isDone) ??
    columns[0]
  );
}

// Write the defaults for a user who has never edited their columns, so later
// mutations have real rows to patch. Idempotent.
async function ensureColumns(
  ctx: MutationCtx,
  userId: string,
): Promise<Array<Doc<"kanbanColumns">>> {
  const existing = await ctx.db
    .query("kanbanColumns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  if (existing.length > 0) {
    return existing.sort((a, b) => a.order - b.order);
  }

  const ids = await Promise.all(
    DEFAULT_COLUMNS.map((column) =>
      ctx.db.insert("kanbanColumns", {
        userId,
        key: column.key,
        label: column.label,
        order: column.order,
        isDone: column.isDone,
      }),
    ),
  );

  return DEFAULT_COLUMNS.map((column, index) => ({
    _id: ids[index],
    _creationTime: 0,
    userId,
    key: column.key,
    label: column.label,
    order: column.order,
    isDone: column.isDone,
  })) as Array<Doc<"kanbanColumns">>;
}

// Board columns for the signed in user, falling back to the defaults
export const getColumns = query({
  args: {},
  returns: v.array(columnValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return DEFAULT_COLUMNS.map((column) => ({ ...column }));
    }

    const columns = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    if (columns.length === 0) {
      return DEFAULT_COLUMNS.map((column) => ({ ...column }));
    }

    return columns
      .sort((a, b) => a.order - b.order)
      .map((column) => ({
        key: column.key,
        label: column.label,
        order: column.order,
        isDone: column.isDone ?? false,
      }));
  },
});

// Add a column to the end of the board
export const addColumn = mutation({
  args: {
    label: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const label = args.label.trim().slice(0, 40);
    if (label.length === 0) {
      throw new Error("Column name cannot be empty");
    }

    const columns = await ensureColumns(ctx, userId);
    if (columns.length >= 12) {
      throw new Error("A board can hold up to 12 columns");
    }

    // Slug the label, then suffix until the key is unique for this user
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24) || "column";
    const taken = new Set(columns.map((column) => column.key));
    let key = base;
    let suffix = 2;
    while (taken.has(key)) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }

    const maxOrder = columns.reduce(
      (max, column) => Math.max(max, column.order),
      -1,
    );

    await ctx.db.insert("kanbanColumns", {
      userId,
      key,
      label,
      order: maxOrder + 1,
      isDone: false,
    });

    return key;
  },
});

// Rename a column. The key stays stable so cards keep their placement.
export const renameColumn = mutation({
  args: {
    key: v.string(),
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const label = args.label.trim().slice(0, 40);
    if (label.length === 0) {
      throw new Error("Column name cannot be empty");
    }

    await ensureColumns(ctx, userId);

    const column = await ctx.db
      .query("kanbanColumns")
      .withIndex("by_user_and_key", (q) =>
        q.eq("userId", userId).eq("key", args.key),
      )
      .unique();

    if (!column) {
      throw new Error("Column not found");
    }

    // Idempotent: skip the write when nothing changed
    if (column.label === label) {
      return null;
    }

    await ctx.db.patch(column._id, { label });
    return null;
  },
});

// Delete a column and move its cards to the board's home column
export const deleteColumn = mutation({
  args: {
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const columns = await ensureColumns(ctx, userId);
    if (columns.length <= 1) {
      throw new Error("A board needs at least one column");
    }

    const target = columns.find((column) => column.key === args.key);
    if (!target) {
      return null;
    }

    const remaining = columns.filter((column) => column.key !== args.key);
    const fallback = homeColumn(remaining);

    // Reassign this column's cards so nothing is orphaned. Indexed on the
    // column key so the read covers only those cards, not every todo the user
    // owns, which would make any concurrent todo write conflict with this.
    const orphans = await ctx.db
      .query("todos")
      .withIndex("by_user_and_kanbanColumn", (q) =>
        q.eq("userId", userId).eq("kanbanColumn", args.key),
      )
      .collect();

    const reorders = remaining
      .map((column, index) =>
        column.order === index
          ? null
          : ctx.db.patch(column._id, { order: index }),
      )
      .filter((op): op is Promise<void> => op !== null);

    await Promise.all([
      ctx.db.delete(target._id),
      ...orphans.map((todo) =>
        ctx.db.patch(todo._id, { kanbanColumn: fallback.key }),
      ),
      ...reorders,
    ]);

    return null;
  },
});

// Persist a new left to right column order
export const reorderColumns = mutation({
  args: {
    keys: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const columns = await ensureColumns(ctx, userId);
    const byKey = new Map(columns.map((column) => [column.key, column]));

    const updates = args.keys
      .map((key, index) => {
        const column = byKey.get(key);
        if (!column || column.order === index) {
          return null;
        }
        return ctx.db.patch(column._id, { order: index });
      })
      .filter((update): update is Promise<void> => update !== null);

    await Promise.all(updates);
    return null;
  },
});

// Create a card straight into a board column. Mirrors todos.createTodo but
// stamps the column so the card does not land in the default one first, and
// takes an optional position so the card can enter anywhere in the column
// instead of only at the end.
export const createTodoInColumn = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    content: v.string(),
    columnKey: v.string(),
    kanbanOrder: v.optional(v.number()),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const content = args.content.trim();
    if (content.length === 0) {
      throw new Error("Card cannot be empty");
    }

    const columns = await ensureColumns(ctx, userId);
    const column = columns.find((c) => c.key === args.columnKey);
    if (!column) {
      throw new Error("Column not found");
    }
    const isDoneColumn = column.isDone ?? false;

    // Timestamp ordering keeps rapid inserts from conflicting
    const now = Date.now();

    return await ctx.db.insert("todos", {
      userId,
      date: args.date,
      folderId: args.folderId,
      content,
      type: "todo",
      completed: isDoneColumn,
      archived: isDoneColumn,
      completedAt: isDoneColumn ? now : undefined,
      order: now,
      collapsed: false,
      kanbanColumn: args.columnKey,
      kanbanOrder:
        args.kanbanOrder === undefined
          ? undefined
          : safePosition(args.kanbanOrder),
    });
  },
});

// Move one or more cards into a column and write the column's full new order.
// The client sends the complete ordered id list so the server never has to
// read-modify-write, which keeps concurrent drags from conflicting.
export const moveTodosToColumn = mutation({
  args: {
    todoIds: v.array(v.id("todos")),
    columnKey: v.string(),
    orderedIds: v.array(v.id("todos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    if (args.orderedIds.length > 500 || args.todoIds.length > 500) {
      throw new Error("Too many cards in one move");
    }

    const columns = await ensureColumns(ctx, userId);
    const column = columns.find((c) => c.key === args.columnKey);
    if (!column) {
      throw new Error("Column not found");
    }
    const isDoneColumn = column.isDone ?? false;

    // Read only the cards this move touches. Collecting the whole by_user range
    // instead would put every todo the user owns in this transaction's read
    // set, so any unrelated todo write during a drag would conflict with it.
    const ids = Array.from(new Set([...args.orderedIds, ...args.todoIds]));
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    const byId = new Map<Id<"todos">, Doc<"todos">>();
    for (const doc of docs) {
      // Ownership check per card, so an id from another user is simply ignored
      if (doc && doc.userId === userId) {
        byId.set(doc._id, doc);
      }
    }

    const moving = new Set<string>(args.todoIds);
    const now = Date.now();
    const updates: Array<Promise<void>> = [];
    const streakDates = new Set<string>();

    args.orderedIds.forEach((todoId, index) => {
      const todo = byId.get(todoId);
      if (!todo) {
        return;
      }

      const patch: Record<string, unknown> = {};

      if (todo.kanbanColumn !== args.columnKey) {
        patch.kanbanColumn = args.columnKey;
      }
      if (todo.kanbanOrder !== index) {
        patch.kanbanOrder = safeOrder(index);
      }

      // Dropping into Done completes the card; dragging out of Done revives it.
      // Only applied to cards the user actually dragged, so reordering
      // neighbours never flips their completion state.
      if (moving.has(todoId)) {
        let completionChanged = false;
        if (isDoneColumn && !todo.completed) {
          patch.completed = true;
          patch.archived = true;
          patch.completedAt = now;
          completionChanged = true;
        } else if (!isDoneColumn && todo.completed) {
          patch.completed = false;
          patch.archived = false;
          patch.completedAt = undefined;
          completionChanged = true;
        }
        if (
          completionChanged &&
          todo.date &&
          !todo.folderId &&
          !todo.backlog &&
          !todo.pinned
        ) {
          streakDates.add(todo.date);
        }
      }

      if (Object.keys(patch).length > 0) {
        updates.push(ctx.db.patch(todoId, patch));
      }
    });

    await Promise.all(updates);

    // Completion changes feed the streak counter, same as updateTodo
    await Promise.all(
      Array.from(streakDates).map((date) =>
        ctx.scheduler.runAfter(0, internal.streaks.updateStreak, {
          userId,
          date,
        }),
      ),
    );

    return null;
  },
});
