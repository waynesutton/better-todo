# Better Todo - Project Files

This document describes the structure and purpose of each file in the Better Todo application.

## Root Configuration

- `package.json` - Project dependencies and scripts (React 18, TypeScript, Convex, Clerk, Lucide icons, @dnd-kit, Radix UI, react-markdown, remark-gfm, remark-breaks)
- `tsconfig.json` - TypeScript configuration for React app
- `tsconfig.node.json` - TypeScript configuration for Vite
- `vite.config.ts` - Vite bundler configuration with React plugin
- `index.html` - HTML entry point with meta tags for SEO and social sharing
- `.gitignore` - Git ignore patterns
- `README.md` - Complete project documentation
- `changelog.md` - Version history with all features (v.009 - Full Markdown Support in Notes)
- `files.md` - This file, project structure documentation
- `TASKS.md` - Project tasks and development tracking

## Cursor Rules (`.cursor/rules/`)

- `convex-write-conflicts.mdc` - Comprehensive guide for preventing write conflicts when using React, useEffect, and Convex
  - Backend patterns: idempotent mutations, early returns, minimal data reads, indexed queries
  - Frontend patterns: refs for tracking calls, debouncing, mutation status checks, avoiding loops
  - Schema design best practices to minimize conflicts
  - Complete checklists for backend and frontend development
  - Applies to all Convex projects
- `dev2.mdc` - Full-stack AI Convex developer guidelines
- `help.mdc` - Core development guidelines and reflection process
- `clerk-auth-check.mdc` - Clerk authentication guidelines for React components
- `task.mdc` - Guidelines for creating and managing task lists
- `convex2.mdc` - Additional Convex guidelines
- `rulesforconvex.mdc` - Convex-specific rules

## Convex Backend (`convex/`)

### Database Schema

- `schema.ts` - Database schema with tables:
  - **todos**: Stores todo items with content, type (todo/h1/h2/h3), completion status, order, date, optional parentId, optional folderId, and pinned status
    - Index: `by_user_and_date`, `by_user`, `by_user_and_pinned`, `by_user_and_folder`
    - Search index: `search_content` on content field for full-text search
    - Supports both date-based todos and dateless todos in project folders
  - **notes**: Stores multiple notes per date with optional title, content, order, and collapsed state
    - Index: `by_user_and_date`
    - Search indexes: `search_content` on content field, `search_title` on title field
  - **archivedDates**: Tracks which dates are archived with userId and date
    - Index: `by_user_and_date`
  - **dateLabels**: Stores custom text labels for dates with userId, date, and label text
    - Index: `by_user_and_date`
  - **folders**: Stores custom folders for organizing dates with name, order, and archived status
    - Index: `by_user`
  - **folderDates**: Association table linking folders to dates
    - Index: `by_user_and_folder`, `by_user_and_date`
  - **monthGroups**: Auto-generated groups for completed months with monthName, year, month, and archived status
    - Index: `by_user`
  - **monthGroupDates**: Association table linking month groups to dates
    - Index: `by_user_and_month_group`, `by_user_and_date`
  - **pomodoroSessions**: Stores pomodoro timer sessions with work/break intervals, completed sessions, and user preferences
    - Index: `by_user`
  - **userPreferences**: Stores per-user settings including todoFontSize
    - Index: `by_user`
  - **fullPageNotes**: Stores full-page notes with userId, optional date, optional folderId, title, content, order, collapsed, pinnedToTop, and archived status
    - Index: `by_user_and_date` (for notes with dates), `by_user_and_folder` (for notes in projects)
    - Search indexes: `search_content` on content field, `search_title` on title field
    - Notes can exist independently in projects (decoupled from dates)
    - Notes can be archived with their parent project or independently
    - Archived notes are excluded from active counts and listings

### Functions

- `todos.ts` - Queries and mutations for todo operations:
  - `getAvailableDates` - Get all dates with todos (excludes folder-associated todos)
  - `getTodosByDate` - Get todos for a specific date (excludes folder-associated todos)
  - `getTodosByFolder` - Get todos for a specific project folder (including subtasks)
  - `getTodoCountsByFolder` - Get count of uncompleted todos per folder for sidebar badges
  - `getPinnedTodos` - Get all pinned todos for user (excluding folder-associated todos, including their subtasks)
  - `getUncompletedCounts` - Get count of uncompleted todos for each date (excludes folder-associated todos, for sidebar badges)
  - `createTodo` - Create new todo with auto-ordering (supports both date and folderId parameters)
  - `createSubtask` - Create a subtask under a parent todo (inherits folderId from parent)
  - `updateTodo` - Update todo (auto-archives on complete, auto-unarchives on uncheck, supports pin/unpin)
  - `deleteTodo` - Remove a todo (idempotent, cascading delete for subtasks)
  - `reorderTodos` - Update order after drag-and-drop
  - `moveTodoToDate` - Move todo to different date
  - `moveTodoToFolder` - Move todo to project folder (removes date association)
  - `moveTodoFromFolderToDate` - Move todo from folder to specific date (removes folder association)
  - `copyTodosToDate` - Copy all non-archived todos to another date
  - `archiveAllTodos` - Archive all active todos for a specific date
  - `deleteAllTodos` - Delete all active todos for a specific date
  - `deleteAllArchivedTodos` - Delete all archived todos for a specific date

- `notes.ts` - Queries and mutations for notes operations:
  - `getNotesByDate` - Get all notes for a specific date
  - `createNote` - Create new note with title, content, and order
  - `updateNote` - Update existing note content or title
  - `deleteNote` - Remove a note by ID
  - `updateNoteCollapsed` - Toggle note collapsed state
  - `reorderNotes` - Update order after drag-and-drop

- `fullPageNotes.ts` - Queries and mutations for full-page notes:
  - `getFullPageNotesByIds` - Get multiple full-page notes by ID array (for open tabs)
  - `getFullPageNotesByDate` - Get all full-page notes for a specific date (excludes archived)
  - `getFullPageNotesByFolder` - Get all full-page notes for a specific project folder (with includeArchived option)
  - `getFullPageNote` - Get single full-page note by ID
  - `getFullPageNoteCounts` - Get count of full-page notes per date for sidebar (excludes archived)
  - `getFullPageNoteCountsByFolder` - Get count of full-page notes per project folder for sidebar badges (excludes archived)
  - `createFullPageNote` - Create new full-page note with auto-ordering (accepts date OR folderId)
  - `updateFullPageNote` - Update note title or content (idempotent, no pre-read)
  - `deleteFullPageNote` - Permanently remove a full-page note
  - `reorderFullPageNotes` - Update order with parallel updates
  - `moveFullPageNoteToFolder` - Move note to project (removes date, sets folderId)
  - `moveFullPageNoteToDate` - Move note to date (removes folderId, sets date)

