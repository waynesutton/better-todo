import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { format, addDays, subDays } from "date-fns";
import { PanelLeft, Pin } from "lucide-react";
import { KeyboardIcon } from "@radix-ui/react-icons";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface SidebarProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onShowKeyboardShortcuts?: () => void;
  onOpenSignIn?: () => void;
  onOpenSignUp?: () => void;
  onOpenProfile?: () => void;
}

export function Sidebar({
  dates,
  selectedDate,
  onSelectDate,
  isCollapsed = false,
  onToggleCollapse,
  onShowKeyboardShortcuts,
  onOpenSignIn,
  onOpenSignUp,
  onOpenProfile,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [showMenuForDate, setShowMenuForDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showRenameInput, setShowRenameInput] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    date: string;
    formattedDate: string;
  }>({ isOpen: false, date: "", formattedDate: "" });

  // Fetch data
  const archivedDates = useQuery(api.archivedDates.getArchivedDates) || [];
  const dateLabelsData = useQuery(api.dateLabels.getDateLabels) || [];
  const pinnedTodos = useQuery(api.todos.getPinnedTodos) || [];
  const copyTodosToDate = useMutation(api.todos.copyTodosToDate);
  const archiveDate = useMutation(api.archivedDates.archiveDate);
  const unarchiveDate = useMutation(api.archivedDates.unarchiveDate);
  const deleteDate = useMutation(api.dates.deleteDate);
  const setDateLabel = useMutation(api.dateLabels.setDateLabel);
  const removeDateLabel = useMutation(api.dateLabels.removeDateLabel);

  // Create a map of date to label for quick lookup
  const dateLabels = new Map(
    dateLabelsData.map((item) => [item.date, item.label]),
  );

  const formatDate = (dateStr: string) => {
    // Check if there's a custom label for this date
    const customLabel = dateLabels.get(dateStr);
    if (customLabel) {
      return customLabel;
    }

    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Format date for collapsed view (MM/DD)
  const formatDateCollapsed = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleCopyToTomorrow = async (sourceDate: string) => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    await copyTodosToDate({ sourceDate, targetDate: tomorrow });
    setShowMenuForDate(null);
  };

  const handleCopyToPreviousDay = async (sourceDate: string) => {
    const previousDay = format(
      subDays(new Date(sourceDate + "T00:00:00"), 1),
      "yyyy-MM-dd",
    );
    await copyTodosToDate({ sourceDate, targetDate: previousDay });
    setShowMenuForDate(null);
  };

  const handleCopyToNextDay = async (sourceDate: string) => {
    const nextDay = format(
      addDays(new Date(sourceDate + "T00:00:00"), 1),
      "yyyy-MM-dd",
    );
    await copyTodosToDate({ sourceDate, targetDate: nextDay });
    setShowMenuForDate(null);
  };

  const handleCopyToCustomDate = async (sourceDate: string) => {
    if (customDate) {
      await copyTodosToDate({ sourceDate, targetDate: customDate });
      setShowMenuForDate(null);
      setShowDatePicker(null);
      setCustomDate("");
    }
  };

  const handleArchiveDate = async (date: string) => {
    await archiveDate({ date });
    setShowMenuForDate(null);
  };

  const handleUnarchiveDate = async (date: string) => {
    await unarchiveDate({ date });
    setShowMenuForDate(null);
  };

  const handleSetLabel = async (date: string) => {
    if (customLabel.trim()) {
      await setDateLabel({ date, label: customLabel.trim() });
      setShowMenuForDate(null);
      setShowRenameInput(null);
      setCustomLabel("");
    }
  };

  const handleRemoveLabel = async (date: string) => {
    await removeDateLabel({ date });
    setShowMenuForDate(null);
  };

  const handleDeleteDate = (date: string) => {
    setConfirmDialog({
      isOpen: true,
      date: date,
      formattedDate: formatDate(date),
    });
    setShowMenuForDate(null);
  };

  const confirmDelete = async () => {
    if (confirmDialog.date) {
      await deleteDate({ date: confirmDialog.date });
    }
    setConfirmDialog({ isOpen: false, date: "", formattedDate: "" });
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, date: "", formattedDate: "" });
  };

  const activeDates = dates.filter((date) => !archivedDates.includes(date));

  // Handle ESC key to close menus and modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Remove focus from any active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        if (showMenuForDate) {
          setShowMenuForDate(null);
        }
        if (showDatePicker) {
          setShowDatePicker(null);
          setCustomDate("");
        }
        if (showRenameInput) {
          setShowRenameInput(null);
          setCustomLabel("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMenuForDate, showDatePicker, showRenameInput]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`sidebar-header ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-title">better todo</div>
        {onToggleCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="sidebar-collapse-btn"
                onClick={onToggleCollapse}
              >
                <PanelLeft size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {!isCollapsed ? (
        <div className="sidebar-dates">
          {/* Pinned section */}
          {pinnedTodos.length > 0 && (
            <div
              key="pinned"
              className={`date-item-container pinned-section ${"pinned" === selectedDate ? "active" : ""}`}
            >
              <div className="date-item" onClick={() => onSelectDate("pinned")}>
                Pinned
              </div>
            </div>
          )}

          {activeDates.map((date) => (
            <div
              key={date}
              className={`date-item-container ${date === selectedDate ? "active" : ""}`}
            >
              <div className="date-item" onClick={() => onSelectDate(date)}>
                {formatDate(date)}
              </div>
              <div className="date-menu">
                <button
                  className="date-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenuForDate(showMenuForDate === date ? null : date);
                    setShowDatePicker(null);
                    setShowRenameInput(null);
                  }}
                >
                  ⋯
                </button>
                {showMenuForDate === date && (
                  <div className="date-menu-dropdown">
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowRenameInput(date);
                        setCustomLabel(dateLabels.get(date) || "");
                        setShowDatePicker(null);
                      }}
                    >
                      {dateLabels.has(date) ? "Edit Label" : "Add Label"}
                    </div>
                    {dateLabels.has(date) && (
                      <div
                        className="menu-item"
                        onClick={() => handleRemoveLabel(date)}
                      >
                        Remove Label
                      </div>
                    )}
                    <div
                      className="menu-item"
                      onClick={() => handleCopyToTomorrow(date)}
                    >
                      Copy to Tomorrow
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => handleCopyToPreviousDay(date)}
                    >
                      Copy to Previous Day
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => handleCopyToNextDay(date)}
                    >
                      Copy to Next Day
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowDatePicker(date);
                        setShowRenameInput(null);
                      }}
                    >
                      Copy to Custom Date...
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => handleArchiveDate(date)}
                    >
                      Archive Date
                    </div>
                    <div
                      className="menu-item danger"
                      onClick={() => handleDeleteDate(date)}
                    >
                      Delete Date
                    </div>
                  </div>
                )}
                {showDatePicker === date && (
                  <div className="date-picker-modal">
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="date-picker-input"
                    />
                    <button
                      className="date-picker-button"
                      onClick={() => handleCopyToCustomDate(date)}
                      disabled={!customDate}
                    >
                      Copy
                    </button>
                    <button
                      className="date-picker-button cancel"
                      onClick={() => {
                        setShowDatePicker(null);
                        setCustomDate("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {showRenameInput === date && (
                  <div className="date-picker-modal">
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="Enter custom label..."
                      className="date-picker-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customLabel.trim()) {
                          handleSetLabel(date);
                        } else if (e.key === "Escape") {
                          setShowRenameInput(null);
                          setCustomLabel("");
                        }
                      }}
                    />
                    <button
                      className="date-picker-button"
                      onClick={() => handleSetLabel(date)}
                      disabled={!customLabel.trim()}
                    >
                      Save
                    </button>
                    <button
                      className="date-picker-button cancel"
                      onClick={() => {
                        setShowRenameInput(null);
                        setCustomLabel("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Archived section */}
          {archivedDates.length > 0 && (
            <div className="sidebar-archive-section">
              <div
                className="sidebar-archive-header"
                onClick={() => setShowArchived(!showArchived)}
              >
                <span
                  className={`collapse-icon ${showArchived ? "" : "collapsed"}`}
                >
                  ▼
                </span>
                <span>Archived ({archivedDates.length})</span>
              </div>
              {showArchived && (
                <div className="sidebar-archive-dates">
                  {archivedDates.map((date) => (
                    <div
                      key={date}
                      className={`date-item-container archived ${date === selectedDate ? "active" : ""}`}
                    >
                      <div
                        className="date-item"
                        onClick={() => onSelectDate(date)}
                      >
                        {formatDate(date)}
                      </div>
                      <div className="date-menu">
                        <button
                          className="date-menu-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenuForDate(
                              showMenuForDate === date ? null : date,
                            );
                          }}
                        >
                          ⋯
                        </button>
                        {showMenuForDate === date && (
                          <div className="date-menu-dropdown">
                            <div
                              className="menu-item"
                              onClick={() => handleUnarchiveDate(date)}
                            >
                              Unarchive Date
                            </div>
                            <div
                              className="menu-item danger"
                              onClick={() => handleDeleteDate(date)}
                            >
                              Delete Date
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="sidebar-dates collapsed">
          {/* Pinned section in collapsed view */}
          {pinnedTodos.length > 0 && (
            <div
              key="pinned"
              className={`date-item-collapsed ${"pinned" === selectedDate ? "active" : ""}`}
              onClick={() => onSelectDate("pinned")}
              title="Pinned"
            >
              <Pin size={16} />
            </div>
          )}

          {activeDates.map((date) => (
            <div
              key={date}
              className={`date-item-collapsed ${date === selectedDate ? "active" : ""}`}
              onClick={() => onSelectDate(date)}
              title={formatDate(date)}
            >
              {formatDateCollapsed(date)}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="sidebar-footer-left">
          {/* Show profile icon only when Convex auth is ready AND Clerk user is loaded */}
          {!authIsLoading && isAuthenticated && user ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="login-button"
                  onClick={() => onOpenProfile?.()}
                >
                  <img
                    src={
                      theme === "dark" ? "/user-light.svg" : "/user-dark.svg"
                    }
                    alt="User profile"
                    width="18"
                    height="18"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {user?.firstName || user?.emailAddresses[0]?.emailAddress} -
                View profile
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              {/* Sign Up Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="login-button"
                    onClick={() => onOpenSignUp?.()}
                  >
                    <img
                      src={
                        theme === "dark"
                          ? "/sign-up-light.svg"
                          : "/sign-up-dark.svg"
                      }
                      alt="Sign up"
                      width="18"
                      height="18"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Sign up to save your data
                </TooltipContent>
              </Tooltip>

              {/* Sign In Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="login-button"
                    onClick={() => onOpenSignIn?.()}
                  >
                    <img
                      src={
                        theme === "dark"
                          ? "/login-light.svg"
                          : "/login-dark.svg"
                      }
                      alt="Sign in"
                      width="18"
                      height="18"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Sign in to save your data
                </TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="theme-toggle" onClick={toggleTheme}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/waynesutton/better-todo"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              View source code on GitHub
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://convex.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="convex-link"
              >
                <img
                  src={
                    theme === "dark" ? "/convex-white.svg" : "/convex-black.svg"
                  }
                  alt="Convex"
                  width="18"
                  height="18"
                />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Powered by Convex - Learn more
            </TooltipContent>
          </Tooltip>

          {onShowKeyboardShortcuts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="convex-link"
                  onClick={onShowKeyboardShortcuts}
                >
                  <KeyboardIcon width="18" height="18" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Keyboard shortcuts
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Date"
        message={`Are you sure you want to delete all data for ${confirmDialog.formattedDate}? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDangerous={true}
      />
    </TooltipProvider>
  );
}
