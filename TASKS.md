# Better Todo Implementation Tasks

A real-time markdown todo app with Notion-style input, daily notes, and Convex backend.

git add .
git commit -a -m "description"
git push -u origin main

## Recently Completed

- 2026-08-31 16:43 UTC - Copy and rollover keep source-day todo order, copy inserts in parallel, Agent Tasks can be turned off per user in Settings. PRD: prds/copy-order-and-agent-tasks-toggle.md

## Completed Tasks

- [x] Set up React 18 with TypeScript and Vite
- [x] Configure Convex backend with real-time database
- [x] Implement database schema (todos, notes, archivedDates, dateLabels tables)
- [x] Create TodoItem component with markdown rendering
- [x] Create TodoList component with Notion-style inline input
- [x] Add drag and drop functionality using @dnd-kit
- [x] Implement date-based organization system
- [x] Build resizable sidebar (200px - 500px)
- [x] Add sidebar collapse/expand functionality
- [x] Create dark theme (Sublime Text style)
- [x] Create light theme (Apple Notes style)
- [x] Implement theme switching with localStorage persistence
- [x] Add auto-archive on todo completion
- [x] Build ArchiveSection component
- [x] Add three-dot menu for moving todos between dates
- [x] Implement copy todos to Tomorrow/Previous/Next/Custom date
- [x] Add NotesSection with Edit/Preview tabs
- [x] Implement markdown support with syntax highlighting
- [x] Add multi-line input support (Enter for new lines, Shift+Enter to create)
- [x] Create mobile-optimized UI with auto-collapse sidebar
- [x] Add mobile overlay for sidebar
- [x] Implement paste detection for markdown lists
- [x] Add custom date labels feature
- [x] Build line numbers in notes section
- [x] Create bulk actions (Archive All/Delete All) for todos
- [x] Add delete controls for archived todos
- [x] Implement custom ConfirmDialog component
- [x] Build full-text search across todos and notes
- [x] Add keyboard shortcuts (Cmd/Ctrl+K for search)
- [x] Create SearchModal component
- [x] Add mobile-friendly add button ("+") for touch devices
- [x] Implement archive date functionality
- [x] Add multiple notes per date with drag-and-drop reordering
- [x] Migrate from WorkOS AuthKit to Clerk authentication
- [x] Add search indexes to schema for efficient full-text search
- [x] Implement local state with debouncing for notes typing
- [x] Add keyboard shortcuts for delete confirmations (Enter/Escape)
- [x] Create favicon and social meta tags
- [x] Add custom scrollbar styling for sidebar
- [x] Remove focus rings for clean minimal design
- [x] Enable native spell check, disable Grammarly
- [x] Implement CSS custom properties for font sizes
- [x] Add color system (mint green for positive, soft red for destructive)
- [x] Create comprehensive documentation (README, QUICKSTART, GETTING_STARTED)
- [x] create open graph images

## Completed Tasks (Continued)

- [x] User authentication with Clerk
- [x] User-specific data isolation
- [x] Production deployment configuration for Netlify
- [x] Environment variable setup for Clerk
- [x] JWT token validation with Clerk token templates
- [x] Authentication state management and error handling
- [x] User data storage in Convex database
- [x] Theme-aware login/logout UI components
- [x] Conditional query execution based on authentication state
- [x] "Sign In Required" modal for unauthenticated users
- [x] Production deployment documentation and troubleshooting guide
- [x] Enable Clerk authentication flow
- [x] Add user profile management
- [x] Implement logout functionality
- [x] Add user-specific queries and mutations
- [x] Update schema to include userId fields
- [x] Ephemeral mode for unsigned users (local storage)
- [x] Clerk button styling (white text in light mode, black in dark mode)
- [x] OTP code field styling with blue accent border
- [x] Authentication popup for "+ add note" button
- [x] Custom confirmation dialogs for sign-in prompts
- [x] Removed "Don't have an account?" links from Clerk modals

## In Progress Tasks

- None currently

## Completed Tasks (v.041 - 2026-08-28)

- [x] **Kanban performance** - Cut the read amplification and the render churn the board introduced (2026-08-28 01:40 UTC)
  - `npx convex insights` on production returned one warning: `todos.js:deleteTodo` retried on OCC conflicts 6 times in 72 hours against `todos`, every event with `occ_retry_count: 0`, so they resolved on the first retry rather than failing
  - Root cause on the backend: ownership checks written as `withIndex("by_user").filter(_id)` read a user's whole todo range to find one document, so any concurrent write invalidated the transaction. Same shape in subtask lookups, `kanban.deleteColumn`, and `kanban.moveTodosToColumn`, which collected all user todos to resolve a handful of ids. A drag fires a mutation per drop, so the board made a latent problem visible
  - `convex/schema.ts`: added `by_user_and_kanbanColumn` and `by_user_and_parent` on `todos`
  - `convex/todos.ts`: new `getOwnedTodo` (direct `ctx.db.get` plus a userId comparison, read set of one) and `getSubtasksOf` (parallel indexed queries), applied to `createSubtask`, `updateTodo`, `deleteTodo`, `reorderTodos`, `moveTodoToDate`, and `moveTodoToFolder`. `getAvailableDates` now reads `fullPageNotes` through `by_user` instead of an unindexed filter that scanned the table across every user
  - `convex/kanban.ts`: `deleteColumn` finds orphans through the new index; `moveTodosToColumn` `get`s only the ids it was handed and checks ownership per card, so a foreign id is skipped rather than failing the batch
  - Root cause on the client: the per-card prop bundle was built by rest spread, handing every card a new object each render, and neither `KanbanColumn` nor `KanbanCard` was memoised. `onDragOver` sets `hoverColumnKey` on every pointer move, so one drag re-rendered every `TodoItem` on the board dozens of times
  - `src/components/KanbanBoard.tsx`: shared props are a `useMemo`, column callbacks are `useCallback` keyed by column key so one function serves every column, and both column and card are wrapped in `React.memo`. A hover change now re-renders only the two columns whose `isDropTarget` flipped
  - Verified: tsc clean, eslint clean on all six files (one pre-existing `no-explicit-any` in `updateTodo`), production build clean, `convex-doctor --score` 100, both indexes live on dev. PRD: prds/kanban-performance-and-composers.md
- [x] **Board view for rolled-over days** - A day whose work moved forward no longer reads as finished (2026-08-28 01:40 UTC)
  - `moveTodosToNextDay` and the rollover cron copy a todo to the new date and patch the original with `archived: true`, leaving a stub. `resolveColumn` sent every archived card to Done, and `TodoList` passed `todos` straight through in board view while filtering them in list view, so the previous day's board showed all of its work as complete
  - `src/components/KanbanBoard.tsx`: new `isOnBoard` keeps a card when it is completed or not archived, dropping archived-but-incomplete stubs the way list view does. `resolveColumn` routes only `completed: true` cards to Done
  - `convex/todos.ts` and `convex/rollover.ts`: `copyTodosToDate`, `moveTodosToNextDay`, and `rolloverDay` all carry `kanbanColumn` to the new row, so in-progress work lands in the same column on the new day instead of resetting to the default
  - Verified: tsc clean, eslint clean, production build clean. PRD: prds/kanban-performance-and-composers.md
