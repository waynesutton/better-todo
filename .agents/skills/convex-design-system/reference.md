# Convex Design System: Component Reference

Full prop tables and variant details for each component in the Convex website Storybook.

Source: https://website-storybook.previews.convex.dev/

---

## Components

### Banner

Status message banner with three variants.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| variant | `"info" \| "success" \| "error"` | Yes | - | Visual style of the banner |
| children | `ReactNode` | Yes | - | Banner content |
| className | `string` | No | - | Additional CSS classes |

**Stories**: Info, Success, Error

**Visual**: Light purple/blue background for info, with an icon prefix. Full-width horizontal banner.

---

### Card

Clickable card component that links to a page. Used as the basis for `ImageCard` and `TemplateCard`.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| href | `string` | Yes | - | Link destination |
| children | `ReactNode` | Yes | - | Card content |
| className | `string` | No | - | Additional CSS classes |

**Stories**: Default, With Custom Content

**Visual**: Minimal card with border, content area, and hover state.

---

### Code

Displays code in a styled block with a copy-to-clipboard button.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| code | `string` | Yes | - | Code content to display |
| className | `string` | No | - | Additional CSS classes for the container |
| buttonClassName | `string` | No | - | Additional CSS classes for the copy button |

**Stories**: Default

**Visual**: Dark background code block with monospace font and a copy icon button.

---

### FeatureBanner

Promotional banner used to feature another page on the website.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| title | `string` | Yes | - | Banner title text |
| description | `string` | Yes | - | Banner description text |
| href | `string` | Yes | - | Link destination |
| className | `string` | No | - | Additional CSS classes |

**Stories**: Default

**Visual**: Dark background with white text, title on the left, "Learn more" CTA button on the right with a subtle border/glow effect.

---

### Markdown

Renders markdown content with styled typography, including headings, paragraphs, lists, code blocks, and links.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| content | `string` | Yes | - | Markdown content string |

**Stories**: Default, With Custom Overrides

**Visual details**:
- Headings: Large bold text, purple color for linked headings
- Paragraphs: Standard body text with bold and italic support
- Lists: Bulleted and numbered with proper spacing
- Code blocks: Dark background with copy button (reuses Code component style)
- Links: Purple for internal links, external links get an external link icon
- Tables: Supported with standard markdown table syntax

---

### Placeholder

Placeholder/skeleton component for loading states.

**Stories**: Default

---

## Buttons

### Button

Standard button component with size and color variants.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | `string` | No | - | Button label text |
| size | `"sm" \| "md" \| "lg"` | No | `"md"` | Button size |
| color | `"yellow" \| string` | No | `"yellow"` | Button color variant |
| disabled | `boolean` | No | - | Disable the button |
| onClick | `() => void` | No | - | Click handler |

**Stories**: Default, Disabled, Link, Disabled Link

**Visual**: Rounded pill-shape button. Default yellow/gold background with dark text. Disabled state reduces opacity.

---

### GlowButton

Call-to-action button with a glow/border effect. Used for primary CTAs.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| text | `string` | Yes | - | Button label text |
| href | `string` | Yes | - | Link destination |
| onClick | `(e: MouseEvent) => void` | No | - | Click handler |
| trackingEvent | `TrackingEvent` | No | - | Analytics tracking event object |

**Stories**: Default

**Visual**: Dark/black rounded pill button with a subtle pink/red glow border effect. White text. Used for prominent CTAs like "Start building".

---

## Forms

### Field

Wrapper component that combines a label with a form input.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| label | `string` | No | - | Label text displayed above the input |
| type | `string` | No | `"text"` | Input type attribute |

**Stories**: Default, Required, Error

**Visual**: Label text above a cream/tan colored text input. Required fields may show an asterisk. Error state shows red border.

---

### Fieldset

Groups multiple Field components together.

**Stories**: (see Storybook for details)

---

### SelectInput

Dropdown select input component.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| options | `{ label: string; value: string }[]` | Yes | - | Array of options |
| error | `boolean` | No | `false` | Show error state |
| placeholder | `string` | No | `"Select an option..."` | Placeholder text |
| defaultValue | `string` | No | `""` | Default selected value |
| disabled | `boolean` | No | - | Disable the select |

**Stories**: Default, Placeholder, Disabled, Error

**Visual**: Cream/tan background select with dropdown chevron. Full-width. Error state shows red border.

---

### TextInput

Single-line text input component.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| error | `boolean` | No | `false` | Show error state |
| value | `string` | No | - | Input value |
| placeholder | `string` | No | - | Placeholder text |
| disabled | `boolean` | No | - | Disable the input |

**Stories**: Default, Placeholder, Disabled, Error

**Visual**: Cream/tan background (#f5f0e8 style) input with no visible border. Error state adds red border. Disabled state reduces interactivity.

---

### TextareaInput

Multi-line text input component. Same pattern as TextInput but with multiple rows.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| error | `boolean` | No | `false` | Show error state |
| value | `string` | No | - | Input value |
| placeholder | `string` | No | - | Placeholder text |
| disabled | `boolean` | No | - | Disable the textarea |

**Stories**: (see Storybook for variants)

**Visual**: Same cream/tan background style as TextInput, but taller with multiple rows.

---

## Design system notes

For the complete color palette, typography, and CSS variables, see [tokens.md](tokens.md).

### Key color mappings
- **Primary CTA**: yellow-500 `rgb(243, 176, 28)` (Button default)
- **CTA glow**: Dark with pink/red glow border (GlowButton)
- **Info**: cyan `rgb(7, 191, 232)` (Banner info variant)
- **Success**: green-500 `rgb(79, 176, 20)` (Banner success variant)
- **Error**: red-500 `rgb(238, 52, 47)` (Banner error, form error states)
- **Input backgrounds**: background-brand `rgb(249, 247, 238)` (warm cream)
- **Feature areas**: background-primary dark mode `rgb(30, 28, 26)` with white text
- **Links**: blue-700 `rgb(33, 34, 181)` (content-link in light mode)
- **Brand**: Red #EE342F, Yellow #F3B01C, Purple #8D2676

### Input patterns
- All form inputs use a warm cream background (background-brand) by default
- Error states add a red border (red-500)
- Disabled states reduce opacity/interactivity
- Labels are positioned above inputs (Field component)

### Button patterns
- Default Button uses yellow-500, pill-shaped
- GlowButton for primary CTAs, dark with glow effect
- Both support disabled states
- Button supports Link variant for navigation-style buttons

### Typography
- Display font: "GT America", "Inter Variable", system sans-serif
- Headings use Tailwind sizing: h1=2xl, h2=xl, h3=lg (semibold), h4=base (semibold), h5=sm (semibold)
- Dark mode via `html.dark` class, Tailwind `dark:` prefix
