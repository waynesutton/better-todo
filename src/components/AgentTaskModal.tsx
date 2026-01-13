import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Bot, Sparkles, Code, FileText, Search, X, MessageSquare, Key, Play } from "lucide-react";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";

// Provider and task type options
type Provider = "claude" | "openai";
type TaskType = "expand" | "code" | "summarize" | "analyze" | "other" | "run";

interface AgentTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string;
  sourceType: "todo" | "fullPageNote";
  sourceContent: string;
  sourceTitle?: string;
  folderId?: Id<"folders">;
  date?: string;
}

// Task type info for display
const TASK_TYPES: Array<{
  id: TaskType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "expand",
    label: "Expand",
    description: "Research, brainstorm, and elaborate on this idea",
    icon: <Sparkles size={18} />,
  },
  {
    id: "code",
    label: "Code",
    description: "Generate code to implement this task",
    icon: <Code size={18} />,
  },
  {
    id: "summarize",
    label: "Summarize",
    description: "Create a concise summary with key points",
    icon: <FileText size={18} />,
  },
  {
    id: "analyze",
    label: "Analyze",
    description: "Provide feedback and suggestions",
    icon: <Search size={18} />,
  },
  {
    id: "other",
    label: "Other",
    description: "Add your own custom instructions",
    icon: <MessageSquare size={18} />,
  },
  {
    id: "run",
    label: "Run",
    description: "Execute instructions in this note as a program",
    icon: <Play size={18} />,
  },
];

