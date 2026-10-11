// Connected agent (MCP) activity: what agents changed, for the Settings modal.
// Rows are written by convex/mcpTools.ts in the same transaction as each write.

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 200;

// The signed-in user's 20 most recent agent changes, newest first
export const listMyAgentActivity = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("mcpActivity"),
      connectionId: v.string(),
      tool: v.string(),
      summary: v.string(),
      targetDate: v.optional(v.string()),
      matched: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const rows = await ctx.db
      .query("mcpActivity")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(20);

    return rows.map((row) => ({
      _id: row._id,
      connectionId: row.connectionId,
      tool: row.tool,
      summary: row.summary,
      targetDate: row.targetDate,
      matched: row.matchConfidence !== undefined,
      createdAt: row.createdAt,
    }));
  },
});

// Daily cron: drop activity older than 30 days, in batches through the index
export const cleanupOldActivity = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;
    const old = await ctx.db
      .query("mcpActivity")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(CLEANUP_BATCH);

    await Promise.all(old.map((row) => ctx.db.delete(row._id)));

    // More to delete: continue in a fresh transaction
    if (old.length === CLEANUP_BATCH) {
      await ctx.scheduler.runAfter(0, internal.mcpActivity.cleanupOldActivity, {});
    }
    return null;
  },
});
