import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { format, addDays, subDays } from "date-fns";
import { PanelLeft, Pin, Menu, Folder, Plus } from "lucide-react";
import {
  KeyboardIcon,
  InfoCircledIcon,
  SunIcon,
  MoonIcon,
} from "@radix-ui/react-icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { Id } from "../../convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { triggerSelectionHaptic } from "../lib/haptics";

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
  onShowInfo?: () => void;
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
  onShowInfo,
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [expandedMonthGroups, setExpandedMonthGroups] = useState<Set<string>>(
    new Set(),
  );
  const [showFolderMenu, setShowFolderMenu] = useState<string | null>(null);
  const [showMonthGroupMenu, setShowMonthGroupMenu] = useState<string | null>(
    null,
  );
  const [showRenameFolderInput, setShowRenameFolderInput] = useState<
    string | null
  >(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderSelector, setShowFolderSelector] = useState<string | null>(
    null,
  );
  const [showManageFolders, setShowManageFolders] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    date: string;
    formattedDate: string;
  }>({ isOpen: false, date: "", formattedDate: "" });
  const [confirmDeleteArchived, setConfirmDeleteArchived] = useState(false);
  const [showRenameBacklog, setShowRenameBacklog] = useState(false);
  const [backlogLabelInput, setBacklogLabelInput] = useState("");

  // Fetch data
  const archivedDates = useQuery(api.archivedDates.getArchivedDates) || [];
  const dateLabelsData = useQuery(api.dateLabels.getDateLabels) || [];
  const pinnedTodos =
    useQuery(api.todos.getPinnedTodos, isAuthenticated ? undefined : "skip") ||
    [];
  const backlogTodos =
    useQuery(api.todos.getBacklogTodos, isAuthenticated ? undefined : "skip") ||
    [];
  const backlogLabel =
    useQuery(
      api.backlogLabel.getBacklogLabel,
      isAuthenticated ? undefined : "skip",
    ) || "Backlog";
  const uncompletedCounts = useQuery(api.todos.getUncompletedCounts) || {};
  const folders =
    useQuery(api.folders.getFolders, isAuthenticated ? undefined : "skip") ||
    [];
  const monthGroups =
    useQuery(
      api.monthGroups.getMonthGroups,
      isAuthenticated ? undefined : "skip",
    ) || [];

  // Mutations
  const copyTodosToDate = useMutation(api.todos.copyTodosToDate);
  const archiveDate = useMutation(api.archivedDates.archiveDate);
  const unarchiveDate = useMutation(api.archivedDates.unarchiveDate);
  const deleteDate = useMutation(api.dates.deleteDate);
  const setDateLabel = useMutation(api.dateLabels.setDateLabel);
  const removeDateLabel = useMutation(api.dateLabels.removeDateLabel);
  const createFolder = useMutation(api.folders.createFolder);
  const renameFolder = useMutation(api.folders.renameFolder);
  const archiveFolder = useMutation(api.folders.archiveFolder);
  const unarchiveFolder = useMutation(api.folders.unarchiveFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);
  const addDateToFolder = useMutation(api.folders.addDateToFolder);
  const removeDateFromFolder = useMutation(api.folders.removeDateFromFolder);
  const archiveMonthGroup = useMutation(api.monthGroups.archiveMonthGroup);
  const unarchiveMonthGroup = useMutation(api.monthGroups.unarchiveMonthGroup);
  const deleteMonthGroup = useMutation(api.monthGroups.deleteMonthGroup);
  const autoCreateMonthGroups = useMutation(
    api.monthGroups.autoCreateMonthGroups,
  );
  const deleteAllArchivedDates = useMutation(
    api.archivedDates.deleteAllArchivedDates,
  );
  const setBacklogLabel = useMutation(api.backlogLabel.setBacklogLabel);

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
    // Check if date is in a folder and remove it
    const folderForDate = getFolderForDate(date);
    if (folderForDate) {
      await removeDateFromFolder({ date });
    }
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

  // Handler for creating a new folder
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await createFolder({ name: newFolderName.trim() });
      setNewFolderName("");
      setShowAddFolder(false);
    }
  };

  // Handler for renaming a folder
  const handleRenameFolder = async (folderId: Id<"folders">) => {
    if (folderNameInput.trim()) {
      await renameFolder({ folderId, name: folderNameInput.trim() });
      setShowRenameFolderInput(null);
      setFolderNameInput("");
      setShowFolderMenu(null);
    }
  };

  // Handler for archiving a folder
  const handleArchiveFolder = async (folderId: Id<"folders">) => {
    await archiveFolder({ folderId });
    setShowFolderMenu(null);
  };

  // Handler for unarchiving a folder
  const handleUnarchiveFolder = async (folderId: Id<"folders">) => {
    await unarchiveFolder({ folderId });
    setShowFolderMenu(null);
  };

  // Handler for deleting a folder
  const handleDeleteFolder = async (folderId: Id<"folders">) => {
    await deleteFolder({ folderId });
    setShowFolderMenu(null);
  };

  // Handler for archiving a month group
  const handleArchiveMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    await archiveMonthGroup({ monthGroupId });
    setShowMonthGroupMenu(null);
  };

  // Handler for unarchiving a month group
  const handleUnarchiveMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    await unarchiveMonthGroup({ monthGroupId });
    setShowMonthGroupMenu(null);
  };

  // Handler for deleting a month group
  const handleDeleteMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    await deleteMonthGroup({ monthGroupId });
    setShowMonthGroupMenu(null);
  };

  // Handler for deleting all archived dates
  const handleDeleteAllArchived = async () => {
    if (isAuthenticated) {
      await deleteAllArchivedDates({});
      setConfirmDeleteArchived(false);
    }
  };

  // Handler for renaming backlog
  const handleRenameBacklog = async () => {
    if (backlogLabelInput.trim() && isAuthenticated) {
      await setBacklogLabel({ label: backlogLabelInput.trim() });
      setShowRenameBacklog(false);
      setBacklogLabelInput("");
    }
  };

  // Handler for adding date to folder
  const handleAddDateToFolder = async (
    date: string,
    folderId: Id<"folders">,
  ) => {
    await addDateToFolder({ folderId, date });
    setShowFolderSelector(null);
    setShowMenuForDate(null);
  };

  // Handler for removing date from folder
  const handleRemoveDateFromFolder = async (date: string) => {
    await removeDateFromFolder({ date });
    setShowMenuForDate(null);
  };

  // Get folder for a date
  const getFolderForDate = (date: string): Id<"folders"> | null => {
    for (const folder of folders) {
      if (folder.dates.includes(date)) {
        return folder._id;
      }
    }
    return null;
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Toggle month group expansion
  const toggleMonthGroup = (monthGroupId: string) => {
    setExpandedMonthGroups((prev) => {
      const next = new Set(prev);
      if (next.has(monthGroupId)) {
        next.delete(monthGroupId);
      } else {
        next.add(monthGroupId);
      }
      return next;
    });
  };

  // Auto-create month groups on mount
  useEffect(() => {
    if (isAuthenticated) {
      autoCreateMonthGroups({});
    }
  }, [isAuthenticated, autoCreateMonthGroups]);

  // Calculate dates that are in folders or month groups
  const datesInFoldersOrGroups = new Set<string>();
  folders.forEach((folder) =>
    folder.dates.forEach((d) => datesInFoldersOrGroups.add(d)),
  );
  monthGroups.forEach((monthGroup) =>
    monthGroup.dates.forEach((d) => datesInFoldersOrGroups.add(d)),
  );

  // Filter active dates to exclude archived, those in folders/groups, and those with no uncompleted todos
  const activeDates = dates.filter(
    (date) =>
      !archivedDates.includes(date) &&
      !datesInFoldersOrGroups.has(date) &&
      (uncompletedCounts[date] || 0) > 0,
  );

  // Separate active and archived folders
  // Only show active folders that have dates
  const activeFolders = folders.filter(
    (f) => !f.archived && f.dates.length > 0,
  );
  const archivedFolders = folders.filter((f) => f.archived);

  // Separate active and archived month groups
  const activeMonthGroups = monthGroups.filter((mg) => !mg.archived);
  const archivedMonthGroups = monthGroups.filter((mg) => mg.archived);

  // Filter pinned and backlog todos to only show uncompleted ones
  const uncompletedPinnedTodos = pinnedTodos.filter((todo) => !todo.completed);
  const uncompletedBacklogTodos = backlogTodos.filter(
    (todo) => !todo.completed,
  );

  // Handle ESC key and click outside to close menus and modals
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
        if (showMobileMenu) {
          setShowMobileMenu(false);
        }
        if (showFolderMenu) {
          setShowFolderMenu(null);
        }
        if (showMonthGroupMenu) {
          setShowMonthGroupMenu(null);
        }
        if (showRenameFolderInput) {
          setShowRenameFolderInput(null);
          setFolderNameInput("");
        }
        if (showAddFolder) {
          setShowAddFolder(false);
          setNewFolderName("");
        }
        if (showFolderSelector) {
          setShowFolderSelector(null);
        }
        if (showRenameBacklog) {
          setShowRenameBacklog(false);
          setBacklogLabelInput("");
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is outside menu dropdowns
      const isInsideMenuDropdown = target.closest(".date-menu-dropdown");
      const isInsideMenuButton = target.closest(".date-menu-button");
      const isInsideDatePicker = target.closest(".date-picker-modal");
      const isInsideFolderSelector = target.closest(".folder-selector");

      // Close menus if clicking outside
      if (
        !isInsideMenuDropdown &&
        !isInsideMenuButton &&
        !isInsideDatePicker &&
        !isInsideFolderSelector
      ) {
        if (showMenuForDate) {
          setShowMenuForDate(null);
        }
        if (showFolderMenu) {
          setShowFolderMenu(null);
        }
        if (showMonthGroupMenu) {
          setShowMonthGroupMenu(null);
        }
      }

      // Close date picker if clicking outside
      if (!isInsideDatePicker && showDatePicker) {
        setShowDatePicker(null);
        setCustomDate("");
      }

      // Close folder selector if clicking outside
      if (!isInsideFolderSelector && showFolderSelector) {
        setShowFolderSelector(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showMenuForDate,
    showDatePicker,
    showRenameInput,
    showMobileMenu,
    showFolderMenu,
    showMonthGroupMenu,
    showRenameFolderInput,
    showAddFolder,
    showFolderSelector,
    showRenameBacklog,
  ]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`sidebar-header ${isCollapsed ? "collapsed" : ""}`}>
        <a
          href="/"
          className="sidebar-title"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          better todo
        </a>
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
          {uncompletedPinnedTodos.length > 0 && (
            <div
              key="pinned"
              className={`date-item-container pinned-section ${"pinned" === selectedDate ? "active" : ""}`}
            >
              <div
                className="date-item"
                onClick={() => {
                  triggerSelectionHaptic();
                  onSelectDate("pinned");
                }}
              >
                Pinned
              </div>
            </div>
          )}

          {/* Backlog section */}
          {uncompletedBacklogTodos.length > 0 && (
            <div
              key="backlog"
              className={`date-item-container backlog-section ${"backlog" === selectedDate ? "active" : ""}`}
            >
              <div
                className="date-item"
                onClick={() => {
                  triggerSelectionHaptic();
                  onSelectDate("backlog");
                }}
              >
                {backlogLabel}
              </div>
              <div className="date-menu">
                <button
                  className="date-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRenameBacklog(!showRenameBacklog);
                    setBacklogLabelInput(backlogLabel);
                  }}
                >
                  ⋯
                </button>
                {showRenameBacklog && (
                  <div className="date-picker-modal">
                    <input
                      type="text"
                      value={backlogLabelInput}
                      onChange={(e) => setBacklogLabelInput(e.target.value)}
                      placeholder="Enter backlog label..."
                      className="date-picker-input"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && backlogLabelInput.trim()) {
                          handleRenameBacklog();
                        } else if (e.key === "Escape") {
                          setShowRenameBacklog(false);
                          setBacklogLabelInput("");
                        }
                      }}
                    />
                    <button
                      className="date-picker-button"
                      onClick={handleRenameBacklog}
                      disabled={!backlogLabelInput.trim()}
                    >
                      Save
                    </button>
                    <button
                      className="date-picker-button cancel"
                      onClick={() => {
                        setShowRenameBacklog(false);
                        setBacklogLabelInput("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeDates.map((date) => (
            <div
              key={date}
              className={`date-item-container ${date === selectedDate ? "active" : ""}`}
            >
              <div
                className="date-item"
                onClick={() => {
                  triggerSelectionHaptic();
                  onSelectDate(date);
                }}
              >
                {formatDate(date)}
                {uncompletedCounts[date] > 0 && (
                  <span className="todo-count">{uncompletedCounts[date]}</span>
                )}
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
                    {isAuthenticated &&
                      folders.filter((f) => !f.archived).length > 0 && (
                        <>
                          {getFolderForDate(date) ? (
                            <div
                              className="menu-item"
                              onClick={() => handleRemoveDateFromFolder(date)}
                            >
                              Remove from Folder
                            </div>
                          ) : (
                            <div
                              className="menu-item"
                              onClick={() => {
                                setShowFolderSelector(date);
                                setShowDatePicker(null);
                                setShowRenameInput(null);
                              }}
                            >
                              Add to Folder...
                            </div>
                          )}
                        </>
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
                {showFolderSelector === date && (
                  <div className="date-picker-modal folder-selector">
                    <div className="folder-selector-title">Select Folder</div>
                    <div className="folder-selector-list">
                      {folders
                        .filter((f) => !f.archived)
                        .map((folder) => (
                          <div
                            key={folder._id}
                            className="folder-selector-item"
                            onClick={() =>
                              handleAddDateToFolder(date, folder._id)
                            }
                          >
                            <Folder size={14} />
                            <span>{folder.name}</span>
                          </div>
                        ))}
                    </div>
                    <button
                      className="date-picker-button cancel"
                      onClick={() => setShowFolderSelector(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Month Groups section */}
          {activeMonthGroups.map((monthGroup) => (
            <div key={monthGroup._id} className="sidebar-archive-section">
              <div
                className="sidebar-archive-header"
                onClick={() => toggleMonthGroup(monthGroup._id)}
              >
                <span
                  className={`collapse-icon ${expandedMonthGroups.has(monthGroup._id) ? "" : "collapsed"}`}
                >
                  ▼
                </span>
                <span>{monthGroup.monthName}</span>
              </div>
              <div className="date-menu">
                <button
                  className="date-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMonthGroupMenu(
                      showMonthGroupMenu === monthGroup._id
                        ? null
                        : monthGroup._id,
                    );
                  }}
                >
                  ⋯
                </button>
                {showMonthGroupMenu === monthGroup._id && (
                  <div className="date-menu-dropdown">
                    <div
                      className="menu-item"
                      onClick={() => handleArchiveMonthGroup(monthGroup._id)}
                    >
                      Archive Month
                    </div>
                    <div
                      className="menu-item danger"
                      onClick={() => handleDeleteMonthGroup(monthGroup._id)}
                    >
                      Delete Month
                    </div>
                  </div>
                )}
              </div>
              {expandedMonthGroups.has(monthGroup._id) && (
                <div className="sidebar-archive-dates">
                  {monthGroup.dates.map((date) => (
                    <div
                      key={date}
                      className={`date-item-container ${date === selectedDate ? "active" : ""}`}
                    >
                      <div
                        className="date-item"
                        onClick={() => onSelectDate(date)}
                      >
                        {formatDate(date)}
                        {uncompletedCounts[date] > 0 && (
                          <span className="todo-count">
                            {uncompletedCounts[date]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Folders section */}
          {activeFolders.map((folder) => (
            <div key={folder._id} className="sidebar-archive-section">
              <div
                className="sidebar-archive-header"
                onClick={() => toggleFolder(folder._id)}
              >
                <span
                  className={`collapse-icon ${expandedFolders.has(folder._id) ? "" : "collapsed"}`}
                >
                  ▼
                </span>
                <span>{folder.name}</span>
              </div>
              <div className="date-menu">
                <button
                  className="date-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFolderMenu(
                      showFolderMenu === folder._id ? null : folder._id,
                    );
                  }}
                >
                  ⋯
                </button>
                {showFolderMenu === folder._id && (
                  <div className="date-menu-dropdown">
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowRenameFolderInput(folder._id);
                        setFolderNameInput(folder.name);
                        setShowFolderMenu(null);
                      }}
                    >
                      Rename Folder
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => handleArchiveFolder(folder._id)}
                    >
                      Archive Folder
                    </div>
                    <div
                      className="menu-item danger"
                      onClick={() => handleDeleteFolder(folder._id)}
                    >
                      Delete Folder
                    </div>
                  </div>
                )}
              </div>
              {showRenameFolderInput === folder._id && (
                <div className="date-picker-modal">
                  <input
                    type="text"
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    placeholder="Enter folder name..."
                    className="date-picker-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && folderNameInput.trim()) {
                        handleRenameFolder(folder._id);
                      } else if (e.key === "Escape") {
                        setShowRenameFolderInput(null);
                        setFolderNameInput("");
                      }
                    }}
                  />
                  <button
                    className="date-picker-button"
                    onClick={() => handleRenameFolder(folder._id)}
                    disabled={!folderNameInput.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="date-picker-button cancel"
                    onClick={() => {
                      setShowRenameFolderInput(null);
                      setFolderNameInput("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {expandedFolders.has(folder._id) && (
                <div className="sidebar-archive-dates">
                  {folder.dates.map((date) => (
                    <div
                      key={date}
                      className={`date-item-container ${date === selectedDate ? "active" : ""}`}
                    >
                      <div
                        className="date-item"
                        onClick={() => onSelectDate(date)}
                      >
                        {formatDate(date)}
                        {uncompletedCounts[date] > 0 && (
                          <span className="todo-count">
                            {uncompletedCounts[date]}
                          </span>
                        )}
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
                              onClick={() => handleRemoveDateFromFolder(date)}
                            >
                              Remove from Folder
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Add Folder button */}
          {isAuthenticated && (
            <div className="sidebar-add-folder">
              {!showAddFolder ? (
                <button
                  className="add-folder-button"
                  onClick={() => setShowAddFolder(true)}
                >
                  <Plus size={14} />
                  <span>Add Folder</span>
                </button>
              ) : (
                <div className="add-folder-input-container">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="add-folder-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFolderName.trim()) {
                        handleCreateFolder();
                      } else if (e.key === "Escape") {
                        setShowAddFolder(false);
                        setNewFolderName("");
                      }
                    }}
                  />
                  <div className="add-folder-buttons">
                    <button
                      className="add-folder-save-button"
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                    >
                      Create
                    </button>
                    <button
                      className="add-folder-cancel-button"
                      onClick={() => {
                        setShowAddFolder(false);
                        setNewFolderName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Archived section */}
          {(archivedDates.length > 0 ||
            archivedFolders.length > 0 ||
            archivedMonthGroups.length > 0) && (
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
                <span>
                  Archived (
                  {archivedDates.length +
                    archivedFolders.length +
                    archivedMonthGroups.length}
                  )
                </span>
              </div>
              <div className="date-menu">
                <button
                  className="date-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteArchived(true);
                  }}
                >
                  ⋯
                </button>
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

                  {/* Archived Folders */}
                  {archivedFolders.map((folder) => (
                    <div key={folder._id} className="sidebar-archive-section">
                      <div
                        className="sidebar-archive-header"
                        onClick={() => toggleFolder(folder._id)}
                      >
                        <span
                          className={`collapse-icon ${expandedFolders.has(folder._id) ? "" : "collapsed"}`}
                        >
                          ▼
                        </span>
                        <span>{folder.name}</span>
                      </div>
                      <div className="date-menu">
                        <button
                          className="date-menu-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFolderMenu(
                              showFolderMenu === folder._id ? null : folder._id,
                            );
                          }}
                        >
                          ⋯
                        </button>
                        {showFolderMenu === folder._id && (
                          <div className="date-menu-dropdown">
                            <div
                              className="menu-item"
                              onClick={() => {
                                setShowRenameFolderInput(folder._id);
                                setFolderNameInput(folder.name);
                                setShowFolderMenu(null);
                              }}
                            >
                              Rename Folder
                            </div>
                            <div
                              className="menu-item"
                              onClick={() => handleUnarchiveFolder(folder._id)}
                            >
                              Unarchive Folder
                            </div>
                            <div
                              className="menu-item danger"
                              onClick={() => handleDeleteFolder(folder._id)}
                            >
                              Delete Folder
                            </div>
                          </div>
                        )}
                      </div>
                      {expandedFolders.has(folder._id) && (
                        <div className="sidebar-archive-dates">
                          {folder.dates.map((date) => (
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
                                      onClick={() =>
                                        handleRemoveDateFromFolder(date)
                                      }
                                    >
                                      Remove from Folder
                                    </div>
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
                  ))}

                  {/* Archived Month Groups */}
                  {archivedMonthGroups.map((monthGroup) => (
                    <div
                      key={monthGroup._id}
                      className="sidebar-archive-section"
                    >
                      <div
                        className="sidebar-archive-header"
                        onClick={() => toggleMonthGroup(monthGroup._id)}
                      >
                        <span
                          className={`collapse-icon ${expandedMonthGroups.has(monthGroup._id) ? "" : "collapsed"}`}
                        >
                          ▼
                        </span>
                        <span>{monthGroup.monthName}</span>
                      </div>
                      <div className="date-menu">
                        <button
                          className="date-menu-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMonthGroupMenu(
                              showMonthGroupMenu === monthGroup._id
                                ? null
                                : monthGroup._id,
                            );
                          }}
                        >
                          ⋯
                        </button>
                        {showMonthGroupMenu === monthGroup._id && (
                          <div className="date-menu-dropdown">
                            <div
                              className="menu-item"
                              onClick={() =>
                                handleUnarchiveMonthGroup(monthGroup._id)
                              }
                            >
                              Unarchive Month
                            </div>
                            <div
                              className="menu-item danger"
                              onClick={() =>
                                handleDeleteMonthGroup(monthGroup._id)
                              }
                            >
                              Delete Month
                            </div>
                          </div>
                        )}
                      </div>
                      {expandedMonthGroups.has(monthGroup._id) && (
                        <div className="sidebar-archive-dates">
                          {monthGroup.dates.map((date) => (
                            <div
                              key={date}
                              className={`date-item-container ${date === selectedDate ? "active" : ""}`}
                            >
                              <div
                                className="date-item"
                                onClick={() => onSelectDate(date)}
                              >
                                {formatDate(date)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manage Folders section - shows all folders including empty ones */}
          {isAuthenticated && folders.length > 0 && (
            <div className="sidebar-archive-section">
              <div
                className="sidebar-archive-header"
                onClick={() => setShowManageFolders(!showManageFolders)}
              >
                <span
                  className={`collapse-icon ${showManageFolders ? "" : "collapsed"}`}
                >
                  ▼
                </span>
                <span>
                  Manage Folders ({folders.filter((f) => !f.archived).length})
                </span>
              </div>
              {showManageFolders && (
                <div className="sidebar-archive-dates">
                  {folders
                    .filter((f) => !f.archived)
                    .map((folder) => (
                      <div key={folder._id} className="sidebar-archive-section">
                        <div className="sidebar-archive-header">
                          <span>{folder.name}</span>
                          {folder.dates.length > 0 && (
                            <span className="folder-date-count">
                              ({folder.dates.length})
                            </span>
                          )}
                        </div>
                        <div className="date-menu">
                          <button
                            className="date-menu-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFolderMenu(
                                showFolderMenu === folder._id
                                  ? null
                                  : folder._id,
                              );
                            }}
                          >
                            ⋯
                          </button>
                          {showFolderMenu === folder._id && (
                            <div className="date-menu-dropdown">
                              <div
                                className="menu-item"
                                onClick={() => {
                                  setShowRenameFolderInput(folder._id);
                                  setFolderNameInput(folder.name);
                                  setShowFolderMenu(null);
                                }}
                              >
                                Rename Folder
                              </div>
                              <div
                                className="menu-item"
                                onClick={() => handleArchiveFolder(folder._id)}
                              >
                                Archive Folder
                              </div>
                              <div
                                className="menu-item danger"
                                onClick={() => handleDeleteFolder(folder._id)}
                              >
                                Delete Folder
                              </div>
                            </div>
                          )}
                        </div>
                        {showRenameFolderInput === folder._id && (
                          <div className="date-picker-modal">
                            <input
                              type="text"
                              value={folderNameInput}
                              onChange={(e) =>
                                setFolderNameInput(e.target.value)
                              }
                              placeholder="Enter folder name..."
                              className="date-picker-input"
                              autoFocus
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  folderNameInput.trim()
                                ) {
                                  handleRenameFolder(folder._id);
                                } else if (e.key === "Escape") {
                                  setShowRenameFolderInput(null);
                                  setFolderNameInput("");
                                }
                              }}
                            />
                            <button
                              className="date-picker-button"
                              onClick={() => handleRenameFolder(folder._id)}
                              disabled={!folderNameInput.trim()}
                            >
                              Save
                            </button>
                            <button
                              className="date-picker-button cancel"
                              onClick={() => {
                                setShowRenameFolderInput(null);
                                setFolderNameInput("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
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
          {uncompletedPinnedTodos.length > 0 && (
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
              <button
                className="theme-toggle"
                onClick={() => {
                  triggerSelectionHaptic();
                  toggleTheme();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {theme === "dark" ? (
                  <SunIcon width={18} height={18} />
                ) : (
                  <MoonIcon width={18} height={18} />
                )}
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

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="convex-link" onClick={() => onShowInfo?.()}>
                <InfoCircledIcon width="18" height="18" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              About better todo
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Mobile hamburger menu */}
        <div className="mobile-menu-container">
          <button
            className="mobile-menu-button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu size={18} />
          </button>
          {showMobileMenu && (
            <div className="mobile-menu-dropdown">
              <a
                href="https://github.com/waynesutton/better-todo"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-menu-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Open-Source Project
              </a>
              <a
                href="https://vibeapps.dev/#:~:text=Privacy%20Policy%20%7C%20Terms"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-menu-link"
                onClick={() => setShowMobileMenu(false)}
              >
                Privacy Policy | Terms
              </a>
            </div>
          )}
        </div>

        {/* Desktop links */}
        <div className="desktop-links">
          <a
            href="https://github.com/waynesutton/better-todo"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Open-Source Project
          </a>
          <a
            href="https://vibeapps.dev/#:~:text=Privacy%20Policy%20%7C%20Terms"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Privacy Policy | Terms
          </a>
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

      <ConfirmDialog
        isOpen={confirmDeleteArchived}
        title="Delete All Archived"
        message={`Are you sure you want to permanently delete all ${archivedDates.length} archived date${archivedDates.length === 1 ? "" : "s"}? This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={handleDeleteAllArchived}
        onCancel={() => setConfirmDeleteArchived(false)}
        isDangerous={true}
      />
    </TooltipProvider>
  );
}
