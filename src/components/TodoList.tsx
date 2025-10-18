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
import { NotesSection, AddNoteButton } from "./NotesSection";
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
  todoInputRef?: React.RefObject<HTMLTextAreaElement>;
  focusedTodoIndex?: number;
  onFocusFirstTodo?: (callback: () => void) => void;
  onRequireSignIn?: () => void; // trigger styled auth modal instead of alert
  onRequireSignInForNote?: () => void; // trigger styled auth modal for notes
}

export function TodoList({
  todos,
  date,
  expandedNoteId,
  onNoteExpanded,
  isPinnedView = false,
  todoInputRef: externalTodoInputRef,
  focusedTodoIndex = -1,
  onFocusFirstTodo,
  onRequireSignIn,
  onRequireSignInForNote,
}: TodoListProps) {
  const [newTodoContent, setNewTodoContent] = useState("");
  const [focusedInput, setFocusedInput] = useState(false);
  const internalTodoInputRef = React.useRef<HTMLTextAreaElement>(null);
  const todoInputRef = externalTodoInputRef || internalTodoInputRef;
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
  const createNote = useMutation(api.notes.createNote);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Separate archived and active todos
  const activeTodos = todos.filter((t) => !t.archived);

  // Register focus first todo callback
  React.useEffect(() => {
    if (onFocusFirstTodo) {
      onFocusFirstTodo(() => {
        if (activeTodos.length > 0) {
          // This callback will trigger the parent to set focusedTodoIndex to 0
          return true;
        }
        return false;
      });
    }
  }, [onFocusFirstTodo, activeTodos.length]);

  // Group todos by parent-child relationships
  const groupedTodos = activeTodos.reduce(
    (acc, todo) => {
      if (todo.parentId) {
        if (!acc[todo.parentId]) acc[todo.parentId] = [];
        acc[todo.parentId].push(todo);
      } else {
        acc.root = acc.root || [];
        acc.root.push(todo);
      }
      return acc;
    },
    {} as Record<string, Todo[]>,
  );

  // Filter out nested items that should be hidden (computed inline below where needed)

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

    try {
      await createTodo({
        date,
        content: content,
        type,
      });

      setNewTodoContent("");
      setFocusedInput(false);
    } catch (error) {
      console.error("Error creating todo:", error);
      if (onRequireSignIn) {
        onRequireSignIn();
      } else {
        alert("Failed to create todo. Please make sure you're signed in.");
      }
    }
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
    try {
      await createNote({ date, title: "Untitled" });
    } catch (error) {
      console.error("Error creating note:", error);
      if (onRequireSignInForNote) {
        onRequireSignInForNote();
      } else {
        alert("Failed to create note. Please make sure you're signed in.");
      }
    }
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
          {groupedTodos.root?.map((parent, parentIndex) => (
            <div key={parent._id}>
              <div
                className={`todo-item-wrapper ${focusedTodoIndex === parentIndex ? "focused" : ""}`}
              >
                <TodoItem
                  id={parent._id}
                  content={parent.content}
                  type={parent.type}
                  completed={parent.completed}
                  collapsed={parent.collapsed}
                  pinned={parent.pinned}
                  isPinnedView={isPinnedView}
                  onMoveToPreviousDay={() =>
                    handleMoveToPreviousDay(parent._id)
                  }
                  onMoveToNextDay={() => handleMoveToNextDay(parent._id)}
                  onMoveToTomorrow={() => handleMoveToTomorrow(parent._id)}
                />
              </div>
              {!parent.collapsed &&
                groupedTodos[parent._id]?.map((child, childIndex) => {
                  const childGlobalIndex = parentIndex + childIndex + 1;
                  return (
                    <div
                      key={child._id}
                      className={`todo-item nested ${focusedTodoIndex === childGlobalIndex ? "focused" : ""}`}
                    >
                      <TodoItem
                        id={child._id}
                        content={child.content}
                        type={child.type}
                        completed={child.completed}
                        collapsed={child.collapsed}
                        pinned={child.pinned}
                        isPinnedView={isPinnedView}
                        onMoveToPreviousDay={() =>
                          handleMoveToPreviousDay(child._id)
                        }
                        onMoveToNextDay={() => handleMoveToNextDay(child._id)}
                        onMoveToTomorrow={() => handleMoveToTomorrow(child._id)}
                      />
                    </div>
                  );
                })}
            </div>
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
                ? " Type to add a todo..."
                : "Type to add a todo... (Shift+Enter for new lines, Enter to create)"
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
                (async () => {
                  try {
                    for (const line of lines) {
                      await createTodo({
                        date,
                        content: line.trim(),
                        type: "todo",
                      });
                    }
                    setNewTodoContent("");
                  } catch (err) {
                    console.error("Error creating todos from paste:", err);
                    if (onRequireSignIn) {
                      onRequireSignIn();
                    }
                  }
                })();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                // Tab to focus first todo
                e.preventDefault();
                if (activeTodos.length > 0 && onFocusFirstTodo) {
                  // Blur the textarea first
                  todoInputRef.current?.blur();
                  // Call the callback to focus first todo
                  onFocusFirstTodo(() => true);
                }
              } else if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                // On desktop: Enter saves the todo
                e.preventDefault();
                handleAddTodo();
                // Reset textarea height
                (e.target as HTMLTextAreaElement).style.height = "auto";
              } else if (e.key === "Enter" && e.shiftKey && isMobile) {
                // On mobile: Shift+Enter saves the todo
                e.preventDefault();
                handleAddTodo();
                // Reset textarea height
                (e.target as HTMLTextAreaElement).style.height = "auto";
              } else if (e.key === "Enter") {
                // Shift+Enter on desktop or Enter on mobile allows new lines
                return;
              }
            }}
            autoFocus={focusedInput}
            rows={1}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-1p-ignore
            data-lpignore="true"
            inputMode="text"
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
      {!isPinnedView && <AddNoteButton onAddNote={handleAddNote} />}

      {/* Notes section below add note button - hide on pinned view */}
      {!isPinnedView && (
        <NotesSection
          date={date}
          expandedNoteId={expandedNoteId}
          onNoteExpanded={onNoteExpanded}
        />
      )}
    </div>
  );
}
