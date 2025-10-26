import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./users";

// Delete all data for a specific date
export const deleteDate = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get authenticated user ID
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Delete all todos for this date
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }

    // Delete all notes for this date
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Delete archived date entry if exists
    const archivedDate = await ctx.db
      .query("archivedDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (archivedDate) {
      await ctx.db.delete(archivedDate._id);
    }

    // Delete custom date label if exists
    const dateLabel = await ctx.db
      .query("dateLabels")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (dateLabel) {
      await ctx.db.delete(dateLabel._id);
    }

    return null;
  },
});
