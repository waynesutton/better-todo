# Floating todo and timer windows

Created: 2026-08-10 21:35 UTC
Last Updated: 2026-08-10 21:55 UTC
Status: Done

## Problem

Users want the todo list and the Pomodoro timer to float outside the browser window so they stay visible on screen while working in other apps. Trigger buttons should use an icon from phosphoricons.com.

## Proposed solution

### Shared float window hook

`src/lib/useFloatWindow.ts`:

- Uses the Document Picture-in-Picture API (`window.documentPictureInPicture.requestWindow`) on Chromium for a true always-on-top floating window
- Falls back to a small `window.open` popup on browsers without the API (Safari, Firefox)
- Copies all stylesheets from the main document into the float window and mirrors the `data-theme` attribute so themes apply
- Returns a container element plus toggle/close functions; content renders via `createPortal`, so React context (Convex, Clerk) keeps working and everything stays real time
- Listens for `pagehide` on the float window to reset state when the user closes it

### Floating todos window

`src/components/FloatingTodoWindow.tsx`:

- `FloatingTodoButton` renders a Phosphor `PictureInPicture` icon button in the app header (date pages only)
- Window shows the selected date's top level todos from `api.todos.getTodosByDate` (live query), incomplete first, completed below with strikethrough
- Checkbox toggles completion through the existing `updateTodo` mutation
- Quick add input creates todos through the existing `createTodo` mutation

### Floating timer window

`src/components/FloatingTimerWindow.tsx`:

- `FloatingTimerButton` sits in the Pomodoro modal controls
- Window shows a live countdown computed from the Convex session (`remainingTime` minus elapsed since `lastUpdated` while running) with a 250ms local interval
- Controls: start (25 min preset), pause (writes computed remaining), resume, stop, all through existing `api.pomodoro` mutations
- Phase badge (Focus/Break plus round) matches the main modal
- The main tab's web worker stays the source of truth for phase transitions and sounds

### Icon

Install `@phosphor-icons/react` and use the `PictureInPicture` icon on both buttons.

## Files to change

- `package.json`: add `@phosphor-icons/react`
- `src/lib/useFloatWindow.ts`: new shared hook
- `src/components/FloatingTodoWindow.tsx`: new button plus window content
- `src/components/FloatingTimerWindow.tsx`: new button plus window content
- `src/App.tsx`: mount `FloatingTodoButton` in the header button row
- `src/components/PomodoroTimer.tsx`: mount `FloatingTimerButton` in modal controls
- `src/styles/global.css`: `.float-window` styles using existing theme variables

## Edge cases

- Browser allows only one document PiP window at a time: opening the second float closes the first (browser behavior, state resets via `pagehide`)
- User closes the float window directly: `pagehide` resets button state
- No Convex auth or invalid date (folder, pinned, backlog views): todo float button hides
- Popup blocked in fallback mode: toggle no-ops safely and logs
- Theme switch while float is open: `data-theme` syncs via effect
- Component unmount: float window closes

## Verification steps

1. `npx tsc --noEmit` on both tsconfigs passes
2. No linter errors on changed files
3. Manual: click float icons in Chrome, confirm always-on-top windows with live data, theme match, toggle and add todos, timer controls work
4. Manual: close float windows directly, buttons reset

## Task completion log

- 2026-08-10 21:35 UTC: PRD created
- 2026-08-10 21:50 UTC: Installed @phosphor-icons/react, built useFloatWindow hook, FloatingTodoWindow and FloatingTimerWindow components, wired buttons into App header and Pomodoro modal, added float styles to global.css
- 2026-08-10 21:55 UTC: Verified with tsc (clean) and ReadLints (clean); manual browser check of PiP behavior left for the user since it needs a signed-in Chrome session
