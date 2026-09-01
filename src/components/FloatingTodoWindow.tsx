import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { PictureInPicture } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "../context/ThemeContext";
import { useFloatWindow } from "../lib/useFloatWindow";

// Header icon button that pops the selected day's todos out of the browser
// into a floating on-screen window (Document PiP with popup fallback)
export function FloatingTodoButton({ date }: { date: string }) {
  const { theme } = useTheme();
  const { isAuthenticated } = useConvexAuth();
  const { container, isOpen, toggle, setTheme } = useFloatWindow();

  // Keep the float window theme in sync with the app theme
  useEffect(() => {
    if (isOpen) setTheme(theme);
  }, [theme, isOpen, setTheme]);

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!isAuthenticated || !isValidDate) return null;

  return (
    <>
      <button
        className={`search-button ${isOpen ? "nav-icon-active" : ""}`}
        onClick={() =>
          toggle({
            width: 320,
            height: 460,
            title: "Better Todo",
            name: "better-todo-float-todos",
            theme,
          })
        }
        title={isOpen ? "Close floating todos" : "Float todos on screen"}
      >
        <PictureInPicture size={18} />
      </button>
      {container &&
        createPortal(<FloatingTodoContent date={date} />, container)}
    </>
  );
}

// One draggable todo. The grip owns the drag listeners so a click anywhere
// else on the row still toggles the checkbox.
function FloatTodoRow({
  todo,
  onToggle,
}: {
  todo: Doc<"todos">;
  onToggle: (todo: Doc<"todos">) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo._id });

  return (
    <div
      ref={setNodeRef}
      className="float-todo-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <span className="float-todo-grip" {...attributes} {...listeners}>
        ⋮⋮
      </span>
      <input
        id={`float-todo-${todo._id}`}
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo)}
      />
      <label className="float-todo-text" htmlFor={`float-todo-${todo._id}`}>
        {todo.content}
      </label>
    </div>
  );
}

// Live todo list rendered inside the float window via portal
function FloatingTodoContent({ date }: { date: string }) {
  const todos = useQuery(api.todos.getTodosByDate, { date });
  const updateTodo = useMutation(api.todos.updateTodo);
  const createTodo = useMutation(api.todos.createTodo);
  const reorderTodos = useMutation(api.todos.reorderTodos);
  const [newTodo, setNewTodo] = useState("");

  // Small distance threshold so a slight finger or mouse wobble on the grip
  // does not read as a drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Top level todo items only, incomplete first then completed
  const items = (todos ?? []).filter(
    (t) => t.type === "todo" && !t.archived && !t.parentId,
  );
  const incomplete = items.filter((t) => !t.completed);
  const completed = items.filter((t) => t.completed);

  const handleToggle = (todo: Doc<"todos">) => {
    updateTodo({ id: todo._id, completed: !todo.completed }).catch(
      console.error,
    );
  };

  // The window shows a subset of the day (no headers, subtasks or archived
  // rows), so a visible index cannot be sent to the mutation directly. Anchor
  // the drop to whichever visible todo it lands next to, then translate that
  // into an index in the full day list the mutation splices into.
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!todos || !over || active.id === over.id) return;

    const oldIndex = incomplete.findIndex((t) => t._id === active.id);
    const newIndex = incomplete.findIndex((t) => t._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(incomplete, oldIndex, newIndex);
    const rest = todos.filter((t) => t._id !== active.id);

    const before = reordered[newIndex - 1];
    const after = reordered[newIndex + 1];
    const newOrder = before
      ? rest.findIndex((t) => t._id === before._id) + 1
      : after
        ? rest.findIndex((t) => t._id === after._id)
        : -1;
    if (newOrder < 0) return;

    reorderTodos({ todoId: active.id as Id<"todos">, newOrder }).catch(
      console.error,
    );
  };

  const handleAdd = async () => {
    const content = newTodo.trim();
    if (!content) return;
    setNewTodo("");
    await createTodo({ date, content, type: "todo" });
  };

  return (
    <div className="float-window">
      <div className="float-window-header">
        <span className="float-window-title">Todos</span>
        <span className="float-window-date">
          {format(parseISO(date), "EEE MMM d")}
        </span>
      </div>

      <div className="float-window-list">
        {todos === undefined && (
          <div className="float-window-empty">Loading...</div>
        )}
        {todos !== undefined && items.length === 0 && (
          <div className="float-window-empty">No todos yet</div>
        )}

        {/* Autoscroll is off because dnd-kit sizes it against the main window */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          <SortableContext
            items={incomplete.map((t) => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {incomplete.map((todo) => (
              <FloatTodoRow
                key={todo._id}
                todo={todo}
                onToggle={handleToggle}
              />
            ))}
          </SortableContext>
        </DndContext>

        {completed.length > 0 && (
          <div className="float-window-divider">Done</div>
        )}
        {completed.map((todo) => (
          <div key={todo._id} className="float-todo-row completed">
            {/* Spacer keeps completed text aligned with the draggable rows */}
            <span className="float-todo-grip is-static">⋮⋮</span>
            <input
              id={`float-todo-${todo._id}`}
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo)}
            />
            <label
              className="float-todo-text"
              htmlFor={`float-todo-${todo._id}`}
            >
              {todo.content}
            </label>
          </div>
        ))}
      </div>

      <div className="float-window-input-row">
        <input
          className="float-window-input"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a todo"
        />
      </div>
    </div>
  );
}
