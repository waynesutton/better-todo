import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light" | "tan";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial theme immediately before React renders
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "tan";
  } catch {
    return "tan";
  }
};

// Apply theme immediately to prevent flash
const initialTheme = getInitialTheme();
document.documentElement.setAttribute("data-theme", initialTheme);

// Update meta theme-color tag
const updateMetaThemeColor = (theme: Theme) => {
  const colors = {
    dark: "#2e3842",
    light: "#ffffff",
    tan: "#faf8f5",
  };
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", colors[theme]);
  }
};

// Apply initial meta theme color
updateMetaThemeColor(initialTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    // Apply theme to document and update meta tag
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    updateMetaThemeColor(theme);
  }, [theme]);

  const toggleTheme = () => {
    // Three-way rotation: dark → light → tan → dark
    setTheme((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "tan";
      return "dark";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
