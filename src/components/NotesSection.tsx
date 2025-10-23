import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Copy, Check, Plus, X, Edit3 } from "lucide-react";
import { DrawingPinIcon, DrawingPinFilledIcon } from "@radix-ui/react-icons";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";

// Cursor Dark Theme colors for syntax highlighting
const cursorDarkTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto" as const,
  },
  comment: { color: "#6a9955", fontStyle: "italic" },
  prolog: { color: "#6a9955" },
  doctype: { color: "#6a9955" },
  cdata: { color: "#6a9955" },
  punctuation: { color: "#d4d4d4" },
  property: { color: "#9cdcfe" },
  tag: { color: "#569cd6" },
  boolean: { color: "#569cd6" },
  number: { color: "#b5cea8" },
  constant: { color: "#4fc1ff" },
  symbol: { color: "#4fc1ff" },
  deleted: { color: "#f44747" },
  selector: { color: "#d7ba7d" },
  "attr-name": { color: "#92c5f6" },
  string: { color: "#ce9178" },
  char: { color: "#ce9178" },
  builtin: { color: "#569cd6" },
  inserted: { color: "#6a9955" },
  operator: { color: "#d4d4d4" },
  entity: { color: "#dcdcaa" },
  url: { color: "#9cdcfe", textDecoration: "underline" },
  variable: { color: "#9cdcfe" },
  atrule: { color: "#569cd6" },
  "attr-value": { color: "#ce9178" },
  function: { color: "#dcdcaa" },
  "function-variable": { color: "#dcdcaa" },
  keyword: { color: "#569cd6" },
  regex: { color: "#d16969" },
  important: { color: "#569cd6", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  namespace: { opacity: 0.7 },
  "class-name": { color: "#4ec9b0" },
  parameter: { color: "#9cdcfe" },
  decorator: { color: "#dcdcaa" },
};

// Cursor Light Theme colors for syntax highlighting
const cursorLightTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#000000",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#000000",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto" as const,
  },
  comment: { color: "#008000", fontStyle: "italic" },
  prolog: { color: "#008000" },
  doctype: { color: "#008000" },
  cdata: { color: "#008000" },
  punctuation: { color: "#000000" },
  property: { color: "#001080" },
  tag: { color: "#0000ff" },
  boolean: { color: "#0000ff" },
  number: { color: "#098658" },
  constant: { color: "#0070c1" },
  symbol: { color: "#0070c1" },
  deleted: { color: "#e51400" },
  selector: { color: "#a31515" },
  "attr-name": { color: "#0451a5" },
  string: { color: "#a31515" },
  char: { color: "#a31515" },
  builtin: { color: "#0000ff" },
  inserted: { color: "#008000" },
  operator: { color: "#000000" },
  entity: { color: "#795e26" },
  url: { color: "#001080", textDecoration: "underline" },
  variable: { color: "#001080" },
  atrule: { color: "#0000ff" },
  "attr-value": { color: "#a31515" },
  function: { color: "#795e26" },
  "function-variable": { color: "#795e26" },
  keyword: { color: "#0000ff" },
  regex: { color: "#811f3f" },
  important: { color: "#0000ff", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  namespace: { opacity: 0.7 },
  "class-name": { color: "#267f99" },
  parameter: { color: "#001080" },
  decorator: { color: "#795e26" },
};
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
import { useTheme } from "../context/ThemeContext";

interface NotesSectionProps {
  date: string;
  expandedNoteId: string | null;
  onNoteExpanded: () => void;
  focusNoteId?: Id<"notes"> | null;
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
  pinnedToTop?: boolean;
}

interface NoteItemProps {
  note: Note;
  onUpdateTitle: (id: Id<"notes">, title: string) => void;
  onUpdateContent: (id: Id<"notes">, content: string) => void;
  onToggleCollapse: (id: Id<"notes">, collapsed: boolean) => void;
  onDeleteClick: (id: Id<"notes">) => void;
  onTogglePin: (id: Id<"notes">, pinned: boolean) => void;
  shouldFocus?: boolean;
}

// Types for parsed content blocks
type ContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language: string };

