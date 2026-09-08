## MODIFIED Requirements

### Requirement: Consistent Component Classes
The system SHALL provide reusable `.fp-*` component classes for all recurring UI patterns:
panels, buttons, labels, inputs, badges, and separators.

#### Scenario: Properties panel and Object Explorer using the same card style
- **WHEN** both panels render a "card" container
- **THEN** both use the same `.fp-panel` class, not each their own inline background color.

#### Scenario: Sidebar modal views using unified class
- **WHEN** displaying an overlay or sub-panel in the right sidebar (like Unmapped Assets or Layout Configuration)
- **THEN** they use the unified `.fp-sidebar-modal` class (or equivalent unified view class) and use design system tokens for backgrounds and padding, avoiding any hardcoded hex colors like `#fff` or `#fafbfc`.