export function AgentTaskModal({
  isOpen,
  onClose,
  sourceId,
  sourceType,
  sourceContent,
  sourceTitle,
  folderId,
  date,
}: AgentTaskModalProps) {
  const { isAuthenticated } = useConvexAuth();
  const [selectedProvider, setSelectedProvider] = useState<Provider>("claude");
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType>("expand");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has API keys set and which are available (not paused)
  const userApiKeys = useQuery(
    api.userApiKeys.getUserApiKeys,
    isAuthenticated ? undefined : "skip",
  );
  const hasApiKeys = userApiKeys?.hasAnthropicKey || userApiKeys?.hasOpenaiKey;
  
  // Determine which providers are available (have key AND not paused)
  const claudeAvailable = userApiKeys?.hasAnthropicKey && !userApiKeys?.anthropicPaused;
  const openaiAvailable = userApiKeys?.hasOpenaiKey && !userApiKeys?.openaiPaused;
  const hasAnyAvailableKey = claudeAvailable || openaiAvailable;

  const createAgentTask = useMutation(api.agentTasks.createAgentTask);

  // Reset state when modal opens and auto-select available provider
  useEffect(() => {
    if (isOpen) {
      // Auto-select an available provider
      if (claudeAvailable) {
        setSelectedProvider("claude");
      } else if (openaiAvailable) {
        setSelectedProvider("openai");
      } else {
        setSelectedProvider("claude"); // Default fallback
      }
      setSelectedTaskType("expand");
      setCustomInstructions("");
      setIsSubmitting(false);
    }
  }, [isOpen, claudeAvailable, openaiAvailable]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !isSubmitting) {
        e.preventDefault();
        handleSubmit();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, selectedProvider, selectedTaskType]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate custom instructions for "other" type
    if (selectedTaskType === "other" && !customInstructions.trim()) {
      return;
    }

    setIsSubmitting(true);
    triggerHaptic("light");

    try {
      await createAgentTask({
        sourceId,
        sourceType,
        sourceContent,
        sourceTitle,
        provider: selectedProvider,
        taskType: selectedTaskType,
        customInstructions: selectedTaskType === "other" ? customInstructions.trim() : undefined,
        folderId,
        date,
      });

      triggerSuccessHaptic();
      onClose();
    } catch (error) {
      console.error("Error creating agent task:", error);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Truncate content for preview (max 200 chars)
  const contentPreview =
    sourceContent.length > 200
      ? sourceContent.slice(0, 200) + "..."
      : sourceContent;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div className="agent-task-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="agent-task-modal">
        {/* Header */}
        <div className="agent-task-modal-header">
          <div className="agent-task-modal-header-left">
            <Bot size={20} />
            <h3 className="agent-task-modal-title">Send to Agent</h3>
          </div>
          <button
            className="agent-task-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content preview */}
        <div className="agent-task-modal-preview">
          {sourceTitle && (
            <div className="agent-task-modal-preview-title">{sourceTitle}</div>
          )}
          <div className="agent-task-modal-preview-content">{contentPreview}</div>
        </div>

        {/* API Key Warning Banner */}
        {!hasAnyAvailableKey && userApiKeys !== undefined && (
          <div className="ai-api-key-warning">
            <div className="ai-api-key-warning-icon">
              <Key size={18} />
            </div>
            <div className="ai-api-key-warning-content">
              <strong>{hasApiKeys ? "API Keys Paused" : "API Key Required"}</strong>
              <p>
                {hasApiKeys
                  ? "All your API keys are paused. Press ? to open Settings and unpause a key to use this feature."
                  : "Agent tasks require an API key. Press ? to open Settings and add your Claude or OpenAI key."}
              </p>
            </div>
          </div>
        )}

        {/* Provider selection */}
        <div className="agent-task-modal-section">
          <label className="agent-task-modal-label">AI Provider</label>
          <div className="agent-task-modal-providers">
            <button
              className={`agent-task-modal-provider ${selectedProvider === "claude" ? "selected" : ""} ${!claudeAvailable && userApiKeys?.hasAnthropicKey ? "paused" : ""}`}
              onClick={() => {
                triggerHaptic("light");
                setSelectedProvider("claude");
              }}
              disabled={!userApiKeys?.hasAnthropicKey}
              title={
                !userApiKeys?.hasAnthropicKey
                  ? "No Claude API key"
                  : userApiKeys?.anthropicPaused
                    ? "Claude key is paused (will fallback to OpenAI if available)"
                    : "Use Claude"
              }
            >
              <div className="agent-task-modal-provider-icon">
                <span style={{ fontWeight: 600, fontSize: 14 }}>C</span>
              </div>
              <span>Claude{userApiKeys?.anthropicPaused ? " (Paused)" : ""}</span>
            </button>
            <button
              className={`agent-task-modal-provider ${selectedProvider === "openai" ? "selected" : ""} ${!openaiAvailable && userApiKeys?.hasOpenaiKey ? "paused" : ""}`}
              onClick={() => {
                triggerHaptic("light");
                setSelectedProvider("openai");
              }}
              disabled={!userApiKeys?.hasOpenaiKey}
              title={
                !userApiKeys?.hasOpenaiKey
                  ? "No OpenAI API key"
                  : userApiKeys?.openaiPaused
                    ? "OpenAI key is paused (will fallback to Claude if available)"
                    : "Use OpenAI"
              }
            >
              <div className="agent-task-modal-provider-icon">
                <span style={{ fontWeight: 600, fontSize: 14 }}>O</span>
              </div>
              <span>OpenAI{userApiKeys?.openaiPaused ? " (Paused)" : ""}</span>
            </button>
          </div>
        </div>

        {/* Task type selection */}
        <div className="agent-task-modal-section">
          <label className="agent-task-modal-label">Task Type</label>
          <div className="agent-task-modal-task-types">
            {TASK_TYPES.map((taskType) => (
              <button
                key={taskType.id}
                className={`agent-task-modal-task-type ${selectedTaskType === taskType.id ? "selected" : ""}`}
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedTaskType(taskType.id);
                }}
              >
                <div className="agent-task-modal-task-type-icon">
                  {taskType.icon}
                </div>
                <div className="agent-task-modal-task-type-content">
                  <span className="agent-task-modal-task-type-label">
                    {taskType.label}
                  </span>
                  <span className="agent-task-modal-task-type-description">
                    {taskType.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom instructions input for "other" task type */}
        {selectedTaskType === "other" && (
          <div className="agent-task-modal-section">
            <label className="agent-task-modal-label">Custom Instructions</label>
            <textarea
              className="agent-task-modal-instructions"
              placeholder="Enter your instructions for the AI agent..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>
        )}

        {/* Footer with submit button */}
        <div className="agent-task-modal-footer">
          <button
            className="agent-task-modal-button cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="agent-task-modal-button submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyAvailableKey || (selectedTaskType === "other" && !customInstructions.trim())}
            title={!hasAnyAvailableKey ? "Add or unpause an API key in Settings (?) to use this feature" : ""}
          >
            {isSubmitting ? "Sending..." : "Send to Agent"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
