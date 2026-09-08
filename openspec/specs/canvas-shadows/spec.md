# canvas-shadows Specification

## Purpose

Applies dynamic Konva drop shadows to canvas elements based on each asset's `z` (height) property,
creating a premium visual depth illusion without switching canvas engines.

## Requirements

### Requirement: Height-Proportional Drop Shadows
The system SHALL apply `shadowBlur` and `shadowOffset` to Konva nodes in proportion to the asset's `z` value from `FURNITURE_SIZE`.

#### Scenario: Rendering a rack cabinet (z=96) vs a desk (z=28)
- **WHEN** a rack cabinet and a desk are both rendered on the canvas
- **THEN** the rack cabinet has a larger, more blurred shadow (further from the ground)
  and the desk has a tight, subtle shadow — reflecting their relative heights.

### Requirement: Shadow Utility Function
The system SHALL expose a `getShadowProps(z)` utility function in `furniture.js` that returns
`{ shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, shadowOpacity }` Konva props.

#### Scenario: Consistent shadows across all asset types
- **WHEN** any furniture node is built via `buildFurnitureNode()`
- **THEN** it calls `getShadowProps(size.z)` to get its shadow configuration — not hardcoded values.
