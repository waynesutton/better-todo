# Drag to reorder todos in the floating window

Created: 2026-08-31 21:30 UTC
Last Updated: 2026-08-31 21:30 UTC
Status: Done

## Problem

The floating todo window (Document Picture-in-Picture, with a popup fallback) renders the day's
todos as a flat checkbox list with no way to change their order. Reordering meant switching back
to the main window, dragging there, and watching the float window catch up. The float window is
meant to be the thing you keep on screen while working, so the ordering has to happen inside it.

## Root cause

`FloatingTodoWindow.tsx` shipped as a read plus toggle plus quick add surface. It never had a
`DndContext`, and its rows were plain `<label>` elements with no sortable node ref.

## Proposed solution

Reuse the same stack the main list uses (`@dnd-kit/core` and `@dnd-kit/sortable`) inside the
float window, wrapping only the incomplete section. Completed todos stay pinned below the Done
divider and are not draggable, since their order carries no meaning.

Two float specific details:

1. **Autoscroll is disabled.** `@dnd-kit/core` measures its autoscroll bounds against the bare
   `window` object (`window.innerHeight` / `window.innerWidth`) rather than the dragged node's
   own window, so in a PiP document it would compute thresholds against the main browser window.
   Pointer and keyboard listeners are fine because those go through `getOwnerDocument(target)`
   and `getWindow(target)`.
2. **The visible index is not the stored index.** `getTodosByDate` returns everything on the day,
   including headers, subtasks and archived rows. The float window shows only top level,
   unarchived, incomplete todos. `reorderTodos` splices into the full day list, so sending the
   visible index (what `TodoList` does) would drop the todo in the wrong slot whenever the day
   has headers or archived rows.

   Instead the drop is anchored to a neighbour: run `arrayMove` on the visible array, look at the
   todo that now sits directly before the dragged one, find that todo's index in the full day
   list minus the dragged item, and insert after it. If the todo moved to the top of the visible
   list, anchor to the todo that now follows it and insert before it.

## Files changed

- `src/components/FloatingTodoWindow.tsx` - new `FloatTodoRow` sortable row with a grip handle,
  `DndContext` plus `SortableContext` around the incomplete section, neighbour anchored
  `handleDragEnd` calling `api.todos.reorderTodos`
- `src/styles/global.css` - `.float-todo-grip` styles (hidden until row hover, `touch-action: none`,
  grab and grabbing cursors) and a static spacer variant for completed rows

No schema change and no Convex change. `reorderTodos` already does what is needed.

## Edge cases

- Dragging onto the same row: `active.id === over.id` returns early
- Dragging while the query is still loading: guarded by `!todos`
- Only one incomplete todo: no neighbour, `newOrder` resolves to -1 and the call is skipped
- A stray click on the grip: 4px activation distance means it does not read as a drag
- Clicking the grip does not toggle the checkbox, because the grip sits outside the `<label>`
- Completed rows render the grip as a transparent spacer so their text stays aligned
- Popup fallback window (non Chromium) behaves the same, since the sensors resolve their listener
  target from the event's owner document

## Verification

- `npx tsc --noEmit` passes
- `npx eslint src/components/FloatingTodoWindow.tsx` passes
- Manual: open a day with headers plus archived todos, float it out, drag a todo up and down,
  confirm the main window list mirrors the new order live and the order survives a reload

## Task completion log

- 2026-08-31 21:30 UTC - Implemented, typechecked and linted
