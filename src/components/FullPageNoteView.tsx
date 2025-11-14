import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../context/ThemeContext";
import { Cross2Icon, TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { ImageSizeModal } from "./ImageSizeModal";
import { ConfirmDialog } from "./ConfirmDialog";

// Helper function to normalize hex color to 6-digit format
function normalizeHexColor(hex: string): string {
  if (hex.length === 4) {
    // Convert #RGB to #RRGGBB
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase();
  }
  return hex.toUpperCase();
}

// Cursor Dark Theme colors for syntax highlighting
const cursorDarkTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#d4d4d4",
    background: "#1e1e1e",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto" as const,
  },
  comment: { color: "#6a9955", fontStyle: "italic" },
  prolog: { color: "#6a9955" },
  doctype: { color: "#6a9955" },
  cdata: { color: "#6a9955" },
  punctuation: { color: "#d4d4d4" },
  property: { color: "#9cdcfe" },
  tag: { color: "#569cd6" },
  boolean: { color: "#569cd6" },
  number: { color: "#b5cea8" },
  constant: { color: "#4fc1ff" },
  symbol: { color: "#4fc1ff" },
  deleted: { color: "#f44747" },
  selector: { color: "#d7ba7d" },
  "attr-name": { color: "#92c5f6" },
  string: { color: "#ce9178" },
  char: { color: "#ce9178" },
  builtin: { color: "#569cd6" },
  inserted: { color: "#6a9955" },
  operator: { color: "#d4d4d4" },
  entity: { color: "#dcdcaa" },
  url: { color: "#9cdcfe", textDecoration: "underline" },
  variable: { color: "#9cdcfe" },
  atrule: { color: "#569cd6" },
  "attr-value": { color: "#ce9178" },
  function: { color: "#dcdcaa" },
  "function-variable": { color: "#dcdcaa" },
  keyword: { color: "#569cd6" },
  regex: { color: "#d16969" },
  important: { color: "#569cd6", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  namespace: { opacity: 0.7 },
  "class-name": { color: "#4ec9b0" },
  parameter: { color: "#9cdcfe" },
  decorator: { color: "#dcdcaa" },
};

// Cursor Light Theme colors for syntax highlighting
const cursorLightTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#171717",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
  },
  'pre[class*="language-"]': {
    color: "#171717",
    background: "#ffffff",
    fontFamily:
      "SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace",
    fontSize: "13px",
    textAlign: "left" as const,
    whiteSpace: "pre" as const,
    wordSpacing: "normal",
    wordBreak: "normal" as const,
    wordWrap: "normal" as const,
    lineHeight: "1.5",
    tabSize: 4,
    hyphens: "none" as const,
    padding: "1em",
    margin: "0",
    overflow: "auto" as const,
  },
  comment: { color: "#008000", fontStyle: "italic" },
  prolog: { color: "#008000" },
  doctype: { color: "#008000" },
  cdata: { color: "#008000" },
  punctuation: { color: "#171717" },
  property: { color: "#001080" },
  tag: { color: "#800000" },
  boolean: { color: "#0000ff" },
  number: { color: "#098658" },
  constant: { color: "#0070c1" },
  symbol: { color: "#0070c1" },
  deleted: { color: "#e51400" },
  selector: { color: "#a31515" },
  "attr-name": { color: "#0451a5" },
  string: { color: "#a31515" },
  char: { color: "#a31515" },
  builtin: { color: "#0000ff" },
  inserted: { color: "#008000" },
  operator: { color: "#171717" },
  entity: { color: "#795e26" },
  url: { color: "#001080", textDecoration: "underline" },
  variable: { color: "#001080" },
  atrule: { color: "#0000ff" },
  "attr-value": { color: "#a31515" },
  function: { color: "#795e26" },
  "function-variable": { color: "#795e26" },
  keyword: { color: "#0000ff" },
  regex: { color: "#811f3f" },
  important: { color: "#0000ff", fontWeight: "bold" },
  bold: { fontWeight: "bold" },
  italic: { fontStyle: "italic" },
  namespace: { opacity: 0.7 },
  "class-name": { color: "#267f99" },
  parameter: { color: "#001080" },
  decorator: { color: "#795e26" },
};

// Types for parsed content blocks
type ContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; content: string; language: string }
  | { type: "image"; storageId: Id<"_storage">; size: "small" | "medium" | "large"; alt: string; alignment: "left" | "center" | "right" };

