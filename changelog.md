# Changelog

All notable changes to Better Todo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.2.6] - 2025-01-23

### Added

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

### Backend Changes

- **Schema update** (`convex/schema.ts`)
  - Added `backgroundImageUrl` optional field to `pomodoroSessions` table
- **New Convex file** (`convex/unsplash.ts`)
  - `fetchBackgroundImage` action: fetches random images from Unsplash API
  - Separated into its own file with `"use node"` directive (actions only)
  - Secure access to `UNSPLASH_ACCESS_KEY` environment variable
- **Updated Convex functions** (`convex/pomodoro.ts`)
  - `updateBackgroundImage` mutation: updates session with image URL
  - Removed `"use node"` directive (mutations/queries run in V8, not Node.js)

### Frontend Changes

- **PomodoroTimer component** (`src/components/PomodoroTimer.tsx`)
  - Added `showBackgroundImage` state (defaults to false)
  - Added `hasFetchedImage` ref to prevent duplicate fetches
  - Imported `ImageIcon` from `@radix-ui/react-icons`
  - Added `useAction` hook for `fetchBackgroundImage`
  - Image fetches when entering full-screen mode
  - Toggle handler for showing/hiding background
  - Conditional rendering of background image container
  - Dynamic className for glass effect styling
  - Image button only shows when image URL is available

### Styling Changes

- **Global CSS** (`src/styles/global.css`)
  - `.pomodoro-fullscreen-background`: full-screen image container with cover fit
  - `.pomodoro-fullscreen-content.with-glass-effect`: glass morphism overlay
  - Dark mode specific glass styling with adjusted transparency
  - Text shadows on message and timer for readability over images
  - Glassmorphic button styling with backdrop blur
  - Responsive adjustments for tablets (768px) and mobile (480px)
    - Smaller border-radius and adjusted padding on smaller screens

### Configuration Changes

- **TypeScript config** (`tsconfig.json`, `convex/tsconfig.json`)
  - Added `"node"` to types in root tsconfig for Node.js type support
  - Added `"convex"` to exclude list in root tsconfig
  - Added `"types": ["node"]` to Convex tsconfig for action support

### Notes

- To change background image categories, update the `queries` array in `convex/unsplash.ts` line 15
- Requires `UNSPLASH_ACCESS_KEY` environment variable in Convex dashboard
- Uses Unsplash `urls.regular` (1080px) for optimal quality and performance
- Node.js actions must be in separate files from V8 queries/mutations

## [2.2.5] - 2025-10-23

### Fixed

- **Menu button alignment consistency** - Fixed three-dot menu button alignment across all todo states
  - Menu buttons now properly align to the right edge of todos in all states (default, hover, focused)
  - Used pseudo-element approach to constrain focused background to 90% width while keeping menu button aligned
  - Added `margin-left: auto` to `.todo-menu` to ensure right-edge alignment
  - Prevents menu button from shifting left when todo item is focused or hovered
  - Documentation added in `prds/menu-button-alignment-fix.md` explaining the solution

### Changed

- **Menu button hover styling** - Updated hover background colors to match app theme
  - Light mode: `var(--bg-secondary)` (matches menu dropdown items)
  - Dark mode: `var(--bg-secondary)` (matches menu dropdown items)
  - Consistent visual feedback across all interactive elements

## [2.2.4] - 2025-01-23

### Added

- **Cursor rule for preventing write conflicts** in Convex with React
  - Comprehensive guide located at `.cursor/rules/convex-write-conflicts.mdc`
  - **Backend patterns:**
    - Idempotent mutations with early returns
    - Patch directly without reading first (most common fix)
    - Minimal data reads with indexed queries
    - Parallel updates with Promise.all
    - Event records pattern for high-frequency counters
    - Authorization patterns (user-scoped queries and internal mutations)
  - **Frontend patterns:**
    - Refs for tracking one-time calls
    - Debouncing rapid inputs (300-500ms recommended)
    - Mutation status checks before calling
    - Avoiding loops and batching updates
  - Schema design best practices to minimize conflicts
  - Monitoring section for dashboard insights
  - Complete checklists for both backend and frontend
  - Priority actions summary with key takeaways
  - References Convex documentation on optimistic concurrency control
  - Applicable to this app and all future Convex projects

### Changed

- **Note creation focus behavior** - Cursor now placed in content textarea instead of title input
  - When using Shift+ keyboard shortcut or clicking "Add Note" button, cursor focuses content area
  - Note automatically enters edit mode and expands if collapsed
  - Title remains "Untitled" by default, allowing immediate content entry
  - Improved workflow for quick note-taking

## [2.2.3] - 2025-01-23

### Fixed

- **Pomodoro timer write conflict issue** resolved
  - Added idempotency check in `completePomodoro` mutation to prevent duplicate updates
  - Mutation now exits early if session is already completed or doesn't exist
  - Added `hasCalledComplete` ref in component to track completion calls per session
  - Prevents multiple concurrent calls to `completePomodoro` that were causing database write conflicts
  - Improved reliability when timer completes or during rapid state changes

## [2.2.2] - 2025-01-22

### Added

