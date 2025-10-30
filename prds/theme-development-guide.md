# Theme Development Guide

## Overview

This guide provides a comprehensive framework for creating and implementing new themes in the application. It covers the complete process from design to implementation, ensuring consistency and maintainability across all components including full-page notes, launch page, changelog page, and all UI elements.

## Theme System Architecture

### Core Theme Files

The theme system is implemented across these key files:

1. **`src/context/ThemeContext.tsx`**: Theme state management and persistence
2. **`src/styles/global.css`**: CSS variable definitions and theme-specific overrides
3. **`src/components/Sidebar.tsx`**: Theme switcher UI with icons
4. **`src/components/FullPageNoteView.tsx`**: Syntax highlighting theme selection
5. **`src/components/NotesSection.tsx`**: Syntax highlighting theme selection
6. **`src/App.tsx`**: Clerk appearance customization based on theme

## Theme Color Reference

Quick reference for all three themes and their key colors:

| Color Type               | Dark Mode             | Light Mode           | Tan Mode              |
| ------------------------ | --------------------- | -------------------- | --------------------- |
| **Interactive Accent**   | #27A561 (Green)       | #0076C6 (Blue)       | #EB5601 (Orange)      |
| **General Accent**       | #4a9eff (Blue)        | #007aff (Blue)       | #8b7355 (Warm Brown)  |
| **Primary Background**   | #2e3842 (Dark Gray)   | #ffffff (White)      | #faf8f5 (Warm Tan)    |
| **Secondary Background** | #252a32 (Darker Gray) | #fafafa (Light Gray) | #f5f3f0 (Tan)         |
| **Hover Background**     | #2d404b (Blue-Gray)   | #e9f2f8 (Light Blue) | #ebe9e6 (Light Tan)   |
| **Text Primary**         | #ffffff (White)       | #000000 (Black)      | #1a1a1a (Soft Black)  |
| **Text Secondary**       | #b8bcc2 (Light Gray)  | #666666 (Gray)       | #6b6b6b (Warm Gray)   |
| **Border Color**         | #3a4350 (Gray)        | #d1d1d6 (Light Gray) | #e6e4e1 (Tan)         |
| **Checkbox Background**  | #1a1f26 (Dark)        | #fafafa (Light)      | #f5f3f0 (Tan)         |
| **Archive Background**   | #1f252d (Dark)        | #fafafa (Light)      | #f5f3f0 (Tan)         |
| **Mobile Add Button**    | #27a561 (Green)       | #0076c6 (Blue)       | #eb5601 (Orange)      |
| **Mobile Add Hover**     | #229350 (Dark Green)  | #0065ad (Dark Blue)  | #d14a01 (Dark Orange) |

### Interactive Element Colors

Elements using the interactive accent color in each theme:

**Core Interactive States:**

- ✅ Checked checkboxes (background and border)
- ✅ Active date states (sidebar)
- ✅ Collapsed sidebar date active states
- ✅ Focused checkbox borders (including hover states)
- ✅ Menu hover states
- ✅ Menu button base color (some themes)

**Buttons and Actions:**

- ✅ Primary buttons
- ✅ Confirm dialog buttons
- ✅ Feature showcase buttons
- ✅ Date picker buttons
- ✅ Date picker cancel buttons
- ✅ Add folder save buttons
- ✅ Clerk authentication buttons

**UI Components:**

- ✅ Font size option active state
- ✅ Search highlights
- ✅ Active full-page note in sidebar (`.notes-folder-item.active`)
- ✅ Date hover backgrounds (some themes use interactive accent)
- ✅ Date menu button hover states

**Additional Styling:**

- ✅ Code block backgrounds (when they differ from primary background)

## Complete Theme Implementation Locations

### 1. CSS Variables (`src/styles/global.css`)

**Location**: Lines 2-63 (approximately)

Each theme requires a complete CSS variable block:

