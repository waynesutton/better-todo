import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { SearchModal } from "./components/SearchModal";
import { ArchiveSection } from "./components/ArchiveSection";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { format } from "date-fns";
import { Search, Menu } from "lucide-react";
import { Id } from "../convex/_generated/dataModel";
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
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const todoInputRef = useRef<HTMLTextAreaElement>(null);
  const [focusedTodoIndex, setFocusedTodoIndex] = useState(-1);
  const [lastCompletedTodo, setLastCompletedTodo] =
    useState<Id<"todos"> | null>(null);
  const [focusFirstTodoCallback, setFocusFirstTodoCallback] = useState<
    (() => void) | null
  >(null);

  // Handle focus first todo callback
  const handleFocusFirstTodo = (callback: () => void) => {
    setFocusFirstTodoCallback(() => {
      // Don't set focusedTodoIndex here - only set it when using arrow keys
      callback();
    });
  };

  // Mutations for footer actions
  const archiveAllTodos = useMutation(api.todos.archiveAllTodos);
  const deleteAllTodos = useMutation(api.todos.deleteAllTodos);
  const deleteAllArchivedTodos = useMutation(api.todos.deleteAllArchivedTodos);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const reorderTodos = useMutation(api.todos.reorderTodos);
  const updateTodo = useMutation(api.todos.updateTodo);

  // Fetch available dates and todos
  const availableDates = useQuery(api.todos.getAvailableDates);
  const pinnedTodos = useQuery(api.todos.getPinnedTodos);
  const todos = useQuery(
    api.todos.getTodosByDate,
    selectedDate !== "pinned" ? { date: selectedDate } : "skip",
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

  // Separate archived and active todos
  const activeTodos = displayTodos.filter((t) => !t.archived);
  const archivedTodos = displayTodos.filter((t) => t.archived);

  // Footer action handlers
  const handleArchiveAllConfirm = async () => {
    if (selectedDate !== "pinned") {
      await archiveAllTodos({ date: selectedDate });
    }
    setConfirmArchiveAll(false);
  };

  const handleDeleteAllConfirm = async () => {
    if (selectedDate !== "pinned") {
      await deleteAllTodos({ date: selectedDate });
    }
    setConfirmDeleteAll(false);
  };

  const handleDeleteArchived = async (todoId: Id<"todos">) => {
    await deleteTodo({ id: todoId });
  };

  const handleDeleteAllArchived = async () => {
    if (selectedDate !== "pinned") {
      await deleteAllArchivedTodos({ date: selectedDate });
    }
  };

  const handleReorderArchived = async (
    activeId: Id<"todos">,
    overId: Id<"todos">,
  ) => {
    await reorderTodos({ activeId, overId });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Focus todo input with / or c
      if (e.key === "/" || e.key === "c") {
        e.preventDefault();
        if (todoInputRef.current) {
          todoInputRef.current.focus();
          // Clear todo focus when focusing input
          setFocusedTodoIndex(-1);
        }
      }

      // Mark todo as done with spacebar or e
      if (e.key === " " || e.key === "e") {
        e.preventDefault();
        if (activeTodos.length > 0 && focusedTodoIndex >= 0) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo && !todo.completed) {
            setLastCompletedTodo(todo._id);
            updateTodo({ id: todo._id, completed: true });
          }
        }
      }

      // Navigate todos with up/down arrows
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedTodoIndex((prev) => {
          if (prev === -1) {
            // Start from last todo if no todo is focused
            return activeTodos.length - 1;
          }
          return prev <= 0 ? activeTodos.length - 1 : prev - 1;
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedTodoIndex((prev) => {
          if (prev === -1) {
            // Start from first todo if no todo is focused
            return 0;
          }
          return prev >= activeTodos.length - 1 ? 0 : prev + 1;
        });
      }

      // Undo last completed todo with z
      if (e.key === "z") {
        e.preventDefault();
        if (lastCompletedTodo) {
          updateTodo({ id: lastCompletedTodo, completed: false });
          setLastCompletedTodo(null);
        }
      }

      // Scroll to top with cmd+up
      if (e.key === "ArrowUp" && e.metaKey) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Scroll to bottom with cmd+down
      if (e.key === "ArrowDown" && e.metaKey) {
        e.preventDefault();
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }

      // Show keyboard shortcuts modal with ?
      if (e.key === "?") {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Open search modal with cmd+k
      if (e.key === "k" && e.metaKey) {
        e.preventDefault();
        setSearchModalOpen(true);
      }

      // Close modals with Escape
      if (e.key === "Escape") {
        setShowKeyboardShortcuts(false);
        setSearchModalOpen(false);
        // Clear todo focus when pressing Escape
        setFocusedTodoIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTodos, focusedTodoIndex, lastCompletedTodo]);

  // Reset focused index when todos change
  useEffect(() => {
    if (focusedTodoIndex >= activeTodos.length) {
      setFocusedTodoIndex(Math.max(0, activeTodos.length - 1));
    }
  }, [activeTodos.length, focusedTodoIndex]);

  return (
    <>
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
            onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
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

          <div className="main-content-body">
            <TodoList
              todos={displayTodos}
              date={selectedDate}
              expandedNoteId={expandedNoteId}
              onNoteExpanded={() => setExpandedNoteId(null)}
              isPinnedView={selectedDate === "pinned"}
              todoInputRef={todoInputRef}
              focusedTodoIndex={focusedTodoIndex}
              onFocusFirstTodo={handleFocusFirstTodo}
            />
          </div>

          {/* Sticky footer with archive and bulk actions */}
          <div className="main-content-footer">
            {/* Archive section */}
            {archivedTodos.length > 0 && (
              <ArchiveSection
                archivedTodos={archivedTodos}
                onMoveToPreviousDay={() => {}}
                onMoveToNextDay={() => {}}
                onMoveToTomorrow={() => {}}
                onDeleteArchived={handleDeleteArchived}
                onDeleteAllArchived={handleDeleteAllArchived}
                isExpanded={archiveExpanded}
                onToggleExpanded={() => setArchiveExpanded(!archiveExpanded)}
                onReorderArchived={handleReorderArchived}
              />
            )}

            {/* Bulk action buttons */}
            {activeTodos.length > 0 && selectedDate !== "pinned" && (
              <div className="bulk-actions">
                <button
                  className="bulk-action-button"
                  onClick={() => setConfirmArchiveAll(true)}
                  title="Archive all active todos"
                >
                  Archive All (active todos)
                </button>
                <button
                  className="bulk-action-button danger"
                  onClick={() => setConfirmDeleteAll(true)}
                  title="Delete all active todos"
                >
                  Delete All (active todos)
                </button>
              </div>
            )}
          </div>
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

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />

        {/* Confirmation dialogs */}
        <ConfirmDialog
          isOpen={confirmArchiveAll}
          title="Archive All Todos"
          message={`Are you sure you want to archive all ${activeTodos.length} active todo${activeTodos.length === 1 ? "" : "s"}? You can restore them later from the archive section.`}
          confirmText="Archive All"
          cancelText="Cancel"
          onConfirm={handleArchiveAllConfirm}
          onCancel={() => setConfirmArchiveAll(false)}
          isDangerous={false}
        />

        <ConfirmDialog
          isOpen={confirmDeleteAll}
          title="Delete All Todos"
          message={`Are you sure you want to permanently delete all ${activeTodos.length} active todo${activeTodos.length === 1 ? "" : "s"}? This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          onConfirm={handleDeleteAllConfirm}
          onCancel={() => setConfirmDeleteAll(false)}
          isDangerous={true}
        />
      </div>
    </>
  );
}

export default App;
