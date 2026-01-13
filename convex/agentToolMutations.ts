// Internal mutations for agent tool execution
// These are only called from the agent action, not exposed to clients

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Create a new todo item
export const agentCreateTodo = internalMutation({
  args: {
    userId: v.string(),
    content: v.string(),
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    pinned: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    todoId: v.optional(v.id("todos")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Use timestamp-based ordering for new items
      const order = Date.now();

      const todoId = await ctx.db.insert("todos", {
        userId: args.userId,
        content: args.content,
        date: args.date,
        folderId: args.folderId,
        type: "todo",
        completed: false,
        archived: false,
        order,
        collapsed: false,
        pinned: args.pinned ?? false,
      });

      return { success: true, todoId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create todo",
      };
    }
  },
});

// Update an existing todo
export const agentUpdateTodo = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
    content: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify ownership via indexed query
      const todo = await ctx.db
        .query("todos")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("_id"), args.todoId))
        .unique();

      if (!todo) {
        return { success: false, error: "Todo not found or not owned by user" };
      }

      // Build patch object with only provided fields
      const patch: Record<string, unknown> = {};
      if (args.content !== undefined) patch.content = args.content;
      if (args.pinned !== undefined) patch.pinned = args.pinned;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(args.todoId, patch);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update todo",
      };
    }
  },
});

// Complete a todo (mark as done)
export const agentCompleteTodo = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify ownership via indexed query
      const todo = await ctx.db
        .query("todos")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("_id"), args.todoId))
        .unique();

      if (!todo) {
        return { success: false, error: "Todo not found or not owned by user" };
      }

      // Idempotent - early return if already completed
      if (todo.completed) {
        return { success: true };
      }

      // Complete and archive the todo
      await ctx.db.patch(args.todoId, {
        completed: true,
        archived: true,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to complete todo",
      };
    }
  },
});

// Delete a todo
export const agentDeleteTodo = internalMutation({
  args: {
    userId: v.string(),
    todoId: v.id("todos"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify ownership via indexed query
      const todo = await ctx.db
        .query("todos")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("_id"), args.todoId))
        .unique();

      if (!todo) {
        // Idempotent - return success if not found
        return { success: true };
      }

      await ctx.db.delete(args.todoId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete todo",
      };
    }
  },
});

// Create a new full-page note
export const agentCreateNote = internalMutation({
  args: {
    userId: v.string(),
    title: v.optional(v.string()),
    content: v.string(),
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.object({
    success: v.boolean(),
    noteId: v.optional(v.id("fullPageNotes")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const order = Date.now();

      const noteId = await ctx.db.insert("fullPageNotes", {
        userId: args.userId,
        title: args.title || "Untitled",
        content: args.content,
        date: args.date,
        folderId: args.folderId,
        order,
      });

      return { success: true, noteId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create note",
      };
    }
  },
});

// Update an existing note
export const agentUpdateNote = internalMutation({
  args: {
    userId: v.string(),
    noteId: v.id("fullPageNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify ownership via indexed query
      const note = await ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("_id"), args.noteId))
        .unique();

      if (!note) {
        return { success: false, error: "Note not found or not owned by user" };
      }

      // Build patch object
      const patch: Record<string, unknown> = {};
      if (args.title !== undefined) patch.title = args.title;
      if (args.content !== undefined) patch.content = args.content;

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(args.noteId, patch);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update note",
      };
    }
  },
});

// Move todos to a different date
export const agentMoveTodosToDate = internalMutation({
  args: {
    userId: v.string(),
    todoIds: v.array(v.id("todos")),
    targetDate: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    movedCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Verify ownership and move in parallel
      const movePromises = args.todoIds.map(async (todoId) => {
        const todo = await ctx.db
          .query("todos")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .filter((q) => q.eq(q.field("_id"), todoId))
          .unique();

        if (todo) {
          await ctx.db.patch(todoId, { date: args.targetDate });
          return true;
        }
        return false;
      });

      const results = await Promise.all(movePromises);
      const movedCount = results.filter(Boolean).length;

      return { success: true, movedCount };
    } catch (error) {
      return {
        success: false,
        movedCount: 0,
        error: error instanceof Error ? error.message : "Failed to move todos",
      };
    }
  },
});

// Search todos by content
export const agentSearchTodos = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
    date: v.optional(v.string()),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      content: v.string(),
      date: v.optional(v.string()),
      completed: v.boolean(),
      pinned: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    // Use search index for content search
    const results = await ctx.db
      .query("todos")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", args.userId),
      )
      .take(20);

    // Filter by date and completion status
    let filtered = results;
    
    if (args.date) {
      filtered = filtered.filter((t) => t.date === args.date);
    }
    
    if (!args.includeCompleted) {
      filtered = filtered.filter((t) => !t.completed);
    }

    return filtered.map((t) => ({
      _id: t._id,
      content: t.content,
      date: t.date,
      completed: t.completed,
      pinned: t.pinned,
    }));
  },
});

// Search notes by title or content
export const agentSearchNotes = internalQuery({
  args: {
    userId: v.string(),
    query: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("fullPageNotes"),
      title: v.optional(v.string()),
      contentPreview: v.string(),
      date: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    // Search by content
    const contentResults = await ctx.db
      .query("fullPageNotes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", args.userId),
      )
      .take(10);

    // Search by title
    const titleResults = await ctx.db
      .query("fullPageNotes")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("userId", args.userId),
      )
      .take(10);

    // Combine and dedupe results
    const seen = new Set<string>();
    const combined: Array<{
      _id: typeof contentResults[0]["_id"];
      title: string | undefined;
      contentPreview: string;
      date: string | undefined;
    }> = [];

    for (const note of [...contentResults, ...titleResults]) {
      if (!seen.has(note._id)) {
        seen.add(note._id);
        combined.push({
          _id: note._id,
          title: note.title,
          contentPreview: note.content.slice(0, 100) + (note.content.length > 100 ? "..." : ""),
          date: note.date,
        });
      }
    }

    return combined.slice(0, 10);
  },
});

// Get todos for a specific date
export const agentGetTodosForDate = internalQuery({
  args: {
    userId: v.string(),
    date: v.string(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      content: v.string(),
      completed: v.boolean(),
      pinned: v.optional(v.boolean()),
      archived: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date),
      )
      .collect();

    let filtered = todos;
    if (!args.includeCompleted) {
      filtered = filtered.filter((t) => !t.completed);
    }

    return filtered.map((t) => ({
      _id: t._id,
      content: t.content,
      completed: t.completed,
      pinned: t.pinned,
      archived: t.archived,
    }));
  },
});

// Archive all todos for a date
export const agentArchiveDate = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    archivedCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Get all active todos for the date
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", args.userId).eq("date", args.date),
        )
        .collect();

      const activeTodos = todos.filter((t) => !t.archived);

      // Archive all in parallel
      const archivePromises = activeTodos.map((todo) =>
        ctx.db.patch(todo._id, { archived: true, completed: true }),
      );

      await Promise.all(archivePromises);

      // Also add to archivedDates if not already there
      const existingArchive = await ctx.db
        .query("archivedDates")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", args.userId).eq("date", args.date),
        )
        .unique();

      if (!existingArchive) {
        await ctx.db.insert("archivedDates", {
          userId: args.userId,
          date: args.date,
        });
      }

      return { success: true, archivedCount: activeTodos.length };
    } catch (error) {
      return {
        success: false,
        archivedCount: 0,
        error: error instanceof Error ? error.message : "Failed to archive date",
      };
    }
  },
});
