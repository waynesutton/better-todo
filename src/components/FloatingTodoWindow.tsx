import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PictureInPicture } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
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

// Live todo list rendered inside the float window via portal
function FloatingTodoContent({ date }: { date: string }) {
  const todos = useQuery(api.todos.getTodosByDate, { date });
  const updateTodo = useMutation(api.todos.updateTodo);
  const createTodo = useMutation(api.todos.createTodo);
  const [newTodo, setNewTodo] = useState("");

  // Top level todo items only, incomplete first then completed
  const items = (todos ?? []).filter(
    (t) => t.type === "todo" && !t.archived && !t.parentId,
  );
  const incomplete = items.filter((t) => !t.completed);
  const completed = items.filter((t) => t.completed);

  const handleToggle = (id: (typeof items)[number]["_id"], done: boolean) => {
    updateTodo({ id, completed: !done }).catch(console.error);
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

        {incomplete.map((todo) => (
          <label key={todo._id} className="float-todo-row">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo._id, todo.completed)}
            />
            <span className="float-todo-text">{todo.content}</span>
          </label>
        ))}

        {completed.length > 0 && (
          <div className="float-window-divider">Done</div>
        )}
        {completed.map((todo) => (
          <label key={todo._id} className="float-todo-row completed">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo._id, todo.completed)}
            />
            <span className="float-todo-text">{todo.content}</span>
          </label>
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
