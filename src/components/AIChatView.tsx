import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ArrowUpIcon, PinLeftIcon, PinRightIcon } from "@radix-ui/react-icons";
import { Loader2, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIChatViewProps {
  date: string;
  onClose?: () => void;
}

// Message type for display
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function AIChatView({ date }: AIChatViewProps) {
  const { isAuthenticated } = useConvexAuth();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null,
  );
  const [isInputCentered, setIsInputCentered] = useState(() => {
    // Load preference from localStorage, default to centered
    const saved = localStorage.getItem("aiChatInputCentered");
    return saved === null ? true : saved === "true";
  });
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch or create chat for this date
  const chat = useQuery(
    api.aiChats.getAIChatByDate,
    isAuthenticated ? { date } : "skip",
  );
  const getOrCreateChat = useMutation(api.aiChats.getOrCreateAIChat);
  const addUserMessage = useMutation(api.aiChats.addUserMessage);
  const generateResponse = useAction(api.aiChatActions.generateResponse);
  const clearChat = useMutation(api.aiChats.clearChat);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Toggle input position and save preference
  const toggleInputPosition = () => {
    setIsInputCentered((prev) => {
      const newValue = !prev;
      localStorage.setItem("aiChatInputCentered", String(newValue));
      return newValue;
    });
  };

  // Handle "/" key to focus chat input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Focus chat input with "/"
      if (e.key === "/") {
        e.preventDefault();
        e.stopPropagation(); // Prevent App.tsx from handling this
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true); // Use capture phase to handle before App.tsx
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      // Show scrollbar only when at max height
      textarea.style.overflowY =
        textarea.scrollHeight > 200 ? "auto" : "hidden";
    }
  };

  // Adjust height when input value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Handle clearing the chat when user types "clear" (in quotes)
  const handleClearChat = async () => {
    if (!chat) return;
    
    try {
      await clearChat({ chatId: chat._id });
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    
    // Check for "clear" command (must be exactly "clear" in quotes)
    if (messageContent === '"clear"') {
      setInputValue("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      await handleClearChat();
      return;
    }

    setInputValue("");
    setIsLoading(true);
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      // Get or create chat
      let chatId: Id<"aiChats">;
      if (chat) {
        chatId = chat._id;
      } else {
        chatId = await getOrCreateChat({ date });
      }

      // Add user message
      await addUserMessage({ chatId, content: messageContent });

      // Generate AI response
      await generateResponse({ chatId, userMessage: messageContent });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle copying message content
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const messages: ChatMessage[] = chat?.messages || [];

  return (
    <div className="ai-chat-view">
      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.map((message, index) => (
          <div key={index} className="ai-chat-message-wrapper">
            <div
              className={`ai-chat-message ai-chat-message-${message.role}`}
            >
              <div className="ai-chat-message-content">
                {message.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
            {message.role === "assistant" && (
              <button
                className="ai-chat-copy-button"
                onClick={() => handleCopyMessage(message.content, index)}
                title="Copy message"
                aria-label="Copy message"
              >
                {copiedMessageIndex === index ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="ai-chat-message ai-chat-message-assistant">
            <div className="ai-chat-message-content ai-chat-loading">
              <Loader2 className="ai-chat-spinner" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-chat-input-container">
        <div
          className="ai-chat-input-wrapper"
          data-centered={isInputCentered ? "true" : "false"}
        >
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyPress}
            placeholder="Ask me to help you write something..."
            rows={1}
            disabled={isLoading}
            style={{ resize: "none", overflow: "hidden" }}
          />
          {!isMobile && (
            <button
              type="button"
              className="ai-chat-pin-toggle"
              onClick={toggleInputPosition}
              aria-label={
                isInputCentered ? "Move input to left" : "Center input"
              }
              title={isInputCentered ? "Move input to left" : "Center input"}
            >
              {isInputCentered ? <PinLeftIcon /> : <PinRightIcon />}
            </button>
          )}
          <button
            className="ai-chat-send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="ai-chat-spinner" />
            ) : (
              <ArrowUpIcon />
            )}
          </button>
        </div>
        <div className="ai-chat-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
