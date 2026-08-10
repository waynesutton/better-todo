import { useCallback, useEffect, useRef, useState } from "react";

// Document Picture-in-Picture API types (Chromium only, not yet in lib.dom)
interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number;
    height?: number;
  }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export interface FloatWindowOptions {
  width: number;
  height: number;
  title: string;
  name: string; // Window name used by the popup fallback
  theme: string; // data-theme value mirrored into the float window
}

// Copy every stylesheet from the main document into the float window so
// portaled React content looks identical (standard document PiP pattern)
function copyStyles(targetDoc: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      if (sheet.href) {
        const link = targetDoc.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        targetDoc.head.appendChild(link);
      } else if (sheet.cssRules) {
        const style = targetDoc.createElement("style");
        style.textContent = Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
        targetDoc.head.appendChild(style);
      }
    } catch {
      // Cross origin stylesheets cannot be read; skip them
    }
  }
}

// Opens a floating always-on-top window (Document Picture-in-Picture on
// Chromium, small popup window elsewhere) and returns a container element
// that content can be portaled into. The float window shares the main
// window's JS context, so Convex live queries keep working inside it.
export function useFloatWindow() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const windowRef = useRef<Window | null>(null);

  const close = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
    }
    windowRef.current = null;
    setContainer(null);
  }, []);

  // Toggle the float window open or closed
  const toggle = useCallback(
    async (options: FloatWindowOptions) => {
      if (windowRef.current) {
        close();
        return;
      }

      let win: Window | null = null;

      // Preferred: Document Picture-in-Picture (true always-on-top float)
      if (window.documentPictureInPicture) {
        try {
          win = await window.documentPictureInPicture.requestWindow({
            width: options.width,
            height: options.height,
          });
        } catch (err) {
          console.error("Document Picture-in-Picture failed:", err);
        }
      }

      // Fallback: small popup window for browsers without the API
      if (!win) {
        win = window.open(
          "",
          options.name,
          `popup=yes,width=${options.width},height=${options.height}`,
        );
      }

      if (!win) {
        console.error("Float window was blocked by the browser");
        return;
      }

      const doc = win.document;
      doc.title = options.title;
      doc.documentElement.setAttribute("data-theme", options.theme);
      copyStyles(doc);
      doc.body.innerHTML = ""; // Popup fallback may reuse an old window
      doc.body.className = "float-window-body";

      const root = doc.createElement("div");
      root.className = "float-window-root";
      doc.body.appendChild(root);

      // Reset state when the user closes the float window directly
      win.addEventListener("pagehide", () => {
        windowRef.current = null;
        setContainer(null);
      });

      windowRef.current = win;
      setContainer(root);
    },
    [close],
  );

  // Keep the float window theme in sync with the app theme
  const setTheme = useCallback((theme: string) => {
    windowRef.current?.document.documentElement.setAttribute(
      "data-theme",
      theme,
    );
  }, []);

  // Close the float window when the owning component unmounts
  useEffect(() => close, [close]);

  return { container, isOpen: container !== null, toggle, close, setTheme };
}
