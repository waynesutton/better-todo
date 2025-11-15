import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useTheme } from "../context/ThemeContext";
import {
  AlertCircle,
  FileText,
  Sun,
  Moon,
  Cloud,
  Copy,
  Check,
} from "lucide-react";
import { Half2Icon } from "@radix-ui/react-icons";
import { Id } from "../../convex/_generated/dataModel";

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

// Content block types for parsing
type ContentBlock =
  | { type: "text"; content: string }
  | { type: "code"; language: string; content: string }
  | {
      type: "image";
      storageId: Id<"_storage">;
      size: string;
      alignment: string;
      alt: string;
    };

// Parse content blocks (code and images) from plain text
function parseContentBlocks(content: string): Array<ContentBlock> {
  const blocks: Array<ContentBlock> = [];

  // Find all code block positions to exclude them from image matching
  const codeBlockPositions: Array<{ start: number; end: number }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let codeMatch;

  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    codeBlockPositions.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
    });
  }

  // Check if a position is inside a code block
  const isInsideCodeBlock = (pos: number): boolean => {
    return codeBlockPositions.some(
      (block) => pos >= block.start && pos < block.end,
    );
  };

  // Parse all blocks in order
  const combinedRegex =
    /(```(\w+)?\n([\s\S]*?)```|!\[(.*?)\]\((.*?)\|(\w+)(?:\|(\w+))?\))/g;
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

    // Check if this is a code block
    if (match[1].startsWith("```")) {
      const language = match[2] || "plaintext";
      const code = match[3] || "";
      blocks.push({ type: "code", language, content: code });
    }
    // Check if this is an image (and NOT inside a code block)
    else if (match[4] !== undefined && !isInsideCodeBlock(match.index)) {
      const alt = match[4];
      const storageId = match[5] as Id<"_storage">;
      const size = match[6] || "medium";
      const alignment = match[7] || "left";
      blocks.push({ type: "image", storageId, size, alignment, alt });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      blocks.push({ type: "text", content: textContent });
    }
  }

  return blocks;
}

