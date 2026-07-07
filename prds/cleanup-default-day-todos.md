# Cleanup default day todos cron

Created: 2026-07-06 22:15 UTC
Last Updated: 2026-07-06 22:25 UTC
Status: Done

## Problem

When a user views a blank date, `App.tsx` auto-creates a placeholder todo with the content "what's the priority?". If the user never adds anything else to that day, the placeholder stays behind and keeps the day in the sidebar date list forever. Over time the sidebar fills with empty days that only hold the untouched placeholder.

## Root cause

The default todo creation effect in `src/App.tsx` (around line 450) fires for any blank date the user visits. The matching auto-delete effect only removes the placeholder when the user adds other todos on that same visit. Nothing cleans up placeholder-only days after the fact.

## Proposed solution

Add a daily Convex cron job that finds past days where the only content is the untouched placeholder todo and deletes it, which removes the day from the sidebar list.

A day qualifies for cleanup when all of these are true:

- The todo content is exactly "what's the priority?", type "todo", not completed, not archived, not pinned, not backlog, no folder, no parent
- The todo date is strictly before today in UTC (cron runs at 12:00 UTC, when the previous UTC day is over in every timezone)
- It is the only todo on that date for that user
- The date has no notes and no non-archived full page notes (deleting the todo would otherwise hide them from the sidebar)

When a day qualifies, the cleanup deletes the placeholder todo and any orphaned `dateLabels` and `archivedDates` rows for that date, mirroring `dates.deleteDate`.

Candidates are found with the existing `search_content` search index on the todos table, then verified with exact field checks, so no full table scan is needed.

The mutation takes an optional `dryRun` arg for safe testing: it reports what it would delete without deleting.

## First production run

Convex crons registered with `crons.cron` wait for their next scheduled slot, so the first production run is triggered manually right after deploy:

```
npx convex run crons_cleanup:cleanupDefaultDayTodos --prod
```

Run with `'{"dryRun": true}'` first to preview.

## Files to change

- `convex/crons_cleanup.ts` (new): internal mutation `cleanupDefaultDayTodos`
- `convex/crons.ts`: register daily cron at 12:00 UTC

## Edge cases

- Day has archived or completed todos alongside the placeholder: skipped, day has history
- Day has notes or full page notes: skipped so the day stays visible
- Placeholder edited by the user: content no longer matches exactly, skipped
- Today or a future date: skipped by the date cutoff, so a placeholder the user is looking at right now is never removed
- More than 1024 search matches: search index returns the most relevant first; remaining rows get picked up on later daily runs

## Verification steps

1. `npx convex run crons_cleanup:cleanupDefaultDayTodos '{"dryRun": true}'` on dev, confirm the reported dates are placeholder-only past days
2. Run without dryRun on dev, confirm those days disappear from the sidebar and no other data changed
3. `npx convex-doctor --score` stays at or above 90
4. `npx tsc --noEmit` passes

## Task completion log

- 2026-07-06 22:15 UTC: PRD created
- 2026-07-06 22:20 UTC: `convex/crons_cleanup.ts` added, cron registered in `convex/crons.ts`, typecheck and convex push passed
- 2026-07-06 22:21 UTC: Tested on dev deployment. Dry run found 13 placeholder-only past days, real run deleted all 13, verify dry run returned 0. convex-doctor score 100
- 2026-07-06 22:25 UTC: Docs synced (TASKS.md, changelog.md, files.md), status set to Done
