import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { SignIn, SignUp, UserProfile, SignOutButton } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { SearchModal } from "./components/SearchModal";
import { ArchiveSection } from "./components/ArchiveSection";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { format } from "date-fns";
import { Search, Menu, X } from "lucide-react";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import { Id } from "../convex/_generated/dataModel";
import { localData } from "./lib/localData";
import { useTheme } from "./context/ThemeContext";
import "./styles/global.css";

function App() {
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { theme } = useTheme();

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
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSignInToSearchModal, setShowSignInToSearchModal] = useState(false);
  const [showSignInToCreateModal, setShowSignInToCreateModal] = useState(false);
  const [showSignInToNoteModal, setShowSignInToNoteModal] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const todoInputRef = useRef<HTMLTextAreaElement>(null);
  const [focusedTodoIndex, setFocusedTodoIndex] = useState(-1);
  const [lastCompletedTodo, setLastCompletedTodo] =
    useState<Id<"todos"> | null>(null);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [hoveredTodoId, setHoveredTodoId] = useState<Id<"todos"> | null>(null);

  // Pull to refresh state
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Local ephemeral data for unsigned users
  const [localTodos, setLocalTodos] = useState<any[]>([]);
  const [localDates, setLocalDates] = useState<string[]>([]);

  // Mutations for footer actions
  const archiveAllTodos = useMutation(api.todos.archiveAllTodos);
  const deleteAllTodos = useMutation(api.todos.deleteAllTodos);
  const deleteAllArchivedTodos = useMutation(api.todos.deleteAllArchivedTodos);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const reorderTodos = useMutation(api.todos.reorderTodos);
  const updateTodo = useMutation(api.todos.updateTodo);
  const moveTodoToDate = useMutation(api.todos.moveTodoToDate);

  // Fetch available dates and todos (skip if not authenticated)
  const availableDates = useQuery(
    api.todos.getAvailableDates,
    isAuthenticated ? undefined : "skip",
  );
  const pinnedTodos = useQuery(
    api.todos.getPinnedTodos,
    isAuthenticated ? undefined : "skip",
  );
  const todos = useQuery(
    api.todos.getTodosByDate,
    isAuthenticated && selectedDate !== "pinned"
      ? { date: selectedDate }
      : "skip",
  );

  // Refresh local data when needed
  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      setLocalTodos(localData.getTodosByDate(selectedDate));
      setLocalDates(localData.getAvailableDates());
    } else if (isAuthenticated) {
      // Clear local data when authenticated
      localData.clear();
      setLocalTodos([]);
      setLocalDates([]);
    }
  }, [selectedDate, authIsLoading, isAuthenticated]);

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
    const dates =
      !authIsLoading && isAuthenticated ? availableDates || [] : localDates;

    if (!dates.includes(today)) {
      return [today, ...dates];
    }
    return dates;
  }, [availableDates, localDates, authIsLoading, isAuthenticated]);

  // Handle keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!authIsLoading && isAuthenticated) {
          setSearchModalOpen(true);
        } else {
          setShowSignInToSearchModal(true);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [authIsLoading, isAuthenticated]);

  // After closing Clerk modals, refresh Clerk user so Sidebar tooltip/profile reflects updates
  useEffect(() => {
    if (!showProfileModal) {
      void user?.reload?.();
    }
  }, [showProfileModal, user]);

  useEffect(() => {
    if (!showSignUpModal) {
      void user?.reload?.();
    }
  }, [showSignUpModal, user]);

  useEffect(() => {
    if (!showSignInModal) {
      void user?.reload?.();
    }
  }, [showSignInModal, user]);

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
    !authIsLoading && isAuthenticated
      ? selectedDate === "pinned"
        ? pinnedTodos || []
        : todos || []
      : localTodos;

  // Separate archived and active todos, sort pinned to the top
  const activeTodos = displayTodos
    .filter((t) => !t.archived)
    .sort((a, b) => {
      // Sort pinned todos to the top
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Keep original order for same pinned status
      return a.order - b.order;
    });
  const archivedTodos = displayTodos.filter((t) => t.archived);

  // Auto-select hovered todo for keyboard shortcuts when not explicitly navigated
  useEffect(() => {
    if (hoveredTodoId && focusedTodoIndex === -1) {
      const index = activeTodos.findIndex((t) => t._id === hoveredTodoId);
      if (index !== -1) {
        setFocusedTodoIndex(index);
      }
    }
  }, [hoveredTodoId, focusedTodoIndex, activeTodos]);

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
    // Find the new order based on the overId position
    const overIndex = archivedTodos.findIndex((t) => t._id === overId);
    if (overIndex !== -1) {
      await reorderTodos({ todoId: activeId, newOrder: overIndex });
    }
  };

  const handleMoveArchivedToCustomDate = async (
    todoId: Id<"todos">,
    newDate: string,
  ) => {
    await moveTodoToDate({ todoId, newDate });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Shift+Tab in textarea to scroll to top
      if (
        e.key === "Tab" &&
        e.shiftKey &&
        e.target instanceof HTMLTextAreaElement
      ) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

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

      // Pin/unpin todo with p key
      if (e.key === "p") {
        e.preventDefault();
        if (activeTodos.length > 0 && focusedTodoIndex >= 0) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo && !todo.completed && !todo.archived) {
            updateTodo({ id: todo._id, pinned: !todo.pinned });
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

  // Pull to refresh functionality for mobile
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    // Check if device is mobile
    const isMobileDevice =
      window.innerWidth <= 768 ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobileDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the scroll
      if (mainContent.scrollTop === 0) {
        setPullStartY(e.touches[0].clientY);
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;

      // Only allow pulling down
      if (distance > 0 && mainContent.scrollTop === 0) {
        setPullDistance(Math.min(distance, 120)); // Max pull distance of 120px

        // Prevent default scroll behavior when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;

      setIsPulling(false);

      // Trigger refresh if pulled more than 80px
      if (pullDistance > 80 && !isRefreshing) {
        setIsRefreshing(true);

        // Show refreshing state for 800ms (visual feedback even though data is realtime)
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 800);
      } else {
        setPullDistance(0);
      }
    };

    mainContent.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    mainContent.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    mainContent.addEventListener("touchend", handleTouchEnd);

    return () => {
      mainContent.removeEventListener("touchstart", handleTouchStart);
      mainContent.removeEventListener("touchmove", handleTouchMove);
      mainContent.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, pullStartY, pullDistance, isRefreshing]);

  // Clerk appearance customization
  const clerkAppearance = {
    variables: {
      colorPrimary: theme === "dark" ? "#ffffff" : "#000000",
      colorBackground: theme === "dark" ? "#2E3842" : "#ffffff",
      colorText: theme === "dark" ? "#ffffff" : "#000000",
      borderRadius: "4px",
    },
  };

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
            onOpenSignIn={() => setShowSignInModal(true)}
            onOpenSignUp={() => setShowSignUpModal(true)}
            onOpenProfile={() => setShowProfileModal(true)}
          />
        </div>
        {!sidebarHidden && !sidebarCollapsed && (
          <div
            className="sidebar-resizer"
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        <div className="main-content" ref={mainContentRef}>
          {/* Pull to refresh indicator */}
          {(pullDistance > 0 || isRefreshing) && (
            <div
              className="pull-to-refresh-indicator"
              style={{
                transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 80, 1),
              }}
            >
              <div
                className={`refresh-spinner ${isRefreshing ? "spinning" : ""}`}
              >
                {isRefreshing ? "↻" : "↓"}
              </div>
            </div>
          )}
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
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="search-button"
                onClick={() => {
                  // Copy all unchecked (incomplete) todos to clipboard
                  const incompleteTodos = activeTodos.filter(
                    (todo) => !todo.completed,
                  );
                  const todoText = incompleteTodos
                    .map((todo) => `- ${todo.content}`)
                    .join("\n");

                  if (todoText) {
                    navigator.clipboard
                      .writeText(todoText)
                      .then(() => {
                        // Show brief success indicator
                        setShowCopyConfirmation(true);
                        setTimeout(() => {
                          setShowCopyConfirmation(false);
                        }, 2000);
                      })
                      .catch((err) => {
                        console.error("Failed to copy todos:", err);
                      });
                  }
                }}
                title="Copy unchecked todos"
              >
                {showCopyConfirmation ? (
                  <CheckIcon style={{ width: 18, height: 18 }} />
                ) : (
                  <CopyIcon style={{ width: 18, height: 18 }} />
                )}
              </button>
              <button
                className="search-button"
                onClick={() => {
                  if (!authIsLoading && isAuthenticated) {
                    setSearchModalOpen(true);
                  } else {
                    setShowSignInToSearchModal(true);
                  }
                }}
                title="Search (Cmd+K)"
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {!authIsLoading && !isAuthenticated && (
            <div
              style={{
                padding: "12px 24px",
                background:
                  theme === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                fontSize: "14px",
                textAlign: "center",
                color:
                  theme === "dark"
                    ? "rgba(255,255,255,0.7)"
                    : "rgba(0,0,0,0.7)",
              }}
            >
              <span>
                <button
                  onClick={() => setShowSignInModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  Sign in
                </button>{" "}
                or{" "}
                <button
                  onClick={() => setShowSignUpModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  sign up
                </button>{" "}
                so you can save your todos and notes.
              </span>
            </div>
          )}

          <div className="main-content-body">
            <TodoList
              todos={displayTodos}
              date={selectedDate}
              expandedNoteId={expandedNoteId}
              onNoteExpanded={() => setExpandedNoteId(null)}
              isPinnedView={selectedDate === "pinned"}
              todoInputRef={todoInputRef}
              focusedTodoIndex={focusedTodoIndex}
              onRequireSignIn={() => setShowSignInToCreateModal(true)}
              onRequireSignInForNote={() => setShowSignInToNoteModal(true)}
              onTodoHover={setHoveredTodoId}
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
                onMoveToCustomDate={handleMoveArchivedToCustomDate}
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

        {/* Sign In To Search Modal */}
        <ConfirmDialog
          isOpen={showSignInToSearchModal}
          title="Sign In to Search"
          message="Search requires an account. Sign in to search your todos and notes."
          confirmText="Sign Up"
          cancelText="Cancel"
          onConfirm={() => {
            setShowSignInToSearchModal(false);
            setShowSignUpModal(true);
          }}
          onCancel={() => setShowSignInToSearchModal(false)}
          isDangerous={false}
        />

        {/* Sign In To Create Modal */}
        <ConfirmDialog
          isOpen={showSignInToCreateModal}
          title="Sign In to Create Todos"
          message="Creating todos requires an account. Sign in to save your todos."
          confirmText="Sign Up"
          cancelText="Cancel"
          onConfirm={() => {
            setShowSignInToCreateModal(false);
            setShowSignUpModal(true);
          }}
          onCancel={() => setShowSignInToCreateModal(false)}
          isDangerous={false}
        />

        {/* Sign In To Note Modal */}
        <ConfirmDialog
          isOpen={showSignInToNoteModal}
          title="Sign In to Create Notes"
          message="Creating notes requires an account. Sign in to save your notes."
          confirmText="Sign Up"
          cancelText="Cancel"
          onConfirm={() => {
            setShowSignInToNoteModal(false);
            setShowSignUpModal(true);
          }}
          onCancel={() => setShowSignInToNoteModal(false)}
          isDangerous={false}
        />

        {/* Clerk Sign In Modal */}
        {showSignInModal && (
          <div
            className="search-overlay"
            onClick={() => setShowSignInModal(false)}
          >
            <div
              className="clerk-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="clerk-close-button"
                onClick={() => setShowSignInModal(false)}
                title="Close sign in"
              >
                <X size={20} />
              </button>

              <SignIn
                appearance={clerkAppearance}
                afterSignInUrl="/"
                routing="hash"
              />
            </div>
          </div>
        )}

        {/* Clerk Sign Up Modal */}
        {showSignUpModal && (
          <div
            className="search-overlay"
            onClick={() => setShowSignUpModal(false)}
          >
            <div
              className="clerk-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="clerk-close-button"
                onClick={() => setShowSignUpModal(false)}
                title="Close sign up"
              >
                <X size={20} />
              </button>

              <SignUp
                appearance={clerkAppearance}
                afterSignInUrl="/"
                afterSignUpUrl="/"
                routing="hash"
              />
            </div>
          </div>
        )}

        {/* Clerk User Profile Modal - only show when authenticated and user is loaded */}
        {showProfileModal && !authIsLoading && isAuthenticated && user && (
          <div
            className="search-overlay"
            onClick={() => setShowProfileModal(false)}
          >
            <div
              className="clerk-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                className="clerk-close-button"
                onClick={() => setShowProfileModal(false)}
                title="Close profile"
              >
                <X size={20} />
              </button>

              <UserProfile appearance={clerkAppearance} routing="hash" />

              {/* Sign Out Button */}
              <div className="clerk-signout-container">
                <SignOutButton>
                  <button className="clerk-signout-button">Sign Out</button>
                </SignOutButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
