import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ImageSizeModalProps {
  isOpen: boolean;
  onSelect: (size: "small" | "medium" | "large") => void;
  onCancel: () => void;
}

export function ImageSizeModal({
  isOpen,
  onSelect,
  onCancel,
}: ImageSizeModalProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "1") {
        e.preventDefault();
        onSelect("small");
      } else if (e.key === "2") {
        e.preventDefault();
        onSelect("medium");
      } else if (e.key === "3") {
        e.preventDefault();
        onSelect("large");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onSelect, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div className="image-size-modal-overlay" onClick={onCancel} />

      {/* Modal */}
      <div className="image-size-modal">
        <div className="image-size-modal-header">
          <h3 className="image-size-modal-title">Choose Image Size</h3>
        </div>
        <div className="image-size-modal-body">
          <button
            className="image-size-option"
            onClick={() => onSelect("small")}
          >
            <div className="image-size-preview small-preview"></div>
            <div className="image-size-info">
              <span className="image-size-name">Small</span>
              <span className="image-size-description">300px - Best for inline content</span>
            </div>
            <span className="image-size-shortcut">Press 1</span>
          </button>
          <button
            className="image-size-option"
            onClick={() => onSelect("medium")}
          >
            <div className="image-size-preview medium-preview"></div>
            <div className="image-size-info">
              <span className="image-size-name">Medium</span>
              <span className="image-size-description">600px - Featured image size</span>
            </div>
            <span className="image-size-shortcut">Press 2</span>
          </button>
          <button
            className="image-size-option"
            onClick={() => onSelect("large")}
          >
            <div className="image-size-preview large-preview"></div>
            <div className="image-size-info">
              <span className="image-size-name">Large</span>
              <span className="image-size-description">900px - Full-width display</span>
            </div>
            <span className="image-size-shortcut">Press 3</span>
          </button>
        </div>
        <div className="image-size-modal-footer">
          <button
            className="image-size-modal-button cancel"
            onClick={onCancel}
          >
            Cancel (ESC)
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

