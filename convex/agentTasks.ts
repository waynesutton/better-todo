import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Validators for reuse
const providerValidator = v.union(v.literal("claude"), v.literal("openai"));
const taskTypeValidator = v.union(
  v.literal("expand"),
  v.literal("code"),
  v.literal("summarize"),
  v.literal("analyze"),
  v.literal("other"),
  v.literal("run"), // Executable note - treats content as instructions to execute
);
const statusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
);

// Message validator for conversation history
const messageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
});

// Execution log entry validator for "run" task type
const executionLogEntryValidator = v.object({
  toolName: v.string(),
  toolInput: v.string(), // JSON stringified input
  toolResult: v.optional(v.string()), // JSON stringified result
  status: v.union(v.literal("pending"), v.literal("success"), v.literal("error")),
  timestamp: v.number(),
});

// Agent task return type validator
const agentTaskValidator = v.object({
  _id: v.id("agentTasks"),
  _creationTime: v.number(),
  userId: v.string(),
  sourceId: v.string(),
  sourceType: v.union(v.literal("todo"), v.literal("fullPageNote")),
  sourceContent: v.string(),
  sourceTitle: v.optional(v.string()),
  provider: providerValidator, // User's selected provider
  actualProvider: v.optional(providerValidator), // Provider actually used (may differ if selected was paused)
  taskType: taskTypeValidator,
  customInstructions: v.optional(v.string()),
  status: statusValidator,
  result: v.optional(v.string()),
  error: v.optional(v.string()),
  messages: v.optional(v.array(messageValidator)),
  executionLog: v.optional(v.array(executionLogEntryValidator)), // For "run" task type
  folderId: v.optional(v.id("folders")),
  date: v.optional(v.string()),
});

// Get agent tasks for the current user, optionally filtered by date or folder
export const getAgentTasks = query({
  args: {
    status: v.optional(statusValidator),
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.array(agentTaskValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    let tasks;

    // Filter by folder if provided
    if (args.folderId) {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", userId).eq("folderId", args.folderId),
        )
        .order("desc")
        .collect();
    }
    // Filter by date if provided
    else if (args.date) {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", args.date),
        )
        .order("desc")
        .collect();
    }
    // Get all tasks for user
    else {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }

    // Apply status filter if provided
    if (args.status) {
      tasks = tasks.filter((task) => task.status === args.status);
    }

    return tasks;
  },
});

// Get agent task counts for sidebar badges
export const getAgentTaskCounts = query({
  args: {},
  returns: v.object({
    pending: v.number(),
    processing: v.number(),
    completed: v.number(),
    failed: v.number(),
    total: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    }
    const userId = identity.subject;

    const tasks = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const counts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: tasks.length,
    };

    for (const task of tasks) {
      counts[task.status]++;
    }

    return counts;
  },
});

// Get a single agent task by ID
export const getAgentTask = query({
  args: {
    id: v.id("agentTasks"),
  },
  returns: v.union(agentTaskValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== userId) {
      return null;
    }

    return task;
  },
});

// Create a new agent task and schedule processing
export const createAgentTask = mutation({
  args: {
    sourceId: v.string(),
    sourceType: v.union(v.literal("todo"), v.literal("fullPageNote")),
    sourceContent: v.string(),
    sourceTitle: v.optional(v.string()),
    provider: providerValidator,
    taskType: taskTypeValidator,
    customInstructions: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    date: v.optional(v.string()),
  },
  returns: v.id("agentTasks"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Create task with pending status
    const taskId = await ctx.db.insert("agentTasks", {
      userId,
      sourceId: args.sourceId,
      sourceType: args.sourceType,
      sourceContent: args.sourceContent,
      sourceTitle: args.sourceTitle,
      provider: args.provider,
      taskType: args.taskType,
      customInstructions: args.customInstructions,
      status: "pending",
      folderId: args.folderId,
      date: args.date,
    });

    // Schedule the appropriate processing action based on task type
    if (args.taskType === "run") {
      // Use the executable note processor for "run" tasks
      await ctx.scheduler.runAfter(0, internal.agentTaskActions.processExecutableNote, {
        taskId,
      });
    } else {
      // Use the standard processor for other task types
      await ctx.scheduler.runAfter(0, internal.agentTaskActions.processAgentTask, {
        taskId,
      });
    }

    return taskId;
  },
});

