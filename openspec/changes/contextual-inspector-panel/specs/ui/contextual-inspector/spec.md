## Purpose
Defines the behavior of the Explorer panel, which toggles its content contextually between View Mode and Edit Mode.

## MODIFIED Requirements

### Requirement: Explorer panel content switches by mode
The system SHALL display the IT Hosts list in View Mode, and the Layers Tree in Edit Mode, within the right-side Explorer panel.

#### Scenario: User toggles Edit Mode
- **WHEN** the user switches from View Mode to Edit Mode
- **THEN** the Explorer panel hides the Hosts list and displays the Layers Tree (listing walls, floors, and furniture)

### Requirement: Furniture quick-edit in Layers Tree
The system SHALL provide an edit action (pencil icon) for Furniture nodes within the Layers Tree.

#### Scenario: User clicks edit on a furniture node
- **WHEN** the user clicks the pencil icon next to a furniture item in the Layers Tree
- **THEN** the Layout Configuration modal opens for that specific furniture node

### Requirement: Floating Card Header in Explorer panel
The system SHALL render panel headers inside the Explorer panel as floating cards with a top gap margin and rounded corners.

#### Scenario: Header rendering
- **WHEN** any header inside the Explorer panel is displayed (Hosts, Layers, or Details)
- **THEN** it renders with a top gap margin and rounded corners as a distinct floating card component

### Requirement: Dynamic visibility of Details panel
The system SHALL hide the Details panel when no item is selected, and show it only when an item or host is selected.

#### Scenario: No item selected
- **WHEN** no host or canvas node is selected
- **THEN** the Details panel (`#properties-panel`) is completely hidden from the Explorer panel

#### Scenario: Item selected
- **WHEN** a host or canvas node is selected
- **THEN** the Details panel (`#properties-panel`) becomes visible with selection properties

### Requirement: Computer SVG icon for Host items
The system SHALL render a computer SVG icon instead of a colored status dot next to each host item in the Explorer panel.

#### Scenario: Host item icon rendering
- **WHEN** host items are rendered in the Explorer list
- **THEN** each item displays an SVG computer icon in place of the colored status dot
