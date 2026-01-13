import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { format, addDays, subDays } from "date-fns";
import {
  PanelLeft,
  Pin,
  Plus,
  Moon,
  Sun,
  Cloud,
  Scroll,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  KeyboardIcon,
  InfoCircledIcon,
  Half2Icon,
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

// Component to display todos for a specific folder
function TodosForFolder({
  folderId,
  onSelectFolder,
  selectedFolder,
  uncompletedCount,
}: {
  folderId: Id<"folders">;
  onSelectFolder: (folderId: Id<"folders">) => void;
  selectedFolder: Id<"folders"> | null;
  uncompletedCount: number;
}) {
  return (
    <div className="notes-folder-section">
      <div
        className={`notes-folder-header ${selectedFolder === folderId ? "active" : ""}`}
        onClick={() => {
          triggerSelectionHaptic();
          onSelectFolder(folderId);
        }}
      >
        <span className="notes-folder-title">
          Todos {uncompletedCount > 0 && `(${uncompletedCount})`}
        </span>
      </div>
    </div>
  );
}

// Component to display notes for a specific date
function NotesForDate({
  date,
  expanded,
  onToggle,
  onOpenNote,
  showMenuForNoteId,
  setShowMenuForNoteId,
  selectedNoteId,
  folders,
  onMoveNoteToFolder,
  onMoveNoteToDate,
}: {
  date: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenNote: (noteId: Id<"fullPageNotes">) => void;
  showMenuForNoteId: Id<"fullPageNotes"> | null;
  setShowMenuForNoteId: (noteId: Id<"fullPageNotes"> | null) => void;
  selectedNoteId: Id<"fullPageNotes"> | null | undefined;
  folders: any[];
  onMoveNoteToFolder: (
    noteId: Id<"fullPageNotes">,
    folderId: Id<"folders">,
  ) => void;
  onMoveNoteToDate: (noteId: Id<"fullPageNotes">, date: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const updateFullPageNote = useMutation(api.fullPageNotes.updateFullPageNote);
  const deleteFullPageNote = useMutation(api.fullPageNotes.deleteFullPageNote);
  const [renamingNoteId, setRenamingNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [showProjectSelector, setShowProjectSelector] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [showDatePicker, setShowDatePicker] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [customDate, setCustomDate] = useState("");

  // Fetch full-page notes for this date when folder is expanded
  const notes = useQuery(
    api.fullPageNotes.getFullPageNotesByDate,
    isAuthenticated && expanded ? { date } : "skip",
  );

  const handleRenameNote = async (noteId: Id<"fullPageNotes">) => {
    if (renameInput.trim()) {
      await updateFullPageNote({ id: noteId, title: renameInput.trim() });
      setRenamingNoteId(null);
      setRenameInput("");
    }
  };

  const handleDeleteNote = async () => {
    if (confirmDeleteNoteId) {
      await deleteFullPageNote({ id: confirmDeleteNoteId });
      setShowMenuForNoteId(null);
      setConfirmDeleteNoteId(null);
    }
  };

  return (
    <div className="notes-folder-section">
      <div className="notes-folder-header" onClick={onToggle}>
        <ChevronRight
          size={14}
          className={`notes-folder-arrow ${expanded ? "expanded" : ""}`}
        />

        <span className="notes-folder-title">Notes</span>
      </div>
      {expanded && notes && notes.length > 0 && (
        <div className="notes-folder-items">
          {notes.map((note) => (
            <div key={note._id} className="notes-folder-item-container">
              {renamingNoteId === note._id ? (
                <div className="date-picker-modal">
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="Enter note name..."
                    className="date-picker-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renameInput.trim()) {
                        handleRenameNote(note._id);
                      } else if (e.key === "Escape") {
                        setRenamingNoteId(null);
                        setRenameInput("");
                      }
                    }}
                  />
                  <button
                    className="date-picker-button"
                    onClick={() => handleRenameNote(note._id)}
                    disabled={!renameInput.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="date-picker-button cancel"
                    onClick={() => {
                      setRenamingNoteId(null);
                      setRenameInput("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`notes-folder-item ${selectedNoteId === note._id ? "active" : ""}`}
                    onClick={() => {
                      triggerSelectionHaptic();
                      onOpenNote(note._id);
                    }}
                  >
                    <span className="notes-folder-item-title">
                      {note.title || "Untitled"}
                      {(note.isShared || note.shareSlug) && (
                        <Eye
                          size={12}
                          style={{ marginLeft: "6px", display: "inline" }}
                        />
                      )}
                    </span>
                  </div>
                  <button
                    className="date-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuForNoteId(
                        showMenuForNoteId === note._id ? null : note._id,
                      );
                    }}
                  >
                    ⋯
                  </button>
                  {showMenuForNoteId === note._id && (
                    <div className="date-menu-dropdown">
                      <div
                        className="menu-item"
                        onClick={() => {
                          setRenamingNoteId(note._id);
                          setRenameInput(note.title || "");
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Rename Note
                      </div>
                      {folders.length > 0 && (
                        <div
                          className="menu-item"
                          onClick={() => {
                            setShowProjectSelector(note._id);
                            setShowMenuForNoteId(null);
                          }}
                        >
                          Move to Project...
                        </div>
                      )}
                      <div
                        className="menu-item"
                        onClick={() => {
                          setShowDatePicker(note._id);
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Move to Date...
                      </div>
                      <div
                        className="menu-item danger"
                        onClick={() => {
                          setConfirmDeleteNoteId(note._id);
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Delete Note
                      </div>
                    </div>
                  )}

                  {/* Project Selector Modal */}
                  {showProjectSelector === note._id && (
                    <div className="folder-selector-modal">
                      <div className="folder-selector-header">
                        Move to Project
                      </div>
                      <div className="folder-selector-list">
                        {folders.map((folder: any) => (
                          <div
                            key={folder._id}
                            className="folder-selector-item"
                            onClick={() => {
                              onMoveNoteToFolder(note._id, folder._id);
                              setShowProjectSelector(null);
                            }}
                          >
                            {folder.name}
                          </div>
                        ))}
                      </div>
                      <button
                        className="folder-selector-cancel"
                        onClick={() => setShowProjectSelector(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Date Picker Modal */}
                  {showDatePicker === note._id && (
                    <div className="date-picker-modal">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="date-picker-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customDate) {
                            onMoveNoteToDate(note._id, customDate);
                            setShowDatePicker(null);
                            setCustomDate("");
                          } else if (e.key === "Escape") {
                            setShowDatePicker(null);
                            setCustomDate("");
                          }
                        }}
                      />
                      <button
                        className="date-picker-button"
                        onClick={() => {
                          if (customDate) {
                            onMoveNoteToDate(note._id, customDate);
                            setShowDatePicker(null);
                            setCustomDate("");
                          }
                        }}
                        disabled={!customDate}
                      >
                        Move
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
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteNoteId !== null}
        title="Delete Full-Page Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteNote}
        onCancel={() => setConfirmDeleteNoteId(null)}
        isDangerous={true}
      />
    </div>
  );
}

// Component to display notes for a specific folder
function NotesForFolder({
  folderId,
  expanded,
  onToggle,
  onOpenNote,
  showMenuForNoteId,
  setShowMenuForNoteId,
  selectedNoteId,
  folders,
  onMoveNoteToFolder,
  onMoveNoteToDate,
  isArchivedFolder = false,
}: {
  folderId: Id<"folders">;
  expanded: boolean;
  onToggle: () => void;
  onOpenNote: (noteId: Id<"fullPageNotes">) => void;
  showMenuForNoteId: Id<"fullPageNotes"> | null;
  setShowMenuForNoteId: (noteId: Id<"fullPageNotes"> | null) => void;
  selectedNoteId: Id<"fullPageNotes"> | null | undefined;
  folders: any[];
  onMoveNoteToFolder: (
    noteId: Id<"fullPageNotes">,
    folderId: Id<"folders">,
  ) => void;
  onMoveNoteToDate: (noteId: Id<"fullPageNotes">, date: string) => void;
  isArchivedFolder?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const updateFullPageNote = useMutation(api.fullPageNotes.updateFullPageNote);
  const deleteFullPageNote = useMutation(api.fullPageNotes.deleteFullPageNote);
  const [renamingNoteId, setRenamingNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [showProjectSelector, setShowProjectSelector] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [showDatePicker, setShowDatePicker] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [customDate, setCustomDate] = useState("");

  // Fetch full-page notes for this folder (always fetch to show count)
  const notes = useQuery(
    api.fullPageNotes.getFullPageNotesByFolder,
    isAuthenticated ? { folderId, includeArchived: isArchivedFolder } : "skip",
  );

  const handleRenameNote = async (noteId: Id<"fullPageNotes">) => {
    if (renameInput.trim()) {
      await updateFullPageNote({ id: noteId, title: renameInput.trim() });
      setRenamingNoteId(null);
      setRenameInput("");
    }
  };

  const handleDeleteNote = async () => {
    if (confirmDeleteNoteId) {
      await deleteFullPageNote({ id: confirmDeleteNoteId });
      setShowMenuForNoteId(null);
      setConfirmDeleteNoteId(null);
    }
  };

  return (
    <div className="notes-folder-section">
      <div className="notes-folder-header" onClick={onToggle}>
        <ChevronRight
          size={14}
          className={`notes-folder-arrow ${expanded ? "expanded" : ""}`}
        />
        <span className="notes-folder-title">
          Notes {notes && notes.length > 0 && `(${notes.length})`}
        </span>
      </div>
      {expanded && notes && notes.length > 0 && (
        <div className="notes-folder-items">
          {notes.map((note) => (
            <div key={note._id} className="notes-folder-item-container">
              {renamingNoteId === note._id ? (
                <div className="date-picker-modal">
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="Enter note name..."
                    className="date-picker-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && renameInput.trim()) {
                        handleRenameNote(note._id);
                      } else if (e.key === "Escape") {
                        setRenamingNoteId(null);
                        setRenameInput("");
                      }
                    }}
                  />
                  <button
                    className="date-picker-button"
                    onClick={() => handleRenameNote(note._id)}
                    disabled={!renameInput.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="date-picker-button cancel"
                    onClick={() => {
                      setRenamingNoteId(null);
                      setRenameInput("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`notes-folder-item ${selectedNoteId === note._id ? "active" : ""}`}
                    onClick={() => {
                      triggerSelectionHaptic();
                      onOpenNote(note._id);
                    }}
                  >
                    <span className="notes-folder-item-title">
                      {note.title || "Untitled"}
                      {(note.isShared || note.shareSlug) && (
                        <Eye
                          size={12}
                          style={{ marginLeft: "6px", display: "inline" }}
                        />
                      )}
                    </span>
                  </div>
                  <button
                    className="date-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuForNoteId(
                        showMenuForNoteId === note._id ? null : note._id,
                      );
                    }}
                  >
                    ⋯
                  </button>
                  {showMenuForNoteId === note._id && (
                    <div className="date-menu-dropdown">
                      <div
                        className="menu-item"
                        onClick={() => {
                          setRenamingNoteId(note._id);
                          setRenameInput(note.title || "");
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Rename Note
                      </div>
                      {folders.length > 0 && (
                        <div
                          className="menu-item"
                          onClick={() => {
                            setShowProjectSelector(note._id);
                            setShowMenuForNoteId(null);
                          }}
                        >
                          Move to Project...
                        </div>
                      )}
                      <div
                        className="menu-item"
                        onClick={() => {
                          setShowDatePicker(note._id);
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Move to Date...
                      </div>
                      <div
                        className="menu-item danger"
                        onClick={() => {
                          setConfirmDeleteNoteId(note._id);
                          setShowMenuForNoteId(null);
                        }}
                      >
                        Delete Note
                      </div>
                    </div>
                  )}

                  {/* Project Selector Modal */}
                  {showProjectSelector === note._id && (
                    <div className="folder-selector-modal">
                      <div className="folder-selector-header">
                        Move to Project
                      </div>
                      <div className="folder-selector-list">
                        {folders.map((folder: any) => (
                          <div
                            key={folder._id}
                            className="folder-selector-item"
                            onClick={() => {
                              onMoveNoteToFolder(note._id, folder._id);
                              setShowProjectSelector(null);
                            }}
                          >
                            {folder.name}
                          </div>
                        ))}
                      </div>
                      <button
                        className="folder-selector-cancel"
                        onClick={() => setShowProjectSelector(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Date Picker Modal */}
                  {showDatePicker === note._id && (
                    <div className="date-picker-modal">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="date-picker-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && customDate) {
                            onMoveNoteToDate(note._id, customDate);
                            setShowDatePicker(null);
                            setCustomDate("");
                          } else if (e.key === "Escape") {
                            setShowDatePicker(null);
                            setCustomDate("");
                          }
                        }}
                      />
                      <button
                        className="date-picker-button"
                        onClick={() => {
                          if (customDate) {
                            onMoveNoteToDate(note._id, customDate);
                            setShowDatePicker(null);
                            setCustomDate("");
                          }
                        }}
                        disabled={!customDate}
                      >
                        Move
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
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteNoteId !== null}
        title="Delete Full-Page Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteNote}
        onCancel={() => setConfirmDeleteNoteId(null)}
        isDangerous={true}
      />
    </div>
  );
}

interface SidebarProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedFolder?: Id<"folders"> | null;
  onSelectFolder?: (folderId: Id<"folders">) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onShowKeyboardShortcuts?: () => void;
  onOpenSignUp?: () => void;
  onOpenProfile?: () => void;
  onShowInfo?: () => void;
  onOpenFullPageNote?: (
    noteId: Id<"fullPageNotes">,
    date: string,
    folderId?: Id<"folders">,
  ) => void;
  selectedFullPageNoteId?: Id<"fullPageNotes"> | null;
  datesAreLoading?: boolean;
  onOpenAIChat?: (date: string) => void;
  showAIChat?: boolean;
}

export function Sidebar({
  dates,
  selectedDate,
  onSelectDate,
  selectedFolder = null,
  onSelectFolder,
  isCollapsed = false,
  onToggleCollapse,
  onShowKeyboardShortcuts,
  onOpenSignUp,
  onOpenProfile,
  onShowInfo,
  onOpenFullPageNote,
  selectedFullPageNoteId,
  datesAreLoading = false,
  onOpenAIChat,
  showAIChat = false,
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
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showProjectSelector, setShowProjectSelector] = useState<string | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    date: string;
    formattedDate: string;
  }>({ isOpen: false, date: "", formattedDate: "" });
  const [confirmDeleteArchived, setConfirmDeleteArchived] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<{
    isOpen: boolean;
    folderId: Id<"folders"> | null;
    folderName: string;
    noteCount: number;
  }>({ isOpen: false, folderId: null, folderName: "", noteCount: 0 });
  const [showRenameBacklog, setShowRenameBacklog] = useState(false);
  const [backlogLabelInput, setBacklogLabelInput] = useState("");
  const [showMenuForNoteId, setShowMenuForNoteId] =
    useState<Id<"fullPageNotes"> | null>(null);
  const [copiedLinkFor, setCopiedLinkFor] = useState<string | null>(null);

  // Helper to copy link to clipboard
  const copyLinkToClipboard = (path: string, id: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLinkFor(id);
      setTimeout(() => setCopiedLinkFor(null), 2000);
    });
  };

  // Fetch data - all queries guarded with isAuthenticated to prevent unnecessary subscriptions
  const archivedDates =
    useQuery(
      api.archivedDates.getArchivedDates,
      isAuthenticated ? undefined : "skip",
    ) || [];
  const dateLabelsData =
    useQuery(
      api.dateLabels.getDateLabels,
      isAuthenticated ? undefined : "skip",
    ) || [];
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
  const uncompletedCounts =
    useQuery(
      api.todos.getUncompletedCounts,
      isAuthenticated ? undefined : "skip",
    ) || {};
  const folders =
    useQuery(api.folders.getFolders, isAuthenticated ? undefined : "skip") ||
    [];
  const monthGroups =
    useQuery(
      api.monthGroups.getMonthGroups,
      isAuthenticated ? undefined : "skip",
    ) || [];
  const fullPageNoteCounts =
    useQuery(
      api.fullPageNotes.getFullPageNoteCounts,
      isAuthenticated ? undefined : "skip",
    ) || {};
  const fullPageNoteCountsByFolder =
    useQuery(
      api.fullPageNotes.getFullPageNoteCountsByFolder,
      isAuthenticated ? undefined : "skip",
    ) || {};
  const todoCountsByFolder =
    useQuery(
      api.todos.getTodoCountsByFolder,
      isAuthenticated ? undefined : "skip",
    ) || {};
  const aiChatCounts =
    useQuery(
      api.aiChats.getAIChatCounts,
      isAuthenticated ? undefined : "skip",
    ) || {};

  // State to track which dates have notes folder expanded
  const [expandedNotesFor, setExpandedNotesFor] = useState<Set<string>>(
    new Set(),
  );
  // State to track which folders have notes expanded
  const [expandedFolderNotes, setExpandedFolderNotes] = useState<Set<string>>(
    new Set(),
  );

  // Helper to toggle notes folder for a date
  const toggleNotesFolder = (date: string) => {
    setExpandedNotesFor((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Helper to toggle notes folder for a folder
  const toggleFolderNotes = (folderId: string) => {
    setExpandedFolderNotes((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handler to select a folder and view its todos
  const handleSelectFolder = (folderId: Id<"folders">) => {
    if (onSelectFolder) {
      onSelectFolder(folderId);
    }
    triggerSelectionHaptic();
  };

  // Mutations
  const copyTodosToDate = useMutation(api.todos.copyTodosToDate);
  const moveTodosToNextDay = useMutation(api.todos.moveTodosToNextDay);
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
  const generateFolderSlug = useMutation(api.folders.generateFolderSlug);
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
  const moveFullPageNoteToFolder = useMutation(
    api.fullPageNotes.moveFullPageNoteToFolder,
  );
  const moveFullPageNoteToDate = useMutation(
    api.fullPageNotes.moveFullPageNoteToDate,
  );

  // Handlers for moving full-page notes
  const handleMoveNoteToFolder = async (
    noteId: Id<"fullPageNotes">,
    folderId: Id<"folders">,
  ) => {
    await moveFullPageNoteToFolder({ noteId, folderId });
  };

  const handleMoveNoteToDate = async (
    noteId: Id<"fullPageNotes">,
    date: string,
  ) => {
    await moveFullPageNoteToDate({ noteId, date });
  };

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
    try {
      // Calculate tomorrow from today (not from sourceDate)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = format(addDays(today, 1), "yyyy-MM-dd");

      // Don't copy if source and target are the same
      if (sourceDate === tomorrow) {
        return;
      }

      await copyTodosToDate({ sourceDate, targetDate: tomorrow });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error copying to tomorrow:", error);
      setShowMenuForDate(null);
    }
  };

  const handleCopyToPreviousDay = async (sourceDate: string) => {
    try {
      const previousDay = format(
        subDays(new Date(sourceDate + "T00:00:00"), 1),
        "yyyy-MM-dd",
      );
      await copyTodosToDate({ sourceDate, targetDate: previousDay });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error copying to previous day:", error);
      setShowMenuForDate(null);
    }
  };

  const handleCopyToNextDay = async (sourceDate: string) => {
    try {
      const nextDay = format(
        addDays(new Date(sourceDate + "T00:00:00"), 1),
        "yyyy-MM-dd",
      );
      await copyTodosToDate({ sourceDate, targetDate: nextDay });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error copying to next day:", error);
      setShowMenuForDate(null);
    }
  };

  // Move all incomplete todos to next day and archive the source date todos
  const handleMoveToNextDay = async (sourceDate: string) => {
    try {
      const nextDay = format(
        addDays(new Date(sourceDate + "T00:00:00"), 1),
        "yyyy-MM-dd",
      );
      await moveTodosToNextDay({ sourceDate, targetDate: nextDay });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error moving to next day:", error);
      setShowMenuForDate(null);
    }
  };

  const handleCopyToCustomDate = async (sourceDate: string) => {
    if (customDate) {
      try {
        // Don't copy if source and target are the same
        if (sourceDate === customDate) {
          setShowDatePicker(null);
          setCustomDate("");
          setShowMenuForDate(null);
          return;
        }

        await copyTodosToDate({ sourceDate, targetDate: customDate });
        setShowMenuForDate(null);
        setShowDatePicker(null);
        setCustomDate("");
      } catch (error) {
        console.error("Error copying to custom date:", error);
        setShowMenuForDate(null);
        setShowDatePicker(null);
        setCustomDate("");
      }
    }
  };

  const handleArchiveDate = async (date: string) => {
    try {
      await archiveDate({ date });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error archiving date:", error);
      setShowMenuForDate(null);
    }
  };

  const handleUnarchiveDate = async (date: string) => {
    try {
      // Check if date is in a folder and remove it
      const folderForDate = getFolderForDate(date);
      if (folderForDate) {
        await removeDateFromFolder({ date });
      }
      await unarchiveDate({ date });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error unarchiving date:", error);
      setShowMenuForDate(null);
    }
  };

  const handleSetLabel = async (date: string) => {
    if (customLabel.trim()) {
      try {
        await setDateLabel({ date, label: customLabel.trim() });
        setShowMenuForDate(null);
        setShowRenameInput(null);
        setCustomLabel("");
      } catch (error) {
        console.error("Error setting label:", error);
        setShowMenuForDate(null);
        setShowRenameInput(null);
        setCustomLabel("");
      }
    }
  };

  const handleRemoveLabel = async (date: string) => {
    try {
      await removeDateLabel({ date });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error removing label:", error);
      setShowMenuForDate(null);
    }
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
      // Check if date is in a folder and remove it first
      const folderForDate = getFolderForDate(confirmDialog.date);
      if (folderForDate) {
        await removeDateFromFolder({ date: confirmDialog.date });
      }
      await deleteDate({ date: confirmDialog.date });
    }
    setConfirmDialog({ isOpen: false, date: "", formattedDate: "" });
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, date: "", formattedDate: "" });
  };

  // Handler for creating a new project
  const handleCreateFolder = async () => {
    if (newProjectName.trim()) {
      try {
        await createFolder({ name: newProjectName.trim() });
        setNewProjectName("");
        setShowAddProject(false);
      } catch (error) {
        console.error("Error creating project:", error);
        setNewProjectName("");
        setShowAddProject(false);
      }
    }
  };

  // Handler for renaming a folder
  const handleRenameFolder = async (folderId: Id<"folders">) => {
    if (folderNameInput.trim()) {
      try {
        await renameFolder({ folderId, name: folderNameInput.trim() });
        setShowRenameFolderInput(null);
        setFolderNameInput("");
        setShowFolderMenu(null);
      } catch (error) {
        console.error("Error renaming project:", error);
        setShowRenameFolderInput(null);
        setFolderNameInput("");
        setShowFolderMenu(null);
      }
    }
  };

  // Handler for archiving a folder
  const handleArchiveFolder = async (folderId: Id<"folders">) => {
    try {
      await archiveFolder({ folderId });
      setShowFolderMenu(null);
    } catch (error) {
      console.error("Error archiving project:", error);
      setShowFolderMenu(null);
    }
  };

  // Handler for unarchiving a folder
  const handleUnarchiveFolder = async (folderId: Id<"folders">) => {
    try {
      await unarchiveFolder({ folderId });
      setShowFolderMenu(null);
    } catch (error) {
      console.error("Error unarchiving project:", error);
      setShowFolderMenu(null);
    }
  };

  // Handler for deleting a folder
  const handleDeleteFolder = (folderId: Id<"folders">) => {
    const folder = folders.find((f) => f._id === folderId);
    if (folder) {
      const noteCount = fullPageNoteCountsByFolder[folderId.toString()] || 0;
      setConfirmDeleteFolder({
        isOpen: true,
        folderId: folderId,
        folderName: folder.name,
        noteCount: noteCount,
      });
      setShowFolderMenu(null);
    }
  };

  const confirmDeleteFolderAction = async () => {
    if (confirmDeleteFolder.folderId) {
      try {
        await deleteFolder({ folderId: confirmDeleteFolder.folderId });
        setConfirmDeleteFolder({
          isOpen: false,
          folderId: null,
          folderName: "",
          noteCount: 0,
        });
      } catch (error) {
        console.error("Error deleting project:", error);
        setConfirmDeleteFolder({
          isOpen: false,
          folderId: null,
          folderName: "",
          noteCount: 0,
        });
      }
    }
  };

  const cancelDeleteFolder = () => {
    setConfirmDeleteFolder({
      isOpen: false,
      folderId: null,
      folderName: "",
      noteCount: 0,
    });
  };

  // Handler for archiving a month group
  const handleArchiveMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    try {
      await archiveMonthGroup({ monthGroupId });
      setShowMonthGroupMenu(null);
    } catch (error) {
      console.error("Error archiving month group:", error);
      setShowMonthGroupMenu(null);
    }
  };

  // Handler for unarchiving a month group
  const handleUnarchiveMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    try {
      await unarchiveMonthGroup({ monthGroupId });
      setShowMonthGroupMenu(null);
    } catch (error) {
      console.error("Error unarchiving month group:", error);
      setShowMonthGroupMenu(null);
    }
  };

  // Handler for deleting a month group
  const handleDeleteMonthGroup = async (monthGroupId: Id<"monthGroups">) => {
    try {
      await deleteMonthGroup({ monthGroupId });
      setShowMonthGroupMenu(null);
    } catch (error) {
      console.error("Error deleting month group:", error);
      setShowMonthGroupMenu(null);
    }
  };

  // Handler for deleting all archived dates
  const handleDeleteAllArchived = async () => {
    if (isAuthenticated) {
      try {
        await deleteAllArchivedDates({});
        setConfirmDeleteArchived(false);
      } catch (error) {
        console.error("Error deleting all archived dates:", error);
        setConfirmDeleteArchived(false);
      }
    }
  };

  // Handler for renaming backlog
  const handleRenameBacklog = async () => {
    if (backlogLabelInput.trim() && isAuthenticated) {
      try {
        await setBacklogLabel({ label: backlogLabelInput.trim() });
        setShowRenameBacklog(false);
        setBacklogLabelInput("");
      } catch (error) {
        console.error("Error renaming backlog:", error);
        setShowRenameBacklog(false);
        setBacklogLabelInput("");
      }
    }
  };

  // Handler for adding date to folder
  const handleAddDateToFolder = async (
    date: string,
    folderId: Id<"folders">,
  ) => {
    try {
      await addDateToFolder({ folderId, date });
      setShowProjectSelector(null);
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error adding date to project:", error);
      setShowProjectSelector(null);
      setShowMenuForDate(null);
    }
  };

  // Handler for removing date from folder
  const handleRemoveDateFromFolder = async (date: string) => {
    try {
      await removeDateFromFolder({ date });
      setShowMenuForDate(null);
    } catch (error) {
      console.error("Error removing date from project:", error);
      setShowMenuForDate(null);
    }
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

  // Auto-expand folder or month group when a date inside them is selected
  useEffect(() => {
    if (
      !selectedDate ||
      selectedDate === "pinned" ||
      selectedDate === "backlog"
    ) {
      return;
    }

    // Check if selected date is in a folder
    const folderWithDate = folders.find((folder) =>
      folder.dates.includes(selectedDate),
    );
    if (folderWithDate) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(folderWithDate._id);
        return next;
      });
    }

    // Check if selected date is in a month group
    const monthGroupWithDate = monthGroups.find((monthGroup) =>
      monthGroup.dates.includes(selectedDate),
    );
    if (monthGroupWithDate) {
      setExpandedMonthGroups((prev) => {
        const next = new Set(prev);
        next.add(monthGroupWithDate._id);
        return next;
      });
    }
  }, [selectedDate, folders, monthGroups]);

  // Auto-expand folder and notes when a folder note is selected
  useEffect(() => {
    if (!selectedFullPageNoteId || !selectedFolder) {
      return;
    }

    // Expand the folder
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add(selectedFolder);
      return next;
    });

    // Expand the notes section for this folder
    setExpandedFolderNotes((prev) => {
      const next = new Set(prev);
      next.add(selectedFolder);
      return next;
    });
  }, [selectedFullPageNoteId, selectedFolder]);

  // Auto-expand folder when selected via URL navigation (without a note selected)
  useEffect(() => {
    if (!selectedFolder) {
      return;
    }

    // Expand the selected folder so it's visible in the sidebar
    setExpandedFolders((prev) => {
      if (prev.has(selectedFolder)) {
        return prev; // Already expanded, no update needed
      }
      const next = new Set(prev);
      next.add(selectedFolder);
      return next;
    });
  }, [selectedFolder]);

  // Calculate dates that are in folders or month groups
  const datesInFoldersOrGroups = new Set<string>();
  folders.forEach((folder) =>
    folder.dates.forEach((d) => datesInFoldersOrGroups.add(d)),
  );
  monthGroups.forEach((monthGroup) =>
    monthGroup.dates.forEach((d) => datesInFoldersOrGroups.add(d)),
  );

  // Filter active dates to exclude archived, those in folders/groups, and those with no uncompleted todos or full-page notes
  const activeDates = dates.filter(
    (date) =>
      !archivedDates.includes(date) &&
      !datesInFoldersOrGroups.has(date) &&
      ((uncompletedCounts[date] || 0) > 0 ||
        (fullPageNoteCounts[date] || 0) > 0),
  );

  // Separate active and archived folders
  // Show all active folders (including empty ones)
  const activeFolders = folders
    .filter((f) => !f.archived)
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
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
        if (showAddProject) {
          setShowAddProject(false);
          setNewProjectName("");
        }
        if (showProjectSelector) {
          setShowProjectSelector(null);
        }
        if (showRenameBacklog) {
          setShowRenameBacklog(false);
          setBacklogLabelInput("");
        }
        if (showMenuForNoteId) {
          setShowMenuForNoteId(null);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is outside menu dropdowns
      const isInsideMenuDropdown = target.closest(".date-menu-dropdown");
      const isInsideMenuButton = target.closest(".date-menu-button");
      const isInsideDatePicker = target.closest(".date-picker-modal");
      const isInsideFolderSelector = target.closest(".folder-selector-modal");

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

      // Close project selector if clicking outside
      if (!isInsideFolderSelector && showProjectSelector) {
        setShowProjectSelector(null);
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
    showFolderMenu,
    showMonthGroupMenu,
    showRenameFolderInput,
    showAddProject,
    showProjectSelector,
    showRenameBacklog,
    showMenuForNoteId,
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
              <div className="date-item-container-row">
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
            </div>
          )}


          {/* Loading skeleton for dates */}
          {datesAreLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="date-item-container skeleton"
                >
                  <div className="date-item-container-row">
                    <div className="date-item skeleton-date">
                      <div className="skeleton-text" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {!datesAreLoading &&
            activeDates.map((date) => (
              <div
                key={date}
                className={`date-item-container ${date === selectedDate ? "active" : ""}`}
              >
                <div className="date-item-container-row">
                  <div
                    className="date-item"
                    onClick={() => {
                      triggerSelectionHaptic();
                      onSelectDate(date);
                    }}
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
                                  onClick={() =>
                                    handleRemoveDateFromFolder(date)
                                  }
                                >
                                  Remove from Project
                                </div>
                              ) : (
                                <div
                                  className="menu-item"
                                  onClick={() => {
                                    setShowProjectSelector(date);
                                    setShowDatePicker(null);
                                    setShowRenameInput(null);
                                  }}
                                >
                                  Add to Project...
                                </div>
                              )}
                            </>
                          )}
                        <div
                          className="menu-item"
                          onClick={() => {
                            copyLinkToClipboard(`/d/${date}`, `date-${date}`);
                            setShowMenuForDate(null);
                          }}
                        >
                          {copiedLinkFor === `date-${date}` ? "Copied!" : "Copy Link"}
                        </div>
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
                          onClick={() => handleMoveToNextDay(date)}
                        >
                          Move to Next Day
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
                    {showProjectSelector === date && (
                      <div className="folder-selector-modal">
                        <div className="folder-selector-header">
                          Move to Project
                        </div>
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
                                {folder.name}
                              </div>
                            ))}
                        </div>
                        <button
                          className="folder-selector-cancel"
                          onClick={() => setShowProjectSelector(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes folder for this date - show if date has full-page notes */}
                {fullPageNoteCounts[date] > 0 && (
                  <NotesForDate
                    date={date}
                    expanded={expandedNotesFor.has(date)}
                    onToggle={() => toggleNotesFolder(date)}
                    onOpenNote={(noteId) => {
                      if (onOpenFullPageNote) {
                        onOpenFullPageNote(noteId, date, undefined);
                      }
                    }}
                    showMenuForNoteId={showMenuForNoteId}
                    setShowMenuForNoteId={setShowMenuForNoteId}
                    selectedNoteId={selectedFullPageNoteId}
                    folders={folders.filter((f) => !f.archived)}
                    onMoveNoteToFolder={handleMoveNoteToFolder}
                    onMoveNoteToDate={handleMoveNoteToDate}
                  />
                )}

                {/* AI Chat indicator for this date - show if date has AI chat messages */}
                {aiChatCounts[date] > 0 && (
                  <div
                    className={`notes-folder-item ai-chat-item ${showAIChat && date === selectedDate ? "active" : ""}`}
                    onClick={() => {
                      triggerSelectionHaptic();
                      onSelectDate(date);
                      if (onOpenAIChat) {
                        onOpenAIChat(date);
                      }
                    }}
                  >
                    <span className="ai-chat-item-title">Chat</span>
                  </div>
                )}
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
                  {monthGroup.dates
                    .filter((date) => !archivedDates.includes(date))
                    .map((date) => (
                      <div
                        key={date}
                        className={`date-item-container ${date === selectedDate ? "active" : ""}`}
                      >
                        <div className="date-item-container-row">
                          <div
                            className="date-item"
                            onClick={() => {
                              triggerSelectionHaptic();
                              onSelectDate(date);
                            }}
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
                                  {dateLabels.has(date)
                                    ? "Edit Label"
                                    : "Add Label"}
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
                                  folders.filter((f) => !f.archived).length >
                                    0 && (
                                    <>
                                      {getFolderForDate(date) ? (
                                        <div
                                          className="menu-item"
                                          onClick={() =>
                                            handleRemoveDateFromFolder(date)
                                          }
                                        >
                                          Remove from Project
                                        </div>
                                      ) : (
                                        <div
                                          className="menu-item"
                                          onClick={() => {
                                            setShowProjectSelector(date);
                                            setShowDatePicker(null);
                                            setShowRenameInput(null);
                                          }}
                                        >
                                          Add to Project...
                                        </div>
                                      )}
                                    </>
                                  )}
                                <div
                                  className="menu-item"
                                  onClick={() => {
                                    copyLinkToClipboard(`/d/${date}`, `date-${date}`);
                                    setShowMenuForDate(null);
                                  }}
                                >
                                  {copiedLinkFor === `date-${date}` ? "Copied!" : "Copy Link"}
                                </div>
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
                                  onClick={() => handleMoveToNextDay(date)}
                                >
                                  Move to Next Day
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
                                  onChange={(e) =>
                                    setCustomDate(e.target.value)
                                  }
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
                                  onChange={(e) =>
                                    setCustomLabel(e.target.value)
                                  }
                                  placeholder="Enter custom label..."
                                  className="date-picker-input"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" &&
                                      customLabel.trim()
                                    ) {
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
                            {showProjectSelector === date && (
                              <div className="folder-selector-modal">
                                <div className="folder-selector-header">
                                  Move to Project
                                </div>
                                <div className="folder-selector-list">
                                  {folders
                                    .filter((f) => !f.archived)
                                    .map((folder) => (
                                      <div
                                        key={folder._id}
                                        className="folder-selector-item"
                                        onClick={() =>
                                          handleAddDateToFolder(
                                            date,
                                            folder._id,
                                          )
                                        }
                                      >
                                        {folder.name}
                                      </div>
                                    ))}
                                </div>
                                <button
                                  className="folder-selector-cancel"
                                  onClick={() => setShowProjectSelector(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notes folder for this date in month group - show if date has full-page notes */}
                        {fullPageNoteCounts[date] > 0 && (
                          <NotesForDate
                            date={date}
                            expanded={expandedNotesFor.has(date)}
                            onToggle={() => toggleNotesFolder(date)}
                            onOpenNote={(noteId) => {
                              if (onOpenFullPageNote) {
                                onOpenFullPageNote(noteId, date, undefined);
                              }
                            }}
                            showMenuForNoteId={showMenuForNoteId}
                            setShowMenuForNoteId={setShowMenuForNoteId}
                            selectedNoteId={selectedFullPageNoteId}
                            folders={folders.filter((f) => !f.archived)}
                            onMoveNoteToFolder={handleMoveNoteToFolder}
                            onMoveNoteToDate={handleMoveNoteToDate}
                          />
                        )}
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
                className={`sidebar-archive-header ${selectedFolder === folder._id ? "active" : ""}`}
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
                      onClick={async () => {
                        // Generate slug if it doesn't exist
                        const slug = folder.slug || await generateFolderSlug({ folderId: folder._id });
                        copyLinkToClipboard(`/p/${slug || folder._id}`, `folder-${folder._id}`);
                        setShowFolderMenu(null);
                      }}
                    >
                      {copiedLinkFor === `folder-${folder._id}` ? "Copied!" : "Copy Link"}
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowRenameFolderInput(folder._id);
                        setFolderNameInput(folder.name);
                        setShowFolderMenu(null);
                      }}
                    >
                      Rename Project
                    </div>
                    <div
                      className="menu-item"
                      onClick={() => handleArchiveFolder(folder._id)}
                    >
                      Archive Project
                    </div>
                    <div
                      className="menu-item danger"
                      onClick={() => handleDeleteFolder(folder._id)}
                    >
                      Delete Project
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
                    placeholder="Enter project name..."
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
                  {folder.dates
                    .filter((date) => !archivedDates.includes(date))
                    .map((date) => (
                      <div
                        key={date}
                        className={`date-item-container ${date === selectedDate ? "active" : ""}`}
                      >
                        <div className="date-item-container-row">
                          <div
                            className="date-item"
                            onClick={() => {
                              triggerSelectionHaptic();
                              onSelectDate(date);
                            }}
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
                                  onClick={() => {
                                    copyLinkToClipboard(`/d/${date}`, `date-${date}`);
                                    setShowMenuForDate(null);
                                  }}
                                >
                                  {copiedLinkFor === `date-${date}` ? "Copied!" : "Copy Link"}
                                </div>
                                <div
                                  className="menu-item"
                                  onClick={() =>
                                    handleRemoveDateFromFolder(date)
                                  }
                                >
                                  Remove from Project
                                </div>
                                <div
                                  className="menu-item"
                                  onClick={() => handleArchiveDate(date)}
                                >
                                  Archive Date
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notes folder for this date in project folder */}
                        {fullPageNoteCounts[date] > 0 && (
                          <NotesForDate
                            date={date}
                            expanded={expandedNotesFor.has(date)}
                            onToggle={() => toggleNotesFolder(date)}
                            onOpenNote={(noteId) => {
                              if (onOpenFullPageNote) {
                                onOpenFullPageNote(noteId, date, undefined);
                              }
                            }}
                            showMenuForNoteId={showMenuForNoteId}
                            setShowMenuForNoteId={setShowMenuForNoteId}
                            selectedNoteId={selectedFullPageNoteId}
                            folders={folders.filter((f) => !f.archived)}
                            onMoveNoteToFolder={handleMoveNoteToFolder}
                            onMoveNoteToDate={handleMoveNoteToDate}
                          />
                        )}

                        {/* AI Chat indicator for this date in project folder */}
                        {aiChatCounts[date] > 0 && (
                          <div
                            className={`notes-folder-item ai-chat-item ${showAIChat && date === selectedDate ? "active" : ""}`}
                            onClick={() => {
                              triggerSelectionHaptic();
                              onSelectDate(date);
                              if (onOpenAIChat) {
                                onOpenAIChat(date);
                              }
                            }}
                          >
                            <span className="ai-chat-item-title">Chat</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Todos folder for this folder */}
              {expandedFolders.has(folder._id) && (
                <TodosForFolder
                  folderId={folder._id}
                  onSelectFolder={handleSelectFolder}
                  selectedFolder={selectedFolder}
                  uncompletedCount={
                    todoCountsByFolder[folder._id.toString()] || 0
                  }
                />
              )}

              {/* Notes folder for this folder - show if folder has full-page notes */}
              {expandedFolders.has(folder._id) &&
                fullPageNoteCountsByFolder[folder._id.toString()] > 0 && (
                  <NotesForFolder
                    folderId={folder._id}
                    expanded={expandedFolderNotes.has(folder._id)}
                    onToggle={() => toggleFolderNotes(folder._id)}
                    onOpenNote={(noteId) => {
                      if (onOpenFullPageNote) {
                        // For folder notes, pass empty string for date and folderId
                        onOpenFullPageNote(noteId, "", folder._id);
                      }
                    }}
                    showMenuForNoteId={showMenuForNoteId}
                    setShowMenuForNoteId={setShowMenuForNoteId}
                    selectedNoteId={selectedFullPageNoteId}
                    folders={folders.filter((f) => !f.archived)}
                    onMoveNoteToFolder={handleMoveNoteToFolder}
                    onMoveNoteToDate={handleMoveNoteToDate}
                    isArchivedFolder={false}
                  />
                )}
            </div>
          ))}

          {/* Add Project button */}
          {isAuthenticated && (
            <div className="sidebar-add-folder">
              {!showAddProject ? (
                <button
                  className="add-folder-button"
                  onClick={() => setShowAddProject(true)}
                >
                  <Plus size={14} />
                  <span>Add Project</span>
                </button>
              ) : (
                <div className="add-folder-input-container">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="add-folder-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newProjectName.trim()) {
                        handleCreateFolder();
                      } else if (e.key === "Escape") {
                        setShowAddProject(false);
                        setNewProjectName("");
                      }
                    }}
                  />
                  <div className="add-folder-buttons">
                    <button
                      className="add-folder-save-button"
                      onClick={handleCreateFolder}
                      disabled={!newProjectName.trim()}
                    >
                      Create
                    </button>
                    <button
                      className="add-folder-cancel-button"
                      onClick={() => {
                        setShowAddProject(false);
                        setNewProjectName("");
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
                      <div className="date-item-container-row">
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
                                onClick={() => {
                                  copyLinkToClipboard(`/d/${date}`, `date-${date}`);
                                  setShowMenuForDate(null);
                                }}
                              >
                                {copiedLinkFor === `date-${date}` ? "Copied!" : "Copy Link"}
                              </div>
                              <div
                                className="menu-item"
                                onClick={() => handleUnarchiveDate(date)}
                              >
                                Unarchive Date
                              </div>
                            </div>
                          )}
                        </div>
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
                              onClick={async () => {
                                // Generate slug if it doesn't exist
                                const slug = folder.slug || await generateFolderSlug({ folderId: folder._id });
                                copyLinkToClipboard(`/p/${slug || folder._id}`, `folder-${folder._id}`);
                                setShowFolderMenu(null);
                              }}
                            >
                              {copiedLinkFor === `folder-${folder._id}` ? "Copied!" : "Copy Link"}
                            </div>
                            <div
                              className="menu-item"
                              onClick={() => {
                                setShowRenameFolderInput(folder._id);
                                setFolderNameInput(folder.name);
                                setShowFolderMenu(null);
                              }}
                            >
                              Rename Project
                            </div>
                            <div
                              className="menu-item"
                              onClick={() => handleUnarchiveFolder(folder._id)}
                            >
                              Unarchive Project
                            </div>
                            <div
                              className="menu-item danger"
                              onClick={() => handleDeleteFolder(folder._id)}
                            >
                              Delete Project
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
                              <div className="date-item-container-row">
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
                                        onClick={() => {
                                          copyLinkToClipboard(`/d/${date}`, `date-${date}`);
                                          setShowMenuForDate(null);
                                        }}
                                      >
                                        {copiedLinkFor === `date-${date}` ? "Copied!" : "Copy Link"}
                                      </div>
                                      <div
                                        className="menu-item"
                                        onClick={() =>
                                          handleRemoveDateFromFolder(date)
                                        }
                                      >
                                        Remove from Project
                                      </div>
                                      <div
                                        className="menu-item"
                                        onClick={() =>
                                          handleUnarchiveDate(date)
                                        }
                                      >
                                        Unarchive Date
                                      </div>
                                    </div>
                                  )}
                                </div>
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

          {/* Backlog section in collapsed view */}
          {uncompletedBacklogTodos.length > 0 && (
            <div
              key="backlog"
              className={`date-item-collapsed ${"backlog" === selectedDate ? "active" : ""}`}
              onClick={() => onSelectDate("backlog")}
              title={backlogLabel}
            >
              <Scroll size={16} />
            </div>
          )}


          {/* Loading skeleton for collapsed dates */}
          {datesAreLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={`skeleton-collapsed-${i}`}
                  className="date-item-collapsed skeleton"
                >
                  <div className="skeleton-text-collapsed" />
                </div>
              ))}
            </>
          )}

          {!datesAreLoading &&
            activeDates.map((date) => (
              <div
                key={date}
                className={`date-item-collapsed ${date === selectedDate ? "active" : ""}`}
                onClick={() => onSelectDate(date)}
                title={formatDate(date)}
              >
                {formatDateCollapsed(date)}
              </div>
            ))}

          {/* Folders section in collapsed view */}
          {activeFolders.map((folder) => (
            <div
              key={folder._id}
              className={`date-item-collapsed ${selectedFolder === folder._id ? "active" : ""}`}
              onClick={() => {
                triggerSelectionHaptic();
                if (onSelectFolder) {
                  onSelectFolder(folder._id);
                }
              }}
              title={folder.name}
            >
              {folder.name.charAt(0).toUpperCase()}
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
                      theme === "dark"
                        ? "/user-light.svg"
                        : theme === "light"
                          ? "/user-dark.svg"
                          : theme === "tan"
                            ? "/user-dark.svg"
                            : "/user-dark.svg"
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
                  <Sun size={16} />
                ) : theme === "light" ? (
                  <Cloud size={16} />
                ) : theme === "tan" ? (
                  <Half2Icon style={{ width: 16, height: 16 }} />
                ) : (
                  <Moon size={16} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {`Switch to ${theme === "dark" ? "light" : theme === "light" ? "tan" : theme === "tan" ? "cloud" : "dark"} mode`}
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
                    theme === "dark"
                      ? "/convex-white.svg"
                      : theme === "light"
                        ? "/convex-black.svg"
                        : theme === "tan"
                          ? "/convex-black.svg"
                          : "/convex-black.svg"
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

      <ConfirmDialog
        isOpen={confirmDeleteFolder.isOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${confirmDeleteFolder.folderName}"? This will permanently delete all ${confirmDeleteFolder.noteCount} full-page note${confirmDeleteFolder.noteCount === 1 ? "" : "s"} in this project and remove all dates associated with it. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteFolderAction}
        onCancel={cancelDeleteFolder}
        isDangerous={true}
      />
    </TooltipProvider>
  );
}
