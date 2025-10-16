# Better todo

A real-time markdown todo app with Notion-style input, daily notes, and Convex backend. Features beautiful dark mode (Sublime Text style) and light mode (Apple Notes style).

## Features

### Core Functionality

- **Real-time synchronization** across browsers using Convex
- **Notion-style inline input** - type directly to add todos (no button needed)
- **Daily notes section** with line numbers, Edit/Preview tabs, and code block support
- **Smart keyboard shortcuts**: Enter for new lines, Shift+Enter to create/save
- **Drag and drop** todo reordering with intuitive handles
- **Daily organization** with date-based views
- **Custom date labels** - rename dates with any text while preserving chronological order
- **Auto-archive** - checking todos automatically archives them
- **Bulk actions** - archive or delete all active todos at once with confirmation
- **Copy todos between dates** - move tasks to tomorrow, previous day, next day, or custom dates
- **Full-text search** - search across all todos and notes with keyboard shortcuts (Cmd/Ctrl+K)
- **Multiple notes per date** with drag-and-drop reordering and individual titles
- **Archive dates** - hide completed days while preserving data

### UI/UX

- **Resizable sidebar** - drag to adjust width (200px - 500px)
- **Collapsible sidebar** - compact date view (MM/DD format) with 60px width
- **Dark and light themes** with smooth transitions
- **Mobile-optimized** with auto-hide sidebar and touch-friendly interface
  - Visible add button ("+") on mobile devices for easy todo creation
  - Touch-optimized button sizes and spacing
  - Simplified interface for small screens
- **Clean, minimal design** with no boxes or borders around items
- **Native spell check** enabled (Grammarly disabled for better performance)
- **Custom font sizing** with CSS variables for easy customization
- **Custom confirmation dialogs** matching site design (no browser defaults)

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Convex** - Real-time database and backend
- **WorkOS AuthKit** - Authentication (ready to enable)
- **react-markdown** - Markdown rendering with full support
- **react-syntax-highlighter** - Beautiful code highlighting
- **@dnd-kit** - Smooth drag and drop
- **date-fns** - Date manipulation and formatting
- **lucide-react** - Clean, consistent icons

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up Convex:

```bash
npx convex dev
```

This will:

- Create a new Convex project
- Set up WorkOS AuthKit automatically (no manual configuration needed)
- Generate environment variables in `.env.local`

3. Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### First Run

When you run `npm run dev` for the first time, the Convex CLI will automatically:

- Create a WorkOS team if you don't have one
- Set up AuthKit environments for your deployments
- Configure redirect URIs and CORS settings
- Store API keys securely

You'll receive an email invitation to set up your WorkOS account.

## Usage

### Creating Todos

- **Type directly** - just start typing to add a todo (Notion-style)
- **Press Enter** - add new lines within your todo for multi-line content
- **Press Shift+Enter** (desktop) or tap the **+ button** (mobile) - create the todo
- Todos display as plain text (markdown available in notes section)

### Editing Todos

- **Click any todo** to edit it
- **Press Enter** to add new lines
- **Press Shift+Enter** or click away to save
- **Drag the handle** (⋮⋮) to reorder
- **Click three dots** (⋯) to:
  - Move to tomorrow
  - Move to previous/next day
  - Delete the todo (with confirmation)

### Daily Notes

- **Add unlimited notes** per date with the plus button
- **Line numbers** - code editor style line numbers on the left (not copied with text)
- **Custom titles** - give each note its own name
- **Collapsible notes** - expand/collapse individual notes
- **Drag and drop** - reorder notes as needed
- **Copy button** - copy note content to clipboard
- **Delete button** - remove notes with confirmation
- **Auto-saves** when you type (debounced for smooth experience)

### Organizing by Date

- **Click any date** in the sidebar to view that day's todos
- **Collapse sidebar** - click panel icon next to app name for compact MM/DD view
- **Custom labels** - add text labels to dates (e.g., "Sprint Planning", "Weekly Review")
  - Labels display instead of dates but preserve chronological order
  - Add, edit, or remove labels via the three-dot menu
- **Three-dot menu** next to dates with options to:
  - Add/edit/remove custom date label
  - Copy all non-archived todos to tomorrow, previous/next day, or custom date
  - Archive the entire date
  - Delete the date and all its content (with confirmation)
- **Archive dates** - hide completed days in collapsible archived section

### Archive

- **Check any todo** to automatically archive it
- **Uncheck archived todos** to restore them to the active list
- **Archive section** shows all completed items with count
- **Delete individual archived todos** - hover to reveal X button
- **Delete All button** - remove all archived todos at once (with confirmation)
- **Move archived items** to other dates if needed
- **Auto-collapses** when you add new todos

