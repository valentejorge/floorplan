## Purpose

Provides a local development mocking layer that intercepts API requests to the OCS backend, allowing the frontend to be developed and tested independently without a running Docker container or PHP backend.

## ADDED Requirements

### Requirement: Local Mock API Interceptor
The system SHALL intercept standard `fetch` or `XMLHttpRequest` calls aimed at the OCS backend when running in a local Vite development environment.

#### Scenario: Running in Vite dev server
- **WHEN** the application boots in local dev mode (`NODE_ENV === 'development'`)
- **THEN** it intercepts requests to `ajax/get_unmapped_assets.php`, `ajax/get_map.php`, etc., and returns static JSON mock data instead of making a real network request.

### Requirement: Mock Data Fixtures
The system SHALL provide realistic mock data representing OCS IT assets and floorplan layouts.

#### Scenario: Requesting unmapped assets
- **WHEN** the frontend requests the list of unmapped assets
- **THEN** the mock API returns a JSON array containing realistic mock computers, notebooks, and networking equipment with assigned hardware IDs and statuses.
