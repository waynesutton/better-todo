import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Internal query to get database statistics.
 * Returns counts only - no user data.
 */
export const getDatabaseStats = internalQuery({
  args: {},
  returns: v.object({
    totalTodos: v.number(),
    completedTodos: v.number(),
    pinnedTodos: v.number(),
    totalNotes: v.number(),
    totalFullPageNotes: v.number(),
    activeTodos: v.number(),
    archivedTodos: v.number(),
    pomodoroSessions: v.number(),
    totalFolders: v.number(),
  }),
  handler: async (ctx) => {
    // Get all todos (count only)
    const allTodos = await ctx.db.query("todos").collect();
    const totalTodos = allTodos.length;

    // Count completed todos
    const completedTodos = allTodos.filter((todo) => todo.completed).length;

    // Count pinned todos
    const pinnedTodos = allTodos.filter((todo) => todo.pinned === true).length;

    // Count active (non-archived, non-completed) todos
    const activeTodos = allTodos.filter(
      (todo) => !todo.archived && !todo.completed,
    ).length;

    // Count archived todos
    const archivedTodos = allTodos.filter((todo) => todo.archived).length;

    // Get all regular notes (count only)
    const allNotes = await ctx.db.query("notes").collect();
    const totalNotes = allNotes.length;

    // Get cumulative full-page notes created (even if deleted)
    const fullPageNotesStat = await ctx.db
      .query("statistics")
      .withIndex("by_key", (q) => q.eq("key", "fullPageNotesCreated"))
      .unique();
    const totalFullPageNotes = fullPageNotesStat?.value || 0;

    // Get all pomodoro sessions (count only)
    const allPomodoroSessions = await ctx.db.query("pomodoroSessions").collect();
    const pomodoroSessions = allPomodoroSessions.length;

    // Get all folders (count only)
    const allFolders = await ctx.db.query("folders").collect();
    const totalFolders = allFolders.length;

    return {
      totalTodos,
      completedTodos,
      pinnedTodos,
      totalNotes,
      totalFullPageNotes,
      activeTodos,
      archivedTodos,
      pomodoroSessions,
      totalFolders,
    };
  },
});

/**
 * Get aggregate statistics for the entire application.
 * Returns counts only - no user-specific data.
 */
export const getStats = action({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    totalTodos: v.number(),
    completedTodos: v.number(),
    pinnedTodos: v.number(),
    totalNotes: v.number(),
    totalFullPageNotes: v.number(),
    activeTodos: v.number(),
    archivedTodos: v.number(),
    pomodoroSessions: v.number(),
    totalFolders: v.number(),
  }),
  handler: async (ctx) => {
    // Get total users from Clerk via backend action
    const totalUsers: number = await ctx.runAction(api.stats.getUserCountFromClerk);

    // Get database statistics via internal query
    const dbStats: {
      totalTodos: number;
      completedTodos: number;
      pinnedTodos: number;
      totalNotes: number;
      totalFullPageNotes: number;
      activeTodos: number;
      archivedTodos: number;
      pomodoroSessions: number;
      totalFolders: number;
    } = await ctx.runQuery(internal.stats.getDatabaseStats);

    return {
      totalUsers,
      ...dbStats,
    };
  },
});

/**
 * Get the total number of users from Clerk.
 * This action calls Clerk's backend API to get an accurate count.
 */
export const getUserCountFromClerk = action({
  args: {},
  returns: v.number(),
  handler: async (_ctx) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not found in environment variables");
      return 0;
    }

    try {
      const response = await fetch("https://api.clerk.com/v1/users/count", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch user count from Clerk:", response.statusText);
        return 0;
      }

      const data = await response.json() as { object: string; total_count: number };
      return data.total_count;
    } catch (error) {
      console.error("Error fetching user count from Clerk:", error);
      return 0;
    }
  },
});