- [x] **Permanent composer at both ends of a column** - Adding to the top no longer needs a hover target or a menu (2026-08-28 01:40 UTC)
  - `src/components/KanbanBoard.tsx`: a second composer above the cards that inserts at index 0, so typing a run of cards keeps the newest on top. Insert lines now start at index 1, since the top and bottom positions have their own inputs. The column menu's "Add card to top" focuses the top composer instead of duplicating its behaviour
  - `src/styles/global.css`: new `.kanban-column-composer.is-top` variant that divides itself from the header below rather than above; removed the now-unused first-line label styles
  - Verified: tsc clean, eslint clean, production build clean. PRD: prds/kanban-performance-and-composers.md

## Completed Tasks (v.040 - 2026-08-23)

- [x] **Kanban Board View** - Per day and per project board with drag and drop, custom columns, and group move (2026-08-23 06:05 UTC)
  - New `convex/kanban.ts`: `getColumns`, `addColumn`, `renameColumn`, `deleteColumn`, `reorderColumns`, `createTodoInColumn`, `moveTodosToColumn`
  - New `kanbanColumns` table plus `kanbanColumn` and `kanbanOrder` on `todos` in `convex/schema.ts`; the four todo queries in `convex/todos.ts` return both new fields
  - `moveTodosToColumn` takes the destination column's full ordered id list so the mutation patches without a read-modify-write, avoiding conflicts on rapid drags; only dragged cards flip completion, so reordering neighbours never completes them
  - Columns fall back to virtual defaults (To do, Doing, Done, Backlog) until the first edit, so a new account gets a working board with zero writes
  - New `src/components/KanbanBoard.tsx` with dnd-kit sortable columns and cards, a drop zone per column body so empty columns accept cards, group select via Cmd/Ctrl/Shift click, a bulk move bar, and a drag overlay with a count badge
  - `src/components/TodoItem.tsx` gained a `card` variant: the board owns the sortable, supplies the drag handle, intercepts checkbox toggles via `onCompletedChange`, and the menu portals to the body with viewport coordinates so a scrolling column cannot clip it
  - `src/components/TodoList.tsx` switches on a `viewMode` prop and hides the shared input in board mode since each column has its own composer
  - `src/App.tsx`: Kanban/Rows header toggle, `Shift + B` shortcut, and per scope overrides in localStorage pruned to 60 entries
  - Board view is suppressed on the Pinned and Backlog views
  - Fixed an existing bug in the `Shift + A` send to agent handler that read `todo.text` instead of `todo.content`
  - Verified: tsc clean, eslint clean on all touched files, production build clean. PRD: prds/kanban-board-view.md
- [x] **Default Todo View setting** - List or Board as the starting view for every day and project (2026-08-23 06:05 UTC)
  - New `defaultTodoView` field on `userPreferences` and a `setDefaultTodoView` mutation in `convex/users.ts`
- [x] **Keyboard Shortcuts modal renamed to Settings** - GearSix icon, settings on top, shortcut tables at the bottom (2026-08-23 06:05 UTC)
  - `src/components/KeyboardShortcutsModal.tsx` reordered: Default Todo View, Font Size, Auto Rollover, API Keys, Code Blocks, then a Keyboard Shortcuts divider with the tables
  - `src/components/Sidebar.tsx` button relabeled to Settings with a GearSix icon
  - `Shift + B` added to the navigation shortcuts list
- [x] **Board theme parity** - Kanban UI verified and corrected across Dark, Light, Tan, and Cloud (2026-08-24 07:35 UTC)
  - Added seven `--board-*` tokens in `src/styles/global.css` (line, line-strong, pick, pick-ink, wash, muted, lift) with per theme overrides, replacing every direct `--accent`, `--border-color`, `--bg-hover`, `--text-secondary`, and hardcoded shadow in the board and Settings choice CSS
  - Root cause in Cloud: `--border-color`, `--bg-hover`, and `--accent` are all `#e8e8e8` and `--text-secondary` equals `--text-primary`, so columns, drop targets, selection rings, and the active Settings choice had no visible edge. Cloud now uses `#c9c9c9` hairlines, `#171717` ink as its emphasis color (already its checkbox and button color), an `#e2e2e2` wash, and a `#5f5f5f` muted gray
  - Dark: `--board-pick-ink` is now near-black on the blue swatch (white measured 2.8:1) and `--board-lift` doubles to `rgba(0,0,0,0.5)` since a soft black shadow vanishes on a mid dark surface
  - Drop targets and the active Settings choice gained an inset ring so the state is a doubled edge, not color alone; board secondary text dropped `opacity` for real muted colors, clearing 4.5:1 at 10px and 12px in all four themes; added `:focus-visible` rings for every board control plus the composer
  - Fixed `.search-button.nav-icon-active` in Cloud, where an active header icon rendered as a near background gray
  - Verified: rendered the compiled CSS against all four themes in a static harness and inspected column structure, drop target, card hover, selection ring, drag overlay, count badge, and Settings choice cards; tsc clean, production build clean
- [x] **Done state sync between board and list** - The two views now agree on what is finished (2026-08-24 15:55 UTC)
  - `src/App.tsx`: new `boardViewActive` flag hides the footer `ArchiveSection` while the board is open, so a completed card no longer renders in both the Done column and the Done section below it
  - `src/components/KanbanBoard.tsx`: `resolveColumn` now checks `completed`/`archived` before `kanbanColumn`, and refuses to place an active card in a done column. `todos.updateTodo` never touches `kanbanColumn`, so checking a card off in list view used to leave the board showing it under Doing, and unchecking one from the Done section left it parked in Done as an active card
  - Kept as a read time rule rather than a write in `updateTodo`, so the hot completion path gains no extra writes and no new conflict window
  - Verified: tsc clean, eslint clean on both files (only pre-existing warnings), production build clean. PRD: prds/kanban-board-view.md

