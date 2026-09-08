## 1. Style Consolidation

- [x] 1.1 In `style.css`, remove `.fp-asset-edit-panel` layout rules, merge its slide-in behavior `.visible` into the standard overlay class (using `.fp-overlay-panel`), and verify the CSS compiles without syntax errors.
- [x] 1.2 In `style.css`, update `.fp-properties` to remove the hardcoded `#fafbfc` background and use a design system variable (e.g. `var(--fp-bg-sidebar)` or `var(--fp-bg)`), verifying visually in the browser that it matches the theme.
- [x] 1.3 In `style.css`, standardize the `.fp-panel-close` button sizing and positioning for all overlay headers, verifying it looks identical in both the Assets Catalog and the Layout Configuration modals.

## 2. HTML Refactoring

- [x] 2.1 In `index.html`, update the `#asset-edit-modal` to use the unified `.fp-overlay-panel` class instead of `.fp-asset-edit-panel`, verifying that the modal still opens and closes correctly.
- [x] 2.2 In `index.html`, review all elements inside `#explorer-panel` to ensure no inline hardcoded styles remain, verifying via browser inspector.
