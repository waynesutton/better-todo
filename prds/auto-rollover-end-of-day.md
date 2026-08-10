# Auto rollover of previous day todos

Created: 2026-08-10 21:30 UTC
Last Updated: 2026-08-10 21:45 UTC
Status: Done

## Problem

Users who do not finish all their todos have to manually move them to the next day with the "move to next day" menu action. They want an opt-in setting that does this automatically at the end of each day, and closes (archives) the previous day when it has no notes. They also want a one-time backfill that applies the same logic to the last 30 days.

## Proposed solution

### Per-user setting

Add three optional fields to `userPreferences`:

- `autoRolloverEnabled` (boolean): opt-in flag for the nightly rollover
- `lastAutoRolloverDate` (string YYYY-MM-DD): dedupe marker so the rollover runs once per local day
- `rolloverBackfillAt` (number): timestamp when the one-time 30 day backfill ran, disables the button afterward

Add index `by_autoRollover` on `["autoRolloverEnabled"]` so the cron can find opted-in users without a table scan.

### Nightly rollover (cron)

- Hourly cron (`5 * * * *`) calls `internal.rollover.runDailyRollover`
- It queries opted-in users via the index and schedules `internal.rollover.processUserRollover` per user (small isolated transactions, no write conflicts across users)
- Per user: compute "today" in the user timezone (`userPreferences.timezone`, default UTC). If `lastAutoRolloverDate === today`, early return (idempotent). Otherwise:
  1. Move all incomplete, non-archived todos from yesterday to today using the same copy-and-archive semantics as the existing `moveTodosToNextDay` mutation
  2. If yesterday had todos but no notes and no active full page notes, insert into `archivedDates` (close the day)
  3. Patch `lastAutoRolloverDate = today`
- Running hourly means each user is processed within the first hour after their local midnight, which is the end of their previous day.

### One-time 30 day backfill

Public mutation `rollover.backfillLast30Days`:

- Auth required, early return if `rolloverBackfillAt` already set (one-time, idempotent)
- For each date from today-30 through yesterday (user timezone): apply the same per-day rollover (move incomplete todos to today, close days with todos but no notes)
- Returns `{ movedTodos, closedDays }` for UI feedback and stamps `rolloverBackfillAt`

### Settings UI

New "End of Day Auto Rollover" section in the settings modal (`KeyboardShortcutsModal.tsx`), authenticated users only:

- On/Off buttons (reuses `font-size-option` styles) wired to `users.setAutoRollover`
- "Backfill last 30 days" button (reuses `api-key-save-btn` styles) wired to `rollover.backfillLast30Days`, shows the result count and stays disabled once completed

## Files to change

- `convex/schema.ts`: userPreferences fields + index
- `convex/rollover.ts`: new file with cron entry points, per-day helper, backfill mutation
- `convex/users.ts`: `setAutoRollover` mutation, extend `getUserPreferences` return
- `convex/crons.ts`: hourly cron registration
- `src/components/KeyboardShortcutsModal.tsx`: settings section

## Edge cases

- User with no timezone preference: default to UTC
- Yesterday has no todos at all: nothing moved, day not archived (avoids cluttering the archive with empty days)
- Yesterday already archived: skip the archive insert (idempotent)
- All of yesterday's todos completed: nothing to move, day still closes if it has no notes
- Backfill pressed twice or double-clicked: second call early-returns because `rolloverBackfillAt` is set inside the same transaction
- Rollover copies content, type, and collapsed state and marks source todos archived, matching the manual "move to next day" behavior (subtask parent links flatten, same as the existing mutation)

## Verification steps

1. `npm run build` (tsc + vite) passes
2. `npm run lint` passes on changed files
3. `npx convex-doctor --score` stays at or above 90
4. Manual: toggle setting on, run `npx convex run rollover:processUserRollover '{"userId":"..."}'` against dev, confirm todos moved and day archived
5. Manual: press backfill button in settings, confirm counts and disabled state

## Task completion log

- 2026-08-10 21:30 UTC: PRD created
- 2026-08-10 21:40 UTC: Schema fields and by_autoRollover index added, convex/rollover.ts created, setAutoRollover mutation and preferences query updated, hourly cron registered, settings UI added
- 2026-08-10 21:45 UTC: Verified with tsc (clean), ReadLints (clean), convex-doctor score 100; dev deployment picked up functions and new index