- `search.ts` - Full-text search functionality using Convex search indexes:
  - `searchAll` - Search across todos (by content) and notes (by title and content) and full-page notes
  - Returns top 30 most relevant results with type, date (optional), and status
  - Handles full-page notes with or without dates (notes in projects don't have dates)
  - Supports real-time search with keyboard navigation

- `dates.ts` - Date management mutations:
  - `deleteDate` - Delete all data for a specific date (todos, notes, archived entry, labels)
    - Requires authentication via `getUserId(ctx)`
    - Deletes all todos, notes, archived date entries, and custom labels for the authenticated user's date
    - Throws error if user is not authenticated

- `dateLabels.ts` - Custom date label management:
  - `getDateLabels` - Get all custom labels for dates
  - `setDateLabel` - Add or update a custom text label for a date
  - `removeDateLabel` - Remove a custom label from a date

- `archivedDates.ts` - Archive management:
  - `getArchivedDates` - Get list of archived dates
  - `archiveDate` - Archive a date (hides from main list)
  - `unarchiveDate` - Restore archived date to main list
  - `deleteAllArchivedDates` - Permanently delete all archived dates at once

- `folders.ts` - Custom project management for organizing dates (UI calls them "Projects"):
  - `getFolders` - Get all projects with their associated dates
  - `getFolderDates` - Get dates for a specific project
  - `getFolderForDate` - Check if a date belongs to a project
  - `createFolder` - Create new project with custom name
  - `renameFolder` - Update project name
  - `archiveFolder` - Archive a project and all its full-page notes in parallel
  - `unarchiveFolder` - Restore archived project and all its full-page notes in parallel
  - `deleteFolder` - Delete project, all associations, and all its full-page notes
  - `addDateToFolder` - Associate a date with a project
  - `removeDateFromFolder` - Remove date from project

- `monthGroups.ts` - Auto-grouping for completed months:
  - `getMonthGroups` - Get all month groups with their associated dates
  - `getMonthGroupDates` - Get dates for a specific month group
  - `getMonthGroupForDate` - Check if a date belongs to a month group
  - `autoCreateMonthGroups` - Automatically create month groups for completed months
  - `archiveMonthGroup` - Archive a month group
  - `unarchiveMonthGroup` - Restore archived month group
  - `deleteMonthGroup` - Delete month group and all associations

- `pomodoro.ts` - Pomodoro timer functionality:
  - `getPomodoroSession` - Get current pomodoro session for user
  - `startPomodoro` - Create new pomodoro session with optional duration (defaults to 25 minutes, supports 90 minutes for flow state)
  - `pausePomodoro` - Pause current session with remaining time
  - `resumePomodoro` - Resume paused session
  - `stopPomodoro` - Stop and delete current session
  - `completePomodoro` - Mark session as completed (idempotent to prevent write conflicts)
  - `updateBackgroundImage` - Update session with Unsplash background image URL

- `unsplash.ts` - Unsplash background image fetching:
  - `fetchBackgroundImage` - Fetches random images from Unsplash API
  - Uses Node.js action with "use node" directive
  - Secure access to UNSPLASH_ACCESS_KEY environment variable
  - Random search queries: "landscape nature", "cities", "ocean", "sky"
  - Updates pomodoro session with image URL for full-screen backgrounds

### Authentication (Clerk Integration)

- `auth.config.ts` - Clerk JWT authentication configuration:
  - Uses Clerk JWT tokens with "convex" template
  - Properly configured for production deployment with environment variables
  - Token validation with Clerk's JWKS endpoint
- `users.ts` - User management and preferences functions:
  - `getUserId` - Helper function to get current user's ID from authentication context
  - `storeUser` - Store/update Clerk user data in Convex database
  - `getCurrentUser` - Get authenticated user information
  - `getUserPreferences` - Get user's preferences including font size
  - `setTodoFontSize` - Update todo text font size for authenticated user
- `http.ts` - HTTP routes for authentication callbacks (Clerk ready)

## React Frontend (`src/`)

### Main Files

- `main.tsx` - Application entry point with Clerk and Convex providers:
  - ClerkProvider with Clerk publishable key from environment variables
  - ConvexProviderWithClerk for Clerk-Convex integration
  - ThemeProvider for dark/light mode management
  - Properly configured for both development and production environments

### Pages (`src/pages/`)

- `src/pages/Launch.tsx` - Launch/about page featuring:
  - Comprehensive feature showcase with navigation sidebar
  - Demo video on intro section
  - Screenshot galleries for different features (themes, timer, mobile)
  - Image modal with keyboard navigation (arrow keys, Escape)
  - Mobile-responsive sidebar with hamburger menu
  - Sections: Introduction, Key Features, Built for Developers, Themes, Timer, Mobile, Real-time Sync, Open Source
  - Call-to-action buttons (View on GitHub, Try better-todo)
  - Footer with technology credits
  - Accessible at `/launch` and `/about` routes

- `src/pages/NotFound.tsx` - Custom 404 Not Found page with:
  - Clean, minimal design matching app aesthetic
  - Large "404" heading with soft black text
  - Friendly message: "Not found and found out. Go make a todo and get back to work."
  - Orange action button linking back to home
  - Tan-themed background (#faf8f5) with system font stack
  - Responsive typography with clamp() for scaling

- `App.tsx` - Main app component with:
  - Layout management (sidebar + main content)
  - Sidebar resize functionality (200px - 500px)
  - Sidebar collapse/expand states (full 260px, collapsed 60px, mobile hidden)
  - Collapsed sidebar shows compact MM/DD date format
  - Mobile detection and auto-hide on small screens (≤768px)
  - Date selection and navigation state (including special "pinned" view)
  - **Folder selection state** - Support for viewing project folder todos and notes
  - **Folder todos display** - Shows dateless todos when folder is selected
  - Pinned todos page handling with dedicated display
  - **Back button navigation** - Back button (CheckboxIcon) next to View full-page notes icon
    - Returns to appropriate location (date or today) depending on context
    - Handles both date and folder contexts
  - Search modal integration (Cmd/Ctrl+K keyboard shortcut)
  - Theme context provider
  - Keyboard shortcuts:
    - p key to pin/unpin hovered todo
    - Arrow keys to navigate todos
    - Space/e to mark todo as done
    - z to undo last completion
    - / or c to focus input
    - ? to show keyboard shortcuts modal with code block syntax reference
  - Hovered todo tracking for keyboard shortcuts
  - Auto-select hovered todo when not explicitly navigating
  - **Full-page note folder handling** - Opens notes from folders and highlights folder in sidebar
  - Clerk authentication integration:
    - Conditional query execution based on authentication state
    - "Sign In Required" modal for unauthenticated users
    - Automatic user data storage in Convex database
    - Ephemeral mode for unsigned users (local storage)
    - Theme-aware authentication modals

### Components (`src/components/`)

- `ui/tooltip.tsx` - Reusable tooltip component with:
  - Built on Radix UI Tooltip primitive
  - Portal rendering to document body (prevents clipping by parent containers)
  - Positioned outside sidebar hierarchy for proper display
  - Configurable side and offset positioning
  - Smooth fade-in animation
  - Works in both light and dark themes

- `TodoItem.tsx` - Individual todo item with:
  - Plain text display (no markdown rendering in todos)
  - Drag handle for reordering (⋮⋮) - visible on hover
  - **Pin icon** - Drawing pin filled icon from Radix UI for pinned todos (only on date pages, not in pinned section)
  - Checkbox for completion (auto-archives when checked)
  - Three-dot menu for pinning, moving to tomorrow, previous/next day, or deleting
  - Pin/unpin option (only for active, non-completed todos)
  - Keyboard shortcut "p" to pin/unpin when hovered
  - Portal-rendered menu (prevents clipping in archive section)
  - Unarchive option for unchecked archived todos
  - Click outside or ESC to close menu
  - Inline editing with Enter for new lines, Shift+Enter to save
  - Custom confirmation dialog for delete actions
  - Auto-textarea expansion for multi-line content
  - Hover tracking for keyboard shortcuts

- `TodoList.tsx` - Todo list container with:
  - Drag-and-drop functionality using @dnd-kit
  - **Pinned todos sorted to top** - Automatically displays pinned todos first on each date page
  - Notion-style inline input (type directly, no button)
  - Mobile-friendly: visible "+" button appears when typing on mobile devices
  - Desktop: Shift+Enter to create, Mobile: tap "+" button
  - Enter for new lines in both desktop and mobile
  - Paste detection for markdown lists (auto-creates multiple todos)
  - Separates active and archived todos
  - Bulk action buttons at bottom (Archive All and Delete All for active todos)
  - Confirmation dialogs for bulk actions with todo counts
  - Auto-collapses archive section when adding new todos
  - Integrates NotesSection above archive
  - Tracks hovered todo for keyboard shortcuts
  - **Fixed keyboard navigation** - Proper index matching between keyboard shortcuts and rendered todos
  - **Folder support** - Supports todos within project folders (folderId prop)
  - **Move to folder functionality** - Handles moving todos to and from project folders
  - Clerk authentication integration:
    - Checks authentication status before allowing todo/note creation
    - Shows "Sign In Required" modal for unauthenticated users
    - Proper error handling for authentication failures
    - Ephemeral mode with local storage for unsigned users

- `Sidebar.tsx` - Resizable and collapsible navigation sidebar with:
  - Pinned section at top (shows "Pinned" when todos are pinned, hidden when empty)
  - Collapsed view shows pin emoji (📌) for pinned section
  - Date list showing all days with todos (scrollable with custom scrollbar)
  - **Todo count badges** - Shows count of uncompleted todos next to each date
  - **Full-page notes folders** - Collapsible "Notes" folder under dates with full-page notes
    - Shows all note titles for that date
    - Click note title to open that note
    - Three-dot menu for rename, delete, move to project, and move to date actions
    - Active state indicator (dark transparent overlay) for selected note
  - **NotesForFolder component** - Displays full-page notes within project folders
    - Shows notes that are associated with projects (decoupled from dates)
    - Always fetches notes to display count badge next to "Notes" toggle
    - Click note title to open that note without navigating to a date
    - Three-dot menu for rename, delete, move to project, and move to date actions
    - Note count badges show next to "Notes" toggle (e.g., "Notes (3)")
  - **TodosForFolder component** - Displays todos within project folders
    - Shows todos that are associated with projects (decoupled from dates)
    - Always fetches todos to display count badge next to "Todos" toggle
    - Clicking "Todos" directly selects the folder to show todos (no dropdown)
    - Todo count badges show next to "Todos" toggle (e.g., "Todos (5)")
  - Collapsible view with compact date format (MM/DD) via panel icon in header
  - Collapse button next to "better todo" title (PanelLeft icon)
  - Smooth animated transitions between full (260px) and collapsed (60px) states
  - Custom date labels (rename dates with any text while preserving chronological order)
  - **Custom projects** for organizing dates, todos, and notes (collapsible, renameable, archivable, deletable) - UI calls them "Projects"
    - All active project folders appear in main Folders section (no "Manage Projects" section)
    - Project folders show immediately when created (including empty folders)
    - Folders are sorted alphabetically for easier navigation
    - Folders appear below dates and above "+ Add Project" button
    - Count badges show next to "Todos" and "Notes" toggles within folders, not on folder name
    - Auto-expands folders and sections when notes or todos are selected from them
  - **Auto-grouped month sections** for completed months (collapsible, archivable, deletable)
  - "+ Add Project" button at bottom (only shows when authenticated)
  - Active date highlighting (#0076C6 accent color)
  - Theme toggle (half-moon icon) at bottom of sidebar above login link
  - Three-dot menu per date with options:
    - Add/edit/remove custom date label
    - Add to Project (shows project selector modal when projects exist)
    - Remove from Project (when date is in a project)
    - Copy all non-archived todos to tomorrow, previous/next day, or custom date
    - Archive the entire date
    - Delete the date and all its content
  - Three-dot menu for dates inside projects with options:
    - Remove from Project
    - Archive Date
    - Delete Date
  - Three-dot menu per project with options:
    - Rename project
    - Archive project
    - Delete project
  - Three-dot menu per month group with options:
    - Archive month
    - Delete month
  - Archived section (collapsible) includes:
    - Archived dates
    - Archived projects with their dates
    - Archived month groups with their dates
    - Delete All button to permanently remove all archived dates
  - Clerk authentication integration:
    - Login/logout button with theme-aware icons (user-dark.svg/user-light.svg, login-dark.svg/login-light.svg)
    - Shows user profile icon when authenticated with tooltip showing user name/email
    - Shows login icon when unauthenticated
    - Opens Clerk SignIn modal when signed out, UserProfile modal when signed in
    - Proper sign out handling with page reload to clear state
  - Custom confirmation dialog for delete actions
  - Hover tooltips for all footer icons (positioned to the right, never clipped)

- `ConfirmDialog.tsx` - Reusable confirmation modal component with:
  - Custom styled dialog matching site design system
  - Uses React Portal to render at document.body level
  - Centered on entire page viewport with high z-index
  - Backdrop overlay for focus
  - Configurable title, message, and button text
  - Dangerous action styling (red button for destructive actions)
  - Replaces browser default confirm/alert dialogs
  - Responsive width for mobile compatibility

- `KeyboardShortcutsModal.tsx` - Keyboard shortcuts reference modal with:
  - Comprehensive keyboard shortcuts documentation
  - **Code Blocks section** with copyable language syntax:
    - CSS, JavaScript, TypeScript, HTML, JSON, Python, Go, Rust
    - Click-to-copy buttons for each language syntax
    - Alternative syntax options (e.g., `js vs `javascript)
    - Visual feedback with copy/check icons
    - Mobile-responsive grid layout
  - **Todo Text Font Size customization** (authenticated users only):
    - Six size options: 10px, 12px (default), 14px, 16px, 18px, 24px
    - Real-time preview showing selected font size
    - Active state highlighting for current selection
    - Persists across sessions and devices
  - Organized by categories (Navigation, Todo Management, Search, Pomodoro Timer)
  - Accessible via ? key or keyboard shortcuts button
  - Theme-aware styling matching app design

- `NotesSection.tsx` - Daily notes feature with full markdown support:
  - Multiple notes per date with drag-and-drop reordering using @dnd-kit
  - Each note has editable title (click to edit, auto-save on blur)
  - **Full markdown support** with react-markdown and remark-gfm:
    - Write markdown naturally without needing ```md wrapper
    - Supports bold, italic, headers, lists, links, tables, blockquotes
    - Code blocks with triple backticks and language identifiers (`js, `css, etc.)
    - GitHub Flavored Markdown support (tables, task lists, strikethrough)
    - Markdown renders in display mode, edit mode shows plain text with markdown syntax
  - **Code syntax highlighting** with Cursor Dark Theme colors:
    - Supports JavaScript, TypeScript, CSS, HTML, JSON, Python, Go, Rust, and more
    - Uses exact Cursor Dark Theme colors for accurate editor-like appearance
    - Theme-aware (dark/light/tan/cloud mode) with proper color switching
    - Individual copy buttons for each code block with confirmation
    - Clean code block headers showing language name
    - Line numbers in code blocks for easy reference
    - Security-first with plain text storage and client-side rendering only
  - Dual-mode rendering (edit/display) with click-to-edit functionality
  - Edit button in note header for quick access to edit mode
  - Auto-focus content area after naming note (Enter or Tab)
  - Automatically expands collapsed notes when focusing content
  - Collapsible notes (expand/collapse individual notes)
  - Line numbers on the left in edit mode (not copyable, code editor style)
  - Auto-expanding textarea with debounced auto-save (500ms delay)
  - Copy all button to copy entire note content as plain text
  - Delete button with custom confirmation dialog
  - Pin to top functionality for important notes
  - Add Note button (+ icon) to create new notes
  - Clean, minimal design matching app aesthetic
  - Clerk authentication integration:
    - Only loads notes when user is authenticated
    - Skips queries when unauthenticated to prevent errors
    - Ephemeral mode with local storage for unsigned users

- `ArchiveSection.tsx` - Collapsible archive with:
  - Shows all completed/archived todos for selected date
  - Displays count of archived items in header
  - Uncheck checkbox to restore todo to active list (auto-unarchive)
  - "Unarchive" option in three-dot menu for unchecked archived todos
  - X delete button on hover for each archived todo (soft red #e16d76)
  - "Delete All" button in header to remove all archived todos at once
  - Custom confirmation dialogs matching app design system
  - Controlled expand/collapse state from parent component
  - Auto-collapses when new todos are added
  - Supports moving archived items to other dates via three-dot menu
  - Portal-rendered menus prevent clipping
  - Clean, borderless design

- `SearchModal.tsx` - Full-text search modal with:
  - Real-time search across all todos (by content) and notes (by title and content)
  - Keyboard navigation (up/down arrow keys to navigate results)
  - Press Enter to navigate to selected result's date
  - Press Escape to close modal
  - Search term highlighting in results
  - Result badges showing type (Todo/Note), date, and status (archived/active)
  - Opens with Cmd/K (Mac) or Ctrl+K (Windows/Linux) keyboard shortcut
  - Click search icon (Search from lucide-react) in header to open
  - Automatically navigates to and displays the selected result's date
  - Top 30 most relevant results displayed
  - Beautiful modal UI matching app theme (dark/light mode support)
  - Clerk authentication integration:
    - Only performs search when user is authenticated
    - Skips search queries when unauthenticated to prevent errors
    - Shows "Sign In to Search" modal when unauthenticated

- `PomodoroTimer.tsx` - Built-in productivity timer with:
  - **Duration toggle** - Switch between 25-minute focus sessions and 90-minute flow state sessions
    - Waves icon to switch from 25 minutes to 90-minute flow state mode
    - Clock icon to switch back from 90 minutes to 25-minute focus mode
    - Toggle button appears next to Start button (only visible when timer is idle)
    - All timer features work identically for both durations
  - 25-minute or 90-minute Pomodoro timer with visual countdown display (MM:SS format)
  - **MP3-based audio notifications** for timer events:
    - Start sound (`timer-start.mp3`) plays once when timer begins (only if user started in current session)
    - 5-second countdown sound (`5-second-coutdown.mp3`) plays at 5 seconds remaining (only if user started in current session)
    - Completion sounds rotate through 11 MP3 files (synth, epicboom, epci, deep, horns, computer, flute, pause, whoa, waves, done)
    - Pause sound (`pause.mp3`) plays when user pauses timer
    - All sounds at 70% volume
  - **Sound auto-play prevention** - Sounds never play automatically when timer session is restored from previous page load
    - Sounds only play when user explicitly clicks Start or Reset button in current session
    - Prevents unexpected audio interruptions when navigating to app with active timer
  - **Mute/unmute controls** with volume button in modal and full-screen mode
    - Toggle to mute all timer sounds
    - Stops all currently playing audio when muting
    - State persists during timer session
  - **Modal and full-screen modes** with play/pause/reset/stop controls
  - Full-screen "keep cooking!" message on completion
  - Timer button in header shows countdown when running
  - **Timer icon opens modal** - No auto-start, user must click "Start" button
  - Web Worker for accurate background timing
  - Session persistence via Convex (syncs across tabs)
  - Keyboard shortcuts (ESC to close full-screen, f to enter full-screen)
  - Sound state tracking with refs (`hasPlayedStartSound`, `hasPlayedCountdownSound`, `lastEndSoundIndex`, `userStartedInThisSession`)
  - Accessible from timer icon in header

- `FullPageNoteView.tsx` - Full-page note editing and display component:
  - Dual-mode rendering (edit/display) with single-click to start typing
  - Line numbers that scale with font size (1.5 ratio)
  - **Full markdown rendering** in display mode with react-markdown and remark-gfm
  - Markdown works naturally without needing ```md wrapper
  - Supports all markdown features (bold, italic, headers, lists, links, tables, blockquotes)
  - Syntax highlighting for code blocks with Cursor Dark Theme colors
  - Auto-save on content changes (500ms debounce)
  - Copy button for note content
  - Font size respects user preferences
  - Automatic edit mode for new/empty notes
  - Instant loading with Convex real-time sync (no loading states)
  - Simplified interface focused on core editing and markdown rendering
  - Works for notes associated with dates or projects (handles optional date parameter)

- `FullPageNoteTabs.tsx` - Chrome-style tab interface for full-page notes:
  - Horizontal tab navigation with smooth scrolling
  - Double-click tab title to rename
  - X button to close tab (does not delete note)
  - FilePlus icon to create new notes
  - Checkbox icon to return to todos view
  - Tab width: 120-200px (desktop), 80-120px (mobile)
  - Active state highlighting
  - Supports unlimited tabs with scrolling

### Context (`src/context/`)

- `ThemeContext.tsx` - Theme management:
  - Four theme toggle (dark, light, tan, cloud)
  - Persists preference to localStorage
  - Smooth color transitions
  - CSS variable-based theming
  - Applies theme synchronously before React mounts to prevent flash
  - Updates meta theme-color tag dynamically
  - Default theme is "tan" for warm document-focused experience

### Library (`src/lib/`)

- `localData.ts` - Ephemeral in-memory storage for unsigned users:
  - Mirrors Convex CRUD operations for todos and notes
  - Data lost on page refresh (ephemeral behavior)
  - Activated when user is not authenticated
  - Provides seamless experience for unsigned users

- `haptics.ts` - Haptic feedback support for touch devices:
  - Provides tactile feedback for user interactions
  - Supports iOS and Android devices with haptics capabilities
  - Lightweight utility with graceful fallback
  - Enhanced mobile experience with physical feedback

### Styles (`src/styles/`)

- `global.css` - Global styles with:
  - CSS custom properties for theming and typography
  - Dark mode: Sublime Text-inspired (#2E3842 background) with green accents (#27A561 for interactive elements, #4a9eff for general accents)
  - Light mode: Apple Notes-inspired (#f5f5f7 background) with blue accents (#0076C6 for interactive elements, #007aff for general accents)
  - Tan mode: Warm document-focused theme (#faf8f5 background) with orange accents (#EB5601)
  - Cloud mode: Minimal grayscale theme (#EDEDED background) with dark gray accents (#171717) for distraction-free focus
  - Custom font size variables (--font-app-name, --font-sidebar, --font-todo, --font-archive)
  - Color system:
    - Dark mode interactive accent: #27A561 green (v.004 update)
    - Light mode interactive accent: #0076C6 blue
    - Tan mode primary accent: #EB5601 orange
    - Mint green: #80cbae (positive actions, save buttons)
    - Soft red: #e16d76 (destructive actions, delete buttons)
  - Collapsible sidebar animations with smooth width transitions
  - Compact date view (MM/DD format) styles for collapsed state
  - Responsive design with mobile breakpoints (≤768px)
  - No focus rings for clean minimal design
  - Mobile overlay styles with backdrop blur
  - Line number styling for notes (non-copyable, monospace)
  - Custom scrollbar styling for sidebar dates
  - Search modal styles with backdrop and keyboard navigation highlighting
  - Clerk authentication modal styling (theme-aware, custom appearance)
  - Feature showcase styles for logged out users
  - Demo mode styling for unauthenticated user experience
  - System font stack for native look and feel

## Documentation (`prds/`)

- `QUICKSTART.md` - 2-minute setup guide for quick start
- `GETTING_STARTED.md` - Detailed feature walkthrough and usage guide
- `PROJECT_SUMMARY.md` - Complete project overview and architecture
- `full-page-notes-feature.plan.md` - Comprehensive documentation of full-page notes feature
- `cl.plan.md` - Clerk authentication implementation plan and notes
- `menu-button-alignment-fix.md` - Documentation of menu button alignment fix using pseudo-element approach

## Root Documentation

- `README.md` - Complete project documentation with features, usage guide, and customization
- `files.md` - This file, describing project structure and file purposes
- `changelog.md` - Version history with all feature additions and changes (v1.0.0 to v1.8.3)
- `TASKS.md` - Project tasks and development tracking

## Current Version: v.013 (November 2, 2025)

### Latest Features (v.013) - Pomodoro Timer Duration Toggle

- **Duration Toggle** - Switch between 25-minute focus sessions and 90-minute flow state sessions
  - Waves icon to switch to 90-minute flow state mode
  - Clock icon to switch back to 25-minute focus mode
  - Toggle button appears next to Start button (only visible when timer is idle)
  - All timer features work identically for both durations
- **Sound Auto-Play Prevention** - Fixed sounds playing automatically when timer session is restored from previous page load
  - Sounds now only play when user explicitly clicks Start or Reset button in current session
  - Prevents unexpected audio interruptions when navigating to app with active timer

### Previous Features (v.011) - Simplified Full-Page Notes

- **Simplified Full-Page Notes** - Streamlined interface for better focus and performance
  - Removed format toggle dropdown for cleaner interface
  - Removed markdown split-screen preview - focus on core editing
  - Removed image upload functionality
  - Instant note loading with Convex real-time sync (no loading states)
  - Full-page notes now focus on core editing and markdown rendering
  - Improved user experience with seamless, instant note loading

### Previous Features (v.009.2) - Move Full-Page Notes to Projects and Dates

- **Move Full-Page Notes to Projects and Dates** - Flexible note organization
  - Move any full-page note to a project folder via "Move to Project..." menu option
  - Move notes from projects back to any date via "Move to Date..." menu option
  - Notes can exist independently in projects (decoupled from dates)
  - Notes in projects appear in sidebar under the project folder
  - Note count badges show on project folders when they contain notes
  - Moving a note to a date automatically shows the notes toggle dropdown for that date
  - Schema updated with optional date and optional folderId fields
  - New queries: getFullPageNotesByFolder, getFullPageNoteCountsByFolder
  - New mutations: moveFullPageNoteToFolder, moveFullPageNoteToDate
  - NotesForFolder component added to Sidebar for displaying notes in projects
  - Search updated to handle notes with or without dates

### Previous Features (v.009) - Full Markdown Support in Notes

- **Full Markdown Support** - Comprehensive markdown rendering in all notes
  - All text content now supports markdown formatting (bold, italic, headers, lists, links, tables, blockquotes)
  - Works automatically without needing ```md wrapper - just write markdown and it renders
  - Code blocks continue to work with triple backticks (`js, `css, etc.)
  - Preserves existing code block syntax highlighting functionality
  - Uses react-markdown and remark-gfm for GitHub Flavored Markdown support
  - Markdown renders in display mode, edit mode shows plain text with markdown syntax
  - Applied to both NotesSection and FullPageNoteView components
  - Updated KeyboardShortcutsModal to mention markdown support
  - Comprehensive CSS styling for all markdown elements (headers, lists, links, blockquotes, tables, images)
  - All styles respect theme variables (light, dark, tan, cloud)

### Previous Features (v.008) - Cloud Theme

- **Cloud Theme** - Fourth theme option with minimal grayscale design
  - Primary background: #EDEDED (light gray)
  - Secondary background: #E8E8E8 (slightly darker gray)
  - Text colors: #171717 (near black)
  - Interactive accent: #171717 (consistent dark gray)
  - Minimal color palette for distraction-free focus
  - Cycle through all four themes with half-moon icon in sidebar
  - Theme persists across sessions and devices
  - Radix Half2 icon for cloud theme indicator
  - Full support for all app features including Clerk modals
  - Mobile responsive with consistent design

### Previous Features (v.007) - Full-Page Notes

- **Full-Page Notes** - Dedicated note-taking workspace for each date
  - Create unlimited full-page notes per date
  - Chrome-style tabbed interface with horizontal scrolling
  - FileText icon in header to access full-page notes
  - FilePlus icon to create new notes within full-page notes view
  - Checkbox icon to return to todos from full-page notes
  - Single-click to start typing (automatic edit mode)
  - Double-click tab titles to rename notes
  - Line numbers that scale with font size
  - Markdown rendering and syntax highlighting
  - Auto-save on content changes
  - Copy button for note content
  - X button closes tab without deleting note
  - Notes folder in sidebar shows all note titles
  - Click sidebar note title to open that note
  - Active state indicator for selected notes
  - Three-dot menu for rename/delete actions
  - Font size integration with Todo Text Font Size setting
  - Mobile-optimized with responsive design
  - ESC key closes note menus
  - Real-time sync across devices

## Previous Version: v.005 (October 26, 2025)

### Features (v.005) - Launch Page & Timer Mute

- **Launch Page** (`/launch` and `/about` routes)
  - Comprehensive feature showcase with navigation sidebar
  - Demo video on intro section
  - Screenshot galleries for themes, timer, mobile, and full-page notes
  - Image modal with keyboard navigation
  - Mobile-responsive design with hamburger menu
  - Call-to-action buttons for GitHub and app access

- **Custom 404 Page**
  - Clean, minimal Not Found page matching app design
  - Friendly message with orange action button
  - Tan-themed background with responsive typography

- **Pomodoro Timer Mute Controls**
  - Volume button in modal and full-screen mode
  - Mute all timer sounds (start, countdown, completion, pause)
  - Stops all currently playing audio when muting
  - State persists during timer session

## Previous Version: v.004 (October 25, 2025)

### Latest Features (v.004) - Dark Mode Green Accent

- **Dark Mode Accent Color Update** - Changed from blue (#0076C6) to green (#27A561)
  - All interactive elements now use green accent in dark mode
  - Comprehensive updates across checkboxes, buttons, active states, menus, and more
  - Light mode (#0076C6 blue) and tan mode (#EB5601 orange) remain unchanged
  - Complete theme color reference table added to documentation
  - Mobile add button CSS variables updated for dark mode

## Previous Version: v1.002 (October 24, 2025)

### Latest Features (v1.002) - PWA & Haptics

- **Progressive Web App (PWA) support**
  - `public/manifest.json` - PWA manifest with app metadata, icons, and display settings
  - `public/splash-1170x2532.png` - iOS splash screen (1170x2532px for iPhone Pro)
  - Installable on iOS and Android devices
  - Customizable app name, description, and theme colors
  - Proper icon configuration for native app experience
  - Standalone display mode for immersive app feel

- **Haptics library** (`src/lib/haptics.ts`) - Haptic feedback support
  - Provides haptic feedback for user interactions on supported devices
  - Lightweight utility for enhanced tactile feedback on iOS and Android
  - Works on touch devices with haptics capabilities
  - Graceful fallback for devices without support

### Previous Version (v1.001) - Final Release

- **Todo text font size customization**
  - User-specific font size settings for todo text (authenticated users only)
  - Font size options: 10px, 12px (default), 14px, 16px, 18px, 24px
  - Settings accessible via Keyboard Shortcuts Modal (press `?`)
  - Real-time preview showing how todo text will appear
  - Font size persists across sessions and devices per user account
  - Works in both light and dark themes

## Public Assets (`public/`)

- Favicon files in multiple sizes (16x16 to 512x512)
- Apple touch icons for iOS devices
- Android chrome icons (192x192, 512x512)
- Microsoft tile icons for Windows
- Convex logo files (black and white variants)
- SVG favicon with checkmark design
- **PWA manifest and splash screen**:
  - `manifest.json` - PWA app manifest with configuration
  - `splash-1170x2532.png` - iOS splash screen for iPhone Pro
- **Pomodoro timer audio files** (13 MP3 files):
  - `timer-start.mp3` - Start sound (plays once when timer begins)
  - `5-second-coutdown.mp3` - Countdown alert (plays at 5 seconds remaining)
  - `pause.mp3` - Pause sound (plays when timer is paused)
  - **Completion sounds** (rotate through): `end-synth.mp3`, `end-epicboom.mp3`, `end-epci.mp3`, `end-deep.mp3`, `end-horns.mp3`, `end-computer.mp3`, `end-flute.mp3`, `end-whoa.mp3`, `end-waves.mp3`, `done.mp3`
- `timer-worker.js` - Web Worker for background timer execution

### Previous Features (v1.001) - FINAL RELEASE

- **Todo text font size customization**
  - User-specific font size settings for todo text (authenticated users only)
  - Font size options: 10px, 12px (default), 14px, 16px, 18px, 24px
  - Settings accessible via Keyboard Shortcuts Modal (press `?`)
  - Real-time preview showing how todo text will appear
  - Font size persists across sessions and devices per user account
  - Works in both light and dark themes

### Previous Features (v2.2.6) - v1.0 FINAL RELEASE

- **Unsplash background images in Pomodoro full-screen mode**
  - Optional beautiful nature images from Unsplash as full-screen backgrounds
  - Random search queries: "landscape nature", "cities", "ocean", "sky"
  - New image fetches each time full-screen mode opens for variety
  - Toggle button with ImageIcon to show/hide background
  - Apple-style glass morphism overlay when background is enabled
  - Semi-transparent background with backdrop blur
  - White glass effect in light mode, dark glass in dark mode
  - Readable text with subtle shadows over images
  - Glassmorphic control buttons with hover effects
  - Responsive design with adjusted padding and border-radius for mobile
  - Image toggle state resets to OFF on each full-screen open
  - Secure API key management via Convex environment variables
  - Images hotlinked from Unsplash CDN following API guidelines

### Previous Features (v2.2.5)

- **Menu button alignment consistency** - Fixed three-dot menu button alignment across all todo states
  - Menu buttons now properly align to the right edge of todos in all states (default, hover, focused)
  - Used pseudo-element approach to constrain focused background to 90% width while keeping menu button aligned
  - Added `margin-left: auto` to `.todo-menu` to ensure right-edge alignment
  - Prevents menu button from shifting left when todo item is focused or hovered
  - Documentation added in `prds/menu-button-alignment-fix.md` explaining the solution

- **Menu button hover styling** - Updated hover background colors to match app theme
  - Light mode: `var(--bg-secondary)` (matches menu dropdown items)
  - Dark mode: `var(--bg-secondary)` (matches menu dropdown items)
  - Consistent visual feedback across all interactive elements

### Previous Features (v2.2.2)

- **Pomodoro timer audio notifications** with MP3 file-based sounds
  - Start sound plays once when timer begins at full 25 minutes
  - 5-second countdown sound plays when 5 seconds remain
  - Completion sounds rotate through 11 different MP3 files
  - Pause sound plays when user clicks pause button
  - All sounds play at 70% volume for comfortable listening
  - Replaced Web Audio API oscillators with simple MP3 file loading
  - Cleaner, more maintainable audio implementation

### Previous Features (v2.1.2)

- **Todo count badges in sidebar**
  - Shows count of uncompleted todos next to each date in sidebar
  - Real-time sync - counts update automatically when todos are completed/uncompleted
  - Displays in all sections: active dates, folders, and month groups
  - Simple number display with theme-aware colors (no background box)

- **Pin icon for pinned todos**
  - Drawing pin filled icon from Radix UI appears before checkbox for pinned todos
  - Only shows on date pages (not in pinned section)

- **Pinned todos sorted to top**
  - Pinned todos automatically appear at the top of each date page
  - Maintains original order within pinned and unpinned groups
  - Consistent sorting across App.tsx and TodoList.tsx

- **Fixed keyboard shortcuts for all todos**
  - Keyboard shortcuts now work correctly for all todos, not just pinned ones
  - Fixed index mismatch between keyboard navigation and rendered todos
  - Arrow key navigation properly highlights the correct todo
  - Space/e and p key shortcuts work on any highlighted todo

- **Fixed three-dot menu contrast and alignment**
  - Menu dropdowns now have better contrast and visibility in folders and archive sections
  - Changed dropdown background from secondary to primary for better separation
  - Increased shadow opacity for more depth
  - Improved hover states with clearer backgrounds
  - Fixed opacity inheritance issue so dropdowns render at full opacity
  - Three-dot buttons for folders now perfectly centered vertically
  - Updated folder hover highlight to match light blue color used throughout sidebar

- **Pomodoro timer integration**
  - Built-in productivity timer accessible from sidebar footer
  - Customizable work and break intervals with persistent settings
  - Visual timer display with circular progress indicator
  - Sound notifications for work/break transitions
  - Session tracking and completion statistics
  - Clean, minimal UI matching app design system

### Previous Features (v2.1.1)

- **Subtasks on pinned page**
  - Add subtasks to pinned todos via three-dot menu "Add subtask" option
  - Subtasks are now properly displayed on the pinned page
  - Subtasks inherit the parent todo's date
  - Subtasks can be collapsed/expanded with parent todo

- **Keyboard shortcut "p" to pin/unpin todos**
  - Press "p" key while hovering over any todo to toggle pin state
  - Works on active, uncompleted todos
  - Added to keyboard shortcuts modal (?-key menu)
  - No need to click three-dot menu for quick pinning

- **Smart todo selection for keyboard shortcuts**
  - When not typing in a note or todo input, keyboard shortcuts automatically work
  - Hovering over a todo auto-selects it for keyboard shortcuts
  - Arrow keys (↑/↓) navigate todos even without explicit focus
  - Spacebar/e marks todo as done even without clicking
  - "p" key pins/unpins hovered todo
  - Seamless keyboard-first workflow

- **Auto-focus note content after naming**
  - After naming a note, pressing Enter or Tab automatically focuses the note content area
  - Automatically expands collapsed notes when focusing
  - Smooth workflow for creating and writing notes without clicking

### Previous Features (v2.1.0)

- **Custom folders for organizing dates**
  - Create unlimited folders via "+ Add Folder" button
  - Add any date to a folder via three-dot menu
  - Folder selector modal shows list of available folders
  - Remove dates from folders anytime
  - Collapsible folders with folder icon
  - Three-dot menu on dates within folders
  - Rename, archive, unarchive, and delete folders
  - Three-dot menu for folder management
  - Archived folders appear within archived section
  - Mint green styling matches app design

- **Auto-group completed months**
  - Automatically creates month groups (e.g., "January 2025")
  - Only displays after a full month has passed
  - Archive, unarchive, and delete month groups
  - Three-dot menu for month management
  - Archived month groups appear within archived section

- **Delete all archived dates**
  - Three-dot menu on archived section header
  - Permanently deletes all archived dates
  - Confirmation dialog with archived count

### Previous Features (v2.0.0)

- **Clerk Authentication Integration** - Complete migration from WorkOS to Clerk
  - User login/logout with Clerk authentication
  - Private user data (each user sees only their own todos and notes)
  - Theme-aware login/user icons (user-dark.svg/user-light.svg, login-dark.svg/login-light.svg)
  - "Sign In Required" modal for unauthenticated users
  - Automatic user data storage in Convex database
  - Proper JWT token validation with Clerk token templates
  - Ephemeral mode for unsigned users (local storage, data lost on refresh)

- **UI Improvements** - Enhanced authentication experience
  - Clerk button styling: white text in light mode, black text in dark mode
  - OTP code field styling with blue accent border
  - Authentication popup for "+ add note" button when not signed in
  - Custom confirmation dialogs for sign-in prompts
  - Removed "Don't have an account?" links from Clerk modals (sidebar has dedicated buttons)

### Previous Features (v1.9.2)

- **Production authentication with Netlify Functions** - Resolved WorkOS session authentication failure
  - WorkOS OAuth succeeded but frontend couldn't access session cookies (SPA limitation)
  - Implemented Netlify Functions for server-side OAuth callback handling
  - Created `/api/auth/callback` endpoint to exchange OAuth code for tokens and set HTTP-only cookies
  - Created `/api/auth/me` endpoint to retrieve current user from session cookies
  - Created `/api/auth/logout` endpoint to clear authentication cookies
  - Added `netlify.toml` configuration for function routing
  - Installed `@workos-inc/node` package for server-side WorkOS SDK
  - Updated WorkOS redirect URI from `/callback` to `/api/auth/callback`
  - Fixed production Convex deployment URL configuration (was using dev URL)
  - Set `WORKOS_CLIENT_ID` on production Convex deployment to match frontend
  - Deployed Convex auth config to production with `npx convex deploy -y`

### Previous Features (v1.9.1)

- **Production Deployment Fixes** - Resolved Netlify build and deployment issues
  - Fixed TypeScript errors in WorkOS AuthKit integration
  - Added @types/node package for Convex backend support
  - Comprehensive Netlify deployment documentation
  - Environment variable configuration guide
  - Troubleshooting section for common deployment issues

### Previous Features (v1.9.0)

- **WorkOS AuthKit Integration** - Complete authentication system
  - User login/logout with WorkOS AuthKit
  - Private user data (each user sees only their own todos and notes)
  - Theme-aware login/user icons (user-dark.svg/user-light.svg, login-dark.svg/login-light.svg)
  - "Sign In Required" modal for unauthenticated users
  - Automatic user data storage in Convex database
  - Proper JWT token validation with correct aud/iss claims
  - Redirect handling from /callback to / after successful login

### Previous Features (v1.8.4)

- **Pinned todos** for quick access to important tasks
  - Pin any active todo (excludes completed todos)
  - Pinned section at top of sidebar (only shows when todos are pinned)
  - Dedicated pinned page with full functionality
  - Blue border (#0076C6) on original page, no border on pinned view
  - Pin/unpin from three-dot menu

### Previous Version Features (v1.8.3)

- **Collapsible sidebar** with compact MM/DD date view (260px → 60px)
- **Improved light mode contrast** for date menu and buttons
- **Custom date labels** to rename dates while preserving chronological order
- **Multiple notes per date** with drag-and-drop reordering and individual titles
- **Line numbers in notes** (code editor style, non-copyable)
- **Full-text search** across todos and notes (Cmd/Ctrl+K)
- **Bulk actions**: Archive All and Delete All for active todos
- **Delete controls for archived todos** (individual X button and Delete All)
- **Archive dates feature** to hide completed days
- **Mobile add button** (+ icon) for touch-optimized todo creation
- **Custom confirmation dialogs** matching app design (no browser defaults)
- **Color system**: mint green (#80cbae) for positive, soft red (#e16d76) for destructive
- **Debounced auto-save** for notes (500ms) with smooth typing experience

### Core Features

- Real-time Convex synchronization
- Notion-style inline input (type directly, no button)
- Drag-and-drop reordering for todos and notes
- Auto-archive on completion, auto-unarchive on uncheck
- Three theme options (dark, light, tan) with CSS variables
- Date-based organization with custom labels
- Resizable sidebar (200px - 500px)
- Mobile-optimized with auto-hide and overlay
- Keyboard shortcuts (Enter, Shift+Enter, Cmd/Ctrl+K, Escape)
- Clerk authentication integration (fully implemented, deployed, and working in production)
- Demo mode for logged out users (3 todo limit, local storage)
- Feature showcase for unauthenticated users
- **v1.0 COMPLETE** - Feature-rich, production-ready todo application with all core functionality
