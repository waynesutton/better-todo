import { createPortal } from "react-dom";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const codeLanguages = [
    { code: "```css", label: "CSS" },
    { code: "```js", label: "JavaScript", alt: "```javascript" },
    { code: "```ts", label: "TypeScript", alt: "```typescript" },
    { code: "```html", label: "HTML" },
    { code: "```json", label: "JSON" },
    { code: "```py", label: "Python", alt: "```python" },
    { code: "```go", label: "Go" },
    { code: "```rust", label: "Rust" },
  ];

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
        { key: "p", description: "Pin/unpin hovered todo" },
        { key: "s", description: "Add subtask to focused todo" },
        { key: "m", description: "Open menu for focused todo" },
        { key: "z", description: "Undo last mark as done" },
      ],
    },
    {
      category: "Notes",
      items: [{ key: "Shift + +", description: "Add new note" }],
    },
    {
      category: "Search",
      items: [{ key: "⌘ + K", description: "Open search modal" }],
    },
    {
      category: "Pomodoro Timer",
      items: [
        {
          key: "f",
          description: "Enter full screen (when timer modal is open)",
        },
        { key: "Esc", description: "Exit full screen / Close timer modal" },
      ],
    },
  ];

  const codeBlocksInfo = {
    category: "Code Blocks in Notes",
    description:
      "Use ```language to create syntax-highlighted code blocks. Click to copy:",
  };

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

          {/* Code Blocks Section */}
          <div className="keyboard-shortcuts-category">
            <h3>{codeBlocksInfo.category}</h3>
            <p className="keyboard-shortcuts-code-info">
              {codeBlocksInfo.description}
            </p>
            <div className="keyboard-shortcuts-code-grid">
              {codeLanguages.map((lang) => (
                <div key={lang.code} className="keyboard-shortcuts-code-item">
                  <div className="keyboard-shortcuts-code-label">
                    {lang.label}
                  </div>
                  <div className="keyboard-shortcuts-code-options">
                    <button
                      className="keyboard-shortcuts-code-button"
                      onClick={() => handleCopyCode(lang.code)}
                      title={`Copy ${lang.code}`}
                    >
                      <code>{lang.code}</code>
                      {copiedCode === lang.code ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    {lang.alt && (
                      <>
                        <span className="keyboard-shortcuts-code-or">or</span>
                        <button
                          className="keyboard-shortcuts-code-button"
                          onClick={() => handleCopyCode(lang.alt)}
                          title={`Copy ${lang.alt}`}
                        >
                          <code>{lang.alt}</code>
                          {copiedCode === lang.alt ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
