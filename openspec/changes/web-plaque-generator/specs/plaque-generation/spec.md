## ADDED Requirements

### Requirement: Load base plaque mesh from bundled STL
The application SHALL load the `empty.stl` file as the base plaque mesh. This mesh SHALL be parsed client-side and used as the foundation for all generated plaques.

#### Scenario: Base plaque loads on application start
- **WHEN** the application initializes
- **THEN** the base plaque STL SHALL be loaded and parsed into a 3D mesh ready for rendering and combination with text geometry

#### Scenario: Base plaque load failure
- **WHEN** the base plaque STL fails to load
- **THEN** the application SHALL display an error message to the user

### Requirement: Generate raised 3D text geometry from user input
The application SHALL generate 3D text geometry with extruded (raised) letters from the user's input string. The text SHALL be generated using a bundled open-source font.

#### Scenario: Single word text generation
- **WHEN** the user submits a single word (e.g., "VOLE")
- **THEN** the application SHALL generate extruded 3D letter meshes for each character

#### Scenario: Multi-word text generation
- **WHEN** the user submits text with spaces (e.g., "HELLO WORLD")
- **THEN** the application SHALL generate extruded 3D letter meshes with appropriate spacing

### Requirement: Position text on plaque surface matching reference dimensions
The generated text geometry SHALL be centered horizontally on the plaque face. The text height and extrusion depth SHALL match the proportions demonstrated in `tnt.stl`. The text SHALL be placed at the plaque surface Z-height so letters appear raised above the plaque.

#### Scenario: Text centered on plaque
- **WHEN** text geometry is generated
- **THEN** the text SHALL be horizontally centered on the plaque face

#### Scenario: Text scaled to fit plaque
- **WHEN** the user enters text of varying lengths
- **THEN** the text SHALL scale to fit within the plaque's usable text area while maintaining legible proportions

### Requirement: Combine text and plaque into single mesh
The application SHALL combine the base plaque mesh and the generated text geometry into a single exportable mesh. The text geometry SHALL overlap slightly with the plaque surface to ensure a continuous solid for 3D printing.

#### Scenario: Mesh combination produces valid geometry
- **WHEN** text is generated and placed on the plaque
- **THEN** the combined mesh SHALL be a valid geometry suitable for 3D printing (no gaps between text and plaque surface)