- [x] **Board full height and mobile** - Columns reach the bottom of the window at every size (2026-08-24 17:40 UTC)
  - `src/components/TodoList.tsx`: the todo container carries `data-view="board" | "list"`, the hook the board's layout rules hang off
  - `src/styles/global.css`: board view turns the container into a flex column, `.kanban-wrapper` takes `flex: 1`, and `.kanban-board` stretches its columns. `.kanban-column-body` is the only scroller (`flex: 1`, `overflow-y: auto`, `overscroll-behavior: contain`); header, composer, and context hold their size with `flex-shrink: 0`. Removed the old `max-height: min(58vh, 520px)` cap that made columns hug their cards
  - `.kanban-selection-bar` moved from sticky to absolute so a selection no longer shortens every column. `.kanban-add-column` opts out of the stretch with `align-self: flex-start`
  - Floor of 300px on the wrapper, 200px under `max-height: 560px` (phone landscape). Past the floor the page scrolls so notes stay reachable
  - Touch: drag grips at 32x44px, `-webkit-overflow-scrolling: touch` on column bodies, and tighter `add-note-button` margins in board view to hand ~80px back to the columns
  - `src/components/KanbanBoard.tsx`: the loading skeleton renders inside `.kanban-wrapper` so it fills the same frame as the real board, no layout jump on first paint
  - Verified in a throwaway static harness against the compiled stylesheet, since the board sits behind auth. At 1440x900: board 740px, all four columns 728px and equal, 51px to the footer and all of it the Add Note button. At 532x356: the 200px floor holds, a column body shows 72px of a 651px list and scrolls, the composer stays visible, and nothing overlaps the footer. Board height is 200px whether the selection bar is up or not, and holds its floor with eight notes below while the page scrolls
  - Verified: tsc clean, eslint clean, production build clean. PRD: prds/kanban-board-view.md

- [x] **In-app changelog page caught up to v.040** - Seven releases were missing from the app (2026-08-24 17:55 UTC)
  - `src/pages/Changelog.tsx`: the page had stalled at v.033 while `changelog.md` reached v.040. Added sections for v.034 (Move to Custom Date), v.035 (Todo Input Placement Toggle), v.036 (Default Todo Cleanup Cron), v.037 (End of Day Auto Rollover), v.038 (Floating Windows), v.039 (Todo Add Position Toggle), and v.040 (Kanban Board View)
  - Moved the page title and intro onto v.040 as the new top section, extended the sidebar `sections` index, and changed the default `activeSection` from `v033` to `v040` so scroll-spy starts on the newest release
  - `files.md`: added a `src/pages/Changelog.tsx` entry, which was never documented, and corrected two stale `changelog.md` descriptions that still read v.033 and v.030
  - Verified in the browser: 39 sidebar links against 39 rendered sections, no missing anchors, no orphan sections, one `h1`. tsc clean, eslint clean, production build clean

- [x] **Board card insertion, column menu, and To do drift** - Four board fixes in one pass (2026-08-25 03:40 UTC)
  - Add a card at any line: `src/components/KanbanBoard.tsx` renders a hairline insert control in every gap between cards plus a labelled Add to top control at the head of the column. Clicking one opens a composer in place; Enter reopens it one line lower so a run of cards keeps its typed order; Escape or an empty blur restores the line. The column body is built as a flat child list with one stable key on the composer, so the composer is moved rather than remounted as cards land above it and focus survives the write
  - `convex/kanban.ts`: `createTodoInColumn` takes an optional `kanbanOrder`, validated by a new `safePosition` that keeps fractional values (unlike `safeOrder`, which truncates). The client sends the midpoint of the two neighbouring cards via `positionForIndex`, so an insert writes one row instead of renumbering the column, and the next drag through the column renormalises to whole numbers
  - Root cause of cards leaving To do: `resolveColumn` fell back to "leftmost active column" for cards with no `kanbanColumn` of their own, so any change to the column set or order could move a stack of untouched cards. New `homeColumn` helper, mirrored in `convex/kanban.ts` and `src/components/KanbanBoard.tsx`, anchors home to the seeded `todo` key with an ordered fallback. `deleteColumn` and `handleCompletedChange` use it too
  - Column menu skin: `.kanban-column-menu .menu-item` was inheriting the list view's `.menu-item`, authored for divs, so the board's buttons rendered with native chrome. Stripped the chrome, restated the hover fill with `--board-wash` (the reset had erased the base `:hover` rule that appears earlier in the file), and moved the dropdown edge and shadow onto `--board-line` and `--board-lift`
  - Menu and copy audit: menu gained Add card to top, rename moved from double click to a single click on the title with `aria-haspopup`/`aria-expanded` on the trigger and `role="menuitem"` on the rows, delete sits behind a separator and its dialog now names the column, counts the cards, says where they land, and says nothing is deleted. Empty column copy split by column kind
  - Touch: insert lines sit at 0.45 opacity instead of waiting for a pointer, and their hit area grows to 24px while the visible hairline stays thin
  - Verified: tsc clean, eslint clean on both files, production build clean, convex-doctor 100/100 (one pre-existing `convex.json` config warning). Board sits behind auth, so on-screen confirmation is the user's. PRD: prds/kanban-board-view.md

## Completed Tasks (v.039 - 2026-08-12)

- [x] **Todo Add Position Toggle** - Choose whether new todos are added at the top or bottom of the list (2026-08-12 19:07 UTC)
  - `createTodo` in `convex/todos.ts` gains an optional `position` arg; top inserts use `order = -Date.now()` (no reads, no write conflicts), bottom stays the default
  - New Phosphor ArrowLineUp/ArrowLineDown toggle button in the input shell in `src/components/TodoList.tsx`, shown on desktop and mobile
  - Preference saved to localStorage (`todoAddToTop`); multi-line paste reverses lines at top so pasted order is preserved; demo mode todos respect the toggle
  - Verified: tsc clean, no lints, convex-doctor 100. PRD: prds/todo-add-position-toggle.md

## Completed Tasks (v.038 - 2026-08-10)

- [x] **Floating Todo and Timer Windows** - Pop todos and the Pomodoro timer out of the browser (2026-08-10 21:55 UTC)
  - New `src/lib/useFloatWindow.ts` hook using the Document Picture-in-Picture API (always on top, Chromium) with a `window.open` popup fallback for Safari/Firefox
  - Styles and theme (`data-theme`) copied into the float window; content rendered via React portal so Convex live queries keep working
  - `src/components/FloatingTodoWindow.tsx`: header button (Phosphor PictureInPicture icon) opens a floating live todo list with checkbox toggle and quick add
  - `src/components/FloatingTimerWindow.tsx`: button in the Pomodoro modal opens a floating live countdown with start, pause, resume, and stop
  - Added `@phosphor-icons/react`; float styles in `global.css` using existing theme variables
  - Verified: tsc clean, no lints. PRD: prds/floating-pip-windows.md

## Completed Tasks (v.037 - 2026-08-10)

- [x] **End of Day Auto Rollover** - Per-user setting to auto move yesterday's incomplete todos to today (2026-08-10 21:45 UTC)
  - New `convex/rollover.ts` with hourly cron entry point, per-user rollover mutation, and one-time 30 day backfill
  - Added `autoRolloverEnabled`, `lastAutoRolloverDate`, `rolloverBackfillAt` fields plus `by_autoRollover` index to `userPreferences`
  - Rollover copies incomplete todos to today and archives originals (same semantics as manual Move to Next Day), then closes yesterday when it has no notes or active full page notes
  - Runs once per local day per user (timezone aware, defaults to UTC); cron registered hourly at :05 in `convex/crons.ts`
  - Settings modal gained an End of Day Auto Rollover section with On/Off toggle and a one-time Backfill last 30 days button showing moved/closed counts
  - Verified: tsc clean, no lints, convex-doctor 100. PRD: prds/auto-rollover-end-of-day.md

