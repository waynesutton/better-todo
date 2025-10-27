import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function Launch() {
  const [activeSection, setActiveSection] = useState("intro");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageSet, setCurrentImageSet] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = [
    { id: "intro", title: "Introduction" },
    { id: "key-features", title: "Key features" },
    { id: "projects", title: "Organize with projects" },
    { id: "developers", title: "Built for developers" },
    { id: "themes", title: "Three beautiful themes" },
    { id: "timer", title: "Built-in Pomodoro timer" },
    { id: "mobile", title: "Works on mobile" },
    { id: "realtime", title: "Real-time sync with Convex" },
    { id: "opensource", title: "Open source" },
  ];

  const imageGalleries = {
    intro: [
      "/launchimages/tan-mode-task.png",
      "/launchimages/lightmode-task.png",
      "/launchimages/dark-mode-code.png",
    ],
    timer: [
      "/launchimages/timer-modal.png",
      "/launchimages/timer-background.png",
      "/launchimages/timer-no-background.png",
    ],
    mobile: [
      "/launchimages/mobile-dark-mode-.png",
      "/launchimages/mobile-lightmode-sidebar.png",
      "/launchimages/mobile-tan-mode.png",
    ],
  };

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

  const openImageModal = (images: string[], index: number) => {
    setCurrentImageSet(images);
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentImageSet.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + currentImageSet.length) % currentImageSet.length,
    );
  };

  useEffect(() => {
    if (modalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") closeModal();
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "ArrowLeft") prevImage();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [modalOpen]);

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
            <a href="/" onClick={() => setSidebarOpen(false)}>
              Home
            </a>
          </li>
        </ul>
      </nav>

      <div className="launch-container">
        <section id="intro">
          <h1 className="launch-title">About better-todo</h1>

          <p className="launch-intro">
            An open source, real-time to-do list that never falls out of sync —
            built on Convex.
          </p>

          <div className="launch-video-container">
            <video
              className="launch-video"
              controls
              preload="metadata"
              poster="/launchimages/tan-mode-task.png"
            >
              <source src="/launchimages/demo-video-v1.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="launch-screenshots">
            {imageGalleries.intro.map((img, idx) => (
              <div
                key={idx}
                className="screenshot-item"
                onClick={() => openImageModal(imageGalleries.intro, idx)}
              >
                <img src={img} alt={`Screenshot ${idx + 1}`} />
              </div>
            ))}
          </div>
        </section>

        <section id="key-features" className="launch-section">
          <h2 className="section-title">Key features</h2>
          <p>
            Better-todo is an open source to-do list built with React and Convex
            for developers and busy people who need a reliable, distraction-free
            task manager.
          </p>
          <ul className="feature-list">
            <li>No AI assistants - just your todos and focus</li>
            <li>Real-time synchronization across all your devices</li>
            <li>Notion-style inline input - type directly to add todos</li>
            <li>Daily notes with syntax-highlighted code blocks</li>
            <li>Drag and drop reordering with intuitive handles</li>
            <li>Full-text search across all todos and notes</li>
            <li>Three themes: Dark, Light, and Tan with smooth transitions</li>
            <li>Mobile-optimized with touch-friendly interface</li>
            <li>Archive and bulk actions for easy management</li>
            <li>Built-in Pomodoro timer for productivity</li>
          </ul>
        </section>

        <section id="projects" className="launch-section">
          <h2 className="section-title">Organize with projects</h2>
          <p>
            Group related dates into projects for better organization. Whether
            you're tracking a sprint, planning a launch, or managing multiple
            initiatives, projects help you keep everything organized in the
            sidebar.
          </p>
          <p>
            Create custom projects, add dates to them, and collapse or expand
            them as needed. Projects sync in real-time across all your devices
            for authenticated users, making it easy to stay organized wherever
            you work.
          </p>
        </section>

        <section id="developers" className="launch-section">
          <h2 className="section-title">Built for developers</h2>
          <p>
            Better-todo supports code blocks with syntax highlighting for
            JavaScript, TypeScript, CSS, HTML, JSON, Python, Go, and Rust. Take
            notes with actual code snippets in your daily workflow.
          </p>
          <p>
            Every feature is designed to get out of your way and let you focus
            on what matters. No complicated AI features, no unnecessary
            complexity - just a clean, fast to-do list that works.
          </p>
        </section>

        <section id="themes" className="launch-section">
          <h2 className="section-title">Three beautiful themes</h2>
          <p>
            Choose between Dark mode with deep grays and green accents for
            comfortable low-light viewing, Light mode with crisp whites and blue
            accents for bright environments, or Tan mode with warm beige tones
            and orange accents designed specifically to reduce eye strain during
            long work sessions.
          </p>
          <p>
            All three themes support full feature parity with smooth
            transitions, letting you switch based on your environment and
            preference without losing any functionality.
          </p>
        </section>

        <section id="timer" className="launch-section">
          <h2 className="section-title">Built-in Pomodoro timer</h2>
          <p>
            Stay focused with the built-in Pomodoro timer. Features include
            audio notifications, full-screen mode with optional background
            images, and customizable work intervals.
          </p>
          <div className="launch-screenshots-timer">
            {imageGalleries.timer.map((img, idx) => (
              <div
                key={idx}
                className="screenshot-item"
                onClick={() => openImageModal(imageGalleries.timer, idx)}
              >
                <img src={img} alt={`Timer screenshot ${idx + 1}`} />
              </div>
            ))}
          </div>
        </section>

        <section id="mobile" className="launch-section">
          <h2 className="section-title">Works on mobile</h2>
          <p>
            Better-todo is fully optimized for mobile devices with
            touch-friendly controls, auto-hiding sidebar, and a Progressive Web
            App that can be installed on your home screen for native app
            experience.
          </p>
          <div className="launch-screenshots-mobile">
            {imageGalleries.mobile.map((img, idx) => (
              <div
                key={idx}
                className="screenshot-item-mobile"
                onClick={() => openImageModal(imageGalleries.mobile, idx)}
              >
                <img src={img} alt={`Mobile screenshot ${idx + 1}`} />
              </div>
            ))}
          </div>
        </section>

        <section id="realtime" className="launch-section">
          <h2 className="section-title">Real-time sync with Convex</h2>
          <p>
            Built on Convex, better-todo provides real-time synchronization
            across all your devices. Your todos and notes update instantly
            without any manual refresh - what you type on one device appears
            immediately on another.
          </p>
          <p>
            Convex handles all the backend complexity, providing a reliable
            database that syncs changes in milliseconds.
          </p>
        </section>

        <section id="opensource" className="launch-section">
          <h2 className="section-title">Open source</h2>
          <p>
            Better-todo is fully open source and available on GitHub. Built with
            React, TypeScript, Vite, and Convex, the entire codebase is
            available for contribution, and learning.
          </p>
          <p>
            The app is MIT licensed, so you're free to use it for personal or
            commercial purposes. Contributions, bug reports, and feature
            requests are always welcome.
          </p>
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

      {modalOpen && (
        <div className="image-modal-overlay" onClick={closeModal}>
          <button className="image-modal-close" onClick={closeModal}>
            <X size={24} />
          </button>
          <button className="image-modal-nav prev" onClick={prevImage}>
            <ChevronLeft size={32} />
          </button>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImageSet[currentImageIndex]}
              alt={`Screenshot ${currentImageIndex + 1}`}
            />
            <div className="image-modal-counter">
              {currentImageIndex + 1} / {currentImageSet.length}
            </div>
          </div>
          <button className="image-modal-nav next" onClick={nextImage}>
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </div>
  );
}
