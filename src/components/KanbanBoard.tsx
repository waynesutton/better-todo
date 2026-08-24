import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  DotsSixVertical,
  DotsThree,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { TodoItem } from "./TodoItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { triggerHaptic, triggerSelectionHaptic } from "../lib/haptics";

export interface KanbanTodo {
  _id: Id<"todos">;
  _creationTime: number;
  content: string;
  type: "todo" | "h1" | "h2" | "h3";
  completed: boolean;
  archived: boolean;
  order: number;
  collapsed: boolean;
  parentId?: Id<"todos">;
  pinned?: boolean;
  backlog?: boolean;
  kanbanColumn?: string;
  kanbanOrder?: number;
}

interface BoardColumn {
  key: string;
  label: string;
  order: number;
  isDone: boolean;
}

/** Props every card forwards straight through to TodoItem. */
interface SharedCardProps {
  folderId?: Id<"folders">;
  folders: Array<{ _id: Id<"folders">; name: string; archived: boolean }>;
  onMoveToPreviousDay: (id: Id<"todos">) => void;
  onMoveToNextDay: (id: Id<"todos">) => void;
  onMoveToTomorrow: (id: Id<"todos">) => void;
  onMoveToToday: (id: Id<"todos">) => void;
  onMoveToCustomDate: (id: Id<"todos">, date: string) => void;
  onMoveToFolder: (id: Id<"todos">, folderId: Id<"folders">) => void;
  onHoverChange?: (id: Id<"todos"> | null) => void;
  openMenuForTodoId?: Id<"todos"> | null;
  openMenuTrigger?: number;
  isAuthenticated: boolean;
  onRequireSignInForMenu?: () => void;
  setPomodoroTriggered: (data: { todoId?: string; todoTitle?: string }) => void;
  onSendToAgent?: (data: {
    todoId: string;
    content: string;
    folderId?: Id<"folders">;
    date?: string;
  }) => void;
}

export interface KanbanBoardProps extends SharedCardProps {
  todos: KanbanTodo[];
  date: string;
  isBoardOfFolder: boolean;
  onRequireSignIn?: () => void;
  firstComposerRef?: React.RefObject<HTMLTextAreaElement>;
}

const MAX_COLUMNS = 12;

// Where a card belongs. Completion is shared with the list view, so it outranks
// the hand placement in `kanbanColumn`: checking a card off anywhere sends it to
// Done, and unchecking it pulls it back into the leftmost active column. Only
// active cards keep their placement. Backlogged work defaults to Backlog, so an
// existing day reads correctly on first open.
function resolveColumn(todo: KanbanTodo, columns: BoardColumn[]): string {
  if (todo.completed || todo.archived) {
    return (columns.find((c) => c.isDone) ?? columns[0]).key;
  }
  const placed = todo.kanbanColumn
    ? columns.find((c) => c.key === todo.kanbanColumn)
    : undefined;
  if (placed && !placed.isDone) {
    return placed.key;
  }
  if (todo.backlog) {
    const backlog = columns.find((c) => c.key === "backlog");
    if (backlog) return backlog.key;
  }
  return (columns.find((c) => !c.isDone) ?? columns[0]).key;
}