- **Pomodoro timer audio notifications** with MP3 file-based sounds
  - Start sound (`timer-start.mp3`) plays once when timer begins at full 25 minutes
  - 5-second countdown sound (`5-second-coutdown.mp3`) plays when 5 seconds remain
  - Completion sounds rotate through 11 different MP3 files:
    - end-synth.mp3, end-epicboom.mp3, end-epci.mp3, end-deep.mp3, end-horns.mp3
    - end-computer.mp3, end-flute.mp3, pause.mp3, end-whoa.mp3, end-waves.mp3, done.mp3
  - Pause sound (`pause.mp3`) plays when user clicks pause button in modal or full-screen mode
  - All sounds play at 70% volume for comfortable listening
  - Replaced Web Audio API oscillators with simple MP3 file loading
  - Sound state properly resets on timer stop/reset
  - Each sound plays only once per trigger event

### Changed

- **Audio system replaced** - Switched from Web Audio API to MP3 files
  - Removed `audioContextRef` and oscillator-based sound generation
  - Added refs for tracking sound playback state (`hasPlayedStartSound`, `hasPlayedCountdownSound`)
  - Cleaner, more maintainable audio implementation
  - Better quality sounds with actual audio files

## [2.2.1] - 2025-01-21

### Added

- **Cursor Dark Theme syntax highlighting** for code blocks in notes
  - Exact color matching with Cursor editor's Dark+ theme
  - Custom CSS rules with `!important` to override default styles
  - Theme-aware colors for both dark and light modes
  - Comprehensive token support (comments, keywords, strings, functions, variables, types, etc.)
  - Enhanced placeholder text showing all supported languages
  - **Code Blocks section in Keyboard Shortcuts modal**:
    - Copyable language syntax buttons for CSS, JavaScript, TypeScript, HTML, JSON, Python, Go, Rust
    - Alternative syntax options (e.g., `js vs `javascript)
    - Click-to-copy functionality with visual feedback
    - Mobile-responsive grid layout
    - Accessible via ? key or keyboard shortcuts button

### Changed

- **Updated syntax highlighting implementation**:
  - Replaced oneDark/oneLight themes with custom Cursor Dark Theme colors
  - Added comprehensive CSS token styling for accurate color reproduction
  - Improved language detection and tokenization
  - Enhanced user experience with better color contrast and readability

## [2.2.0] - 2025-01-21

### Added

