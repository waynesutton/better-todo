import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
      date: v.string(),
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

    // Sort by order
    return todos.sort((a, b) => a.order - b.order);
  },
});

// Get all pinned todos for a user
export const getPinnedTodos = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
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
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_pinned", (q) =>
        q.eq("userId", userId).eq("pinned", true),
      )
      .collect();

    // Sort by order
    return todos.sort((a, b) => a.order - b.order);
  },
});

// Get all available dates that have todos for the sidebar
export const getAvailableDates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get unique dates and sort them
    const dates = Array.from(new Set(todos.map((todo) => todo.date)));
    return dates.sort().reverse(); // Most recent first
  },
});

// Create a new todo item
export const createTodo = mutation({
  args: {
    date: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("todo"),
      v.literal("h1"),
      v.literal("h2"),
      v.literal("h3"),
    ),
    parentId: v.optional(v.id("todos")),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get the highest order number for this date
    const existingTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    const maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    return await ctx.db.insert("todos", {
      userId: userId,
      date: args.date,
      content: args.content,
      type: args.type,
      completed: false,
      archived: false,
      order: maxOrder + 1,
      parentId: args.parentId,
      collapsed: args.type !== "todo", // Headers start collapsed
    });
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

    // Get the parent todo to inherit its date
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.userId !== userId) {
      throw new Error("Parent todo not found or unauthorized");
    }

    // Get existing subtasks to determine order
    const existingSubtasks = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", parent.date),
      )
      .filter((q) => q.eq(q.field("parentId"), args.parentId))
      .collect();

    const maxOrder =
      existingSubtasks.length > 0
        ? Math.max(...existingSubtasks.map((t) => t.order))
        : parent.order;

    return await ctx.db.insert("todos", {
      userId,
      date: parent.date,
      content: args.content,
      type: "todo",
      completed: false,
      archived: false,
      order: maxOrder + 1,
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) {
      throw new Error("Todo not found or unauthorized");
    }

    const updates: Record<string, any> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.collapsed !== undefined) updates.collapsed = args.collapsed;
    if (args.pinned !== undefined) updates.pinned = args.pinned;

    // If completing a todo, automatically archive it
    // If uncompleting a todo, automatically unarchive it
    if (args.completed !== undefined) {
      updates.completed = args.completed;
      if (args.completed) {
        updates.archived = true;
      } else {
        updates.archived = false;
      }
    }

    if (args.archived !== undefined) {
      updates.archived = args.archived;
    }

    await ctx.db.patch(args.id, updates);
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

    const todo = await ctx.db.get(args.id);
    if (!todo || todo.userId !== userId) {
      throw new Error("Todo not found or unauthorized");
    }

    await ctx.db.delete(args.id);
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

    const todo = await ctx.db.get(args.todoId);
    if (!todo || todo.userId !== userId) {
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

    // Update all orders
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].order !== i) {
        await ctx.db.patch(filtered[i]._id, { order: i });
      }
    }

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

    const todo = await ctx.db.get(args.todoId);
    if (!todo || todo.userId !== userId) {
      throw new Error("Todo not found or unauthorized");
    }

    // Get the highest order number for the new date
    const existingTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.newDate),
      )
      .collect();

    const maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    await ctx.db.patch(args.todoId, {
      date: args.newDate,
      order: maxOrder + 1,
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
    const sourceTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.sourceDate),
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Get the highest order number for the target date
    const existingTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.targetDate),
      )
      .collect();

    let maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    // Copy each todo to the target date
    for (const todo of sourceTodos) {
      maxOrder++;
      await ctx.db.insert("todos", {
        userId: userId,
        date: args.targetDate,
        content: todo.content,
        type: todo.type,
        completed: false,
        archived: false,
        order: maxOrder,
        collapsed: todo.collapsed,
      });
    }

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
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Archive each todo
    for (const todo of todos) {
      await ctx.db.patch(todo._id, { archived: true });
    }

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
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("archived"), false))
      .collect();

    // Delete each todo
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

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
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .filter((q) => q.eq(q.field("archived"), true))
      .collect();

    // Delete each archived todo
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

    return null;
  },
});
