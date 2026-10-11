import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  createTodoForUser,
  getOwnedTodo,
  updateTodoForUser,
} from "./lib/userData";

// Fetch the direct children of the given todos using the parent index.
// Scoping by parent keeps these queries from re-running on every todo write.
async function getSubtasksOf(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  parentIds: Array<Id<"todos">>,
): Promise<Array<Doc<"todos">>> {
  const groups = await Promise.all(
    parentIds.map((parentId) =>
      ctx.db
        .query("todos")
        .withIndex("by_user_and_parent", (q) =>
          q.eq("userId", userId).eq("parentId", parentId),
        )
        .collect(),
    ),
  );
  return groups.flat();
}

// Get all todos for a specific date
export const getTodosByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      content: v.string(),
      type: v.union(
        v.literal("todo"),
        v.literal("h1"),
        v.literal("h2"),
        v.literal("h3"),
      ),
      completed: v.boolean(),
      archived: v.boolean(),
      order: v.number(),
      parentId: v.optional(v.id("todos")),
      collapsed: v.boolean(),
      pinned: v.optional(v.boolean()),
      backlog: v.optional(v.boolean()),
      completedAt: v.optional(v.number()),
      kanbanColumn: v.optional(v.string()),
      kanbanOrder: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    // Filter out backlog todos and folder todos - they should only appear in their respective views
    const filteredTodos = todos.filter((todo) => !todo.backlog && !todo.folderId);

    // Sort by order
    return filteredTodos.sort((a, b) => a.order - b.order);
  },
});

// Get all pinned todos for a user (including their subtasks)
export const getPinnedTodos = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      content: v.string(),
      type: v.union(
        v.literal("todo"),
        v.literal("h1"),
        v.literal("h2"),
        v.literal("h3"),
      ),
      completed: v.boolean(),
      archived: v.boolean(),
      order: v.number(),
      parentId: v.optional(v.id("todos")),
      collapsed: v.boolean(),
      pinned: v.optional(v.boolean()),
      backlog: v.optional(v.boolean()),
      completedAt: v.optional(v.number()),
      kanbanColumn: v.optional(v.string()),
      kanbanOrder: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Get pinned todos
    const pinnedTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_pinned", (q) =>
        q.eq("userId", userId).eq("pinned", true),
      )
      .collect();

    // Get subtasks (children) of pinned todos
    const subtasks = await getSubtasksOf(
      ctx,
      userId,
      pinnedTodos.map((t) => t._id),
    );

    // Combine pinned todos and their subtasks
    const combined = [...pinnedTodos, ...subtasks];

    // Sort by order
    return combined.sort((a, b) => a.order - b.order);
  },
});

// Get all backlog todos for a user (including their subtasks)
export const getBacklogTodos = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      content: v.string(),
      type: v.union(
        v.literal("todo"),
        v.literal("h1"),
        v.literal("h2"),
        v.literal("h3"),
      ),
      completed: v.boolean(),
      archived: v.boolean(),
      order: v.number(),
      parentId: v.optional(v.id("todos")),
      collapsed: v.boolean(),
      pinned: v.optional(v.boolean()),
      backlog: v.optional(v.boolean()),
      completedAt: v.optional(v.number()),
      kanbanColumn: v.optional(v.string()),
      kanbanOrder: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Get backlog todos
    const backlogTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_backlog", (q) =>
        q.eq("userId", userId).eq("backlog", true),
      )
      .collect();

    // Get subtasks (children) of backlog todos
    const subtasks = await getSubtasksOf(
      ctx,
      userId,
      backlogTodos.map((t) => t._id),
    );

    // Combine backlog todos and their subtasks
    const combined = [...backlogTodos, ...subtasks];

    // Sort by order
    return combined.sort((a, b) => a.order - b.order);
  },
});

