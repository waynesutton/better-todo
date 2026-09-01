# Copy order, copy speed, and agent tasks toggle

Created: 2026-08-31 16:43 UTC
Last Updated: 2026-08-31 17:10 UTC
Status: Done

## Problem

1. Copying todos to another day (sidebar copy, move to next day, auto rollover) does not keep the list order from the source day.
2. Copying a full day feels slow.
3. Agent Tasks (header sparkles, Send to Agent, Run Note, Shift + A) has no per-user off switch.

## Root cause

`copyTodosToDate` reads the source day through `by_user_and_date`, which returns `_creationTime` order, not the visual `order` field. After a drag reorder, `order` is 0, 1, 2 while `_creationTime` stays original, so the copy lands in the wrong sequence.

The same mutation also:

- Inserts each todo in a sequential `await` loop
- Reads every todo on the target day just to compute `maxOrder`, which widens the OCC window

`moveTodosToNextDay` and the rollover cron already use timestamp + index, but they still map the unsorted index collection, so relative order is still wrong.

## Proposed solution

### Preserve visual order and speed up copy

- Sort source todos by `order` before insert
- Assign `Date.now() + index` so relative order is kept and the target day is not read
- Insert with `Promise.all` instead of a sequential loop
- Apply the same sort in `moveTodosToNextDay` and `rolloverDay`

### Per-user Agent Tasks setting

- Add optional `agentTasksEnabled` on `userPreferences` (missing/undefined means on)
- Settings modal On/Off toggle, same pattern as auto rollover
- When off: hide the sparkles header button, Send to Agent, Run Note, Agent Tasks view, Shift + A, and the shortcut row
- `createAgentTask` rejects the write if the setting is off

## Files to change

- `convex/schema.ts`
- `convex/users.ts`
- `convex/todos.ts`
- `convex/rollover.ts`
- `convex/agentTasks.ts`
- `src/components/KeyboardShortcutsModal.tsx`
- `src/App.tsx`
- `task.md` / `TASKS.md`, `changelog.md`, `files.md`

## Edge cases

- Empty source day: early return, no writes
- Target day already has todos: copies append after them via timestamp order
- Setting missing: Agent Tasks stays on
- Toggle off while the Agent Tasks view is open: close it
- Unauthenticated users: no setting, Agent Tasks still requires sign-in as today

## Verification steps

1. Reorder todos on a day, copy to tomorrow, confirm the same top to bottom order
2. Move incomplete todos to the next day, confirm order
3. Settings: turn Agent Tasks off, confirm header icon, menus, Run Note, and Shift + A are gone
4. Turn it back on, confirm they return
5. `npx convex-doctor --score` stays at or above 90
6. Browser: copy flow and settings toggle

## Task completion log

- 2026-08-31 16:43 UTC: PRD created
- 2026-08-31 17:10 UTC: Implemented copy order fix, parallel inserts, Agent Tasks setting, and ownership helper in agentTasks.ts. convex-doctor 100, tsc clean.
