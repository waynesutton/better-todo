import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, Search, CheckSquare, FileText } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (
    date: string,
    noteId?: Id<"notes">,
    fullPageNoteId?: Id<"fullPageNotes">,
  ) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onSelectDate,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Get search results from Convex
  const results = useQuery(
    api.search.searchAll,
    searchQuery.trim() ? { searchQuery } : "skip",
  );

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // ESC always closes the modal
      if (e.key === "Escape") {
        // Remove focus from any active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onClose();
        return;
      }

      // Other keyboard shortcuts only work when there are results
      if (!results) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelectResult(results[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [selectedIndex]);

  const handleSelectResult = (result: any) => {
    // Navigate to the date of the selected result
    // If it's a note, pass the note ID so it can be expanded
    // For folder notes without dates, pass empty string
    const dateToNavigate = result.date || "";
    
    if (result.type === "note") {
      onSelectDate(dateToNavigate, result._id as Id<"notes">, undefined);
    } else if (result.type === "fullPageNote") {
      onSelectDate(
        dateToNavigate,
        undefined,
        result._id as Id<"fullPageNotes">,
      );
    } else {
      onSelectDate(dateToNavigate);
    }
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return "Today";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const terms = query.toLowerCase().trim().split(/\s+/);
    let highlightedText = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="search-highlight">$1</mark>',
      );
    });

    return highlightedText;
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search header */}
        <div className="search-header">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search todos and notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search results */}
        <div className="search-results" ref={resultsRef}>
          {!searchQuery.trim() && (
            <div className="search-empty-state">
              <Search size={32} />
              <p>Start typing to search todos and notes</p>
            </div>
          )}

          {searchQuery.trim() && !results && (
            <div className="search-loading">Searching...</div>
          )}

          {searchQuery.trim() && results && results.length === 0 && (
            <div className="search-empty-state">
              <Search size={32} />
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}

          {results &&
            results.length > 0 &&
            results.map((result, index) => (
              <div
                key={`${result.type}-${result._id}`}
                className={`search-result-item ${index === selectedIndex ? "selected" : ""}`}
                onClick={() => handleSelectResult(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="search-result-icon">
                  {result.type === "todo" ? (
                    <CheckSquare size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                </div>
                <div className="search-result-content">
                  {result.title && (
                    <div
                      className="search-result-title"
                      dangerouslySetInnerHTML={{
                        __html: highlightMatch(result.title, searchQuery),
                      }}
                    />
                  )}
                  <div
                    className="search-result-text"
                    dangerouslySetInnerHTML={{
                      __html: highlightMatch(
                        result.content.slice(0, 100) +
                          (result.content.length > 100 ? "..." : ""),
                        searchQuery,
                      ),
                    }}
                  />
                  <div className="search-result-meta">
                    <span className="search-result-type">
                      {result.type === "todo"
                        ? "Todo"
                        : result.type === "fullPageNote"
                          ? "Full-Page Note"
                          : "Note"}
                    </span>
                    {result.date && (
                      <span className="search-result-date">
                        {formatDate(result.date)}
                      </span>
                    )}
                    {!result.date && result.type === "fullPageNote" && (
                      <span className="search-result-date">In Folder</span>
                    )}
                    {result.completed && (
                      <span className="search-result-badge">Completed</span>
                    )}
                    {result.archived && (
                      <span className="search-result-badge">Archived</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Search footer */}
        <div className="search-footer">
          <div className="search-footer-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="search-footer-hint">
            <kbd>Enter</kbd>
            <span>Select</span>
          </div>
          <div className="search-footer-hint">
            <kbd>Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