- **Code syntax highlighting in notes** with markdown-style code blocks
  - Write code blocks using triple backticks with language identifiers (e.g., ````js`)
  - Supports JavaScript, TypeScript, CSS, HTML, JSON, Python, Go, and Rust
  - Display mode shows syntax-highlighted code with proper theme support
  - Edit mode provides plain textarea for writing markdown-style code blocks
  - Individual copy buttons for each code block
  - Copy all button copies entire note content as plain text
  - Click anywhere in display mode to enter edit mode
  - Edit button in note header for quick access
  - Line numbers in code blocks for easy reference
  - Theme-aware syntax highlighting (oneDark for dark mode, oneLight for light mode)
  - Clean code block headers showing language name
  - Security-first approach with plain text storage and client-side rendering only

## [2.1.3] - 2025-01-21

### Added

- **Improved subtask creation workflow**
  - New subtasks now start empty instead of pre-filled with "New subtask" text
  - Empty subtasks automatically enter edit mode for immediate typing
  - Keyboard shortcut "s" creates a subtask for the currently focused/selected todo
  - Auto-focus on new empty subtasks for faster workflow

- **Keyboard shortcut to open todo menu**
  - Keyboard shortcut "m" opens the context menu for the currently focused/selected todo
  - Provides quick access to all todo actions without using mouse
  - Menu opens at the proper position for the selected todo

### Changed

- Updated keyboard shortcuts help modal to include "s" and "m" shortcuts

## [2.1.2] - 2025-01-21

### Added

- **Todo count badges in sidebar**
  - Shows count of uncompleted todos next to each date in sidebar
  - Real-time sync - counts update automatically when todos are completed/uncompleted
  - Displays in all sections: active dates, folders, and month groups
  - Simple number display with theme-aware colors (no background box)

- **Pin icon for pinned todos**
  - Drawing pin filled icon from Radix UI appears before checkbox for pinned todos
  - Only shows on date pages (not in pinned section)
  - Uses theme-aware colors that adapt to light/dark mode
  - Clean visual indicator without borders or background

- **Pinned todos sorted to top**
  - Pinned todos automatically appear at the top of each date page
  - Maintains original order within pinned and unpinned groups
  - Consistent sorting across App.tsx and TodoList.tsx

### Fixed

- **Fixed keyboard shortcuts for all todos** - Keyboard shortcuts now work correctly for all todos, not just pinned ones
- Fixed index mismatch between keyboard navigation and rendered todos
- Arrow key navigation properly highlights the correct todo
- Space/e and p key shortcuts work on any highlighted todo
- Removed borders from pinned todos for cleaner appearance
- **Fixed archive section visibility** - Archive section now shows when folders or month groups are archived, not just dates
- **Fixed empty folders appearing in sidebar** - Folders without dates now hide from active view until dates are added
- **Fixed "Add to Folder..." menu option** - Menu option now appears even for newly created empty folders, allowing you to add dates to them
- **Fixed three-dot menu contrast in folders and archive** - Menu dropdowns now have better contrast and visibility when appearing over folders or archived sections in both light and dark modes
  - Changed dropdown background from secondary to primary background for better separation
  - Increased shadow from 0.15 to 0.25 opacity for more depth
  - Improved hover states with clearer backgrounds (#f0f0f0 in light mode)
  - Added specific danger item hover styling with subtle red tint
  - Applied same improvements to folder selector modals
  - Fixed opacity inheritance issue - removed opacity from parent containers so dropdowns render at full opacity
  - Date items now brighten on hover (0.7 to 0.9 opacity) for better interactivity
  - Three-dot buttons in folders now have proper opacity (0.6 normal, 1.0 on hover)
- **Fixed three-dot menu alignment for folders** - Menu buttons for folder headers now perfectly centered vertically using CSS transform, matching date menu button alignment
- **Updated folder hover highlight** - Folders now use light blue hover color (rgba(86, 181, 219, 0.15)) instead of grey to match date hover styling
  - Creates consistent visual language across all sidebar items
  - Light mode uses slightly lighter blue (0.1 opacity) for better contrast
  - Applied same light blue hover to regular date items for perfect consistency
- **Fixed folder rename modal positioning** - Rename folder input now appears above the folder section instead of below, preventing it from being clipped or appearing off-screen
- **Fixed folder menu behavior** - Three-dot menu now properly closes when clicking "Rename Folder" option, preventing menu from staying open during rename operation
- **Fixed three-dot menu alignment for folders** - Three-dot buttons now perfectly align with folder names by using full height alignment instead of transform-based centering
- **Added Manage Folders section** - New collapsible section below archived items shows all folders (including empty ones) for easy management
  - Shows folder name with date count badge (if folder has dates)
  - Provides access to rename, archive, and delete options for all folders
  - Allows users to delete empty folders that don't appear in main sidebar
  - Count badge shows number of non-archived folders
- **Improved unarchive date behavior** - When unarchiving a date that's inside a folder, the date is automatically removed from the folder and moved to active dates list
  - Matches the existing "Remove from Folder" behavior
  - Provides cleaner UX by eliminating extra step to remove from folder first
  - Date appears in main active dates section after unarchiving

## [2.1.1] - 2025-01-20

### Added

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

### Changed

- Keyboard shortcuts work more intelligently based on hover and typing state
- Todo hover tracking enables seamless keyboard navigation

### Fixed

- Added "Rename Folder" option to archived folders menu (was only available for active folders)
- Fixed three-dot menu positioning for folders and month groups - now properly displays on the right side of headers like the Archive section
- Fixed three-dot menu visibility on folders and month groups - now matches date items with proper colors in both dark and light modes
- Fixed "Add Folder" input positioning - now appears inline next to the "+ Add Folder" button instead of at the bottom of sidebar
- **Fixed subtasks not appearing on pinned page** - `getPinnedTodos` query now includes subtasks (children) of pinned todos, so you can now add and view subtasks for pinned todos on the pinned page
- **Fixed three-dot menu alignment** - All three-dot menu buttons now have consistent width (30px min-width) and alignment across todo pages, sidebar dates, folders, and month groups
- **Fixed subtask three-dot menu alignment** - Subtask menu buttons now align perfectly with parent todo menu buttons using negative margin compensation for the indentation

## [2.1.0] - 2025-01-20

### Added

- **Custom folders** for organizing dates
  - Create unlimited folders with custom names via "+ Add Folder" button
  - Collapsible folders with arrow icon and folder icon
  - Dates within folders are not grayed out (active state)
  - **Add dates to folders** via three-dot menu on any date
    - "Add to Folder..." shows list of available folders
    - Click folder to add date to it
    - "Remove from Folder" option when date is already in a folder
  - **Manage dates within folders** via three-dot menu
    - Remove dates from folders
    - Archive dates
    - Delete dates
    - Works for both active and archived folders
  - Rename folders via three-dot menu
  - Archive folders to hide from main view
  - Unarchive folders when needed
  - Delete folders and all associations
  - Three-dot menu for each folder (Rename, Archive, Delete)
  - Folders appear between active dates and archived section
  - Archived folders appear within the archived section
  - Mint green hover state on "Add Folder" button
  - Folder selector modal with clean, minimal design

- **Auto-group completed months** into collapsible toggles
  - Automatically groups dates from completed months (not current month)
  - Named by month and year (e.g., "January 2025")
  - Collapsible with arrow icon like folders
  - Archive month groups to hide from view
  - Unarchive month groups when needed
  - Delete month groups and all date associations
  - Three-dot menu for each month (Archive Month, Delete Month)
  - Only displays after a full month has passed
  - Month groups appear between active dates and folders
  - Archived month groups appear within the archived section

- **Delete all archived dates** functionality
  - Three-dot menu on archived section header
  - Permanently deletes all archived dates at once
  - Confirmation dialog shows count of archived dates
  - Clean, danger-styled confirmation

### Changed

- Active dates now exclude dates in folders or month groups
- Archived section now includes archived folders and month groups
- ESC key now closes folder and month group menus and inputs

## [2.0.1] - 2025-01-18

### Fixed

- **Mobile UserProfile modal responsiveness** - Fixed text cutoff and signout button visibility issues on mobile devices
  - Updated `.clerk-modal-container` to use flexbox layout for better mobile handling
  - Added mobile-specific CSS for Clerk components to prevent text cutoff
  - Fixed signout button positioning and visibility on mobile screens
  - Improved touch targets and font sizes for better mobile usability
  - Added proper scrolling behavior for UserProfile content on mobile
  - Changed from full-screen to responsive modal layout on mobile (95vw width, max 500px)
  - Added X close button in top-right corner for better UX
  - Applied same responsive layout and close button to SignIn and SignUp modals
  - Added mobile-specific CSS for SignIn/SignUp forms to prevent text cutoff

## [2.0.0] - 2025-01-18

### Added

- **Clerk authentication integration** - Replaced WorkOS with Clerk for user authentication
  - Added `@clerk/clerk-react` package for React integration
  - Created `convex/auth.config.ts` for Clerk authentication with Convex
  - Uses `ConvexProviderWithClerk` from `convex/react-clerk` for proper integration
  - Integrated ClerkProvider in `src/main.tsx` with Convex token sync via `useAuth` hook
  - Uses `useConvexAuth()` hook for reliable authentication state across app
  - Added SignIn and UserProfile modals with theme-aware appearance customization
  - Theme-aware user profile icons (`user-light.svg`, `user-dark.svg`)
  - Automatic JWT token synchronization between Clerk and Convex

- **Ephemeral mode for unsigned users** - Work without account, data lost on refresh
  - Created `src/lib/localData.ts` in-memory storage for todos and notes
  - Unsigned users can create, edit, delete, and organize todos locally
  - All CRUD operations work identically for signed and unsigned users
  - Warning banner displays when not signed in
  - Search feature gated behind sign-in requirement

- **Enhanced security and data isolation**
  - All Convex queries/mutations require authentication (return empty if not signed in)
  - Replaced hardcoded demo user with `identity.subject` from Clerk JWT
  - Each signed-in user sees only their own data
  - Mutations throw "Not authenticated" error when called without auth

- **UI improvements for authentication**
  - Clerk button styling: white text in light mode, black text in dark mode
  - OTP code field styling with blue accent border
  - Authentication popup for "+ add note" button when not signed in
  - Custom confirmation dialogs for sign-in prompts
  - Removed "Don't have an account?" links from Clerk modals (sidebar has dedicated buttons)

### Changed

- **Authentication flow completely redesigned**
  - Sidebar login button shows SignIn modal when signed out
  - Sidebar login button becomes user profile button when signed in
  - User can view/edit profile and sign out via UserProfile modal
  - All modals match site UI theme (dark/light mode)
- **Search functionality gated by authentication**
  - Search button shows "Sign In to Search" modal when not signed in
  - Search only works for authenticated users with persisted data
  - Keyboard shortcut (Cmd+K) respects authentication state

### Removed

- **WorkOS AuthKit removed** - Replaced entirely with Clerk
  - Removed `@workos-inc/authkit-react` and `@convex-dev/workos` packages
  - Removed Netlify Functions for WorkOS OAuth (`auth-callback.ts`, `auth-me.ts`, `auth-logout.ts`)
  - Removed WorkOS-specific environment variables and configuration
  - Removed `netlify.toml` and `netlify/` folder (no longer needed)

### Migration Notes

- Users will need to sign up again with Clerk (WorkOS sessions are incompatible)
- Environment variables changed from `VITE_WORKOS_*` to `VITE_CLERK_*`
- Required environment variables:
  - `VITE_CLERK_PUBLISHABLE_KEY` (frontend)
  - `CLERK_SECRET_KEY` (Convex backend)
  - `VITE_CLERK_FRONTEND_API_URL` (Convex auth config)

## [1.9.2] - 2025-01-18

### Fixed

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

### Added

- **Netlify Functions for WorkOS authentication** - Server-side OAuth handling
  - `netlify/functions/auth-callback.ts` - Handles OAuth callback and sets session cookies
  - `netlify/functions/auth-me.ts` - Returns current user from session
  - `netlify/functions/auth-logout.ts` - Clears authentication cookies
  - `netlify.toml` - Routes `/api/auth/*` to Netlify Functions
  - Debug logging for environment variables and auth state in browser console

### Changed

- **Environment variables configuration** updated for production deployment
  - Added `WORKOS_API_KEY` (server-side, required for OAuth token exchange)
  - Changed `VITE_WORKOS_REDIRECT_URI` to point to `/api/auth/callback` endpoint
  - Ensured `VITE_CONVEX_URL` uses production deployment URL, not development
  - Production Convex deployment now has correct `WORKOS_CLIENT_ID` environment variable

## [1.9.1] - 2025-01-17

### Fixed

- **Production deployment issues** - Resolved Netlify build failures
  - Fixed TypeScript error in NotesSection.tsx onClick handler for WorkOS signIn function
  - Added @types/node package to devDependencies for process.env support in Convex backend
  - Updated WorkOS AuthKit integration guide with comprehensive Netlify deployment steps
  - Documented environment variable configuration for production deployment
  - Added troubleshooting section for common deployment issues

### Added

- **Production deployment documentation** - Complete Netlify setup guide
  - Step-by-step environment variable configuration
  - WorkOS dashboard settings for production domains
  - Build command optimization with Convex deployment integration
  - Common deployment issues and solutions
  - Security best practices for environment variables

## [1.9.0] - 2025-01-17

### Added

- **WorkOS AuthKit Integration** - Complete authentication system
  - User login/logout with WorkOS AuthKit
  - Private user data (each user sees only their own todos and notes)
  - Theme-aware login/user icons (user-dark.svg/user-light.svg, login-dark.svg/login-light.svg)
  - "Sign In Required" modal for unauthenticated users attempting to create todos/notes
  - Automatic user data storage in Convex database upon first login
  - Proper JWT token validation with correct aud/iss claims
  - Redirect handling from /callback to / after successful login
  - Conditional query execution based on authentication state
  - Error handling for authentication failures

### Changed

- **Authentication flow** - App now requires login to create todos and notes
- **User data isolation** - Each user has completely private data
- **Login UI** - Theme-aware icons for login/logout buttons
- **Query optimization** - Queries skip execution when unauthenticated

### Fixed

- **JWT token validation** - Corrected WorkOS JWT configuration with proper aud/iss claims
- **Authentication state management** - Proper handling of login/logout states
- **User data persistence** - Automatic storage of WorkOS user data in Convex

## [1.8.4] - 2025-10-17

### Added

- **Pinned todos** for quick access to important tasks
  - Pin any active todo from the three-dot menu (excludes completed todos)
  - Pinned section appears at top of sidebar before dates
  - Only shows when at least one todo is pinned
  - Click "Pinned" in sidebar to view all pinned todos on dedicated page
  - Pinned todos display with blue border (#56B5DB) on original page
  - Border only shows on original date page, not on pinned view
  - Unpin option available in three-dot menu
  - Works like a normal today page with full functionality
  - Collapsed sidebar shows Pin icon for pinned section
  - Supports drag-and-drop reordering within pinned view

### Fixed

- **Three-dot menu click handling** for all todos
  - Menu items now properly execute before menu closes
  - Added dropdown refs to prevent premature menu closure on click
  - Fixes pin/unpin and move to date functionality
  - Fixes unarchive functionality in done section
  - Applied fix to both regular and archived todo menus

### Changed

- **Pinned section styling** improved for consistency
  - Replaced emoji with Lucide Pin icon in collapsed sidebar
  - Pin icon works in both light and dark modes
  - Padding and sizing now matches other dates in both desktop and mobile views
  - Proper touch targets (44px minimum) on mobile for better tap experience
  - Dedicated CSS class (`.pinned-section`) with unique styling
  - Visual separator with bottom border and spacing to distinguish from dates
  - Medium font weight (500) to make pinned section stand out
- **Pinned view simplified** for focused task management
  - Hides bulk actions (Archive All, Delete All) on pinned view
  - Hides add todo input on pinned view (pin existing todos from other dates)
  - Hides notes section on pinned view (notes are date-specific)
  - Individual todo actions (delete, unpin, move to date) still work normally

## [1.8.3] - 2025-10-16

### Added

- **Unarchive option** for unchecked archived todos
  - New "Unarchive" option appears in three-dot menu for archived todos that are not completed
  - Quickly move accidentally archived todos back to active list
  - Only shows when todo is in archive section and checkbox is unchecked
  - Seamlessly restores todo to main list without moving dates

- **Tooltip portal rendering** for proper display
  - Tooltips now render using React Portal at document body level
  - Prevents clipping by sidebar or parent container overflow properties
  - Tooltips positioned to the right with 8px offset from trigger elements
  - Full text always visible (no more cut-off tooltip text)
  - Applied to all sidebar footer icons (login, theme toggle, GitHub, Convex)
  - Uses Radix UI TooltipPortal component for reliable positioning

- **Auto-delete on clear text**
  - Todos are automatically deleted when text is edited and cleared
  - Works when editing a todo and removing all text content
  - No confirmation dialog needed for intentional text clearing
  - Helps keep todo list clean and removes accidental empty items

- **Collapsible sidebar** with compact date view
  - New collapse button next to "better todo" in sidebar header
  - Click to toggle between full and collapsed sidebar views
  - Collapsed view shows dates in compact MM/DD format (e.g., 10/22)
  - Sidebar width adjusts from 260px to 60px when collapsed
  - Active date remains highlighted with blue background
  - Hover tooltips show full date labels in collapsed view
  - Smooth transition animation between states
  - Main content area automatically adjusts width
  - Independent from mobile sidebar hide/show functionality
  - Icons for theme toggle and GitHub remain visible when collapsed
  - Uses PanelLeft icon for collapse button (same as previous sidebar toggle)
  - Sidebar toggle removed from todos page header for cleaner layout

### Fixed

- **Todo three-dot menu clipping** in archive section
  - Menus now render using React Portal at document body level
  - Prevents clipping by archive container overflow
  - Menu positioned dynamically based on button location
  - Proper z-index ensures menu appears above all content
  - Click outside menu to close (in addition to ESC key)

- **Light mode date menu contrast** improved for better readability
  - Three dots button (⋯) now darker in light mode (#3d3d3d)
  - Menu items text now darker in light mode (#1d1d1f)
  - Delete action text adjusted for better visibility in light mode (#d5495d)
  - All menu elements maintain excellent contrast in light mode

## [1.8.2] - 2025-10-16

### Added

- **Mobile add button** for iPhone and mobile devices
  - Visible "+" button appears when typing on mobile devices
  - Detects iPhone, iPad, Android, and screens ≤768px
  - Button only shows when there's text to add
  - Touch-optimized size (36x36px minimum)
  - Mint green color (#80cbae) matching app design
  - Desktop users can still use Shift+Enter shortcut
  - Simplified placeholder text on mobile (no Shift+Enter mention)
  - Button positioned to the right of the input field

- **Custom Date Labels** allowing you to rename dates with any text
  - Add custom labels like "Project Planning", "Meeting Notes", etc.
  - Click the menu button (⋯) next to any date
  - Select "Add Label" to give a date a custom name
  - Labels replace the default date format in the sidebar
  - Date flow remains chronological based on actual dates
  - "Edit Label" option appears for dates that already have labels
  - "Remove Label" option to restore default date display
  - Text input with Enter to save, Escape to cancel
  - Labels are preserved when archiving/unarchiving dates
  - Labels are automatically cleaned up when dates are deleted

- **Line numbers in notes** for easier reference and navigation
  - Each line in a note displays a line number on the left
  - Line numbers use monospace font for clean alignment
  - Line numbers are not copyable (user-select: none)
  - Numbers update automatically as you type
  - Styled to match code editor aesthetic

- **Bulk actions for todos** allowing you to archive or delete all todos on a date
  - "Archive All" button to archive all active todos at once
  - "Delete All" button to permanently delete all active todos
  - Both actions require confirmation with custom dialogs matching app style
  - Buttons only appear when there are active todos
  - Clean, borderless button design matching the app aesthetic
  - Archive All uses default styling, Delete All uses danger color (#e16d76)
  - Confirmation messages show the count of todos being affected

- **Delete button for archived todos** with X icon
  - Hover over archived todos to reveal X delete button on the right
  - Button appears only on hover to keep UI clean
  - Click X to delete with confirmation dialog
  - Uses app's standard ConfirmDialog component
  - Danger red color (#e16d76) on hover
  - Smooth fade-in transition for better UX

- **Delete All button for archived todos**
  - "Delete All" button in the archive header next to the count
  - Permanently deletes all archived todos at once
  - Requires confirmation dialog showing count of archived todos
  - Clean, borderless design matching app style
  - Danger red color (#e16d76) on hover
  - Only appears when archive section has items

### Changed

- **Theme switcher repositioned** to bottom of sidebar
  - Moved from top right (next to "better todo" title) to sidebar footer
  - Now positioned above the login link for easier access
  - More intuitive placement at the bottom of the navigation
- **Label save button color** updated to #80cbae (mint green) instead of blue accent
- **Delete button and link colors** updated to #e16d76 (softer red) instead of bright red
  - Menu item danger links now use #e16d76
  - Confirmation dialog dangerous buttons now use #e16d76
  - Hover state uses slightly darker #c95c64
- **Confirmation dialog default buttons** updated to #80cbae (mint green)
  - Archive All and other non-dangerous confirmations now use mint green
  - Dangerous actions still use red (#e16d76)
  - Creates visual distinction between safe and destructive actions
- **Bulk action buttons repositioned** to bottom of page (footer style)
  - Moved Archive All and Delete All buttons below the archive section
  - Clean footer positioning with top margin and padding
  - No border lines for cleaner appearance
  - Updated button labels to "Archive All (active todos)" and "Delete All (active todos)" for clarity
- **Archive section auto-collapses** when adding new todos
  - Adding a todo via input collapses the archive section
  - Pasting multiple todos also collapses the archive section
  - Keeps focus on active todos when creating new items

### Fixed

- **TodoList syntax error** resolved incomplete React component wrapper
- **Missing todoInputRef** causing blank screen error - added useRef for textarea element
- **Simplified handleAddNote** removed unnecessary dynamic import
- **Archived date menu overlap** fixed by positioning dropdown menus above the button for archived dates instead of below, preventing overlap with other dates

## [1.8.1] - 2025-10-16

### Added

- **Delete confirmation keyboard shortcuts**
  - Press Enter to confirm delete
  - Press Escape to cancel
  - Works on all delete confirmation dialogs (todos, notes, dates)

### Changed

- **Add Note button styling matches Archive toggle**
  - Reduced size with smaller padding (8px 0) and font size (13px)
  - Left-aligned instead of centered
  - Simpler hover effect (opacity change)
  - Smaller icon (14px) to match compact design
  - Notes themselves remain full-size and unchanged
- **Cleaner UI with removed divider lines**
  - Removed border above Archive section in sidebar
  - Removed border below date header in main content
  - Removed border at bottom of notes section
  - Creates more seamless, modern appearance

### Fixed

- **Notes typing sync issue** resolved by implementing local state with debouncing
  - Notes now use local state and debounce database updates (500ms after user stops typing)
  - Updates save immediately when user clicks away (blur)
  - Eliminates lag and cursor jumping while typing in notes
  - Smooth typing experience with proper autosave

## [1.8.0] - 2025-10-16

### Added

- **Full-text search** across todos and notes using Convex text search
  - Search icon in top right of header
  - Keyboard shortcut: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  - Real-time search with instant results
  - Search across todo content and note titles/content
  - Keyboard navigation with arrow keys
  - Press Enter to navigate to selected result
  - Search term highlighting in results
  - Shows result type (Todo/Note), date, and status badges
  - Beautiful modal UI matching the app theme
  - Top 30 most relevant results displayed
  - Automatically navigates to the date of selected result
  - Works in both light and dark themes

### Changed

- Header layout now has left section for toggle/date and right section for search button
- Added search indexes to database schema for efficient full-text search
  - Todos: indexed on content field
  - Notes: indexed on both title and content fields

## [1.7.1] - 2025-10-16

### Changed

- **Custom confirmation dialog** replaces browser default popups
  - Matches site design system with consistent colors, borders, and shadows
  - Styled delete confirmation with red dangerous button
  - Professional modal with backdrop overlay centered on entire page
  - Follows existing UI patterns and design language
  - Added confirmation for deleting todos
  - Added confirmation for deleting notes
  - Added confirmation for deleting dates in sidebar

### Fixed

- Browser default confirm dialog replaced with custom styled modal
- Confirmation dialog now centered on viewport using React Portal
- Dialog renders at document.body level, ensuring proper centering regardless of parent container
- Higher z-index ensures dialog appears above all other content
- Fixed sidebar delete confirmation appearing within sidebar instead of centered on page

## [1.7.0] - 2025-10-16

### Added

- **Multiple notes system** with drag-and-drop reordering
  - Add unlimited notes per date with plus button
  - Each note has its own title and collapsible state
  - Edit/Preview tabs for markdown rendering
  - Copy button per note
  - Delete button per note
- **Archive dates feature** in sidebar
  - Archive dates using three-dot menu
  - Collapsible archived section in sidebar
  - Unarchive dates when needed
- **Scrollable sidebar dates** with custom scrollbar styling
- **Favicon** - checkmark emoji favicon
- **Twitter Card** meta tags with large summary format
- **Open Graph** meta tags for social sharing

### Changed

- Notes moved to top of page (above todos)
- Notes now support multiple items instead of single note per date
- Sidebar dates scroll when list is full
- Updated schema to support new notes and archived dates tables

### Fixed

- Notes positioning and organization
- Sidebar overflow handling

## [1.6.0] - 2025-10-16

### Changed

- **Removed markdown rendering from todos** - todos now display as plain text for simplicity
  - Markdown support remains available in the notes section
  - Cleaner, faster rendering for todo items
- **Reduced header font sizes** for more compact layout
  - App name: 16px → 14px
  - Current date: 18px → 14px
  - Creates more space for content
- **Mobile optimizations** for native iPhone app feel:
  - Sidebar width increased to 280px on mobile
  - Touch-friendly tap targets (44x44px minimum)
  - Smooth cubic-bezier transitions (0.3s)
  - Sticky header with border on mobile
  - iOS-style momentum scrolling (`-webkit-overflow-scrolling: touch`)
  - Disabled text selection on interactive elements
  - Larger checkboxes (20x20px) for easier tapping
  - Proper viewport height handling (100vh)
  - Improved overlay with no tap highlight

### Fixed

- Todo checkbox hover now shows golden border (#e6cd6a) before checking
- Mobile sidebar properly works as hamburger menu
- All UI elements now meet iOS touch target guidelines (44px)

## [1.5.0] - 2025-10-16

### Added

- Notes section now supports markdown code blocks with syntax highlighting
- Edit/Preview tabs for notes section with live markdown preview
- Copy button to copy all notes content to clipboard
- Mobile overlay that closes sidebar when clicked

### Changed

- Reversed keyboard shortcuts: Enter for new lines, Shift+Enter to create/save
  - Applies to both creating new todos and editing existing todos
  - More intuitive for multi-line content
- Sidebar now auto-collapses on mobile by default
- Notes section positioned right above archive section

### Fixed

- Mobile sidebar now properly auto-hides and shows overlay when open
- Fixed keyboard navigation in todos and notes for better UX

## [1.4.1] - 2025-10-16

### Changed

- Removed toggle functionality from h1, h2, h3 markdown headers in todos
- All todo items now display with checkbox only (full markdown support maintained)
- Notes textarea now auto-expands as you type (up to 600px max height)
- Notes font size matches todo font size for consistency
- Removed focus ring from notes textarea in both light and dark modes

### Fixed

- Fixed markdown header rendering - headers no longer try to create collapsible sections
- Improved notes section UX with seamless auto-expansion

## [1.4.0] - 2025-10-16

### Added

- Notes section with toggle (closed by default) above archive
- Separate notes database table for free-form daily notes
- Login link at bottom of sidebar (auth not yet implemented)
- Browser/OS spell check enabled for todos and notes
- Grammarly explicitly disabled for better native experience
- Lucide React icon library for cleaner iconography

### Changed

- Changed active date color to #56B5DB in both light and dark modes
- Reduced sidebar date padding from 8px to 6px for more compact layout
- Removed border line between sidebar header and dates section
- Fixed sidebar collapse behavior on mobile resize
- Code blocks now always display on separate lines with proper margins
- Replaced custom sidebar toggle icon with Lucide's PanelLeft icon
- Notes auto-save on blur for seamless experience

### Fixed

- Mobile sidebar now properly collapses with transform animation
- Improved mobile responsiveness with fixed positioning

## [1.3.1] - 2025-10-16

### Added

- Multi-line note support with Shift+Enter for line breaks
- Auto-expanding textarea that grows with content (up to 200px max height)
- Line breaks are now preserved in todo content and displayed properly

### Changed

- Updated placeholder text to mention Shift+Enter for line breaks
- Markdown preview now uses `white-space: pre-wrap` to preserve line breaks
- Header detection now only checks the first line (allows multi-line headers)

## [1.3.0] - 2025-10-16

### Added

- Date menu with three-dot button next to each date in sidebar
- Copy all non-archived tasks from one date to another
- Copy to Tomorrow, Previous Day, Next Day, or Custom Date options
- Markdown list paste support (creates multiple todos from pasted lists)
- Auto-unarchive functionality when unchecking completed items
- Proper spacing between checkbox and todo content

### Changed

- Sidebar resizer line is now black, thinner (1px), and more subtle with opacity
- Mobile view now properly supports hamburger menu with slide animation
- Keyboard shortcuts updated: Enter creates todo, Shift+Enter adds new line
- Date menu buttons only visible on hover for cleaner UI
- Improved markdown support with better bullet point formatting

### Fixed

- Fixed mobile sidebar collapse/expand functionality
- Fixed checkbox alignment and spacing
- Fixed sidebar transition animations

## [1.2.0] - 2025-10-16

### Added

- 4 CSS custom properties for font sizes: `--font-app-name`, `--font-sidebar`, `--font-todo`, `--font-archive`
- Hover-only drag handles and menu buttons for cleaner UI
- Smooth transitions for all interactive elements
- "Move to Tomorrow" option in todo three-dot menu

### Changed

- Removed boxes around todos in both light and dark mode
- Todos now have minimal spacing (closer together) while remaining draggable
- Made all fonts smaller throughout the app
- Moved archive section to bottom of page
- Removed border lines between dates in sidebar
- Drag handles and menu buttons now only visible on hover
- Improved checkbox styling with better alignment
- Archive section now uses border-top separator instead of box
- Reduced padding and spacing throughout for more compact design
- Reordered menu items: "Move to Tomorrow" appears first

## [1.1.0] - 2025-10-16

### Added

- Resizable sidebar with drag-to-resize functionality (200-500px width range)
- Sidebar toggle button with clean icon design
- Notion-style inline todo input (just start typing to add todos)
- Press Enter to create todo, Shift+Enter for new line
- Half-moon SVG icon for theme switcher (removed emoji)

### Changed

- Removed "Add Todo" button in favor of inline typing
- All text now uses normal font weight (400) instead of bold (600/700)
- Archive title remains visible at top but not bold
- Removed loading screen flash by using smarter Convex data handling
- Improved date navigation to prevent flashing between dates
- Sidebar toggle now uses SVG icon instead of emoji

### Fixed

- Fixed flashing when switching between dates with Convex
- Improved real-time data loading for smoother transitions

## [1.0.0] - 2025-01-16

### Added

- Initial release of Better Todo app
- Real-time todo synchronization using Convex
- WorkOS AuthKit integration for authentication
- Dark mode (Sublime Text style) with background color #2E3842
- Light mode (Apple Notes style)
- Markdown support with syntax highlighting for code blocks
- Collapsible header sections (h1, h2, h3)
- Drag and drop todo reordering using @dnd-kit
- Daily organization with date-based sidebar navigation
- Archive section that auto-archives completed todos
- Three-dot menu for moving todos between days
- Mobile-friendly responsive design
- Theme toggle with localStorage persistence
- Bold and italic text formatting support
- System font stack for native look and feel

### Backend Features

- Convex schema with todos table
- Indexes for efficient querying by user and date
- Queries for fetching todos by date and available dates
- Mutations for creating, updating, deleting, and reordering todos
- Mutation for moving todos between dates
- Auto-archiving on todo completion

### UI Components

- Sidebar with date navigation
- TodoItem with markdown preview and inline editing
- TodoList with drag-and-drop support
- ArchiveSection for completed tasks
- Theme switcher in sidebar header
- Responsive mobile menu toggle

### Technical

- TypeScript for type safety
- React 18 with hooks
- Vite for fast development
- Convex for real-time backend
- WorkOS AuthKit with auto-provisioning
- date-fns for date manipulation
- react-markdown for markdown rendering
- react-syntax-highlighter for code blocks
- @dnd-kit for drag and drop functionality
