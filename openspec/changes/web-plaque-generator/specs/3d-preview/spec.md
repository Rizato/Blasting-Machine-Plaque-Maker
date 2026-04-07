## ADDED Requirements

### Requirement: Display 3D plaque in interactive viewport
The application SHALL render the generated plaque mesh in a WebGL-based 3D viewport that fills the main content area of the editor view.

#### Scenario: Plaque renders after text submission
- **WHEN** the user submits text and the plaque is generated
- **THEN** the 3D viewport SHALL display the plaque with raised text visible

#### Scenario: Viewport fills available space
- **WHEN** the editor view is active
- **THEN** the 3D viewport SHALL fill the main content area below the top input bar

### Requirement: Click and drag to rotate the view
The user SHALL be able to rotate the 3D view by clicking and dragging with the mouse. The rotation SHALL orbit around the center of the plaque.

#### Scenario: Left-click drag rotates view
- **WHEN** the user clicks and drags within the 3D viewport
- **THEN** the camera SHALL orbit around the plaque center following the drag direction

#### Scenario: Rotation is smooth and responsive
- **WHEN** the user drags to rotate
- **THEN** the rotation SHALL update in real-time without noticeable lag

### Requirement: Scroll to zoom
The user SHALL be able to zoom in and out using the mouse scroll wheel. Zooming SHALL move the camera closer to or further from the plaque.

#### Scenario: Scroll up zooms in
- **WHEN** the user scrolls up (or forward) within the 3D viewport
- **THEN** the camera SHALL move closer to the plaque

#### Scenario: Scroll down zooms out
- **WHEN** the user scrolls down (or backward) within the 3D viewport
- **THEN** the camera SHALL move further from the plaque

#### Scenario: Zoom has reasonable limits
- **WHEN** the user zooms in or out extensively
- **THEN** the camera SHALL stop at reasonable min/max distances to prevent clipping through the plaque or losing it from view

### Requirement: Appropriate lighting and materials
The 3D viewport SHALL use lighting that makes the raised text clearly visible on the plaque surface. The material SHALL provide enough contrast between the text and plaque surface.

#### Scenario: Text is visually distinguishable
- **WHEN** the plaque with raised text is displayed
- **THEN** the raised text SHALL be clearly visible due to lighting and shadow effects on the 3D geometry
