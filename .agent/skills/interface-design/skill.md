---
name: interface-design
description: Use this skill when designing, refining, or reviewing application UI such as dashboards, admin panels, forms, settings pages, tables, filters, navigation, and reusable components. Use it to maintain visual consistency and evolve the project design system carefully.
---

# Interface Design Skill

You are responsible for helping maintain a clear, consistent, and reusable interface design system across the project.

## Core principles

- Prefer consistency over novelty.
- Reuse existing patterns before creating new ones.
- Avoid one-off spacing, colors, radii, shadows, and component behaviors.
- Keep the UI practical, coherent, and scalable.
- Design decisions should support future screens, not just the current one.

## What to check first

Before making any UI decision:

1. Check whether `.interface-design/system.md` exists.
2. If it exists, follow it closely.
3. Inspect existing components, layouts, and tokens in the codebase.
4. Reuse the current visual language wherever possible.
5. When applying brand styling, use the teal/orange identity from `.interface-design/system.md` as the default visual direction.

If `.interface-design/system.md` does not exist, infer a small, coherent system from the current project and suggest creating it.


## How to work

When asked to design or change UI:

1. Identify the existing design patterns in the codebase.
2. Determine whether the requested UI fits an existing pattern.
3. Reuse established component structures, spacing, typography, and hierarchy.
4. If a new pattern is necessary, make it systematic and reusable.
5. Recommend updating `.interface-design/system.md` when a new reusable decision is introduced.

## Design rules

### Layout
- Use consistent spacing scales.
- Keep alignment clean and predictable.
- Prefer balanced density over clutter.
- Use clear visual hierarchy.

### Typography
- Reuse existing font sizes and weights.
- Limit unnecessary variation.
- Make headings, labels, helper text, and body text clearly distinct.

### Colors
- Reuse established semantic colors.
- Follow the project brand palette defined in `.interface-design/system.md`.
- Preserve the balance between teal and orange as the primary brand identity.
- Prefer token-based usage over hardcoded values.
- Use teal for positive, stable, primary brand-driven surfaces and actions when appropriate.
- Use orange for emphasis, highlights, active accents, and attention-driving elements.
- Avoid introducing unrelated hues unless they serve a clear semantic purpose.

### Components
- Prefer shared variants over one-off styling.
- Keep buttons, inputs, cards, tables, badges, and modals consistent.
- Use the same interaction patterns for similar actions.

### Visual style
- Keep borders, radii, shadows, and depth treatment consistent.
- Do not mix multiple visual styles without a strong reason.
- Preserve the product’s current tone unless explicitly asked to evolve it.

## Expected behavior

When making meaningful UI changes:

- Briefly state the design direction you are following.
- Mention whether you are reusing an existing pattern or introducing a new one.
- If introducing a new reusable pattern, suggest documenting it in `.interface-design/system.md`.

## Output preferences

Prefer:
- design tokens over hardcoded values
- reusable variants over ad hoc classes
- consistency over decoration
- incremental system improvements over redesigning everything

Avoid:
- random spacing values
- inconsistent button/input sizing
- mixing unrelated visual styles
- creating a new pattern for a case that already has one

## Documentation rule

If you introduce a new reusable design decision, propose adding it to `.interface-design/system.md` under the appropriate section.