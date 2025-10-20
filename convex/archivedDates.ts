import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./users";

// Get all archived dates
export const getArchivedDates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const archivedDates = await ctx.db
      .query("archivedDates")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();

    return archivedDates
      .map((d) => d.date)
      .sort()
      .reverse();
  },
});

// Archive a date
export const archiveDate = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already archived
    const existing = await ctx.db
      .query("archivedDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("archivedDates", {
        userId: userId,
        date: args.date,
      });
    }

    return null;
  },
});

// Unarchive a date
export const unarchiveDate = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const archivedDate = await ctx.db
      .query("archivedDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (archivedDate) {
      await ctx.db.delete(archivedDate._id);
    }

    return null;
  },
});

// Delete all archived dates
export const deleteAllArchivedDates = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const archivedDates = await ctx.db
      .query("archivedDates")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();

    for (const archivedDate of archivedDates) {
      await ctx.db.delete(archivedDate._id);
    }

    return null;
  },
});
