## Purpose
Defines the behavior of the Explorer panel, which functions as a single right docking area housing all catalogs, layer trees, and host inspectors.

## MODIFIED Requirements

### Requirement: Single Right Docking Area for all panels
The system SHALL house all secondary panels (IT Hosts, Layers Tree, Furniture Catalog, Wall/Floor Styles, Unmapped IT Assets) inside the right-side Explorer container (`.fp-explorer`), keeping the left side 100% clean and unobstructed.

#### Scenario: View Mode rendering
- **WHEN** the system is in View Mode
- **THEN** the right Explorer panel displays the IT Hosts list (`#explorer-body`)

#### Scenario: Edit Mode rendering driven by Toolbar
- **WHEN** the user switches active tools on the bottom Toolbar in Edit Mode
- **THEN** the right Explorer panel dynamically displays the corresponding sub-view (Layers Tree, Wall Styles, Floor Styles, Furniture Catalog, or Unmapped IT Assets)

### Requirement: Dynamic visibility and compact gap of Details panel
The system SHALL hide the Details panel when no item is selected, and display it with a tight bottom gap when an item or host is selected.

#### Scenario: No item selected
- **WHEN** no host or canvas node is selected
- **THEN** the Details panel (`#properties-panel`) is hidden (`display: none`) and the active view list expands to 100% height

#### Scenario: Item selected
- **WHEN** a host or canvas node is selected
- **THEN** the Details panel (`#properties-panel`) becomes visible below the active view with a compact gap

### Requirement: Furniture quick-edit in Layers Tree
The system SHALL provide an edit action (pencil icon) for Furniture nodes within the Layers Tree.

#### Scenario: User clicks edit on a furniture node
- **WHEN** the user clicks the pencil icon next to a furniture item in the Layers Tree
- **THEN** the Layout Configuration modal opens for that specific furniture node

### Requirement: Floating Card Header in Explorer panel
The system SHALL render panel headers inside the Explorer panel as floating cards with a top gap margin and rounded corners.

### Requirement: Computer SVG icon for Host items
The system SHALL render a computer SVG icon instead of a colored status dot next to each host item in the Explorer panel.

