import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./users";

// Get all date labels for the current user
export const getDateLabels = query({
  args: {},
  returns: v.array(
    v.object({
      date: v.string(),
      label: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return [];
    }

    const labels = await ctx.db
      .query("dateLabels")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .collect();

    return labels.map((label) => ({
      date: label.date,
      label: label.label,
    }));
  },
});

// Set or update a custom label for a date
export const setDateLabel = mutation({
  args: {
    date: v.string(),
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if label already exists
    const existing = await ctx.db
      .query("dateLabels")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (existing) {
      // Idempotent: skip the write when nothing changed
      if (existing.label === args.label) {
        return null;
      }
      await ctx.db.patch(existing._id, { label: args.label });
    } else {
      await ctx.db.insert("dateLabels", {
        userId,
        date: args.date,
        label: args.label,
      });
    }

    return null;
  },
});

// Remove a custom label from a date
export const removeDateLabel = mutation({
  args: {
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("dateLabels")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});
