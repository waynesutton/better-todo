import { useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Message type for conversation history
type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

// Execution log entry type for "run" task type
type ExecutionLogEntry = {
  toolName: string;
  toolInput: string;
  toolResult?: string;
  status: "pending" | "success" | "error";
  timestamp: number;
};

// Local type for agent tasks until generated types are available
type AgentTask = {
  _id: Id<"agentTasks">;
  _creationTime: number;
  userId: string;
  sourceId: string;
  sourceType: "todo" | "fullPageNote";
  sourceContent: string;
  sourceTitle?: string;
  provider: "claude" | "openai";
  actualProvider?: "claude" | "openai"; // Provider actually used (may differ if selected was paused)
  taskType: "expand" | "code" | "summarize" | "analyze" | "other" | "run";
  customInstructions?: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: string;
  error?: string;
  messages?: ConversationMessage[];
  executionLog?: ExecutionLogEntry[];
  folderId?: Id<"folders">;
  date?: string;
};
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useTheme } from "../context/ThemeContext";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Code,
  FileText,
  Search,
  MessageSquare,
  Send,
  ListTodo,
  FilePlus,
  Key,
  Play,
  Terminal,
  RefreshCw,
  Eraser,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { triggerHaptic, triggerSuccessHaptic } from "../lib/haptics";

// Cursor Dark Theme for syntax highlighting
const cursorDarkTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
  },
  'pre[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    padding: "1em",
    margin: "0",
    overflow: "auto",
  },
  comment: { color: "#6a9955", fontStyle: "italic" },
  string: { color: "#ce9178" },
  keyword: { color: "#569cd6" },
  function: { color: "#dcdcaa" },
  number: { color: "#b5cea8" },
  operator: { color: "#d4d4d4" },
  "class-name": { color: "#4ec9b0" },
};

// Cursor Light Theme
const cursorLightTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#171717",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
  },
  'pre[class*="language-"]': {
    color: "#171717",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    padding: "1em",
    margin: "0",
    overflow: "auto",
  },
  comment: { color: "#008000", fontStyle: "italic" },
  string: { color: "#a31515" },
  keyword: { color: "#0000ff" },
  function: { color: "#795e26" },
  number: { color: "#098658" },
  operator: { color: "#171717" },
  "class-name": { color: "#267f99" },
};

// Task type icons
const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  expand: <Sparkles size={14} />,
  code: <Code size={14} />,
  summarize: <FileText size={14} />,
  analyze: <Search size={14} />,
  other: <MessageSquare size={14} />,
  run: <Play size={14} />,
};

// Status icons
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="agent-task-status-icon pending" />,
  processing: <Loader2 size={14} className="agent-task-status-icon processing" />,
  completed: <CheckCircle size={14} className="agent-task-status-icon completed" />,
  failed: <XCircle size={14} className="agent-task-status-icon failed" />,
};

interface AgentTasksViewProps {
  onClose: () => void;
  date?: string;
  folderId?: Id<"folders">;
  onOpenNote?: (noteId: Id<"fullPageNotes">) => void;
}

// Helper to extract noteId from tool result JSON
function extractNoteIdFromResult(toolName: string, toolResult: string): Id<"fullPageNotes"> | null {
  if (toolName !== "createNote") return null;
  try {
    const parsed = JSON.parse(toolResult);
    if (parsed.success && parsed.noteId) {
      return parsed.noteId as Id<"fullPageNotes">;
    }
  } catch {
    // Not valid JSON, ignore
  }
  return null;
}