export function SharedNoteView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  // Single query that loads note with image URLs - no waterfall!
  const note = useQuery(
    api.fullPageNotes.getNoteBySlug,
    slug ? { slug } : "skip",
  );

  // Parse content blocks from note content
  const contentBlocks = useMemo(() => {
    if (!note?.content) return [];
    return parseContentBlocks(note.content);
  }, [note?.content]);

  // Map image URLs from the query result
  const imageUrlMap = useMemo(() => {
    if (!note?.imageUrls) return new Map();
    return new Map(note.imageUrls.map((img) => [img.storageId, img.url]));
  }, [note?.imageUrls]);

  // Copy note content to clipboard
  const handleCopyContent = async () => {
    if (!note?.content) return;

    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Set page title and Open Graph meta tags when note loads
  useEffect(() => {
    if (note) {
      const title = `${note.title || "Untitled"} - better todo`;
      document.title = title;

      // Get first image URL if available
      const firstImageUrl =
        note.imageUrls && note.imageUrls.length > 0
          ? note.imageUrls[0].url
          : "https://better-todo.co/better-todo-open-graph-image.png";

      // Create short description from content (first 160 chars)
      const contentPreview = note.content.substring(0, 160).replace(/\n/g, " ");

      // Update or create meta tags
      const updateMetaTag = (property: string, content: string) => {
        let element = document.querySelector(
          `meta[property="${property}"]`,
        ) as HTMLMetaElement;
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute("property", property);
          document.head.appendChild(element);
        }
        element.content = content;
      };

      const updateMetaName = (name: string, content: string) => {
        let element = document.querySelector(
          `meta[name="${name}"]`,
        ) as HTMLMetaElement;
        if (!element) {
          element = document.createElement("meta");
          element.setAttribute("name", name);
          document.head.appendChild(element);
        }
        element.content = content;
      };

      // Open Graph tags
      updateMetaTag("og:title", title);
      updateMetaTag("og:description", contentPreview);
      updateMetaTag("og:image", firstImageUrl);
      updateMetaTag("og:url", `https://better-todo.co/share/${note.shareSlug}`);
      updateMetaTag("og:type", "article");
      updateMetaTag("og:site_name", "better todo");

      // Twitter Card tags
      updateMetaName("twitter:card", "summary_large_image");
      updateMetaName("twitter:site", "@waynesutton");
      updateMetaName("twitter:creator", "@waynesutton");
      updateMetaName("twitter:title", title);
      updateMetaName("twitter:description", contentPreview);
      updateMetaName("twitter:image", firstImageUrl);

      // Basic meta description
      updateMetaName("description", contentPreview);
    }
    return () => {
      document.title = "better todo";
      // Remove meta tags when component unmounts
      const metaTags = document.querySelectorAll(
        'meta[property^="og:"], meta[name^="twitter:"]',
      );
      metaTags.forEach((tag) => tag.remove());
    };
  }, [note]);

  // Handle invalid slug
  if (!slug) {
    return (
      <div className="shared-note-error">
        <AlertCircle size={48} />
        <h1>Invalid Link</h1>
        <p>This share link is not valid.</p>
        <button
          onClick={() => navigate("/")}
          className="shared-note-home-button"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Handle note not found (query returned null)
  if (note === null) {
    return (
      <div className="shared-note-error">
        <AlertCircle size={48} />
        <h1>Note Not Found</h1>
        <p>This note no longer exists or is no longer shared.</p>
        <button
          onClick={() => navigate("/")}
          className="shared-note-home-button"
        >
          Go to Home
        </button>
      </div>
    );
  }

  // Show page immediately - Convex will fill in content reactively
  const isLoading = note === undefined;
  const displayTitle = note?.title || (isLoading ? "..." : "Untitled");
  const shouldHideHeader = note?.hideHeaderOnShare ?? false;

  return (
    <div className="shared-note-view">
      {/* Note title - conditionally shown based on hideHeaderOnShare setting */}
      {!shouldHideHeader && (
        <div className="shared-note-header">
          <h1 className="shared-note-title">{displayTitle}</h1>
        </div>
      )}

      {/* Note content with custom rendering */}
      <div className="shared-note-content">
        {isLoading ? (
          <div className="shared-note-text">
            <p style={{ opacity: 0.5 }}>Loading content...</p>
          </div>
        ) : (
          contentBlocks.map((block, index) => {
            if (block.type === "code") {
              const syntaxTheme =
                theme === "light" || theme === "tan" || theme === "cloud"
                  ? cursorLightTheme
                  : cursorDarkTheme;

              return (
                <div key={index} className="note-code-block-wrapper">
                  <SyntaxHighlighter
                    language={block.language}
                    style={syntaxTheme}
                    showLineNumbers={true}
                    customStyle={{
                      margin: "8px 0",
                      borderRadius: "4px",
                      fontSize: "13px",
                    }}
                    PreTag="div"
                  >
                    {block.content}
                  </SyntaxHighlighter>
                </div>
              );
            } else if (block.type === "image") {
              const imageUrl = imageUrlMap.get(block.storageId);

              return imageUrl ? (
                <div
                  key={index}
                  className={`shared-note-image shared-note-image-${block.size} shared-note-image-${block.alignment}`}
                >
                  <img src={imageUrl} alt={block.alt} />
                </div>
              ) : null;
            } else {
              // Render text blocks with ReactMarkdown to handle any markdown formatting
              return (
                <div key={index} className="shared-note-text">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      // Handle inline code
                      code(props) {
                        const { node, inline, className, children, ...rest } =
                          props as any;
                        return inline ? (
                          <code className={className} {...rest}>
                            {children}
                          </code>
                        ) : null; // Block code is handled separately
                      },
                    }}
                  >
                    {block.content}
                  </ReactMarkdown>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Footer with read-only message and theme switcher */}
      <div className="shared-note-footer">
        <div className="shared-note-footer-left">
          <FileText size={14} />
          <span>
            You are viewing a shared note (read-only) from{" "}
            <a
              href="https://better-todo.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="shared-note-footer-link"
            >
              better-todo
            </a>
          </span>
        </div>
        <div className="shared-note-footer-right">
          <button
            onClick={handleCopyContent}
            className="shared-note-theme-toggle"
            title={copied ? "Copied!" : "Copy note content"}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={toggleTheme}
            className="shared-note-theme-toggle"
            title={`Switch to ${theme === "dark" ? "light" : theme === "light" ? "tan" : theme === "tan" ? "cloud" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun size={16} />
            ) : theme === "light" ? (
              <Cloud size={16} />
            ) : theme === "tan" ? (
              <Half2Icon style={{ width: 16, height: 16 }} />
            ) : (
              <Moon size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
