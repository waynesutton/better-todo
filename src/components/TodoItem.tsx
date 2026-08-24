import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "./ConfirmDialog";
import { DrawingPinFilledIcon } from "@radix-ui/react-icons";
import { triggerSelectionHaptic, triggerHaptic } from "../lib/haptics";

interface TodoItemProps {
  id: Id<"todos">;
  content: string;
  type: "todo" | "h1" | "h2" | "h3";
  completed: boolean;
  collapsed: boolean;
  isArchived?: boolean;
  pinned?: boolean;
  backlog?: boolean;
  isPinnedView?: boolean;
  isBacklogView?: boolean;
  folderId?: Id<"folders">;
  onMoveToPreviousDay: () => void;
  onMoveToNextDay: () => void;
  onMoveToTomorrow: () => void;
  onMoveToToday: () => void;
  onMoveToCustomDate: (date: string) => void;
  onMoveToFolder?: (folderId: Id<"folders">) => void;
  folders?: Array<{ _id: Id<"folders">; name: string; archived: boolean }>;
  onHoverChange?: (id: Id<"todos"> | null) => void;
  openMenuTrigger?: number;
  isDemoMode?: boolean;
  onDemoToggle?: (id: Id<"todos">) => void;
  isAuthenticated?: boolean;
  onRequireSignInForMenu?: () => void;
  setPomodoroTriggered: (data: { todoId?: string; todoTitle?: string }) => void;
  onSendToAgent?: (data: { todoId: string; content: string; folderId?: Id<"folders">; date?: string }) => void;
  /**
   * "list" renders the row as its own sortable item. "card" hands drag and
   * ordering to a Kanban wrapper, so the internal sortable hook goes inert and
   * the menu portals to the body to escape the scrolling column.
   */
  variant?: "list" | "card";
  dragHandle?: React.ReactNode;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: (id: Id<"todos">, additive: boolean) => void;
  /** Lets the board move the card into or out of its Done column on check */
  onCompletedChange?: (next: boolean) => void;
}

// Menu placement. List rows portal with document coordinates; Kanban cards live
// inside a scrolling column, so they use viewport coordinates and flip upward
// when there is not enough room below the button.
const APPROX_MENU_HEIGHT = 320;
const MENU_WIDTH = 180;

function menuCoordsFromRect(rect: DOMRect, isCard: boolean) {
  if (!isCard) {
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    };
  }

  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8),
  );
  const fitsBelow = rect.bottom + APPROX_MENU_HEIGHT <= window.innerHeight - 8;
  const top = fitsBelow
    ? rect.bottom + 4
    : Math.max(8, rect.top - APPROX_MENU_HEIGHT);

  return { top, left };
}

