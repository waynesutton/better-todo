import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get the custom backlog label for the user
export const getBacklogLabel = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const label = await ctx.db
      .query("backlogLabel")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return label?.label ?? "Backlog";
  },
});

// Set or update the custom backlog label
export const setBacklogLabel = mutation({
  args: {
    label: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const existing = await ctx.db
      .query("backlogLabel")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { label: args.label });
    } else {
      await ctx.db.insert("backlogLabel", {
        userId,
        label: args.label,
      });
    }

    return null;
  },
});