// Delete an agent task
export const deleteAgentTask = mutation({
  args: {
    id: v.id("agentTasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.id))
      .unique();

    if (!task) {
      return null; // Idempotent - task doesn't exist or not owned
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Delete all agent tasks for the current user (optionally filtered by date or folder)
export const deleteAllAgentTasks = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.number(), // Returns count of deleted tasks
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    let tasks;

    // Filter by folder if provided
    if (args.folderId) {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", userId).eq("folderId", args.folderId),
        )
        .collect();
    }
    // Filter by date if provided
    else if (args.date) {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", args.date),
        )
        .collect();
    }
    // Delete all tasks for user
    else {
      tasks = await ctx.db
        .query("agentTasks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    // Delete all tasks in parallel
    const deletePromises = tasks.map((task) => ctx.db.delete(task._id));
    await Promise.all(deletePromises);

    return tasks.length;
  },
});

// Add a follow-up message to an existing task and process it
export const addFollowUpMessage = mutation({
  args: {
    taskId: v.id("agentTasks"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.taskId))
      .unique();

    if (!task) {
      throw new Error("Task not found");
    }

    // Don't allow follow-ups on tasks that are still processing
    if (task.status === "pending" || task.status === "processing") {
      throw new Error("Task is still processing");
    }

    // Add the user message to the conversation
    const existingMessages = task.messages || [];
    const userMessage = {
      role: "user" as const,
      content: args.message,
      timestamp: Date.now(),
    };

    await ctx.db.patch(args.taskId, {
      status: "processing",
      messages: [...existingMessages, userMessage],
    });

    // Schedule the follow-up processing
    await ctx.scheduler.runAfter(0, internal.agentTaskActions.processFollowUp, {
      taskId: args.taskId,
    });

    return null;
  },
});

// Create todos from an agent task result
export const createTodosFromAgent = mutation({
  args: {
    taskId: v.id("agentTasks"),
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.number(), // Returns count of todos created
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.taskId))
      .unique();

    if (!task) {
      throw new Error("Task not found");
    }

    // Get the content to parse - combine initial result with all follow-up assistant messages
    let contentToParse = task.result || "";
    if (task.messages) {
      const assistantMessages = task.messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content);
      if (assistantMessages.length > 0) {
        contentToParse = contentToParse + "\n\n" + assistantMessages.join("\n\n");
      }
    }

    if (!contentToParse.trim()) {
      return 0;
    }

    // Parse markdown for actionable items
    // Matches: - [ ] item, - item, * item, or numbered items (1. item)
    const lines = contentToParse.split("\n");
    const todoItems: Array<string> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Match unchecked checkbox items: - [ ] item or * [ ] item
      const checkboxMatch = trimmed.match(/^[-*]\s*\[\s*\]\s+(.+)$/);
      if (checkboxMatch) {
        todoItems.push(checkboxMatch[1].trim());
        continue;
      }

      // Match bullet points: - item or * item (but not headers or horizontal rules)
      const bulletMatch = trimmed.match(/^[-*]\s+(?!\[)(.+)$/);
      if (bulletMatch && !trimmed.startsWith("---") && !trimmed.startsWith("***")) {
        todoItems.push(bulletMatch[1].trim());
        continue;
      }

      // Match numbered items: 1. item, 2. item, etc.
      const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (numberedMatch) {
        todoItems.push(numberedMatch[1].trim());
        continue;
      }
    }

    if (todoItems.length === 0) {
      return 0;
    }

    // Get timestamp for ordering
    const now = Date.now();

    // Create todos in parallel using Promise.all
    const insertPromises = todoItems.map((content, index) =>
      ctx.db.insert("todos", {
        userId,
        date: args.date || task.date,
        folderId: args.folderId || task.folderId,
        content,
        type: "todo",
        completed: false,
        archived: false,
        order: now + index, // Timestamp-based ordering
        collapsed: false,
      })
    );

    await Promise.all(insertPromises);

    return todoItems.length;
  },
});