## Completed Tasks (v.036 - 2026-07-06)

- [x] **Default Todo Cleanup Cron** - Daily job removes placeholder-only past days (2026-07-06 22:25 UTC)
  - New `convex/crons_cleanup.ts` with `cleanupDefaultDayTodos` internal mutation (supports `dryRun`)
  - Deletes the untouched "what's the priority?" todo when it is the only content on a past day, dropping the day from the sidebar
  - Skips days with notes, full-page notes, archived todos, or edited placeholders; also cleans orphaned dateLabels/archivedDates rows
  - Registered daily at 12:00 UTC in `convex/crons.ts`; tested on dev (13 stale days removed, verify pass clean, convex-doctor 100)
  - First production run: `npx convex run crons_cleanup:cleanupDefaultDayTodos --prod` after deploy. PRD: prds/cleanup-default-day-todos.md

## Completed Tasks (v.035 - 2026-07-06)

- [x] **Todo Input Placement Toggle** - Input can now sit above or below the todo list (2026-07-06 18:35 UTC)
  - Added PinTop/PinBottom toggle button to the input shell in `src/components/TodoList.tsx` (desktop only)
  - Top placement renders above the list, below header and date text; bottom stays the default
  - Preference saved to localStorage (`todoInputAtTop`); left/center alignment toggle unaffected
  - Added `data-position` CSS rule in `src/styles/global.css`; verified with `npx tsc --noEmit`

## Completed Tasks (v.034 - 2026-07-06)

- [x] **Move to Custom Date** - New sidebar date menu option (2026-07-06 18:22 UTC)
  - Added "Move to Custom Date..." to the three-dot date menu in `src/components/Sidebar.tsx` (main date list and project folder date list)
  - Opens the existing date picker in "move" mode; button label switches between Copy and Move
  - Reuses the existing `moveTodosToNextDay` mutation (accepts any target date, idempotent, archives source todos)
  - No backend changes required; frontend typecheck passed

## Completed Tasks (v.033 - 2026-04-24)

- [x] **Weekly Recap Manual Mode** - Converted weekly recap from auto-cron to manual-only, repeatable trigger
  - Removed hourly cron job from `convex/crons.ts` (file now exports empty cron config)
  - Removed `tick` internal action from `convex/weeklyRecap.ts`
  - Updated `generateRecapForUser` to delete previous recap before recreating (via new `deleteExistingRecap` mutation)
  - Removed empty-note guard from `generateWeeklyRecapIntoNote` in `convex/fullPageNotes.ts` (can overwrite existing content)
  - Added `deleteExistingRecap` internal mutation to `convex/weeklyRecapQueries.ts`
  - Removed dead code: `getExistingRecap` and `listUsersWithTimezone` queries

## Completed Tasks (v.032 - 2026-04-10)

- [x] **Weekly Recap** - Automated and manual weekly productivity summaries
  - Added `completedAt` field and `by_user_and_completedAt` index to todos table
  - Added `timezone` field to userPreferences table
  - Created `weeklyRecapRuns` table for deduplication with `by_user_and_weekKey` index
  - Updated `updateTodo` to set/clear `completedAt` on completion toggle
  - Created `convex/weeklyRecap.ts` with Node.js internal actions (tick, generateRecapForUser, generateRecapIntoNote)
  - Created `convex/weeklyRecapQueries.ts` with internal queries and mutations
  - Created `convex/crons.ts` with hourly interval for weekly recap tick
  - Added `generateWeeklyRecapIntoNote` public mutation to `convex/fullPageNotes.ts`
  - Added `setTimezoneIfMissing` mutation to `convex/users.ts`
  - Added CalendarCheck button to `FullPageNoteTabs.tsx` for manual trigger on empty notes
  - Added timezone sync useEffect to `App.tsx`
  - AI summarization with Claude/OpenAI and plain-text fallback

- [x] **Weekly Recap Fix** - Blank note body on live site
  - Backfilled `completedAt` on 237 existing completed todos (used `_creationTime` as proxy)
  - Added fallback query in `getCompletedTodosInRange` that scans by `_creationTime` when no `completedAt` index results
  - Wrapped `generateRecapIntoNote` in top-level try/catch so the note always gets content
  - Added `backfillCompletedAt` internal mutation for re-runnable data repair
  - Added Loader2 spinner on CalendarCheck button while recap generates (clears on content arrival or 15s timeout)
  - Delete and re-click works: manual path has no dedupe, creates fresh recap each time

- [x] **convex-doctor integration** - Static analysis for Convex backend health
  - Installed convex-doctor as devDependency with npm script
  - Created `convex-doctor.toml` with justified rule suppressions and CI threshold
  - Improved score from 43 to 100
  - Fixed `security/internal-api-misuse` in stats.ts and unsplash.ts/pomodoro.ts
  - Fixed `correctness/node-query-mutation` by splitting weeklyRecap into two files
  - Fixed `perf/loop-run-mutation` by consolidating queries in weeklyRecapQueries
  - Added CORS OPTIONS handler to http.ts for `/meta/share`
  - Created `convex.json` for missing config warning
  - Created `.cursor/skills/convex-doctor/SKILL.md` and `.cursor/rules/convex-doctor.mdc`

## Completed Tasks (v.031 - 2026-01-13)

- [x] **Executable Notes (Run Note)** - Turn notes into executable programs with AI tool use
  - New "Run" task type interprets natural language and executes via tools
  - AI agent loop pattern with multi-step tool execution
  - Run Note button on full-page notes and inline notes
  - Execution log shows tool calls with inputs, results, and status
  - Collapsible execution log with scroll support
  - Support for both Claude and OpenAI providers

- [x] **AI Agent Tools** - Comprehensive tool set for note execution
  - `createTodo`, `updateTodo`, `completeTodo`, `deleteTodo` for todo management
  - `createNote`, `updateNote` for note management
  - `moveTodosToDate`, `searchTodos`, `searchNotes` for organization
  - `getTodosForDate`, `archiveDate` for queries and archiving

- [x] **Backend: Agent Tools Module** (`convex/agentTools.ts`) - New file
  - Centralized tool definitions with schemas
  - `getClaudeTools()` and `getOpenAITools()` formatters
  - `EXECUTABLE_NOTE_SYSTEM_PROMPT` for run task guidance

- [x] **Backend: Agent Tool Mutations** (`convex/agentToolMutations.ts`) - New file
  - Internal mutations for each tool action
  - Indexed queries for ownership checks
  - Idempotent mutations with early returns
  - Parallel operations where possible

