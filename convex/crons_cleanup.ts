import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Exact content of the placeholder todo auto-created by App.tsx for blank dates
const DEFAULT_TODO_CONTENT = "what's the priority?";

// Daily cleanup: if a past day only holds the untouched "what's the priority?"
// placeholder todo, delete it so the day drops out of the sidebar date list.
// Runs via cron (see crons.ts) and can be invoked manually:
//   npx convex run crons_cleanup:cleanupDefaultDayTodos '{"dryRun": true}'
export const cleanupDefaultDayTodos = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    scanned: v.number(),
    deleted: v.number(),
    days: v.array(v.object({ userId: v.string(), date: v.string() })),
  }),
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    // Today's date in UTC (YYYY-MM-DD). Only days strictly before today are
    // cleaned, so a placeholder the user is currently viewing is never removed.
    const today = new Date().toISOString().slice(0, 10);

    // Find placeholder candidates across all users via the search index,
    // then verify with exact field checks below. Avoids a full table scan.
    const candidates = await ctx.db
      .query("todos")
      .withSearchIndex("search_content", (q) =>
        q.search("content", DEFAULT_TODO_CONTENT),
      )
      .collect();

    const days: Array<{ userId: string; date: string }> = [];
    let deleted = 0;

    for (const todo of candidates) {
      // Must be the exact untouched placeholder on a regular past date
      if (
        todo.content !== DEFAULT_TODO_CONTENT ||
        todo.type !== "todo" ||
        todo.completed ||
        todo.archived ||
        todo.pinned ||
        todo.backlog ||
        todo.folderId ||
        todo.parentId ||
        !todo.date ||
        todo.date >= today
      ) {
        continue;
      }

      // Must be the only todo on that day for this user
      const dayTodos = await ctx.db
        .query("todos")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", todo.userId).eq("date", todo.date),
        )
        .collect();
      if (dayTodos.length !== 1 || dayTodos[0]._id !== todo._id) {
        continue;
      }

      // Day must have no notes and no active full page notes,
      // otherwise it should stay in the sidebar
      const [dayNotes, dayFullPageNotes] = await Promise.all([
        ctx.db
          .query("notes")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", todo.userId).eq("date", todo.date),
          )
          .collect(),
        ctx.db
          .query("fullPageNotes")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", todo.userId).eq("date", todo.date),
          )
          .collect(),
      ]);
      const activeFullPageNotes = dayFullPageNotes.filter((n) => !n.archived);
      if (dayNotes.length > 0 || activeFullPageNotes.length > 0) {
        continue;
      }

      days.push({ userId: todo.userId, date: todo.date });

      if (dryRun) {
        continue;
      }

      // Remove the placeholder plus any orphaned per-date rows
      // (mirrors dates.deleteDate cleanup)
      const [dateLabel, archivedDate] = await Promise.all([
        ctx.db
          .query("dateLabels")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", todo.userId).eq("date", todo.date!),
          )
          .first(),
        ctx.db
          .query("archivedDates")
          .withIndex("by_user_and_date", (q) =>
            q.eq("userId", todo.userId).eq("date", todo.date!),
          )
          .first(),
      ]);

      const deletions = [ctx.db.delete(todo._id)];
      if (dateLabel) deletions.push(ctx.db.delete(dateLabel._id));
      if (archivedDate) deletions.push(ctx.db.delete(archivedDate._id));
      await Promise.all(deletions);

      deleted++;
    }

    return { scanned: candidates.length, deleted, days };
  },
});
