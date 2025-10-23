import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get active pomodoro session for current user
export const getPomodoroSession = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("pomodoroSessions"),
      _creationTime: v.number(),
      userId: v.optional(v.string()),
      startTime: v.number(),
      duration: v.number(),
      remainingTime: v.number(),
      status: v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("paused"),
        v.literal("completed"),
      ),
      lastUpdated: v.number(),
      backgroundImageUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Find existing session for this user (or guest)
    const session = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined),
      )
      .first();

    return session;
  },
});

// Start a new 25-minute pomodoro session
export const startPomodoro = mutation({
  args: {},
  returns: v.id("pomodoroSessions"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Delete any existing session for this user
    const existingSession = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined),
      )
      .first();

    if (existingSession) {
      await ctx.db.delete(existingSession._id);
    }

    // Create new session (25 minutes = 1500000 milliseconds)
    const now = Date.now();
    const duration = 25 * 60 * 1000; // 25 minutes in milliseconds

    const sessionId = await ctx.db.insert("pomodoroSessions", {
      userId,
      startTime: now,
      duration,
      remainingTime: duration,
      status: "running",
      lastUpdated: now,
    });

    return sessionId;
  },
});

// Pause the current pomodoro session
export const pausePomodoro = mutation({
  args: { sessionId: v.id("pomodoroSessions"), remainingTime: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "paused",
      remainingTime: args.remainingTime,
      lastUpdated: Date.now(),
    });

    return null;
  },
});

// Resume a paused pomodoro session
export const resumePomodoro = mutation({
  args: { sessionId: v.id("pomodoroSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "running",
      lastUpdated: Date.now(),
    });

    return null;
  },
});

// Stop and delete the current pomodoro session
export const stopPomodoro = mutation({
  args: { sessionId: v.id("pomodoroSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.delete(args.sessionId);

    return null;
  },
});

// Mark pomodoro session as completed
export const completePomodoro = mutation({
  args: { sessionId: v.id("pomodoroSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if session exists and is not already completed
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      // Session already deleted, no-op
      return null;
    }

    // If already completed, don't update again
    if (session.status === "completed") {
      return null;
    }

    // Only patch if session is still running or paused
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      remainingTime: 0,
      lastUpdated: Date.now(),
    });

    return null;
  },
});

// Update session with background image URL
export const updateBackgroundImage = mutation({
  args: { sessionId: v.id("pomodoroSessions"), imageUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    await ctx.db.patch(args.sessionId, {
      backgroundImageUrl: args.imageUrl,
    });

    return null;
  },
});