- [x] **Backend: Agent Task Actions Updates** (`convex/agentTaskActions.ts`)
  - Added `processExecutableNote` internal action
  - `runClaudeAgentLoop` for Claude tool use
  - `runOpenAIAgentLoop` for OpenAI function calling
  - `executeAgentTool` dispatcher
  - Real-time execution log updates
  - Max 10 iterations safety limit

- [x] **Backend: Schema Updates** (`convex/schema.ts`)
  - Added `run` to `taskType` union
  - Added `executionLog` field for tool call tracking

- [x] **Backend: Agent Tasks Updates** (`convex/agentTasks.ts`)
  - `appendExecutionLogEntry` internal mutation
  - `updateTaskWithExecutionLog` internal mutation
  - `createAgentTask` schedules `processExecutableNote` for run tasks

- [x] **Frontend: Run Note UI**
  - `FullPageNoteTabs.tsx` - Run Note button with Play icon
  - `NotesSection.tsx` - Run Note for inline notes
  - `AgentTaskModal.tsx` - Run task type option
  - `App.tsx` - onRunNote callbacks for notes and folders

- [x] **Frontend: Execution Log Display** (`AgentTasksView.tsx`)
  - Collapsible execution log section for run tasks
  - Tool calls with name, input, result, and status
  - Visual indicators: pending (yellow), success (green), error (red)
  - Chevron toggle for collapse/expand
  - Scrollable entries (max-height 300px)

- [x] **CSS: Execution Log Styles** (`global.css`)
  - `.agent-task-execution-log` container
  - `.agent-task-execution-log-header` clickable button
  - Status-based backgrounds for entries
  - `.run-note-button` hover styles for all themes
  - Mobile responsive styles

- [x] **Fix: Follow-up Processing Panel**
  - Processing panel only shows during initial task (no result)
  - Follow-ups use inline "Thinking..." indicator
  - Prevents duplicate processing indicators

## Completed Tasks (v.030 - 2026-01-12)

- [x] **Persistent Navigation Icons** - Keep all view icons visible at all times
  - Todos (checkbox), Notes (FileText), Chat (MessageCircle), and Agent (Sparkles) icons always visible
  - Each icon toggles its respective view (click to open, click again to close)
  - Added `nav-icon-active` CSS class with accent color for active state
  - Icons still hidden on pinned/backlog views where features don't apply
  - Simplified header icon logic in App.tsx

## Completed Tasks (v.029 - 2026-01-12)

- [x] **Per-User API Keys** - Users must provide their own API keys for AI features
  - Added "API Keys" section in Keyboard Shortcuts Modal (press ?)
  - Support for both Claude (Anthropic) and OpenAI API keys
  - Keys stored securely in Convex database (encrypted at rest)
  - Masked key display in UI (only last 4 characters visible)
  - Help links to get API keys from console.anthropic.com and platform.openai.com
  - Save and delete functionality per provider
  - Show/hide password toggle for key input
  - Each user must provide their own keys to use AI features

- [x] **Backend: User API Keys Module** (`convex/userApiKeys.ts`)
  - `getUserApiKeys` query returns masked keys for UI display
  - `getApiKeyInternal` internal query returns full key for actions (not exposed to client)
  - `setApiKey` mutation to save/update API keys
  - `deleteApiKey` mutation to remove API keys
  - Added `userApiKeys` table to schema with `by_user` index

- [x] **Updated AI Actions to Require User Keys**
  - `aiChatActions.ts` - Updated `generateResponse` to require user's Anthropic key
  - `agentTaskActions.ts` - Updated `processAgentTask` and `processFollowUp` to require user API keys
  - Helper functions require user API key parameter
  - Clear error messages directing users to Settings if no key configured

- [x] **Frontend: API Keys Management UI**
  - New "API Keys" section in KeyboardShortcutsModal
  - Input fields for Anthropic and OpenAI keys (password type)
  - Show/hide toggle for each key input
  - Save button per provider with loading state
  - Masked display when key is saved with delete button
  - Help links to provider API key pages
  - Error handling with inline error display

- [x] **CSS Styles for API Keys Section**
  - `.api-keys-section` container with top border separator
  - `.api-key-input-row` and `.api-key-input-wrapper` for input layout
  - `.api-key-save-btn` and `.api-key-delete-btn` button styles
  - `.api-key-help-link` for external links
  - Mobile responsive styles for API key inputs

## Completed Tasks (v.028 - 2026-01-12)

- [x] **AI Chat Clear and Delete Commands** - Manage chat history
  - Added `/clear` command to clear all messages (with confirmation dialog)
  - Added `/delete` command to permanently delete chat from database (with warning)
  - Added header buttons for Clear and Delete (visible when chat has messages)
  - Delete removes chat from sidebar automatically via Convex reactivity
  - Chat view closes after deletion and returns to todos
  - Updated `AIChatView.tsx` with `onClose` callback integration

- [x] **Agent Tasks Delete All** - Bulk delete functionality
  - Added `deleteAllAgentTasks` mutation to `convex/agentTasks.ts`
  - Supports filtering by date or folder
  - Added "Delete All" button to AgentTasksView header
  - Confirmation dialog shows count of tasks to be deleted
  - Uses `Promise.all()` for parallel deletion

