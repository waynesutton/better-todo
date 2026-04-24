import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get completed todos for a user within a timestamp range.
// Uses the completedAt index first. If nothing is found (pre-backfill data),
// falls back to scanning completed todos by _creationTime as a proxy.
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
    // Primary path: use the completedAt index
    const indexed = await ctx.db
      .query("todos")
      .withIndex("by_user_and_completedAt", (q) =>
        q
          .eq("userId", args.userId)
          .gte("completedAt", args.startMs)
          .lte("completedAt", args.endMs),
      )
      .collect();

    const fromIndex = indexed
      .filter((t) => t.type === "todo" && !t.backlog && !t.folderId)
      .map((t) => ({
        content: t.content,
        date: t.date,
        completedAt: t.completedAt!,
      }));

    if (fromIndex.length > 0) return fromIndex;

    // Fallback: scan all completed todos for this user whose _creationTime
    // falls within range. Covers legacy todos without completedAt.
    const allCompleted = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return allCompleted
      .filter(
        (t) =>
          t.type === "todo" &&
          t.completed &&
          !t.backlog &&
          !t.folderId &&
          !t.completedAt &&
          t._creationTime >= args.startMs &&
          t._creationTime <= args.endMs,
      )
      .map((t) => ({
        content: t.content,
        date: t.date,
        completedAt: t._creationTime,
      }));
  },
});

// Delete existing recap run + note for a user + week so it can be regenerated
export const deleteExistingRecap = internalMutation({
  args: {
    userId: v.string(),
    weekKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyRecapRuns")
      .withIndex("by_user_and_weekKey", (q) =>
        q.eq("userId", args.userId).eq("weekKey", args.weekKey),
      )
      .unique();

    if (!existing) return null;

    // Delete the recap note
    const note = await ctx.db.get(existing.noteId);
    if (note) {
      await ctx.db.delete(note._id);
    }

    // Delete the run record
    await ctx.db.delete(existing._id);
    return null;
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

// One-time backfill: set completedAt on all completed todos that are missing it.
// Uses _creationTime as a reasonable proxy for when the todo was completed.
export const backfillCompletedAt = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const todos = await ctx.db.query("todos").collect();
    const missing = todos.filter((t) => t.completed && !t.completedAt);

    const patches = missing.map((t) =>
      ctx.db.patch(t._id, { completedAt: t._creationTime }),
    );
    await Promise.all(patches);

    return missing.length;
  },
});
