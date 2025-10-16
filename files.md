# Better Todo - Project Files

This document describes the structure and purpose of each file in the Better Todo application.

## Root Configuration

- `package.json` - Project dependencies and scripts (React 18, TypeScript, Convex, Lucide icons, @dnd-kit)
- `tsconfig.json` - TypeScript configuration for React app
- `tsconfig.node.json` - TypeScript configuration for Vite
- `vite.config.ts` - Vite bundler configuration with React plugin
- `index.html` - HTML entry point with meta tags for SEO and social sharing
- `.gitignore` - Git ignore patterns
- `README.md` - Complete project documentation
- `changelog.md` - Version history with all features (v1.0.0 to v1.8.3)
- `files.md` - This file, project structure documentation
- `TASKS.md` - Project tasks and development tracking

## Convex Backend (`convex/`)

### Database Schema

- `schema.ts` - Database schema with tables:
  - **todos**: Stores todo items with content, type (todo/h1/h2/h3), completion status, order, date, and optional parentId
    - Index: `by_user_and_date`, `by_user`
    - Search index: `search_content` on content field for full-text search
  - **notes**: Stores multiple notes per date with optional title, content, order, and collapsed state
    - Index: `by_user_and_date`
    - Search indexes: `search_content` on content field, `search_title` on title field
  - **archivedDates**: Tracks which dates are archived with userId and date
    - Index: `by_user_and_date`
  - **dateLabels**: Stores custom text labels for dates with userId, date, and label text
    - Index: `by_user_and_date`

### Functions

- `todos.ts` - Queries and mutations for todo operations:
  - `getAvailableDates` - Get all dates with todos
  - `getTodosByDate` - Get todos for a specific date
  - `createTodo` - Create new todo with auto-ordering
  - `updateTodo` - Update todo (auto-archives on complete, auto-unarchives on uncheck)
  - `deleteTodo` - Remove a todo
  - `reorderTodos` - Update order after drag-and-drop
  - `moveTodoToDate` - Move todo to different date
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

- `search.ts` - Full-text search functionality using Convex search indexes:
  - `searchAll` - Search across todos (by content) and notes (by title and content)
  - Returns top 30 most relevant results with type, date, and status
  - Supports real-time search with keyboard navigation

- `dates.ts` - Date management mutations:
  - `deleteDate` - Delete all data for a specific date (todos, notes, archived entry, labels)

- `dateLabels.ts` - Custom date label management:
  - `getDateLabels` - Get all custom labels for dates
  - `setDateLabel` - Add or update a custom text label for a date
  - `removeDateLabel` - Remove a custom label from a date

- `archivedDates.ts` - Archive management:
  - `getArchivedDates` - Get list of archived dates
  - `archiveDate` - Archive a date (hides from main list)
  - `unarchiveDate` - Restore archived date to main list

### Authentication (Ready to Enable)

- `http.ts` - HTTP routes for authentication callbacks (WorkOS AuthKit ready)
- Authentication is configured but not yet required for the app to function

## React Frontend (`src/`)

### Main Files

- `main.tsx` - Application entry point with Convex and auth providers
- `App.tsx` - Main app component with:
  - Layout management (sidebar + main content)
  - Sidebar resize functionality (200px - 500px)
  - Sidebar collapse/expand states (full 260px, collapsed 60px, mobile hidden)
  - Collapsed sidebar shows compact MM/DD date format
  - Mobile detection and auto-hide on small screens (≤768px)
  - Date selection and navigation state
  - Search modal integration (Cmd/Ctrl+K keyboard shortcut)
  - Theme context provider

### Components (`src/components/`)

- `TodoItem.tsx` - Individual todo item with:
  - Plain text display (no markdown rendering in todos)
  - Drag handle for reordering (⋮⋮) - visible on hover
  - Checkbox for completion (auto-archives when checked)
  - Three-dot menu for moving to tomorrow, previous/next day, or deleting
  - Inline editing with Enter for new lines, Shift+Enter to save
  - Custom confirmation dialog for delete actions
  - Auto-textarea expansion for multi-line content

- `TodoList.tsx` - Todo list container with:
  - Drag-and-drop functionality using @dnd-kit
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