// Get all todos for a specific folder (including their subtasks)
export const getTodosByFolder = query({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      content: v.string(),
      type: v.union(
        v.literal("todo"),
        v.literal("h1"),
        v.literal("h2"),
        v.literal("h3"),
      ),
      completed: v.boolean(),
      archived: v.boolean(),
      order: v.number(),
      parentId: v.optional(v.id("todos")),
      collapsed: v.boolean(),
      pinned: v.optional(v.boolean()),
      backlog: v.optional(v.boolean()),
      completedAt: v.optional(v.number()),
      kanbanColumn: v.optional(v.string()),
      kanbanOrder: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Get todos in this folder
    const folderTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Get subtasks (children) of folder todos
    const subtasks = await getSubtasksOf(
      ctx,
      userId,
      folderTodos.map((t) => t._id),
    );

    // Combine folder todos and their subtasks
    const combined = [...folderTodos, ...subtasks];

    // Sort by order
    return combined.sort((a, b) => a.order - b.order);
  },
});

// Get all available dates that have todos for the sidebar
// Note: This query uses .collect() on all user todos to extract unique dates.
// This is acceptable per Convex best practices because:
// 1. Query is indexed by userId (efficient lookup)
// 2. Most users have < 1000 todos, so .collect() is reasonable
// 3. Alternative (separate date tracking table) adds complexity
// 4. Loading state in UI prevents "pop-in" effect during query
export const getAvailableDates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Get all todos with dates
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all full page notes with dates, scoped by index so this does not
    // scan every user's notes
    const fullPageNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Collect dates from todos (excluding folder todos)
    const dateTodos = todos.filter((todo) => !todo.folderId && todo.date);
    const todoDates = dateTodos.map((todo) => todo.date!);

    // Collect dates from full page notes (excluding folder notes and archived notes)
    const dateNotes = fullPageNotes.filter(
      (note) => !note.folderId && note.date && !note.archived
    );
    const noteDates = dateNotes.map((note) => note.date!);

    // Combine and get unique dates
    const allDates = [...todoDates, ...noteDates];
    const dates = Array.from(new Set(allDates));
    return dates.sort().reverse(); // Most recent first
  },
});

// Create a new todo item
export const createTodo = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    content: v.string(),
    type: v.union(
      v.literal("todo"),
      v.literal("h1"),
      v.literal("h2"),
      v.literal("h3"),
    ),
    parentId: v.optional(v.id("todos")),
    position: v.optional(v.union(v.literal("top"), v.literal("bottom"))),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await createTodoForUser(ctx, identity.subject, args);
  },
});

// Create a subtask under a parent todo
export const createSubtask = mutation({
  args: {
    parentId: v.id("todos"),
    content: v.string(),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const parent = await getOwnedTodo(ctx, userId, args.parentId);
    if (!parent) {
      throw new Error("Parent todo not found or unauthorized");
    }

    // Use timestamp-based ordering instead of reading all subtasks
    // This avoids write conflicts when creating multiple subtasks rapidly
    const order = Date.now();

    return await ctx.db.insert("todos", {
      userId,
      date: parent.date,
      folderId: parent.folderId,
      content: args.content,
      type: "todo",
      completed: false,
      archived: false,
      order: order,
      parentId: args.parentId,
      collapsed: false,
    });
  },
});

// Update a todo item
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    content: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    collapsed: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    backlog: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const todo = await getOwnedTodo(ctx, userId, args.id);
    if (!todo) {
      throw new Error("Todo not found or unauthorized");
    }

    await updateTodoForUser(ctx, todo, {
      content: args.content,
      completed: args.completed,
      collapsed: args.collapsed,
      archived: args.archived,
      pinned: args.pinned,
      backlog: args.backlog,
    });
    return null;
  },
});

// Delete a todo item
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Idempotent: if todo doesn't exist or wrong user, return early
    const todo = await getOwnedTodo(ctx, userId, args.id);
    if (!todo) {
      return null;
    }

    // Subtasks come from the parent index so the read set stays small
    const subtasks = await getSubtasksOf(ctx, userId, [args.id]);

    // Delete todo and all subtasks in parallel to minimize conflicts
    const deleteOperations = [
      ctx.db.delete(args.id),
      ...subtasks.map((subtask) => ctx.db.delete(subtask._id)),
    ];

    await Promise.all(deleteOperations);

    // Update streak if this was a regular date-based todo
    if (
      todo.date &&
      !todo.folderId &&
      !todo.backlog &&
      !todo.pinned
    ) {
      await ctx.scheduler.runAfter(0, internal.streaks.updateStreak, {
        userId,
        date: todo.date,
      });
    }

    return null;
  },
});

