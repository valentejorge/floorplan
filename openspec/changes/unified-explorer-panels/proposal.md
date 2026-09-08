## Why

The right sidebar (`explorer-panel`) currently uses a mix of inconsistent CSS classes and hardcoded colors for its internal panels (`assets-catalog-panel`, `properties-panel`, and `asset-edit-modal`). This inconsistency in background colors, padding, and positioning creates a disjointed user experience and makes maintenance harder. We need a unified "Sidebar Modal/View" standard that applies universally.

## What Changes

- Create a unified CSS class (e.g., `.fp-sidebar-modal`) for sidebar overlay panels.
- Update `assets-catalog-panel` to use the unified standard.
- Update `asset-edit-modal` to use the unified standard, removing its hardcoded `#fff` background and custom paddings.
- Standardize the `properties-panel` docked view to use design system tokens instead of a hardcoded `#fafbfc` background.
- Standardize headers and close buttons across all right-sidebar views.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `design-system`: The design system requirements are changing to explicitly define and enforce standard classes for sidebar modals/views (such as `.fp-sidebar-modal`), preventing future hardcoded overlay implementations.

## Impact

- `index.html`: Will have classes updated for the right sidebar elements.
- `style.css`: Will have `.fp-overlay-panel`, `.fp-asset-edit-panel`, and `.fp-properties` styles unified or refactored into standardized classes.