export function TodoItem({
  id,
  content,
  type,
  completed,
  isArchived = false,
  pinned = false,
  backlog = false,
  isPinnedView = false,
  isBacklogView = false,
  folderId,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToTomorrow,
  onMoveToToday,
  onMoveToCustomDate,
  onMoveToFolder,
  folders = [],
  onHoverChange,
  openMenuTrigger,
  isDemoMode = false,
  onDemoToggle,
  isAuthenticated = false,
  onRequireSignInForMenu,
  setPomodoroTriggered,
  onSendToAgent,
  variant = "list",
  dragHandle,
  isSelected = false,
  selectionMode = false,
  onSelect,
  onCompletedChange,
}: TodoItemProps) {
  const isCard = variant === "card";
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const archivedMenuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-focus empty subtasks on creation
  useEffect(() => {
    if (content === "" && !isEditing) {
      setIsEditing(true);
    }
  }, [content, isEditing]);

  // Open menu when triggered by keyboard shortcut
  useEffect(() => {
    if (openMenuTrigger && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition(menuCoordsFromRect(rect, isCard));
      setShowMenu(true);
    }
  }, [openMenuTrigger, isCard]);

  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const createSubtask = useMutation(api.todos.createSubtask);

  // In card variant the Kanban wrapper owns the sortable, so this hook runs
  // against an id that is never registered and stays disabled to avoid a clash
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: isCard ? `${id}::inert` : id, disabled: isCard });

  const style = isCard
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      };

  const handleCheckboxToggle = async () => {
    triggerSelectionHaptic();

    if (isDemoMode && onDemoToggle) {
      onDemoToggle(id);
      return;
    }

    // On the board, checking a card also moves it to/from the Done column
    if (onCompletedChange) {
      onCompletedChange(!completed);
      return;
    }

    await updateTodo({
      id,
      completed: !completed,
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  const handleBlur = async () => {
    // If content is cleared, delete the todo
    if (editContent.trim() === "") {
      await deleteTodo({ id });
      return;
    }

    // If content changed, update it
    if (editContent !== content) {
      await updateTodo({
        id,
        content: editContent,
      });
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    triggerHaptic("light");
    // Check authentication before allowing delete
    if (!isAuthenticated && onRequireSignInForMenu) {
      setShowMenu(false);
      onRequireSignInForMenu();
      return;
    }
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleAddSubtask = async () => {
    triggerHaptic("light");
    // Check authentication before allowing subtask creation
    if (!isAuthenticated && onRequireSignInForMenu) {
      setShowMenu(false);
      onRequireSignInForMenu();
      return;
    }
    try {
      await createSubtask({
        parentId: id,
        content: "",
      });
      setShowMenu(false);
    } catch (error) {
      console.error("Error creating subtask:", error);
    }
  };

  const confirmDelete = async () => {
    triggerHaptic("medium");
    await deleteTodo({ id });
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    triggerHaptic("light");
    setShowDeleteConfirm(false);
  };

  const handleUnarchive = async () => {
    triggerHaptic("light");
    // Check authentication before allowing unarchive
    if (!isAuthenticated && onRequireSignInForMenu) {
      setShowMenu(false);
      onRequireSignInForMenu();
      return;
    }
    await updateTodo({
      id,
      archived: false,
      completed: false,
    });
    setShowMenu(false);
  };

  const handleTogglePin = async () => {
    triggerHaptic("light");
    // Check authentication before allowing pin/unpin
    if (!isAuthenticated && onRequireSignInForMenu) {
      setShowMenu(false);
      onRequireSignInForMenu();
      return;
    }
    await updateTodo({
      id,
      pinned: !pinned,
    });
    setShowMenu(false);
  };

  const handleToggleBacklog = async () => {
    triggerHaptic("light");
    // Check authentication before allowing backlog toggle
    if (!isAuthenticated && onRequireSignInForMenu) {
      setShowMenu(false);
      onRequireSignInForMenu();
      return;
    }
    await updateTodo({
      id,
      backlog: !backlog,
    });
    setShowMenu(false);
  };

  const handleMoveToCustomDate = () => {
    if (customDate) {
      triggerHaptic("light");
      // Check authentication before allowing move
      if (!isAuthenticated && onRequireSignInForMenu) {
        setShowDatePicker(false);
        setCustomDate("");
        onRequireSignInForMenu();
        return;
      }
      onMoveToCustomDate(customDate);
      setShowMenu(false);
      setShowDatePicker(false);
      setCustomDate("");
    }
  };

  const handleMenuToggle = () => {
    triggerSelectionHaptic();
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition(menuCoordsFromRect(rect, isCard));
    }
    setShowMenu(!showMenu);
  };

  // Modifier click selects instead of editing. Once a selection exists a plain
  // click keeps extending it, so the second and third pick need no modifier.
  const handleRowClick = (e: React.MouseEvent) => {
    if (!isCard || !onSelect) {
      return false;
    }
    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
    if (additive || selectionMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(id, additive);
      return true;
    }
    return false;
  };

  // Cards portal their menu to the body with viewport coordinates so a
  // scrolling Kanban column cannot clip it. List rows keep the inline dropdown.
  const renderMenuShell = (children: React.ReactNode) => {
    if (!isCard) {
      return (
        <div className="menu-dropdown" ref={menuDropdownRef}>
          {children}
        </div>
      );
    }

    return createPortal(
      <div
        className="menu-dropdown"
        ref={menuDropdownRef}
        style={{
          position: "fixed",
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
          zIndex: 10000,
        }}
      >
        {children}
      </div>,
      document.body,
    );
  };

  // Handle ESC key and clicks outside to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Remove focus from any active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        if (showMenu) {
          setShowMenu(false);
        }
        if (showDatePicker) {
          setShowDatePicker(false);
          setCustomDate("");
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu) {
        const target = e.target as Node;
        const isInsideButton = menuButtonRef.current?.contains(target);
        const isInsideDropdown = menuDropdownRef.current?.contains(target);
        const isInsideArchivedMenu = archivedMenuRef.current?.contains(target);

        if (!isInsideButton && !isInsideDropdown && !isInsideArchivedMenu) {
          setShowMenu(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, showDatePicker]);

  return (
    <>
      <div
        ref={isCard ? undefined : setNodeRef}
        style={style}
        className={`todo-item ${pinned && !isPinnedView ? "pinned" : ""} ${
          isCard ? "todo-item-card" : ""
        } ${isSelected ? "selected" : ""}`}
        onMouseEnter={() => onHoverChange?.(id)}
        onMouseLeave={() => onHoverChange?.(null)}
        onClick={isCard ? handleRowClick : undefined}
      >
        {/* Drag handle. Cards use the handle supplied by the board wrapper. */}
        {isCard ? (
          dragHandle
        ) : (
          <div {...attributes} {...listeners} className="drag-handle">
            ⋮⋮
          </div>
        )}

        {/* Pin icon for pinned todos (only on date pages, not in pinned section) */}
        {pinned && !isPinnedView && (
          <div className="pin-icon">
            <DrawingPinFilledIcon width={14} height={14} />
          </div>
        )}

        {/* Checkbox for all items */}
        <div
          className={`todo-checkbox ${completed ? "checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            void handleCheckboxToggle();
          }}
        >
          {completed && "✓"}
        </div>

        {/* Content */}
        <div className="todo-content">
          {isEditing ? (
            <textarea
              className={`todo-input ${
                type === "h1"
                  ? "todo-header-h1"
                  : type === "h2"
                    ? "todo-header-h2"
                    : type === "h3"
                      ? "todo-header-h3"
                      : ""
              }`}
              value={editContent}
              onChange={handleContentChange}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                  // On desktop: Enter saves the todo
                  e.preventDefault();
                  handleBlur();
                } else if (e.key === "Enter" && e.shiftKey && isMobile) {
                  // On mobile: Shift+Enter saves the todo
                  e.preventDefault();
                  handleBlur();
                } else if (e.key === "Escape") {
                  // ESC cancels editing
                  e.preventDefault();
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  setEditContent(content);
                  setIsEditing(false);
                }
                // Shift+Enter on desktop or Enter on mobile allows new lines
              }}
              autoFocus
              rows={3}
              spellCheck={true}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
          ) : (
            <div
              className={`todo-text ${
                type === "h1"
                  ? "todo-header-h1"
                  : type === "h2"
                    ? "todo-header-h2"
                    : type === "h3"
                      ? "todo-header-h3"
                      : ""
              }`}
              onClick={(e) => {
                // Selecting takes precedence over opening the editor
                if (handleRowClick(e)) {
                  return;
                }
                setIsEditing(true);
              }}
            >
              {content}
            </div>
          )}
        </div>

        {/* Three dots menu */}
        <div className="todo-menu">
          <button
            ref={menuButtonRef}
            className="menu-button"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuToggle();
            }}
          >
            ⋯
          </button>

          {showMenu &&
            (isArchived ? (
              createPortal(
                <div
                  ref={archivedMenuRef}
                  className="menu-dropdown"
                  style={{
                    position: isCard ? "fixed" : "absolute",
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                    zIndex: 10000,
                    minWidth: "160px",
                    maxWidth: "180px",
                  }}
                >
                  {!completed && (
                    <div className="menu-item" onClick={handleUnarchive}>
                      Unarchive
                    </div>
                  )}
                  <div className="menu-item danger" onClick={handleDeleteClick}>
                    Delete
                  </div>
                </div>,
                document.body
              )
            ) : (
              renderMenuShell(
                <>
                {/* Start Pomodoro */}
                <div
                  className="menu-item"
                  onClick={async () => {
                    triggerHaptic("light");
                    if (!isAuthenticated && onRequireSignInForMenu) {
                      setShowMenu(false);
                      onRequireSignInForMenu();
                      return;
                    }
                    setShowMenu(false);

                    setPomodoroTriggered({ todoId: id, todoTitle: content });
                  }}
                >
                  Start Pomodoro
                </div>
                {/* Send to Agent */}
                {onSendToAgent && (
                  <div
                    className="menu-item"
                    onClick={() => {
                      triggerHaptic("light");
                      if (!isAuthenticated && onRequireSignInForMenu) {
                        setShowMenu(false);
                        onRequireSignInForMenu();
                        return;
                      }
                      setShowMenu(false);
                      onSendToAgent({
                        todoId: id,
                        content,
                        folderId,
                      });
                    }}
                  >
                    Send to Agent
                  </div>
                )}
                {/* Pin */}
                {!completed && !isBacklogView && (
                  <div className="menu-item" onClick={handleTogglePin}>
                    {pinned ? "Unpin" : "Pin"}
                  </div>
                )}

                {/* Add to Backlog */}
                {!completed && !isPinnedView && (
                  <div className="menu-item" onClick={handleToggleBacklog}>
                    {backlog || isBacklogView
                      ? "Remove from Backlog"
                      : "Add to Backlog"}
                  </div>
                )}

                {/* Add Subtask */}
                {!completed && !isBacklogView && (
                  <div className="menu-item" onClick={handleAddSubtask}>
                    Add Subtask
                  </div>
                )}

                {/* Separator */}
                {!isBacklogView && <div className="menu-separator"></div>}

                {/* Move options */}
                {!isBacklogView && (
                  <>
                    {/* If todo is in a folder, only show Move to Date option */}
                    {folderId ? (
                      <div
                        className="menu-item"
                        onClick={() => {
                          triggerHaptic("light");
                          if (!isAuthenticated && onRequireSignInForMenu) {
                            setShowMenu(false);
                            onRequireSignInForMenu();
                            return;
                          }
                          setShowDatePicker(true);
                          setShowMenu(false);
                        }}
                      >
                        Move to Date…
                      </div>
                    ) : (
                      <>
                        {/* Standard date move options when not in a folder */}
                        <div
                          className="menu-item"
                          onClick={async () => {
                            try {
                              triggerHaptic("light");
                              if (!isAuthenticated && onRequireSignInForMenu) {
                                setShowMenu(false);
                                onRequireSignInForMenu();
                                return;
                              }
                              setShowMenu(false);
                              await onMoveToToday();
                            } catch (error) {
                              console.error("Error moving to today:", error);
                            }
                          }}
                        >
                          Move to Today
                        </div>
                        <div
                          className="menu-item"
                          onClick={async () => {
                            try {
                              triggerHaptic("light");
                              if (!isAuthenticated && onRequireSignInForMenu) {
                                setShowMenu(false);
                                onRequireSignInForMenu();
                                return;
                              }
                              setShowMenu(false);
                              await onMoveToTomorrow();
                            } catch (error) {
                              console.error("Error moving to tomorrow:", error);
                            }
                          }}
                        >
                          Move to Tomorrow
                        </div>
                        <div
                          className="menu-item"
                          onClick={async () => {
                            try {
                              triggerHaptic("light");
                              if (!isAuthenticated && onRequireSignInForMenu) {
                                setShowMenu(false);
                                onRequireSignInForMenu();
                                return;
                              }
                              setShowMenu(false);
                              await onMoveToNextDay();
                            } catch (error) {
                              console.error("Error moving to next day:", error);
                            }
                          }}
                        >
                          Move to Next Day
                        </div>
                        <div
                          className="menu-item"
                          onClick={async () => {
                            try {
                              triggerHaptic("light");
                              if (!isAuthenticated && onRequireSignInForMenu) {
                                setShowMenu(false);
                                onRequireSignInForMenu();
                                return;
                              }
                              setShowMenu(false);
                              await onMoveToPreviousDay();
                            } catch (error) {
                              console.error(
                                "Error moving to previous day:",
                                error
                              );
                            }
                          }}
                        >
                          Move to Previous Day
                        </div>
                        <div
                          className="menu-item"
                          onClick={() => {
                            triggerHaptic("light");
                            if (!isAuthenticated && onRequireSignInForMenu) {
                              setShowMenu(false);
                              onRequireSignInForMenu();
                              return;
                            }
                            setShowDatePicker(true);
                            setShowMenu(false);
                          }}
                        >
                          Move to Date…
                        </div>
                        {/* Show Move to Project option only when not in a folder and there are folders */}
                        {folders && folders.length > 0 && (
                          <div
                            className="menu-item"
                            onClick={() => {
                              triggerHaptic("light");
                              if (!isAuthenticated && onRequireSignInForMenu) {
                                setShowMenu(false);
                                onRequireSignInForMenu();
                                return;
                              }
                              setShowProjectSelector(true);
                              setShowMenu(false);
                            }}
                          >
                            Move to Project…
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Separator */}
                <div className="menu-separator"></div>

                {/* Delete */}
                <div className="menu-item danger" onClick={handleDeleteClick}>
                  Delete
                </div>
                </>,
              )
            ))}
        </div>

        {/* Date picker modal */}
        {showDatePicker && (
          <div
            className="date-picker-modal"
            style={{
              position: "fixed",
              top: isMobile
                ? "50%"
                : `${Math.min(menuPosition.top, window.innerHeight - 200)}px`,
              left: isMobile ? "50%" : `${menuPosition.left}px`,
              transform: isMobile ? "translate(-50%, -50%)" : "none",
              zIndex: 10000,
            }}
          >
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="date-picker-input"
              autoFocus
            />
            <button
              className="date-picker-button"
              onClick={handleMoveToCustomDate}
              disabled={!customDate}
            >
              Move
            </button>
            <button
              className="date-picker-button cancel"
              onClick={() => {
                setShowDatePicker(false);
                setCustomDate("");
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Project selector modal */}
        {showProjectSelector && (
          <div
            className="folder-selector-modal"
            style={{
              position: "fixed",
              top: isMobile
                ? "50%"
                : `${Math.min(menuPosition.top, window.innerHeight - 300)}px`,
              left: isMobile ? "50%" : `${menuPosition.left}px`,
              transform: isMobile ? "translate(-50%, -50%)" : "none",
              zIndex: 10000,
            }}
          >
            <div className="folder-selector-header">Move to Project</div>
            <div className="folder-selector-list">
              {folders
                .filter((folder) => !folder.archived)
                .map((folder) => (
                  <div
                    key={folder._id}
                    className="folder-selector-item"
                    onClick={async () => {
                      try {
                        triggerHaptic("light");
                        if (onMoveToFolder) {
                          await onMoveToFolder(folder._id);
                        }
                        setShowProjectSelector(false);
                      } catch (error) {
                        console.error("Error moving to project:", error);
                      }
                    }}
                  >
                    {folder.name}
                  </div>
                ))}
            </div>
            <button
              className="folder-selector-cancel"
              onClick={() => setShowProjectSelector(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Todo"
        message="Are you sure you want to delete this todo? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDangerous={true}
      />
    </>
  );
}
