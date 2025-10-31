import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "../context/ThemeContext";

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
    color: "#000000",
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
    color: "#000000",
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
  punctuation: { color: "#000000" },
  property: { color: "#001080" },
  tag: { color: "#0000ff" },
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
  operator: { color: "#000000" },
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

// Cursor Cloud Theme colors for syntax highlighting
const cursorCloudTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#171717",
    background: "#ededed",
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
    background: "#ededed",
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
  punctuation: { color: "#171717" },
  property: { color: "#001080" },
  tag: { color: "#0000ff" },
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
  | { type: "code"; content: string; language: string };

// Parse markdown-style code blocks from plain text
function parseContentBlocks(content: string): Array<ContentBlock> {
  const blocks: Array<ContentBlock> = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    // Add code block
    const language = match[1] || "text";
    const codeContent = match[2];
    blocks.push({ type: "code", content: codeContent, language });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  // If no code blocks found, return entire content as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: "text", content });
  }

  return blocks;
}

interface FullPageNoteViewProps {
  noteId: Id<"fullPageNotes">;
}

export function FullPageNoteView({ noteId }: FullPageNoteViewProps) {
  const { theme } = useTheme();
  const note = useQuery(api.fullPageNotes.getFullPageNote, { id: noteId });
  const updateNote = useMutation(api.fullPageNotes.updateFullPageNote);

  const [contentInput, setContentInput] = useState(note?.content || "");
  const [isEditMode, setIsEditMode] = useState(false);
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null);
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef(false);
  const cursorPositionRef = useRef<number | null>(null);
  const [textareaHeight, setTextareaHeight] = useState<number>(400);
  const isResizingRef = useRef(false);
  const codeBlockRefs = useRef<Map<number, HTMLPreElement>>(new Map());
  const codeBlockWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Update local state when note prop changes
  useEffect(() => {
    if (note && !isTypingRef.current && !isEditMode) {
      setContentInput(note.content);
    }
  }, [note?.content, isEditMode]);

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

  const handleCopyCodeBlock = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedBlockIndex(index);
      setTimeout(() => setCopiedBlockIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy code block:", err);
    }
  };

  const handleContentChange = (value: string) => {
    // Mark that user is actively typing
    isTypingRef.current = true;

    // Save cursor position before updating
    if (textareaRef.current) {
      cursorPositionRef.current = textareaRef.current.selectionStart;
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
    // Clear timeout and save immediately on blur
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }
    // Mark typing as done
    isTypingRef.current = false;
    updateNote({ id: noteId, content: contentInput });
    // Exit edit mode after saving
    setTimeout(() => {
      setIsEditMode(false);
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
      const newHeight = Math.max(200, startHeight + deltaY);
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contentTimeoutRef.current) {
        clearTimeout(contentTimeoutRef.current);
      }
    };
  }, []);

  // Restore cursor position after updates to prevent jumping
  useEffect(() => {
    if (
      isEditMode &&
      textareaRef.current &&
      cursorPositionRef.current !== null &&
      isTypingRef.current
    ) {
      const position = cursorPositionRef.current;
      textareaRef.current.setSelectionRange(position, position);
    }
  }, [contentInput, isEditMode]);

  // Post-process CSS code blocks to add color swatches next to hex codes
  useEffect(() => {
    if (isEditMode) return;

    const processCodeBlock = (codeElement: HTMLPreElement, index: number) => {
      const blocks = parseContentBlocks(contentInput);
      const block = blocks[index];
      if (!block || block.type !== "code" || block.language !== "css") {
        return;
      }

      // Skip if already processed
      if (codeElement.querySelector(".hex-color-swatch")) {
        return;
      }

      // Process all text nodes recursively
      const processNode = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          const textNode = node as Text;
          const text = textNode.textContent || "";
          const hexPattern = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g;
          const matches = Array.from(text.matchAll(hexPattern));

          if (matches.length > 0 && textNode.parentNode) {
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            matches.forEach((match) => {
              const hexCode = match[0];
              const matchIndex = match.index!;

              // Add text before match
              if (matchIndex > lastIndex) {
                fragment.appendChild(
                  document.createTextNode(text.slice(lastIndex, matchIndex)),
                );
              }

              // Create wrapper with hex code and swatch
              const wrapper = document.createElement("span");
              wrapper.className = "hex-color-wrapper";
              wrapper.style.display = "inline-block";

              wrapper.appendChild(document.createTextNode(hexCode));

              const swatch = document.createElement("span");
              swatch.className = "hex-color-swatch";
              swatch.style.cssText = `
                display: inline-block;
                width: 12px;
                height: 12px;
                margin-left: 4px;
                vertical-align: middle;
                border: 1px solid var(--border-color);
                border-radius: 2px;
                background-color: ${normalizeHexColor(hexCode)};
              `;
              swatch.setAttribute("data-hex", hexCode);
              wrapper.appendChild(swatch);

              fragment.appendChild(wrapper);
              lastIndex = matchIndex + hexCode.length;
            });

            // Add remaining text
            if (lastIndex < text.length) {
              fragment.appendChild(
                document.createTextNode(text.slice(lastIndex)),
              );
            }

            // Replace text node with fragment
            textNode.parentNode.replaceChild(fragment, textNode);
          }
        } else {
          // Process child nodes
          const childNodes = Array.from(node.childNodes);
          childNodes.forEach(processNode);
        }
      };

      processNode(codeElement);
    };

    // Process all code blocks after a short delay to ensure rendering is complete
    const timeoutId = setTimeout(() => {
      // Try to find pre elements from wrapper refs first
      codeBlockWrapperRefs.current.forEach((wrapper, index) => {
        const preElement = wrapper.querySelector("pre");
        if (preElement) {
          codeBlockRefs.current.set(index, preElement);
        }
      });

      // Process all code blocks
      codeBlockRefs.current.forEach((codeElement, index) => {
        processCodeBlock(codeElement, index);
      });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [contentInput, isEditMode]);

  if (!note) {
    return (
      <div className="fullpage-note-view">
        <div style={{ padding: "24px", textAlign: "center" }}>
          Loading note...
        </div>
      </div>
    );
  }

  return (
    <div className="fullpage-note-view">
      <div className="fullpage-note-content-wrapper">
        {isEditMode ? (
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
          <div
            className="fullpage-note-display-mode"
            onClick={() => {
              setIsEditMode(true);
              // Focus the textarea after a brief delay to ensure it's rendered
              setTimeout(() => {
                textareaRef.current?.focus();
              }, 50);
            }}
          >
            {contentInput ? (
              parseContentBlocks(contentInput).map((block, index) => (
                <div key={index} className="note-content-block">
                  {block.type === "text" ? (
                    <div className="note-markdown-block">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div
                      className="note-code-block-wrapper"
                      ref={(el) => {
                        if (el) {
                          codeBlockWrapperRefs.current.set(index, el);
                        } else {
                          codeBlockWrapperRefs.current.delete(index);
                        }
                      }}
                    >
                      <div className="note-code-block-header">
                        <span className="note-code-language">
                          {block.language}
                        </span>
                        <button
                          className="note-code-copy-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCodeBlock(block.content, index);
                          }}
                          title="Copy code"
                        >
                          {copiedBlockIndex === index ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={block.language}
                        style={
                          theme === "dark"
                            ? cursorDarkTheme
                            : theme === "light"
                              ? cursorLightTheme
                              : theme === "tan"
                                ? cursorLightTheme
                                : theme === "cloud"
                                  ? cursorCloudTheme
                                  : cursorDarkTheme
                        }
                        customStyle={{
                          margin: 0,
                          borderRadius: "0 0 4px 4px",
                          fontSize: "13px",
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                      >
                        {block.content}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="fullpage-note-empty-state">
                Click to start writing...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