// Reorder todos after drag and drop
export const reorderTodos = mutation({
  args: {
    todoId: v.id("todos"),
    newOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const todo = await getOwnedTodo(ctx, userId, args.todoId);
    if (!todo) {
      throw new Error("Todo not found or unauthorized");
    }

    // Get all todos for this date
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", todo.date),
      )
      .collect();

    const sortedTodos = todos.sort((a, b) => a.order - b.order);

    // Remove the todo from its current position
    const filtered = sortedTodos.filter((t) => t._id !== args.todoId);

    // Insert it at the new position
    filtered.splice(args.newOrder, 0, todo);

    // Update all orders in parallel to avoid write conflicts
    const updates = filtered
      .map((t, index) => {
        if (t.order !== index) {
          return ctx.db.patch(t._id, { order: index });
        }
        return null;
      })
      .filter((update) => update !== null);

    await Promise.all(updates);

    return null;
  },
});

// Move a todo to a different date
export const moveTodoToDate = mutation({
  args: {
    todoId: v.id("todos"),
    newDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const todo = await getOwnedTodo(ctx, userId, args.todoId);
    if (!todo) {
      throw new Error("Todo not found or unauthorized");
    }

    // Use timestamp-based ordering instead of reading all todos
    // This avoids write conflicts when moving multiple todos rapidly
    const order = Date.now();

    // Remove folderId if moving to a date
    await ctx.db.patch(args.todoId, {
      date: args.newDate,
      folderId: undefined,
      order: order,
    });

    return null;
  },
});

// Move a todo to a folder (removes date association)
export const moveTodoToFolder = mutation({
  args: {
    todoId: v.id("todos"),
    folderId: v.id("folders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const todo = await getOwnedTodo(ctx, userId, args.todoId);
    if (!todo) {
      throw new Error("Todo not found or unauthorized");
    }

    // Verify the folder exists and belongs to the user
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found or unauthorized");
    }

    // Use timestamp-based ordering instead of reading all todos
    // This avoids write conflicts when moving multiple todos rapidly
    const order = Date.now();

    // Patch directly to avoid write conflicts
    await ctx.db.patch(args.todoId, {
      folderId: args.folderId,
      date: undefined,
      order: order,
    });

    return null;
  },
});

// Copy all non-archived todos from one date to another
export const copyTodosToDate = mutation({
  args: {
    sourceDate: v.string(),
    targetDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all non-archived todos from source date
    const sourceDayTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.sourceDate),
      )
      .collect();
    // Index order is creation time. Sort by visual order so the copy
    // matches the source day after drag-and-drop.
    const sourceTodos = sourceDayTodos
      .filter((todo) => !todo.archived)
      .sort((a, b) => a.order - b.order);

    if (sourceTodos.length === 0) {
      return null;
    }

    // Timestamp + index keeps relative order without reading the target day
    const baseOrder = Date.now();
    await Promise.all(
      sourceTodos.map((todo, index) =>
        ctx.db.insert("todos", {
          userId: userId,
          date: args.targetDate,
          content: todo.content,
          type: todo.type,
          completed: false,
          archived: false,
          order: baseOrder + index,
          collapsed: todo.collapsed,
          // Keep board placement so the copy lands in the same column
          kanbanColumn: todo.kanbanColumn,
        }),
      ),
    );

    return null;
  },
});

// Move all non-completed, non-archived todos from one date to the next day
// This copies todos to target date and archives the source todos
export const moveTodosToNextDay = mutation({
  args: {
    sourceDate: v.string(),
    targetDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Early return if source and target are the same (idempotent)
    if (args.sourceDate === args.targetDate) {
      return null;
    }

    // Get all non-archived, non-completed todos from source date
    const sourceDayTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.sourceDate),
      )
      .collect();
    const sourceTodos = sourceDayTodos
      .filter((todo) => !todo.archived && !todo.completed)
      .sort((a, b) => a.order - b.order);

    // If no todos to move, return early (idempotent)
    if (sourceTodos.length === 0) {
      return null;
    }

    // Use timestamp-based ordering for new todos to avoid write conflicts
    const baseOrder = Date.now();

    // Copy todos to target date and archive source todos in parallel
    const copyOperations = sourceTodos.map((todo, index) =>
      ctx.db.insert("todos", {
        userId: userId,
        date: args.targetDate,
        content: todo.content,
        type: todo.type,
        completed: false,
        archived: false,
        order: baseOrder + index,
        collapsed: todo.collapsed,
        // Keep board placement so in-progress work lands in the same column
        // on the new day instead of resetting to the default column
        kanbanColumn: todo.kanbanColumn,
      }),
    );

    const archiveOperations = sourceTodos.map((todo) =>
      ctx.db.patch(todo._id, { archived: true }),
    );

    // Execute all operations in parallel to minimize conflicts
    await Promise.all([...copyOperations, ...archiveOperations]);

    return null;
  },
});

