## Purpose

Renders the floorplan layout and IT assets in a crisp, 2D top-down Orthogonal view using WebGL, leveraging PixiJS filters to generate rich drop shadows for a premium 3D depth illusion.

## ADDED Requirements

### Requirement: Top-Down WebGL Rendering
The system SHALL render all map elements (walls, floors, furniture, IT assets) using PixiJS in a strictly 2D top-down Orthogonal perspective.

#### Scenario: Rendering the base map
- **WHEN** the map JSON data is loaded
- **THEN** it renders Cartesian coordinates directly without isometric projection transformations.

### Requirement: Dynamic Drop Shadows
The system SHALL apply dynamic drop shadows to rendered elements to simulate 3D depth, using the `z` (height) property of each asset to determine the shadow distance and blur.

#### Scenario: Rendering an elevated asset
- **WHEN** an asset (like a server rack) has a high `z` property
- **THEN** it receives a drop shadow with a larger offset and higher blur radius than a low-height asset (like a desk).
