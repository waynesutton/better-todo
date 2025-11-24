import { v } from "convex/values";
import { query, internalMutation, QueryCtx } from "./_generated/server";

// Helper to get streak for a user
async function getStreak(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const getStreakStatus = query({
  args: {},
  returns: v.union(
    v.object({
      currentStreak: v.number(),
      longestStreak: v.number(),
      weeklyProgress: v.any(),
      totalTodosCompleted: v.number(),
      lastCompletedDate: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const streak = await getStreak(ctx, identity.subject);
    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        weeklyProgress: {},
        totalTodosCompleted: 0,
        lastCompletedDate: "",
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      weeklyProgress: streak.weeklyProgress || {},
      totalTodosCompleted: streak.totalTodosCompleted,
      lastCompletedDate: streak.lastCompletedDate,
    };
  },
});

// Called when a todo is completed or uncompleted
export const updateStreak = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD of the todo
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, date } = args;

    // Check if all todos for this date are completed
    // Only track regular todos with a date (exclude folder todos, backlog todos, and pinned todos)
    const allTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .collect();

    // Filter to only include regular date-based todos (not in folders, not backlog, not pinned, not archived)
    const todos = allTodos.filter(
      (t) => !t.folderId && !t.backlog && !t.pinned && !t.archived,
    );

    if (todos.length === 0) return null;

    const allCompleted = todos.every((t) => t.completed);

    let streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!streak) {
      const id = await ctx.db.insert("streaks", {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: "",
        weeklyProgress: {},
        totalTodosCompleted: 0,
      });
      streak = (await ctx.db.get(id))!;
    }

    // Update total completed count - only count regular date-based todos
    const allCompletedTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Filter to only count regular date-based todos (exclude folder/backlog/pinned todos)
    const totalCompleted = allCompletedTodos.filter(
      (t) => t.date && !t.folderId && !t.backlog && !t.pinned,
    ).length;

    // Update weekly progress
    const weeklyProgress =
      (streak.weeklyProgress as Record<string, boolean>) || {};
    const wasCompleted = weeklyProgress[date] === true;

    if (allCompleted && !wasCompleted) {
      weeklyProgress[date] = true;

      // Calculate new streak
      let newStreak = streak.currentStreak;
      if (streak.lastCompletedDate === "") {
        newStreak = 1;
      } else {
        const lastDate = new Date(streak.lastCompletedDate + "T00:00:00");
        const currentDate = new Date(date + "T00:00:00");
        const diffTime = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays === 0) {
          // Same day, keep streak
        } else {
          newStreak = 1;
        }
      }

      await ctx.db.patch(streak._id, {
        weeklyProgress,
        lastCompletedDate: date,
        currentStreak: newStreak,
        longestStreak: Math.max(streak.longestStreak, newStreak),
        totalTodosCompleted: totalCompleted,
      });
    } else if (!allCompleted && wasCompleted) {
      // User uncompleted a task, mark day as incomplete
      weeklyProgress[date] = false;
      await ctx.db.patch(streak._id, {
        weeklyProgress,
        totalTodosCompleted: totalCompleted,
      });
    } else {
      // Just update the total count
      await ctx.db.patch(streak._id, {
        totalTodosCompleted: totalCompleted,
      });
    }

    return null;
  },
});
