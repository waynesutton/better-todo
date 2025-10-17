import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { SearchModal } from "./components/SearchModal";
import { format } from "date-fns";
import { Search, Menu } from "lucide-react";
import "./styles/global.css";

function App() {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  // Check if mobile on initial load (hide sidebar completely by default on mobile)
  const isMobile = window.innerWidth <= 768;
  const [sidebarHidden, setSidebarHidden] = useState(isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fetch available dates and todos
  const availableDates = useQuery(api.todos.getAvailableDates);
  const pinnedTodos = useQuery(api.todos.getPinnedTodos);
  const todos = useQuery(
    api.todos.getTodosByDate,
    selectedDate === "pinned" ? "skip" : { date: selectedDate },
  );

  // Ensure current date is always available
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (
      availableDates &&
      !availableDates.includes(today) &&
      selectedDate === today
    ) {
      // Current date will be created when first todo is added
    }
  }, [availableDates, selectedDate]);

  // Show all dates including today if not in list
  const allDates = React.useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const dates = availableDates || [];

    if (!dates.includes(today)) {
      return [today, ...dates];
    }
    return dates;
  }, [availableDates]);

  // Handle keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Don't show loading for data that will arrive quickly with Convex
  if (availableDates === undefined) {
    return null;
  }

  const formatCurrentDate = () => {
    if (selectedDate === "pinned") {
      return "Pinned";
    }

    const date = new Date(selectedDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Determine which todos to display
  const displayTodos =
    selectedDate === "pinned" ? pinnedTodos || [] : todos || [];

  return (
    <div
      className={`app-container ${sidebarHidden ? "sidebar-hidden" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <div
        ref={sidebarRef}
        className="sidebar"
        style={{
          width: sidebarCollapsed ? "60px" : `${sidebarWidth}px`,
          transform: sidebarHidden ? "translateX(-100%)" : "translateX(0)",
        }}
      >
        <Sidebar
          dates={allDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>
      {!sidebarHidden && !sidebarCollapsed && (
        <div
          className="sidebar-resizer"
          onMouseDown={() => setIsResizing(true)}
        />
      )}

      <div className="main-content">
        <div className="main-header">
          <div className="main-header-left">
            {sidebarHidden && (
              <button
                className="hamburger-button"
                onClick={() => setSidebarHidden(false)}
                title="Open sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="current-date">{formatCurrentDate()}</div>
          </div>
          <button
            className="search-button"
            onClick={() => setSearchModalOpen(true)}
            title="Search (Cmd+K)"
          >
            <Search size={18} />
          </button>
        </div>

        <TodoList
          todos={displayTodos}
          date={selectedDate}
          expandedNoteId={expandedNoteId}
          onNoteExpanded={() => setExpandedNoteId(null)}
          isPinnedView={selectedDate === "pinned"}
        />
      </div>
      {/* Overlay for mobile - clicking closes sidebar */}
      {!sidebarHidden && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarHidden(true)}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectDate={(date, noteId) => {
          setSelectedDate(date);
          // If a note was selected, set it to be expanded
          if (noteId) {
            setExpandedNoteId(noteId);
          }
          // Close sidebar on mobile after selecting from search
          if (window.innerWidth <= 768) {
            setSidebarHidden(true);
          }
        }}
      />
    </div>
  );
}

export default App;
