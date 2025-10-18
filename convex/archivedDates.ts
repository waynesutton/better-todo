import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all archived dates
export const getArchivedDates = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

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
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

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
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

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
