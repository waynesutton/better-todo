import { useState } from "react";
import { TodoItem } from "./TodoItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { Id } from "../../convex/_generated/dataModel";

interface Todo {
  _id: Id<"todos">;
  _creationTime: number;
  userId: string;
  date: string;
  content: string;
  type: "todo" | "h1" | "h2" | "h3";
  completed: boolean;
  archived: boolean;
  order: number;
  parentId?: Id<"todos">;
  collapsed: boolean;
  pinned?: boolean;
}

interface ArchiveSectionProps {
  archivedTodos: Todo[];
  onMoveToPreviousDay: (id: Id<"todos">) => void;
  onMoveToNextDay: (id: Id<"todos">) => void;
  onMoveToTomorrow: (id: Id<"todos">) => void;
  onDeleteArchived: (id: Id<"todos">) => void;
  onDeleteAllArchived: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export function ArchiveSection({
  archivedTodos,
  onMoveToPreviousDay,
  onMoveToNextDay,
  onMoveToTomorrow,
  onDeleteArchived,
  onDeleteAllArchived,
  isExpanded,
  onToggleExpanded,
}: ArchiveSectionProps) {
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    todoId: Id<"todos"> | null;
    todoContent: string;
  }>({ isOpen: false, todoId: null, todoContent: "" });
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  if (archivedTodos.length === 0) {
    return null;
  }

  const handleDeleteClick = (id: Id<"todos">, content: string) => {
    setConfirmDelete({
      isOpen: true,
      todoId: id,
      todoContent: content,
    });
  };

  const confirmDeleteTodo = () => {
    if (confirmDelete.todoId) {
      onDeleteArchived(confirmDelete.todoId);
    }
    setConfirmDelete({ isOpen: false, todoId: null, todoContent: "" });
  };

  const cancelDelete = () => {
    setConfirmDelete({ isOpen: false, todoId: null, todoContent: "" });
  };

  const confirmDeleteAllArchived = () => {
    onDeleteAllArchived();
    setConfirmDeleteAll(false);
  };

  return (
    <div className="archive-section">
      <div className="archive-header-wrapper">
        <div className="archive-header" onClick={onToggleExpanded}>
          <div className="archive-title">
            <span className={`collapse-icon ${isExpanded ? "" : "collapsed"}`}>
              ▼
            </span>
            Done
          </div>
          <span className="archive-count">
            {archivedTodos.length} item{archivedTodos.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          className="archive-delete-all-button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDeleteAll(true);
          }}
          title="Delete all archived todos"
        >
          Delete All
        </button>
      </div>

      {isExpanded && (
        <div className="archive-content">
          {archivedTodos.map((todo) => (
            <div key={todo._id} className="archived-todo-wrapper">
              <TodoItem
                id={todo._id}
                content={todo.content}
                type={todo.type}
                completed={todo.completed}
                collapsed={todo.collapsed}
                isArchived={true}
                pinned={todo.pinned}
                onMoveToPreviousDay={() => onMoveToPreviousDay(todo._id)}
                onMoveToNextDay={() => onMoveToNextDay(todo._id)}
                onMoveToTomorrow={() => onMoveToTomorrow(todo._id)}
              />
              <button
                className="archived-delete-button"
                onClick={() => handleDeleteClick(todo._id, todo.content)}
                title="Delete archived todo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Delete Archived Todo"
        message={`Are you sure you want to permanently delete this todo? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteTodo}
        onCancel={cancelDelete}
        isDangerous={true}
      />

      <ConfirmDialog
        isOpen={confirmDeleteAll}
        title="Delete All Archived Todos"
        message={`Are you sure you want to permanently delete all ${archivedTodos.length} archived todo${archivedTodos.length === 1 ? "" : "s"}? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={confirmDeleteAllArchived}
        onCancel={() => setConfirmDeleteAll(false)}
        isDangerous={true}
      />
    </div>
  );
}