// Parse markdown-style code blocks from plain text
function parseContentBlocks(content: string): Array<ContentBlock> {
  const blocks: Array<ContentBlock> = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add code block
    const language = match[1] || "text";
    const codeContent = match[2];
    blocks.push({ type: "code", content: codeContent, language });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no code blocks found, return entire content as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", content });
  }

  return blocks;
}

function NoteItem({
  note,
  onUpdateTitle,
  onUpdateContent,
  onToggleCollapse,
  onDeleteClick,
  onTogglePin,
  shouldFocus = false,
}: NoteItemProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(note.title || "Untitled");
  const [contentInput, setContentInput] = useState(note.content);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const cursorPositionRef = useRef<number | null>(null);
  const [textareaHeight, setTextareaHeight] = useState<number>(200);
  const isResizingRef = useRef(false);

  // Update local state when note prop changes (from external updates)
  // BUT only if user is not actively typing to prevent cursor jumping
  useEffect(() => {
    if (!isTypingRef.current && !isEditMode) {
      setContentInput(note.content);
    }
  }, [note.content, isEditMode]);

  // Auto-focus content textarea when note is newly created
  useEffect(() => {
    if (shouldFocus) {
      setIsEditMode(true);
      // Expand note if collapsed
      if (note.collapsed) {
        onToggleCollapse(note._id, false);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [shouldFocus, note.collapsed, note._id, onToggleCollapse]);

  // Reset typing flag when entering/exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      isTypingRef.current = false;
      cursorPositionRef.current = null;
    } else {
      // Set initial height based on content when entering edit mode
      if (contentInput) {
        const lineCount = contentInput.split("\n").length;
        const newHeight = Math.max(200, Math.min(600, lineCount * 24 + 20));
        setTextareaHeight(newHeight);
      }
    }
  }, [isEditMode, contentInput]);

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

  const handleCopyCodeBlock = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedBlockIndex(index);
      setTimeout(() => setCopiedBlockIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy code block:", err);
    }
  };

  const handleTitleBlur = () => {
    if (titleInput.trim() && titleInput !== note.title) {
      onUpdateTitle(note._id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      handleTitleBlur();
      // Expand note if collapsed and focus content textarea
      if (note.collapsed) {
        onToggleCollapse(note._id, false);
      }
      // Use setTimeout to ensure the textarea is rendered and available
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
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
    // Mark that user is actively typing
    isTypingRef.current = true;

    // Save cursor position before updating
    if (textareaRef.current) {
      cursorPositionRef.current = textareaRef.current.selectionStart;
    }

    setContentInput(value);

    // Auto-expand textarea based on content
    if (textareaRef.current && !isResizingRef.current) {
      const lineCount = value.split("\n").length;
      const newHeight = Math.max(200, Math.min(600, lineCount * 24 + 20));
      setTextareaHeight(newHeight);
    }

    // Clear existing timeout
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }

    // Set new timeout to update database after 500ms of no typing
    contentTimeoutRef.current = setTimeout(() => {
      onUpdateContent(note._id, value);
      // Mark typing as done after save
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
    }, 500);
  };

  const handleContentBlur = () => {
    // Clear timeout and save immediately on blur
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }
    // Mark typing as done
    isTypingRef.current = false;
    onUpdateContent(note._id, contentInput);
    // Exit edit mode after saving
    setTimeout(() => {
      setIsEditMode(false);
    }, 100);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    const startY = e.clientY;
    const startHeight = textareaHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(100, startHeight + deltaY);
      setTextareaHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
      }
    };
  }, []);

  // Restore cursor position after updates to prevent jumping
  useEffect(() => {
    if (
      isEditMode &&
      textareaRef.current &&
      cursorPositionRef.current !== null &&
      isTypingRef.current
    ) {
      const position = cursorPositionRef.current;
      textareaRef.current.setSelectionRange(position, position);
    }
  }, [contentInput, isEditMode]);

  return (
    <div ref={setNodeRef} style={style} className="note-item">
      <div className="note-header">
        <div className="note-left">
          <div
            {...attributes}
            {...listeners}
            className="drag-handle"
            style={{ touchAction: "none" }}
          >
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
              ref={titleInputRef}
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
          {!(note.collapsed ?? false) && note.content && !isEditMode && (
            <button
              className="note-action-button"
              onClick={handleCopy}
              title="Copy note"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          {!(note.collapsed ?? false) && !isEditMode && note.content && (
            <button
              className="note-action-button"
              onClick={() => setIsEditMode(true)}
              title="Edit note"
            >
              <Edit3 size={14} />
            </button>
          )}
          <button
            className="note-action-button"
            onClick={() => onTogglePin(note._id, !(note.pinnedToTop ?? false))}
            title={note.pinnedToTop ? "Unpin from top" : "Pin to top"}
          >
            {note.pinnedToTop ? (
              <DrawingPinFilledIcon style={{ width: 14, height: 14 }} />
            ) : (
              <DrawingPinIcon style={{ width: 14, height: 14 }} />
            )}
          </button>
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
          {isEditMode ? (
            <div className="note-editor-container">
              <div
                className="note-line-numbers"
                aria-hidden="true"
                style={{ height: `${textareaHeight}px` }}
              >
                {contentInput.split("\n").map((_, index) => (
                  <div key={index} className="line-number">
                    {index + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="note-textarea"
                placeholder="Write your note here... Use ```language for code blocks. Supported: css, js, javascript, typescript, ts, html, json, python, py, go, rust, and more."
                value={contentInput}
                onChange={(e) => {
                  handleContentChange(e.target.value);
                }}
                onBlur={handleContentBlur}
                spellCheck={true}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                style={{ height: `${textareaHeight}px` }}
              />
              <div
                className="note-resize-handle"
                onMouseDown={handleResizeMouseDown}
                title="Drag to resize"
              />
            </div>
          ) : (
            <div
              className="note-display-mode"
              onClick={() => setIsEditMode(true)}
            >
              {parseContentBlocks(contentInput).map((block, index) => (
                <div key={index} className="note-content-block">
                  {block.type === "text" ? (
                    <pre className="note-text-block">{block.content}</pre>
                  ) : (
                    <div className="note-code-block-wrapper">
                      <div className="note-code-block-header">
                        <span className="note-code-language">
                          {block.language}
                        </span>
                        <button
                          className="note-code-copy-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCodeBlock(block.content, index);
                          }}
                          title="Copy code"
                        >
                          {copiedBlockIndex === index ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={block.language}
                        style={
                          theme === "dark" ? cursorDarkTheme : cursorLightTheme
                        }
                        customStyle={{
                          margin: 0,
                          borderRadius: "0 0 4px 4px",
                          fontSize: "13px",
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                      >
                        {block.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
  focusNoteId,
}: NotesSectionProps) {
  const allNotes = useQuery(api.notes.getNotesByDate, { date }) || [];
  // Filter to only show unpinned notes in this section
  const notes = allNotes.filter((note) => !note.pinnedToTop);
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
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

  const handleTogglePin = async (id: Id<"notes">, pinned: boolean) => {
    await updateNote({ id, pinnedToTop: pinned });
    // Scroll to top when pinning a note (with delay to allow UI to update)
    if (pinned) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 150);
    }
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
              onTogglePin={handleTogglePin}
              shouldFocus={focusNoteId === note._id}
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

// Pinned Notes Section - renders at top of page
interface PinnedNotesSectionProps {
  date: string;
  expandedNoteId: string | null;
  onNoteExpanded: () => void;
  focusNoteId?: Id<"notes"> | null;
}

export function PinnedNotesSection({
  date,
  expandedNoteId,
  onNoteExpanded,
  focusNoteId,
}: PinnedNotesSectionProps) {
  const allNotes = useQuery(api.notes.getNotesByDate, { date }) || [];
  // Filter to only show pinned notes
  const notes = allNotes.filter((note) => note.pinnedToTop);
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
        updateNote({ id: expandedNoteId as Id<"notes">, collapsed: false });
      }
      onNoteExpanded();
    }
  }, [expandedNoteId, notes, updateNote, onNoteExpanded]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
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

  const handleTogglePin = async (id: Id<"notes">, pinned: boolean) => {
    await updateNote({ id, pinnedToTop: pinned });
    // Scroll to top when pinning a note (with delay to allow UI to update)
    if (pinned) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 150);
    }
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
    <div className="pinned-notes-section">
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
              onTogglePin={handleTogglePin}
              shouldFocus={focusNoteId === note._id}
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
