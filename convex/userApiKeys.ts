import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./users";

// Helper to mask an API key for display (show only last 4 characters)
function maskApiKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

// Get user's API keys (masked for display in UI)
export const getUserApiKeys = query({
  args: {},
  returns: v.object({
    anthropicKey: v.union(v.string(), v.null()),
    openaiKey: v.union(v.string(), v.null()),
    hasAnthropicKey: v.boolean(),
    hasOpenaiKey: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return {
        anthropicKey: null,
        openaiKey: null,
        hasAnthropicKey: false,
        hasOpenaiKey: false,
      };
    }

    const keys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!keys) {
      return {
        anthropicKey: null,
        openaiKey: null,
        hasAnthropicKey: false,
        hasOpenaiKey: false,
      };
    }

    return {
      anthropicKey: maskApiKey(keys.anthropicKey),
      openaiKey: maskApiKey(keys.openaiKey),
      hasAnthropicKey: !!keys.anthropicKey,
      hasOpenaiKey: !!keys.openaiKey,
    };
  },
});

// Internal query to get the full (unmasked) API key for use in actions
export const getApiKeyInternal = internalQuery({
  args: {
    userId: v.string(),
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!keys) return null;

    if (args.provider === "anthropic") {
      return keys.anthropicKey ?? null;
    } else {
      return keys.openaiKey ?? null;
    }
  },
});

// Save or update an API key
export const setApiKey = mutation({
  args: {
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate key format (basic validation)
    const trimmedKey = args.key.trim();
    if (trimmedKey.length < 10) {
      throw new Error("Invalid API key format");
    }

    // Check if user already has a keys record
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      // Update existing record
      if (args.provider === "anthropic") {
        await ctx.db.patch(existing._id, { anthropicKey: trimmedKey });
      } else {
        await ctx.db.patch(existing._id, { openaiKey: trimmedKey });
      }
    } else {
      // Create new record
      await ctx.db.insert("userApiKeys", {
        userId,
        anthropicKey: args.provider === "anthropic" ? trimmedKey : undefined,
        openaiKey: args.provider === "openai" ? trimmedKey : undefined,
      });
    }

    return null;
  },
});

// Delete an API key
export const deleteApiKey = mutation({
  args: {
    provider: v.union(v.literal("anthropic"), v.literal("openai")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!existing) {
      return null; // Nothing to delete
    }

    // Clear the specific key
    if (args.provider === "anthropic") {
      await ctx.db.patch(existing._id, { anthropicKey: undefined });
    } else {
      await ctx.db.patch(existing._id, { openaiKey: undefined });
    }

    // If both keys are now empty, delete the record entirely
    const updated = await ctx.db.get(existing._id);
    if (updated && !updated.anthropicKey && !updated.openaiKey) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});
