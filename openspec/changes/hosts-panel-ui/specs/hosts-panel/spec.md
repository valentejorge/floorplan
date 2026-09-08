## Purpose

Defines the structure and interactive behavior of the Hosts panel, replacing the generic Object Explorer with a split-pane interface and synced map interactions.

## ADDED Requirements

### Requirement: Split-Pane Interface
The system SHALL display the Hosts panel using a split-pane layout when an asset is selected, consisting of a list view taking the upper portion and a details view taking the lower portion.

#### Scenario: User opens the Hosts panel
- **WHEN** the user opens the Hosts panel without an active selection
- **THEN** they see the full list of hosts taking up the panel.

#### Scenario: User selects a host
- **WHEN** the user selects a host from the list
- **THEN** the panel splits to show the host details in the bottom portion of the panel, including hostname, description, user, and a "View in OCS" button.

### Requirement: Interactive Synchronization
The system SHALL synchronize the selection state between the map canvas and the Hosts panel list.

#### Scenario: Selecting from the list highlights on map
- **WHEN** the user clicks an asset in the Hosts list
- **THEN** the corresponding asset on the map is highlighted or focused.

#### Scenario: Selecting on the map highlights in the list
- **WHEN** the user clicks an asset on the map
- **THEN** the corresponding item in the Hosts list is visually selected and the details pane opens.

### Requirement: External Deep Linking
The system SHALL provide a way to open the selected asset in the external OCS Inventory system.

#### Scenario: User clicks "View in OCS"
- **WHEN** the user clicks the "View in OCS Inventory" button for a selected asset
- **THEN** a new browser tab opens pointing to the computer's detail page in the OCS system.
