import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function Changelog() {
  const [activeSection, setActiveSection] = useState("v017");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep this list in sync with the <section> anchors rendered below.
  const sections = [
    { id: "unreleased", title: "Unreleased" },
    { id: "v017", title: "v.017 - Nov 15, 2025" },
    { id: "v016", title: "v.016 - Nov 14, 2025" },
    { id: "v015", title: "v.015 - Nov 8, 2025" },
    { id: "v014", title: "v.014 - Nov 8, 2025" },
    { id: "v013", title: "v.013 - Nov 2, 2025" },
    { id: "v012", title: "v.012 - Nov 2, 2025" },
    { id: "v011", title: "v.011 - Nov 1, 2025" },
    { id: "v010", title: "v.010 - Nov 1, 2025" },
    { id: "v009", title: "v.009 - Oct 31, 2025" },
    { id: "v008", title: "v.008 - Oct 30, 2025" },
    { id: "v007", title: "v.007 - Oct 29, 2025" },
    { id: "v006", title: "v.006 - Oct 26, 2025" },
    { id: "v005", title: "v.005 - Oct 26, 2025" },
    { id: "v004", title: "v.004 - Oct 25, 2025" },
    { id: "v002", title: "v1.002 - Oct 24, 2025" },
    { id: "v001", title: "v1.001 - Oct 24, 2025" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="launch-page" data-theme="tan">
      <button
        className="launch-mobile-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={24} /> : <span>☰</span>}
      </button>

      <nav className={`launch-sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="launch-sidebar-title">better-todo</div>
        <ul className="launch-sidebar-nav">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => setSidebarOpen(false)}
              >
                {section.title}
              </a>
            </li>
          ))}
          <li>
            <a href="/about" onClick={() => setSidebarOpen(false)}>
              About
            </a>
          </li>
          <li>
            <a href="/" onClick={() => setSidebarOpen(false)}>
              Home
            </a>
          </li>
        </ul>
      </nav>

      <div className="launch-container">
        {/* Each section mirrors the markdown changelog so anchors stay in sync. */}
        <section id="unreleased" className="launch-section">
          <h1 className="launch-title">Changelog</h1>
          <p className="launch-intro">
            All notable changes to Better Todo are documented here.
          </p>

          <h2 className="section-title">Unreleased</h2>
          <p className="changelog-subtitle">
            No unreleased changes. Follow along with the most recent release below.
          </p>
        </section>

        <section id="v017" className="launch-section">
          <h2 className="section-title">v.017 - November 15, 2025</h2>
          <p className="changelog-subtitle">Shareable Full-Page Notes</p>
          <p>
            Generate read-only links to share your full-page notes publicly with custom URL slugs, optional title hiding, and beautiful social media previews.
          </p>

          <h3 className="subsection-title">Added</h3>
          <ul className="feature-list">
            <li>
              <strong>Shareable Full-Page Notes</strong> - Generate read-only links with custom URL slugs
              <ul>
                <li>Share button in note tabs (authenticated users only)</li>
                <li>Custom alphanumeric slugs (3-50 characters, underscores allowed)</li>
                <li>Random slug generation if no custom slug provided</li>
                <li>Public <code>/share/:slug</code> route accessible without authentication</li>
                <li>Optional hide title on shared note setting</li>
                <li>Edit custom slugs after creation</li>
                <li>Revoke share links to make notes private</li>
                <li>Open shared notes in new tab</li>
                <li>Theme toggle in shared view (dark, light, tan, cloud)</li>
                <li>Copy note content from shared view</li>
                <li>Open Graph meta tags for social sharing</li>
                <li>First image in note used as preview for social media</li>
                <li>Instant loading with Convex real-time sync (no loading states)</li>
              </ul>
            </li>
          </ul>

          <h3 className="subsection-title">Backend changes</h3>
          <ul className="feature-list">
            <li>
              <strong>Schema updates</strong> - Added <code>shareSlug</code>, <code>isShared</code>, and <code>hideHeaderOnShare</code> fields to <code>fullPageNotes</code> table
            </li>
            <li>
              <strong>Full-page notes module</strong> - New mutations and queries for sharing
              <ul>
                <li><code>generateShareLink</code> - Create shareable link with custom or random slug</li>
                <li><code>revokeShareLink</code> - Remove share access and clear slug</li>
                <li><code>updateShareSlug</code> - Update existing share slug</li>
                <li><code>updateHideHeader</code> - Toggle title visibility on shared note</li>
                <li><code>checkSlugAvailability</code> - Verify slug uniqueness before saving</li>
                <li><code>getNoteBySlug</code> - Fetch shared note for public viewing</li>
                <li><code>getSharedNoteMetadata</code> - Get Open Graph metadata for social sharing</li>
                <li><code>getImageUrls</code> - Retrieve image URLs from Convex storage for note</li>
              </ul>
            </li>
            <li>
              <strong>HTTP endpoints</strong> - Added <code>/share/:slug/metadata</code> route for Netlify Edge Functions
            </li>
          </ul>

          <h3 className="subsection-title">Frontend changes</h3>
          <ul className="feature-list">
            <li>
              <strong>ShareLinkModal component</strong> - Modal for creating and managing share links
              <ul>
                <li>Custom slug input with real-time validation</li>
                <li>Slug availability checking (debounced, 500ms delay)</li>
                <li>Generated share URL with copy functionality</li>
                <li>Hide title toggle for shared view</li>
                <li>Open in new tab button</li>
                <li>Edit slug after creation</li>
                <li>Revoke share link option</li>
              </ul>
            </li>
            <li>
              <strong>SharedNoteView component</strong> - Public view for shared notes
              <ul>
                <li>Accessible at <code>/share/:slug</code> without authentication</li>
                <li>Theme toggle (dark, light, tan, cloud)</li>
                <li>Copy note content button</li>
                <li>Optional title display based on <code>hideHeaderOnShare</code> setting</li>
                <li>Full markdown rendering with syntax highlighting</li>
                <li>Image support from Convex storage</li>
                <li>Instant loading with empty state that fills in (no loading spinner)</li>
              </ul>
            </li>
            <li>
              <strong>FullPageNoteTabs updates</strong> - Added share button with link icon
              <ul>
                <li>Appears in tab actions next to delete button</li>
                <li>Opens ShareLinkModal on click</li>
                <li>Only visible to authenticated users</li>
              </ul>
            </li>
            <li>
              <strong>App routing</strong> - Added <code>/share/:slug</code> route for shared notes
            </li>
            <li>
              <strong>Netlify configuration</strong> - Added Edge Function for Open Graph meta tags
            </li>
          </ul>

          <h3 className="subsection-title">Styling changes</h3>
          <ul className="feature-list">
            <li>
              <strong>Shared note view styles</strong> - Complete styling for public shared notes
              <ul>
                <li>Theme-aware color system matching main app themes</li>
                <li>Responsive layout with max-width container</li>
                <li>Header with optional title display</li>
                <li>Theme toggle buttons in top right</li>
                <li>Copy button styling</li>
                <li>Markdown content rendering with proper spacing</li>
                <li>Code block syntax highlighting</li>
                <li>Mobile-responsive design</li>
              </ul>
            </li>
            <li>
              <strong>Share link modal styles</strong> - Modal styling for share management
              <ul>
                <li>Input validation states (available, taken, invalid)</li>
                <li>Action button group layout</li>
                <li>Copy confirmation states</li>
                <li>Error message styling</li>
                <li>Mobile-optimized modal size</li>
              </ul>
            </li>
          </ul>
        </section>

        <section id="v016" className="launch-section">
          <h2 className="section-title">v.016 - November 14, 2025</h2>

          <h3 className="subsection-title">Added</h3>
          <ul className="feature-list">
            <li>
              <strong>Pomodoro Timer Keyboard Shortcut</strong> - Quickly access timer with Shift + F
              <ul>
                <li>Opens Pomodoro timer modal from anywhere in the app</li>
                <li>Listed in keyboard shortcuts modal (press ? to view all shortcuts)</li>
                <li>Works alongside existing "f" shortcut to enter full-screen mode when timer is open</li>
                <li>Keyboard shortcut works whether timer is idle, running, or paused</li>
              </ul>
            </li>
          </ul>

          <h3 className="subsection-title">Changed</h3>
          <ul className="feature-list">
            <li>
              <strong>Phase Badge Theming</strong> - Phase badges now match your selected theme
              <ul>
                <li>Focus and Break badges use theme variables for consistent colors across all themes</li>
                <li>Background uses secondary theme color</li>
                <li>Text color uses primary theme text color</li>
                <li>Border uses theme border color</li>
                <li>Adapts seamlessly to dark, light, tan, and cloud themes</li>
                <li>Glass effect phase badges (when background image is enabled) remain white for readability</li>
              </ul>
            </li>
          </ul>

          <h3 className="subsection-title">Fixed</h3>
          <ul className="feature-list">
            <li>
              <strong>Full-Screen Timer Flash</strong> - Eliminated flash when entering full-screen Pomodoro mode
              <ul>
                <li>Timer now appears centered immediately without flashing in corner first</li>
                <li>Removed fade-in animations that caused layout calculation delays</li>
                <li>Removed pulse animation that changed opacity</li>
                <li>All elements pre-positioned with proper flexbox centering</li>
                <li>Smoother, more professional transition to full-screen mode</li>
              </ul>
            </li>
          </ul>
        </section>

        <section id="v015" className="launch-section">
          <h2 className="section-title">v.015 - November 8, 2025</h2>
          <p className="changelog-subtitle">Todo composer refresh</p>
          <p>
            The inline todo composer now matches the rest of the interface with a compact, keyboard-first layout that keeps you moving quickly.
          </p>

          <h3 className="subsection-title">Changed</h3>
          <ul className="feature-list">
            <li>
              <strong>Todo Input UI Redesign</strong> - Refined the todo composer with a modern, compact interface.
            </li>
            <li>
              Rounded container (650px max width on desktop) uses <code>var(--bg-secondary)</code> so it blends with the current theme.
            </li>
            <li>
              ArrowUp icon submit button (24px desktop, responsive down to 18px) delivers one-click todo creation.
            </li>
            <li>
              Removed box shadows for a cleaner look aligned with the rest of the UI.
            </li>
            <li>
              Responsive sizing across breakpoints keeps touch targets comfortable everywhere.
            </li>
            <li>
              Button integrates seamlessly with existing keyboard shortcuts (Enter/Shift+Enter) and shows a subtle disabled state at 55% opacity.
            </li>
          </ul>
        </section>

        <section id="v014" className="launch-section">
          <h2 className="section-title">v.014 - November 8, 2025</h2>
          <p className="changelog-subtitle">Todos in Project Folders & Enhanced Organization</p>
          <p>
            Projects can now contain todos directly alongside notes, with improved folder organization and navigation throughout the app.
          </p>
          
          <h3 className="subsection-title">Added</h3>
          <ul className="feature-list">
            <li>
              <strong>Todos in Project Folders</strong> - Projects can now contain todos directly
            </li>
            <li>
              Todos can be moved to project folders and disconnected from dates
            </li>
            <li>
              Each project can have multiple dateless todos organized independently
            </li>
            <li>
              Todos show in expandable "Todos" section within project folders in sidebar
            </li>
            <li>
              Project folder todos support all features: drag-and-drop reordering, subtasks, headers, completion, archiving
            </li>
            <li>
              Creating new todos within a project folder automatically makes them dateless todos for that project
            </li>
            <li>
              Paste multiple todos at once in project folders
            </li>
            <li>
              <strong>Full-Page Notes Back Navigation</strong> - Added back button next to View full-page notes icon
            </li>
            <li>
              Back button returns to appropriate location (date or today) depending on where user was
            </li>
            <li>
              <strong>Empty Project Folders Visible</strong> - Project folders now show immediately when created
            </li>
          </ul>

          <h3 className="subsection-title">Changed</h3>
          <ul className="feature-list">
            <li>
              <strong>Project Folder Organization</strong> - Improved project folder display and organization in sidebar
            </li>
            <li>
              Removed "Manage Projects" section - all project folders now appear in main Folders section
            </li>
            <li>
              Project folders are sorted alphabetically for easier navigation
            </li>
            <li>
              Folders appear below dates and above "+ Add Project" button
            </li>
            <li>
              Count badges show next to "Todos" and "Notes" toggles within folders, not on folder name
            </li>
            <li>
              Clicking "Todos" in a folder directly shows todos (no "View all todos" dropdown)
            </li>
            <li>
              <strong>Full-Page Note Navigation</strong> - Opening a note from a folder now selects and expands that folder in sidebar
            </li>
            <li>
              Auto-expands folder and notes section when note is selected
            </li>
          </ul>

          <h3 className="subsection-title">Fixed</h3>
          <ul className="feature-list">
            <li>
              <strong>TypeScript Build Errors</strong> - Fixed type compatibility issues in TodoList component
            </li>
            <li>
              Converted null to undefined when passing folderId prop to TodoItem components
            </li>
            <li>
              Added explicit types to existingTodos and existingSubtasks in createTodo and createSubtask mutations
            </li>
            <li>
              <strong>Todo Deletion Robustness</strong> - Improved todo deletion handling
            </li>
            <li>
              Made deleteTodo mutation idempotent (safe to call multiple times)
            </li>
            <li>
              Returns null instead of throwing error if todo doesn't exist
            </li>
            <li>
              Automatically deletes all subtasks when header is deleted (cascading delete)
            </li>
          </ul>
        </section>

        <section id="v013" className="launch-section">
          <h2 className="section-title">v.013 - November 2, 2025</h2>
          <p className="changelog-subtitle">Pomodoro Timer Duration Toggle</p>
          <p>
            Added ability to switch between 25-minute focus sessions and 90-minute flow state sessions, plus fixed sound auto-play issues.
          </p>
          <ul className="feature-list">
            <li>
              Duration toggle with Waves icon to switch to 90-minute flow state mode
            </li>
            <li>
              Clock icon to switch back to 25-minute focus mode
            </li>
            <li>
              Toggle button appears next to Start button (only visible when timer is idle)
            </li>
            <li>
              All timer features work identically for both durations (audio, fullscreen, pause, resume, reset, stop)
            </li>
            <li>
              Fixed sounds playing automatically when timer session is restored from previous page load
            </li>
            <li>
              Sounds now only play when user explicitly clicks Start or Reset button in current session
            </li>
            <li>
              All sounds respect mute state regardless of when timer was started
            </li>
          </ul>
        </section>

        <section id="v012" className="launch-section">
          <h2 className="section-title">v.012 - November 2, 2025</h2>
          <p className="changelog-subtitle">Full-page notes in projects</p>
          <p>
            Projects can now host full-page notes with navigation, archive behavior, and warnings that match project state.
          </p>

          <h3 className="subsection-title">Added</h3>
          <ul className="feature-list">
            <li>
              <strong>Full-page notes in projects</strong> - Projects can now contain full-page notes that persist separately from date-based notes.
            </li>
            <li>
              Notes can move between projects and dates, clearing the previous association automatically.
            </li>
            <li>
              Each project surfaces its notes within a dedicated sidebar section with tab support.
            </li>
            <li>
              Archive rules cascade so archived projects freeze their notes while keeping them readable.
            </li>
            <li>
              <strong>Project deletion warnings</strong> - Confirmation dialogs now show how many notes will be removed when deleting a project.
            </li>
            <li>
              <strong>Archive support for project notes</strong> - Archiving or unarchiving a project applies the same state to all linked notes.
            </li>
          </ul>

          <h3 className="subsection-title">Fixed</h3>
          <ul className="feature-list">
            <li>
              <strong>Line breaks in notes</strong> - Added remark-breaks so single line breaks render consistently across note views.
            </li>
            <li>
              <strong>Tab switching for project notes</strong> - Switching tabs now refreshes content reliably, even for project-scoped notes.
            </li>
            <li>
              <strong>Archived dates in sidebar</strong> - Archived dates no longer appear in both active and archived lists.
            </li>
          </ul>

          <h3 className="subsection-title">Changed</h3>
          <ul className="feature-list">
            <li>
              <strong>Full-page note creation</strong> - Creating a note now respects the current context, targeting either the active date or selected project.
            </li>
          </ul>

          <h3 className="subsection-title">Backend changes</h3>
          <ul className="feature-list">
            <li>
              <strong>Schema updates</strong> - Added an <code>archived</code> flag to the <code>fullPageNotes</code> table for project-level archival.
            </li>
            <li>
              <strong>Full-page notes module</strong> - New queries fetch notes by id collection and support archived filtering.
            </li>
            <li>
              <strong>Folders module</strong> - Archiving or deleting a project now updates its notes in parallel to prevent orphaned content.
            </li>
          </ul>

          <h3 className="subsection-title">Frontend changes</h3>
          <ul className="feature-list">
            <li>
              <strong>App state</strong> - Added project-aware note fetching, tab hydration, and creation guards for archived projects.
            </li>
            <li>
              <strong>Sidebar</strong> - Folder deletion warnings include note counts and archived folders reveal read-only notes.
            </li>
            <li>
              <strong>Full-page note view</strong> - Added remark-breaks integration and removed code block header chrome for a cleaner editor.
            </li>
            <li>
              <strong>Notes section</strong> - Regular notes share the same remark-breaks behavior for single line breaks.
            </li>
          </ul>

          <h3 className="subsection-title">Dependencies</h3>
          <ul className="feature-list">
            <li>Added <code>remark-breaks</code> to support single-line break rendering.</li>
          </ul>
        </section>

        <section id="v011" className="launch-section">
          <h2 className="section-title">v.011 - November 1, 2025</h2>
          <p className="changelog-subtitle">Simplified Full-Page Notes</p>
          <p>
            Streamlined full-page notes interface for better focus and
            performance with instant loading.
          </p>
          <ul className="feature-list">
            <li>
              Removed format toggle dropdown for cleaner, simpler interface
            </li>
            <li>
              Removed markdown split-screen preview - focus on core editing
            </li>
            <li>Removed image upload functionality</li>
            <li>
              Instant note loading with Convex real-time sync (no loading
              states)
            </li>
            <li>
              Full-page notes now focus on core editing and markdown rendering
            </li>
          </ul>
        </section>

        <section id="v010" className="launch-section">
          <h2 className="section-title">v.010 - November 1, 2025</h2>
          <p className="changelog-subtitle">Stats Page User Count Fix</p>
          <p>
            Fixed stats page to read total user count from Clerk instead of
            Convex database for accurate user statistics.
          </p>
        </section>

        <section id="v009" className="launch-section">
          <h2 className="section-title">v.009 - October 31, 2025</h2>
          <p className="changelog-subtitle">Full Markdown Support in Notes</p>
          <p>
            Added comprehensive markdown rendering in all notes with GitHub
            Flavored Markdown support.
          </p>
          <ul className="feature-list">
            <li>
              All text content now supports markdown formatting (bold, italic,
              headers, lists, links, tables, blockquotes)
            </li>
            <li>
              Works automatically without needing ```md wrapper - just write
              markdown and it renders
            </li>
            <li>
              Code blocks continue to work with triple backticks (```js, ```css,
              etc.)
            </li>
            <li>Preserves existing code block syntax highlighting</li>
            <li>Added react-markdown and remark-gfm for GFM support</li>
            <li>
              Markdown renders in display mode, edit mode shows plain text with
              markdown syntax
            </li>
            <li>Applied to both NotesSection and FullPageNoteView components</li>
            <li>
              Comprehensive CSS styling for all markdown elements (headers,
              lists, links, blockquotes, tables, images)
            </li>
            <li>All styles respect theme variables (light, dark, tan, cloud)</li>
          </ul>
        </section>

        <section id="v008" className="launch-section">
          <h2 className="section-title">v.008 - October 30, 2025</h2>
          <p className="changelog-subtitle">Cloud Theme</p>
          <p>
            Added fourth theme option with minimal grayscale design for
            distraction-free focus.
          </p>
          <ul className="feature-list">
            <li>Minimal grayscale color palette with #EDEDED background</li>
            <li>Near-black text for maximum clarity</li>
            <li>Consistent dark gray interactive elements</li>
            <li>Radix Half2 icon for cloud theme indicator</li>
            <li>Cycle through all four themes with sidebar icon</li>
            <li>Full support for all app features including Clerk modals</li>
            <li>Mobile responsive with consistent design</li>
            <li>Theme persists across sessions and devices</li>
          </ul>
        </section>

        <section id="v007" className="launch-section">
          <h2 className="section-title">v.007 - October 29, 2025</h2>
          <p className="changelog-subtitle">Full-Page Notes</p>
          <p>
            Added dedicated note-taking workspace for each date with unlimited
            full-page notes per date and Chrome-style tabbed interface.
          </p>
          <ul className="feature-list">
            <li>FileText icon in header to access full-page notes view</li>
            <li>
              FilePlus icon to create new notes within full-page notes page
            </li>
            <li>Checkbox icon to return to todos from full-page notes</li>
            <li>Single-click to start typing with automatic edit mode</li>
            <li>Double-click tab titles to rename notes</li>
            <li>Line numbers that scale with font size</li>
            <li>Markdown rendering and syntax highlighting for code blocks</li>
            <li>Auto-save on content changes</li>
            <li>Copy button for note content</li>
            <li>X button closes tab without deleting note from database</li>
            <li>Notes folder in sidebar shows all note titles for each date</li>
            <li>Active state indicator for currently selected notes</li>
            <li>Three-dot menu for rename and delete actions</li>
            <li>Font size integration with Todo Text Font Size setting</li>
            <li>Mobile-optimized with responsive design</li>
            <li>Real-time sync across devices</li>
          </ul>
        </section>

        <section id="v006" className="launch-section">
          <h2 className="section-title">v.006 - October 26, 2025</h2>
          <p className="changelog-subtitle">Projects Terminology Update</p>
          <p>
            Updated terminology throughout the app for better clarity and
            usability.
          </p>
          <ul className="feature-list">
            <li>Folders now called Projects in UI and documentation</li>
            <li>Add Project button and Manage Projects section</li>
            <li>
              Menu options updated: Add to Project, Remove from Project, Rename
              Project, Archive Project, Delete Project
            </li>
            <li>
              More intuitive naming for organizing dates by project context
            </li>
          </ul>
        </section>

        <section id="v005" className="launch-section">
          <h2 className="section-title">v.005 - October 26, 2025</h2>
          <p className="changelog-subtitle">Launch Page and Timer Controls</p>
          <p>
            Added comprehensive launch page with feature showcase and improved
            Pomodoro timer controls.
          </p>
          <ul className="feature-list">
            <li>Launch page route at /launch and /about</li>
            <li>Custom 404 Not Found page component</li>
            <li>Demo video on Launch page intro section</li>
            <li>
              Screenshot galleries for themes, timer, mobile, and full-page
              notes
            </li>
            <li>Image modal with keyboard navigation</li>
            <li>Pomodoro timer mute/unmute controls</li>
            <li>Volume button in modal and full-screen mode</li>
            <li>Timer icon now opens modal instead of auto-starting</li>
          </ul>
        </section>

        <section id="v004" className="launch-section">
          <h2 className="section-title">v.004 - October 25, 2025</h2>
          <p className="changelog-subtitle">Dark Mode Accent Color</p>
          <p>
            Updated dark mode interactive accent color from blue to green for
            better visual consistency.
          </p>
          <ul className="feature-list">
            <li>All interactive elements now use green accent in dark mode</li>
            <li>
              Updated checkboxes, buttons, active states, and focus indicators
            </li>
            <li>Light mode blue and tan mode orange remain unchanged</li>
          </ul>
        </section>

        <section id="v002" className="launch-section">
          <h2 className="section-title">v1.002 - October 24, 2025</h2>
          <p className="changelog-subtitle">Progressive Web App Support</p>
          <p>
            Added PWA support for installable app experience on iOS and Android
            devices.
          </p>
          <ul className="feature-list">
            <li>PWA manifest with complete configuration</li>
            <li>iOS splash screen for iPhone Pro devices</li>
            <li>Installable on iOS via Add to Home Screen</li>
            <li>Standalone display mode for immersive app feel</li>
            <li>Haptics library for tactile feedback on touch devices</li>
          </ul>
        </section>

        <section id="v001" className="launch-section">
          <h2 className="section-title">v1.001 - October 24, 2025</h2>
          <p className="changelog-subtitle">
            Todo Text Font Size Customization
          </p>
          <p>
            Added user-specific font size settings for todo text with real-time
            preview.
          </p>
          <ul className="feature-list">
            <li>
              Font size options: 10px, 12px (default), 14px, 16px, 18px, 24px
            </li>
            <li>Settings accessible via Keyboard Shortcuts Modal (press ?)</li>
            <li>
              Font size persists across sessions and devices per user account
            </li>
            <li>Works in both light and dark themes</li>
          </ul>
        </section>

        <div className="launch-cta">
          <a
            href="https://github.com/waynesutton/better-todo"
            target="_blank"
            rel="noopener noreferrer"
            className="launch-button"
          >
            View on GitHub
          </a>
          <a href="/" className="launch-button launch-button-primary">
            Try better-todo
          </a>
        </div>

        <div className="launch-footer">
          <p>Built with React, TypeScript, and Convex</p>
          <p>
            <a
              href="https://github.com/waynesutton/better-todo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Source
            </a>
            {" · "}
            <a
              href="https://www.convex.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by Convex
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
