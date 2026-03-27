# Interface Design System

## Product direction
Personality: Clean, modern, practical
Interface style: Product UI
Density: Medium
Visual treatment: Minimal depth, consistent borders, restrained emphasis

## Spacing
Base unit: 4px

Scale:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Rules:
- Use the spacing scale consistently.
- Avoid arbitrary values unless necessary.
- Similar components should use similar internal spacing.

## Radius
Scale:
- sm: 6px
- md: 8px
- lg: 12px
- xl: 16px

Rules:
- Inputs, buttons, and compact controls should generally use the same radius family.
- Cards and larger containers may use a slightly larger radius.

## Typography
Heading sizes:
- h1: page title
- h2: section title
- h3: subsection title

Body sizes:
- body-md: default content
- body-sm: secondary content
- caption: helper text, metadata

Rules:
- Keep heading hierarchy clear.
- Avoid too many font sizes.
- Use weight and size consistently across similar UI sections.

## Color roles

### Brand palette
Primary brand colors:
- teal: #28B384
- teal-strong: #159270
- orange: #FD9D02
- orange-strong: #F77902

Supporting colors:
- warm-soft: #FBC47A
- neutral-bg: #F4F4F4

### Semantic usage
- primary: teal
- primary-hover: teal-strong
- accent: orange
- accent-hover: orange-strong
- background: neutral-bg
- surface: #FFFFFF
- surface-muted: #F7F7F7
- foreground: #1F2937
- foreground-muted: #6B7280
- border: #E5E7EB
- success: teal
- warning: orange
- danger: #DC2626
- info: teal-strong

### Rules
- Teal and orange form the core brand identity and should be the dominant accent colors.
- Teal should communicate trust, continuity, confirmation, balance, and primary brand presence.
- Orange should communicate movement, emphasis, interaction, highlights, and callouts.
- Avoid using teal and orange in equal intensity everywhere; usually one should lead and the other should support.
- Prefer neutral backgrounds and surfaces so the brand colors stand out cleanly.
- Use strong orange sparingly for emphasis-heavy UI elements.
- Use strong teal for hover states, selected states, and stronger primary treatment.
- Do not introduce extra saturated colors unless required for clear semantic meaning.

### Recommended UI usage
- Primary buttons: teal background with light text
- Primary button hover/pressed: teal-strong
- Secondary emphasis buttons or highlighted actions: orange background with light text
- Links or active highlights: teal or orange depending on hierarchy
- Selected chips, badges, or tabs: teal-tinted or orange-tinted variants
- Charts: prefer teal as the main data color and orange as the contrasting highlight color
- Notifications:
  - success: teal-based
  - warning: orange-based
  - error: red-based
  - info: teal-based

## Borders and shadows
Borders:
- Prefer subtle borders for structure.

Shadows:
- Use sparingly.
- Do not mix many shadow intensities.
- Prefer either border-first styling or a very restrained shadow system.

## Buttons
### Primary button
Purpose: Main action
Rules:
- Highest emphasis on the screen
- Consistent height and padding
- Use the same pattern across all primary actions

### Secondary button
Purpose: Alternative action
Rules:
- Lower emphasis than primary
- Same general sizing system as primary

### Ghost / text button
Purpose: Low-emphasis actions
Rules:
- Use for optional or secondary interactions
- Keep hover/focus states consistent

## Inputs
Rules:
- Inputs, selects, and textareas should share a common sizing language.
- Labels, helper text, and validation messages should be consistent.
- Error states should be clear but not visually noisy.

## Cards and panels
Rules:
- Use a consistent container pattern for sections and grouped content.
- Padding should follow the spacing scale.
- Avoid mixing too many container styles in the same screen.

## Tables and lists
Rules:
- Keep row height, padding, and alignment consistent.
- Use the same treatment for headers, filters, and empty states.
- Prefer readability over decoration.

## Forms
Rules:
- Group related fields clearly.
- Keep label placement consistent.
- Use predictable spacing between fields and sections.
- Error and helper text placement should be standardized.

## Navigation
Rules:
- Navigation elements should have clear active, hover, and disabled states.
- Use consistent spacing and emphasis rules between items.
- The current location should always be visually obvious.

## Feedback states
Include consistent patterns for:
- empty states
- loading states
- error states
- success confirmations

Rules:
- Keep feedback patterns reusable.
- Use similar structure and tone across the product.

## Decision log
Use this section to record new reusable design choices.

Example entry:

### 2026-03-27
Decision: Standardized filter bars to use one row on desktop and stacked layout on mobile.
Reason: Keeps search, status, and sort controls visually predictable across screens.
Applied to: Transactions, users, reports