---
name: convex-design-system
description: Convex UI component patterns from the live Storybook preview. Use when building React components, forms, modals, navigation, feedback states, or app layouts that should match the current Convex design system. Applies to both shared primitives and dashboard style product UI.
---

# Convex Design System

Use the live Storybook as the source of truth: `https://storybook.previews.convex.dev/`

The current Storybook is broader than the older website only library. It now includes:

- primitives such as `Button`, `Callout`, `Checkbox`, `Combobox`, `Menu`, `Modal`, `MultiSelectCombobox`, `ProgressBar`, `Spinner`, and `TextInput`
- shared `elements/*` building blocks such as `Avatar`, `Card`, `CopyButton`, `PaginationControls`, `Sidebar`, `Snippet`, and `ToastContainer`
- product level `components/*`, `features/*`, and `lib/*` stories used across the Convex dashboard

## How to use this skill

When asked to build Convex style UI:

1. Start with the smallest reusable primitive that matches the job.
2. Reach for `elements/*` when the UI needs a shared layout or display pattern.
3. Reuse `components/*` or `features/*` only when the request matches an existing dashboard pattern closely.
4. Prefer composition over custom styling. Build from existing pieces before inventing a new wrapper.
5. Do not rely on old website Storybook URLs or old token lists unless you verify them again.

## Current Storybook map

### Primitives

Use these first for new UI:

- `Button`
- `Callout`
- `Checkbox`
- `Combobox`
- `KeyboardShortcut`
- `Menu`
- `Modal`
- `MultiSelectCombobox`
- `ProgressBar`
- `Spinner`
- `TextInput`

### Shared elements

These cover reusable display and layout patterns:

- `elements/Avatar`
- `elements/AvatarGrid`
- `elements/Card`
- `elements/CopyButton`
- `elements/DetailPanel`
- `elements/PaginationControls`
- `elements/ReadonlyCode`
- `elements/ReadonlyCodeDiff`
- `elements/Sidebar`
- `elements/Snippet`
- `elements/ToastContainer`
- `elements/UsagePeriodSelector`

### Product and dashboard references

These are useful as implementation references when the user asks for admin or dashboard UI:

- `components/header/NavBar`
- `components/header/Breadcrumbs`
- `components/header/UsageBanner`
- `components/billing/*`
- `components/teamSettings/*`
- `components/projectSettings/*`
- `features/data/components/*`
- `features/functions/components/*`
- `features/health/components/*`
- `features/logs/components/*`
- `features/settings/components/*`
- `lib/ConvexStatusBadge`
- `lib/ConvexStatusWidget`

## Verified primitive patterns

These details were confirmed from the live Storybook controls.

### Button

Use for primary actions, neutral actions, destructive actions, and unstyled inline actions.

- variants: `primary`, `danger`, `neutral`, `unstyled`
- sizes: `xs`, `sm`, `md`, `lg`
- supports: `icon`, `inline`, `focused`, `disabled`, `loading`, `tip`

```tsx
<Button variant="primary" size="md">
  Save changes
</Button>

<Button variant="danger" size="sm" disabled>
  Delete project
</Button>
```

### Callout

Use for inline page feedback and guidance blocks.

- variants seen in controls: `instructions`, `error`, `hint`, `localDevUpsell`, `success`
- accepts `children`

```tsx
<Callout variant="instructions">
  Review the settings before continuing.
</Callout>
```

### TextInput

Use for standard form fields and search style inputs.

- required in stories: `id`
- supports: `label`, `labelHidden`, `description`, `error`
- input types seen in controls: `text`, `search`, `email`, `time`, `password`, `number`
- sizes: `sm`, `md`
- supports addons and icons: `leftAddon`, `rightAddon`, `Icon`, `SearchIcon`
- supports `isSearchLoading`

```tsx
<TextInput
  id="project-name"
  label="Project name"
  type="text"
  size="md"
/>
```

### Checkbox

Use for boolean settings and bulk selection states.

- required in stories: `checked`, `onChange`
- supports `disabled`
- includes checked, unchecked, and indeterminate states

```tsx
<Checkbox
  id="email-notifications"
  checked={enabled}
  onChange={setEnabled}
/>
```

### Combobox

Use for searchable single selection inputs.

- required in stories: `label`, `options`, `setSelectedOption`
- option shape: `{ label, value }`
- supports `selectedOption`, `placeholder`, `searchPlaceholder`
- supports `disableSearch`, `allowCustomValue`, `disabled`
- sizes: `sm`, `md`

```tsx
<Combobox
  label="Team"
  options={teams}
  selectedOption={teamId}
  setSelectedOption={setTeamId}
/>
```

### MultiSelectCombobox

Use for searchable multi select inputs with count based labels.

- required in stories: `options`, `unit`, `unitPlural`, `label`, `selectedOptions`
- supports `labelHidden` and `disableSearch`

```tsx
<MultiSelectCombobox
  label="Regions"
  options={regions}
  unit="region"
  unitPlural="regions"
  selectedOptions={selectedRegions}
  setSelectedOptions={setSelectedRegions}
/>
```

### Modal

Use for focused workflows, confirmations, and settings flows.

- required in stories: `title`, `onClose`, `children`
- supports optional `description`
- sizes: `sm`, `md`, `lg`

```tsx
<Modal
  title="Invite team member"
  description="Send access to a new teammate."
  onClose={closeModal}
  size="md"
>
  <InviteMemberForm />
</Modal>
```

### ProgressBar and Spinner

Use for loading and background work feedback.

- `ProgressBar` stories include `indeterminate`, `empty`, `half`, `full`, `animated value`, and `solid`
- `Spinner` has a default loading state story

## Composition guidance

### Forms

Build forms from:

- `TextInput`
- `Checkbox`
- `Combobox`
- `MultiSelectCombobox`
- `Button`
- `Callout` for validation or setup guidance

### Feedback states

Use:

- `Callout` for inline information, errors, and success states
- `ProgressBar` for long running progress
- `Spinner` for short blocking waits
- `elements/ToastContainer` for transient feedback

### App layout

Use these as references for admin style product UI:

- `components/header/NavBar`
- `components/header/Breadcrumbs`
- `elements/Sidebar`
- `elements/Card`
- `elements/DetailPanel`

## Decision rules

- If the request is a new button, input, modal, or filter control, use a primitive first.
- If the request is a dashboard panel, code display, snippet, toast, or navigation shell, inspect `elements/*` next.
- If the request matches billing, team settings, logs, data browser, or deployment settings, inspect the related `components/*` or `features/*` stories before building from scratch.
- If a prop or state is unclear, check the live Storybook controls instead of guessing.

## Additional resources

- Live Storybook: `https://storybook.previews.convex.dev/`
- Brand guide: `https://convex.dev/brand`
- Storybook index: `https://storybook.previews.convex.dev/index.json`
