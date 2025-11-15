import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Link2, AlertCircle, ExternalLink } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ShareLinkModalProps {
  noteId: Id<"fullPageNotes">;
  currentShareSlug?: string;
  isShared?: boolean;
  hideHeaderOnShare?: boolean;
  onClose: () => void;
}

export function ShareLinkModal({
  noteId,
  currentShareSlug,
  isShared,
  hideHeaderOnShare,
  onClose,
}: ShareLinkModalProps) {
  const [customSlug, setCustomSlug] = useState(currentShareSlug || "");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [slugCheckTimeout, setSlugCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [hideHeader, setHideHeader] = useState(hideHeaderOnShare || false);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateShareLink = useMutation(api.fullPageNotes.generateShareLink);
  const revokeShareLink = useMutation(api.fullPageNotes.revokeShareLink);
  const updateShareSlug = useMutation(api.fullPageNotes.updateShareSlug);
  const updateHideHeader = useMutation(api.fullPageNotes.updateHideHeader);
  const checkSlugAvailability = useQuery(
    api.fullPageNotes.checkSlugAvailability,
    customSlug.length >= 3 ? { slug: customSlug } : "skip"
  );

  useEffect(() => {
    // Update slug availability when query returns
    if (checkSlugAvailability !== undefined) {
      setIsSlugAvailable(checkSlugAvailability);
    }
  }, [checkSlugAvailability]);

  useEffect(() => {
    // Generate initial share URL if already shared
    if (isShared && currentShareSlug) {
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${currentShareSlug}`);
    }
  }, [isShared, currentShareSlug]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const result = await generateShareLink({
        noteId,
        customSlug: customSlug.trim() || undefined,
        hideHeaderOnShare: hideHeader,
      });
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${result.slug}`);
      setCustomSlug(result.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdate = async () => {
    if (!customSlug.trim()) {
      setError("Please enter a custom slug");
      return;
    }
    setIsGenerating(true);
    setError("");
    try {
      const result = await updateShareSlug({
        noteId,
        newSlug: customSlug.trim(),
      });
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${result.slug}`);
      setCustomSlug(result.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async () => {
    setIsGenerating(true);
    setError("");
    try {
      await revokeShareLink({ noteId });
      setShareUrl("");
      setCustomSlug("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenLink = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleToggleHideHeader = async (checked: boolean) => {
    setHideHeader(checked);
    try {
      await updateHideHeader({
        noteId,
        hideHeaderOnShare: checked,
      });
    } catch (err) {
      console.error("Failed to update hide header setting:", err);
      // Revert on error
      setHideHeader(!checked);
    }
  };

  const handleSlugInput = (value: string) => {
    setCustomSlug(value);
    setError("");
    
    // Clear previous timeout
    if (slugCheckTimeout) {
      clearTimeout(slugCheckTimeout);
    }
    
    // Reset availability check
    setIsSlugAvailable(null);
    
    // Debounce slug availability check (300ms)
    if (value.length >= 3) {
      const timeout = setTimeout(() => {
        // Query will trigger automatically via useQuery
      }, 300);
      setSlugCheckTimeout(timeout);
    }
  };

  // Validate slug format
  const isValidFormat = (slug: string): boolean => {
    const slugRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return slugRegex.test(slug);
  };

  const showAvailabilityIndicator = customSlug.length >= 3 && isValidFormat(customSlug);

  return createPortal(
    <div className="share-link-modal-overlay" onClick={onClose}>
      <div className="share-link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-link-modal-header">
          <div className="share-link-modal-title">
            <Link2 size={18} />
            <span>Share Note</span>
          </div>
          <button
            className="share-link-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="share-link-modal-content">
          {!isShared ? (
            <>
              <p className="share-link-modal-description">
                Create a shareable link for this note. Anyone with the link can
                view it.
              </p>

              <div className="share-link-modal-input-group">
                <label htmlFor="custom-slug">Custom slug (optional)</label>
                <div className="share-link-modal-input-wrapper">
                  <input
                    ref={inputRef}
                    id="custom-slug"
                    type="text"
                    className="share-link-modal-input"
                    placeholder="my-awesome-note"
                    value={customSlug}
                    onChange={(e) => handleSlugInput(e.target.value)}
                    disabled={isGenerating}
                  />
                  {showAvailabilityIndicator && (
                    <div className="share-link-slug-indicator">
                      {isSlugAvailable === true && (
                        <Check size={16} className="slug-available" />
                      )}
                      {isSlugAvailable === false && (
                        <AlertCircle size={16} className="slug-unavailable" />
                      )}
                    </div>
                  )}
                </div>
                <span className="share-link-modal-hint">
                  3-50 characters (letters, numbers, hyphens, underscores)
                </span>
              </div>

              <div className="share-link-modal-checkbox-group">
                <label className="share-link-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={hideHeader}
                    onChange={(e) => setHideHeader(e.target.checked)}
                    disabled={isGenerating}
                  />
                  <span>Hide title on shared note</span>
                </label>
              </div>

              {error && (
                <div className="share-link-modal-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                className="share-link-modal-button primary"
                onClick={handleGenerate}
                disabled={isGenerating || (customSlug.length > 0 && !isValidFormat(customSlug))}
              >
                {isGenerating ? "Generating..." : "Generate Link"}
              </button>
            </>
          ) : (
            <>
              <p className="share-link-modal-description">
                This note is currently shared. Anyone with the link can view it.
              </p>

              <div className="share-link-modal-url-group">
                <label>Share URL</label>
                <div className="share-link-modal-url-wrapper">
                  <input
                    type="text"
                    className="share-link-modal-url-input"
                    value={shareUrl}
                    readOnly
                  />
                  <button
                    className="share-link-modal-copy-button"
                    onClick={handleCopyLink}
                    title="Copy link"
                  >
                    {copied ? (
                      <Check size={16} className="copied" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    className="share-link-modal-copy-button"
                    onClick={handleOpenLink}
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              <div className="share-link-modal-input-group">
                <label htmlFor="update-slug">Update custom slug</label>
                <div className="share-link-modal-input-wrapper">
                  <input
                    id="update-slug"
                    type="text"
                    className="share-link-modal-input"
                    placeholder="my-awesome-note"
                    value={customSlug}
                    onChange={(e) => handleSlugInput(e.target.value)}
                    disabled={isGenerating}
                  />
                  {showAvailabilityIndicator && customSlug !== currentShareSlug && (
                    <div className="share-link-slug-indicator">
                      {isSlugAvailable === true && (
                        <Check size={16} className="slug-available" />
                      )}
                      {isSlugAvailable === false && (
                        <AlertCircle size={16} className="slug-unavailable" />
                      )}
                    </div>
                  )}
                </div>
                <span className="share-link-modal-hint">
                  3-50 characters (letters, numbers, hyphens, underscores)
                </span>
              </div>

              <div className="share-link-modal-checkbox-group">
                <label className="share-link-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={hideHeader}
                    onChange={(e) => handleToggleHideHeader(e.target.checked)}
                    disabled={isGenerating}
                  />
                  <span>Hide title on shared note</span>
                </label>
              </div>

              {error && (
                <div className="share-link-modal-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <div className="share-link-modal-actions">
                <button
                  className="share-link-modal-button primary"
                  onClick={handleUpdate}
                  disabled={
                    isGenerating ||
                    !customSlug.trim() ||
                    !isValidFormat(customSlug) ||
                    customSlug === currentShareSlug
                  }
                >
                  {isGenerating ? "Updating..." : "Update Link"}
                </button>
                <button
                  className="share-link-modal-button dangerous"
                  onClick={handleRevoke}
                  disabled={isGenerating}
                >
                  Revoke Sharing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