- `Sidebar.tsx` - Resizable and collapsible navigation sidebar with:
  - Date list showing all days with todos (scrollable with custom scrollbar)
  - Collapsible view with compact date format (MM/DD) via panel icon in header
  - Collapse button next to "better todo" title (PanelLeft icon)
  - Smooth animated transitions between full (260px) and collapsed (60px) states
  - Custom date labels (rename dates with any text while preserving chronological order)
  - Active date highlighting (#56B5DB accent color)
  - Theme toggle (half-moon icon) at bottom of sidebar above login link
  - Three-dot menu per date with options:
    - Add/edit/remove custom date label
    - Copy all non-archived todos to tomorrow, previous/next day, or custom date
    - Archive the entire date
    - Delete the date and all its content
  - Archived dates section (collapsible)
  - Login link (authentication ready to enable)
  - Custom confirmation dialog for delete actions
  - Hover tooltips show full date labels in collapsed view

- `ConfirmDialog.tsx` - Reusable confirmation modal component with:
  - Custom styled dialog matching site design system
  - Uses React Portal to render at document.body level
  - Centered on entire page viewport with high z-index
  - Backdrop overlay for focus
  - Configurable title, message, and button text
  - Dangerous action styling (red button for destructive actions)
  - Replaces browser default confirm/alert dialogs
  - Responsive width for mobile compatibility

- `NotesSection.tsx` - Daily notes feature with:
  - Multiple notes per date with drag-and-drop reordering using @dnd-kit
  - Each note has editable title (click to edit, auto-save on blur)
  - Collapsible notes (expand/collapse individual notes)
  - Line numbers on the left (not copyable when copying text, code editor style)
  - Auto-expanding textarea with debounced auto-save (500ms delay)
  - Copy button per note to copy content to clipboard
  - Delete button with custom confirmation dialog
  - Add Note button (+ icon) to create new notes
  - Clean, minimal design matching app aesthetic

- `ArchiveSection.tsx` - Collapsible archive with:
  - Shows all completed/archived todos for selected date
  - Displays count of archived items in header
  - Uncheck checkbox to restore todo to active list (auto-unarchive)
  - X delete button on hover for each archived todo (soft red #e16d76)
  - "Delete All" button in header to remove all archived todos at once
  - Custom confirmation dialogs matching app design system
  - Controlled expand/collapse state from parent component
  - Auto-collapses when new todos are added
  - Supports moving archived items to other dates via three-dot menu
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

### Context (`src/context/`)

- `ThemeContext.tsx` - Theme management:
  - Dark/light mode toggle
  - Persists preference to localStorage
  - Smooth color transitions
  - CSS variable-based theming

### Styles (`src/styles/`)

- `global.css` - Global styles with:
  - CSS custom properties for theming and typography
  - Dark mode: Sublime Text-inspired (#2E3842 background)
  - Light mode: Apple Notes-inspired (#f5f5f7 background)
  - Custom font size variables (--font-app-name, --font-sidebar, --font-todo, --font-archive)
  - Color system:
    - Accent: #56B5DB (active date, focus states)
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
  - System font stack for native look and feel

## Documentation (`prds/`)

- `QUICKSTART.md` - 2-minute setup guide for quick start
- `GETTING_STARTED.md` - Detailed feature walkthrough and usage guide
- `PROJECT_SUMMARY.md` - Complete project overview and architecture
- `workos-authkit-integration.md` - WorkOS AuthKit setup and configuration guide

## Root Documentation

- `README.md` - Complete project documentation with features, usage guide, and customization
- `files.md` - This file, describing project structure and file purposes
- `changelog.md` - Version history with all feature additions and changes (v1.0.0 to v1.8.3)
- `TASKS.md` - Project tasks and development tracking

## Public Assets (`public/`)

- Favicon files in multiple sizes (16x16 to 512x512)
- Apple touch icons for iOS devices
- Android chrome icons (192x192, 512x512)
- Microsoft tile icons for Windows
- Convex logo files (black and white variants)
- SVG favicon with checkmark design

## Current Version: 1.8.3 (October 16, 2025)

### Latest Features (v1.8.3)

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
- Dark/light themes with CSS variables
- Date-based organization with custom labels
- Resizable sidebar (200px - 500px)
- Mobile-optimized with auto-hide and overlay
- Keyboard shortcuts (Enter, Shift+Enter, Cmd/Ctrl+K, Escape)
- WorkOS AuthKit integration (ready to enable)
