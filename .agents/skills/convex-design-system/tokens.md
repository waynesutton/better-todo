# Convex Design Tokens: Complete Reference

Source: `@convex-dev/design-system@0.2.0` (`dist/styles/shared.css`)

---

## Brand colors

From https://convex.dev/brand

| Name | Hex | RGB | CMYK |
|------|-----|-----|------|
| Red | #EE342F | rgb(238, 52, 47) | 0, 68, 74, 14 |
| Yellow | #F3B01C | rgb(243, 176, 28) | 0, 23, 71, 9 |
| Purple | #8D2676 | rgb(141, 38, 118) | 0, 65, 12, 49 |

---

## Color scales

### Red

| Token | Value |
|-------|-------|
| red-100 | `rgb(252, 215, 203)` |
| red-200 | `rgb(255, 202, 193)` |
| red-300 | `rgb(252, 165, 165)` |
| red-400 | `rgb(253, 76, 65)` |
| red-500 | `rgb(238, 52, 47)` |
| red-700 | `rgb(168, 21, 21)` |
| red-900 | `rgb(107, 33, 31)` |

### Purple

| Token | Value |
|-------|-------|
| purple-100 | `rgb(241, 200, 233)` |
| purple-200 | `rgb(232, 180, 220)` |
| purple-500 | `rgb(141, 38, 118)` |
| purple-700 | `rgb(86, 0, 83)` |
| purple-900 | `rgb(113, 36, 96)` |

### Blue

| Token | Value |
|-------|-------|
| blue-100 | `rgb(204, 222, 250)` |
| blue-200 | `rgb(177, 202, 240)` |
| blue-500 | `rgb(7, 78, 232)` |
| blue-700 | `rgb(33, 34, 181)` |
| blue-900 | `rgb(0, 43, 153)` |

### Cyan

| Token | Value |
|-------|-------|
| cyan-200 | `rgb(170, 227, 239)` |
| cyan-500 | `rgb(7, 192, 232)` |
| cyan-700 | `rgb(0, 155, 221)` |
| cyan-900 | `rgb(15, 89, 105)` |

### Green

| Token | Value |
|-------|-------|
| green-100 | `rgb(203, 237, 182)` |
| green-200 | `rgb(180, 236, 146)` |
| green-500 | `rgb(79, 176, 20)` |
| green-700 | `rgb(34, 137, 9)` |
| green-900 | `rgb(44, 83, 20)` |

### Yellow

| Token | Value |
|-------|-------|
| yellow-50 | `rgb(254, 252, 232)` |
| yellow-100 | `rgb(250, 228, 171)` |
| yellow-200 | `rgb(230, 226, 168)` |
| yellow-500 | `rgb(243, 176, 28)` |
| yellow-700 | `rgb(213, 113, 21)` |
| yellow-900 | `rgb(109, 82, 23)` |

### Neutral (1-12)

| Token | Value |
|-------|-------|
| neutral-1 | `rgb(222, 226, 234)` |
| neutral-2 | `rgb(204, 206, 211)` |
| neutral-3 | `rgb(174, 177, 184)` |
| neutral-4 | `rgb(151, 154, 164)` |
| neutral-5 | `rgb(133, 136, 147)` |
| neutral-6 | `rgb(118, 121, 131)` |
| neutral-7 | `rgb(103, 106, 116)` |
| neutral-8 | `rgb(88, 92, 101)` |
| neutral-9 | `rgb(73, 76, 84)` |
| neutral-10 | `rgb(57, 60, 66)` |
| neutral-11 | `rgb(41, 43, 48)` |
| neutral-12 | `rgb(24, 25, 28)` |

---

## Utility colors

| Token | Value |
|-------|-------|
| accent | `rgb(63, 82, 149)` |
| info | `rgb(7, 191, 232)` |
| success | green-500 = `rgb(79, 176, 20)` |
| warning | yellow-500 = `rgb(243, 176, 28)` |
| error | red-500 = `rgb(238, 52, 47)` |
| brand-purple | purple-500 = `rgb(141, 38, 118)` |
| brand-red | red-500 = `rgb(238, 52, 47)` |
| brand-yellow | yellow-500 = `rgb(243, 176, 28)` |

---

## Theme: Light mode (`html.light`)

