## ADDED Requirements

### Requirement: Landing page displays logo and centered text input
The application SHALL display a landing page with the application logo centered vertically and a text input field below it. The text input field SHALL be prominently placed in the center of the viewport.

#### Scenario: Initial page load
- **WHEN** the user navigates to the application URL
- **THEN** the page SHALL display the application logo and a centered text input field with placeholder text indicating the user should enter their logo text

#### Scenario: Text input accepts user text
- **WHEN** the user types text into the input field
- **THEN** the input field SHALL display the entered text and allow editing

### Requirement: UI transitions to editor view on text submission
The application SHALL transition from the landing view to the editor view when the user submits text. In the editor view, the text input SHALL move to the top of the page and the main area SHALL display the 3D plaque preview.

#### Scenario: User submits text via Enter key
- **WHEN** the user types text and presses Enter
- **THEN** the text input SHALL animate to the top of the page and the 3D preview SHALL appear in the main content area showing the generated plaque

#### Scenario: User submits text via submit button
- **WHEN** the user types text and clicks the generate/submit button
- **THEN** the UI SHALL transition to the editor view identically to the Enter key submission

### Requirement: Text can be modified in editor view
The text input in the editor view SHALL remain editable. Changing the text and resubmitting SHALL regenerate the plaque with the new text.

#### Scenario: User modifies text in editor view
- **WHEN** the user changes the text in the top input bar and submits
- **THEN** the 3D preview SHALL update to show the plaque with the new text

### Requirement: Editor view displays export button
The editor view SHALL display an export/download button that is clearly visible and accessible.

#### Scenario: Export button visible in editor view
- **WHEN** the UI is in editor view
- **THEN** an export/download button SHALL be visible to the user
