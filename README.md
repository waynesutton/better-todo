# better todo - The open-source modern todo app for developers and busy people with convex and no ai assistants

An open source, real-time open-source to-do list that never falls out of sync — built on Convex.

**Live Demo**: [better-todo.co](https://better-todo.co)

[![Netlify Status](https://api.netlify.com/api/v1/badges/853e020c-ce69-4cac-9099-05bcad891445/deploy-status)](https://app.netlify.com/projects/betterdone/deploys)

## Features

### Core Functionality

- **User authentication** with Clerk - secure login/logout with private user data
- **Customizable todo text font size** - personalize todo text size with 6 options (authenticated users only)
- **Real-time synchronization** across browsers using Convex
- **Notion-style inline input** - type directly to add todos (no button needed)
- **Daily notes section** with line numbers, Edit/Preview tabs, and syntax-highlighted code blocks
- **Full-page notes** - dedicated workspace for each date with Chrome-style tabs, line numbers, markdown support, and instant loading with Convex real-time sync
- **Move notes to projects** - organize full-page notes in project folders, decoupled from dates
- **Smart keyboard shortcuts**: Enter for new lines, Shift+Enter to create/save
- **Drag and drop** todo reordering with intuitive handles
- **Daily organization** with date-based views
- **Custom date labels** - rename dates with any text while preserving chronological order
- **Auto-archive** - checking todos automatically archives them
- **Bulk actions** - archive or delete all active todos at once with confirmation
- **Copy todos between dates** - move tasks to tomorrow, previous day, next day, or custom dates
- **Full-text search** - search across all todos and notes with keyboard shortcuts (Cmd/Ctrl+K)
- **Code block syntax highlighting** - Cursor Dark Theme colors for JavaScript, TypeScript, CSS, HTML, JSON, Python, Go, Rust, and more
- **Multiple notes per date** with drag-and-drop reordering and individual titles
- **Archive dates** - hide completed days while preserving data
- **Todo count badges** - see uncompleted todo counts next to each date in sidebar
- **Pin todos** - pin important todos with visual pin icons and sort them to the top
- **Custom projects** - organize dates into collapsible projects with custom names
- **Auto-grouped months** - completed months automatically group into collapsible sections
- **Pomodoro timer** - built-in productivity timer with duration toggle (25-minute focus sessions or 90-minute flow state sessions), sound notifications, and rotating completion sounds
- **Unsplash background images** - Optional beautiful nature images in Pomodoro full-screen mode with glass morphism overlay
- **Progressive Web App** - install on iOS or Android for native app experience with offline support

### UI/UX

- **Resizable sidebar** - drag to adjust width (200px - 500px)
- **Collapsible sidebar** - compact date view (MM/DD format) with 60px width
- **Four theme options** - Dark, Light, Tan, and Cloud with smooth transitions
  - Dark mode: Sublime Text-inspired dark theme
  - Light mode: Apple Notes-inspired clean theme
  - Tan mode: Warm document-focused theme for eye strain reduction
  - Cloud mode: Minimal grayscale theme for distraction-free focus
- **Sharp font rendering** - optimized text display across all browsers and devices
- **Mobile-optimized** with auto-hide sidebar and touch-friendly interface
  - Visible add button ("+") on mobile devices for easy todo creation
  - Touch-optimized button sizes and spacing
  - Simplified interface for small screens
  - iOS splash screen for app-like experience when installed
- **Clean, minimal design** with no boxes or borders around items
- **Native spell check** enabled (Grammarly disabled for better performance)
- **Custom font sizing** with CSS variables for easy customization
- **Custom confirmation dialogs** matching site design (no browser defaults)
- **Logged out demo mode** - Try creating up to 3 todos without signing up (data saved locally, lost on refresh)
- **Feature showcase** - Welcome screen for unauthenticated users explaining app features

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Convex** - Real-time database and backend
- **Clerk** - Authentication (fully implemented)
- **@dnd-kit** - Smooth drag and drop
- **date-fns** - Date manipulation and formatting
- **lucide-react** - Clean, consistent icons
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support

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
- Set up Clerk authentication automatically (no manual configuration needed)
- Generate environment variables in `.env.local`
- Configure JWT authentication with proper token templates
- Set up production deployment configuration

3. Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### First Run

When you run `npm run dev` for the first time, the Convex CLI will automatically:

- Create a Clerk application if you don't have one
- Set up authentication environments for your deployments
- Configure redirect URIs and CORS settings
- Store API keys securely
- Set up JWT authentication with proper token templates

You'll be able to sign up and sign in with Clerk. Once authenticated, you'll have your own private todo and notes data.

## Usage

### Authentication

- **Sign in required** - Click the login icon in the sidebar to authenticate with Clerk
- **Private data** - Each user has their own private todos and notes (completely isolated)
- **Theme-aware icons** - Login/user icons automatically switch between dark, light, and tan variants
- **Sign out** - Click your profile icon in the sidebar to sign out
- **First-time users** - You'll see a "Sign In Required" modal when trying to create todos/notes
- **Automatic user storage** - Your profile data is automatically saved to the database on first login
- **Secure JWT tokens** - Authentication uses industry-standard JWT tokens with proper validation
- **Demo mode for logged out users** - Try creating up to 3 todos without signing up (data saved locally, lost on refresh)
- **Feature showcase** - Welcome screen for unauthenticated users explaining app features and benefits

### Creating Todos

- **Type directly** - just start typing to add a todo (Notion-style)
- **Press Enter** - add new lines within your todo for multi-line content
- **Press Shift+Enter** (desktop) or tap the **+ button** (mobile) - create the todo
- Todos display as plain text for a clean, distraction-free experience

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
- **Full markdown support** - Write markdown naturally (bold, italic, headers, lists, links, tables, blockquotes)
- **No markdown wrapper needed** - Just write markdown and it renders automatically
- **Code blocks** - Use ```language for syntax highlighting with Cursor Dark Theme colors
- **Supported languages** - CSS, JavaScript, TypeScript, HTML, JSON, Python, Go, Rust, and more
- **Line numbers** - code editor style line numbers on the left (not copied with text)
- **Custom titles** - give each note its own name
- **Collapsible notes** - expand/collapse individual notes
- **Drag and drop** - reorder notes as needed
- **Copy button** - copy note content to clipboard
- **Delete button** - remove notes with confirmation
- **Auto-saves** when you type (debounced for smooth experience)

### Full-Page Notes

- **Dedicated workspace** for each date with Chrome-style tabbed interface
- **FileText icon** in header to access full-page notes view
- **FilePlus icon** to create new notes within full-page notes page
- **Checkbox icon** to return to todos from full-page notes
- **Unlimited notes per date** with individual titles
- **Single-click to edit** - automatic edit mode for immediate typing
- **Double-click tab titles** to rename notes
- **Line numbers** that scale with font size (code editor style)
- **Full markdown support** with syntax highlighting for code blocks
- **Auto-save** on content changes
- **Copy button** for note content
- **X button** closes tab without deleting note
- **Notes folder in sidebar** shows all note titles for each date
- **Click sidebar note title** to open that note
- **Active state indicator** for currently selected notes
- **Three-dot menu** for rename, delete, move to project, and move to date
- **Move to projects** - organize notes in project folders (decoupled from dates)
- **Move to dates** - move notes from projects back to any date
- **Note count badges** show on project folders when they contain notes
- **Real-time sync** across devices

### Organizing by Date

- **Click any date** in the sidebar to view that day's todos
- **Collapse sidebar** - click panel icon next to app name for compact MM/DD view
- **Custom labels** - add text labels to dates (e.g., "Sprint Planning", "Weekly Review")
  - Labels display instead of dates but preserve chronological order
  - Add, edit, or remove labels via the three-dot menu
- **Custom projects** - organize dates into collapsible projects with custom names
  - Create projects via "+ Add Project" button (authenticated users only)
  - Add dates to projects via three-dot menu "Add to Project..." option
  - Projects with dates appear between active dates and archived section
  - "Manage Projects" section below archived list shows all projects (including empty ones)
  - Rename, archive, and delete projects via three-dot menu in each section
  - Empty projects can be deleted from "Manage Projects" section
  - Full-page notes can be moved to projects and appear under project folders in sidebar
  - Note count badges show on project folders when they contain full-page notes
- **Auto-grouped months** - completed months automatically group into collapsible sections
  - Named by month and year (e.g., "January 2025")
  - Only displays after a full month has passed
  - Archive, unarchive, and delete month groups
- **Three-dot menu** next to dates with options to:
  - Add/edit/remove custom date label
  - Add to Project (when projects exist) or Remove from Project
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
- **Authentication required** - Search only works for signed-in users

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

### Pomodoro Timer

- **Built-in productivity timer** accessible from the timer icon in header
- **Duration toggle** - Switch between 25-minute focus sessions and 90-minute flow state sessions
  - Waves icon to switch from 25 minutes to 90-minute flow state mode
  - Clock icon to switch back from 90 minutes to 25-minute focus mode
  - Toggle button appears next to Start button (only visible when timer is idle)
  - All timer features work identically for both durations
- **Sound notifications** for timer events:
  - Start sound plays when timer begins (only if user started in current session)
  - 5-second countdown sound plays when 5 seconds remain (only if user started in current session)
  - Completion sounds rotate through 11 different sounds (synth, epicboom, epci, deep, horns, computer, flute, pause, whoa, waves, done)
  - Pause sound plays when timer is paused
  - Sounds never play automatically when timer session is restored from previous page load
- **Mute/unmute controls** - toggle sound notifications on or off
- **Full-screen completion mode** with "keep cooking!" message
- **Modal and full-screen controls** - start, pause, resume, reset, and stop
- **Visual countdown** displays time remaining in MM:SS format
- **Keyboard shortcuts** - ESC to close full-screen, f to enter full-screen
- **Session persistence** - timer state syncs across tabs via Convex
- **Unsplash background images** - Optional beautiful nature images in full-screen mode
  - Random search queries: "landscape nature", "cities", "ocean", "sky"
  - Apple-style glass morphism overlay when background is enabled
  - Toggle button to show/hide background images
  - New image fetches each time full-screen mode opens

### Themes

Toggle between dark, light, tan, and cloud modes using the **half-moon icon** at the bottom of the sidebar (above the login link). The login/user icons automatically switch between variants based on the current theme.

**Theme Options:**

- **Dark Mode** - Sublime Text-inspired dark theme (#2E3842 background) with blue accents (#4a9eff)
- **Light Mode** - Apple Notes-inspired clean theme (#ffffff background) with blue accents (#007aff)
- **Tan Mode** - Warm document-focused theme (#faf8f5 background) with orange accents (#EB5601) for eye strain reduction
- **Cloud Mode** - Minimal grayscale theme (#EDEDED background) with dark gray accents (#171717) for distraction-free focus

### Install as App (PWA)

Better Todo is installable as a native app on iOS and Android:

**iOS:**

- Open in Safari
- Tap the **Share** button at the bottom
- Tap **Add to Home Screen**
- Name the app and tap **Add**
- App launches with native app feel and custom splash screen

**Android:**

- Open in Chrome or any supported browser
- Tap the **⋮** (three dots) menu
- Tap **Install app** or **Add to Home Screen**
- Confirm installation
- App launches with native app experience

Once installed, the app runs standalone without browser UI for a cleaner experience.

### Font Size Customization

Authenticated users can customize the font size of todo text:

- Press **?** to open the Keyboard Shortcuts modal
- Scroll to the **Todo Text Font Size** section at the bottom
- Choose from 6 size options: 10px, 12px (default), 14px, 16px, 18px, 24px
- Preview shows how your todo text will look
- Setting persists across sessions and devices
- Works in both light and dark themes

## Project Structure

```
better-todo/
├── convex/                    # Backend functions and schema
│   ├── schema.ts              # Database schema (todos + notes + users + userPreferences + folders + monthGroups tables)
│   ├── auth.config.ts         # Clerk JWT authentication configuration
│   ├── todos.ts               # Todo queries and mutations
│   ├── notes.ts               # Notes queries and mutations
│   ├── users.ts               # User management and preferences functions
│   ├── dates.ts               # Date operations and queries
│   ├── dateLabels.ts          # Custom date labels
│   ├── archivedDates.ts       # Archived dates
│   ├── folders.ts             # Custom project management
│   ├── monthGroups.ts         # Auto-grouped month management
│   ├── pomodoro.ts            # Pomodoro timer functionality
│   ├── unsplash.ts            # Unsplash background image fetching
│   ├── search.ts              # Search functionality
│   └── http.ts                # HTTP routes for auth
├── src/
│   ├── components/            # React components
│   │   ├── TodoItem.tsx       # Individual todo component
│   │   ├── TodoList.tsx       # Todo list with drag and drop
│   │   ├── Sidebar.tsx        # Resizable sidebar with dates, projects, and month groups
│   │   ├── NotesSection.tsx   # Notes with line numbers
│   │   ├── ArchiveSection.tsx # Archived todos
│   │   ├── SearchModal.tsx    # Search modal
│   │   ├── PomodoroTimer.tsx  # Pomodoro productivity timer with mute controls
│   │   ├── ConfirmDialog.tsx  # Confirmation dialogs
│   │   └── ui/
│   │       └── tooltip.tsx    # Reusable tooltip component
│   ├── pages/                 # Page components
│   │   ├── Launch.tsx         # Launch/about page with feature showcase
│   │   └── NotFound.tsx       # 404 Not Found page
│   ├── context/
│   │   └── ThemeContext.tsx   # Theme management
│   ├── styles/
│   │   └── global.css         # CSS with variables
│   ├── lib/
│   │   └── localData.ts       # Ephemeral in-memory storage for unsigned users
│   ├── App.tsx                # Main layout and state with routing
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
  --font-todo: 15px; /* Todos and notes */
  --font-archive: 13px; /* Archive section */
}
```

### Theme Colors

The app uses CSS variables for easy theming. Key colors:

**Dark Mode:**

- `--accent: #4a9eff` - Active date and focus color
- `--bg-primary: #2e3842` - Main background
- `--bg-secondary: #1e2429` - Input backgrounds
- `--text-primary: #e0e0e0` - Main text
- `--text-secondary: #9ca3af` - Muted text

**Light Mode:**

- `--accent: #007aff` - Active date and focus color
- `--bg-primary: #f5f5f7` - Main background
- `--bg-secondary: #ffffff` - Input backgrounds
- `--text-primary: #1d1d1f` - Main text
- `--text-secondary: #6e6e73` - Muted text

**Tan Mode:**

- `--accent: #8b7355` - General accent color
- `--primary-accent: #EB5601` - Primary action color (checkboxes, buttons, active states)
- `--bg-primary: #faf8f5` - Warm tan background
- `--bg-secondary: #f5f3f0` - Slightly darker tan
- `--text-primary: #1a1a1a` - Soft black text
- `--text-secondary: #6b6b6b` - Warm gray text

**Cloud Mode:**

- `--accent: #e8e8e8` - General accent color
- `--primary-accent: #171717` - Primary action color (checkboxes, buttons, active states)
- `--bg-primary: #ededed` - Light gray background
- `--bg-secondary: #e8e8e8` - Slightly darker gray
- `--text-primary: #171717` - Near black text
- `--text-secondary: #171717` - Consistent dark gray text

## Development

### Running Tests

```bash
npm run lint
```

### Building for Production

```bash
npm run build
```

### Deploying to Netlify

The app is configured for easy deployment to Netlify with Clerk authentication integration. The Convex backend is automatically deployed when you push changes.

For production deployment:

1. Deploy Convex backend:

```bash
npx convex deploy
```

2. Connect your repository to Netlify:
   - Sign up for a free account at [netlify.com](https://netlify.com)
   - Click "Add new site" and connect your GitHub repository
   - Netlify will auto-detect the build settings

3. Configure build settings:
   - Build command: `npx convex deploy --cmd 'npm run build'`
   - Publish directory: `dist`

4. Add environment variables in Netlify:
   - Go to Site settings > Environment variables
   - Add these required variables:
     ```
     VITE_CONVEX_URL=https://your-deployment.convex.cloud
     VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXX
     ```
   - For Unsplash background images in Pomodoro timer (optional):
     - Add `UNSPLASH_ACCESS_KEY` to your Convex deployment environment variables
     - Get your free access key from [Unsplash Developers](https://unsplash.com/developers)
     - This enables beautiful nature backgrounds in Pomodoro full-screen mode

5. Configure Clerk Dashboard:
   - Add production redirect URI: `https://your-domain.netlify.app`
   - Add production CORS origin: `https://your-domain.netlify.app`

6. Deploy:
   - Push to your repository and Netlify will automatically build and deploy
   - Your app will be live at `your-site-name.netlify.app`

The app supports continuous deployment, so every push to your main branch will trigger a new deployment.

**Note:** All environment variables prefixed with `VITE_` are exposed to the frontend during build time. Never include sensitive information like API keys in these variables.

**Unsplash Integration:** The `UNSPLASH_ACCESS_KEY` is stored securely in your Convex deployment environment variables (not exposed to frontend) and is only used server-side for fetching background images.

## Keyboard Shortcuts

- **Enter** - Add new line in todo/note, confirm delete dialogs
- **Shift+Enter** - Create/save todo, save note edit
- **Cmd/Ctrl+K** - Open search modal
- **Escape** - Close search modal, cancel delete dialogs
- **Arrow keys** - Navigate search results
- **Click away** - Auto-save changes
- **Tab** - Navigate between elements
- **?** - Show keyboard shortcuts modal with code block syntax reference

## Tips & Tricks

1. **Authentication**: Sign in once and your data stays private and synced across all devices. Unsigned users can use the app with local storage (data lost on refresh)
2. **Multi-line todos**: Use Enter to write detailed notes within a single todo item
3. **Multiple notes**: Add unlimited notes per date with custom titles for different topics
4. **Quick navigation**: Click dates in sidebar to jump between days, use Cmd/Ctrl+K to search
5. **Custom labels**: Add meaningful names to dates like "Team Meeting" or "Project Launch"
6. **Bulk actions**: Use Archive All/Delete All buttons at the bottom to manage multiple todos
7. **Line numbers**: Notes display line numbers like a code editor (they won't copy with text)
8. **Bulk move**: Use the date menu (three dots) to copy all todos to another date
9. **Compact sidebar**: Click panel icon to collapse sidebar for more workspace
10. **Archive dates**: Hide completed days to keep sidebar clean while preserving data
11. **Mobile**: Sidebar auto-hides on mobile - tap the panel icon to show/hide, use + button to add todos
12. **Theme switching**: Login/user icons automatically adapt to your current theme (dark/light)
13. **Code blocks**: Press ? to see all supported language syntax for code highlighting
14. **Syntax highlighting**: Use `css, `js, `ts, `html, `json, `py, `go, `rust for proper colorization
15. **Font size**: Press ? and scroll down to customize todo text font size (authenticated users only)

## Contributing

This is an open source project and contributions are welcome! Here's how you can help:

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** and test thoroughly
3. **Commit your changes** with clear, descriptive messages
4. **Push to your fork** and submit a Pull Request
5. **Describe your changes** in the PR description

### Areas for contribution:

- Bug fixes and improvements
- New features and enhancements
- Documentation updates
- UI/UX improvements
- Performance optimizations

Please feel free to open issues for bugs, feature requests, or questions.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you find this project helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation
- 🤝 Contributing code

Built with ❤️ using Convex, React, and Clerk
