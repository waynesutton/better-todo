# Menu Button Alignment Fix

## Problem

When a todo item was focused or hovered, the menu button (three dots) would shift left and not align with other todo items' menu buttons.

## Root Cause

Applying `width: 90%` constraint to `.todo-item-wrapper.focused` and `.todo-item:hover` caused the entire todo container to shrink, which pushed the menu button inward and misaligned it with other todos.

## Solution

Used a pseudo-element approach to constrain only the background while keeping the menu button aligned:

1. **Removed width constraints** from focused/hover states
2. **Added `margin-left: auto`** to `.todo-menu` to keep menu button right-aligned
3. **Created pseudo-element background** using `::before` that covers only 90% width (95% on mobile)
4. **Kept todo item container** at full width so menu buttons align consistently

## Key Changes

```css
/* Base todo item - maintains consistent width */
.todo-item {
  width: 90%;
  position: relative;
}

/* Menu button - stays right-aligned */
.todo-menu {
  flex-shrink: 0;
  margin-left: auto;
}

/* Focused state - constrained background via pseudo-element */
.todo-item.focused::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 90%;
  height: 100%;
  background-color: var(--bg-hover);
  border-radius: 4px;
  z-index: -1;
}
```

## Result

- Menu buttons align consistently across all todo items
- Focused background is constrained to 90% width
- No layout shifts when hovering or focusing todos