// Helper: Check if there are images inside code blocks (invalid state)
function hasImagesInCodeBlocks(content: string): boolean {
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const codeBlockContent = match[0];
    // Check if this code block contains image syntax (including optional alignment)
    if (/!\[.*?\]\(.*?\|.*?(?:\|.*?)?\)/.test(codeBlockContent)) {
      console.log('Found image inside code block:', codeBlockContent.substring(0, 100));
      return true;
    }
  }
  
  return false;
}

// Parse markdown-style code blocks and images from plain text
// Images inside code blocks are IGNORED and treated as text
function parseContentBlocks(content: string): Array<ContentBlock> {
  const blocks: Array<ContentBlock> = [];
  
  // First, find all code block positions to exclude them from image matching
  const codeBlockPositions: Array<{ start: number; end: number }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let codeMatch;
  
  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    codeBlockPositions.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
    });
  }
  
  // Helper to check if a position is inside a code block
  const isInsideCodeBlock = (pos: number): boolean => {
    return codeBlockPositions.some(block => pos >= block.start && pos < block.end);
  };
  
  // Now parse all blocks in order
  const combinedRegex = /(```(\w+)?\n([\s\S]*?)```|!\[(.*?)\]\((.*?)\|(\w+)(?:\|(\w+))?\))/g;
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before current match
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    if (match[0].startsWith("```")) {
      // Code block - always add it
      const language = match[2] || "text";
      const codeContent = match[3];
      blocks.push({ type: "code", content: codeContent, language });
      } else if (match[0].startsWith("![")) {
      // Image - only add if NOT inside a code block
      if (!isInsideCodeBlock(match.index)) {
        const alt = match[4] || "";
        const storageId = match[5] as Id<"_storage">;
        const size = match[6] as "small" | "medium" | "large";
        const alignment = (match[7] as "left" | "center" | "right") || "center";
        blocks.push({ type: "image", storageId, size, alt, alignment });
      } else {
        // Image is inside code block - treat as text
        blocks.push({ type: "text", content: match[0] });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last match
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no blocks found, return entire content as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", content });
  }

  return blocks;
}

interface FullPageNoteViewProps {
  noteId: Id<"fullPageNotes">;
  onImageUploadTrigger?: (callback: () => void) => void;
  onEditModeChange?: (isEditing: boolean) => void;
  onTogglePreview?: () => void;
  onCursorInCodeBlockChange?: (inCodeBlock: boolean) => void;
}

