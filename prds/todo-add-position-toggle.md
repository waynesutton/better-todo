# Todo add position toggle

Created: 2026-08-12 19:07 UTC
Last Updated: 2026-08-12 19:07 UTC
Status: Done

## Problem

New todos always land at the bottom of the list because `createTodo` assigns `order = Date.now()`. Sometimes the user wants a new todo to appear at the top of the list, sometimes at the bottom, and there is no way to choose.

## Proposed solution

Add a Phosphor icon toggle inside the todo input shell (next to the existing pin toggles) that switches where new todos are added.

- Backend: add an optional `position` arg (`"top" | "bottom"`) to `createTodo`. Top inserts use `order = -Date.now()` so they sort before all existing todos with no reads and no write conflicts. Bottom stays `Date.now()` (default, backward compatible).
- Frontend: `addToTop` state in `TodoList.tsx`, persisted to localStorage (`todoAddToTop`). Toggle button uses Phosphor `ArrowLineUp` / `ArrowLineDown` icons, following the existing pattern where the icon shows the action a click performs. Visible on desktop and mobile since it changes add behavior, not just layout.
- Multi-line paste: when adding at top, lines are reversed before creation so the pasted block keeps its reading order.
- Demo mode: demo todos also respect the toggle via a negative order value.

## Files changed

- `convex/todos.ts` - `createTodo` gains optional `position` arg and negative-timestamp ordering for top inserts
- `src/components/TodoList.tsx` - toggle state, localStorage persistence, Phosphor icon button, position passed to create calls (typed add, paste, demo mode)

## Edge cases

- Repeated top inserts: later timestamps are more negative, so the newest todo stays at the very top (prepend behavior)
- Drag reorder rewrites orders to small indexes (0..n); negative orders sort before those, which matches top placement intent, and any manual drag normalizes everything
- Pinned todos still sort above everything regardless of this toggle (existing behavior preserved)
- Multi-line paste at top keeps line order by reversing before sequential creation

## Verification

- `npx tsc --noEmit` clean
- `npx convex-doctor --score` returns 100
- No linter errors in changed files

## Task completion log

- 2026-08-12 19:07 UTC - Implemented backend position arg, frontend toggle, paste and demo handling. Verified tsc, lints, convex-doctor 100.
