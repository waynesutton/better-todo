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
        v.literal("completed")
      ),
      lastUpdated: v.number(),
      backgroundImageUrl: v.optional(v.string()),
      // New fields for goal 1
      todoId: v.optional(v.union(v.id("todos"), v.null())),
      todoTitle: v.optional(v.union(v.string(), v.null())),
      // New fields for goal 2 (optional for backward compatibility)
      phase: v.optional(v.union(v.literal("focus"), v.literal("break"))),
      cycleIndex: v.optional(v.number()),
      totalCycles: v.optional(v.number()),
      phaseDuration: v.optional(v.number()),
      breakDuration: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Find existing session for this user (or guest)
    const session = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined)
      )
      .first();

    return session;
  },
});

// Start a new pomodoro session with custom duration (default 25 minutes)
export const startPomodoro = mutation({
  args: v.object({
    durationMinutes: v.optional(v.number()),
    // for Goal 1
    todoId: v.optional(v.union(v.id("todos"), v.null())),
    todoTitle: v.optional(v.union(v.string(), v.null())),
    // for Goal 2
    totalCycles: v.number(),
    phaseDuration: v.number(),
    breakDuration: v.number(),
  }),
  returns: v.id("pomodoroSessions"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Delete any existing session for this user
    const existingSession = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined)
      )
      .first();

    if (existingSession) {
      await ctx.db.delete(existingSession._id);
    }

    // Create new session with custom duration (default 25 minutes)
    const now = Date.now();
    const minutes = args.durationMinutes ?? 25;
    const duration = minutes * 60 * 1000; // Convert minutes to milliseconds

    const sessionId = await ctx.db.insert("pomodoroSessions", {
      userId,
      startTime: now,
      duration,
      remainingTime: args.phaseDuration, // Changed duration to args.phaseDuration
      status: "running",
      lastUpdated: now,
      // for Goal 1
      todoId: args.todoId ?? null, // new field
      todoTitle: args.todoTitle ?? null, // new field
      // For Goal 2
      phase: "focus",
      cycleIndex: 0,
      totalCycles: args.totalCycles,
      phaseDuration: args.phaseDuration,
      breakDuration: args.breakDuration,
    });

    // Increment the global pomodoro sessions started counter
    const stat = await ctx.db
      .query("statistics")
      .withIndex("by_key", (q) => q.eq("key", "pomodoroSessionsStarted"))
      .unique();

    if (stat) {
      await ctx.db.patch(stat._id, { value: stat.value + 1 });
    } else {
      await ctx.db.insert("statistics", {
        key: "pomodoroSessionsStarted",
        value: 1,
      });
    }

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
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Use indexed query to check ownership and status in one operation
    const session = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined)
      )
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .unique();

    // If session doesn't exist or already completed, no-op (idempotent)
    if (!session || session.status === "completed") {
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
    // Patch directly without reading first
    // This is idempotent - patching with same value is harmless
    // DB will throw if session doesn't exist
    try {
      await ctx.db.patch(args.sessionId, {
        backgroundImageUrl: args.imageUrl,
      });
    } catch (error) {
      // If session doesn't exist, that's fine (idempotent)
      return null;
    }

    return null;
  },
});

// 🆕 New: Mutation to handle focus/break cycle transitions (Goal 2)
export const advancePomodoroPhase = mutation({
  args: {
    sessionId: v.id("pomodoroSessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the user's identity (if sessions are user-scoped)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Use indexed query instead of ctx.db.get()
    const session = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) =>
        userId ? q.eq("userId", userId) : q.eq("userId", undefined)
      )
      .filter((q) => q.eq(q.field("_id"), args.sessionId))
      .unique();

    if (!session) return null; // idempotent safety

    // Idempotent phase handling
    if (session.status === "completed") return null;

    // Handle legacy sessions that don't have phase fields
    if (!session.phase || session.cycleIndex === undefined || 
        session.totalCycles === undefined || !session.phaseDuration || 
        !session.breakDuration) {
      // Legacy session - just mark as completed
      await ctx.db.patch(session._id, {
        status: "completed",
        remainingTime: 0,
        lastUpdated: Date.now(),
      });
      return null;
    }

    if (session.phase === "focus") {
      await ctx.db.patch(session._id, {
        phase: "break",
        phaseDuration: session.breakDuration,
        remainingTime: session.breakDuration,
        lastUpdated: Date.now(),
      });
      return null;
    }

    const nextCycle = session.cycleIndex + 1;

    if (nextCycle >= session.totalCycles) {
      await ctx.db.patch(session._id, {
        status: "completed",
        remainingTime: 0,
        lastUpdated: Date.now(),
      });
      return null;
    }

    await ctx.db.patch(session._id, {
      phase: "focus",
      cycleIndex: nextCycle,
      phaseDuration: session.duration,
      remainingTime: session.duration,
      lastUpdated: Date.now(),
    });

    return null;
  },
});