### Search

- **Click search icon** or press **Cmd/Ctrl+K** to open search modal
- **Real-time search** across all todos and notes
- **Keyboard navigation** with arrow keys
- **Press Enter** to navigate to selected result
- **Search term highlighting** in results
- **Result badges** show type (Todo/Note), date, and status

### Bulk Actions

At the bottom of each date's todo list:

- **Archive All (active todos)** - move all active todos to archive with one click
- **Delete All (active todos)** - permanently delete all active todos
- Both actions require confirmation showing the count of affected todos
- Buttons use color coding: mint green for archive, red for delete

### Sidebar

- **Drag the edge** to resize (200px - 500px)
- **Click the panel icon** in header to collapse to compact view (60px)
- **Collapsed view** shows dates in MM/DD format with tooltips
- **Auto-collapses** on mobile for more space
- **Click overlay** on mobile to close sidebar
- **Scrollable dates** with custom styled scrollbar

### Themes

Toggle between dark and light modes using the **half-moon icon** at the bottom of the sidebar (above the login link).

## Project Structure

```
better-todo/
├── convex/                    # Backend functions and schema
│   ├── schema.ts              # Database schema (todos + notes tables)
│   ├── todos.ts               # Todo queries and mutations
│   ├── notes.ts               # Notes queries and mutations
│   ├── auth.config.ts         # WorkOS AuthKit configuration
│   └── http.ts                # HTTP routes for auth
├── src/
│   ├── components/            # React components
│   │   ├── TodoItem.tsx       # Individual todo with markdown
│   │   ├── TodoList.tsx       # Todo list with DnD
│   │   ├── Sidebar.tsx        # Resizable sidebar
│   │   ├── NotesSection.tsx   # Notes with preview
│   │   └── ArchiveSection.tsx # Archived todos
│   ├── context/
│   │   └── ThemeContext.tsx   # Theme management
│   ├── styles/
│   │   └── global.css         # CSS with variables
│   ├── App.tsx                # Main layout and state
│   └── main.tsx               # Entry point
└── package.json
```

## Customization

### Font Sizes

Edit CSS variables in `src/styles/global.css`:

```css
:root[data-theme="dark"] {
  --font-app-name: 16px; /* App title */
  --font-sidebar: 13px; /* Sidebar dates */
  --font-todo: 14px; /* Todos and notes */
  --font-archive: 13px; /* Archive section */
}
```

### Theme Colors

The app uses CSS variables for easy theming. Key colors:

- `--accent: #56B5DB` - Active date and focus color
- `--bg-primary` - Main background
- `--bg-secondary` - Input backgrounds
- `--text-primary` - Main text
- `--text-secondary` - Muted text

## Development

### Running Tests

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

### Deploying

The app can be deployed to any static hosting service. The Convex backend is automatically deployed when you push changes.

For production deployment:

1. Deploy Convex backend:

```bash
npx convex deploy
```

2. Build frontend:

```bash
npm run build
```

3. Deploy the `dist` folder to your hosting service

## Keyboard Shortcuts

- **Enter** - Add new line in todo/note, confirm delete dialogs
- **Shift+Enter** - Create/save todo, save note edit
- **Cmd/Ctrl+K** - Open search modal
- **Escape** - Close search modal, cancel delete dialogs
- **Arrow keys** - Navigate search results
- **Click away** - Auto-save changes
- **Tab** - Navigate between elements

## Tips & Tricks

1. **Multi-line todos**: Use Enter to write detailed notes within a single todo item
2. **Paste lists**: Copy markdown lists and paste - they'll automatically create multiple todos
3. **Multiple notes**: Add unlimited notes per date with custom titles for different topics
4. **Quick navigation**: Click dates in sidebar to jump between days, use Cmd/Ctrl+K to search
5. **Custom labels**: Add meaningful names to dates like "Team Meeting" or "Project Launch"
6. **Bulk actions**: Use Archive All/Delete All buttons at the bottom to manage multiple todos
7. **Line numbers**: Notes display line numbers like a code editor (they won't copy with text)
8. **Bulk move**: Use the date menu (three dots) to copy all todos to another date
9. **Compact sidebar**: Click panel icon to collapse sidebar for more workspace
10. **Archive dates**: Hide completed days to keep sidebar clean while preserving data
11. **Mobile**: Sidebar auto-hides on mobile - tap the panel icon to show/hide, use + button to add todos

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
# better-todo
