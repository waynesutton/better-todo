import React, { useRef, useEffect, useState } from "react";
import { CheckboxIcon, FilePlusIcon } from "@radix-ui/react-icons";
import { X } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface FullPageNoteTabsProps {
  notes: Array<{
    _id: Id<"fullPageNotes">;
    title?: string;
    order: number;
  }>;
  openTabIds: Array<Id<"fullPageNotes">>;
  selectedNoteId: Id<"fullPageNotes"> | null;
  onSelectNote: (noteId: Id<"fullPageNotes">) => void;
  onCloseTab: (noteId: Id<"fullPageNotes">) => void;
  onCreateNote: () => void;
  onBackToTodos: () => void;
}

export function FullPageNoteTabs({
  notes,
  openTabIds,
  selectedNoteId,
  onSelectNote,
  onCloseTab,
  onCreateNote,
  onBackToTodos,
}: FullPageNoteTabsProps) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const selectedTabRef = useRef<HTMLDivElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<Id<"fullPageNotes"> | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const updateNote = useMutation(api.fullPageNotes.updateFullPageNote);

  // Scroll to selected tab when it changes
  useEffect(() => {
    if (selectedTabRef.current && tabsContainerRef.current) {
      const tabElement = selectedTabRef.current;
      const container = tabsContainerRef.current;
      
      const tabLeft = tabElement.offsetLeft;
      const tabRight = tabLeft + tabElement.offsetWidth;
      const containerLeft = container.scrollLeft;
      const containerRight = containerLeft + container.offsetWidth;

      // Scroll if tab is not fully visible
      if (tabLeft < containerLeft) {
        container.scrollTo({ left: tabLeft - 10, behavior: "smooth" });
      } else if (tabRight > containerRight) {
        container.scrollTo({
          left: tabRight - container.offsetWidth + 10,
          behavior: "smooth",
        });
      }
    }
  }, [selectedNoteId]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNoteId && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingNoteId]);

  const handleTitleDoubleClick = (noteId: Id<"fullPageNotes">, currentTitle: string) => {
    setEditingNoteId(noteId);
    setTitleInput(currentTitle || "Untitled");
  };

  const handleTitleSave = () => {
    if (editingNoteId && titleInput.trim()) {
      updateNote({ id: editingNoteId, title: titleInput.trim() });
    }
    setEditingNoteId(null);
    setTitleInput("");
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingNoteId(null);
      setTitleInput("");
    }
  };

  // Filter notes to only show open tabs
  const openNotes = notes.filter((note) => openTabIds.includes(note._id));

  return (
    <div className="fullpage-note-tabs">
      <div className="fullpage-note-tabs-container" ref={tabsContainerRef}>
        {/* Back to todos checkbox button */}
        <button
          className="fullpage-note-tab-back"
          onClick={onBackToTodos}
          title="Back to todos"
        >
          <CheckboxIcon style={{ width: 16, height: 16 }} />
        </button>
        {openNotes.map((note) => {
          const isActive = note._id === selectedNoteId;
          const isEditing = editingNoteId === note._id;
          return (
            <div
              key={note._id}
              ref={isActive ? selectedTabRef : null}
              className={`fullpage-note-tab ${isActive ? "active" : ""}`}
              onClick={() => {
                if (!isEditing) {
                  onSelectNote(note._id);
                }
              }}
            >
              {isEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  className="fullpage-note-tab-title-input"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="fullpage-note-tab-title"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleTitleDoubleClick(note._id, note.title || "");
                  }}
                >
                  {note.title || "Untitled"}
                </span>
              )}
              <button
                className="fullpage-note-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(note._id);
                }}
                title="Close tab"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
        <button
          className="fullpage-note-tab-add"
          onClick={onCreateNote}
          title="Create new note"
        >
          <FilePlusIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

