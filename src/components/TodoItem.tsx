import React, { useState, useEffect } from "react";
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
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToTomorrow,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Handle ESC key to close menu
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMenu]);

  return (
    <div ref={setNodeRef} style={style} className="todo-item">
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
        <button className="menu-button" onClick={() => setShowMenu(!showMenu)}>
          ⋯
        </button>

        {showMenu && (
          <div className="menu-dropdown">
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
    </div>
  );
}
