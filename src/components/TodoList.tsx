import React, { useState, useImperativeHandle, forwardRef } from "react";
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
import {
  NotesSection,
  AddNoteButton,
  PinnedNotesSection,
} from "./NotesSection";
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
  backlog?: boolean;
}

export interface TodoListProps {
  todos: Todo[];
  date: string;
  expandedNoteId: string | null;
  onNoteExpanded: () => void;
  isPinnedView?: boolean;
  isBacklogView?: boolean;
  todoInputRef?: React.RefObject<HTMLTextAreaElement>;
  focusedTodoIndex?: number;
  onFocusFirstTodo?: (callback: () => void) => void;
  onRequireSignIn?: () => void; // trigger styled auth modal instead of alert
  onRequireSignInForNote?: () => void; // trigger styled auth modal for notes
  onTodoHover?: (id: Id<"todos"> | null) => void;
  openMenuForTodoId?: Id<"todos"> | null;
  openMenuTrigger?: number;
  isDemoMode?: boolean; // for logged out users with 3 todo limit
  demoTodos?: any[];
  setDemoTodos?: React.Dispatch<React.SetStateAction<any[]>>;
}

export interface TodoListRef {
  addNote: () => void;
}

export const TodoList = forwardRef<TodoListRef, TodoListProps>(
  (
    {
      todos,
      date,
      expandedNoteId,
      onNoteExpanded,
      isPinnedView = false,
      isBacklogView = false,
      todoInputRef: externalTodoInputRef,
      focusedTodoIndex = -1,
      onFocusFirstTodo,
      onRequireSignIn,
      onRequireSignInForNote,
      onTodoHover,
      openMenuForTodoId,
      openMenuTrigger,
      isDemoMode = false,
      demoTodos = [],
      setDemoTodos,
    },
    ref,
  ) => {
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

    // Separate archived and active todos, and sort pinned to the top
    const activeTodos = todos
      .filter((t) => !t.archived)
      .sort((a, b) => {
        // Sort pinned todos to the top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Keep original order for same pinned status
        return a.order - b.order;
      });

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

      // Demo mode: enforce 3 todo limit
      if (isDemoMode) {
        const activeDemoTodos = demoTodos.filter((t: any) => !t.archived);
        if (activeDemoTodos.length >= 3) {
          // Show sign in modal when limit reached
          if (onRequireSignIn) {
            onRequireSignIn();
          }
          return;
        }

        // Create demo todo
        const newDemoTodo = {
          _id: `demo-${Date.now()}` as Id<"todos">,
          _creationTime: Date.now(),
          userId: "demo",
          date,
          content: newTodoContent,
          type: "todo" as "todo" | "h1" | "h2" | "h3",
          completed: false,
          archived: false,
          order: demoTodos.length,
          collapsed: false,
        };

        if (setDemoTodos) {
          setDemoTodos([...demoTodos, newDemoTodo]);
        }

        setNewTodoContent("");
        setFocusedInput(false);

        // Show sign in modal after creating the 3rd todo
        if (activeDemoTodos.length === 2 && onRequireSignIn) {
          setTimeout(() => {
            onRequireSignIn();
          }, 100);
        }

        return;
      }

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

    const handleMoveToCustomDate = async (
      todoId: Id<"todos">,
      newDate: string,
    ) => {
      await moveTodoToDate({
        todoId,
        newDate,
      });
    };

    const [newNoteId, setNewNoteId] = useState<Id<"notes"> | null>(null);

    const handleAddNote = async () => {
      try {
        const noteId = await createNote({ date, title: "Untitled" });
        setNewNoteId(noteId);
        // Clear the newNoteId after a short delay to allow the focus to happen
        setTimeout(() => setNewNoteId(null), 100);
      } catch (error) {
        console.error("Error creating note:", error);
        if (onRequireSignInForNote) {
          onRequireSignInForNote();
        } else {
          alert("Failed to create note. Please make sure you're signed in.");
        }
      }
    };

    // Handle demo mode toggle (archives todo when checked)
    const handleDemoToggle = (todoId: Id<"todos">) => {
      if (setDemoTodos) {
        setDemoTodos((prev) =>
          prev.map((t) => (t._id === todoId ? { ...t, archived: true } : t)),
        );
      }
    };

    // Expose addNote method through ref
    useImperativeHandle(ref, () => ({
      addNote: handleAddNote,
    }));

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
        {/* Pinned notes section - rendered at top above todos */}
        {!isPinnedView && !isBacklogView && (
          <PinnedNotesSection
            date={date}
            expandedNoteId={expandedNoteId}
            onNoteExpanded={onNoteExpanded}
            focusNoteId={newNoteId}
          />
        )}

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
            {groupedTodos.root?.map((parent) => {
              // Find actual index in activeTodos array
              const parentActualIndex = activeTodos.findIndex(
                (t) => t._id === parent._id,
              );
              return (
                <div key={parent._id}>
                  <div
                    className={`todo-item-wrapper ${focusedTodoIndex === parentActualIndex ? "focused" : ""}`}
                  >
                    <TodoItem
                      id={parent._id}
                      content={parent.content}
                      type={parent.type}
                      completed={parent.completed}
                      collapsed={parent.collapsed}
                      pinned={parent.pinned}
                      backlog={parent.backlog}
                      isPinnedView={isPinnedView}
                      isBacklogView={isBacklogView}
                      onMoveToPreviousDay={() =>
                        handleMoveToPreviousDay(parent._id)
                      }
                      onMoveToNextDay={() => handleMoveToNextDay(parent._id)}
                      onMoveToTomorrow={() => handleMoveToTomorrow(parent._id)}
                      onMoveToCustomDate={(date) =>
                        handleMoveToCustomDate(parent._id, date)
                      }
                      onHoverChange={onTodoHover}
                      openMenuTrigger={
                        openMenuForTodoId === parent._id
                          ? openMenuTrigger
                          : undefined
                      }
                      isDemoMode={isDemoMode}
                      onDemoToggle={handleDemoToggle}
                    />
                  </div>
                  {!parent.collapsed &&
                    groupedTodos[parent._id]?.map((child) => {
                      // Find actual index in activeTodos array for child
                      const childActualIndex = activeTodos.findIndex(
                        (t) => t._id === child._id,
                      );
                      return (
                        <div
                          key={child._id}
                          className={`todo-item nested ${focusedTodoIndex === childActualIndex ? "focused" : ""}`}
                        >
                          <TodoItem
                            id={child._id}
                            content={child.content}
                            type={child.type}
                            completed={child.completed}
                            collapsed={child.collapsed}
                            pinned={child.pinned}
                            backlog={child.backlog}
                            isPinnedView={isPinnedView}
                            isBacklogView={isBacklogView}
                            onMoveToPreviousDay={() =>
                              handleMoveToPreviousDay(child._id)
                            }
                            onMoveToNextDay={() =>
                              handleMoveToNextDay(child._id)
                            }
                            onMoveToTomorrow={() =>
                              handleMoveToTomorrow(child._id)
                            }
                            onMoveToCustomDate={(date) =>
                              handleMoveToCustomDate(child._id, date)
                            }
                            onHoverChange={onTodoHover}
                            openMenuTrigger={
                              openMenuForTodoId === child._id
                                ? openMenuTrigger
                                : undefined
                            }
                            isDemoMode={isDemoMode}
                            onDemoToggle={handleDemoToggle}
                          />
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Notion-like inline input - hide on pinned view and backlog view */}
        {!isPinnedView && !isBacklogView && (
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

        {/* Add note button - hide on pinned view and backlog view */}
        {!isPinnedView && !isBacklogView && (
          <AddNoteButton onAddNote={handleAddNote} />
        )}

        {/* Notes section below add note button - hide on pinned view and backlog view */}
        {!isPinnedView && !isBacklogView && (
          <NotesSection
            date={date}
            expandedNoteId={expandedNoteId}
            onNoteExpanded={onNoteExpanded}
            focusNoteId={newNoteId}
          />
        )}
      </div>
    );
  },
);

TodoList.displayName = "TodoList";
