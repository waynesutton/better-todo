import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "./ConfirmDialog";

interface TodoItemProps {
  id: Id<"todos">;
  content: string;
  type: "todo" | "h1" | "h2" | "h3";
  completed: boolean;
  collapsed: boolean;
  date: string;
  isArchived?: boolean;
  pinned?: boolean;
  isPinnedView?: boolean;
  onMoveToPreviousDay: () => void;
  onMoveToNextDay: () => void;
  onMoveToTomorrow: () => void;
}

export function TodoItem({
  id,
  content,
  type,
  completed,
  collapsed,
  date,
  isArchived = false,
  pinned = false,
  isPinnedView = false,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToTomorrow,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const archivedMenuRef = useRef<HTMLDivElement>(null);

  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCheckboxToggle = async () => {
    await updateTodo({
      id,
      completed: !completed,
    });
  };

  const handleCollapseToggle = async () => {
    await updateTodo({
      id,
      collapsed: !collapsed,
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
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    await deleteTodo({ id });
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleUnarchive = async () => {
    await updateTodo({
      id,
      archived: false,
      completed: false,
    });
    setShowMenu(false);
  };

  const handleTogglePin = async () => {
    await updateTodo({
      id,
      pinned: !pinned,
    });
    setShowMenu(false);
  };

  const handleMenuToggle = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
    setShowMenu(!showMenu);
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
  }, [showMenu]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`todo-item ${pinned && !isPinnedView ? "pinned" : ""}`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className="drag-handle">
        ⋮⋮
      </div>

      {/* Checkbox for all items */}
      <div
        className={`todo-checkbox ${completed ? "checked" : ""}`}
        onClick={handleCheckboxToggle}
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
              if (e.key === "Enter" && e.shiftKey) {
                // Shift+Enter saves the todo
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
              // Regular Enter allows new lines
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
            onClick={() => setIsEditing(true)}
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
          onClick={handleMenuToggle}
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
                  position: "absolute",
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
              document.body,
            )
          ) : (
            <div className="menu-dropdown" ref={menuDropdownRef}>
              {!completed && (
                <div className="menu-item" onClick={handleTogglePin}>
                  {pinned ? "Unpin" : "Pin"}
                </div>
              )}
              <div
                className="menu-item"
                onClick={() => {
                  onMoveToTomorrow();
                  setShowMenu(false);
                }}
              >
                Move to Tomorrow
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  onMoveToPreviousDay();
                  setShowMenu(false);
                }}
              >
                Move to Previous Day
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  onMoveToNextDay();
                  setShowMenu(false);
                }}
              >
                Move to Next Day
              </div>
              <div className="menu-item danger" onClick={handleDeleteClick}>
                Delete
              </div>
            </div>
          ))}
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
    </div>
  );
}
