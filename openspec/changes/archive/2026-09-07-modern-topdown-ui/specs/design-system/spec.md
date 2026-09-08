## Purpose

Enforces a single CSS variable design system across all UI components.
All visual tokens (colors, spacing, typography, borders, shadows) are defined once in `style.css :root`
and consumed everywhere. No inline styles in `index.html` or JS files.

## Requirements

### Requirement: Single Source of Truth for Tokens
The system SHALL define all visual tokens as CSS variables in `style.css :root`.

#### Scenario: Adding a new component
- **WHEN** a developer adds a new UI component
- **THEN** they use only `var(--fp-*)` tokens for color, spacing, border, and shadow — no hardcoded hex values or px values inline.

### Requirement: No Inline Styles in HTML
The system SHALL have zero `style="..."` attributes in `index.html` for layout and color properties.
All layout classes SHALL use predefined `.fp-*` CSS classes.

#### Scenario: Reviewing a PR
- **WHEN** reviewing `index.html`
- **THEN** no element has `style="background: #fff"`, `style="color: red"`, or any color/font inline style.

### Requirement: Consistent Component Classes
The system SHALL provide reusable `.fp-*` component classes for all recurring UI patterns:
panels, buttons, labels, inputs, badges, and separators.

#### Scenario: Properties panel and Object Explorer using the same card style
- **WHEN** both panels render a "card" container
- **THEN** both use the same `.fp-panel` class, not each their own inline background color.
