# Kanban board view and Settings modal rename

Created: 2026-08-23 22:40 UTC
Last Updated: 2026-08-24 07:35 UTC
Status: Done

## Problem

Todos only render as a single vertical list. There is no way to see work by stage
(what is queued, what is in flight, what shipped) for a given day or project, and
no way to move a batch of todos between stages at once.

Separately, the modal opened with `?` is labelled "Keyboard Shortcuts" but it now
holds real settings (font size, auto rollover, API keys). The label undersells it
and the shortcut reference sits above the settings a user actually came to change.

## Goals

1. A board view for todos with default columns todo, doing, done, backlog.
2. Per day and per project toggle between list and board, remembered locally.
3. User created columns: add, rename, reorder, delete.
4. Drag and drop within a column and across columns.
5. Multi select cards and move the whole group to another column.
6. A global default view preference (list or board) set from Settings.
7. Every existing card action (pomodoro, agent, pin, backlog, subtask, move to
   date/project, delete) keeps working on board cards.
8. Rename the shortcuts modal to Settings, put settings above the shortcut
   reference, and give it a Phosphor gear icon.

## Non goals

- Work in progress limits per column. Adds UI weight without a clear ask.
- Swimlanes.
- Sharing a board across users.

## Design decisions

### Column model

Columns live in a new `kanbanColumns` table, one row per user per column, with a
stable `key`, a display `label`, and an `order`. If a user has no rows yet, the
query returns the four defaults as virtual columns so the board works with zero
writes. The first mutation that needs persistence seeds the defaults first.

`todos` gets two optional fields:

- `kanbanColumn` — the column `key` the card sits in
- `kanbanOrder` — position inside that column

Both optional so every existing todo keeps working. A todo with no
`kanbanColumn` resolves to `done` if it is completed, otherwise the first column.

### Done column semantics

Checking a todo already sets `archived: true`, which removes it from the active
list. On a board, a card vanishing when you check it is wrong — Done is where
finished work is supposed to live. So the board renders completed/archived todos
for the current date or project inside the Done column, styled as complete.

Consequences, all intentional:

- Checking a card sets `completed` and pins `kanbanColumn` to the done column, so
  the card slides into Done instead of disappearing.
- Dropping a card into Done marks it complete.
- Dragging a card out of Done marks it incomplete and unarchives it.
- The Archive section in the footer still lists the same items. It is collapsed
  by default and is how the list view already behaves, so it stays untouched.

### Board backlog column vs sidebar Backlog

The sidebar Backlog is a global bucket; those todos are excluded from
`getTodosByDate`, so they cannot appear on a day board. The board's Backlog
column is therefore board local parking for the current day or project. Same
word, different scope, so the column header carries a title explaining it. The
existing "Add to Backlog" card action is unchanged and still moves the todo to
the global backlog.

### View toggle state

- Global default: `userPreferences.defaultTodoView` (`list` | `board`).
- Per day / per project override: `localStorage` key `todoViewMode:<scope>`,
  where scope is the date string or `folder:<id>`. Set when the user clicks the
  header toggle or presses `Shift + B`, so one day can be a board while the
  default stays a list.
- Board is only offered on date and project views, not on Pinned or Backlog,
  because those are cross date collections with their own semantics.

### Multi select

- Modifier click (cmd, ctrl, or shift) toggles a card's selection.
- Once anything is selected, a plain click toggles selection too, so the second
  and third picks need no modifier. Long press does the same on touch.
- A floating bar shows the count, a column picker, and Clear. Escape clears.
- Dragging a selected card moves every selected card to the drop target.

### Drag and drop

One `DndContext` for the board. Each column body is a droppable so empty columns
accept drops; each card is sortable within its column's `SortableContext`.
Collision detection is `closestCorners`, which behaves better than
`closestCenter` for multi column layouts. Reordering is computed on drop and sent
as one mutation carrying the destination column's full new order, so the backend
does a single parallel patch pass with no read-modify-write races.

