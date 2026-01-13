import { createPortal } from "react-dom";
import { Cross2Icon, EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { Copy, Check, Key, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { isAuthenticated } = useConvexAuth();
  
  // API Key state
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savingAnthropic, setSavingAnthropic] = useState(false);
  const [savingOpenai, setSavingOpenai] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  
  // Fetch user preferences
  const userPreferences = useQuery(
    api.users.getUserPreferences,
    isAuthenticated ? undefined : "skip",
  );
  
  // Fetch user API keys (masked for display)
  const userApiKeys = useQuery(
    api.userApiKeys.getUserApiKeys,
    isAuthenticated ? undefined : "skip",
  );
  
  // Mutations for API keys
  const setApiKey = useMutation(api.userApiKeys.setApiKey);
  const deleteApiKey = useMutation(api.userApiKeys.deleteApiKey);
  
  // Mutation to update font size
  const setTodoFontSize = useMutation(api.users.setTodoFontSize);
  
  // Font size options
  const fontSizes = [10, 12, 14, 16, 18, 24];
  const currentFontSize = userPreferences?.todoFontSize ?? 12;
  
  const handleFontSizeChange = async (fontSize: number) => {
    if (isAuthenticated) {
      await setTodoFontSize({ fontSize });
    }
  };
  
  // Handle saving API keys
  const handleSaveAnthropicKey = async () => {
    if (!anthropicKeyInput.trim()) return;
    setSavingAnthropic(true);
    setApiKeyError(null);
    try {
      await setApiKey({ provider: "anthropic", key: anthropicKeyInput.trim() });
      setAnthropicKeyInput("");
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to save key");
    } finally {
      setSavingAnthropic(false);
    }
  };
  
  const handleSaveOpenaiKey = async () => {
    if (!openaiKeyInput.trim()) return;
    setSavingOpenai(true);
    setApiKeyError(null);
    try {
      await setApiKey({ provider: "openai", key: openaiKeyInput.trim() });
      setOpenaiKeyInput("");
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to save key");
    } finally {
      setSavingOpenai(false);
    }
  };
  
  const handleDeleteAnthropicKey = async () => {
    setApiKeyError(null);
    try {
      await deleteApiKey({ provider: "anthropic" });
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to delete key");
    }
  };
  
  const handleDeleteOpenaiKey = async () => {
    setApiKeyError(null);
    try {
      await deleteApiKey({ provider: "openai" });
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to delete key");
    }
  };

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
    { code: "```md", label: "Markdown", alt: "```markdown" },
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
        { key: "t", description: "Jump to today" },
        { key: "Shift + T", description: "Toggle theme" },
        { key: "Shift + S", description: "Toggle streaks header" },
        { key: "⌘ + .", description: "Toggle sidebar collapse" },
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
        { key: "Tab", description: "Focus first todo from input or navigate to next todo" },
        { key: "Shift + Tab", description: "Navigate to previous todo" },
        { key: "Space or d", description: "Mark focused todo as done" },
        { key: "#", description: "Delete focused todo" },
        { key: "p", description: "Pin/unpin hovered todo" },
        { key: "s", description: "Add subtask to focused todo" },
        { key: "m", description: "Open menu for focused todo" },
        { key: "Shift + A", description: "Send focused todo to AI agent" },
        { key: "z", description: "Undo last mark as done" },
      ],
    },
    {
      category: "Notes",
      items: [{ key: "Shift + +", description: "Add new note" }],
    },
    {
      category: "Full-Page Notes",
      items: [
        { key: "Shift + N", description: "Open full-page notes for current date" },
        { key: "e", description: "Enter edit mode" },
        { key: "p", description: "Enter preview mode" },
        { key: "Esc", description: "Exit edit mode (show preview)" },
      ],
    },
    {
      category: "Search",
      items: [{ key: "⌘ + K", description: "Open search modal" }],
    },
    {
      category: "Pomodoro Timer",
      items: [
        { key: "Shift + F", description: "Open Pomodoro timer" },
        {
          key: "f",
          description: "Enter full screen (when timer modal is open)",
        },
        { key: "Esc", description: "Exit full screen / Close timer modal" },
      ],
    },
    {
      category: "AI Chat",
      items: [
        { key: "/", description: "Focus chat input" },
        { key: "Enter", description: "Send message" },
        { key: "Shift + Enter", description: "New line" },
        { key: '"clear"', description: "Clear chat history (type in quotes)" },
      ],
    },
  ];

  const codeBlocksInfo = {
    category: "Markdown & Code Blocks in Notes",
    description:
      "Notes support full markdown (bold, italic, lists, links) by default. Use ```language for syntax-highlighted code blocks. Click to copy:",
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

          {/* Font Size Customization Section */}
          {isAuthenticated && (
            <div className="keyboard-shortcuts-category">
              <h3>Todo Text Font Size</h3>
              <p className="keyboard-shortcuts-code-info">
                Customize the font size for your todo items
              </p>
              <div className="font-size-slider-container">
                <div className="font-size-options">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      className={`font-size-option ${currentFontSize === size ? "active" : ""}`}
                      onClick={() => handleFontSizeChange(size)}
                      title={`Set font size to ${size}px`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
                <div className="font-size-preview" style={{ fontSize: `${currentFontSize}px` }}>
                  Preview: This is how your todo text will look
                </div>
              </div>
            </div>
          )}

          {/* API Keys Section */}
          {isAuthenticated && (
            <div className="keyboard-shortcuts-category api-keys-section">
              <h3>
                <Key size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                API Keys
              </h3>
              <p className="keyboard-shortcuts-code-info">
                Add your own API keys to use AI features. Keys are stored securely and only used for your requests.
              </p>
              
              {apiKeyError && (
                <div className="api-key-error">{apiKeyError}</div>
              )}
              
              {/* Anthropic (Claude) API Key */}
              <div className="api-key-field">
                <div className="api-key-label">
                  <span>Claude (Anthropic)</span>
                  {userApiKeys?.hasAnthropicKey && (
                    <span className="api-key-saved-badge">
                      <Check size={12} /> Saved
                    </span>
                  )}
                </div>
                
                {userApiKeys?.hasAnthropicKey ? (
                  <div className="api-key-saved-row">
                    <code className="api-key-masked">{userApiKeys.anthropicKey}</code>
                    <button
                      className="api-key-delete-btn"
                      onClick={handleDeleteAnthropicKey}
                      title="Remove API key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="api-key-input-row">
                    <div className="api-key-input-wrapper">
                      <input
                        type={showAnthropicKey ? "text" : "password"}
                        className="api-key-input"
                        placeholder="sk-ant-api03-..."
                        value={anthropicKeyInput}
                        onChange={(e) => setAnthropicKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveAnthropicKey()}
                      />
                      <button
                        type="button"
                        className="api-key-toggle-visibility"
                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                        title={showAnthropicKey ? "Hide key" : "Show key"}
                      >
                        {showAnthropicKey ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                    <button
                      className="api-key-save-btn"
                      onClick={handleSaveAnthropicKey}
                      disabled={!anthropicKeyInput.trim() || savingAnthropic}
                    >
                      {savingAnthropic ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
                
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-key-help-link"
                >
                  Get your API key from console.anthropic.com
                  <ExternalLink size={12} />
                </a>
              </div>
              
              {/* OpenAI API Key */}
              <div className="api-key-field">
                <div className="api-key-label">
                  <span>OpenAI</span>
                  {userApiKeys?.hasOpenaiKey && (
                    <span className="api-key-saved-badge">
                      <Check size={12} /> Saved
                    </span>
                  )}
                </div>
                
                {userApiKeys?.hasOpenaiKey ? (
                  <div className="api-key-saved-row">
                    <code className="api-key-masked">{userApiKeys.openaiKey}</code>
                    <button
                      className="api-key-delete-btn"
                      onClick={handleDeleteOpenaiKey}
                      title="Remove API key"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="api-key-input-row">
                    <div className="api-key-input-wrapper">
                      <input
                        type={showOpenaiKey ? "text" : "password"}
                        className="api-key-input"
                        placeholder="sk-proj-..."
                        value={openaiKeyInput}
                        onChange={(e) => setOpenaiKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveOpenaiKey()}
                      />
                      <button
                        type="button"
                        className="api-key-toggle-visibility"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                        title={showOpenaiKey ? "Hide key" : "Show key"}
                      >
                        {showOpenaiKey ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>
                    <button
                      className="api-key-save-btn"
                      onClick={handleSaveOpenaiKey}
                      disabled={!openaiKeyInput.trim() || savingOpenai}
                    >
                      {savingOpenai ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
                
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-key-help-link"
                >
                  Get your API key from platform.openai.com
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
