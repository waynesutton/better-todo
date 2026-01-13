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
- `changelog.md` - Version history with all features (v.031 - Executable Notes / Run Note with AI tool use)
- `files.md` - This file, project structure documentation
- `TASKS.md` - Project tasks and development tracking

## Cursor Rules (`.cursor/rules/`)

- `convex-write-conflicts.mdc` - Comprehensive guide for preventing write conflicts when using React, useEffect, and Convex
  - Backend patterns: idempotent mutations, early returns, minimal data reads, indexed queries
  - Frontend patterns: refs for tracking calls, debouncing, mutation status checks, avoiding loops
  - Schema design best practices to minimize conflicts
  - Complete checklists for backend and frontend development
  - Applies to all Convex projects

- `nowriteconflicts.md` - Write conflict prevention guide with real-world fixes applied to Better Todo
  - Documents all write conflicts fixed in November 2025
  - Includes before/after code examples for each fix
  - References to Convex documentation for each pattern
  - Key takeaways for future feature development
  - Single-line prompt for Cursor models to avoid write conflicts
- `dev2.mdc` - Full-stack AI Convex developer guidelines
- `help.mdc` - Core development guidelines and reflection process
- `clerk-auth-check.mdc` - Clerk authentication guidelines for React components
- `task.mdc` - Guidelines for creating and managing task lists
- `write.mdc` - Writing style guide with AI detection avoidance patterns. Covers tweets, LinkedIn, blogs, READMEs, commits. Based on Wikipedia's documented AI tells and academic research.
- `convex2.mdc` - Additional Convex guidelines
- `rulesforconvex.mdc` - Convex-specific rules

## Convex Backend (`convex/`)

### Database Schema

- `schema.ts` - Database schema with tables:
  - **todos**: Stores todo items with content, type (todo/h1/h2/h3), completion status, order, date, optional parentId, optional folderId, and pinned status
    - Index: `by_user_and_date`, `by_user`, `by_user_and_pinned`, `by_user_and_folder`
    - Search index: `search_content` on content field for full-text search
    - Supports both date-based todos and dateless todos in project folders
  - **notes**: Stores multiple notes per date or folder with optional title, content, order, and collapsed state
    - Index: `by_user_and_date`, `by_user_and_folder`
    - Search indexes: `search_content` on content field, `search_title` on title field
    - Supports both date-based notes and folder-based notes (for project folder inline notes)
  - **archivedDates**: Tracks which dates are archived with userId and date
    - Index: `by_user_and_date`
  - **dateLabels**: Stores custom text labels for dates with userId, date, and label text
    - Index: `by_user_and_date`
  - **folders**: Stores custom folders for organizing dates with name, order, archived status, and slug
    - Index: `by_user`, `by_slug`
    - Short NanoID-style slugs (8 alphanumeric characters) for shareable URLs
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
  - **streaks**: Tracks user streak progress with currentStreak, longestStreak, lastCompletedDate, weeklyProgress, and totalTodosCompleted
    - Index: `by_user`
  - **fullPageNotes**: Stores full-page notes with userId, optional date, optional folderId, title, content, order, collapsed, pinnedToTop, and archived status
    - Index: `by_user_and_date` (for notes with dates), `by_user_and_folder` (for notes in projects)
    - Search indexes: `search_content` on content field, `search_title` on title field
    - Notes can exist independently in projects (decoupled from dates)
    - Notes can be archived with their parent project or independently
    - Archived notes are excluded from active counts and listings
  - **agentTasks**: Stores AI agent task requests and results with conversation history
    - Fields: userId, sourceId, sourceType (todo/fullPageNote), sourceContent, sourceTitle, provider (claude/openai), taskType (expand/code/summarize/analyze/other), customInstructions, status (pending/processing/completed/failed), result, error, messages array, folderId, date
    - Index: `by_user`, `by_user_and_status`, `by_user_and_date`, `by_user_and_folder`
    - Messages array stores conversation history with role (user/assistant), content, and timestamp
  - **userApiKeys**: Stores per-user API keys for AI features (Claude and OpenAI)
    - Fields: userId, anthropicKey (optional), openaiKey (optional)
    - Index: `by_user`
    - Keys stored securely with Convex encryption at rest
    - Full keys only accessible via internal queries, client sees masked versions

### Functions