// Archive all active todos for a specific date
export const archiveAllTodos = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all active (non-archived) todos for this date
    const dayTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    const todos = dayTodos.filter((todo) => !todo.archived);

    // Archive all todos in parallel to avoid write conflicts
    const updates = todos.map((todo) =>
      ctx.db.patch(todo._id, { archived: true }),
    );
    await Promise.all(updates);

    return null;
  },
});

// Delete all active todos for a specific date
export const deleteAllTodos = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all active (non-archived) todos for this date
    const dayTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    const todos = dayTodos.filter((todo) => !todo.archived);

    // Delete all todos in parallel to avoid write conflicts
    const deletions = todos.map((todo) => ctx.db.delete(todo._id));
    await Promise.all(deletions);

    return null;
  },
});

// Delete all archived todos for a specific date
export const deleteAllArchivedTodos = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all archived todos for this date
    const dayTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    const todos = dayTodos.filter((todo) => todo.archived);

    // Delete all archived todos in parallel to avoid write conflicts
    const deletions = todos.map((todo) => ctx.db.delete(todo._id));
    await Promise.all(deletions);

    return null;
  },
});

// Archive all active todos for a specific folder
export const archiveAllTodosInFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all active (non-archived) todos for this folder
    const folderTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();
    const todos = folderTodos.filter((todo) => !todo.archived);

    // Archive all todos in parallel to avoid write conflicts
    const updates = todos.map((todo) =>
      ctx.db.patch(todo._id, { archived: true }),
    );
    await Promise.all(updates);

    return null;
  },
});

// Delete all active todos for a specific folder
export const deleteAllTodosInFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all active (non-archived) todos for this folder
    const folderTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();
    const todos = folderTodos.filter((todo) => !todo.archived);

    // Delete all todos in parallel to avoid write conflicts
    const deletions = todos.map((todo) => ctx.db.delete(todo._id));
    await Promise.all(deletions);

    return null;
  },
});

// Delete all archived todos for a specific folder
export const deleteAllArchivedTodosInFolder = mutation({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get all archived todos for this folder
    const folderTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();
    const todos = folderTodos.filter((todo) => todo.archived);

    // Delete all archived todos in parallel to avoid write conflicts
    const deletions = todos.map((todo) => ctx.db.delete(todo._id));
    await Promise.all(deletions);

    return null;
  },
});

// Get count of uncompleted todos for each date
export const getUncompletedCounts = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }
    const userId = identity.subject;

    // Use indexed query for uncompleted, unarchived todos (following Convex best practices)
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_completed_archived", (q) =>
        q.eq("userId", userId).eq("completed", false).eq("archived", false),
      )
      .collect();

    // Filter out backlog todos and folder todos - they should only appear in their respective views
    const filteredTodos = todos.filter((todo) => !todo.backlog && !todo.folderId && todo.date);

    // Count by date
    const counts: Record<string, number> = {};
    for (const todo of filteredTodos) {
      counts[todo.date!] = (counts[todo.date!] || 0) + 1;
    }

    return counts;
  },
});

// Get counts of todos grouped by folder (for sidebar display)
export const getTodoCountsByFolder = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }
    const userId = identity.subject;

    // Use indexed query for uncompleted, unarchived todos (following Convex best practices)
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_completed_archived", (q) =>
        q.eq("userId", userId).eq("completed", false).eq("archived", false),
      )
      .collect();

    // Group todos by folder and count them (only count todos with folders)
    const counts: Record<string, number> = {};
    for (const todo of todos) {
      if (todo.folderId) {
        // Convert ID to string for consistent key access
        const folderIdStr = todo.folderId.toString();
        counts[folderIdStr] = (counts[folderIdStr] || 0) + 1;
      }
    }

    return counts;
  },
});
