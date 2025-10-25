# Theme Development Guide

## Overview

This guide provides a comprehensive framework for creating and implementing new themes in the application. It covers the complete process from design to implementation, ensuring consistency and maintainability.

## Theme Architecture

### 1. CSS Variable System

All themes use a centralized CSS variable system for consistent theming:

```css
:root[data-theme="theme-name"] {
  /* Core Colors */
  --bg-primary: #ffffff; /* Main background */
  --bg-secondary: #f8f9fa; /* Secondary panels, sidebar */
  --bg-hover: #e9ecef; /* Hover states */

  /* Text Colors */
  --text-primary: #000000; /* Primary text */
  --text-secondary: #6c757d; /* Secondary text, labels */

  /* Interactive Elements */
  --border-color: #dee2e6; /* Borders, dividers */
  --accent: #007bff; /* Primary accent color */

  /* Component Specific */
  --checkbox-bg: #f8f9fa; /* Checkbox background */
  --archive-bg: #f8f9fa; /* Archive section background */
}
```

### 2. Theme Implementation Pattern

#### Step 1: Define Base Variables

```css
:root[data-theme="new-theme"] {
  /* Copy and modify the variable system above */
  --bg-primary: #your-color;
  --bg-secondary: #your-color;
  /* ... continue for all variables */
}
```

#### Step 2: Component Overrides

Identify elements that need specific color overrides:

```css
/* Example: Custom button colors */
:root[data-theme="new-theme"] .custom-button {
  background-color: #custom-color;
  border-color: #custom-color;
}

:root[data-theme="new-theme"] .custom-button:hover {
  background-color: #custom-hover-color;
}
```

#### Step 3: Interactive States

Ensure all interactive states are defined:

```css
/* Hover states */
:root[data-theme="new-theme"] .interactive-element:hover {
  background-color: var(--bg-hover);
}

/* Focus states */
:root[data-theme="new-theme"] .interactive-element:focus {
  border-color: var(--accent);
  outline-color: var(--accent);
}

/* Active states */
:root[data-theme="new-theme"] .interactive-element.active {
  background-color: var(--accent);
  color: white;
}
```

## Theme Development Process

### Phase 1: Design and Planning

#### 1.1 Color Palette Selection

- **Primary Background**: Main app background color
- **Secondary Background**: Sidebar, cards, panels
- **Text Colors**: Ensure sufficient contrast (WCAG AA minimum)
- **Accent Color**: Primary interactive color
- **Hover States**: Subtle darkening of base colors
- **Borders**: Subtle, non-distracting

#### 1.2 Accessibility Considerations

- **Contrast Ratios**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Blindness**: Don't rely solely on color for information
- **Focus Indicators**: Clear visual focus states
- **Interactive Elements**: Obvious clickable/tappable areas

#### 1.3 Design Principles

- **Consistency**: Use the same color for similar functions
- **Hierarchy**: Clear visual hierarchy through color
- **Readability**: Text must be easily readable
- **Professional**: Appropriate for business use

### Phase 2: Implementation

#### 2.1 CSS Variable Definition

```css
:root[data-theme="theme-name"] {
  /* Core theme variables */
  --bg-primary: #color;
  --bg-secondary: #color;
  --bg-hover: #color;
  --text-primary: #color;
  --text-secondary: #color;
  --border-color: #color;
  --accent: #color;
  --checkbox-bg: #color;
  --archive-bg: #color;

  /* Font sizes (inherit from base) */
  --font-app-name: 14px;
  --font-sidebar: 13px;
  --font-todo: 14px;
  --font-archive: 13px;
  --font-header-date: 14px;
}
```

#### 2.2 Component-Specific Overrides

Identify components that need custom colors:

```css
/* Buttons */
:root[data-theme="theme-name"] .button-primary {
  background-color: #custom-color;
  border-color: #custom-color;
}

/* Checkboxes */
:root[data-theme="theme-name"] .todo-checkbox.checked {
  background-color: #custom-color;
  border-color: #custom-color;
}

/* Form Elements */
:root[data-theme="theme-name"] .form-input {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

/* Navigation */
:root[data-theme="theme-name"] .nav-item.active {
  background-color: var(--accent);
  color: white;
}
```

#### 2.3 Third-Party Component Theming

```css
/* Clerk Authentication */
:root[data-theme="theme-name"] .cl-signIn,
:root[data-theme="theme-name"] .cl-signUp {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}

:root[data-theme="theme-name"] .cl-formButtonPrimary {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: white !important;
}
```

### Phase 3: Testing and Validation

#### 3.1 Visual Testing Checklist

- [ ] All backgrounds use theme colors
- [ ] Text is readable and has proper contrast
- [ ] Interactive elements are clearly visible
- [ ] Hover states work correctly
- [ ] Focus indicators are visible
- [ ] Active states are distinct
- [ ] Borders and dividers are subtle but present

#### 3.2 Accessibility Testing

- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are keyboard accessible
- [ ] Color is not the only way to convey information
- [ ] Interactive elements have sufficient touch targets
- [ ] Text remains readable at different zoom levels

#### 3.3 Cross-Browser Testing

- [ ] Chrome/Chromium browsers
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

#### 3.4 Component Coverage