- `todos.ts` - Queries and mutations for todo operations:
  - `getAvailableDates` - Get all dates with todos (excludes folder-associated todos)
  - `getTodosByDate` - Get todos for a specific date (excludes folder-associated todos)
  - `getTodosByFolder` - Get todos for a specific project folder (including subtasks)
  - `getTodoCountsByFolder` - Get count of uncompleted todos per folder for sidebar badges
  - `getPinnedTodos` - Get all pinned todos for user (excluding folder-associated todos, including their subtasks)
  - `getUncompletedCounts` - Get count of uncompleted todos for each date (excludes folder-associated todos, for sidebar badges)
  - `createTodo` - Create new todo with timestamp-based ordering (avoids write conflicts, supports both date and folderId parameters)
  - `createSubtask` - Create a subtask under a parent todo (inherits folderId from parent)
  - `updateTodo` - Update todo (auto-archives on complete, auto-unarchives on uncheck, supports pin/unpin, triggers streak updates)
  - `deleteTodo` - Remove a todo (idempotent, uses indexed queries, parallel deletes for subtasks to avoid write conflicts, triggers streak updates)
  - `reorderTodos` - Update order after drag-and-drop
  - `moveTodoToDate` - Move todo to different date
  - `moveTodoToFolder` - Move todo to project folder (removes date association)
  - `moveTodoFromFolderToDate` - Move todo from folder to specific date (removes folder association)
  - `copyTodosToDate` - Copy all non-archived todos to another date
  - `moveTodosToNextDay` - Move all non-completed, non-archived todos to next day (copies to target, archives source, idempotent with parallel operations)
  - `archiveAllTodos` - Archive all active todos for a specific date
  - `deleteAllTodos` - Delete all active todos for a specific date
  - `deleteAllArchivedTodos` - Delete all archived todos for a specific date

- `notes.ts` - Queries and mutations for notes operations:
  - `getNotesByDate` - Get all notes for a specific date (excludes folder notes)
  - `getNotesByFolder` - Get all notes for a specific project folder
  - `createNote` - Create new note with timestamp-based ordering (supports both date and folderId, avoids write conflicts)
  - `updateNote` - Update existing note content or title (patches directly without reading first)
  - `deleteNote` - Remove a note by ID (uses indexed queries, idempotent)
  - `updateNoteCollapsed` - Toggle note collapsed state
  - `reorderNotes` - Update order after drag-and-drop (supports both date and folder-based notes, parallel updates with Promise.all)

- `fullPageNotes.ts` - Queries and mutations for full-page notes:
  - `getFullPageNotesByIds` - Get multiple full-page notes by ID array (for open tabs)
  - `getFullPageNotesByDate` - Get all full-page notes for a specific date (excludes archived)
  - `getFullPageNotesByFolder` - Get all full-page notes for a specific project folder (with includeArchived option)
  - `getFullPageNote` - Get single full-page note by ID
  - `getFullPageNoteCounts` - Get count of full-page notes per date for sidebar (excludes archived)
  - `getFullPageNoteCountsByFolder` - Get count of full-page notes per project folder for sidebar badges (excludes archived)
  - `createFullPageNote` - Create new full-page note with timestamp-based ordering (avoids write conflicts, accepts date OR folderId)
  - `updateFullPageNote` - Update note title or content (patches directly without reading first, idempotent)
  - `deleteFullPageNote` - Permanently remove a full-page note (uses indexed queries, idempotent)
  - `reorderFullPageNotes` - Update order with parallel updates (Promise.all)
  - `moveFullPageNoteToFolder` - Move note to project (removes date, sets folderId, idempotent check)
  - `moveFullPageNoteToDate` - Move note to date (removes folderId, sets date, idempotent check)
  - `generateUploadUrl` - Generate URL for image uploads
  - `getStorageUrl` - Get URL for a stored file
  - `getImageUrl` - Helper mutation to get image URL
  - `addImageToNote` - Add image to full-page note
  - `removeImageFromNote` - Remove image from note and delete from storage
  - `getImageUrls` - Get all image URLs for a note
  - `checkSlugAvailability` - Check if a custom slug is available (public query)
  - `getNoteBySlug` - Get note by share slug with image URLs (public query)
  - `getSharedNoteMetadata` - Get note metadata for Open Graph tags (internal query)
  - `generateShareLink` - Generate or update share link with custom slug
  - `revokeShareLink` - Revoke share link to make note private
  - `updateHideHeader` - Update hide header setting for shared note
  - `updateShareSlug` - Update custom slug for shared note

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
  - `getFolderBySlug` - Get folder by slug or ID (for URL-based navigation, handles both short slugs and full Convex IDs for backwards compatibility)
  - `createFolder` - Create new project with timestamp-based ordering and auto-generated slug (avoids write conflicts)
  - `renameFolder` - Update project name (uses indexed queries, idempotent check)
  - `archiveFolder` - Archive a project and all its full-page notes in parallel (uses indexed queries, idempotent)
  - `unarchiveFolder` - Restore archived project and all its full-page notes in parallel (uses indexed queries, idempotent)
  - `deleteFolder` - Delete project, all associations, and all its full-page notes (parallel deletes with Promise.all)
  - `addDateToFolder` - Associate a date with a project (idempotent check for existing associations)
  - `removeDateFromFolder` - Remove date from project
  - `generateFolderSlug` - Generate slug for existing folder (for migration of old folders without slugs)

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
  - `startPomodoro` - Create new pomodoro session with optional duration (defaults to 25 minutes, supports 50 and 90 minutes, increments global statistics counter)
  - `pausePomodoro` - Pause current session with remaining time
  - `resumePomodoro` - Resume paused session
  - `stopPomodoro` - Stop and delete current session
  - `completePomodoro` - Mark session as completed (uses indexed queries, idempotent to prevent write conflicts)
  - `updateBackgroundImage` - Update session with Unsplash background image URL (uses indexed queries, idempotent check)
  - `updatePomodoroPreset` - Update session duration while paused (single patch, no stop/start cycle for smooth UI)

