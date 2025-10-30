import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function Changelog() {
  const [activeSection, setActiveSection] = useState("v008");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = [
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
        <section id="v008">
          <h1 className="launch-title">Changelog</h1>
          <p className="launch-intro">
            All notable changes to Better Todo are documented here.
          </p>

          <h2 className="section-title">v.008 - October 30, 2025</h2>
          <p className="changelog-subtitle">Cloud Theme</p>
          <p>
            Added fourth theme option with minimal grayscale design for
            distraction-free focus.
          </p>
          <ul className="feature-list">
            <li>Minimal grayscale color palette (#EDEDED background)</li>
            <li>Near-black text (#171717) for maximum clarity</li>
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