- [x] **CSS Styles for New Controls**
  - Added `.ai-chat-header-actions` and `.ai-chat-header-action` styles
  - Added `.agent-tasks-delete-all` button styles
  - Danger hover states with red color (#e16d76)
  - Mobile responsive styles

## Completed Tasks (v.027 - 2026-01-12)

- [x] **Markdown Download for Full-Page Notes** - Download notes as .md files
  - Added Download icon button to full-page notes toolbar
  - Client-side download with sanitized filename
  - Uses Blob and createObjectURL for browser download

- [x] **Create Todos from Agent Results** - Parse AI output into actionable todos
  - Added `createTodosFromAgent` mutation to `convex/agentTasks.ts`
  - Parses markdown checkboxes, bullets, and numbered lists
  - Creates todos in same date/folder context as agent task
  - Uses `Promise.all()` for parallel todo insertion
  - Added "Create Todos" button to AgentTasksView

- [x] **Save Agent Results as Notes** - Preserve AI output as full-page notes
  - Added `saveResultAsNote` mutation to `convex/agentTasks.ts`
  - Saves entire conversation including follow-ups
  - Creates note in same date/folder context
  - Added "Save as Note" button to AgentTasksView

- [x] **Persistent Agent Tasks Icon** - Always visible in header
  - Removed condition hiding icon when in notes/chat views
  - Icon now visible from any view (todos, notes, chat)
  - Closes current view when switching to agent tasks

- [x] **ESC Key Fullscreen Exit** - Smarter escape handling
  - First ESC exits fullscreen mode if active
  - Second ESC closes full-page notes view entirely
  - Added `isFullscreenNotes` to keyboard handler dependencies

- [x] **Mobile Responsiveness** - Action bar and agent tasks UI
  - Added responsive styles for agent task action bar
  - Touch-friendly button sizing
  - Proper spacing and wrapping on small screens

## Completed Tasks (v.026 - 2026-01-11)

- [x] **AI Agent Tasks** - Send todos and notes to Claude or OpenAI for processing
  - Added `agentTasks` table with conversation history support
  - Indexes for efficient filtering by user, status, date, and folder
  - `createAgentTask` mutation schedules background processing
  - `addFollowUpMessage` mutation continues conversations in same thread
  - `processAgentTask` and `processFollowUp` actions for AI processing
  - Task types: Expand, Code, Summarize, Analyze, Other (custom instructions)
  - Provider selection: Claude (Anthropic) or OpenAI
  - Added `AgentTaskModal.tsx` for task configuration
  - Added `AgentTasksView.tsx` for viewing results and conversations
  - Markdown rendering with syntax-highlighted code blocks
  - Keyboard shortcut `Shift + A` to send focused todo to agent
  - Sparkles icon in header to access Agent Tasks view
  - Per-date and per-folder task filtering
  - Added `openai` package dependency

## Completed Tasks (v.025 - 2026-01-10)

- [x] **Inline Todo Notes in Project Folders** - Fixed bug where notes showed across projects
  - Added `folderId` field to notes schema (optional, for folder association)
  - Made `date` field optional (notes can belong to folder instead of date)
  - Added `by_user_and_folder` index for efficient folder-based note queries
  - Added `getNotesByFolder` query to convex/notes.ts
  - Updated `getNotesByDate` to filter out folder-associated notes
  - Updated `createNote` mutation to accept optional `folderId` parameter
  - Updated `reorderNotes` mutation to support both date and folder-based reordering
  - Updated `NotesSection` and `PinnedNotesSection` components to accept `folderId` prop
  - Updated `TodoList` to pass `folderId` to notes components when in folder view
  - Notes created in folders are now properly scoped to that folder only

## Completed Tasks (v.024 - 2026-01-02)

- [x] **Shareable URLs for Dates and Projects** - Copy link to navigate directly to dates and projects
  - Added Copy Link option to sidebar date and project menus
  - Dates use `/d/YYYY-MM-DD` format (e.g., `/d/2026-01-02`)
  - Projects use short NanoID-style slugs `/p/:slug` (e.g., `/p/ork88fqr`)
  - 8 alphanumeric character slugs for clean, short URLs
  - Backwards compatible - supports both new slugs and legacy full Convex IDs
  - Auto-generates slugs for existing folders without slugs when copying link
  - URL navigation auto-expands and highlights the selected folder in sidebar
  - Active folder header styling with theme-aware colors
  - Added `slug` field and `by_slug` index to folders schema
  - Added `generateSlug()`, `getFolderBySlug`, `generateFolderSlug` to convex/folders.ts
  - Updated App.tsx routing from `/p/:folderId` to `/p/:folderSlug`
  - Added race condition guards for URL sync

- [x] **Sidebar Collapse Keyboard Shortcut** - Quick toggle for sidebar visibility
  - Press Cmd+. (Mac) or Ctrl+. (Windows/Linux) to toggle sidebar collapse
  - Added to keyboard shortcuts modal in Navigation section

## Completed Tasks (v.023 - 2025-12-19)

- [x] **Infinite Re-render Loop Fix** - Fixed app crash when left open in browser
  - Added refs (`prevProfileModalRef`, `prevSignUpModalRef`, `prevSignInModalRef`) to track modal states
  - Modified useEffect hooks to only call `user?.reload?.()` when modal transitions from open to closed
  - Prevents continuous re-render cycle that caused browser tab crashes and "Code 5" errors
  - No changes to Convex backend required (frontend-only fix)

## Completed Tasks (v.022 - 2025-12-10)

- [x] **AI Chat Image and Link Support** - Upload images and attach links for AI analysis
  - Added image upload button with file picker (max 3 images, 3MB each)
  - Added link attach button with URL modal and validation
  - Auto-detect URLs in messages for scraping
  - Preview area for attached images and links
  - Firecrawl integration for web scraping
  - Claude vision support for image analysis
  - Updated schema to support attachments in messages
  - Added `generateUploadUrl`, `getStorageUrl`, `addUserMessageWithAttachments` mutations
  - Mobile-responsive attachment UI

- [x] **Streaks Icon Inline SVG** - Replaced external SVG file with inline component
  - Uses currentColor for theme-aware styling
  - Removed CSS filter-based theming
  - Better performance and consistency

## Completed Tasks (v.021 - 2025-12-03)

- [x] **Pomodoro Duration Toggle While Paused** - Change timer duration when paused
  - Added duration toggle button (25, 50, 90 min) in modal and full-screen when paused
  - Created `updatePomodoroPreset` mutation for smooth single-patch transitions
  - No UI flickering (avoids stop/start cycle)
  - Timer resets to new duration and stays paused
  - Uses Waves/Activity/Clock icons for duration presets
  - Widened modal to 480px to accommodate additional button
  - Added flex-wrap to controls for mobile responsiveness

- [x] **Move to Next Day** - New option in date menu to move incomplete todos
  - Added `moveTodosToNextDay` mutation to Convex backend
  - Copies non-completed, non-archived todos to the next day
  - Archives original todos after moving
  - Uses idempotent patterns with early returns
  - Parallel operations with `Promise.all()` for efficiency
  - Added menu item in Sidebar date dropdown

- [x] **Query Guards** - Added authentication guards to sidebar queries
  - Prevents unnecessary subscriptions when not authenticated
  - Uses `isAuthenticated ? undefined : "skip"` pattern
  - Reduces memory pressure and potential race conditions

- [x] **Console Log Cleanup** - Removed debug console.log statements
  - Cleaned up FullPageNoteView.tsx debug logging

## Completed Tasks (v.009.2 - 2025-11-01)

- [x] **Move Full-Page Notes to Projects and Dates** - Flexible note organization
  - Added "Move to Project..." and "Move to Date..." menu options for full-page notes
  - Made date field optional in fullPageNotes schema (notes can exist in projects without dates)
  - Added folderId field for project association
  - Created getFullPageNotesByFolder and getFullPageNoteCountsByFolder queries
  - Implemented moveFullPageNoteToFolder and moveFullPageNoteToDate mutations
  - Added NotesForFolder component to display notes in projects
  - Added note count badges on project folders
  - Updated search to handle notes with or without dates
  - Project selector modal matches sidebar UI design
  - Notes maintain proper order when moved between dates and projects
  - Projects are fully decoupled from dates - notes can exist independently

## Completed Tasks (v.009 - 2025-10-31)

- [x] **Full Markdown Support in Notes** - Comprehensive markdown rendering
  - Added react-markdown and remark-gfm packages
  - Updated NotesSection component to use ReactMarkdown
  - Updated FullPageNoteView component to use ReactMarkdown
  - Updated KeyboardShortcutsModal to mention markdown support
  - Added comprehensive CSS styling for all markdown elements
  - Markdown works naturally without needing ```md wrapper
  - Code blocks continue to work with triple backticks
  - All styles respect theme variables (light, dark, tan, cloud)
  - Markdown renders in display mode, edit shows plain text
  - Supports bold, italic, headers, lists, links, tables, blockquotes
  - GitHub Flavored Markdown support (tables, task lists, strikethrough)

## Completed Tasks (v.008 - 2025-10-30)

- [x] **Cloud Theme** - Fourth theme option with minimal grayscale design
  - Primary background: #EDEDED (light gray)
  - Secondary background: #E8E8E8 (slightly darker gray)
  - Text colors: #171717 (near black)
  - Interactive accent: #171717 (consistent dark gray)
  - Minimal color palette for distraction-free focus
  - Radix Half2 icon for cloud theme indicator
  - Full support for all app features including Clerk modals
  - Theme persists across sessions and devices
  - Cycle through all four themes with half-moon icon in sidebar
  - Mobile responsive with consistent design

## Completed Tasks (v.006 - 2025-10-26)

- [x] **Folders Renamed to Projects**
  - Updated terminology throughout the app
  - "Folders" now called "Projects" in UI and documentation
  - "+ Add Folder" button changed to "+ Add Project"
  - "Manage Folders" section renamed to "Manage Projects"
  - Menu options updated with project terminology
  - More intuitive naming for organizing dates by project context
  - Backend table name remains "folders" for database compatibility

## Completed Tasks (v.005 - 2025-10-26)

- [x] **Launch Page** - Feature showcase page at `/launch` and `/about`
  - Comprehensive feature showcase with navigation sidebar
  - Demo video on intro section
  - Screenshot galleries for themes, timer, and mobile views
  - Image modal with keyboard navigation (arrow keys, Escape)
  - Mobile-responsive design with hamburger menu
  - Call-to-action buttons for GitHub and app access
  - Footer with technology credits

- [x] **Custom 404 Page** - Not Found page component
  - Clean, minimal design matching app aesthetic
  - Friendly message with orange action button
  - Tan-themed background with responsive typography
  - Accessible at any invalid route

- [x] **Pomodoro Timer Mute Controls**
  - Volume button in modal (top right) and full-screen mode
  - Mute all timer sounds (start, countdown, completion, pause)
  - Stops all currently playing audio when muting
  - State persists during timer session
  - Uses Volume2 and VolumeOff icons from lucide-react

- [x] **Pomodoro Timer Auto-Start Fix**
  - Timer icon now opens modal instead of auto-starting
  - Requires explicit user action to start (clicking "Start" button)
  - Prevents accidental timer starts when navigating from Launch page
  - Improved user experience with intentional timer activation

- [x] **Documentation Typo Fix**
  - Fixed typo in git commit command (changed "descriptoin" to "description")
  - Updated TASKS.md with correct spelling

- [x] **ArchiveSection TypeScript Fix**
  - Fixed missing `onMoveToToday` prop in archived todos
  - Added empty function handler for compatibility
  - Resolves TypeScript build error for production deployment

## Completed Tasks (Latest)

- [x] **Dark Mode Green Accent** (v.004 - 2025-10-25) (Latest)
  - Updated dark mode accent color from blue (#0076C6) to green (#27A561)
  - All interactive elements now use green in dark mode
  - Light mode (#0076C6 blue) and tan mode (#EB5601 orange) remain unchanged
  - Comprehensive color overrides for:
    - Checked checkboxes, active states, focused elements
    - Menu hover states, primary buttons, search highlights
    - Date picker, confirm dialogs, feature showcase buttons
    - Clerk authentication buttons, folder save buttons
    - Mobile add button CSS variables
  - Updated theme development documentation

- [x] **Tan Mode Theme**
  - Added third theme option with warm document-focused design
  - Warm tan background with orange accent color (#EB5601)
  - Comprehensive color overrides for all interactive elements
  - Theme-aware Clerk authentication modal styling
  - Cloud icon for theme toggle button
  - Default theme set to "tan"
  - Three-way theme rotation (dark → light → tan → dark)

- [x] **Logged Out Demo Mode**
  - Feature showcase box for unauthenticated users
  - Demo mode allowing up to 3 todos without sign-up
  - Local state persistence (lost on refresh)
  - Seamless demo-to-authenticated transition
  - Feature showcase with Sign Up and Sign In buttons
  - Clean welcome screen for first-time visitors

## Completed Tasks (v1.001 Final)

- [x] **Todo text font size customization** (v1.001)
  - User-specific font size settings for todo text (authenticated users only)
  - Font size options: 10px, 12px (default), 14px, 16px, 18px, 24px
  - Settings accessible via Keyboard Shortcuts Modal (press `?`)
  - Real-time preview showing selected font size
  - Font size persists across sessions and devices
  - Works in both light and dark themes
  - Added userPreferences table to Convex schema
  - Implemented getUserPreferences query and setTodoFontSize mutation

- [x] **Unsplash background images in Pomodoro full-screen mode** (v2.2.6)
  - Optional beautiful nature images from Unsplash as full-screen backgrounds
  - Random search queries: "landscape nature", "cities", "ocean", "sky"
  - New image fetches each time full-screen mode opens for variety
  - Toggle button with ImageIcon to show/hide background
  - Apple-style glass morphism overlay when background is enabled
  - Secure API key management via Convex environment variables
  - Images hotlinked from Unsplash CDN following API guidelines

## v1.001 Complete - Ready for Production

**Better Todo v1.001 is now feature-complete and ready for production use!**

### Core Features Delivered:

- ✅ Real-time synchronization with Convex
- ✅ Clerk authentication with private user data
- ✅ Notion-style inline input and editing
- ✅ Drag-and-drop reordering for todos and notes
- ✅ Daily organization with custom date labels
- ✅ Archive system with auto-archiving
- ✅ Full-text search across todos and notes
- ✅ Pomodoro timer with audio notifications
- ✅ Unsplash background images in timer full-screen mode
- ✅ Customizable todo text font size (authenticated users)
- ✅ Custom folders and auto-grouped months
- ✅ Pinned todos for quick access
- ✅ Multiple notes per date with syntax highlighting
- ✅ Mobile-optimized responsive design
- ✅ Dark/light theme support
- ✅ Keyboard shortcuts and accessibility
- ✅ Production deployment on Netlify

### Technical Stack:

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Convex real-time database
- **Authentication**: Clerk with JWT tokens
- **Styling**: CSS variables with custom theming
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit
- **Audio**: MP3 files for timer notifications
- **Images**: Unsplash API integration

## Future Tasks (v2.0+) - nope

### Collaboration Features

- [ ] Share todos with other users
- [ ] Real-time collaboration indicators
- [ ] Comments on todos
- [ ] Mentions system (@username)

### Advanced Todo Features

- [ ] Recurring tasks (daily, weekly, monthly)
- [ ] Due date reminders
- [ ] Priority levels (high, medium, low)
- [ ] Tags/categories for todos
- [ ] Subtasks within todos
- [ ] Time tracking for todos
- [ ] Todo templates

### Notes Enhancements

- [ ] Rich text editor for notes
- [ ] Attach files/images to notes
- [ ] Export notes as PDF/Markdown
- [ ] Notes templates
- [ ] Version history for notes

### Search and Filter

- [ ] Advanced filters (by status, date range, tags)
- [ ] Save search queries
- [ ] Search within specific date ranges
- [ ] Filter by priority or tags

### Calendar and Views

- [ ] Calendar view for todos
- [ ] Week view
- [ ] Month view
- [ ] Gantt chart for project planning
- [x] Kanban board view (shipped in v.040)

### Data Management

- [ ] Export all data as JSON
- [ ] Import from other todo apps
- [ ] Bulk edit operations
- [ ] Undo/redo functionality
- [ ] Data backup and restore

### Integrations

- [ ] Email integration (send todos via email)
- [ ] Calendar sync (Google Calendar, Apple Calendar)
- [ ] Slack notifications
- [ ] GitHub issues integration
- [ ] API for third-party integrations

### Performance and PWA

- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with sync
- [ ] Push notifications for reminders
- [ ] Install as standalone app

### Analytics and Insights

- [ ] Productivity dashboard
- [ ] Completion rate statistics
- [ ] Time spent on tasks
- [ ] Weekly/monthly reports
- [ ] Streaks and achievements

### Accessibility

- [ ] Screen reader optimization
- [ ] Keyboard-only navigation
- [ ] High contrast mode
- [ ] Font size adjustments
- [ ] ARIA labels and roles

## Implementation Plan

### Current Architecture

The application is built on a modern, real-time architecture:

**Frontend:**

- React 18 with TypeScript for type safety
- Vite for fast development and building
- Custom CSS with CSS variables for theming
- Component-based architecture with context for state management

**Backend:**

- Convex for real-time database and backend functions
- File-based routing for API organization
- Automatic type generation for end-to-end type safety
- Search indexes for full-text search

**Key Technical Decisions:**

- Notion-style inline input for better UX
- Markdown support for rich content
- Real-time sync for multi-device use
- Mobile-first responsive design
- Custom confirmation dialogs instead of browser defaults

### Relevant Files

- `src/App.tsx` - Main app layout and state management
  - Demo mode state management for logged out users
  - Feature showcase rendering for unauthenticated users
  - Theme-aware authentication modals
- `src/components/TodoItem.tsx` - Individual todo with markdown and actions
- `src/components/TodoList.tsx` - Todo list with inline input and DnD
  - Demo mode props (`isDemoMode`, `demoTodos`, `setDemoTodos`)
  - 3-todo limit enforcement for unauthenticated users
- `src/components/Sidebar.tsx` - Resizable sidebar with date navigation
  - Theme toggle with cloud icon for tan mode
  - Theme-aware login/user icons (dark, light, tan variants)
- `src/components/NotesSection.tsx` - Daily notes with Edit/Preview tabs
- `src/components/ArchiveSection.tsx` - Collapsed archive with bulk actions
- `src/components/SearchModal.tsx` - Full-text search modal
- `src/components/ConfirmDialog.tsx` - Custom confirmation dialogs
- `src/context/ThemeContext.tsx` - Theme management
  - Three-way theme rotation (dark → light → tan → dark)
  - Synchronous theme application before React mounts
  - Dynamic meta theme-color tag updates
  - Default theme: "tan"
- `src/styles/global.css` - CSS variables and theming
  - Tan mode color variables and overrides
  - Feature showcase styling for logged out users
  - Demo mode banner styling
  - Theme-aware button colors for all three themes
- `src/lib/localData.ts` - Ephemeral in-memory storage for unsigned users
  - In-memory todos and notes storage
  - CRUD operations mirroring Convex API
  - Data lost on page refresh
- `convex/schema.ts` - Database schema (todos, notes, archivedDates, dateLabels)
- `convex/todos.ts` - Todo queries and mutations
- `convex/notes.ts` - Notes queries and mutations
- `convex/search.ts` - Full-text search implementation
- `convex/dates.ts` - Date management mutations
- `convex/dateLabels.ts` - Custom date labels
- `convex/archivedDates.ts` - Archive management

### Environment Configuration

Current setup:

- Convex deployment configured and deployed
- Clerk authentication fully implemented and working
- Local development with hot reload
- Real-time sync across browsers
- Production deployment on Netlify with environment variables configured
- User authentication and data isolation working
- Ephemeral mode for unsigned users

Authentication features implemented:

1. Clerk environment variables configured for both development and production
2. All mutations include userId for user-specific data
3. All queries include authentication checks
4. UI shows user profile and login/logout functionality
5. JWT token validation with Clerk token templates
6. Automatic user data storage in Convex database
7. Ephemeral mode with local storage for unsigned users

### Data Flow

1. **Creating Todos:**
   - User types in inline input
   - Shift+Enter (desktop) or "+" button (mobile) triggers create
   - Mutation creates todo in Convex
   - Real-time update renders new todo immediately

2. **Editing Todos:**
   - Click todo to enter edit mode
   - Changes save on blur or Shift+Enter
   - Updates propagate in real-time

3. **Notes:**
   - Local state with 500ms debounce
   - Saves to Convex after typing stops
   - Immediate save on blur

4. **Search:**
   - Cmd/Ctrl+K opens modal
   - Real-time search as user types
   - Uses Convex search indexes
   - Top 30 results displayed

### Authentication Implementation Complete

Authentication is fully implemented with Clerk:

1. **Clerk Configuration:**
   - JWT template configured with "convex" template
   - Environment variables set for development and production
   - Redirect URIs configured for both local and production domains

2. **Schema Updated:**

   ```typescript
   todos: defineTable({
     userId: v.string(),
     // ... other fields
   }).index("by_user_and_date", ["userId", "date"]);
   ```

3. **Auth checks implemented** in all queries and mutations

4. **UI updated** with user profile, login/logout, and authentication state management

5. **Production deployment** configured with Netlify environment variables

6. **Ephemeral mode** implemented for unsigned users with local storage

### Future Enhancements Priority

**High Priority:**

- Recurring tasks
- Due date reminders
- Priority levels for todos

**Medium Priority:**

- Tags/categories
- Export functionality
- Calendar view

**Low Priority:**

- Third-party integrations
- Advanced analytics
- PWA features