- `unsplash.ts` - Unsplash background image fetching:
  - `fetchBackgroundImage` - Fetches random images from Unsplash API
  - Uses Node.js action with "use node" directive
  - Secure access to UNSPLASH_ACCESS_KEY environment variable
  - Random search queries: "landscape nature", "cities", "ocean", "sky"
  - Updates pomodoro session with image URL for full-screen backgrounds

- `streaks.ts` - Streak tracking (AI-free):
  - `getStreakStatus` - Get current user's streak data (current streak, longest streak, weekly progress, total completed, last completed date)
  - `updateStreak` - Internal mutation to update streak on todo completion/deletion (only tracks regular date-based todos)
  - Pure JavaScript date calculations with no AI dependencies
  - Tracks consecutive days completing all regular date-based todos

- `aiChats.ts` - AI Chat sessions per date:
  - `getAIChatByDate` - Fetch chat history for a specific date
  - `getAIChatCounts` - Get message counts per date for sidebar (returns 0 for cleared/deleted chats)
  - `getOrCreateAIChat` - Create new chat or return existing one
  - `addUserMessage` - Append user message to chat
  - `addUserMessageWithAttachments` - Append user message with image/link attachments
  - `addAssistantMessage` - Internal mutation to append AI response
  - `getAIChatInternal` - Internal query for use in actions
  - `generateUploadUrl` - Generate URL for image uploads
  - `getStorageUrl` - Get URL for a stored image
  - `getStorageUrlInternal` - Internal query for image URLs in actions
  - `clearChat` - Reset messages to empty array (keeps chat, removes from sidebar display)
  - `deleteChat` - Delete entire chat document (removes from database and sidebar)

- `aiChatActions.ts` - AI response generation with media support:
  - `generateResponse` - Generate AI response with Claude, supports images and links
  - `scrapeUrlAction` - Internal action to scrape a URL for testing
  - Integrates Firecrawl for web scraping (tweets, LinkedIn, blogs, PDFs)
  - Claude vision support for image analysis
  - Auto-detects URLs in messages and scrapes them

- `agentTasks.ts` - AI Agent Tasks management:
  - `getAgentTasks` - Get tasks filtered by date or folder for current user
  - `getAgentTaskCounts` - Get counts of tasks by status for sidebar badges
  - `getAgentTask` - Get single task by ID with ownership check
  - `createAgentTask` - Create new agent task and schedule processing
  - `deleteAgentTask` - Remove task with ownership verification
  - `deleteAllAgentTasks` - Bulk delete all tasks (with optional date/folder filter)
  - `addFollowUpMessage` - Add follow-up message to existing conversation
  - `createTodosFromAgent` - Parse agent results into individual todos
  - `saveResultAsNote` - Save agent conversation as full-page note
  - `updateTaskStatus` - Internal mutation for task status updates
  - `appendAssistantMessage` - Internal mutation for AI response appending
  - `markFollowUpFailed` - Internal mutation for follow-up error handling
  - `getTaskForProcessing` - Internal query for action processing

