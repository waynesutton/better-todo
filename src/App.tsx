import React, { useState, useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { SignIn, SignUp, UserProfile, SignOutButton } from "@clerk/clerk-react";
import { api } from "../convex/_generated/api";
import { Sidebar } from "./components/Sidebar";
import { TodoList, TodoListRef } from "./components/TodoList";
import { SearchModal } from "./components/SearchModal";
import { ArchiveSection } from "./components/ArchiveSection";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { FullPageNoteView } from "./components/FullPageNoteView";
import { FullPageNoteTabs } from "./components/FullPageNoteTabs";
import { Launch } from "./pages/Launch";
import { Changelog } from "./pages/Changelog";
import { NotFound } from "./pages/NotFound";
import { Stats } from "./pages/Stats";
import { format } from "date-fns";
import { Search, Menu, X } from "lucide-react";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  CheckboxIcon,
} from "@radix-ui/react-icons";
import { Id } from "../convex/_generated/dataModel";
import { useTheme } from "./context/ThemeContext";
import { triggerSelectionHaptic, triggerSuccessHaptic } from "./lib/haptics";
import "./styles/global.css";

function App() {
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const { theme } = useTheme();

  // Fetch user preferences for font size
  const userPreferences = useQuery(
    api.users.getUserPreferences,
    isAuthenticated ? undefined : "skip"
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedFolder, setSelectedFolder] = useState<Id<"folders"> | null>(
    null
  );
  // Check if mobile on initial load (hide sidebar completely by default on mobile)
  const isMobile = window.innerWidth <= 768;
  const [sidebarHidden, setSidebarHidden] = useState(isMobile);

  // Track the last known date to detect when a new day starts
  const lastKnownDateRef = useRef<string>(format(new Date(), "yyyy-MM-dd"));

  // Auto-switch to today when a new day starts (but don't interfere with manual date selection)
  useEffect(() => {
    const checkForNewDay = () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const lastKnownDate = lastKnownDateRef.current;

      // Only auto-switch if the actual calendar day changed (not just user navigation)
      if (today !== lastKnownDate) {
        lastKnownDateRef.current = today;
        // Only switch to today if user was viewing a regular date (not pinned/backlog)
        if (selectedDate !== "pinned" && selectedDate !== "backlog") {
          setSelectedDate(today);
        }
      }
    };

    // Check every minute for a new day
    const interval = setInterval(checkForNewDay, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [selectedDate]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [confirmDeleteTodo, setConfirmDeleteTodo] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Id<"todos"> | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSignInToSearchModal, setShowSignInToSearchModal] = useState(false);
  const [showSignInToCreateModal, setShowSignInToCreateModal] = useState(false);
  const [showSignInToNoteModal, setShowSignInToNoteModal] = useState(false);
  const [showSignInToMenuModal, setShowSignInToMenuModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const todoInputRef = useRef<HTMLTextAreaElement>(null);
  const todoListRef = useRef<TodoListRef>(null);
  const [focusedTodoIndex, setFocusedTodoIndex] = useState(-1);
  const [lastCompletedTodo, setLastCompletedTodo] =
    useState<Id<"todos"> | null>(null);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const [hoveredTodoId, setHoveredTodoId] = useState<Id<"todos"> | null>(null);
  const [openMenuForTodoId, setOpenMenuForTodoId] =
    useState<Id<"todos"> | null>(null);
  const [openMenuTrigger, setOpenMenuTrigger] = useState<number>(0);

  // new useState for opening pomodoro for respective todo
  const [pomodoroTriggered, setPomodoroTriggered] = useState<{
    todoId?: string;
    todoTitle?: string;
  } | null>(null);

  // Pull to refresh state
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Demo mode for logged out users (max 3 todos, no persistence)
  const [demoTodos, setDemoTodos] = useState<any[]>([]);

  // Full-page notes state
  const [showFullPageNotes, setShowFullPageNotes] = useState(false);
  const [openFullPageNoteTabs, setOpenFullPageNoteTabs] = useState<
    Array<Id<"fullPageNotes">>
  >([]);
  const [selectedFullPageNoteId, setSelectedFullPageNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [isFullscreenNotes, setIsFullscreenNotes] = useState(false);

  // Apply user's custom font size to todo text and full-page notes
  useEffect(() => {
    const fontSize = userPreferences?.todoFontSize ?? 12;
    const styleId = "custom-todo-font-size";

    // Remove existing style if present
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Calculate line height based on font size (1.5 line height ratio)
    const lineHeight = Math.round(fontSize * 1.5);

    // Inject new style for todos and full-page notes
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .todo-text { font-size: ${fontSize}px !important; }
      .fullpage-note-textarea { font-size: ${fontSize}px !important; }
      .fullpage-note-display-mode { font-size: ${fontSize}px !important; }
      .note-line-numbers { font-size: ${fontSize}px !important; }
      .note-line-numbers .line-number { height: ${lineHeight}px !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [userPreferences?.todoFontSize]);

  // Mutations for footer actions
  const createTodo = useMutation(api.todos.createTodo);
  const archiveAllTodos = useMutation(api.todos.archiveAllTodos);
  const deleteAllTodos = useMutation(api.todos.deleteAllTodos);
  const deleteAllArchivedTodos = useMutation(api.todos.deleteAllArchivedTodos);
  const archiveAllTodosInFolder = useMutation(
    api.todos.archiveAllTodosInFolder
  );
  const deleteAllTodosInFolder = useMutation(api.todos.deleteAllTodosInFolder);
  const deleteAllArchivedTodosInFolder = useMutation(
    api.todos.deleteAllArchivedTodosInFolder
  );
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const reorderTodos = useMutation(api.todos.reorderTodos);
  const updateTodo = useMutation(api.todos.updateTodo);
  const moveTodoToDate = useMutation(api.todos.moveTodoToDate);
  const createSubtask = useMutation(api.todos.createSubtask);

  // Full-page notes mutations
  const createFullPageNote = useMutation(api.fullPageNotes.createFullPageNote);

  // Fetch available dates and todos (skip if not authenticated)
  const availableDates = useQuery(
    api.todos.getAvailableDates,
    isAuthenticated ? undefined : "skip"
  );
  const pinnedTodos = useQuery(
    api.todos.getPinnedTodos,
    isAuthenticated ? undefined : "skip"
  );
  const backlogTodos = useQuery(
    api.todos.getBacklogTodos,
    isAuthenticated ? undefined : "skip"
  );
  const folderTodos = useQuery(
    api.todos.getTodosByFolder,
    isAuthenticated && selectedFolder ? { folderId: selectedFolder } : "skip"
  );
  const folders = useQuery(
    api.folders.getFolders,
    isAuthenticated ? undefined : "skip"
  );
  const selectedFolderData = folders?.find((f) => f._id === selectedFolder);
  const todos = useQuery(
    api.todos.getTodosByDate,
    isAuthenticated &&
      selectedDate !== "pinned" &&
      selectedDate !== "backlog" &&
      !selectedFolder
      ? { date: selectedDate }
      : "skip"
  );

  // Fetch full-page notes for selected date
  const fullPageNotes = useQuery(
    api.fullPageNotes.getFullPageNotesByDate,
    isAuthenticated &&
      selectedDate !== "pinned" &&
      selectedDate !== "backlog" &&
      !selectedFolder
      ? { date: selectedDate }
      : "skip"
  );

  // Fetch full-page notes for selected folder
  const folderFullPageNotes = useQuery(
    api.fullPageNotes.getFullPageNotesByFolder,
    isAuthenticated && selectedFolder ? { folderId: selectedFolder } : "skip"
  );

  // Fetch full-page notes for all open tabs (including folder notes)
  const openTabNotes = useQuery(
    api.fullPageNotes.getFullPageNotesByIds,
    isAuthenticated && openFullPageNoteTabs.length > 0
      ? { noteIds: openFullPageNoteTabs }
      : "skip"
  );

  // Combine notes from date, folder, and open tabs
  const allFullPageNotes =
    openTabNotes || folderFullPageNotes || fullPageNotes || [];

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

  // Create default first todo for blank dates
  useEffect(() => {
    const createDefaultTodo = async () => {
      // Only for authenticated users on regular dates (not pinned/backlog)
      if (
        !isAuthenticated ||
        selectedDate === "pinned" ||
        selectedDate === "backlog"
      ) {
        return;
      }

      // Check if date is blank (no todos)
      if (todos && todos.length === 0) {
        try {
          await createTodo({
            date: selectedDate,
            content: "what's the priority?",
            type: "todo",
          });
        } catch (error) {
          console.error("Failed to create default todo:", error);
        }
      }
    };

    createDefaultTodo();
  }, [todos, selectedDate, isAuthenticated, createTodo]);

  // Auto-delete default todo when user adds other todos
  useEffect(() => {
    const deleteDefaultTodo = async () => {
      if (!isAuthenticated || !todos || todos.length <= 1) {
        return;
      }

      // Check if there's a default todo and other todos exist
      const defaultTodo = todos.find(
        (t) => t.content === "what's the priority?" && !t.completed
      );

      // If default todo exists and there are other todos, delete the default one
      if (defaultTodo && todos.length > 1) {
        try {
          await deleteTodo({ id: defaultTodo._id });
        } catch (error) {
          console.error("Failed to delete default todo:", error);
        }
      }
    };

    deleteDefaultTodo();
  }, [todos, isAuthenticated, deleteTodo]);

  // Show all dates including today if not in list
  const allDates = React.useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const dates = !authIsLoading && isAuthenticated ? availableDates || [] : [];

    if (!dates.includes(today)) {
      return [today, ...dates];
    }
    return dates;
  }, [availableDates, authIsLoading, isAuthenticated]);

  // Track if dates are still loading (undefined means query in flight)
  const datesAreLoading = isAuthenticated && availableDates === undefined;

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

    if (selectedDate === "backlog") {
      return "Backlog";
    }

    if (selectedFolder && selectedFolderData) {
      return selectedFolderData.name;
    }

    const date = new Date(selectedDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    }

    // On mobile (≤768px), show short format (10/28/25), otherwise show full format
    const isMobileDevice = window.innerWidth <= 768;
    if (isMobileDevice) {
      // Format as MM/DD/YY for mobile
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${month}/${day}/${year}`;
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
        : selectedDate === "backlog"
          ? backlogTodos || []
          : selectedFolder
            ? folderTodos || []
            : todos || []
      : demoTodos;

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
    if (selectedFolder) {
      // Archive all todos in the selected folder
      await archiveAllTodosInFolder({ folderId: selectedFolder });
    } else if (selectedDate !== "pinned" && selectedDate !== "backlog") {
      // Archive all todos for the selected date
      await archiveAllTodos({ date: selectedDate });
    }
    setConfirmArchiveAll(false);
  };

  const handleDeleteAllConfirm = async () => {
    if (selectedFolder) {
      // Delete all todos in the selected folder
      await deleteAllTodosInFolder({ folderId: selectedFolder });
    } else if (selectedDate !== "pinned" && selectedDate !== "backlog") {
      // Delete all todos for the selected date
      await deleteAllTodos({ date: selectedDate });
    }
    setConfirmDeleteAll(false);
  };

  const handleDeleteTodoConfirm = async () => {
    if (todoToDelete) {
      await deleteTodo({ id: todoToDelete });
      // Move focus to next todo or previous if at end
      setFocusedTodoIndex((prev) => {
        if (activeTodos.length <= 1) {
          return -1; // No todos left
        }
        return prev >= activeTodos.length - 1 ? prev - 1 : prev;
      });
      setTodoToDelete(null);
    }
    setConfirmDeleteTodo(false);
  };

  const handleDeleteArchived = async (todoId: Id<"todos">) => {
    await deleteTodo({ id: todoId });
  };

  const handleDeleteAllArchived = async () => {
    if (selectedFolder) {
      // Delete all archived todos in the selected folder
      await deleteAllArchivedTodosInFolder({ folderId: selectedFolder });
    } else if (selectedDate !== "pinned" && selectedDate !== "backlog") {
      // Delete all archived todos for the selected date
      await deleteAllArchivedTodos({ date: selectedDate });
    }
  };

  const handleReorderArchived = async (
    activeId: Id<"todos">,
    overId: Id<"todos">
  ) => {
    // Find the new order based on the overId position
    const overIndex = archivedTodos.findIndex((t) => t._id === overId);
    if (overIndex !== -1) {
      await reorderTodos({ todoId: activeId, newOrder: overIndex });
    }
  };

  const handleMoveArchivedToCustomDate = async (
    todoId: Id<"todos">,
    newDate: string
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

      // Mark todo as done with spacebar or d
      if (e.key === " " || e.key === "d") {
        e.preventDefault();
        if (activeTodos.length > 0 && focusedTodoIndex >= 0) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo && !todo.completed) {
            setLastCompletedTodo(todo._id);
            updateTodo({ id: todo._id, completed: true });
          }
        }
      }

      // Delete focused todo with # (shows confirmation dialog)
      if (e.key === "#") {
        e.preventDefault();
        if (activeTodos.length > 0 && focusedTodoIndex >= 0) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo) {
            setTodoToDelete(todo._id);
            setConfirmDeleteTodo(true);
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

      // Create subtask with s key
      if (e.key === "s") {
        e.preventDefault();
        if (
          activeTodos.length > 0 &&
          focusedTodoIndex >= 0 &&
          isAuthenticated
        ) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo && !todo.completed && !todo.archived) {
            createSubtask({ parentId: todo._id, content: "" });
          }
        }
      }

      // Add new note with Shift + +
      if (e.key === "+" && e.shiftKey) {
        e.preventDefault();
        if (todoListRef.current) {
          todoListRef.current.addNote();
        }
      }

      // Open menu with m key
      if (e.key === "m") {
        e.preventDefault();
        if (activeTodos.length > 0 && focusedTodoIndex >= 0) {
          const todo = activeTodos[focusedTodoIndex];
          if (todo) {
            setOpenMenuForTodoId(todo._id);
            setOpenMenuTrigger(Date.now());
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

      // Navigate todos with Tab (when not in input field and todo is focused)
      if (
        e.key === "Tab" &&
        focusedTodoIndex >= 0 &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab - navigate to previous todo (like ArrowUp)
          setFocusedTodoIndex((prev) => {
            if (prev === -1) {
              return activeTodos.length - 1;
            }
            return prev <= 0 ? activeTodos.length - 1 : prev - 1;
          });
        } else {
          // Tab - navigate to next todo (like ArrowDown)
          setFocusedTodoIndex((prev) => {
            if (prev === -1) {
              return 0;
            }
            return prev >= activeTodos.length - 1 ? 0 : prev + 1;
          });
        }
      }

      // Undo last completed todo with z
      if (e.key === "z") {
        e.preventDefault();
        if (lastCompletedTodo) {
          updateTodo({ id: lastCompletedTodo, completed: false });
          setLastCompletedTodo(null);
        }
      }

      // Jump to today with t
      if (e.key === "t") {
        e.preventDefault();
        const today = format(new Date(), "yyyy-MM-dd");
        setSelectedDate(today);
        setSelectedFolder(null);
        setShowFullPageNotes(false); // Exit full page notes view if active
        // Hide sidebar on mobile to show main content
        if (window.innerWidth <= 768) {
          setSidebarHidden(true);
        }
        // Scroll to top of main content
        window.scrollTo({ top: 0, behavior: "smooth" });
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
        setShowInfoModal(false);
        // Close full-page notes view if open
        if (showFullPageNotes) {
          setShowFullPageNotes(false);
          setSelectedFullPageNoteId(null);
          setOpenFullPageNoteTabs([]);
          setIsFullscreenNotes(false);
        }
        // Clear todo focus when pressing Escape
        setFocusedTodoIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTodos,
    focusedTodoIndex,
    lastCompletedTodo,
    isAuthenticated,
    showFullPageNotes,
  ]);

  // Reset focused index when todos change
  useEffect(() => {
    if (focusedTodoIndex >= activeTodos.length) {
      setFocusedTodoIndex(Math.max(0, activeTodos.length - 1));
    }
  }, [activeTodos.length, focusedTodoIndex]);

  // Prevent default pull-to-refresh on iOS Safari
  useEffect(() => {
    // Prevent pull-to-refresh on body
    const preventPullToRefresh = (e: TouchEvent) => {
      // Only prevent if at the top of the page and pulling down
      if (window.scrollY === 0 && e.touches[0].clientY > 0) {
        const touchY = e.touches[0].clientY;
        const initialTouchY = e.touches[0].clientY;

        if (touchY > initialTouchY) {
          e.preventDefault();
        }
      }
    };

    document.body.addEventListener("touchmove", preventPullToRefresh, {
      passive: false,
    });

    return () => {
      document.body.removeEventListener("touchmove", preventPullToRefresh);
    };
  }, []);

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
      colorPrimary:
        theme === "dark"
          ? "#ffffff"
          : theme === "light"
            ? "#000000"
            : theme === "tan"
              ? "#1a1a1a"
              : theme === "cloud"
                ? "#171717"
                : "#000000",
      colorBackground:
        theme === "dark"
          ? "#2E3842"
          : theme === "light"
            ? "#ffffff"
            : theme === "tan"
              ? "#faf8f5"
              : theme === "cloud"
                ? "#ededed"
                : "#ffffff",
      colorText:
        theme === "dark"
          ? "#ffffff"
          : theme === "light"
            ? "#000000"
            : theme === "tan"
              ? "#1a1a1a"
              : theme === "cloud"
                ? "#171717"
                : "#000000",
      borderRadius: "4px",
    },
  };

  return (
    <>
      <div
        className={`app-container ${sidebarHidden ? "sidebar-hidden" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {/* Hide sidebar when in fullscreen mode */}
        {!isFullscreenNotes && (
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
              onSelectDate={(date) => {
                setSelectedDate(date);
                // Clear folder selection when selecting a date
                setSelectedFolder(null);
                // Close full-page notes view when selecting a date
                setShowFullPageNotes(false);
                setSelectedFullPageNoteId(null);
              }}
              selectedFolder={selectedFolder}
              onSelectFolder={(folderId) => {
                setSelectedFolder(folderId);
                // Clear date selection when selecting a folder (except pinned/backlog)
                if (selectedDate !== "pinned" && selectedDate !== "backlog") {
                  setSelectedDate("");
                }
                // Close full-page notes view when selecting a folder
                setShowFullPageNotes(false);
                setSelectedFullPageNoteId(null);
              }}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
              onOpenSignUp={() => setShowSignUpModal(true)}
              onOpenProfile={() => setShowProfileModal(true)}
              onShowInfo={() => setShowInfoModal(true)}
              onOpenFullPageNote={(noteId, date, folderId) => {
                // Navigate to the date or folder and open the full-page note
                // If date is provided (note is attached to a date), navigate to it
                if (date) {
                  setSelectedDate(date);
                  setSelectedFolder(null);
                } else if (folderId) {
                  // Note is in a folder - select the folder
                  setSelectedFolder(folderId);
                  setSelectedDate("");
                }
                // Add the note as a tab if it's not already open, otherwise just select it
                setOpenFullPageNoteTabs((prev) =>
                  prev.includes(noteId) ? prev : [...prev, noteId]
                );
                setSelectedFullPageNoteId(noteId);
                setShowFullPageNotes(true);
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                  setSidebarHidden(true);
                }
              }}
              selectedFullPageNoteId={selectedFullPageNoteId}
              datesAreLoading={datesAreLoading}
            />
          </div>
        )}
        {!isFullscreenNotes && !sidebarHidden && !sidebarCollapsed && (
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
          {/* Hide header when in fullscreen mode */}
          {!isFullscreenNotes && (
            <div className="main-header">
              <div className="main-header-left">
                {sidebarHidden && (
                  <button
                    className="hamburger-button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      setSidebarHidden(false);
                    }}
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
                    triggerSelectionHaptic();

                    // If on full-page note view, copy the note content
                    if (showFullPageNotes && selectedFullPageNoteId) {
                      const currentNote = allFullPageNotes.find(
                        (note) => note._id === selectedFullPageNoteId
                      );
                      if (currentNote && currentNote.content) {
                        navigator.clipboard
                          .writeText(currentNote.content)
                          .then(() => {
                            triggerSuccessHaptic();
                            setShowCopyConfirmation(true);
                            setTimeout(() => {
                              setShowCopyConfirmation(false);
                            }, 2000);
                          })
                          .catch((err) => {
                            console.error("Failed to copy note:", err);
                          });
                      }
                    } else {
                      // Otherwise, copy all unchecked (incomplete) todos to clipboard
                      const incompleteTodos = activeTodos.filter(
                        (todo) => !todo.completed
                      );
                      const todoText = incompleteTodos
                        .map((todo) => `- ${todo.content}`)
                        .join("\n");

                      if (todoText) {
                        navigator.clipboard
                          .writeText(todoText)
                          .then(() => {
                            triggerSuccessHaptic();
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
                    }
                  }}
                  title={
                    showFullPageNotes && selectedFullPageNoteId
                      ? "Copy note content"
                      : "Copy unchecked todos"
                  }
                >
                  {showCopyConfirmation ? (
                    <CheckIcon style={{ width: 18, height: 18 }} />
                  ) : (
                    <CopyIcon style={{ width: 18, height: 18 }} />
                  )}
                </button>
                {/* Back button - show when in full-page notes view */}
                {showFullPageNotes && (
                  <button
                    className="search-button"
                    onClick={() => {
                      triggerSelectionHaptic();
                      // Close full-page notes view and stay on the same date/folder
                      // No need to navigate elsewhere - just hide the notes view
                      setShowFullPageNotes(false);
                      setSelectedFullPageNoteId(null);
                      setIsFullscreenNotes(false);
                    }}
                    title="Back to todos"
                  >
                    <CheckboxIcon style={{ width: 18, height: 18 }} />
                  </button>
                )}
                {/* Full-page notes icon - show on regular date pages and folders */}
                {selectedDate !== "pinned" &&
                  selectedDate !== "backlog" &&
                  !showFullPageNotes && (
                    <button
                      className="search-button"
                      onClick={async () => {
                        triggerSelectionHaptic();
                        if (!authIsLoading && isAuthenticated) {
                          // Get notes based on whether we're viewing a folder or a date
                          const notesToView = selectedFolder
                            ? folderFullPageNotes
                            : fullPageNotes;

                          // If there are existing notes, open the first one
                          if (notesToView && notesToView.length > 0) {
                            const firstNote = notesToView[0];
                            if (!openFullPageNoteTabs.includes(firstNote._id)) {
                              setOpenFullPageNoteTabs((prev) => [
                                ...prev,
                                firstNote._id,
                              ]);
                            }
                            setSelectedFullPageNoteId(firstNote._id);
                            setShowFullPageNotes(true);
                          } else {
                            // No notes exist, create a new one
                            const newNoteId = await createFullPageNote(
                              selectedFolder
                                ? { folderId: selectedFolder }
                                : { date: selectedDate }
                            );
                            setOpenFullPageNoteTabs([newNoteId]);
                            setSelectedFullPageNoteId(newNoteId);
                            setShowFullPageNotes(true);
                          }
                        } else {
                          setShowSignInToNoteModal(true);
                        }
                      }}
                      title="View full-page notes"
                    >
                      <FileTextIcon style={{ width: 18, height: 18 }} />
                    </button>
                  )}
                <PomodoroTimer
                  triggerData={pomodoroTriggered}
                  openOnTrigger={true}
                  onClearTrigger={() => setPomodoroTriggered(null)}
                />
                <button
                  className="search-button"
                  onClick={() => {
                    triggerSelectionHaptic();
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
          )}

          {!authIsLoading && !isAuthenticated && (
            <div
              style={{
                padding: "12px 24px",
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
            {!authIsLoading && !isAuthenticated ? (
              <div className="logged-out-two-column-layout">
                <div className="logged-out-left-column">
                  <div className="feature-showcase">
                    <div className="feature-showcase-box">
                      <h2 className="feature-showcase-title">better todo</h2>
                      <p className="feature-showcase-description">
                        An open source, real-time to-do list that never falls
                        out of sync — built on Convex.
                      </p>
                      <div style={{ marginBottom: "16px" }}>
                        <a href="/about" className="footer-link about-link">
                          About{" "}
                          <ExternalLinkIcon
                            style={{
                              display: "inline",
                              marginLeft: "4px",
                              verticalAlign: "middle",
                            }}
                          />
                        </a>
                      </div>
                      <ul className="feature-showcase-list">
                        <li>No AI assistants - just your todos and focus</li>
                        <li>
                          Real-time synchronization across all your devices
                        </li>
                        <li>
                          Notion-style inline input - type directly to add todos
                        </li>
                        <li>Daily notes with syntax-highlighted code blocks</li>
                        <li>Drag and drop reordering with intuitive handles</li>
                        <li>Full-text search across all todos and notes</li>
                        <li>Dark and light themes with smooth transitions</li>
                        <li>Mobile-optimized with touch-friendly interface</li>
                        <li>Archive and bulk actions for easy management</li>
                        <li>Built-in Pomodoro timer for productivity</li>
                      </ul>
                      <div
                        style={{
                          marginTop: "24px",
                          display: "flex",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <a
                          href="https://github.com/waynesutton/better-todo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="footer-link"
                        >
                          Open-Source Project
                        </a>
                        <a
                          href="https://www.convex.dev/legal/tos/v2022-03-02"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="footer-link"
                        >
                          Privacy Policy | Terms
                        </a>
                      </div>
                      <div className="feature-showcase-buttons">
                        <button
                          onClick={() => setShowSignUpModal(true)}
                          className="feature-showcase-button feature-showcase-button-primary"
                        >
                          Sign Up
                        </button>
                        <button
                          onClick={() => setShowSignInModal(true)}
                          className="feature-showcase-button feature-showcase-button-secondary"
                        >
                          Sign In
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="logged-out-right-column">
                  <div className="logged-out-demo-section">
                    <p className="logged-out-demo-text">
                      Try creating up to 3 todos below (saved locally until you
                      sign up)
                    </p>
                  </div>
                  <TodoList
                    ref={todoListRef}
                    todos={displayTodos}
                    date={selectedDate}
                    folderId={selectedFolder}
                    folders={folders}
                    expandedNoteId={expandedNoteId}
                    onNoteExpanded={() => setExpandedNoteId(null)}
                    isPinnedView={selectedDate === "pinned"}
                    isBacklogView={selectedDate === "backlog"}
                    todoInputRef={todoInputRef}
                    focusedTodoIndex={focusedTodoIndex}
                    onRequireSignIn={() => setShowSignInToCreateModal(true)}
                    onRequireSignInForNote={() =>
                      setShowSignInToNoteModal(true)
                    }
                    onRequireSignInForMenu={() =>
                      setShowSignInToMenuModal(true)
                    }
                    onTodoHover={setHoveredTodoId}
                    openMenuForTodoId={openMenuForTodoId}
                    openMenuTrigger={openMenuTrigger}
                    isDemoMode={!authIsLoading && !isAuthenticated}
                    demoTodos={demoTodos}
                    setDemoTodos={setDemoTodos}
                    isAuthenticated={!authIsLoading && isAuthenticated}
                    setPomodoroTriggered={setPomodoroTriggered} // New
                  />
                </div>
              </div>
            ) : showFullPageNotes && selectedFullPageNoteId ? (
              <div className={isFullscreenNotes ? "fullscreen-mode" : ""}>
                {/* Full-page notes tabs */}
                <FullPageNoteTabs
                  notes={allFullPageNotes}
                  openTabIds={openFullPageNoteTabs}
                  selectedNoteId={selectedFullPageNoteId}
                  onSelectNote={(noteId) => {
                    setSelectedFullPageNoteId(noteId);
                  }}
                  onCloseTab={(noteId) => {
                    const newTabs = openFullPageNoteTabs.filter(
                      (id) => id !== noteId
                    );
                    setOpenFullPageNoteTabs(newTabs);
                    // If closing the selected tab, select the previous tab or exit full-page view
                    if (noteId === selectedFullPageNoteId) {
                      if (newTabs.length > 0) {
                        setSelectedFullPageNoteId(newTabs[newTabs.length - 1]);
                      } else {
                        setShowFullPageNotes(false);
                        setSelectedFullPageNoteId(null);
                        setIsFullscreenNotes(false);
                      }
                    }
                    // Note: X button only closes the tab, does NOT delete the note
                    // The note remains in the database and sidebar
                  }}
                  onCreateNote={async () => {
                    // Determine if we're creating a note in a folder or for a date
                    const selectedNote = allFullPageNotes.find(
                      (note) => note._id === selectedFullPageNoteId
                    );

                    // Block creation if note is in an archived folder
                    if (selectedNote?.folderId && selectedNote.archived) {
                      return; // Don't allow creating notes in archived folders
                    }

                    if (selectedNote?.folderId) {
                      // Create note in the same folder
                      const newNoteId = await createFullPageNote({
                        folderId: selectedNote.folderId,
                      });
                      setOpenFullPageNoteTabs((prev) => [...prev, newNoteId]);
                      setSelectedFullPageNoteId(newNoteId);
                    } else {
                      // Create note for the selected date
                      const newNoteId = await createFullPageNote({
                        date: selectedDate,
                      });
                      setOpenFullPageNoteTabs((prev) => [...prev, newNoteId]);
                      setSelectedFullPageNoteId(newNoteId);
                    }
                  }}
                  onBackToTodos={() => {
                    setShowFullPageNotes(false);
                    setSelectedFullPageNoteId(null);
                    setIsFullscreenNotes(false);
                  }}
                  isFullscreen={isFullscreenNotes}
                  onToggleFullscreen={() =>
                    setIsFullscreenNotes(!isFullscreenNotes)
                  }
                />
                {/* Full-page note view */}
                {selectedFullPageNoteId && (
                  <FullPageNoteView
                    key={selectedFullPageNoteId}
                    noteId={selectedFullPageNoteId}
                  />
                )}
              </div>
            ) : (
              <TodoList
                ref={todoListRef}
                todos={displayTodos}
                date={selectedDate}
                folderId={selectedFolder}
                folders={folders}
                expandedNoteId={expandedNoteId}
                onNoteExpanded={() => setExpandedNoteId(null)}
                isPinnedView={selectedDate === "pinned"}
                isBacklogView={selectedDate === "backlog"}
                todoInputRef={todoInputRef}
                focusedTodoIndex={focusedTodoIndex}
                onRequireSignIn={() => setShowSignInToCreateModal(true)}
                onRequireSignInForNote={() => setShowSignInToNoteModal(true)}
                onRequireSignInForMenu={() => setShowSignInToMenuModal(true)}
                onTodoHover={setHoveredTodoId}
                openMenuForTodoId={openMenuForTodoId}
                openMenuTrigger={openMenuTrigger}
                isDemoMode={!authIsLoading && !isAuthenticated}
                demoTodos={demoTodos}
                setDemoTodos={setDemoTodos}
                isAuthenticated={!authIsLoading && isAuthenticated}
                setPomodoroTriggered={setPomodoroTriggered} // New
              />
            )}
          </div>

          {/* Sticky footer with archive and bulk actions */}
          <div className="main-content-footer">
            {/* Archive section - only show for authenticated users and not on full-page notes view */}
            {!showFullPageNotes &&
              archivedTodos.length > 0 &&
              isAuthenticated && (
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

            {/* Bulk action buttons - hide on full-page notes view */}
            {!showFullPageNotes &&
              activeTodos.length > 0 &&
              selectedDate !== "pinned" &&
              selectedDate !== "backlog" &&
              isAuthenticated &&
              (selectedFolder || selectedDate) && (
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
          onSelectDate={(date, noteId, fullPageNoteId) => {
            // Only set date if it's not empty (folder notes have empty date)
            if (date) {
              setSelectedDate(date);
              setSelectedFolder(null);
            }
            // If a full-page note was selected, open it
            if (fullPageNoteId) {
              // Check if note is in a folder
              const note = allFullPageNotes.find(
                (n) => n._id === fullPageNoteId
              );
              if (note?.folderId) {
                setSelectedFolder(note.folderId);
                setSelectedDate("");
              }
              setOpenFullPageNoteTabs((prev) =>
                prev.includes(fullPageNoteId) ? prev : [...prev, fullPageNoteId]
              );
              setSelectedFullPageNoteId(fullPageNoteId);
              setShowFullPageNotes(true);
            }
            // If a regular note was selected, set it to be expanded
            else if (noteId) {
              setExpandedNoteId(noteId);
              setShowFullPageNotes(false);
            }
            // Otherwise, just navigate to the date
            else {
              setShowFullPageNotes(false);
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

        <ConfirmDialog
          isOpen={confirmDeleteTodo}
          title="Delete Todo"
          message="Are you sure you want to delete this todo? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteTodoConfirm}
          onCancel={() => {
            setConfirmDeleteTodo(false);
            setTodoToDelete(null);
          }}
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

        {/* Sign In To Use Menu Actions Modal */}
        <ConfirmDialog
          isOpen={showSignInToMenuModal}
          title="Sign In to Use Menu Actions"
          message="Menu actions require an account. Sign in to pin, move, delete, and manage your todos."
          confirmText="Sign Up"
          cancelText="Cancel"
          onConfirm={() => {
            setShowSignInToMenuModal(false);
            setShowSignUpModal(true);
          }}
          onCancel={() => setShowSignInToMenuModal(false)}
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

        {/* Info Modal */}
        {showInfoModal && (
          <div
            className="search-overlay"
            onClick={() => setShowInfoModal(false)}
          >
            <div
              className="clerk-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "600px", position: "relative" }}
            >
              {/* Close Button */}
              <button
                className="clerk-close-button"
                onClick={() => setShowInfoModal(false)}
                title="Close"
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  zIndex: 10,
                }}
              >
                <X size={20} />
              </button>

              <div style={{ padding: "32px" }}>
                <h2 className="feature-showcase-title">better todo</h2>

                <p className="feature-showcase-description">
                  An open source, real-time to-do list that never falls out of
                  sync — built on Convex.
                </p>
                <div style={{ marginBottom: "16px" }}>
                  <a href="/about" className="footer-link about-link">
                    About{" "}
                    <ExternalLinkIcon
                      style={{
                        display: "inline",
                        marginLeft: "4px",
                        verticalAlign: "middle",
                      }}
                    />
                  </a>
                </div>
                <ul className="feature-showcase-list">
                  <li>No AI assistants - just your todos and focus</li>
                  <li>Real-time synchronization across all your devices</li>
                  <li>
                    Notion-style inline input - type directly to add todos
                  </li>
                  <li>Daily notes with syntax-highlighted code blocks</li>
                  <li>Drag and drop reordering with intuitive handles</li>
                  <li>Full-text search across all todos and notes</li>
                  <li>Dark and light themes with smooth transitions</li>
                  <li>Mobile-optimized with touch-friendly interface</li>
                  <li>Archive and bulk actions for easy management</li>
                  <li>Built-in Pomodoro timer for productivity</li>
                </ul>
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href="https://github.com/waynesutton/better-todo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Open-Source Project
                  </a>
                  <a
                    href="https://www.convex.dev/legal/tos/v2022-03-02"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    Privacy Policy | Terms
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Router wrapper
function AppRouter() {
  return (
    <Routes>
      <Route path="/launch" element={<Launch />} />
      <Route path="/about" element={<Launch />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/" element={<App />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRouter;