`TodoItem` gains a `variant` prop. In `card` variant it disables its own sortable
hook (using a prefixed inert id so it never collides with the wrapper's id),
hides its own drag handle in favour of the one the wrapper passes down, and
portals its menu to `document.body` with viewport fixed coordinates so the menu
is never clipped by a scrolling column.

## Files to change

Backend

- `convex/schema.ts` — `todos.kanbanColumn`, `todos.kanbanOrder`,
  `userPreferences.defaultTodoView`, new `kanbanColumns` table
- `convex/kanban.ts` — new: `getColumns`, `addColumn`, `renameColumn`,
  `deleteColumn`, `reorderColumns`, `moveTodosToColumn`
- `convex/todos.ts` — add the two new fields to the four todo query validators
- `convex/users.ts` — return `defaultTodoView`, add `setDefaultTodoView`

Frontend

- `src/components/KanbanBoard.tsx` — new
- `src/components/TodoItem.tsx` — `variant`, passed in drag handle, selection,
  portaled menu
- `src/components/TodoList.tsx` — `viewMode` prop, render board or list
- `src/App.tsx` — view mode state, header toggle, `Shift + B`, pass `viewMode`
- `src/components/KeyboardShortcutsModal.tsx` — Settings rename, reorder,
  default view control
- `src/components/Sidebar.tsx` — gear icon, "Settings" tooltip
- `src/components/AgentTasksView.tsx`, `src/components/AIChatView.tsx` — copy
- `src/styles/global.css` — board, column, card, selection bar styles

Docs: `files.md`, `changelog.md`, `TASKS.md`, `docs.md`

## Edge cases

- Zero columns persisted: `getColumns` returns virtual defaults.
- Deleting a column: its cards move to the first column, never orphaned.
- Deleting the last column: blocked.
- A card whose `kanbanColumn` points at a deleted or renamed key: falls back to
  the completed/first column rule.
- Subtasks: rendered under their parent card, not as top level cards.
- Demo mode (signed out): board is available but column editing and moves need
  auth, so the toggle is hidden for signed out users.
- Pinned and Backlog views: no board toggle.
- Mobile: columns scroll horizontally with snap; cards drag by an explicit
  handle so vertical scrolling still works.

## Verification

- `npx tsc --noEmit` clean
- `npx eslint` clean on changed files
- Manual: toggle a day to board, drag within and across columns, check a card
  lands in Done, drag it back out and confirm it is active again, add/rename/
  reorder/delete a column, multi select three cards and move them, confirm each
  card menu action still fires, set default view to board in Settings and reload

## Follow up: Done state sync between board and list

### Problem

The board's Done column and the list view's Done section read the same
`completed` and `archived` flags, so the data was already in sync. The
presentation was not.

1. In board view the footer `ArchiveSection` still rendered, so a completed card
   showed twice on screen: once in the Done column, once in the Done section
   underneath.
2. `resolveColumn` trusted `todo.kanbanColumn` before it looked at `completed`.
   `todos.updateTodo` never touches `kanbanColumn`, so checking a card off in
   list view left the board showing it under Doing, and unchecking one from the
   list's Done section left it parked in the Done column as an active card.

### Root cause

Two sources of truth for the same idea. `kanbanColumn` is a hand placement,
`completed` is the shared state, and the board let the placement win.

### Fix

- Gate `ArchiveSection` on the board not being active. The Done column is the
  board's archive, so the footer section is redundant there. Bulk delete of
  archived cards stays a list view affordance.
- Reorder `resolveColumn` so completion wins: a completed or archived card
  always resolves to the Done column, and an active card can never resolve to a
  done column even if `kanbanColumn` says so. Kept as a read time rule rather
  than a `updateTodo` write so there are no extra writes and no new conflict
  window on the hot completion path.

### Files

- `src/App.tsx` — `boardViewActive`, `ArchiveSection` gate
- `src/components/KanbanBoard.tsx` — `resolveColumn` order

### Edge cases

- Done column deleted: completed cards fall back to `columns[0]`, unchanged from
  before.
- All columns marked done: an active card falls back to `columns[0]`. Cannot
  happen today since `addColumn` always writes `isDone: false`.
- A card arriving in Done from a list view check keeps its old `kanbanOrder`, so
  it can land mid stack. First drag rewrites the order.
- `Archive All (active todos)` sets `archived` without `completed`; those cards
  resolve to Done, matching the list view where they appear under Done.

## Task completion log

- 2026-08-23 22:40 UTC — PRD written
- 2026-08-24 06:20 UTC — Convex layer done: schema fields, `kanbanColumns` table,
  `convex/kanban.ts` (added `createTodoInColumn` beyond the plan so per column
  composers do not need `todos.createTodo`, which let us leave `convex/todos.ts`
  untouched apart from its return validators), `setDefaultTodoView`
- 2026-08-24 06:35 UTC — `KanbanBoard.tsx`, `TodoItem` card variant with portaled
  menu, `TodoList` view switch, App header toggle and `Shift + B`, Settings modal
  reorder, sidebar gear, board CSS
- 2026-08-24 06:50 UTC — `AgentTasksView.tsx` and `AIChatView.tsx` needed no copy
  change; neither references the old modal name
- 2026-08-24 06:55 UTC — Verified: `npx tsc --noEmit` clean, `npx eslint` clean on
  changed files (only pre-existing warnings remain), `npm run build` clean. Docs
  synced in `files.md`, `changelog.md`, `TASKS.md`. `docs.md` left alone, it holds
  tweet drafts and is unrelated. Status: Done
- 2026-08-24 07:35 UTC — Theme parity pass. The first cut used `--accent`,
  `--border-color`, `--bg-hover`, and `--text-secondary` directly, which works in
  Dark, Light, and Tan but breaks in Cloud: that theme sets border, hover, and
  accent all to `#e8e8e8` and makes secondary text equal primary, so columns,
  drop targets, selection rings, and the active Settings choice had no visible
  edge. Rather than 60 per rule overrides, added seven `--board-*` tokens with
  per theme corrections. Dark also needed near-black rather than white on its
  blue swatch (white measured 2.8:1) and a heavier shadow, since a soft black
  shadow disappears on a mid dark surface. Drop targets and the active Settings
  choice now draw a doubled edge instead of relying on hue, board secondary text
  dropped `opacity` for real muted colors to clear 4.5:1 at 10px and 12px, and
  every board control got a `:focus-visible` ring. Also fixed
  `.search-button.nav-icon-active` in Cloud, where the active board toggle read
  as off. Verified by rendering the compiled CSS in all four themes and
  inspecting structure, drop target, hover, selection, overlay, count badge, and
  the Settings cards; `npx tsc --noEmit` and `npm run build` clean.
- 2026-08-24 15:55 UTC — Done state sync pass. The flags were always shared; the
  presentation was not. Hid the footer `ArchiveSection` behind a new
  `boardViewActive` flag so completed cards stop rendering twice, and moved the
  `completed`/`archived` check to the front of `resolveColumn` so completion
  outranks a hand placement in both directions. Chose the read time rule over a
  `kanbanColumn` write inside `updateTodo`: the completion path is the hottest
  mutation in the app and it already schedules a streak update, so adding a
  write there buys nothing the board can't derive. Verified: `npx tsc --noEmit`
  clean, `npx eslint` clean on both files apart from pre-existing warnings,
  `npm run build` clean. Status: Done
- 2026-08-24 17:40 UTC — Full height and mobile pass. Columns were hugging their
  cards because `.kanban-column-body` carried `max-height: min(58vh, 520px)` and
  nothing above it claimed height, so a short column ended in mid air and the
  space beneath it was dead. Fixed by extending the app's existing flex chain
  rather than adding viewport math: the todo container now carries
  `data-view="board"`, board view makes it a flex column, the wrapper takes
  `flex: 1`, and `.kanban-column-body` becomes the only scroller. That inherits
  the `dvh` and safe area handling `#root` already does, so phones need no
  special case. Two structural fixes fell out of it: the selection bar moved from
  sticky to absolute (as a sticky row it shortened every column the moment a
  selection existed) and the add column tile opts out of the stretch so it stays
  a tile. Floors of 300px, and 200px under `max-height: 560px` for phone
  landscape, keep a column usable when notes take the rest of the page; past the
  floor the page scrolls so notes stay reachable. Touch got 32x44px drag grips,
  the only way to move a card without a mouse. Verification needed a throwaway
  static harness against the compiled stylesheet, because the board sits behind
  auth and the browser tooling runs in its own unauthenticated session. At
  1440x900 the board is 740px with four equal 728px columns and 51px to the
  footer, all of it the Add Note button. At 532x356 the 200px floor holds, a
  column body shows 72px of a 651px card list and scrolls, and the composer stays
  visible above the footer. Board height is identical with and without the
  selection bar, and holds its floor with eight notes below while the page
  scrolls to reach them. Harness deleted after measuring. Verified:
  `npx tsc --noEmit` clean, eslint clean, `npx vite build` clean. Status: Done
