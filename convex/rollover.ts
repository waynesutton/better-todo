import { mutation, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getUserId } from "./users";

// End of day auto rollover: moves the previous day's incomplete todos to the
// current day and closes (archives) the previous day when it has no notes.
// Runs hourly via cron (see crons.ts) so each opted-in user is processed
// within the first hour after their local midnight.

// Format a timestamp as YYYY-MM-DD in a given IANA timezone
function formatDateInTz(ms: number, timezone: string): string {
  const d = new Date(ms);
  const y = d.toLocaleString("en-CA", { timeZone: timezone, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: timezone, month: "2-digit" });
  const dd = d.toLocaleString("en-CA", { timeZone: timezone, day: "2-digit" });
  return `${y}-${m}-${dd}`;
}

// Add days to a YYYY-MM-DD date string (UTC-safe string math)
function addDays(dateStr: string, delta: number): string {
  const ms = new Date(`${dateStr}T00:00:00.000Z`).getTime() + delta * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

// Roll one day forward for a user: copy incomplete todos to the target date,
// archive the source todos, and close the source day if it has no notes.
// Mirrors the manual moveTodosToNextDay mutation semantics.
async function rolloverDay(
  ctx: MutationCtx,
  userId: string,
  sourceDate: string,
  targetDate: string,
): Promise<{ moved: number; closed: boolean }> {
  if (sourceDate === targetDate) {
    return { moved: 0, closed: false };
  }

  // All todos on the source day (also tells us whether the day exists at all)
  const dayTodos = await ctx.db
    .query("todos")
    .withIndex("by_user_and_date", (q) =>
      q.eq("userId", userId).eq("date", sourceDate),
    )
    .collect();

  // Move incomplete, non-archived todos to the target day
  const incomplete = dayTodos.filter((t) => !t.archived && !t.completed);
  if (incomplete.length > 0) {
    // Timestamp-based ordering avoids reading the target day's todos
    const baseOrder = Date.now();
    const operations = incomplete.flatMap((todo, index) => [
      ctx.db.insert("todos", {
        userId,
        date: targetDate,
        content: todo.content,
        type: todo.type,
        completed: false,
        archived: false,
        order: baseOrder + index,
        collapsed: todo.collapsed,
        // Keep the board placement so work in progress arrives in the same
        // column tomorrow. No kanbanOrder, so it sorts to the column's end by
        // its fresh order timestamp.
        kanbanColumn: todo.kanbanColumn,
      }),
      ctx.db.patch(todo._id, { archived: true }),
    ]);
    await Promise.all(operations);
  }

  // Close the source day only when it held todos but has no notes.
  // Empty days are skipped so the archive does not fill with blank entries.
  let closed = false;
  if (dayTodos.length > 0) {
    const [notes, fullPageNotes, existingArchived] = await Promise.all([
      ctx.db
        .query("notes")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", sourceDate),
        )
        .collect(),
      ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", sourceDate),
        )
        .collect(),
      ctx.db
        .query("archivedDates")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", sourceDate),
        )
        .first(),
    ]);

    const activeFullPageNotes = fullPageNotes.filter((n) => !n.archived);
    if (
      notes.length === 0 &&
      activeFullPageNotes.length === 0 &&
      !existingArchived
    ) {
      await ctx.db.insert("archivedDates", { userId, date: sourceDate });
      closed = true;
    }
  }

  return { moved: incomplete.length, closed };
}

// Cron entry point: schedule a per-user rollover for every opted-in user.
// Each user runs in its own small transaction to avoid write conflicts.
export const runDailyRollover = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const optedIn = await ctx.db
      .query("userPreferences")
      .withIndex("by_autoRollover", (q) => q.eq("autoRolloverEnabled", true))
      .collect();

    await Promise.all(
      optedIn.map((prefs) =>
        ctx.scheduler.runAfter(0, internal.rollover.processUserRollover, {
          userId: prefs.userId,
        }),
      ),
    );

    return null;
  },
});

// Roll yesterday into today for one user, once per local day
export const processUserRollover = internalMutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!prefs || !prefs.autoRolloverEnabled) {
      return null;
    }

    const timezone = prefs.timezone ?? "UTC";
    const today = formatDateInTz(Date.now(), timezone);

    // Already ran for this local day (idempotent)
    if (prefs.lastAutoRolloverDate === today) {
      return null;
    }

    const yesterday = addDays(today, -1);
    await rolloverDay(ctx, args.userId, yesterday, today);

    await ctx.db.patch(prefs._id, { lastAutoRolloverDate: today });

    return null;
  },
});

// One-time backfill: roll incomplete todos from the last 30 days into today
// and close past days that have todos but no notes
export const backfillLast30Days = mutation({
  args: {},
  returns: v.object({
    movedTodos: v.number(),
    closedDays: v.number(),
    alreadyRan: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    // One-time only (idempotent early return)
    if (prefs?.rolloverBackfillAt) {
      return { movedTodos: 0, closedDays: 0, alreadyRan: true };
    }

    const timezone = prefs?.timezone ?? "UTC";
    const today = formatDateInTz(Date.now(), timezone);

    let movedTodos = 0;
    let closedDays = 0;

    // Oldest first so ordering of moved todos follows the original timeline
    for (let daysBack = 30; daysBack >= 1; daysBack--) {
      const sourceDate = addDays(today, -daysBack);
      const { moved, closed } = await rolloverDay(
        ctx,
        userId,
        sourceDate,
        today,
      );
      movedTodos += moved;
      if (closed) closedDays++;
    }

    // Stamp the backfill so the button stays disabled
    if (prefs) {
      await ctx.db.patch(prefs._id, { rolloverBackfillAt: Date.now() });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        todoFontSize: 12,
        rolloverBackfillAt: Date.now(),
      });
    }

    return { movedTodos, closedDays, alreadyRan: false };
  },
});