```css
:root[data-theme="theme-name"] {
  /* Core Colors */
  --bg-primary: #color;
  --bg-secondary: #color;
  --bg-hover: #color;
  --text-primary: #color;
  --text-secondary: #color;
  --border-color: #color;
  --accent: #color;
  --checkbox-bg: #color;
  --archive-bg: #color;
  --mobile-add-button-bg: #color;
  --mobile-add-button-hover: #color;

  /* Font sizes */
  --font-app-name: 14px;
  --font-sidebar: 13px;
  --font-todo: 14px;
  --font-archive: 13px;
  --font-header-date: 14px;
}
```

### 2. Clerk Component Overrides (`src/styles/global.css`)

**Location**: After CSS variables, around lines 82-290

Three sections required for each theme:

- Clerk UserProfile overrides
- Clerk SignIn/SignUp overrides
- Clerk form inputs and buttons

Pattern:

```css
:root[data-theme="theme-name"] .cl-card,
:root[data-theme="theme-name"] .cl-userProfile-card {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}
```

### 3. Interactive Accent Color Overrides (`src/styles/global.css`)

**Location**: Throughout the CSS file

These elements use hardcoded interactive accent colors that need theme-specific overrides:

**Core Interactive Elements:**

- `.todo-checkbox.checked` - uses interactive accent
- `.date-item-container.active` - uses interactive accent
- `.date-item-collapsed.active` - uses interactive accent (collapsed sidebar dates)
- `.confirm-dialog-button-confirm.dangerous` - uses interactive accent
- Focus states on checkboxes (`.todo-item-wrapper.focused .todo-checkbox`, `.todo-item.focused .todo-checkbox`, `.todo-checkbox:hover`)
- Active sidebar date items

**Hover and Interactive States:**

- `.date-item-container:hover:not(.active)` - date hover background
- `.date-menu-button:hover` - date menu button hover background
- `.menu-button` - menu button base color
- `.todo-item:hover .menu-button:hover` - menu button hover state (uses interactive accent)
- `.date-picker-button` - date picker button background
- `.date-picker-button.cancel` - date picker cancel button background

**Additional UI Elements:**

- `.font-size-option.active` - font size selector active state
- `.notes-folder-item.active` - active full-page note in sidebar
- Code block backgrounds (`.note-code-block-wrapper pre`, `.note-code-block-wrapper code`)

**Pattern for adding overrides:**

```css
/* Theme mode specific override */
:root[data-theme="theme-name"] .selector {
  property: #interactive-accent-color;
}
```

### 4. Theme Context (`src/context/ThemeContext.tsx`)

**Changes Required**:

1. **Type Definition** (line 3):

```typescript
type Theme = "dark" | "light" | "tan" | "new-theme";
```

2. **Initial Theme** (line 16):

```typescript
return (saved as Theme) || "tan"; // Default theme
```

3. **Meta Theme Color** (lines 28-32):

```typescript
const colors = {
  dark: "#2e3842",
  light: "#ffffff",
  tan: "#faf8f5",
  "new-theme": "#your-color", // Add meta theme color
};
```

4. **Toggle Function** (lines 54-58):

```typescript
setTheme((prev) => {
  if (prev === "dark") return "light";
  if (prev === "light") return "tan";
  if (prev === "tan") return "new-theme";
  return "dark";
});
```

### 5. Sidebar Theme Switcher (`src/components/Sidebar.tsx`)

**Changes Required**:

1. **Import Icon** (lines 12-14):

```typescript
import {
  Moon,
  Sun,
  Cloud,
  NewIcon, // Add new icon import
} from "lucide-react";
```

2. **Theme Icon Display** (lines 1998-2004):

```typescript
{theme === "dark" ? (
  <Sun size={16} />
) : theme === "light" ? (
  <Cloud size={16} />
) : theme === "tan" ? (
  <NewIcon size={16} /> // Add new theme icon
) : (
  <Moon size={16} />
)}
```

3. **Tooltip Text** (line 2008):

