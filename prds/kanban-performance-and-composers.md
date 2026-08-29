# Kanban performance, rolled-over days, and column composers

Created: 2026-08-28 01:20 UTC
Last Updated: 2026-08-28 01:40 UTC
Status: Done

## Problem

Three reports, one session:

1. The app got noticeably slower after the Kanban board shipped.
2. When a todo moves to a new date, the previous day's board view misreports it.
3. Adding a card needs a permanent input at the top of a column as well as the bottom.

## Root cause

### Slowness

Two independent causes, one on each side of the wire.

**Backend read amplification.** `npx convex insights` on production returned one warning:
`todos.js:deleteTodo` retried on OCC conflicts 6 times in 72 hours against the `todos`
table, every event with `occ_retry_count: 0`, so they resolved on the first retry rather
than failing permanently.

The pattern behind it was an ownership check written as a range scan:

```ts
await ctx.db
  .query("todos")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("_id"), args.id))
  .unique();
```

That reads a user's entire `todos` range to find one document, so the transaction's read
set is every todo the user owns. Any concurrent write to any of them invalidates it. The
same shape appeared in subtask lookups (`filter(parentId)`), in `kanban.deleteColumn`, and
in `kanban.moveTodosToColumn`, which collected all user todos to resolve a handful of ids.
A board drag fires a mutation per drop, so the board turned a latent problem into a
visible one.

`getAvailableDates` also read `fullPageNotes` with an unindexed filter, a full table scan
across every user.

**Client re-render churn.** `KanbanBoard` built the per-card prop bundle by rest spread,
so every render handed each card a brand new object. Neither `KanbanColumn` nor
`KanbanCard` was memoised, and a card renders a whole `TodoItem`. `onDragOver` sets
`hoverColumnKey` on every pointer move over a new target, so a single drag re-rendered
every `TodoItem` on the board dozens of times.

### Previous-day board view

`moveTodosToNextDay` and the rollover cron copy a todo to the new date and patch the
original with `archived: true`, leaving a stub behind. Three things went wrong with that:

- `resolveColumn` sent every archived card to the Done column, so a rolled-over day read
  as if all of its work had been finished.
- `TodoList` filters archived todos in list view but passed `todos` straight through in
  board view, so the board never dropped the stubs.
- Neither mutation carried `kanbanColumn` to the new row, so work in progress reset to the
  default column on the new day.

### Composers

Only the bottom composer was permanent. Adding to the top meant either hovering the first
gap or opening the column menu.

## Solution

**Backend.** Two new indexes and two helpers in `convex/todos.ts`:

- `by_user_and_kanbanColumn` on `todos`, so `deleteColumn` finds a column's cards directly.
- `by_user_and_parent` on `todos`, so subtask lookups skip the full `by_user` range.
- `getOwnedTodo(ctx, userId, id)`: a direct `ctx.db.get` plus a `userId` comparison. Same
  authorization, read set of one document.
- `getSubtasksOf(ctx, userId, parentIds)`: parallel indexed queries over
  `by_user_and_parent`.

Applied to `createSubtask`, `updateTodo`, `deleteTodo`, `reorderTodos`, `moveTodoToDate`,
and `moveTodoToFolder`. `kanban.moveTodosToColumn` now `get`s only the ids it was handed
and checks ownership per card. `getAvailableDates` reads `fullPageNotes` through
`by_user`.

**Client.** The shared prop bundle is a `useMemo`, the column callbacks are `useCallback`
keyed by column so one function serves every column, and both `KanbanColumn` and
`KanbanCard` are wrapped in `React.memo`. A hover change now re-renders only the two
columns whose `isDropTarget` flipped.

**Rolled-over days.** `isOnBoard` keeps a card on the board when it is completed or not
archived, dropping archived-but-incomplete stubs the way list view does. `resolveColumn`
routes only `completed: true` cards to Done. `moveTodosToNextDay`, `copyTodosToDate`, and
`rollover.rolloverDay` all carry `kanbanColumn` to the new row.

**Composers.** A second composer above the cards, `.kanban-column-composer.is-top`, which
inserts at index 0 so a run of cards keeps the newest on top. The insert lines now start
at index 1, since the top and bottom positions have their own permanent inputs. The
column menu's "Add card to top" focuses the top composer instead of duplicating its
behaviour.

## Files changed

- `convex/schema.ts` - added `by_user_and_kanbanColumn` and `by_user_and_parent` on `todos`
- `convex/todos.ts` - `getOwnedTodo` and `getSubtasksOf` helpers, applied across six
  mutations; indexed `fullPageNotes` read in `getAvailableDates`; `kanbanColumn` preserved
  in `copyTodosToDate` and `moveTodosToNextDay`
- `convex/kanban.ts` - `deleteColumn` uses the new index; `moveTodosToColumn` reads only
  the ids it was given
- `convex/rollover.ts` - `rolloverDay` preserves `kanbanColumn`
- `src/components/KanbanBoard.tsx` - `isOnBoard`, `resolveColumn` completion rule, memoised
  shared props, stable column callbacks, `React.memo` on column and card, top composer
- `src/styles/global.css` - `.is-top` composer variant, removed the now-unused first-line
  label styles

## Edge cases

- A card completed in list view still lands in Done on the board, because completion
  outranks `kanbanColumn` at read time.
- A card archived by a move shows on neither view, so the two agree.
- `getOwnedTodo` returns `null` rather than throwing on a foreign id, so a stale client id
  is ignored instead of erroring.
- `moveTodosToColumn` skips ids it does not own rather than failing the whole batch.
- Repeated inserts into the same gap shrink the fractional interval; the next drag through
  the column renormalises to whole numbers.

## Verification

- `npx tsc --noEmit` - clean
- `npx eslint` on all six touched files - clean, one pre-existing `no-explicit-any` warning
  in `updateTodo`
- `npm run build` - clean
- `npx convex-doctor --score` - 100
- Both indexes confirmed live on the dev deployment
- Production insights re-read after the change set

## Task completion log

- 2026-08-28 01:05 UTC - Ran insights on production, found the `deleteTodo` OCC warning
- 2026-08-28 01:15 UTC - Added the two indexes, wrote the helpers, refactored the six
  mutations and the two kanban mutations
- 2026-08-28 01:25 UTC - Memoised shared props, stabilised column callbacks, wrapped column
  and card in `React.memo`
- 2026-08-28 01:30 UTC - Added `isOnBoard`, fixed the Done rule, preserved `kanbanColumn`
  across all three date-move paths
- 2026-08-28 01:35 UTC - Added the top composer, moved insert lines to start at index 1
- 2026-08-28 01:40 UTC - Verified typecheck, lint, build, and convex-doctor
