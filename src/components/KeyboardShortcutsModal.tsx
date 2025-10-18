import { createPortal } from "react-dom";
import { Cross2Icon } from "@radix-ui/react-icons";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { key: "↑/↓", description: "Navigate between todos" },
        { key: "⌘ + ↑", description: "Scroll to top" },
        { key: "⌘ + ↓", description: "Scroll to bottom" },
        { key: "?", description: "Show keyboard shortcuts" },
        { key: "Esc", description: "Close modals" },
      ],
    },
    {
      category: "Todo Management",
      items: [
        { key: "/ or c", description: "Focus todo input" },
        { key: "Tab", description: "Focus first todo from input" },
        { key: "Space or e", description: "Mark focused todo as done" },
        { key: "z", description: "Undo last mark as done" },
      ],
    },
    {
      category: "Search",
      items: [{ key: "⌘ + K", description: "Open search modal" }],
    },
  ];

  return createPortal(
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div
        className="keyboard-shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="keyboard-shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            title="Close"
          >
            <Cross2Icon width="20" height="20" />
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          {shortcuts.map((category) => (
            <div
              key={category.category}
              className="keyboard-shortcuts-category"
            >
              <h3>{category.category}</h3>
              <div className="keyboard-shortcuts-list">
                {category.items.map((item, index) => (
                  <div key={index} className="keyboard-shortcuts-item">
                    <div className="keyboard-shortcuts-key">
                      {item.key.split(" or ").map((key, i) => (
                        <span key={i}>
                          <kbd>{key}</kbd>
                          {i < item.key.split(" or ").length - 1 && " or "}
                        </span>
                      ))}
                    </div>
                    <div className="keyboard-shortcuts-description">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