```typescript
{
  `Switch to ${theme === "dark" ? "light" : theme === "light" ? "tan" : theme === "tan" ? "new-theme" : "dark"} mode`;
}
```

### 6. Syntax Highlighting Themes

**Two locations require updates**:

#### A. FullPageNoteView.tsx (lines 10-151)

Create a new theme object:

```typescript
const cursorNewTheme: { [key: string]: React.CSSProperties } = {
  'code[class*="language-"]': {
    color: "#color",
    background: "#color",
    // ... copy structure from cursorDarkTheme or cursorLightTheme
  },
  // ... rest of syntax highlighting colors
};
```

Update usage (line 436):

```typescript
style={
  theme === "dark" ? cursorDarkTheme
  : theme === "light" ? cursorLightTheme
  : theme === "tan" ? cursorNewTheme // Add new theme
  : cursorDarkTheme // default fallback
}
```

#### B. NotesSection.tsx (lines 19-160)

Same pattern as FullPageNoteView.tsx:

- Create `cursorNewTheme` object
- Update ternary condition around line 612

### 7. App.tsx Clerk Appearance (`src/App.tsx`)

**Location**: Lines 653-660

Update Clerk appearance customization:

```typescript
const clerkAppearance = {
  variables: {
    colorPrimary:
      theme === "dark"
        ? "#ffffff"
        : theme === "light"
          ? "#000000"
          : theme === "tan"
            ? "#1a1a1a"
            : "#your-color", // Add new theme color
    colorBackground:
      theme === "dark"
        ? "#2E3842"
        : theme === "light"
          ? "#ffffff"
          : theme === "tan"
            ? "#faf8f5"
            : "#your-bg-color", // Add new theme background
    colorText:
      theme === "dark"
        ? "#ffffff"
        : theme === "light"
          ? "#000000"
          : theme === "tan"
            ? "#1a1a1a"
            : "#your-text-color", // Add new theme text color
    borderRadius: "4px",
  },
};
```

### 8. Conditional Image Assets (`src/components/Sidebar.tsx`)

**Location**: Lines 1943, 1967, 2046

Update conditional image paths:

```typescript
// User icon (line 1943)
theme === "dark"
  ? "/user-light.svg"
  : theme === "light"
    ? "/user-dark.svg"
    : theme === "tan"
      ? "/user-dark.svg" // Decide based on theme
      : "/user-dark.svg"; // Default for new theme

// Convex logo (line 2046)
theme === "dark"
  ? "/convex-white.svg"
  : theme === "light"
    ? "/convex-black.svg"
    : theme === "tan"
      ? "/convex-black.svg"
      : "/convex-black.svg"; // Default for new theme
```

## Step-by-Step: Adding a New Theme

### Step 1: Choose Theme Name and Colors

Decide on:

- Theme name (e.g., "ocean", "forest", "purple")
- Color palette (see color reference above)
- Interactive accent color
- General accent color

### Step 2: Update ThemeContext.tsx

1. Add theme name to `Theme` type union
2. Add meta theme color to `colors` object
3. Update `toggleTheme` function to include new theme in rotation

### Step 3: Add CSS Variables

In `src/styles/global.css`:

1. Add `:root[data-theme="new-theme"]` block with all CSS variables
2. Copy Clerk overrides section for new theme
3. Add component-specific overrides using interactive accent color:
   - `.todo-checkbox.checked`
   - `.date-item-container.active`
   - `.date-item-collapsed.active`
   - Focused checkbox states (`.todo-item-wrapper.focused .todo-checkbox`, `.todo-checkbox:hover`)
   - `.date-menu-button:hover`
   - `.menu-button` (if needed)
   - `.todo-item:hover .menu-button:hover`
   - `.date-picker-button` and `.date-picker-button.cancel`
   - `.font-size-option.active`
   - `.notes-folder-item.active`
   - Code block backgrounds if different from primary
   - Date hover states if using interactive accent

