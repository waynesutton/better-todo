import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get completed todos for a user within a timestamp range
export const getCompletedTodosInRange = internalQuery({
  args: {
    userId: v.string(),
    startMs: v.number(),
    endMs: v.number(),
  },
  returns: v.array(
    v.object({
      content: v.string(),
      date: v.optional(v.string()),
      completedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_completedAt", (q) =>
        q
          .eq("userId", args.userId)
          .gte("completedAt", args.startMs)
          .lte("completedAt", args.endMs),
      )
      .collect();

    return todos
      .filter((t) => t.type === "todo" && !t.backlog && !t.folderId)
      .map((t) => ({
        content: t.content,
        date: t.date,
        completedAt: t.completedAt!,
      }));
  },
});

// Check if a recap already exists for this user + week
export const getExistingRecap = internalQuery({
  args: {
    userId: v.string(),
    weekKey: v.string(),
  },
  returns: v.union(v.id("fullPageNotes"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyRecapRuns")
      .withIndex("by_user_and_weekKey", (q) =>
        q.eq("userId", args.userId).eq("weekKey", args.weekKey),
      )
      .unique();

    return existing ? existing.noteId : null;
  },
});

// Get user's timezone preference
export const getUserTimezone = internalQuery({
  args: { userId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return prefs?.timezone ?? "America/Los_Angeles";
  },
});

// List all users with their timezone (bounded to avoid unbounded collect)
export const listUsersWithTimezone = internalQuery({
  args: {},
  returns: v.array(v.object({ userId: v.string(), timezone: v.string() })),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    const result: Array<{ userId: string; timezone: string }> = [];
    for (const user of users) {
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", user.userId))
        .unique();
      result.push({
        userId: user.userId,
        timezone: prefs?.timezone ?? "America/Los_Angeles",
      });
    }
    return result;
  },
});

// Create a recap full-page note and record the run
export const createRecapNote = internalMutation({
  args: {
    userId: v.string(),
    weekKey: v.string(),
    title: v.string(),
    content: v.string(),
    date: v.string(),
  },
  returns: v.id("fullPageNotes"),
  handler: async (ctx, args) => {
    // Dedupe: check if already created
    const existing = await ctx.db
      .query("weeklyRecapRuns")
      .withIndex("by_user_and_weekKey", (q) =>
        q.eq("userId", args.userId).eq("weekKey", args.weekKey),
      )
      .unique();

    if (existing) {
      return existing.noteId;
    }

    const order = Date.now();
    const noteId = await ctx.db.insert("fullPageNotes", {
      userId: args.userId,
      date: args.date,
      title: args.title,
      content: args.content,
      order,
      collapsed: false,
      archived: false,
    });

    await ctx.db.insert("weeklyRecapRuns", {
      userId: args.userId,
      weekKey: args.weekKey,
      noteId,
      createdAt: Date.now(),
    });

    return noteId;
  },
});

// Update an existing full-page note with recap content
export const patchRecapNote = internalMutation({
  args: {
    noteId: v.id("fullPageNotes"),
    title: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      title: args.title,
      content: args.content,
    });
    return null;
  },
});