- `agentTaskActions.ts` - AI Agent task processing with Claude and OpenAI:
  - `processAgentTask` - Process initial task with selected AI provider
  - `processFollowUp` - Process follow-up messages with conversation context
  - `processExecutableNote` - Process run tasks with AI tool use agent loop
  - `runClaudeAgentLoop` - Multi-step execution with Claude tool use
  - `runOpenAIAgentLoop` - Multi-step execution with OpenAI function calling
  - `executeAgentTool` - Dispatcher for tool execution
  - Task-specific system prompts for expand, code, summarize, analyze, other, run
  - Supports full conversation history for multi-turn interactions
  - Requires user's personal API keys (no environment variable fallback)
  - Max 10 iterations safety limit for agent loops

- `agentTools.ts` - AI Agent tool definitions:
  - `AGENT_TOOLS` - Array of tool definitions with name, description, parameters
  - `getClaudeTools()` - Format tools for Anthropic API
  - `getOpenAITools()` - Format tools for OpenAI function calling
  - `EXECUTABLE_NOTE_SYSTEM_PROMPT` - System prompt for run task execution
  - Tools: createTodo, updateTodo, completeTodo, deleteTodo, createNote, updateNote, moveTodosToDate, searchTodos, searchNotes, getTodosForDate, archiveDate

- `agentToolMutations.ts` - Internal mutations for AI agent tool execution:
  - `agentCreateTodo` - Create todo with validation
  - `agentUpdateTodo` - Update todo content or pinned status
  - `agentCompleteTodo` - Mark todo as completed
  - `agentDeleteTodo` - Delete todo with ownership check
  - `agentCreateNote` - Create full-page note
  - `agentUpdateNote` - Update note title or content
  - `agentMoveTodosToDate` - Move todos to target date
  - `agentSearchTodos` - Search todos by query
  - `agentSearchNotes` - Search notes by query
  - `agentGetTodosForDate` - Get todos for specific date
  - `agentArchiveDate` - Archive date and todos
  - All mutations use indexed queries for ownership checks

- `userApiKeys.ts` - Per-user API key management for AI features:
  - `getUserApiKeys` - Query to get masked API keys for UI display (shows last 4 chars only)
  - `getApiKeyInternal` - Internal query to get full API key for actions (not exposed to client)
  - `setApiKey` - Mutation to save or update an API key for a provider (anthropic or openai)
  - `deleteApiKey` - Mutation to remove a saved API key
  - Keys stored securely with Convex encryption at rest
  - Scoped to authenticated user via userId index

