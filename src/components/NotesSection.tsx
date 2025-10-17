import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Copy, Check, Plus, X } from "lucide-react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "./ConfirmDialog";

interface NotesSectionProps {
  date: string;
  expandedNoteId: string | null;
  onNoteExpanded: () => void;
}

interface Note {
  _id: Id<"notes">;
  _creationTime: number;
  userId: string;
  date: string;
  title?: string;
  content: string;
  order?: number;
  collapsed?: boolean;
}

interface NoteItemProps {
  note: Note;
  onUpdateTitle: (id: Id<"notes">, title: string) => void;
  onUpdateContent: (id: Id<"notes">, content: string) => void;
  onToggleCollapse: (id: Id<"notes">, collapsed: boolean) => void;
  onDeleteClick: (id: Id<"notes">) => void;
}

function NoteItem({
  note,
  onUpdateTitle,
  onUpdateContent,
  onToggleCollapse,
  onDeleteClick,
}: NoteItemProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(note.title || "Untitled");
  const [contentInput, setContentInput] = useState(note.content);
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when note prop changes (from external updates)
  useEffect(() => {
    setContentInput(note.content);
  }, [note.content]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleTitleBlur = () => {
    if (titleInput.trim() && titleInput !== note.title) {
      onUpdateTitle(note._id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Remove focus from input
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setTitleInput(note.title || "Untitled");
      setIsEditingTitle(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContentInput(value);

    // Clear existing timeout
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }

    // Set new timeout to update database after 500ms of no typing
    contentTimeoutRef.current = setTimeout(() => {
      onUpdateContent(note._id, value);
    }, 500);
  };

  const handleContentBlur = () => {
    // Clear timeout and save immediately on blur
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }
    onUpdateContent(note._id, contentInput);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={setNodeRef} style={style} className="note-item">
      <div className="note-header">
        <div className="note-left">
          <div {...attributes} {...listeners} className="drag-handle">
            ⋮⋮
          </div>
          <span
            className={`collapse-icon ${(note.collapsed ?? false) ? "collapsed" : ""}`}
            onClick={() =>
              onToggleCollapse(note._id, !(note.collapsed ?? false))
            }
          >
            ▼
          </span>
          {isEditingTitle ? (
            <input
              type="text"
              className="note-title-input"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
            />
          ) : (
            <div className="note-title" onClick={() => setIsEditingTitle(true)}>
              {note.title || "Untitled"}
            </div>
          )}
        </div>
        <div className="note-actions">
          {!(note.collapsed ?? false) && note.content && (
            <button
              className="note-action-button"
              onClick={handleCopy}
              title="Copy note"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          <button
            className="note-action-button"
            onClick={() => onDeleteClick(note._id)}
            title="Delete note"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!(note.collapsed ?? false) && (
        <div className="note-content-wrapper">
          <div className="note-editor-container">
            <div className="note-line-numbers" aria-hidden="true">
              {contentInput.split("\n").map((_, index) => (
                <div key={index} className="line-number">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="note-textarea"
              placeholder="Write your note here... (plain text only)"
              value={contentInput}
              onChange={(e) => {
                handleContentChange(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onBlur={handleContentBlur}
              spellCheck={true}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface NotesWithAddButtonProps {
  onAddNote: () => void;
}

export function NotesSection({
  date,
  expandedNoteId,
  onNoteExpanded,
}: NotesSectionProps) {
  const notes = useQuery(api.notes.getNotesByDate, { date }) || [];
  const updateNote = useMutation(api.notes.updateNote);
  const deleteNote = useMutation(api.notes.deleteNote);
  const reorderNotes = useMutation(api.notes.reorderNotes);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    noteId: Id<"notes"> | null;
    noteTitle: string;
  }>({ isOpen: false, noteId: null, noteTitle: "" });

  // Expand note when expandedNoteId changes
  useEffect(() => {
    if (expandedNoteId) {
      const note = notes.find((n) => n._id === expandedNoteId);
      if (note && (note.collapsed ?? false)) {
        // Expand the note by setting collapsed to false
        updateNote({ id: expandedNoteId as Id<"notes">, collapsed: false });
      }
      // Clear the expanded note ID after handling
      onNoteExpanded();
    }
  }, [expandedNoteId, notes, updateNote, onNoteExpanded]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex((n) => n._id === active.id);
      const newIndex = notes.findIndex((n) => n._id === over.id);

      const reorderedNotes = arrayMove(notes, oldIndex, newIndex);
      reorderNotes({
        date,
        noteIds: reorderedNotes.map((n) => n._id),
      });
    }
  };

  const handleUpdateTitle = async (id: Id<"notes">, title: string) => {
    await updateNote({ id, title });
  };

  const handleUpdateContent = async (id: Id<"notes">, content: string) => {
    await updateNote({ id, content });
  };

  const handleToggleCollapse = async (id: Id<"notes">, collapsed: boolean) => {
    await updateNote({ id, collapsed });
  };

  const handleDeleteClick = (id: Id<"notes">) => {
    const note = notes.find((n) => n._id === id);
    setDeleteConfirm({
      isOpen: true,
      noteId: id,
      noteTitle: note?.title || "Untitled",
    });
  };

  const confirmDeleteNote = async () => {
    if (deleteConfirm.noteId) {
      await deleteNote({ id: deleteConfirm.noteId });
    }
    setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: "" });
  };

  const cancelDeleteNote = () => {
    setDeleteConfirm({ isOpen: false, noteId: null, noteTitle: "" });
  };

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="notes-section-multi">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={notes.map((n) => n._id)}
          strategy={verticalListSortingStrategy}
        >
          {notes.map((note) => (
            <NoteItem
              key={note._id}
              note={note}
              onUpdateTitle={handleUpdateTitle}
              onUpdateContent={handleUpdateContent}
              onToggleCollapse={handleToggleCollapse}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Note"
        message={`Are you sure you want to delete "${deleteConfirm.noteTitle}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteNote}
        onCancel={cancelDeleteNote}
        isDangerous={true}
      />
    </div>
  );
}

export function AddNoteButton({ onAddNote }: NotesWithAddButtonProps) {
  return (
    <button className="add-note-button" onClick={onAddNote}>
      <Plus size={14} />
      <span>Add Note</span>
    </button>
  );
}