- [ ] Sidebar and navigation
- [ ] Todo items and lists
- [ ] Forms and inputs
- [ ] Modals and dialogs
- [ ] Search functionality
- [ ] Archive sections
- [ ] Authentication flows
- [ ] Mobile responsive design

## Theme Integration

### 1. Context Integration

Update `src/context/ThemeContext.tsx`:

```typescript
type Theme = "dark" | "light" | "tan" | "new-theme";

const toggleTheme = () => {
  setTheme((prev) => {
    // Add new theme to rotation
    if (prev === "dark") return "light";
    if (prev === "light") return "tan";
    if (prev === "tan") return "new-theme";
    return "dark";
  });
};
```

### 2. Sidebar Integration

Update `src/components/Sidebar.tsx`:

```typescript
import { Moon, Sun, Cloud, NewIcon } from "lucide-react";

// In theme toggle button:
{theme === "dark" ? (
  <Moon size={16} />
) : theme === "light" ? (
  <Sun size={16} />
) : theme === "tan" ? (
  <Cloud size={16} />
) : (
  <NewIcon size={16} />
)}
```

### 3. Icon Selection

Choose appropriate icons from [Lucide Icons](https://lucide.dev):

- **Dark Mode**: Moon (🌙)
- **Light Mode**: Sun (☀️)
- **Tan Mode**: Cloud (☁️)
- **New Theme**: Choose relevant icon

## Best Practices

### 1. Color Selection

- **Start with base colors**: Background, text, accent
- **Test contrast ratios**: Use tools like WebAIM Contrast Checker
- **Consider color psychology**: Different colors evoke different emotions
- **Maintain consistency**: Use the same color for similar functions

### 2. CSS Organization

- **Group by component**: Keep related styles together
- **Use meaningful names**: Make selectors self-documenting
- **Minimize specificity**: Avoid `!important` when possible
- **Comment complex rules**: Explain non-obvious styling decisions

### 3. Performance

- **Use CSS variables**: Efficient theme switching
- **Minimize overrides**: Leverage base variables when possible
- **Optimize selectors**: Use efficient CSS selectors
- **Test performance**: Ensure theme switching is smooth

### 4. Maintenance

- **Document decisions**: Explain color choices and rationale
- **Version control**: Track theme changes in git
- **Regular testing**: Test themes with new features
- **User feedback**: Gather feedback on theme usability

## Common Pitfalls

### 1. Contrast Issues

- **Problem**: Text not readable against background
- **Solution**: Test all color combinations for sufficient contrast

### 2. Inconsistent Colors

- **Problem**: Same function uses different colors
- **Solution**: Create a color reference guide and stick to it

### 3. Missing States

- **Problem**: Hover/focus/active states not defined
- **Solution**: Systematically test all interactive elements

### 4. Third-Party Components

- **Problem**: External components don't match theme
- **Solution**: Use specific selectors and `!important` when necessary

## Theme Examples

### Current Themes

#### Dark Mode

- **Base**: Dark grays and blacks
- **Accent**: Blue (#4a9eff)
- **Text**: White and light gray
- **Use Case**: Low-light environments, developer preference

#### Light Mode

- **Base**: Whites and light grays
- **Accent**: Blue (#007aff)
- **Text**: Black and dark gray
- **Use Case**: Bright environments, traditional preference

#### Tan Mode

- **Base**: Warm tans and beiges
- **Accent**: Orange (#EB5601)
- **Text**: Dark colors for contrast
- **Use Case**: Eye strain reduction, document-focused work
- **Key Overrides**:
  - Checked checkboxes use #EB5601
  - Active states use #EB5601
  - Primary buttons use #EB5601
  - Focused elements use #EB5601

### Future Theme Ideas

#### High Contrast Mode

- **Purpose**: Accessibility for visually impaired users
- **Colors**: Maximum contrast ratios
- **Features**: Larger focus indicators, bold borders

#### Night Mode

- **Purpose**: True dark mode with minimal blue light
- **Colors**: Deep blacks, warm accents
- **Features**: Reduced brightness, warm color temperature

#### Colorful Mode

- **Purpose**: Fun, engaging interface
- **Colors**: Vibrant, saturated colors
- **Features**: Colorful accents, playful interactions

## Documentation Requirements

### 1. Theme Documentation

Each theme should include:

- **Color palette**: Complete list of colors used
- **Rationale**: Why these colors were chosen
- **Use cases**: When to use this theme
- **Accessibility notes**: Any special considerations
- **Implementation notes**: Special overrides or considerations

### 2. Testing Documentation

- **Visual testing**: Screenshots of all major components
- **Accessibility testing**: Contrast ratio measurements
- **Browser testing**: Compatibility notes
- **Performance testing**: Theme switching speed

### 3. Maintenance Documentation

- **Update procedures**: How to modify theme colors
- **Troubleshooting**: Common issues and solutions
- **Dependencies**: Any external dependencies
- **Version history**: Changes over time

## Conclusion

This guide provides a comprehensive framework for theme development. By following these practices, new themes can be created efficiently while maintaining consistency, accessibility, and performance. The key is to start with a solid foundation using CSS variables and systematically test all components and states.

Remember: Good themes enhance the user experience without compromising functionality or accessibility. Always prioritize usability over aesthetics.