- `stats.ts` - Statistics tracking (global and user-specific):
  - `getStats` - Action to get aggregate stats across all users (total users, todos, notes, pomodoro sessions, folders)
  - `getDatabaseStats` - Internal query to get database table counts
  - `getUserCountFromClerk` - Action to get total user count from Clerk API
  - `getUserStats` - Query to get user-specific statistics for authenticated user (excludes total users, uses indexed queries for todos, notes, fullPageNotes, pomodoroSessions, folders, returns null if not authenticated)

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
  - **Streaks header visibility state** - Persisted in localStorage (defaults to visible)
  - Keyboard shortcuts:
    - p key to pin/unpin hovered todo
    - Arrow keys to navigate todos
    - Space/e to mark todo as done
    - z to undo last completion
    - / or c to focus input
    - ? to show keyboard shortcuts modal with code block syntax reference
    - Shift + S to toggle streaks header button visibility
  - Hovered todo tracking for keyboard shortcuts
  - Auto-select hovered todo when not explicitly navigating
  - **Full-page note folder handling** - Opens notes from folders and highlights folder in sidebar
  - **Streaks route** - Added `/streaks` route for StreaksPage component
  - Clerk authentication integration:
    - Conditional query execution based on authentication state
    - "Sign In Required" modal for unauthenticated users
    - Automatic user data storage in Convex database
    - Ephemeral mode for unsigned users (local storage)
    - Theme-aware authentication modals
    - Modal state tracking refs to prevent infinite re-render loops on user reload

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
  - **Refined todo input UI** - Modern rounded container with ArrowUp submit button
    - Max width of 650px on desktop with `var(--bg-secondary)` background
    - ArrowUp icon button (24px, scales to 22px/20px/18px on smaller devices) from Radix UI
    - No box shadows for cleaner design
    - Button integrates with existing keyboard shortcuts (Enter/Shift+Enter)
    - Disabled state (55% opacity) when input is empty
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
    - Copy Link (copies shareable URL to clipboard, e.g., `/d/2026-01-02`)
    - Add/edit/remove custom date label
    - Add to Project (shows project selector modal when projects exist)
    - Remove from Project (when date is in a project)
    - Copy all non-archived todos to tomorrow, previous/next day, or custom date
    - Move to Next Day (moves incomplete todos to next day and archives originals)
    - Archive the entire date
    - Delete the date and all its content
  - Three-dot menu for dates inside projects with options:
    - Remove from Project
    - Archive Date
    - Delete Date
  - Three-dot menu per project with options:
    - Copy Link (copies shareable URL with short slug, e.g., `/p/ork88fqr`)
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
  - **Sidebar collapse shortcut**: Cmd+. (Mac) or Ctrl+. (Windows/Linux) to toggle sidebar
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
  - **Pomodoro shortcuts**: Shift + F to open timer, f to enter full-screen mode
  - **Streaks shortcut**: Shift + S to toggle streaks header button visibility
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
  - **Duration toggle** - Switch between 25-minute, 50-minute, and 90-minute sessions
    - Waves icon for 25-minute focus mode
    - Activity icon for 50-minute steady session
    - Clock icon for 90-minute flow state mode
    - Toggle button appears next to Start button when timer is idle
    - Toggle also available when timer is paused (in both modal and full-screen views)
    - Changing duration while paused resets timer to new duration and stays paused
    - Smooth transitions with no UI flickering
    - All timer features work identically for all durations
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
  - **Shift + F keyboard shortcut** - Open Pomodoro timer modal from anywhere in the app
  - **Theme-aware phase badges** - Focus and Break badges use CSS variables to match all themes (dark, light, tan, cloud)
  - **Smooth full-screen transitions** - No flash when entering full-screen mode (removed fade-in and pulse animations)
  - Web Worker for accurate background timing
  - Session persistence via Convex (syncs across tabs)
  - Keyboard shortcuts (ESC to close full-screen, f to enter full-screen, Shift + F to open timer)
  - Sound state tracking with refs (`hasPlayedStartSound`, `hasPlayedCountdownSound`, `lastEndSoundIndex`, `userStartedInThisSession`)
  - Accessible from timer icon in header or Shift + F shortcut

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
  - **Share button** for authenticated users to generate shareable links
  - Visual indicator if note is already shared
  - Open shared note in new tab button

- `ShareLinkModal.tsx` - Shareable link management modal:
  - Custom slug input with validation and availability checking
  - Copy to clipboard with visual confirmation
  - Hide title on share toggle
  - Edit custom slug functionality
  - Revoke share link button
  - Open shared note in new tab
  - Theme-aware styling matching app design
  - Mobile responsive with proper spacing

- `StreaksHeader.tsx` - Streaks icon and weekly progress bar in app header:
  - Inline SVG fire icon using currentColor for theme-aware styling
  - 7-bar weekly progress indicator showing incomplete days
  - Bars use theme-specific colors matching active date colors
  - Navigates to `/streaks` route on click
  - Only visible for authenticated users
  - Tooltip shows streak count and incomplete days
  - Can be toggled on/off with Shift + S keyboard shortcut

- `AIChatView.tsx` - AI writing assistant chat interface:
  - Full markdown rendering for AI responses with react-markdown
  - Image upload support (up to 3 images, max 3MB each)
  - Link attachment with URL modal and validation
  - Auto-detect URLs in messages for scraping
  - Preview area for attached images and links
  - Copy button on AI messages
  - Stop button to cancel generation
  - Auto-expanding textarea input
  - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
  - Input position toggle (centered or left-aligned)
  - `/clear` command to clear messages (with confirmation dialog)
  - `/delete` command to delete chat from database (with warning dialog)
  - Header actions (Clear and Delete buttons) visible when chat has messages
  - Closes view and removes from sidebar after deletion

- `AgentTaskModal.tsx` - Modal for configuring and sending AI agent tasks:
  - Provider selection between Claude (Anthropic) and OpenAI
  - Task type selection: Expand, Code, Summarize, Analyze, or Other
  - Custom instructions textarea for "Other" task type
  - Source content preview showing what will be sent
  - Creates agent task and schedules background processing

- `AgentTasksView.tsx` - View for displaying AI agent tasks and results:
  - Task list with status indicators (pending, processing, completed, failed)
  - Task type icons for visual identification
  - Conversation thread display with user/assistant message styling
  - Full markdown rendering with syntax-highlighted code blocks
  - Follow-up chat input for continuing conversations in same thread
  - Copy results to clipboard
  - Delete individual tasks with confirmation dialog
  - Delete All button to bulk delete tasks (with confirmation showing count)
  - Create Todos from agent results (parses markdown lists)
  - Save agent results as full-page notes
  - Filtered by current date or folder context
  - Mobile-responsive design
  - Authentication required