// Save agent task result as a new full-page note
export const saveResultAsNote = mutation({
  args: {
    taskId: v.id("agentTasks"),
    title: v.optional(v.string()),
  },
  returns: v.id("fullPageNotes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.taskId))
      .unique();

    if (!task) {
      throw new Error("Task not found");
    }

    // Build content from initial result and follow-up messages
    let content = task.result || "";
    if (task.messages) {
      for (const msg of task.messages) {
        const roleLabel = msg.role === "user" ? "**You:**" : `**${task.provider === "claude" ? "Claude" : "OpenAI"}:**`;
        content += `\n\n${roleLabel}\n${msg.content}`;
      }
    }

    if (!content.trim()) {
      throw new Error("No result content to save");
    }

    // Determine title - use provided title, task source title, or generate from task type
    const noteTitle = args.title || 
      task.sourceTitle || 
      `Agent ${task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1)} Result`;

    // Get order for the new note (timestamp-based)
    const order = Date.now();

    // Create the full-page note
    const noteId = await ctx.db.insert("fullPageNotes", {
      userId,
      date: task.date,
      folderId: task.folderId,
      title: noteTitle,
      content,
      order,
    });

    return noteId;
  },
});

// Internal mutation to update task status (called from action)
export const updateTaskStatus = internalMutation({
  args: {
    taskId: v.id("agentTasks"),
    status: statusValidator,
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    actualProvider: v.optional(providerValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
      result: args.result,
      error: args.error,
      actualProvider: args.actualProvider,
    });

    return null;
  },
});

// Internal mutation to append assistant response to messages
export const appendAssistantMessage = internalMutation({
  args: {
    taskId: v.id("agentTasks"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    const existingMessages = task.messages || [];
    const assistantMessage = {
      role: "assistant" as const,
      content: args.content,
      timestamp: Date.now(),
    };

    await ctx.db.patch(args.taskId, {
      status: "completed",
      messages: [...existingMessages, assistantMessage],
    });

    return null;
  },
});

// Internal mutation to mark follow-up as failed
export const markFollowUpFailed = internalMutation({
  args: {
    taskId: v.id("agentTasks"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await ctx.db.patch(args.taskId, {
      status: "completed", // Keep as completed since initial result exists
      error: args.error,
    });

    return null;
  },
});

// Internal query to get task for processing (called from action)
export const getTaskForProcessing = internalQuery({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.union(agentTaskValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// Internal mutation to append a single execution log entry (for real-time updates)
export const appendExecutionLogEntry = internalMutation({
  args: {
    taskId: v.id("agentTasks"),
    entry: executionLogEntryValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    const existingLog = task.executionLog || [];
    await ctx.db.patch(args.taskId, {
      executionLog: [...existingLog, args.entry],
    });

    return null;
  },
});

// Internal mutation to update task with final result and execution log
export const updateTaskWithExecutionLog = internalMutation({
  args: {
    taskId: v.id("agentTasks"),
    status: statusValidator,
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    executionLog: v.array(executionLogEntryValidator),
    actualProvider: v.optional(providerValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
      result: args.result,
      error: args.error,
      executionLog: args.executionLog,
      actualProvider: args.actualProvider,
    });

    return null;
  },
});

// Retry a failed agent task
export const retryAgentTask = mutation({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.taskId))
      .unique();

    if (!task) {
      throw new Error("Task not found");
    }

    // Only allow retry on failed tasks
    if (task.status !== "failed") {
      throw new Error("Can only retry failed tasks");
    }

    // Reset task to pending and clear error/result
    await ctx.db.patch(args.taskId, {
      status: "pending",
      result: undefined,
      error: undefined,
      actualProvider: undefined,
      executionLog: undefined,
      messages: undefined,
    });

    // Schedule the appropriate processing action based on task type
    if (task.taskType === "run") {
      await ctx.scheduler.runAfter(0, internal.agentTaskActions.processExecutableNote, {
        taskId: args.taskId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.agentTaskActions.processAgentTask, {
        taskId: args.taskId,
      });
    }

    return null;
  },
});

// Clear conversation/messages for an agent task (keep initial result)
export const clearTaskConversation = mutation({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const task = await ctx.db
      .query("agentTasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.taskId))
      .unique();

    if (!task) {
      throw new Error("Task not found");
    }

    // Clear follow-up messages but keep initial result
    await ctx.db.patch(args.taskId, {
      messages: undefined,
    });

    return null;
  },
});
