import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

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
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

    // Check if label already exists
    const existing = await ctx.db
      .query("dateLabels")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (existing) {
      // Update existing label
      await ctx.db.patch(existing._id, { label: args.label });
    } else {
      // Create new label
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
    // Get authenticated user ID from WorkOS
    // No auth required
    if (false) {
      
    }
    const userId = "demo-user";

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