- `SharedNoteView.tsx` - Public shared note viewer page:
  - Public route at `/share/:slug` (no authentication required)
  - Instant loading with Convex real-time sync
  - Renders markdown with full syntax highlighting
  - Displays images with proper sizing and alignment
  - Theme toggle (dark, light, tan, cloud)
  - Copy note content button
  - Footer with link back to better-todo
  - Dynamic Open Graph meta tags for social sharing
  - Uses first image as preview for social sharing
  - Error handling for invalid/missing notes
  - Mobile responsive design

- `StreaksPage.tsx` - Streaks dashboard (AI-free):
  - Dedicated route at `/streaks` for viewing streak status
  - Two-column layout: left shows streak stats, right shows your personal stats
  - Takes up 80% of page width (90% on tablet, 100% on mobile)
  - Left column displays current streak, longest streak, total completed, weekly calendar, completion rate, and next milestone
  - Right column displays your personal stats:
    - 9 stat cards: Todos Created, Completed, Active, Pinned, Archived, Full-Page Notes, Todo Notes, Pomodoro Sessions, Folders
    - Completion rate percentage displayed on Completed card
    - Icon-based cards with hover effects
    - Responsive grid: auto-fit columns on desktop, single column on mobile, 2 columns on tablet
    - Matches streaks page theme and UI
  - Theme switcher in top right corner
  - App name "better todo" in top left serves as back button to home
  - Real-time sync with Convex for instant updates
  - Mobile responsive with single-column stacked layout
  - Pure JavaScript streak calculations with no AI dependencies

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
- `changelog.md` - Version history with all feature additions and changes (v1.001 to v.030)
- `TASKS.md` - Project tasks and development tracking

## Current Version: v.031 (January 13, 2026)

### Latest Features (v.031) - Executable Notes (Run Note)

- **Executable Notes (Run Note)** - Turn notes into executable programs with AI tool use
  - New "Run" task type interprets natural language and executes via tools
  - AI agent loop pattern with multi-step tool execution
  - Run Note button on full-page notes and inline notes
  - Execution log shows tool calls with inputs, results, and status
  - Collapsible execution log with scroll support
  - Support for both Claude and OpenAI providers

- **AI Agent Tools** - Comprehensive tool set for note execution
  - createTodo, updateTodo, completeTodo, deleteTodo for todo management
  - createNote, updateNote for note management
  - moveTodosToDate, searchTodos, searchNotes for organization
  - getTodosForDate, archiveDate for queries and archiving

### Previous Features (v.030) - Persistent Navigation Icons

- **Persistent Navigation Icons** - All view icons now always visible in header
  - Todos (checkbox), Notes (file), Chat (message), and Agent (sparkles) icons always visible
  - Icons toggle their respective views when clicked (click to open, click again to close)
  - Active view indicated with accent color highlight
  - Icons still contextually hidden on pinned/backlog views where not applicable

### Previous Features (v.029) - Per-User API Keys

- **Per-User API Keys** - Users must provide their own API keys for AI features
  - New "API Keys" section in Keyboard Shortcuts Modal (press ?)
  - Support for both Claude (Anthropic) and OpenAI API keys
  - Keys stored securely in Convex database (encrypted at rest)
  - Masked key display in UI (only last 4 characters visible)
  - Help links to get API keys from console.anthropic.com and platform.openai.com
  - Save and delete functionality per provider
  - Show/hide password toggle for key input
  - Each user must provide their own keys to use AI features
  - Full keys only accessible via internal Convex queries (not exposed to client)

### Previous Features (v.028) - Chat & Agent Task Management

- **AI Chat Clear and Delete Commands** - Manage chat history with commands or buttons
  - Type `/clear` to clear all messages (keeps the chat, removes messages)
  - Type `/delete` to permanently delete the chat from the database
  - Header buttons for Clear and Delete appear when chat has messages
  - Confirmation dialogs before destructive actions
  - Delete removes chat from sidebar automatically (Convex reactivity)

- **Agent Tasks Delete All** - Bulk delete agent tasks
  - New "Delete All" button in agent tasks header
  - Deletes all tasks filtered by current date or folder context
  - Confirmation dialog shows count of tasks to be deleted

### Previous Features (v.027) - Agent Actions & UX Improvements