| Token | Value |
|-------|-------|
| background-brand | `rgb(249, 247, 238)` |
| background-primary | `rgb(243, 240, 237)` |
| background-secondary | `rgb(253, 252, 250)` |
| background-tertiary | `rgb(240, 238, 235)` |
| background-highlight | yellow-50 |
| background-success | green-100 |
| background-warning | yellow-100 |
| background-error | red-100 |
| background-errorSecondary | red-200 |
| content-primary | `rgb(42, 40, 37)` |
| content-secondary | `rgb(120, 118, 113)` |
| content-tertiary | `rgb(120, 118, 113)` |
| content-accent | `rgb(48, 106, 207)` |
| content-success | green-700 |
| content-warning | yellow-900 |
| content-error | red-700 |
| content-errorSecondary | red-500 |
| content-link | blue-700 = `rgb(33, 34, 181)` |
| border-transparent | `rgba(33, 34, 30, 0.14)` |
| border-selected | `rgb(30, 28, 25)` |

---

## Theme: Dark mode (`html.dark`)

| Token | Value |
|-------|-------|
| background-brand | = background-primary |
| background-primary | `rgb(30, 28, 26)` |
| background-secondary | `rgb(42, 40, 37)` |
| background-tertiary | `rgb(60, 58, 65)` |
| background-highlight | yellow-900 |
| background-success | green-900 |
| background-warning | yellow-900 |
| background-error | red-900 |
| background-errorSecondary | red-700 |
| content-primary | `rgb(255, 255, 255)` |
| content-secondary | `rgb(185, 177, 170)` |
| content-tertiary | `rgb(143, 135, 128)` |
| content-accent | `rgb(99, 168, 248)` |
| content-success | green-200 |
| content-warning | yellow-200 |
| content-error | red-200 |
| content-errorSecondary | red-400 |
| content-link | blue-200 = `rgb(177, 202, 240)` |
| border-transparent | `rgba(163, 156, 148, 0.3)` |
| border-selected | `rgb(225, 215, 205)` |

---

## Chart colors

| Token | Value |
|-------|-------|
| chart-line-1 | `rgb(31, 119, 180)` |
| chart-line-2 | `rgb(255, 127, 14)` |
| chart-line-3 | `rgb(44, 160, 44)` |
| chart-line-4 | `rgb(214, 39, 40)` |
| chart-line-5 | `rgb(148, 103, 189)` |
| chart-line-6 | `rgb(140, 86, 75)` |
| chart-line-7 | `rgb(227, 119, 194)` |
| chart-line-8 | `rgb(188, 189, 34)` |

---

## Typography

### Font families

```css
--font-display: "GT America", "Inter Variable", ui-sans-serif, system-ui,
  -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji",
  "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
```

### Heading styles

| Level | Tailwind class | Weight |
|-------|---------------|--------|
| h1 | text-2xl | normal |
| h2 | text-xl | normal |
| h3 | text-lg | font-semibold |
| h4 | text-base | font-semibold |
| h5 | text-sm | font-semibold |

### Brand typeface
- **Kanit** for the logo/wordmark (means "mathematics" in Thai)
- Lambda character hidden in the logotype "x"

---

## CSS variable usage (Tailwind)

Colors are defined as CSS custom properties and consumed via Tailwind utility classes:

```css
/* Example: using in Tailwind */
bg-background-primary     /* Light: rgb(243, 240, 237), Dark: rgb(30, 28, 26) */
text-content-primary      /* Light: rgb(42, 40, 37), Dark: rgb(255, 255, 255) */
border-border-transparent /* Light: rgba(33, 34, 30, 0.14) */
text-util-accent          /* rgb(63, 82, 149) */
bg-red-500                /* rgb(238, 52, 47) */
text-green-700            /* rgb(34, 137, 9) */
```

The design system supports dark mode via the `html.dark` class. Use Tailwind's `dark:` prefix for dark mode overrides.

---

## Animations

| Name | Definition |
|------|-----------|
| blink | 2s linear infinite opacity pulse |
| bounceIn | 0.5s ease-in-out vertical bounce |
| highlight | 1s background color flash |
| loading | fadeIn + shimmer loop |
| fadeIn | 1s opacity transition |
| rotate | 0.75s linear infinite spin |
| vhs | 0.5s skew entrance effect |

---

## Scrollbar styling

```css
.scrollbar {
  scrollbar-thin
  scrollbar-thumb-neutral-1
  scrollbar-corner-background-secondary
  scrollbar-thumb-rounded
  dark:scrollbar-thumb-neutral-8
}
```
