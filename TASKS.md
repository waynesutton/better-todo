# Better Todo Implementation Tasks

A real-time markdown todo app with Notion-style input, daily notes, and Convex backend.

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

## Future Tasks (v2.0+)

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
- [ ] Kanban board view

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
- `src/components/TodoItem.tsx` - Individual todo with markdown and actions
- `src/components/TodoList.tsx` - Todo list with inline input and DnD
- `src/components/Sidebar.tsx` - Resizable sidebar with date navigation
- `src/components/NotesSection.tsx` - Daily notes with Edit/Preview tabs
- `src/components/ArchiveSection.tsx` - Collapsed archive with bulk actions
- `src/components/SearchModal.tsx` - Full-text search modal
- `src/components/ConfirmDialog.tsx` - Custom confirmation dialogs
- `src/context/ThemeContext.tsx` - Dark/light theme management
- `src/styles/global.css` - CSS variables and theming
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
