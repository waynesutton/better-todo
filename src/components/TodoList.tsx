import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TodoItem } from "./TodoItem";
import { ArchiveSection } from "./ArchiveSection";
import { NotesSection, AddNoteButton } from "./NotesSection";
import { ConfirmDialog } from "./ConfirmDialog";
import { Id } from "../../convex/_generated/dataModel";
import { format, addDays, subDays } from "date-fns";

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

export interface TodoListProps {
  todos: Todo[];
  date: string;
  expandedNoteId: string | null;
  onNoteExpanded: () => void;
  isPinnedView?: boolean;
}

export function TodoList({
  todos,
  date,
  expandedNoteId,
  onNoteExpanded,
  isPinnedView = false,
}: TodoListProps) {
  const [newTodoContent, setNewTodoContent] = useState("");
  const [focusedInput, setFocusedInput] = useState(false);
  const todoInputRef = React.useRef<HTMLTextAreaElement>(null);
  const [confirmArchiveAll, setConfirmArchiveAll] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const createTodo = useMutation(api.todos.createTodo);
  const reorderTodos = useMutation(api.todos.reorderTodos);
  const moveTodoToDate = useMutation(api.todos.moveTodoToDate);
  const deleteTodo = useMutation(api.todos.deleteTodo);
  const createNote = useMutation(api.notes.createNote);
  const archiveAllTodos = useMutation(api.todos.archiveAllTodos);
  const deleteAllTodos = useMutation(api.todos.deleteAllTodos);
  const deleteAllArchivedTodos = useMutation(api.todos.deleteAllArchivedTodos);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Separate archived and active todos
  const activeTodos = todos.filter((t) => !t.archived);
  const archivedTodos = todos.filter((t) => t.archived);

  // Filter out nested items that should be hidden
  const visibleActiveTodos = activeTodos.filter((todo) => {
    if (!todo.parentId) return true;

    // Check if parent is collapsed
    const parent = todos.find((t) => t._id === todo.parentId);
    return parent ? !parent.collapsed : true;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeTodos.findIndex((t) => t._id === active.id);
      const newIndex = activeTodos.findIndex((t) => t._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderTodos({
          todoId: active.id as Id<"todos">,
          newOrder: newIndex,
        });
      }
    }
  };

  const handleAddTodo = async () => {
    if (!newTodoContent.trim()) return;

    // Detect type based on markdown syntax (only check first line for headers)
    const firstLine = newTodoContent.split("\n")[0];
    let type: "todo" | "h1" | "h2" | "h3" = "todo";
    let content = newTodoContent;

    if (firstLine.startsWith("### ")) {
      type = "h3";
      content = content.substring(4);
    } else if (firstLine.startsWith("## ")) {
      type = "h2";
      content = content.substring(3);
    } else if (firstLine.startsWith("# ")) {
      type = "h1";
      content = content.substring(2);
    }

    await createTodo({
      date,
      content: content,
      type,
    });

    setNewTodoContent("");
    setFocusedInput(false);
    // Close archive section when adding a new todo
    setArchiveExpanded(false);
  };

  const handleMoveToPreviousDay = async (todoId: Id<"todos">) => {
    const previousDate = format(
      subDays(new Date(date + "T00:00:00"), 1),
      "yyyy-MM-dd",
    );
    await moveTodoToDate({
      todoId,
      newDate: previousDate,
    });
  };

  const handleMoveToNextDay = async (todoId: Id<"todos">) => {
    const nextDate = format(
      addDays(new Date(date + "T00:00:00"), 1),
      "yyyy-MM-dd",
    );
    await moveTodoToDate({
      todoId,
      newDate: nextDate,
    });
  };

  const handleMoveToTomorrow = async (todoId: Id<"todos">) => {
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    await moveTodoToDate({
      todoId,
      newDate: tomorrow,
    });
  };

  const handleAddNote = async () => {
    await createNote({ date, title: "Untitled" });
  };

  const handleArchiveAllConfirm = async () => {
    await archiveAllTodos({ date });
    setConfirmArchiveAll(false);
  };

  const handleDeleteAllConfirm = async () => {
    await deleteAllTodos({ date });
    setConfirmDeleteAll(false);
  };

  const handleDeleteArchived = async (todoId: Id<"todos">) => {
    await deleteTodo({ id: todoId });
  };

  const handleDeleteAllArchived = async () => {
    await deleteAllArchivedTodos({ date });
  };

  return (
    <div
      className="todo-container"
      onClick={(e) => {
        // Focus input when clicking on empty space
        if (
          e.target === e.currentTarget ||
          (e.target as HTMLElement).classList.contains("todo-container")
        ) {
          setFocusedInput(true);
        }
      }}
    >
      {/* Active todos with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={activeTodos.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleActiveTodos.map((todo) => (
            <TodoItem
              key={todo._id}
              id={todo._id}
              content={todo.content}
              type={todo.type}
              completed={todo.completed}
              collapsed={todo.collapsed}
              date={todo.date}
              pinned={todo.pinned}
              isPinnedView={isPinnedView}
              onMoveToPreviousDay={() => handleMoveToPreviousDay(todo._id)}
              onMoveToNextDay={() => handleMoveToNextDay(todo._id)}
              onMoveToTomorrow={() => handleMoveToTomorrow(todo._id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Notion-like inline input - hide on pinned view */}
      {!isPinnedView && (
        <div className="inline-todo-input">
          <textarea
            ref={todoInputRef}
            className="notion-input"
            placeholder={
              isMobile
                ? "Type to add a todo... (Use #, ##, ### for headers)"
                : "Type to add a todo... (Use #, ##, ### for headers, Enter for new lines, Shift+Enter to create)"
            }
            value={newTodoContent}
            onChange={(e) => {
              setNewTodoContent(e.target.value);
              // Auto-resize textarea based on content
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onFocus={() => setFocusedInput(true)}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              const lines = pastedText
                .split("\n")
                .filter((line) => line.trim())
                .map((line) =>
                  line
                    .replace(/^[\s-*•]+/, "")
                    .replace(/^\[[ x]\]\s*/, "")
                    .trim(),
                )
                .filter((line) => line);

              if (lines.length > 1) {
                e.preventDefault();
                lines.forEach(async (line) => {
                  let type: "todo" | "h1" | "h2" | "h3" = "todo";
                  let content = line;

                  if (content.startsWith("### ")) {
                    type = "h3";
                    content = content.substring(4);
                  } else if (content.startsWith("## ")) {
                    type = "h2";
                    content = content.substring(3);
                  } else if (content.startsWith("# ")) {
                    type = "h1";
                    content = content.substring(2);
                  }

                  await createTodo({
                    date,
                    content: content.trim(),
                    type,
                  });
                });
                setNewTodoContent("");
                // Close archive section when adding todos via paste
                setArchiveExpanded(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                // Shift+Enter creates the todo
                e.preventDefault();
                handleAddTodo();
                // Reset textarea height
                (e.target as HTMLTextAreaElement).style.height = "auto";
              } else if (e.key === "Enter") {
                // Regular Enter allows new lines
                return;
              }
            }}
            autoFocus={focusedInput}
            rows={1}
            spellCheck={true}
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />
          {isMobile && newTodoContent.trim() && (
            <button
              className="mobile-add-button"
              onClick={() => {
                handleAddTodo();
                if (todoInputRef.current) {
                  todoInputRef.current.style.height = "auto";
                }
              }}
              title="Add todo"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Add note button - hide on pinned view */}
      {!isPinnedView && <AddNoteButton date={date} onAddNote={handleAddNote} />}

      {/* Notes section below add note button - hide on pinned view */}
      {!isPinnedView && (
        <NotesSection
          date={date}
          expandedNoteId={expandedNoteId}
          onNoteExpanded={onNoteExpanded}
        />
      )}

      {/* Archive section at the bottom */}
      <ArchiveSection
        archivedTodos={archivedTodos}
        onMoveToPreviousDay={handleMoveToPreviousDay}
        onMoveToNextDay={handleMoveToNextDay}
        onMoveToTomorrow={handleMoveToTomorrow}
        onDeleteArchived={handleDeleteArchived}
        onDeleteAllArchived={handleDeleteAllArchived}
        isExpanded={archiveExpanded}
        onToggleExpanded={() => setArchiveExpanded(!archiveExpanded)}
      />

      {/* Bulk action buttons at the bottom - hide on pinned view */}
      {activeTodos.length > 0 && !isPinnedView && (
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
    </div>
  );
}