- **Markdown Download for Full-Page Notes** - Download any note as a .md file
  - New Download icon button in full-page notes toolbar
  - Downloads note content with sanitized filename
  - Client-side download using Blob and createObjectURL

- **Create Todos from Agent Results** - Turn AI output into actionable todos
  - New "Create Todos" button on completed agent tasks
  - Parses markdown lists (checkboxes, bullets, numbered) into individual todos
  - Todos created in same date/folder context as the original task
  - Success feedback showing count of todos created

- **Save Agent Results as Notes** - Preserve AI output as full-page notes
  - New "Save as Note" button on completed agent tasks
  - Saves entire conversation including follow-ups
  - Note created in same date/folder context
  - Success feedback when note is saved

- **Persistent Agent Tasks Icon** - Always visible in header
  - Sparkles icon now visible when in full-page notes or AI chat views
  - Allows switching to Agent Tasks from any view
  - Closes current view when switching

- **ESC Key Fullscreen Exit** - Smarter escape handling for full-page notes
  - First ESC exits fullscreen mode (if active)
  - Second ESC closes the full-page notes view
  - Better UX for fullscreen editing

### Previous Features (v.026) - AI Agent Tasks

- **AI Agent Tasks** - Send todos and notes to Claude or OpenAI for processing
  - Choose between Claude (Anthropic) or OpenAI providers
  - Five task types: Expand, Code, Summarize, Analyze, Other
  - Conversation threads with follow-up questions
  - Real-time status indicators
  - Markdown rendering with syntax highlighting
  - Keyboard shortcut Shift+A to send focused todo

### Previous Features (v.025) - Inline Todo Notes in Project Folders

- **Inline Notes Support for Projects** - Fixed bug and added full support for inline notes in project folders
  - Notes in one project folder no longer appear in other project folders
  - Each project folder now has its own isolated inline notes
  - Notes are properly scoped to either a date OR a folder (not both)
  - Create, edit, pin, reorder, and delete notes directly in project folder views
  - Added `folderId` field and `by_user_and_folder` index to notes schema
  - Added `getNotesByFolder` query for fetching notes by folder
  - Updated `NotesSection` and `PinnedNotesSection` to support folder context

### Previous Features (v.024) - Shareable URLs & Sidebar Keyboard Shortcut

- **Shareable URLs for Dates and Projects** - Copy link to navigate directly to dates and projects
  - Copy Link option in sidebar date menu copies shareable URL (e.g., `/d/2026-01-02`)
  - Copy Link option in sidebar project menu copies shareable URL with short slug (e.g., `/p/ork88fqr`)
  - Short NanoID-style slugs (8 alphanumeric characters) for project URLs
  - Backwards compatible - supports both new slugs and legacy full Convex IDs
  - Auto-generates slugs for existing folders without slugs when copying link
  - URL navigation auto-expands and highlights the selected folder in sidebar
  - Active folder header styling with theme-aware colors

- **Sidebar Collapse Keyboard Shortcut** - Quick toggle for sidebar visibility
  - Press Cmd+. (Mac) or Ctrl+. (Windows/Linux) to toggle sidebar collapse
  - Added to keyboard shortcuts modal in Navigation section

### Previous Features (v.021) - Move to Next Day & Pomodoro Duration Toggle

- **Move to Next Day** - Quickly shift incomplete todos to the next day
  - New option in sidebar date menu to move all non-completed, non-archived todos forward
  - Copies todos to the next day and archives originals automatically
  - Idempotent mutation with timestamp-based ordering (avoids write conflicts)
  - Parallel operations with Promise.all() for efficient processing
  - Keeps history clean while moving work forward

- **Pomodoro Duration Toggle While Paused** - Change timer duration when paused
  - Available in both modal and full-screen views when timer is paused
  - Switch between 25-minute focus, 50-minute steady, and 90-minute flow state sessions
  - Uses icons: Waves (25 min), Activity (50 min), Clock (90 min)
  - Smooth transition with single database patch (no UI flickering)
  - Timer resets to new duration and stays paused for seamless adjustment

- **Query Guards** - Added authentication guards to all Convex queries in Sidebar
  - Prevents unnecessary subscriptions when user is not authenticated
  - Uses `isAuthenticated ? undefined : "skip"` pattern for all sidebar queries
  - Reduces memory pressure and potential race conditions

- **Page Crash Fix** - Fixed page crashing error when navigating between dates

### Previous Features (v.020) - AI-Free Streaks

