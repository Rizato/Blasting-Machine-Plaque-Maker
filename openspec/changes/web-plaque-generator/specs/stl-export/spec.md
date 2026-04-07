## ADDED Requirements

### Requirement: Export combined plaque as STL file
The application SHALL allow the user to download the generated plaque (base mesh + raised text) as a binary STL file.

#### Scenario: User clicks export button
- **WHEN** the user clicks the export/download button in the editor view
- **THEN** the browser SHALL download an STL file containing the combined plaque and text geometry

#### Scenario: Export file is named appropriately
- **WHEN** the user exports the plaque
- **THEN** the downloaded file SHALL have a descriptive filename based on the entered text (e.g., `plaque-VOLE.stl`)

### Requirement: Exported STL is valid for 3D printing
The exported STL file SHALL be a valid binary STL that can be opened in standard 3D printing slicers (e.g., Cura, PrusaSlicer, Bambu Studio).

#### Scenario: STL opens in slicer software
- **WHEN** the exported STL file is loaded into a 3D printing slicer
- **THEN** the slicer SHALL display the plaque with raised text without geometry errors

### Requirement: Export only available when plaque is generated
The export button SHALL only be functional when a plaque has been successfully generated.

#### Scenario: Export button disabled without plaque
- **WHEN** no plaque has been generated yet
- **THEN** the export button SHALL be disabled or hidden

#### Scenario: Export button enabled after generation
- **WHEN** a plaque has been successfully generated
- **THEN** the export button SHALL be enabled and clickable