### Step 4: Update Sidebar Theme Switcher

1. Import new icon from lucide-react
2. Add conditional to icon display logic
3. Update tooltip text

### Step 5: Add Syntax Highlighting Theme

1. Create new theme object in `FullPageNoteView.tsx`
2. Create new theme object in `NotesSection.tsx`
3. Update ternary conditions in both files

### Step 6: Update App.tsx

1. Add new theme colors to Clerk appearance customization

### Step 7: Update Conditional Assets

1. Determine which images to use for new theme
2. Update conditional image paths in Sidebar.tsx

### Step 8: Test Thoroughly

- [ ] Theme switches correctly
- [ ] All components use correct colors
- [ ] Syntax highlighting works in notes
- [ ] Clerk modals match theme
- [ ] Interactive elements use correct accent colors
- [ ] Focus states are visible
- [ ] Hover states work correctly
- [ ] Mobile responsive design works
- [ ] Full-page notes display correctly
- [ ] Launch page displays correctly
- [ ] Changelog page displays correctly

## Theme Icon Selection

### Current Icons

- **Dark Mode**: `Moon` from lucide-react
- **Light Mode**: `Sun` from lucide-react
- **Tan Mode**: `Cloud` from lucide-react

### Choosing an Icon

1. Browse [Lucide Icons](https://lucide.dev)
2. Choose an icon that represents your theme concept
3. Import it in `Sidebar.tsx`:
   ```typescript
   import { Moon, Sun, Cloud, YourIcon } from "lucide-react";
   ```
4. Add it to the conditional rendering:
   ```typescript
   {theme === "dark" ? (
     <Sun size={16} />
   ) : theme === "light" ? (
     <Cloud size={16} />
   ) : theme === "tan" ? (
     <YourIcon size={16} />
   ) : (
     <Moon size={16} />
   )}
   ```

### Icon Suggestions by Theme Type

- **Ocean/Blue**: `Waves`, `Droplet`, `Fish`
- **Forest/Green**: `Trees`, `Leaf`, `Flower`
- **Purple**: `Sparkles`, `Stars`, `Gem`
- **High Contrast**: `Circle`, `Square`, `Hexagon`
- **Night**: `Star`, `Moon`, `Compass`

## Cursor Prompt Template

Use this prompt template when adding a new theme:

```
Add a new theme called "[THEME_NAME]" to the application with the following color palette:

**Theme Colors:**
- Primary Background: #[BG_PRIMARY]
- Secondary Background: #[BG_SECONDARY]
- Hover Background: #[BG_HOVER]
- Text Primary: #[TEXT_PRIMARY]
- Text Secondary: #[TEXT_SECONDARY]
- Border Color: #[BORDER_COLOR]
- General Accent: #[ACCENT]
- Interactive Accent: #[INTERACTIVE_ACCENT] (for checkboxes, active states, buttons)
- Checkbox Background: #[CHECKBOX_BG]
- Archive Background: #[ARCHIVE_BG]
- Mobile Add Button: #[MOBILE_ADD_BG]
- Mobile Add Hover: #[MOBILE_ADD_HOVER]
- Meta Theme Color: #[META_COLOR] (for browser theme-color meta tag)

**Icon:** Use [ICON_NAME] from lucide-react for the theme switcher

**Syntax Highlighting:**
- Code background: #[CODE_BG]
- Code text: #[CODE_TEXT]
- Primary accent: #[CODE_ACCENT]
- Secondary accent: #[CODE_ACCENT_2]
(Provide full syntax highlighting color palette if needed)

**Update all theme locations:**
1. ThemeContext.tsx - Add theme to type, meta colors, and toggle rotation
2. global.css - Add CSS variables block and Clerk overrides
3. Sidebar.tsx - Add icon import, update icon conditional, update tooltip
4. FullPageNoteView.tsx - Create syntax highlighting theme and update usage
5. NotesSection.tsx - Create syntax highlighting theme and update usage
6. App.tsx - Update Clerk appearance variables
7. Sidebar.tsx - Update conditional image paths for user icons and logos

**Interactive Accent Usage:**
The interactive accent color (#[INTERACTIVE_ACCENT]) should be used for:

**Core Interactive States:**
- Checked checkboxes (background and border)
- Active date states in sidebar (`.date-item-container.active`)
- Collapsed sidebar date active states (`.date-item-collapsed.active`)
- Focused checkbox borders (`.todo-item-wrapper.focused .todo-checkbox`, `.todo-item.focused .todo-checkbox`, `.todo-checkbox:hover`)
- Menu hover states (`.todo-item:hover .menu-button:hover`)
- Menu button base color (`.menu-button` - some themes only)

**Buttons and Actions:**
- Primary buttons
- Confirm dialog buttons
- Date picker buttons (`.date-picker-button`)
- Date picker cancel buttons (`.date-picker-button.cancel`)
- Add folder save buttons
- Clerk authentication buttons

**UI Components:**
- Font size option active state (`.font-size-option.active`)
- Search highlights
- Active full-page note in sidebar (`.notes-folder-item.active`)
- Date hover backgrounds (`.date-item-container:hover:not(.active)` - if using interactive accent)
- Date menu button hover (`.date-menu-button:hover`)
- Code block backgrounds (`.note-code-block-wrapper pre`, `.note-code-block-wrapper code` - if different from primary background)

Ensure all existing themes continue to work correctly and test thoroughly.
```

**Example Usage:**

```
Add a new theme called "cloud" to the application with the following color palette:

**Theme Colors:**
- Primary Background: #EDEDED
- Secondary Background: #E8E8E8
- Hover Background: #E8E8E8
- Text Primary: #171717
- Text Secondary: #171717
- Border Color: #E8E8E8
- General Accent: #E8E8E8
- Interactive Accent: #171717 (for checkboxes, active states, buttons)
- Checkbox Background: #171717
- Archive Background: #171717
- Mobile Add Button: #171717
- Mobile Add Hover: #171717
- Meta Theme Color: #171717

**Icon:** Use half2 icon from https://www.radix-ui.com/icons for the theme switcher

**Syntax Highlighting:**
- Code background: #EDEDED
- Code text: #171717
- Primary accent: #E8E8E8
- Secondary accent: #E8E8E8

Update all theme locations as specified in the guide.
```

## Complete File Checklist

When adding a new theme, verify these files are updated:

- [ ] `src/context/ThemeContext.tsx`
  - [ ] Theme type union
  - [ ] Meta theme color
  - [ ] Toggle rotation

- [ ] `src/styles/global.css`
  - [ ] CSS variables block
  - [ ] Clerk UserProfile overrides
  - [ ] Clerk SignIn/SignUp overrides
  - [ ] Clerk form overrides
  - [ ] Interactive accent color overrides:
    - [ ] `.todo-checkbox.checked`
    - [ ] `.date-item-container.active`
    - [ ] `.date-item-collapsed.active`
    - [ ] `.todo-item-wrapper.focused .todo-checkbox` and `.todo-checkbox:hover`
    - [ ] `.date-item-container:hover:not(.active)` (if using interactive accent)
    - [ ] `.date-menu-button:hover`
    - [ ] `.menu-button` (base color if needed)
    - [ ] `.todo-item:hover .menu-button:hover`
    - [ ] `.date-picker-button`
    - [ ] `.date-picker-button.cancel`
    - [ ] `.font-size-option.active`
    - [ ] `.notes-folder-item.active`
    - [ ] `.note-code-block-wrapper pre` and `code` backgrounds (if different from primary)

- [ ] `src/components/Sidebar.tsx`
  - [ ] Icon import
  - [ ] Icon conditional rendering
  - [ ] Tooltip text
  - [ ] Conditional image paths

- [ ] `src/components/FullPageNoteView.tsx`
  - [ ] Syntax highlighting theme object
  - [ ] Theme conditional in SyntaxHighlighter

- [ ] `src/components/NotesSection.tsx`
  - [ ] Syntax highlighting theme object
  - [ ] Theme conditional in SyntaxHighlighter

- [ ] `src/App.tsx`
  - [ ] Clerk appearance colorPrimary
  - [ ] Clerk appearance colorBackground
  - [ ] Clerk appearance colorText

## Testing Checklist

After implementing a new theme:

- [ ] Theme appears in theme switcher
- [ ] Theme icon displays correctly
- [ ] Theme switches correctly when clicked
- [ ] Theme persists after page refresh
- [ ] All backgrounds use correct colors
- [ ] All text is readable with sufficient contrast
- [ ] Checkboxes use interactive accent color
- [ ] Active sidebar dates use interactive accent color
- [ ] Collapsed sidebar dates use interactive accent when active
- [ ] Focused checkbox borders use interactive accent
- [ ] Date hover states work correctly
- [ ] Date menu button hover states work correctly
- [ ] Menu button colors are correct
- [ ] Menu button hover states use interactive accent
- [ ] Date picker buttons use interactive accent
- [ ] Date picker cancel buttons use interactive accent
- [ ] Font size selector active state uses interactive accent
- [ ] Active full-page note in sidebar uses correct background
- [ ] Code block backgrounds match theme
- [ ] Hover states work correctly
- [ ] Focus states are visible
- [ ] Buttons use correct colors
- [ ] Clerk modals match theme
- [ ] Syntax highlighting in notes works correctly
- [ ] Full-page notes display correctly
- [ ] Launch page displays correctly
- [ ] Changelog page displays correctly
- [ ] Mobile responsive design works
- [ ] All existing themes still work

## Best Practices

### 1. Color Selection

- **Start with base colors**: Background, text, accent
- **Test contrast ratios**: Use tools like WebAIM Contrast Checker
- **Maintain consistency**: Use the same color for similar functions
- **Consider accessibility**: WCAG AA minimum contrast ratios

### 2. CSS Organization

- **Use CSS variables**: All colors should be defined as CSS variables
- **Group by component**: Keep related styles together
- **Minimize overrides**: Leverage base variables when possible
- **Comment complex rules**: Explain non-obvious styling decisions

### 3. Performance

- **Use CSS variables**: Efficient theme switching
- **Minimize specificity**: Avoid `!important` when possible
- **Test performance**: Ensure theme switching is smooth

### 4. Maintenance

- **Document decisions**: Explain color choices and rationale
- **Version control**: Track theme changes in git
- **Regular testing**: Test themes with new features
- **User feedback**: Gather feedback on theme usability

## Common Pitfalls

### 1. Forgetting Clerk Overrides

**Problem**: Clerk components don't match theme
**Solution**: Always add Clerk overrides section in global.css

### 2. Missing Syntax Highlighting Theme

**Problem**: Code blocks look wrong in new theme
**Solution**: Create syntax highlighting theme objects in both FullPageNoteView.tsx and NotesSection.tsx

### 3. Not Updating Toggle Rotation

**Problem**: Theme doesn't cycle correctly
**Solution**: Update toggleTheme function in ThemeContext.tsx

### 4. Missing Interactive Accent Overrides

**Problem**: Checkboxes and active states don't use interactive accent
**Solution**: Add theme-specific overrides for `.todo-checkbox.checked` and `.date-item-container.active`

### 5. Forgetting Meta Theme Color

**Problem**: Browser theme color doesn't match
**Solution**: Add theme color to colors object in ThemeContext.tsx

## Conclusion

This guide provides a comprehensive framework for theme development. By following these practices and using the provided prompt template, new themes can be created efficiently while maintaining consistency, accessibility, and performance across all components including full-page notes, launch page, and changelog page.

Remember: Good themes enhance the user experience without compromising functionality or accessibility. Always prioritize usability over aesthetics.