export function KanbanBoard({
  todos,
  date,
  isBoardOfFolder,
  onRequireSignIn,
  firstComposerRef,
  ...shared
}: KanbanBoardProps) {
  const columnsQuery = useQuery(api.kanban.getColumns);
  const moveTodosToColumn = useMutation(api.kanban.moveTodosToColumn);
  const createTodoInColumn = useMutation(api.kanban.createTodoInColumn);
  const addColumn = useMutation(api.kanban.addColumn);
  const renameColumn = useMutation(api.kanban.renameColumn);
  const deleteColumn = useMutation(api.kanban.deleteColumn);
  const reorderColumns = useMutation(api.kanban.reorderColumns);

  const [selected, setSelected] = useState<Set<Id<"todos">>>(new Set());
  const [activeCardId, setActiveCardId] = useState<Id<"todos"> | null>(null);
  const [activeColumnKey, setActiveColumnKey] = useState<string | null>(null);
  const [hoverColumnKey, setHoverColumnKey] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BoardColumn | null>(null);
  // Column order is written optimistically so header drags feel instant
  const [columnDragOrder, setColumnDragOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    // A small distance threshold lets a click still open the card for editing
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columns = useMemo<BoardColumn[]>(() => {
    const base = columnsQuery ?? [];
    if (!columnDragOrder) return base;
    const byKey = new Map(base.map((c) => [c.key, c]));
    const ordered = columnDragOrder
      .map((key) => byKey.get(key))
      .filter((c): c is BoardColumn => Boolean(c));
    // Keep any column the optimistic list has not heard about yet
    const missing = base.filter((c) => !columnDragOrder.includes(c.key));
    return [...ordered, ...missing];
  }, [columnsQuery, columnDragOrder]);

  // Cards grouped by column, each sorted by its saved board position
  const grouped = useMemo(() => {
    const map: Record<string, KanbanTodo[]> = {};
    for (const column of columns) {
      map[column.key] = [];
    }
    if (columns.length === 0) return map;

    for (const todo of todos) {
      const key = resolveColumn(todo, columns);
      (map[key] ??= []).push(todo);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aOrder = a.kanbanOrder ?? a.order;
        const bOrder = b.kanbanOrder ?? b.order;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a._creationTime - b._creationTime;
      });
    }
    return map;
  }, [todos, columns]);

  const selectionMode = selected.size > 0;

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleSelect = useCallback((id: Id<"todos">) => {
    triggerSelectionHaptic();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Cards that travel together on a drag: the whole selection when the dragged
  // card is part of it, otherwise just the dragged card
  const movingIdsFor = useCallback(
    (cardId: Id<"todos">): Id<"todos">[] => {
      if (!selected.has(cardId)) return [cardId];
      const ordered: Id<"todos">[] = [];
      for (const column of columns) {
        for (const todo of grouped[column.key] ?? []) {
          if (selected.has(todo._id)) ordered.push(todo._id);
        }
      }
      return ordered.length > 0 ? ordered : [cardId];
    },
    [selected, columns, grouped],
  );

  const runMove = useCallback(
    async (
      movingIds: Id<"todos">[],
      columnKey: string,
      orderedIds: Id<"todos">[],
    ) => {
      try {
        await moveTodosToColumn({ todoIds: movingIds, columnKey, orderedIds });
      } catch (error) {
        console.error("Error moving cards:", error);
        onRequireSignIn?.();
      }
    },
    [moveTodosToColumn, onRequireSignIn],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "column") {
      setActiveColumnKey(String(data.key));
      return;
    }
    setActiveCardId(event.active.id as Id<"todos">);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (activeColumnKey) return;
    const data = event.over?.data.current;
    if (!data) {
      setHoverColumnKey(null);
      return;
    }
    if (data.type === "card") {
      setHoverColumnKey(String(data.columnKey));
    } else if (data.type === "columnDrop" || data.type === "column") {
      setHoverColumnKey(String(data.key));
    }
  };

  // The pointer can land on a card, a column's body, or the column shell
  // itself. All three resolve to the same destination column.
  const columnKeyFromOver = (
    data: Record<string, unknown> | undefined,
  ): string | null => {
    if (!data) return null;
    if (data.type === "card") return String(data.columnKey);
    if (data.type === "columnDrop" || data.type === "column") {
      return String(data.key);
    }
    return null;
  };

  const resetDragState = () => {
    setActiveCardId(null);
    setActiveColumnKey(null);
    setHoverColumnKey(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    resetDragState();

    if (!over) return;

    // Column reorder
    if (activeData?.type === "column") {
      const overKey = columnKeyFromOver(over.data.current);
      const fromKey = String(activeData.key);
      if (!overKey || overKey === fromKey) return;

      const keys = columns.map((c) => c.key);
      const from = keys.indexOf(fromKey);
      const to = keys.indexOf(overKey);
      if (from === -1 || to === -1) return;

      const next = arrayMove(keys, from, to);
      setColumnDragOrder(next);
      void reorderColumns({ keys: next })
        .catch((error) => {
          console.error("Error reordering columns:", error);
          onRequireSignIn?.();
        })
        // Hand ordering back to the server once it has caught up
        .finally(() => setColumnDragOrder(null));
      return;
    }

    // Card move
    const cardId = active.id as Id<"todos">;
    const fromKey = String(activeData?.columnKey ?? "");
    const overData = over.data.current;

    const targetKey = columnKeyFromOver(overData);
    const overCardId =
      overData?.type === "card" ? (over.id as Id<"todos">) : null;
    if (!targetKey) return;

    const movingIds = movingIdsFor(cardId);
    const movingSet = new Set<string>(movingIds);
    const targetIds = (grouped[targetKey] ?? []).map((t) => t._id);

    // Same column, single card: arrayMove is exact
    if (
      targetKey === fromKey &&
      movingIds.length === 1 &&
      overCardId &&
      overCardId !== cardId
    ) {
      const from = targetIds.indexOf(cardId);
      const to = targetIds.indexOf(overCardId);
      if (from === -1 || to === -1) return;
      void runMove(movingIds, targetKey, arrayMove(targetIds, from, to));
      return;
    }

    const remaining = targetIds.filter((id) => !movingSet.has(id));
    let insertAt = remaining.length;
    if (overCardId && !movingSet.has(overCardId)) {
      const index = remaining.indexOf(overCardId);
      if (index !== -1) insertAt = index;
    }

    const nothingChanged =
      targetKey === fromKey &&
      remaining.length === targetIds.length - movingIds.length &&
      targetIds.slice(insertAt, insertAt + movingIds.length).join() ===
        movingIds.join();
    if (nothingChanged) return;

    const orderedIds = [
      ...remaining.slice(0, insertAt),
      ...movingIds,
      ...remaining.slice(insertAt),
    ];
    void runMove(movingIds, targetKey, orderedIds);
    if (movingIds.length > 1) clearSelection();
  };

  // Checking a card off the board keeps its column in sync with its state
  const handleCompletedChange = useCallback(
    (todo: KanbanTodo, next: boolean) => {
      const doneColumn = columns.find((c) => c.isDone);
      const activeColumn = columns.find((c) => !c.isDone);
      const target = next ? doneColumn : activeColumn;
      if (!target) return;

      const targetIds = (grouped[target.key] ?? [])
        .map((t) => t._id)
        .filter((id) => id !== todo._id);
      void runMove([todo._id], target.key, [...targetIds, todo._id]);
    },
    [columns, grouped, runMove],
  );

  const handleBulkMove = async (columnKey: string) => {
    const movingIds = Array.from(selected);
    if (movingIds.length === 0) return;
    triggerHaptic("light");
    const movingSet = new Set<string>(movingIds);
    const targetIds = (grouped[columnKey] ?? [])
      .map((t) => t._id)
      .filter((id) => !movingSet.has(id));
    await runMove(movingIds, columnKey, [...targetIds, ...movingIds]);
    clearSelection();
  };

  const handleAddColumn = async () => {
    const label = newColumnLabel.trim();
    if (!label) {
      setAddingColumn(false);
      return;
    }
    try {
      await addColumn({ label });
      setNewColumnLabel("");
      setAddingColumn(false);
    } catch (error) {
      console.error("Error adding column:", error);
      onRequireSignIn?.();
    }
  };

  const handleDeleteColumn = async () => {
    if (!pendingDelete) return;
    try {
      await deleteColumn({ key: pendingDelete.key });
    } catch (error) {
      console.error("Error deleting column:", error);
      onRequireSignIn?.();
    }
    setPendingDelete(null);
  };

  // Clear a selection with Escape, matching the rest of the app
  React.useEffect(() => {
    if (!selectionMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectionMode, clearSelection]);

  if (columnsQuery === undefined) {
    return (
      // Same wrapper as the loaded board so the skeleton fills the same frame
      <div className="kanban-wrapper">
        <div className="kanban-board kanban-board-loading" aria-busy="true">
          <div className="kanban-skeleton-column" />
          <div className="kanban-skeleton-column" />
          <div className="kanban-skeleton-column" />
        </div>
      </div>
    );
  }

  const activeCard = activeCardId
    ? todos.find((t) => t._id === activeCardId)
    : null;
  const dragGroupSize =
    activeCardId && selected.has(activeCardId) ? selected.size : 1;

  return (
    <div className="kanban-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={resetDragState}
      >
        <SortableContext
          items={columns.map((c) => `col:${c.key}`)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="kanban-board">
            {columns.map((column, index) => (
              <KanbanColumn
                key={column.key}
                column={column}
                cards={grouped[column.key] ?? []}
                date={date}
                isBoardOfFolder={isBoardOfFolder}
                isDropTarget={hoverColumnKey === column.key}
                isColumnDragging={activeColumnKey === column.key}
                canDelete={columns.length > 1}
                selected={selected}
                selectionMode={selectionMode}
                onSelect={handleSelect}
                onCompletedChange={handleCompletedChange}
                onRename={(label) =>
                  renameColumn({ key: column.key, label }).catch((error) => {
                    console.error("Error renaming column:", error);
                    onRequireSignIn?.();
                  })
                }
                onRequestDelete={() => setPendingDelete(column)}
                onCreateCard={async (content) => {
                  try {
                    await createTodoInColumn({
                      date: isBoardOfFolder ? undefined : date,
                      folderId: shared.folderId,
                      content,
                      columnKey: column.key,
                    });
                  } catch (error) {
                    console.error("Error creating card:", error);
                    onRequireSignIn?.();
                  }
                }}
                composerRef={index === 0 ? firstComposerRef : undefined}
                shared={shared}
              />
            ))}

            {/* Add column, inline so the board never leaves the screen */}
            <div className="kanban-add-column">
              {addingColumn ? (
                <div className="kanban-add-column-form">
                  <input
                    className="kanban-column-input"
                    value={newColumnLabel}
                    onChange={(e) => setNewColumnLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddColumn();
                      if (e.key === "Escape") {
                        setAddingColumn(false);
                        setNewColumnLabel("");
                      }
                    }}
                    placeholder="Column name"
                    aria-label="New column name"
                    maxLength={40}
                    autoFocus
                  />
                  <div className="kanban-add-column-actions">
                    <button
                      type="button"
                      className="kanban-icon-button"
                      onClick={() => void handleAddColumn()}
                      disabled={!newColumnLabel.trim()}
                      aria-label="Create column"
                      title="Create column"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className="kanban-icon-button"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColumnLabel("");
                      }}
                      aria-label="Cancel"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="kanban-add-column-button"
                  onClick={() => setAddingColumn(true)}
                  disabled={columns.length >= MAX_COLUMNS}
                  title={
                    columns.length >= MAX_COLUMNS
                      ? `A board holds up to ${MAX_COLUMNS} columns`
                      : "Add a column"
                  }
                >
                  <Plus size={14} />
                  <span>Add column</span>
                </button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="kanban-card-overlay">
              <span className="kanban-card-overlay-text">
                {activeCard.content || "Untitled"}
              </span>
              {dragGroupSize > 1 && (
                <span className="kanban-card-overlay-count">
                  {dragGroupSize}
                </span>
              )}
            </div>
          ) : activeColumnKey ? (
            <div className="kanban-column-overlay">
              {columns.find((c) => c.key === activeColumnKey)?.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bulk action bar, only present while a selection exists */}
      {selectionMode && (
        <div className="kanban-selection-bar" role="toolbar" aria-label="Selected cards">
          <span className="kanban-selection-count">
            {selected.size} selected
          </span>
          <span className="kanban-selection-divider" aria-hidden="true" />
          <span className="kanban-selection-label">
            <ArrowRight size={12} />
            Move to
          </span>
          <div className="kanban-selection-targets">
            {columns.map((column) => (
              <button
                key={column.key}
                type="button"
                className="kanban-selection-target"
                onClick={() => void handleBulkMove(column.key)}
              >
                {column.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="kanban-icon-button"
            onClick={clearSelection}
            aria-label="Clear selection"
            title="Clear selection (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete column"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.label}"? Its cards move to ${
                columns.find((c) => c.key !== pendingDelete.key)?.label ??
                "the first column"
              }.`
            : ""
        }
        confirmText="Delete column"
        cancelText="Keep it"
        isDangerous
        onConfirm={() => void handleDeleteColumn()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

interface KanbanColumnProps {
  column: BoardColumn;
  cards: KanbanTodo[];
  date: string;
  isBoardOfFolder: boolean;
  isDropTarget: boolean;
  isColumnDragging: boolean;
  canDelete: boolean;
  selected: Set<Id<"todos">>;
  selectionMode: boolean;
  onSelect: (id: Id<"todos">) => void;
  onCompletedChange: (todo: KanbanTodo, next: boolean) => void;
  onRename: (label: string) => void;
  onRequestDelete: () => void;
  onCreateCard: (content: string) => Promise<void>;
  composerRef?: React.RefObject<HTMLTextAreaElement>;
  shared: SharedCardProps;
}

function KanbanColumn({
  column,
  cards,
  date,
  isBoardOfFolder,
  isDropTarget,
  isColumnDragging,
  canDelete,
  selected,
  selectionMode,
  onSelect,
  onCompletedChange,
  onRename,
  onRequestDelete,
  onCreateCard,
  composerRef,
  shared,
}: KanbanColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [draft, setDraft] = useState("");
  const internalComposerRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = composerRef ?? internalComposerRef;
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col:${column.key}`,
    data: { type: "column", key: column.key },
  });

  // Lets a card land on an empty column, not just on another card
  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop:${column.key}`,
    data: { type: "columnDrop", key: column.key },
  });

  React.useEffect(() => setLabel(column.label), [column.label]);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const commitRename = () => {
    const next = label.trim();
    setRenaming(false);
    if (!next || next === column.label) {
      setLabel(column.label);
      return;
    }
    onRename(next);
  };

  const submitCard = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await onCreateCard(content);
  };

  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${isDropTarget ? "drop-target" : ""} ${
        isColumnDragging || isDragging ? "column-dragging" : ""
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      aria-label={`${column.label}, ${cards.length} cards`}
    >
      <header className="kanban-column-header">
        <div
          {...attributes}
          {...listeners}
          className="kanban-column-grip"
          aria-label={`Reorder ${column.label}`}
        >
          <DotsSixVertical size={14} />
        </div>

        {renaming ? (
          <input
            className="kanban-column-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setLabel(column.label);
                setRenaming(false);
              }
            }}
            maxLength={40}
            aria-label="Column name"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="kanban-column-title"
            onDoubleClick={() => setRenaming(true)}
            title="Double click to rename"
          >
            {column.label}
          </button>
        )}

        <span className="kanban-column-count">{cards.length}</span>

        <div className="kanban-column-menu-anchor" ref={menuRef}>
          <button
            type="button"
            className="kanban-icon-button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={`${column.label} column options`}
            aria-expanded={menuOpen}
          >
            <DotsThree size={16} />
          </button>
          {menuOpen && (
            <div className="menu-dropdown kanban-column-menu">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
              >
                <PencilSimple size={13} />
                Rename
              </button>
              <button
                type="button"
                className="menu-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  onRequestDelete();
                }}
                disabled={!canDelete}
              >
                <Trash size={13} />
                Delete column
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="kanban-column-body" ref={setDropRef}>
        <SortableContext
          items={cards.map((c) => c._id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((todo) => (
            <KanbanCard
              key={todo._id}
              todo={todo}
              columnKey={column.key}
              isSelected={selected.has(todo._id)}
              selectionMode={selectionMode}
              onSelect={onSelect}
              onCompletedChange={onCompletedChange}
              shared={shared}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <p className="kanban-column-empty">
            {column.isDone
              ? "Finished cards land here."
              : "Drop a card here or add one below."}
          </p>
        )}
      </div>

      <div className="kanban-column-composer">
        <textarea
          ref={inputRef}
          className="kanban-composer-input"
          value={draft}
          placeholder={`Add to ${column.label.toLowerCase()}`}
          rows={1}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submitCard();
              (e.target as HTMLTextAreaElement).style.height = "auto";
            }
          }}
          spellCheck={false}
          data-gramm="false"
          aria-label={`Add a card to ${column.label}`}
        />
        <button
          type="button"
          className="kanban-composer-submit"
          onClick={() => void submitCard()}
          disabled={!draft.trim()}
          aria-label={`Add card to ${column.label}`}
          title={`Add card to ${column.label}`}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Keeps the column's date context readable while scanning the board */}
      {!isBoardOfFolder && <span className="kanban-column-context">{date}</span>}
    </section>
  );
}

interface KanbanCardProps {
  todo: KanbanTodo;
  columnKey: string;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: (id: Id<"todos">) => void;
  onCompletedChange: (todo: KanbanTodo, next: boolean) => void;
  shared: SharedCardProps;
}

function KanbanCard({
  todo,
  columnKey,
  isSelected,
  selectionMode,
  onSelect,
  onCompletedChange,
  shared,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo._id,
    data: { type: "card", columnKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card ${todo.parentId ? "kanban-card-subtask" : ""} ${
        isDragging ? "card-dragging" : ""
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <TodoItem
        variant="card"
        dragHandle={
          <div
            {...attributes}
            {...listeners}
            className="drag-handle kanban-card-grip"
            aria-label={`Move ${todo.content || "card"}`}
          >
            <DotsSixVertical size={13} />
          </div>
        }
        isSelected={isSelected}
        selectionMode={selectionMode}
        onSelect={onSelect}
        onCompletedChange={(next) => onCompletedChange(todo, next)}
        id={todo._id}
        content={todo.content}
        type={todo.type}
        completed={todo.completed}
        collapsed={todo.collapsed}
        pinned={todo.pinned}
        backlog={todo.backlog}
        folderId={shared.folderId}
        folders={shared.folders}
        onMoveToPreviousDay={() => shared.onMoveToPreviousDay(todo._id)}
        onMoveToNextDay={() => shared.onMoveToNextDay(todo._id)}
        onMoveToTomorrow={() => shared.onMoveToTomorrow(todo._id)}
        onMoveToToday={() => shared.onMoveToToday(todo._id)}
        onMoveToCustomDate={(date) => shared.onMoveToCustomDate(todo._id, date)}
        onMoveToFolder={(folderId) =>
          shared.onMoveToFolder(todo._id, folderId)
        }
        onHoverChange={shared.onHoverChange}
        openMenuTrigger={
          shared.openMenuForTodoId === todo._id
            ? shared.openMenuTrigger
            : undefined
        }
        isAuthenticated={shared.isAuthenticated}
        onRequireSignInForMenu={shared.onRequireSignInForMenu}
        setPomodoroTriggered={shared.setPomodoroTriggered}
        onSendToAgent={shared.onSendToAgent}
      />
    </div>
  );
}
