import { createPortal } from "react-dom";
import { Cross2Icon, EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { Copy, Check, Key, Trash2, ExternalLink, ChevronDown, Pause, Play } from "lucide-react";
import { GearSix, Kanban, Keyboard, Rows } from "@phosphor-icons/react";
import { useState, useRef } from "react";
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
  const apiKeysSectionRef = useRef<HTMLDivElement>(null);
  
  // API Key state
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savingAnthropic, setSavingAnthropic] = useState(false);
  const [savingOpenai, setSavingOpenai] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Auto rollover backfill state
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  
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
  const setApiKeyPaused = useMutation(api.userApiKeys.setApiKeyPaused);
  
  // Mutation to update font size
  const setTodoFontSize = useMutation(api.users.setTodoFontSize);

  // Default view for todos: list or Kanban board
  const setDefaultTodoView = useMutation(api.users.setDefaultTodoView);
  const defaultTodoView = userPreferences?.defaultTodoView ?? "list";

  const handleDefaultTodoViewChange = async (view: "list" | "board") => {
    if (!isAuthenticated || view === defaultTodoView) return;
    await setDefaultTodoView({ view });
  };
  
  // Auto rollover mutations
  const setAutoRollover = useMutation(api.users.setAutoRollover);
  const backfillLast30Days = useMutation(api.rollover.backfillLast30Days);
  
  // Font size options
  const fontSizes = [10, 12, 14, 16, 18, 24];
  const currentFontSize = userPreferences?.todoFontSize ?? 12;
  
  const handleFontSizeChange = async (fontSize: number) => {
    if (isAuthenticated) {
      await setTodoFontSize({ fontSize });
    }
  };
  
  // Auto rollover settings
  const autoRolloverEnabled = userPreferences?.autoRolloverEnabled ?? false;
  const backfillDone = !!userPreferences?.rolloverBackfillAt;
  
  const handleAutoRolloverChange = async (enabled: boolean) => {
    if (isAuthenticated) {
      await setAutoRollover({ enabled });
    }
  };
  
  const handleBackfill = async () => {
    if (!isAuthenticated || backfillRunning || backfillDone) return;
    setBackfillRunning(true);
    setBackfillResult(null);
    try {
      const result = await backfillLast30Days({});
      if (result.alreadyRan) {
        setBackfillResult("Backfill already completed.");
      } else {
        setBackfillResult(
          `Moved ${result.movedTodos} todo${result.movedTodos === 1 ? "" : "s"} to today and closed ${result.closedDays} day${result.closedDays === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      setBackfillResult(
        error instanceof Error ? error.message : "Backfill failed. Try again.",
      );
    } finally {
      setBackfillRunning(false);
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

  const handleToggleAnthropicPaused = async () => {
    if (!userApiKeys?.hasAnthropicKey) return;
    setApiKeyError(null);
    try {
      await setApiKeyPaused({
        provider: "anthropic",
        paused: !(userApiKeys.anthropicPaused ?? false),
      });
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to update key");
    }
  };

  const handleToggleOpenaiPaused = async () => {
    if (!userApiKeys?.hasOpenaiKey) return;
    setApiKeyError(null);
    try {
      await setApiKeyPaused({
        provider: "openai",
        paused: !(userApiKeys.openaiPaused ?? false),
      });
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to update key");
    }
  };
  
  // Scroll to API keys section
  const scrollToApiKeys = () => {
    apiKeysSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  
  // Check if user has any API key set (only need one, not both)
  const hasAnyApiKey = userApiKeys?.hasAnthropicKey || userApiKeys?.hasOpenaiKey;

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
        { key: "Shift + B", description: "Switch between list and board" },
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
          <h2>
            <GearSix size={18} weight="regular" />
            Settings
          </h2>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            title="Close"
          >
            <Cross2Icon width="20" height="20" />
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          {/* Quick link to API Keys section */}
          {isAuthenticated && (
            <button
              className="keyboard-shortcuts-api-link"
              onClick={scrollToApiKeys}
            >
              <Key size={16} />
              <span>
                {hasAnyApiKey 
                  ? "Manage API Keys" 
                  : "Add API Keys for AI Features"}
              </span>
              <ChevronDown size={16} />
            </button>
          )}
          
          {/* Default Todo View Section */}
          {isAuthenticated && (
            <div className="keyboard-shortcuts-category">
              <h3>Default Todo View</h3>
              <p className="keyboard-shortcuts-code-info">
                Pick what a day or project opens with. Shift + B still switches
                the page you are on without changing this default.
              </p>
              <div className="settings-choice-row">
                <button
                  className={`settings-choice ${defaultTodoView === "list" ? "active" : ""}`}
                  onClick={() => handleDefaultTodoViewChange("list")}
                  aria-pressed={defaultTodoView === "list"}
                >
                  <Rows size={15} />
                  <span className="settings-choice-label">List</span>
                  <span className="settings-choice-hint">
                    One column, top to bottom
                  </span>
                </button>
                <button
                  className={`settings-choice ${defaultTodoView === "board" ? "active" : ""}`}
                  onClick={() => handleDefaultTodoViewChange("board")}
                  aria-pressed={defaultTodoView === "board"}
                >
                  <Kanban size={15} />
                  <span className="settings-choice-label">Board</span>
                  <span className="settings-choice-hint">
                    Drag cards across columns
                  </span>
                </button>
              </div>
            </div>
          )}

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

          {/* End of Day Auto Rollover Section */}
          {isAuthenticated && (
            <div className="keyboard-shortcuts-category">
              <h3>End of Day Auto Rollover</h3>
              <p className="keyboard-shortcuts-code-info">
                When a day ends, move its incomplete todos to the next day
                automatically and close the previous day if it has no notes.
              </p>
              <div className="font-size-options">
                <button
                  className={`font-size-option ${autoRolloverEnabled ? "active" : ""}`}
                  onClick={() => handleAutoRolloverChange(true)}
                  title="Enable auto rollover"
                >
                  On
                </button>
                <button
                  className={`font-size-option ${!autoRolloverEnabled ? "active" : ""}`}
                  onClick={() => handleAutoRolloverChange(false)}
                  title="Disable auto rollover"
                >
                  Off
                </button>
              </div>
              <p
                className="keyboard-shortcuts-code-info"
                style={{ marginTop: 16 }}
              >
                One time backfill: apply the same rollover to the last 30 days.
                Incomplete todos move to today and past days with no notes are
                closed.
              </p>
              <button
                className="api-key-save-btn"
                onClick={handleBackfill}
                disabled={backfillRunning || backfillDone}
              >
                {backfillDone
                  ? "Backfill completed"
                  : backfillRunning
                    ? "Running..."
                    : "Backfill last 30 days"}
              </button>
              {backfillResult && (
                <p
                  className="keyboard-shortcuts-code-info"
                  style={{ marginTop: 8 }}
                >
                  {backfillResult}
                </p>
              )}
            </div>
          )}

          {/* API Keys Section */}
          {isAuthenticated && (
            <div 
              ref={apiKeysSectionRef}
              className="keyboard-shortcuts-category api-keys-section"
            >
              <h3>
                <Key size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                API Keys
              </h3>
              <p className="keyboard-shortcuts-code-info">
                Add your own API keys to use AI features. You only need one key (Claude or OpenAI) to get started. Keys are stored securely and only used for your requests.
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
                      {userApiKeys.anthropicPaused ? (
                        <>
                          <Pause size={12} /> Paused
                        </>
                      ) : (
                        <>
                          <Check size={12} /> Saved
                        </>
                      )}
                    </span>
                  )}
                </div>
                
                {userApiKeys?.hasAnthropicKey ? (
                  <div className="api-key-saved-row">
                    <code className="api-key-masked">{userApiKeys.anthropicKey}</code>
                    <button
                      className="api-key-pause-btn"
                      onClick={handleToggleAnthropicPaused}
                      title={userApiKeys.anthropicPaused ? "Resume Claude key" : "Pause Claude key"}
                      type="button"
                    >
                      {userApiKeys.anthropicPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
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
                      {userApiKeys.openaiPaused ? (
                        <>
                          <Pause size={12} /> Paused
                        </>
                      ) : (
                        <>
                          <Check size={12} /> Saved
                        </>
                      )}
                    </span>
                  )}
                </div>
                
                {userApiKeys?.hasOpenaiKey ? (
                  <div className="api-key-saved-row">
                    <code className="api-key-masked">{userApiKeys.openaiKey}</code>
                    <button
                      className="api-key-pause-btn"
                      onClick={handleToggleOpenaiPaused}
                      title={userApiKeys.openaiPaused ? "Resume OpenAI key" : "Pause OpenAI key"}
                      type="button"
                    >
                      {userApiKeys.openaiPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
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

          {/* Keyboard shortcuts live at the bottom, below the settings */}
          <div className="settings-section-divider">
            <Keyboard size={15} />
            <span>Keyboard Shortcuts</span>
          </div>

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