- **AI-Free Streaks** - Track your todo completion momentum without AI
  - Automatic tracking of consecutive days completing all regular date-based todos
  - Current and longest streak counters with weekly progress visualization
  - Fire icon (rise.svg) in header with 7-bar weekly progress indicator
  - Bars disappear as you complete todos, reset every Sunday at 12:01 am
  - Dedicated `/streaks` dashboard with streamlined interface
  - Two-column layout: streak stats on left, your personal stats on right
  - Weekly calendar visualization showing past, today, and future days
  - Completion rate percentage and next milestone progress bar
  - Theme switcher in top right, app name as back button in top left
  - Real-time sync with Convex for instant updates
  - Pure JavaScript date calculations with no AI dependencies
- **Your Stats Section** - Personal statistics overview on streaks page
  - 9 stat cards: Todos Created, Completed, Active, Pinned, Archived, Full-Page Notes, Todo Notes, Pomodoro Sessions, Folders
  - Completion rate percentage displayed on Completed card
  - Icon-based cards with hover effects
  - Responsive grid layout for all screen sizes
- **Smart Todo Filtering** - Only tracks regular date-based todos
  - Excludes full-page notes, todo page notes, folder todos, backlog, pinned, and archived
- **Streaks Header Toggle** - Shift + S keyboard shortcut to hide/show streaks header
  - Preference persisted in localStorage
  - Streaks page and all features remain functional when header is hidden
- **User-Scoped Data** - Complete data isolation with indexed queries
- **Backend**: `streaks` table with pure JavaScript calculations, updated `updateTodo` and `deleteTodo` mutations
- **No Configuration Needed**: App works completely without any AI API keys

### Previous Features (v.017) - Shareable Full-Page Notes

- **Shareable Full-Page Notes** - Share read-only links to your notes with custom URL slugs
  - Share button in full-page note tabs to generate shareable links
  - Custom URL slugs (alphanumeric, hyphens, underscores, 3-50 characters)
  - Random slug generation if no custom slug provided
  - Reserved slugs protection (api, admin, share, etc.)
  - Public `/share/:slug` route accessible without authentication
  - Share modal with copy-to-clipboard functionality
  - Optional hide title on shared note setting
  - Ability to edit custom slugs after creating share link
  - Revoke share link to make note private again
  - Open shared note in new tab from share modal
  - Theme-aware shared note viewer with theme toggle
  - Copy note content from shared view
  - Real-time Open Graph meta tags for social sharing
  - First image from note used as preview image
  - Instant loading with Convex real-time sync (no loading states)
  - Footer with link back to better-todo
  - Works with markdown, code blocks, and images

### Previous Features (v.016) - Pomodoro Timer Keyboard Shortcut

- **Keyboard-forward timer access** - The inline Pomodoro timer now uses Shift + F for instant modal access anywhere in the app.

- **Todos inside projects** - Projects now accept todos directly, with sidebar folder toggles for Todos and Notes.
- **Folder-aware navigation** - Opening full-page notes from a project auto-expands and highlights the correct folder.
- **Back navigation** - FileText view now includes a checkbox back button that returns to the right date or Today context.
- **Robust folder mutations** - New Convex helpers move todos between dates and folders, keep counts accurate, and cascade deletes safely.

### Previous Features (v.013) - Pomodoro Timer Duration Toggle

- **Duration Toggle** - Switch between 25-minute focus sessions and 90-minute flow state sessions
  - Waves icon to switch to 90-minute flow state mode
  - Clock icon to switch back to 25-minute focus mode
  - Toggle button appears next to Start button (only visible when timer is idle)
  - All timer features work identically for both durations
- **Sound Auto-Play Prevention** - Fixed sounds playing automatically when timer session is restored from previous page load
  - Sounds now only play when user explicitly clicks Start or Reset button in current session
  - Prevents unexpected audio interruptions when navigating to app with active timer

### Previous Features (v.012) - Project Full-Page Notes

- **Full-page notes in projects** - Notes can live in project folders with tab support, counts, and archived-state respect.
- **Project deletion safeguards** - Confirmation dialogs surface note counts before destructive actions.
- **Shared archive semantics** - Archiving or unarchiving a project cascades to its notes; archived folders stay read-only.
- **Remark breaks integration** - Single line breaks render consistently across full-page and inline notes.
- **Convex updates** - Added `getFullPageNotesByIds`, folder-aware queries, and schema support for archived notes.
- **Sidebar sync** - Selecting a note from a project expands the matching folder and keeps badges accurate.

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