export function FullPageNoteView({ noteId, onImageUploadTrigger, onEditModeChange, onTogglePreview, onCursorInCodeBlockChange }: FullPageNoteViewProps) {
  const { theme } = useTheme();
  const note = useQuery(api.fullPageNotes.getFullPageNote, { id: noteId });
  const updateNote = useMutation(api.fullPageNotes.updateFullPageNote);
  const generateUploadUrl = useMutation(api.fullPageNotes.generateUploadUrl);
  const addImageToNote = useMutation(api.fullPageNotes.addImageToNote);
  const removeImageFromNote = useMutation(api.fullPageNotes.removeImageFromNote);
  const imageUrls = useQuery(api.fullPageNotes.getImageUrls, { noteId });

  const [contentInput, setContentInput] = useState(note?.content || "");
  const [isEditMode, setIsEditMode] = useState(false);
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const cursorPositionRef = useRef<number | null>(null);
  const [textareaHeight, setTextareaHeight] = useState<number>(400);
  const isResizingRef = useRef(false);
  const codeBlockRefs = useRef<Map<number, HTMLPreElement>>(new Map());
  const codeBlockWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  // Image upload state
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageToDelete, setImageToDelete] = useState<{ storageId: Id<"_storage">; alt: string } | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showImageInCodeWarning, setShowImageInCodeWarning] = useState(false);
  const [cursorInCodeBlock, setCursorInCodeBlock] = useState(false);
  const [showPreviewBlockedWarning, setShowPreviewBlockedWarning] = useState(false);

  // Update local state when note prop changes or noteId changes
  useEffect(() => {
    if (note && !isTypingRef.current && !isEditMode) {
      setContentInput(note.content);
    }
  }, [note?.content, isEditMode, noteId]);

  // Reset edit mode when noteId changes
  useEffect(() => {
    setIsEditMode(false);
    isTypingRef.current = false;
    cursorPositionRef.current = null;
    setSelectedImageIndex(null); // Close image toolbar
  }, [noteId]);

  // Close image toolbar when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setSelectedImageIndex(null);
    }
  }, [isEditMode]);

  // Close image toolbar when clicking outside
  useEffect(() => {
    if (!isEditMode && selectedImageIndex !== null) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Close if clicking outside image or toolbar
        if (!target.closest('.fullpage-note-image')) {
          setSelectedImageIndex(null);
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isEditMode, selectedImageIndex]);

  // Auto-enter edit mode for new/empty notes
  useEffect(() => {
    if (note && !note.content.trim() && !isEditMode) {
      setIsEditMode(true);
    }
  }, [note?.content, isEditMode, note]);

  // Reset typing flag when entering/exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      isTypingRef.current = false;
      cursorPositionRef.current = null;
    } else {
      // Set initial height based on content when entering edit mode
      if (contentInput) {
        const lineCount = contentInput.split("\n").length;
        const newHeight = Math.max(400, Math.min(800, lineCount * 24 + 20));
        setTextareaHeight(newHeight);
      }
    }
  }, [isEditMode, contentInput]);

  const handleContentChange = (value: string) => {
    // Mark that user is actively typing
    isTypingRef.current = true;

    // Save cursor position before updating
    if (textareaRef.current) {
      cursorPositionRef.current = textareaRef.current.selectionStart;
      
      // Check if cursor is inside a code block
      const cursorPos = textareaRef.current.selectionStart;
      const isInCodeBlock = isCursorInsideCodeBlock(value, cursorPos);
      setCursorInCodeBlock(isInCodeBlock);
    }

    setContentInput(value);

    // Auto-expand textarea based on content
    if (textareaRef.current && !isResizingRef.current) {
      const lineCount = value.split("\n").length;
      const newHeight = Math.max(400, Math.min(800, lineCount * 24 + 20));
      setTextareaHeight(newHeight);
    }

    // Clear existing timeout
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }

    // Set new timeout to update database after 500ms of no typing
    contentTimeoutRef.current = setTimeout(() => {
      updateNote({ id: noteId, content: value });
      // Mark typing as done after save
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
    }, 500);
  };

  const handleContentBlur = () => {
    // Force immediate save on blur
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }
    updateNote({ id: noteId, content: contentInput });
    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;

    const startY = e.clientY;
    const startHeight = textareaHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(200, Math.min(1200, startHeight + deltaY));
      setTextareaHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Check if cursor is inside a code block
  const isCursorInsideCodeBlock = (content: string, cursorPos: number): boolean => {
    // Find all code block positions
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      
      // Check if cursor is within this code block
      if (cursorPos > start && cursorPos < end) {
        return true;
      }
    }
    
    return false;
  };

  // Image alignment handler - update specific image instance by index
  const handleAlignmentChange = (imageIndex: number, storageId: Id<"_storage">, newAlignment: "left" | "center" | "right") => {
    // Find the specific image instance and update only that one
    const imageRegex = /!\[(.*?)\]\((.*?)\|(\w+)(?:\|(\w+))?\)/g;
    let match;
    let lastIndex = 0;
    let result = '';
    let currentImageIndex = 0;
    
    while ((match = imageRegex.exec(contentInput)) !== null) {
      const matchStorageId = match[2];
      
      // Add content before this match
      result += contentInput.slice(lastIndex, match.index);
      
      // Check if this is our target image by counting images with same storageId
      if (matchStorageId === storageId) {
        if (currentImageIndex === imageIndex) {
          // This is the image we want to update
          const alt = match[1];
          const size = match[3];
          result += `![${alt}](${storageId}|${size}|${newAlignment})`;
          lastIndex = match.index + match[0].length;
          currentImageIndex++;
          continue;
        }
        currentImageIndex++;
      }
      
      // Keep the original match
      result += match[0];
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining content
    result += contentInput.slice(lastIndex);
    
    setContentInput(result);
    updateNote({ id: noteId, content: result });
  };

  // Image upload handlers
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPendingFile(file);
      setShowSizeModal(true);
    } else if (file) {
      alert("Please select an image file (JPEG, PNG, GIF, WebP)");
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSizeSelect = async (size: "small" | "medium" | "large") => {
    if (!pendingFile) return;

    setShowSizeModal(false);
    
    // Check if cursor is inside a code block
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart || contentInput.length;
      
      if (isCursorInsideCodeBlock(contentInput, cursorPos)) {
        // Show warning and don't upload
        setShowImageInCodeWarning(true);
        setPendingFile(null);
        setTimeout(() => setShowImageInCodeWarning(false), 4000); // Auto-hide after 4 seconds
        return;
      }
    }

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl) {
        throw new Error("Failed to generate upload URL");
      }

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": pendingFile.type },
        body: pendingFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await result.json();

      // Add image to note's imageIds array
      await addImageToNote({ noteId, storageId });

      // Insert image syntax at cursor position or end of content (default alignment: center)
      const alt = pendingFile.name.split(".")[0] || "image";
      const imageSyntax = `![${alt}](${storageId}|${size}|center)\n`;
      
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart || contentInput.length;
        const newContent =
          contentInput.slice(0, cursorPos) +
          imageSyntax +
          contentInput.slice(cursorPos);
        setContentInput(newContent);
        updateNote({ id: noteId, content: newContent });
        
        // Move cursor after inserted image
        setTimeout(() => {
          if (textareaRef.current) {
            const newCursorPos = cursorPos + imageSyntax.length;
            textareaRef.current.selectionStart = newCursorPos;
            textareaRef.current.selectionEnd = newCursorPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setPendingFile(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;

    try {
      // Remove image from note's imageIds and delete from storage
      await removeImageFromNote({
        noteId,
        storageId: imageToDelete.storageId,
      });

      // Remove image syntax from content
      const imagePattern = new RegExp(
        `!\\[${imageToDelete.alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${imageToDelete.storageId}\\|\\w+\\)\\n?`,
        "g"
      );
      const newContent = contentInput.replace(imagePattern, "");
      setContentInput(newContent);
      updateNote({ id: noteId, content: newContent });
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    } finally {
      setImageToDelete(null);
    }
  };

  // Register image upload trigger with parent
  useEffect(() => {
    if (onImageUploadTrigger) {
      onImageUploadTrigger(handleImageUploadClick);
    }
  }, [onImageUploadTrigger]);

  // Validate before entering preview mode
  const attemptEnterPreviewMode = () => {
    // Check if there are images inside code blocks
    if (hasImagesInCodeBlocks(contentInput)) {
      setShowPreviewBlockedWarning(true);
      setTimeout(() => setShowPreviewBlockedWarning(false), 5000);
      return false;
    }
    setIsEditMode(false);
    return true;
  };

  // Track cursor position on mouse clicks in textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isEditMode) return;

    const handleClick = () => {
      const cursorPos = textarea.selectionStart;
      const isInCodeBlock = isCursorInsideCodeBlock(contentInput, cursorPos);
      setCursorInCodeBlock(isInCodeBlock);
    };

    const handleKeyUp = () => {
      const cursorPos = textarea.selectionStart;
      const isInCodeBlock = isCursorInsideCodeBlock(contentInput, cursorPos);
      setCursorInCodeBlock(isInCodeBlock);
    };

    textarea.addEventListener("click", handleClick);
    textarea.addEventListener("keyup", handleKeyUp);
    return () => {
      textarea.removeEventListener("click", handleClick);
      textarea.removeEventListener("keyup", handleKeyUp);
    };
  }, [isEditMode, contentInput]);

  // Keyboard shortcuts for full-page notes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in textarea or input
      if (
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLInputElement
      ) {
        // Only handle ESC when in textarea
        if (e.key === "Escape") {
          e.stopPropagation();
          if (isEditMode) {
            e.preventDefault();
            attemptEnterPreviewMode();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }
        }
        return;
      }

      // Handle keyboard shortcuts when not typing
      if (e.key === "Escape") {
        // Stop propagation to prevent App.tsx from closing full-page notes
        e.stopPropagation();
        
        // Only exit edit mode if in edit mode
        if (isEditMode) {
          e.preventDefault();
          attemptEnterPreviewMode();
        }
      } else if (e.key === "e" || e.key === "E") {
        // Enter edit mode
        e.preventDefault();
        e.stopPropagation();
        setIsEditMode(true);
      } else if (e.key === "p" || e.key === "P") {
        // Enter preview mode (with validation)
        e.preventDefault();
        e.stopPropagation();
        if (isEditMode) {
          attemptEnterPreviewMode();
        } else {
          setIsEditMode(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, contentInput]);

  // Notify parent of edit mode changes
  useEffect(() => {
    if (onEditModeChange) {
      onEditModeChange(isEditMode);
    }
  }, [isEditMode, onEditModeChange]);

  // Notify parent of cursor in code block changes
  useEffect(() => {
    if (onCursorInCodeBlockChange) {
      onCursorInCodeBlockChange(cursorInCodeBlock);
    }
  }, [cursorInCodeBlock, onCursorInCodeBlockChange]);

  // Register toggle preview callback
  useEffect(() => {
    if (onTogglePreview) {
      // Expose toggle function to parent with validation
      const toggleFunc = () => {
        setIsEditMode((prev) => {
          if (prev) {
            // Exiting edit mode - validate first
            return attemptEnterPreviewMode() ? false : true;
          } else {
            // Entering edit mode - always allowed
            return true;
          }
        });
      };
      // Store in a way parent can access
      (window as any).__toggleFullPageNotePreview = toggleFunc;
      return () => {
        delete (window as any).__toggleFullPageNotePreview;
      };
    }
  }, [onTogglePreview, contentInput]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
      }
    };
  }, []);

  // Restore cursor position after React updates
  useEffect(() => {
    if (
      isEditMode &&
      textareaRef.current &&
      cursorPositionRef.current !== null &&
      isTypingRef.current
    ) {
      textareaRef.current.setSelectionRange(
        cursorPositionRef.current,
        cursorPositionRef.current,
      );
    }
  }, [contentInput, isEditMode]);

  // Effect for code block styling (only in display mode)
  useEffect(() => {
    if (isEditMode) return;

    const processCodeBlock = (codeElement: HTMLPreElement, index: number) => {
      const code = codeElement.querySelector("code");
      if (!code) return;

      const wrapper = codeBlockWrapperRefs.current.get(index);
      if (!wrapper) return;

      // Get background color from computed style
      const computedStyle = window.getComputedStyle(code);
      const bgColor = computedStyle.backgroundColor;

      // Parse RGB to hex
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const hex = normalizeHexColor(
          `#${parseInt(rgb[0]).toString(16).padStart(2, "0")}${parseInt(rgb[1]).toString(16).padStart(2, "0")}${parseInt(rgb[2]).toString(16).padStart(2, "0")}`,
        );
        wrapper.style.setProperty("--code-bg-color", hex);
      }
    };

    // Process all code blocks
    codeBlockRefs.current.forEach((codeElement, index) => {
      processCodeBlock(codeElement, index);
    });
  }, [isEditMode, contentInput, theme]);

  if (!note) {
    return null;
  }

  return (
    <div className="fullpage-note-view">
      <div className="fullpage-note-content-wrapper">
        {isEditMode ? (
          // Edit mode
          <div className="fullpage-note-editor-container">
            <div
              className="note-line-numbers"
              aria-hidden="true"
              style={{ height: `${textareaHeight}px` }}
            >
              {contentInput.split("\n").map((_, index) => (
                <div key={index} className="line-number">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="fullpage-note-textarea"
              placeholder="Write your note with markdown support (bold, italic, lists, links). Use ```language for code blocks (css, js, ts, html, json, python, go, rust, etc.)."
              value={contentInput}
              onChange={(e) => {
                handleContentChange(e.target.value);
              }}
              onBlur={handleContentBlur}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation(); // Prevent closing full-page notes
                  setIsEditMode(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }
              }}
              spellCheck={true}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              style={{ height: `${textareaHeight}px` }}
            />
            <div
              className="note-resize-handle"
              onMouseDown={handleResizeMouseDown}
              title="Drag to resize"
            />
          </div>
        ) : (
          // Display mode with markdown rendering
          <div
            className="fullpage-note-display-content"
            onClick={(e) => {
              // Only enter edit mode if clicking on the background, not on images or their toolbars
              if (e.target === e.currentTarget) {
                setIsEditMode(true);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditMode(true);
              }
            }}
          >
            {parseContentBlocks(contentInput).map((block, index) => {
              if (block.type === "code") {
                return (
                  <div
                    key={index}
                    className="note-code-block-wrapper"
                    ref={(el) => {
                      if (el) codeBlockWrapperRefs.current.set(index, el);
                    }}
                    onClick={(e) => {
                      // Allow clicking code blocks to enter edit mode
                      e.stopPropagation();
                      setIsEditMode(true);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Click to edit"
                  >
                    <SyntaxHighlighter
                      language={block.language}
                      style={
                        theme === "dark" ? cursorDarkTheme : cursorLightTheme
                      }
                      showLineNumbers={true}
                      wrapLines={true}
                      customStyle={{
                        margin: 0,
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                      PreTag={(props) => (
                        <pre
                          {...props}
                          ref={(el) => {
                            if (el) codeBlockRefs.current.set(index, el);
                          }}
                        />
                      )}
                    >
                      {block.content}
                    </SyntaxHighlighter>
                  </div>
                );
              } else if (block.type === "image") {
                const imageUrl = imageUrls?.find((img) => img.storageId === block.storageId)?.url;
                // Count how many images with same storageId appear before this one
                const imageBlocksBeforeThis = parseContentBlocks(contentInput)
                  .slice(0, index)
                  .filter(b => b.type === "image" && b.storageId === block.storageId)
                  .length;
                
                return imageUrl ? (
                  <div
                    key={index}
                    className={`fullpage-note-image fullpage-note-image-${block.size} fullpage-note-image-${block.alignment} ${selectedImageIndex === index ? 'fullpage-note-image-selected' : ''}`}
                    onClick={(e) => {
                      // Toggle toolbar on/off when clicking image
                      e.stopPropagation();
                      setSelectedImageIndex(selectedImageIndex === index ? null : index);
                    }}
                  >
                    <img src={imageUrl} alt={block.alt} />
                    {selectedImageIndex === index && (
                      <div className="fullpage-note-image-toolbar">
                        <button
                          className="fullpage-note-image-toolbar-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlignmentChange(imageBlocksBeforeThis, block.storageId, "left");
                          }}
                          title="Align left"
                        >
                          <TextAlignLeftIcon style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                          className="fullpage-note-image-toolbar-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlignmentChange(imageBlocksBeforeThis, block.storageId, "center");
                          }}
                          title="Align center"
                        >
                          <TextAlignCenterIcon style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                          className="fullpage-note-image-toolbar-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAlignmentChange(imageBlocksBeforeThis, block.storageId, "right");
                          }}
                          title="Align right"
                        >
                          <TextAlignRightIcon style={{ width: 16, height: 16 }} />
                        </button>
                        <div className="fullpage-note-image-toolbar-divider"></div>
                        <button
                          className="fullpage-note-image-toolbar-btn fullpage-note-image-toolbar-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageToDelete({
                              storageId: block.storageId,
                              alt: block.alt,
                            });
                          }}
                          title="Delete image"
                        >
                          <Cross2Icon style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : null;
              } else {
                return (
                  <div 
                    key={index} 
                    className="note-markdown-block"
                    onClick={() => {
                      // Allow clicking markdown blocks to enter edit mode
                      setIsEditMode(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                      {block.content}
                    </ReactMarkdown>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Image size selection modal */}
      <ImageSizeModal
        isOpen={showSizeModal}
        onSelect={handleSizeSelect}
        onCancel={() => {
          setShowSizeModal(false);
          setPendingFile(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!imageToDelete}
        title="Delete Image"
        message="This will permanently delete the image from your note. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteImage}
        onCancel={() => setImageToDelete(null)}
        isDangerous={true}
      />

      {/* Warning for images in code blocks */}
      {showImageInCodeWarning && (
        <div className="fullpage-note-warning-toast">
          <div className="fullpage-note-warning-content">
            <ExclamationTriangleIcon 
              style={{ width: 18, height: 18, flexShrink: 0 }} 
            />
            <div className="fullpage-note-warning-text">
              <strong>Cannot insert image in code block</strong>
              <p>Images cannot be placed inside code blocks (```). Please move your cursor outside the code block and try again.</p>
            </div>
            <button
              className="fullpage-note-warning-close"
              onClick={() => setShowImageInCodeWarning(false)}
              title="Close"
            >
              <Cross2Icon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}

      {/* Warning for preview blocked due to images in code blocks */}
      {showPreviewBlockedWarning && (
        <div className="fullpage-note-warning-toast fullpage-note-error-toast">
          <div className="fullpage-note-warning-content">
            <ExclamationTriangleIcon 
              style={{ width: 18, height: 18, flexShrink: 0 }} 
            />
            <div className="fullpage-note-warning-text">
              <strong>Preview Mode Blocked</strong>
              <p>You have images inside code blocks (```), which causes rendering errors. Please remove or move the images outside of code blocks before entering preview mode.</p>
            </div>
            <button
              className="fullpage-note-warning-close"
              onClick={() => setShowPreviewBlockedWarning(false)}
              title="Close"
            >
              <Cross2Icon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      )}

      {/* Cursor in code block indicator */}
      {isEditMode && cursorInCodeBlock && (
        <div className="fullpage-note-code-block-indicator">
          <span className="fullpage-note-code-block-indicator-text">
            Cursor in code block - image upload disabled
          </span>
        </div>
      )}
    </div>
  );
}
