import React, { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  ArrowUpIcon,
  PinLeftIcon,
  PinRightIcon,
  StopIcon,
  Link2Icon,
  Cross2Icon,
  ImageIcon,
} from "@radix-ui/react-icons";
import { Loader2, Copy, Check, X } from "lucide-react";
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
  attachments?: Array<{
    type: "image" | "link";
    storageId?: Id<"_storage">;
    url?: string;
    title?: string;
  }>;
}

// Attachment types for state management
interface ImageAttachment {
  type: "image";
  file: File;
  preview: string;
  storageId?: Id<"_storage">;
}

interface LinkAttachment {
  type: "link";
  url: string;
}

type Attachment = ImageAttachment | LinkAttachment;

export function AIChatView({ date }: AIChatViewProps) {
  const { isAuthenticated } = useConvexAuth();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(
    null,
  );
  const [isInputCentered, setIsInputCentered] = useState(() => {
    const saved = localStorage.getItem("aiChatInputCentered");
    return saved === null ? true : saved === "true";
  });
  const [isMobile, setIsMobile] = useState(false);

  // Attachment state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Fetch or create chat for this date
  const chat = useQuery(
    api.aiChats.getAIChatByDate,
    isAuthenticated ? { date } : "skip",
  );
  const getOrCreateChat = useMutation(api.aiChats.getOrCreateAIChat);
  const addUserMessageWithAttachments = useMutation(
    api.aiChats.addUserMessageWithAttachments,
  );
  const generateResponse = useAction(api.aiChatActions.generateResponse);
  const clearChat = useMutation(api.aiChats.clearChat);
  const generateUploadUrl = useMutation(api.aiChats.generateUploadUrl);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus link input when modal opens
  useEffect(() => {
    if (showLinkModal) {
      setTimeout(() => linkInputRef.current?.focus(), 100);
    }
  }, [showLinkModal]);

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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        e.stopPropagation();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY =
        textarea.scrollHeight > 200 ? "auto" : "hidden";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Handle clearing the chat
  const handleClearChat = async () => {
    if (!chat) return;
    try {
      await clearChat({ chatId: chat._id });
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  // Handle stopping the AI generation
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStopped(true);
    setTimeout(() => setIsStopped(false), 2000);
    inputRef.current?.focus();
  }, []);

  // Handle image file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check current attachment count (max 3 images)
    const currentImageCount = attachments.filter(
      (a) => a.type === "image",
    ).length;
    const availableSlots = 3 - currentImageCount;

    if (availableSlots <= 0) {
      alert("Maximum 3 images per message");
      return;
    }

    const filesToAdd = Array.from(files).slice(0, availableSlots);
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const maxSize = 3 * 1024 * 1024; // 3MB

    for (const file of filesToAdd) {
      // Validate type
      if (!validTypes.includes(file.type)) {
        alert(
          `Invalid file type: ${file.name}. Only PNG, JPEG, GIF, and WebP are allowed.`,
        );
        continue;
      }
      // Validate size
      if (file.size > maxSize) {
        alert(`File too large: ${file.name}. Maximum size is 3MB.`);
        continue;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      setAttachments((prev) => [
        ...prev,
        {
          type: "image",
          file,
          preview,
        },
      ]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle adding a link
  const handleAddLink = () => {
    const url = linkInputValue.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    // Check if link already added
    if (attachments.some((a) => a.type === "link" && a.url === url)) {
      alert("This link is already attached");
      return;
    }

    // Max 3 links
    const linkCount = attachments.filter((a) => a.type === "link").length;
    if (linkCount >= 3) {
      alert("Maximum 3 links per message");
      return;
    }

    setAttachments((prev) => [...prev, { type: "link", url }]);
    setLinkInputValue("");
    setShowLinkModal(false);
  };

  // Remove attachment
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => {
      const attachment = prev[index];
      // Revoke preview URL if it's an image
      if (attachment.type === "image") {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Upload images to Convex storage
  const uploadImages = async (): Promise<
    Array<{ type: "image"; storageId: Id<"_storage"> }>
  > => {
    const imageAttachments = attachments.filter(
      (a): a is ImageAttachment => a.type === "image",
    );
    const uploadedImages: Array<{ type: "image"; storageId: Id<"_storage"> }> =
      [];

    for (const imageAtt of imageAttachments) {
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageAtt.file.type },
          body: imageAtt.file,
        });

        if (!result.ok) {
          throw new Error("Failed to upload image");
        }

        const { storageId } = await result.json();
        uploadedImages.push({ type: "image", storageId });
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    return uploadedImages;
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

    const messageContent = inputValue.trim();

    // Check for "clear" command
    if (messageContent === '"clear"' && attachments.length === 0) {
      setInputValue("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      await handleClearChat();
      return;
    }

    setInputValue("");
    setIsLoading(true);
    setIsUploading(true);
    setIsStopped(false);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    abortControllerRef.current = new AbortController();

    try {
      // Get or create chat
      let chatId: Id<"aiChats">;
      if (chat) {
        chatId = chat._id;
      } else {
        chatId = await getOrCreateChat({ date });
      }

      // Upload images and prepare attachments
      const uploadedImages = await uploadImages();
      setIsUploading(false);

      const linkAttachments = attachments
        .filter((a): a is LinkAttachment => a.type === "link")
        .map((a) => ({ type: "link" as const, url: a.url }));

      const allAttachments = [...uploadedImages, ...linkAttachments];

      // Clear attachments after preparing them
      attachments.forEach((a) => {
        if (a.type === "image") {
          URL.revokeObjectURL(a.preview);
        }
      });
      setAttachments([]);

      // Add user message with attachments
      await addUserMessageWithAttachments({
        chatId,
        content: messageContent || "(Attached content)",
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      });

      // Check if stopped before generating response
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Generate AI response with attachments
      await generateResponse({
        chatId,
        userMessage: messageContent || "Please analyze the attached content.",
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to send message:", error);
      }
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      abortControllerRef.current = null;
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle link modal key press
  const handleLinkKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
    if (e.key === "Escape") {
      setShowLinkModal(false);
      setLinkInputValue("");
    }
  };

  // Handle copying message content
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const messages: ChatMessage[] = chat?.messages || [];
  const hasAttachments = attachments.length > 0;

  return (
    <div className="ai-chat-view">
      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.map((message, index) => (
          <div key={index} className="ai-chat-message-wrapper">
            <div className={`ai-chat-message ai-chat-message-${message.role}`}>
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
              <span>{isUploading ? "Uploading..." : "Thinking..."}</span>
              <button
                className="ai-chat-stop-button"
                onClick={handleStop}
                title="Stop generating"
                aria-label="Stop generating"
              >
                <StopIcon />
                <span>Stop</span>
              </button>
            </div>
          </div>
        )}
        {isStopped && !isLoading && (
          <div className="ai-chat-message ai-chat-message-system">
            <div className="ai-chat-message-content ai-chat-stopped">
              <span>Generation stopped</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-chat-input-container">
        {/* Attachments Preview */}
        {hasAttachments && (
          <div className="ai-chat-attachments-preview">
            {attachments.map((attachment, index) => (
              <div key={index} className="ai-chat-attachment-item">
                {attachment.type === "image" ? (
                  <div className="ai-chat-attachment-image">
                    <img src={attachment.preview} alt="Attachment preview" />
                    <button
                      className="ai-chat-attachment-remove"
                      onClick={() => handleRemoveAttachment(index)}
                      aria-label="Remove attachment"
                    >
                      <Cross2Icon />
                    </button>
                  </div>
                ) : (
                  <div className="ai-chat-attachment-link">
                    <Link2Icon />
                    <span className="ai-chat-attachment-link-url">
                      {attachment.url.length > 30
                        ? attachment.url.slice(0, 30) + "..."
                        : attachment.url}
                    </span>
                    <button
                      className="ai-chat-attachment-remove"
                      onClick={() => handleRemoveAttachment(index)}
                      aria-label="Remove attachment"
                    >
                      <Cross2Icon />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className="ai-chat-input-wrapper"
          data-centered={isInputCentered ? "true" : "false"}
        >
          {/* Attachment buttons */}
          <div className="ai-chat-attach-buttons">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              onChange={handleFileSelect}
              className="ai-chat-file-input"
              aria-label="Upload image"
            />
            <button
              type="button"
              className="ai-chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                isLoading ||
                attachments.filter((a) => a.type === "image").length >= 3
              }
              title="Attach image (max 3)"
              aria-label="Attach image"
            >
              <ImageIcon />
            </button>
            <button
              type="button"
              className="ai-chat-attach-btn"
              onClick={() => setShowLinkModal(true)}
              disabled={
                isLoading ||
                attachments.filter((a) => a.type === "link").length >= 3
              }
              title="Attach link (max 3)"
              aria-label="Attach link"
            >
              <Link2Icon />
            </button>
          </div>

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
            disabled={(!inputValue.trim() && !hasAttachments) || isLoading}
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

      {/* Link Modal */}
      {showLinkModal && (
        <div
          className="ai-chat-link-modal-overlay"
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="ai-chat-link-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-chat-link-modal-header">
              <h3>Add Link</h3>
              <button
                className="ai-chat-link-modal-close"
                onClick={() => setShowLinkModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ai-chat-link-modal-content">
              <input
                ref={linkInputRef}
                type="url"
                className="ai-chat-link-input"
                value={linkInputValue}
                onChange={(e) => setLinkInputValue(e.target.value)}
                onKeyDown={handleLinkKeyPress}
                placeholder="https://example.com/article"
              />
              <p className="ai-chat-link-hint">
                Paste a URL to a tweet, LinkedIn post, blog, or any webpage
              </p>
            </div>
            <div className="ai-chat-link-modal-footer">
              <button
                className="ai-chat-link-cancel-btn"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkInputValue("");
                }}
              >
                Cancel
              </button>
              <button
                className="ai-chat-link-add-btn"
                onClick={handleAddLink}
                disabled={!linkInputValue.trim()}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
