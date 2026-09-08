## Context

See proposal.md - Why. The `explorer-panel` currently has internal view panels that use different classes (`.fp-overlay-panel`, `.fp-asset-edit-panel`, `.fp-properties`), resulting in hardcoded colors (`#fafbfc`, `#fff`) and different visual styles (padding, borders) for components that should feel like part of the same sidebar UI.

## Goals / Non-Goals

**Goals:**
- Replace the multiple overlay and panel classes in the right sidebar with a standard set of CSS classes (e.g. using `.fp-overlay-panel` as the sole overlay).
- Remove any hardcoded hex values (`#fff`, `#fafbfc`) from these components in `style.css` and use the design system variables (`--fp-bg-sidebar`, `--fp-bg-panel`, etc.).
- Ensure close buttons and headers in these panels are completely unified.

**Non-Goals:**
- Redesigning the functional layout or animation states of the sidebar entirely (it will remain a sidebar with overlays/docked elements, but they will visually match).
- Modifying the Left Sidebar (`#left-sidebar`), except to ensure the `.fp-overlay-panel` changes don't break existing patterns if shared.

## Decisions

- **Consolidate Overlays**: Instead of having `.fp-overlay-panel` and `.fp-asset-edit-panel` do almost the same thing with different layout CSS, we will consolidate them. `.fp-overlay-panel` will be the standard for full-height sidebar overlays. We will remove `.fp-asset-edit-panel`'s layout CSS and map the HTML to `.fp-overlay-panel`.
- **Properties Panel (`.fp-properties`)**: We will remove the hardcoded `#fafbfc` background and use `var(--fp-bg)` or `var(--fp-bg-sidebar)` depending on the depth we want, unifying its paddings with the rest of the explorer body.

## Risks / Trade-offs

- [Risk] Modifying `.fp-asset-edit-panel` to use `.fp-overlay-panel` might break its specific `visible` slide-in animation.
  → Mitigation: We will adapt the `.visible` modifier to work generically with `.fp-overlay-panel` so any overlay can slide in correctly.
