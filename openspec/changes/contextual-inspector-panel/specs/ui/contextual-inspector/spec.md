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
