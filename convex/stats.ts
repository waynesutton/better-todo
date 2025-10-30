import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get aggregate statistics for the entire application.
 * Returns counts only - no user-specific data.
 */
export const getStats = query({
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
    // Get all users (count only)
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;

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
      totalUsers,
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

