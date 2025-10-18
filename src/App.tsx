import React, { useState, useEffect, useRef } from "react";
import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { api } from "../convex/_generated/api";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { SearchModal } from "./components/SearchModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { format } from "date-fns";
import { Search, Menu } from "lucide-react";
import "./styles/global.css";

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const workOSAuth = useAuth();
  const { user, signIn } = workOSAuth;
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Debug WorkOS auth object
  useEffect(() => {
    console.log("WorkOS useAuth() full object:", workOSAuth);
  }, [workOSAuth]);
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
  const storeUser = useMutation(api.users.storeUser);

  // Debug auth state
  useEffect(() => {
    console.log("Auth state:", {
      isLoading,
      isAuthenticated,
      hasWorkOSUser: !!user,
      userEmail: user?.email,
      currentPath: window.location.pathname,
      currentSearch: window.location.search,
    });

    // Check for WorkOS session cookies
    const cookies = document.cookie.split(";").map((c) => c.trim());
    console.log("All cookies:", cookies);
    const workOSCookies = cookies.filter(
      (c) =>
        c.toLowerCase().includes("workos") ||
        c.toLowerCase().includes("session"),
    );
    console.log("WorkOS/Session cookies:", workOSCookies);
  }, [isLoading, isAuthenticated, user]);

  // Redirect from callback to home when authenticated
  useEffect(() => {
    if (
      isAuthenticated &&
      !isLoading &&
      window.location.pathname === "/callback"
    ) {
      window.location.href = "/";
    }
  }, [isAuthenticated, isLoading]);

  // Debug - check if token is being sent
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("convex_token");
      if (token) {
        // Decode JWT to see claims
        const parts = token.split(".");
        if (parts.length === 3) {
          try {
            const decoded = JSON.parse(atob(parts[1]));
            console.log("JWT Claims:", decoded);
            console.log("Has aud claim:", !!decoded.aud);
            console.log("aud value:", decoded.aud);
          } catch (e) {
            console.error("Failed to decode JWT:", e);
          }
        }
      }
    };
    checkToken();
  }, [isAuthenticated, user]);

  // Fetch available dates and todos - only when authenticated
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

  // Store user in Convex when they authenticate
  useEffect(() => {
    if (user && isAuthenticated) {
      storeUser({
        userId: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }).catch((err) => console.error("Failed to store user:", err));
    }
  }, [user, isAuthenticated, storeUser]);

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

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-content">
          <div className="auth-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
            onAuthRequired={() => setShowAuthModal(true)}
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

      {/* Auth Modal - only show when user tries to interact */}
      <ConfirmDialog
        isOpen={showAuthModal}
        title="Sign In Required"
        message="Please sign in to use Better Todo. Your todos and notes will be private and synced across all your devices."
        confirmText="Sign In"
        cancelText="Not Now"
        onConfirm={() => {
          setShowAuthModal(false);
          signIn();
        }}
        onCancel={() => setShowAuthModal(false)}
        isDangerous={false}
      />
    </>
  );
}

export default App;
