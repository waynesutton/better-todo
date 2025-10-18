// In-memory storage for unsigned users (lost on reload)
interface Todo {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;
  content: string;
  type: "todo" | "h1" | "h2" | "h3";
  completed: boolean;
  archived: boolean;
  order: number;
  parentId?: string;
  collapsed: boolean;
  pinned?: boolean;
}

interface Note {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;
  title?: string;
  content: string;
  order?: number;
  collapsed?: boolean;
}

class LocalDataStore {
  private todos: Map<string, Todo> = new Map();
  private notes: Map<string, Note> = new Map();
  private nextId = 1;

  // Generate a unique ID for local data
  private generateId(): string {
    return `local_${this.nextId++}_${Date.now()}`;
  }

  // Todos
  getTodosByDate(date: string): Todo[] {
    const todos = Array.from(this.todos.values()).filter(
      (t) => t.date === date,
    );
    return todos.sort((a, b) => a.order - b.order);
  }

  getPinnedTodos(): Todo[] {
    const todos = Array.from(this.todos.values()).filter(
      (t) => t.pinned === true,
    );
    return todos.sort((a, b) => a.order - b.order);
  }

  getAvailableDates(): string[] {
    const dates = new Set<string>();
    this.todos.forEach((todo) => dates.add(todo.date));
    return Array.from(dates).sort().reverse();
  }

  createTodo(args: {
    date: string;
    content: string;
    type: "todo" | "h1" | "h2" | "h3";
    parentId?: string;
  }): string {
    const existingTodos = this.getTodosByDate(args.date);
    const maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    const todo: Todo = {
      _id: this.generateId(),
      _creationTime: Date.now(),
      userId: "local",
      date: args.date,
      content: args.content,
      type: args.type,
      completed: false,
      archived: false,
      order: maxOrder + 1,
      parentId: args.parentId,
      collapsed: args.type !== "todo",
    };

    this.todos.set(todo._id, todo);
    return todo._id;
  }

  updateTodo(args: {
    id: string;
    content?: string;
    completed?: boolean;
    collapsed?: boolean;
    archived?: boolean;
    pinned?: boolean;
  }): void {
    const todo = this.todos.get(args.id);
    if (!todo) return;

    if (args.content !== undefined) todo.content = args.content;
    if (args.collapsed !== undefined) todo.collapsed = args.collapsed;
    if (args.pinned !== undefined) todo.pinned = args.pinned;

    if (args.completed !== undefined) {
      todo.completed = args.completed;
      if (args.completed) {
        todo.archived = true;
      } else {
        todo.archived = false;
      }
    }

    if (args.archived !== undefined) {
      todo.archived = args.archived;
    }

    this.todos.set(todo._id, todo);
  }

  deleteTodo(id: string): void {
    this.todos.delete(id);
  }

  reorderTodos(args: { todoId: string; newOrder: number }): void {
    const todo = this.todos.get(args.todoId);
    if (!todo) return;

    const todos = this.getTodosByDate(todo.date);
    const sortedTodos = todos.sort((a, b) => a.order - b.order);
    const filtered = sortedTodos.filter((t) => t._id !== args.todoId);
    filtered.splice(args.newOrder, 0, todo);

    filtered.forEach((t, i) => {
      const existing = this.todos.get(t._id);
      if (existing) {
        existing.order = i;
        this.todos.set(t._id, existing);
      }
    });
  }

  moveTodoToDate(args: { todoId: string; newDate: string }): void {
    const todo = this.todos.get(args.todoId);
    if (!todo) return;

    const existingTodos = this.getTodosByDate(args.newDate);
    const maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    todo.date = args.newDate;
    todo.order = maxOrder + 1;
    this.todos.set(todo._id, todo);
  }

  copyTodosToDate(args: { sourceDate: string; targetDate: string }): void {
    const sourceTodos = this.getTodosByDate(args.sourceDate).filter(
      (t) => !t.archived,
    );
    const existingTodos = this.getTodosByDate(args.targetDate);
    let maxOrder =
      existingTodos.length > 0
        ? Math.max(...existingTodos.map((t) => t.order))
        : -1;

    sourceTodos.forEach((todo) => {
      maxOrder++;
      const newTodo: Todo = {
        ...todo,
        _id: this.generateId(),
        _creationTime: Date.now(),
        date: args.targetDate,
        order: maxOrder,
        completed: false,
        archived: false,
      };
      this.todos.set(newTodo._id, newTodo);
    });
  }

  archiveAllTodos(date: string): void {
    const todos = this.getTodosByDate(date).filter((t) => !t.archived);
    todos.forEach((todo) => {
      todo.archived = true;
      this.todos.set(todo._id, todo);
    });
  }

  deleteAllTodos(date: string): void {
    const todos = this.getTodosByDate(date).filter((t) => !t.archived);
    todos.forEach((todo) => this.todos.delete(todo._id));
  }

  deleteAllArchivedTodos(date: string): void {
    const todos = this.getTodosByDate(date).filter((t) => t.archived);
    todos.forEach((todo) => this.todos.delete(todo._id));
  }

  // Notes
  getNotesByDate(date: string): Note[] {
    const notes = Array.from(this.notes.values()).filter(
      (n) => n.date === date,
    );
    return notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  createNote(args: { date: string; title: string }): string {
    const existingNotes = this.getNotesByDate(args.date);
    const maxOrder =
      existingNotes.length > 0
        ? Math.max(...existingNotes.map((n) => n.order ?? 0))
        : -1;

    const note: Note = {
      _id: this.generateId(),
      _creationTime: Date.now(),
      userId: "local",
      date: args.date,
      title: args.title,
      content: "",
      order: maxOrder + 1,
      collapsed: false,
    };

    this.notes.set(note._id, note);
    return note._id;
  }

  updateNote(args: {
    id: string;
    title?: string;
    content?: string;
    collapsed?: boolean;
  }): void {
    const note = this.notes.get(args.id);
    if (!note) return;

    if (args.title !== undefined) note.title = args.title;
    if (args.content !== undefined) note.content = args.content;
    if (args.collapsed !== undefined) note.collapsed = args.collapsed;

    this.notes.set(note._id, note);
  }

  deleteNote(id: string): void {
    this.notes.delete(id);
  }

  reorderNotes(args: { date: string; noteIds: string[] }): void {
    args.noteIds.forEach((noteId, index) => {
      const note = this.notes.get(noteId);
      if (note) {
        note.order = index;
        this.notes.set(noteId, note);
      }
    });
  }

  // Search (returns empty for local mode since we're gating search)
  searchAll(_searchQuery: string): Array<any> {
    return [];
  }

  // Clear all data
  clear(): void {
    this.todos.clear();
    this.notes.clear();
    this.nextId = 1;
  }
}

// Export singleton instance
export const localData = new LocalDataStore();