export function AgentTasksView({ onClose, date, folderId, onOpenNote }: AgentTasksViewProps) {
  const { theme } = useTheme();
  const { isAuthenticated } = useConvexAuth();
  
  // Check if user has API keys set
  const userApiKeys = useQuery(
    api.userApiKeys.getUserApiKeys,
    isAuthenticated ? undefined : "skip",
  );
  const hasApiKeys = userApiKeys?.hasAnthropicKey || userApiKeys?.hasOpenaiKey;
  
  const tasks = useQuery(api.agentTasks.getAgentTasks, {
    date: folderId ? undefined : date, // Only use date filter if not in a folder
    folderId,
  });
  const deleteTask = useMutation(api.agentTasks.deleteAgentTask);
  const deleteAllTasks = useMutation(api.agentTasks.deleteAllAgentTasks);
  const addFollowUpMessage = useMutation(api.agentTasks.addFollowUpMessage);
  const createTodosFromAgent = useMutation(api.agentTasks.createTodosFromAgent);
  const saveResultAsNote = useMutation(api.agentTasks.saveResultAsNote);
  const retryTask = useMutation(api.agentTasks.retryAgentTask);
  const clearConversation = useMutation(api.agentTasks.clearTaskConversation);

  const [selectedTaskId, setSelectedTaskId] = useState<Id<"agentTasks"> | null>(
    null,
  );
  const [copiedTaskId, setCopiedTaskId] = useState<Id<"agentTasks"> | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Id<"agentTasks"> | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [isCreatingTodos, setIsCreatingTodos] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [todosCreatedCount, setTodosCreatedCount] = useState<number | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [executionLogCollapsed, setExecutionLogCollapsed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Get selected task details
  const selectedTask = tasks?.find((t: AgentTask) => t._id === selectedTaskId);

  // Copy result to clipboard
  const handleCopyResult = async (taskId: Id<"agentTasks">, result: string) => {
    try {
      await navigator.clipboard.writeText(result);
      triggerSuccessHaptic();
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    triggerHaptic("medium");
    await deleteTask({ id: taskToDelete });
    if (selectedTaskId === taskToDelete) {
      setSelectedTaskId(null);
    }
    setTaskToDelete(null);
  };

  // Delete all tasks
  const handleDeleteAllTasks = async () => {
    triggerHaptic("medium");
    await deleteAllTasks({
      date: folderId ? undefined : date,
      folderId,
    });
    setSelectedTaskId(null);
    setShowDeleteAllConfirm(false);
    triggerSuccessHaptic();
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const dateObj = new Date(timestamp);
    return dateObj.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle sending follow-up question
  const handleSendFollowUp = async () => {
    if (!selectedTask || !followUpMessage.trim() || isSendingFollowUp) return;

    // Don't allow follow-ups on processing tasks
    if (selectedTask.status === "pending" || selectedTask.status === "processing") {
      return;
    }

    setIsSendingFollowUp(true);
    triggerHaptic("light");

    try {
      // Add follow-up message to the existing task conversation
      await addFollowUpMessage({
        taskId: selectedTask._id,
        message: followUpMessage.trim(),
      });

      setFollowUpMessage("");
      triggerSuccessHaptic();
    } catch (error) {
      console.error("Error sending follow-up:", error);
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  // Handle creating todos from agent result
  const handleCreateTodos = async () => {
    if (!selectedTask || isCreatingTodos) return;
    if (selectedTask.status !== "completed" || !selectedTask.result) return;

    setIsCreatingTodos(true);
    triggerHaptic("light");

    try {
      const count = await createTodosFromAgent({
        taskId: selectedTask._id,
        date,
        folderId,
      });

      setTodosCreatedCount(count);
      triggerSuccessHaptic();
      
      // Reset after 3 seconds
      setTimeout(() => setTodosCreatedCount(null), 3000);
    } catch (error) {
      console.error("Error creating todos:", error);
    } finally {
      setIsCreatingTodos(false);
    }
  };

  // Handle saving result as a new note
  const handleSaveAsNote = async () => {
    if (!selectedTask || isSavingNote) return;
    if (selectedTask.status !== "completed" || !selectedTask.result) return;

    setIsSavingNote(true);
    triggerHaptic("light");

    try {
      await saveResultAsNote({
        taskId: selectedTask._id,
      });

      setNoteSaved(true);
      triggerSuccessHaptic();
      
      // Reset after 3 seconds
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (error) {
      console.error("Error saving as note:", error);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handle retrying a failed task
  const handleRetryTask = async (taskId: Id<"agentTasks">) => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    triggerHaptic("light");

    try {
      await retryTask({ taskId });
      triggerSuccessHaptic();
    } catch (error) {
      console.error("Error retrying task:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle clearing conversation for a task
  const handleClearConversation = async () => {
    if (!selectedTask || isClearing) return;
    
    setIsClearing(true);
    triggerHaptic("light");

    try {
      await clearConversation({ taskId: selectedTask._id });
      triggerSuccessHaptic();
    } catch (error) {
      console.error("Error clearing conversation:", error);
    } finally {
      setIsClearing(false);
    }
  };

  // Get the display provider name (actual provider used, or selected if not yet run)
  const getProviderName = (task: AgentTask) => {
    const provider = task.actualProvider || task.provider;
    return provider === "claude" ? "Claude" : "OpenAI";
  };

  const hasTasks = tasks && tasks.length > 0;

  return (
    <div className="agent-tasks-view">
      {/* Header */}
      <div className="agent-tasks-header">
        <button
          className="agent-tasks-back-button"
          onClick={onClose}
          title="Back to todos"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="agent-tasks-header-title">
          <Sparkles size={18} className="agent-tasks-header-icon" />
          <span>Agent Tasks</span>
        </div>
        {hasTasks && (
          <button
            className="agent-tasks-delete-all"
            onClick={() => {
              triggerHaptic("light");
              setShowDeleteAllConfirm(true);
            }}
            title="Delete all tasks"
          >
            <Trash2 size={14} />
            <span>Delete All</span>
          </button>
        )}
      </div>

      <div className="agent-tasks-content">
        {/* API Key Warning Banner */}
        {!hasApiKeys && userApiKeys !== undefined && (
          <div className="ai-api-key-warning" style={{ margin: "0 16px 16px 16px" }}>
            <div className="ai-api-key-warning-icon">
              <Key size={18} />
            </div>
            <div className="ai-api-key-warning-content">
              <strong>API Key Required</strong>
              <p>
                Agent tasks require an API key. Press <kbd>?</kbd> to open Keyboard Shortcuts and add your Claude or OpenAI key. You only need one to get started.
              </p>
            </div>
          </div>
        )}
        
        {/* Task list */}
        <div className="agent-tasks-list">
          {tasks === undefined ? (
            <div className="agent-tasks-loading">
              <Loader2 size={24} className="agent-task-status-icon processing" />
              <span>Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="agent-tasks-empty">
              <p>No agent tasks yet</p>
              <span>
                Send a todo or note to an AI agent from the menu to get started.
              </span>
            </div>
          ) : (
            tasks.map((task: AgentTask) => (
              <div
                key={task._id}
                className={`agent-task-item ${selectedTaskId === task._id ? "selected" : ""}`}
                onClick={() => {
                  triggerHaptic("light");
                  setSelectedTaskId(
                    selectedTaskId === task._id ? null : task._id,
                  );
                }}
              >
                <div className="agent-task-item-header">
                  <div className="agent-task-item-status">
                    {STATUS_ICONS[task.status]}
                  </div>
                  <div className="agent-task-item-meta">
                    <span className="agent-task-item-type">
                      {TASK_TYPE_ICONS[task.taskType]}
                      <span className="agent-task-item-type-label">
                        {task.taskType}
                      </span>
                    </span>
                    <span className="agent-task-item-provider">
                      {getProviderName(task)}
                    </span>
                  </div>
                  <div className="agent-task-item-actions">
                    {task.status === "completed" && task.result && (
                      <button
                        className="agent-task-item-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyResult(task._id, task.result!);
                        }}
                        title="Copy result"
                      >
                        {copiedTaskId === task._id ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                    <button
                      className="agent-task-item-action delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic("light");
                        setTaskToDelete(task._id);
                      }}
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="agent-task-item-content">
                  <span className="agent-task-item-title">
                    {task.sourceTitle || task.sourceContent.slice(0, 60)}
                    {!task.sourceTitle && task.sourceContent.length > 60
                      ? "..."
                      : ""}
                  </span>
                  <span className="agent-task-item-time">
                    {formatTime(task._creationTime)}
                  </span>
                </div>
                {task.status === "failed" && (
                  <div className="agent-task-item-failed-row">
                    {task.error && (
                      <div className="agent-task-item-error">{task.error}</div>
                    )}
                    <button
                      className="agent-task-retry-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryTask(task._id);
                      }}
                      disabled={isRetrying}
                      title="Retry task"
                    >
                      {isRetrying ? (
                        <Loader2 size={14} className="agent-task-status-icon processing" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Result panel - show for completed tasks with result */}
        {selectedTask && (selectedTask.status === "completed" || selectedTask.status === "processing") && (selectedTask.result || selectedTask.messages?.length) && (
          <div className="agent-task-result-panel">
            <div className="agent-task-result-header">
              <div className="agent-task-result-header-left">
                <span className="agent-task-result-label">Conversation</span>
                <span className="agent-task-result-provider">
                  {getProviderName(selectedTask)} - {selectedTask.taskType}
                </span>
              </div>
              <div className="agent-task-result-header-actions">
                {selectedTask.messages && selectedTask.messages.length > 0 && (
                  <button
                    className="agent-task-result-clear"
                    onClick={handleClearConversation}
                    disabled={isClearing || selectedTask.status === "processing"}
                    title="Clear follow-up messages"
                  >
                    {isClearing ? (
                      <Loader2 size={14} className="agent-task-status-icon processing" />
                    ) : (
                      <Eraser size={14} />
                    )}
                    <span>Clear</span>
                  </button>
                )}
                {selectedTask.result && (
                  <button
                    className="agent-task-result-copy"
                    onClick={() =>
                      handleCopyResult(selectedTask._id, selectedTask.result!)
                    }
                    title="Copy initial result"
                  >
                    {copiedTaskId === selectedTask._id ? (
                      <>
                        <Check size={14} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Action bar for completed tasks */}
            {selectedTask.status === "completed" && selectedTask.result && (
              <div className="agent-task-action-bar">
                <button
                  className="agent-task-action-button"
                  onClick={handleCreateTodos}
                  disabled={isCreatingTodos}
                  title="Create todos from result"
                >
                  {isCreatingTodos ? (
                    <Loader2 size={16} className="agent-task-status-icon processing" />
                  ) : todosCreatedCount !== null ? (
                    <Check size={16} />
                  ) : (
                    <ListTodo size={16} />
                  )}
                  <span>
                    {isCreatingTodos
                      ? "Creating..."
                      : todosCreatedCount !== null
                        ? `${todosCreatedCount} todos created`
                        : "Create Todos"}
                  </span>
                </button>
                <button
                  className="agent-task-action-button"
                  onClick={handleSaveAsNote}
                  disabled={isSavingNote}
                  title="Save result as note"
                >
                  {isSavingNote ? (
                    <Loader2 size={16} className="agent-task-status-icon processing" />
                  ) : noteSaved ? (
                    <Check size={16} />
                  ) : (
                    <FilePlus size={16} />
                  )}
                  <span>
                    {isSavingNote ? "Saving..." : noteSaved ? "Saved as Note" : "Save as Note"}
                  </span>
                </button>
              </div>
            )}

            {/* Execution log for "run" tasks - collapsible */}
            {selectedTask.taskType === "run" && selectedTask.executionLog && selectedTask.executionLog.length > 0 && (
              <div className={`agent-task-execution-log ${executionLogCollapsed ? "collapsed" : ""}`}>
                <button
                  className="agent-task-execution-log-header"
                  onClick={() => setExecutionLogCollapsed(!executionLogCollapsed)}
                  type="button"
                >
                  {executionLogCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <Terminal size={14} />
                  <span>Execution Log ({selectedTask.executionLog.length} tool calls)</span>
                </button>
                {!executionLogCollapsed && (
                  <div className="agent-task-execution-log-entries">
                    {selectedTask.executionLog.map((entry, idx) => (
                      <div key={idx} className={`agent-task-execution-log-entry ${entry.status}`}>
                        <div className="agent-task-execution-log-entry-header">
                          <span className="agent-task-execution-log-tool-name">{entry.toolName}</span>
                          <span className={`agent-task-execution-log-status ${entry.status}`}>
                            {entry.status === "pending" && <Clock size={12} />}
                            {entry.status === "success" && <CheckCircle size={12} />}
                            {entry.status === "error" && <XCircle size={12} />}
                            {entry.status}
                          </span>
                        </div>
                        <div className="agent-task-execution-log-entry-input">
                          <span className="agent-task-execution-log-label">Input:</span>
                          <code>{entry.toolInput}</code>
                        </div>
                        {entry.toolResult && (
                          <div className="agent-task-execution-log-entry-result">
                            <span className="agent-task-execution-log-label">Result:</span>
                            <code>{entry.toolResult}</code>
                            {/* Show "View Note" link if createNote succeeded */}
                            {onOpenNote && (() => {
                              const noteId = extractNoteIdFromResult(entry.toolName, entry.toolResult!);
                              if (noteId) {
                                return (
                                  <button
                                    className="agent-task-view-note-link"
                                    onClick={() => onOpenNote(noteId)}
                                    type="button"
                                  >
                                    <FileText size={12} />
                                    View Note
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="agent-task-conversation">
              {/* Initial result */}
              {selectedTask.result && (
                <div className="agent-task-message assistant">
                  <div className="agent-task-message-role">
                    {getProviderName(selectedTask)}
                  </div>
                  <div className="agent-task-message-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match;
                          return !isInline ? (
                            <SyntaxHighlighter
                              style={
                                theme === "dark" ? cursorDarkTheme : cursorLightTheme
                              }
                              language={match[1]}
                              PreTag="div"
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {selectedTask.result}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Follow-up messages */}
              {selectedTask.messages?.map((msg, idx) => (
                <div key={idx} className={`agent-task-message ${msg.role}`}>
                  <div className="agent-task-message-role">
                    {msg.role === "user" ? "You" : getProviderName(selectedTask)}
                  </div>
                  <div className="agent-task-message-content">
                    {msg.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match;
                            return !isInline ? (
                              <SyntaxHighlighter
                                style={
                                  theme === "dark" ? cursorDarkTheme : cursorLightTheme
                                }
                                language={match[1]}
                                PreTag="div"
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Processing indicator for follow-up */}
              {selectedTask.status === "processing" && selectedTask.result && (
                <div className="agent-task-message assistant processing">
                  <div className="agent-task-message-role">
                    {getProviderName(selectedTask)}
                  </div>
                  <div className="agent-task-message-content">
                    <div className="agent-task-typing">
                      <Loader2 size={16} className="agent-task-status-icon processing" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up chat input */}
            <div className="agent-task-followup">
              <div className="agent-task-followup-input-container">
                <textarea
                  className="agent-task-followup-input"
                  placeholder="Ask a follow-up question..."
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFollowUp();
                    }
                  }}
                  rows={1}
                  disabled={isSendingFollowUp || selectedTask.status === "processing"}
                />
                <button
                  className="agent-task-followup-send"
                  onClick={handleSendFollowUp}
                  disabled={!followUpMessage.trim() || isSendingFollowUp || selectedTask.status === "processing"}
                  title="Send follow-up"
                >
                  {isSendingFollowUp ? (
                    <Loader2 size={18} className="agent-task-status-icon processing" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing state for selected task - only show when no result yet (initial processing) */}
        {selectedTask && selectedTask.status === "processing" && !selectedTask.result && (
          <div className="agent-task-result-panel">
            <div className="agent-task-processing">
              <Loader2 size={32} className="agent-task-status-icon processing" />
              <span>Processing with {getProviderName(selectedTask)}...</span>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Delete Agent Task"
        message="Are you sure you want to delete this agent task? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteTask}
        onCancel={() => setTaskToDelete(null)}
        isDangerous={true}
      />

      {/* Delete all tasks confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete All Agent Tasks"
        message={`Are you sure you want to delete all ${tasks?.length || 0} agent tasks? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={handleDeleteAllTasks}
        onCancel={() => setShowDeleteAllConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
}
