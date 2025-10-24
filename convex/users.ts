import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get the current user's ID
export async function getUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

// Store or update user info from WorkOS
export const storeUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    } else {
      // Create new user
      await ctx.db.insert("users", {
        userId: args.userId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    }
    return null;
  },
});

// Get current authenticated user info
export const getCurrentUser = query({
  args: {},
  returns: v.object({
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  },
});

// Debug auth state for WorkOS integration
export const debugAuth = query({
  args: {},
  returns: v.object({
    isAuthenticated: v.boolean(),
    identity: v.optional(
      v.object({
        subject: v.string(),
        issuer: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      identity: {
        subject: identity.subject,
        issuer: identity.issuer,
      },
    };
  },
});

// Get user preferences
export const getUserPreferences = query({
  args: {},
  returns: v.union(
    v.object({
      todoFontSize: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return null;
    }

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!prefs) {
      return null;
    }

    return {
      todoFontSize: prefs.todoFontSize,
    };
  },
});

// Set todo font size
export const setTodoFontSize = mutation({
  args: {
    fontSize: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        todoFontSize: args.fontSize,
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        todoFontSize: args.fontSize,
      });
    }

    return null;
  },
});
