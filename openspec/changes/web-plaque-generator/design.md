## Context

The project currently has a Python CLI (`oval_logo.py`) that generates oval badge logos as PNG/SVG. The user wants a browser-based tool that generates 3D plaques with raised text — a different output (3D mesh vs 2D image) but similar concept (text on a shaped surface).

Reference assets exist: `empty.stl` is the blank plaque base mesh, and `tnt.stl` demonstrates the target text size and placement. The app must run entirely client-side for GitHub Pages deployment.

## Goals / Non-Goals

**Goals:**
- Browser-based plaque generator with zero backend dependencies
- Load and parse the empty plaque STL as the base mesh
- Generate raised 3D text geometry from user input, positioned to match the `tnt.stl` reference
- Interactive 3D preview with orbit controls
- STL export for 3D printing
- Clean landing page UI that transitions to an editor view
- Deployable on GitHub Pages

**Non-Goals:**
- 3MF export (STL is sufficient for the initial release; 3MF can be added later)
- Customizable fonts, colors, or plaque shapes
- Backend/server-side processing
- Replacing `oval_logo.py` — the Python tool stays as-is
- Mobile-optimized UI (desktop-first is fine)

## Decisions

### 1. Build toolchain: Vite + TypeScript
**Choice**: Vite with TypeScript for bundling and development.
**Why**: Fast HMR for development, tree-shaking for production, native TypeScript support, and simple static output for GitHub Pages. Alternatives considered: plain HTML+JS (no type safety, harder to manage dependencies), Webpack (slower, more config).

### 2. 3D rendering: Three.js
**Choice**: Three.js for the 3D viewport.
**Why**: Industry-standard WebGL library, mature orbit controls, STL loader built-in, excellent documentation. Alternatives considered: Babylon.js (heavier, more game-oriented), raw WebGL (too low-level for this scope).

### 3. Text geometry: Three.js TextGeometry + opentype.js
**Choice**: Use `opentype.js` to parse a bundled font file, generate font shapes, then use Three.js `ExtrudeGeometry` to create raised 3D letter meshes.
**Why**: This is the standard approach for 3D text in Three.js. The font is bundled with the app (no server needed). The extrusion depth and placement will be calibrated against the `tnt.stl` reference. Alternatives considered: pre-rendering text as heightmaps (complex, less clean geometry), SDF text (good for rendering but not for mesh export).

### 4. STL parsing and export: Custom lightweight parser + Three.js STLExporter
**Choice**: Use Three.js `STLLoader` to parse the base plaque, and `STLExporter` to write the combined mesh.
**Why**: Both are part of the Three.js examples/addons ecosystem. The base plaque STL is loaded once at startup. For export, the text meshes are merged with the plaque mesh using `BufferGeometryUtils.mergeGeometries()` (or equivalent CSG union). Alternatives considered: standalone STL libraries (unnecessary extra dependency when Three.js already provides this).

### 5. Text placement strategy
**Choice**: Analyze the `tnt.stl` mesh to determine the plaque surface Z-height and text bounding region, then position generated text geometry at the same Z-level with the same centering approach.
**Why**: The reference file `tnt.stl` defines the "correct" look. By measuring its text geometry bounds and offset from the plaque surface, we can replicate the positioning programmatically. Text will be centered horizontally on the plaque face, with letter height scaled to fit within the plaque's usable area.

### 6. UI architecture: Single HTML page with state transitions
**Choice**: Single `index.html` with CSS transitions between landing state (logo + centered input) and editor state (top input bar + 3D viewport + export button).
**Why**: Simple state management — just toggling CSS classes. No router or SPA framework needed for two states. The transition is triggered when the user submits text.

### 7. Deployment: GitHub Pages via GitHub Actions
**Choice**: GitHub Actions workflow that runs `vite build` and deploys the `dist/` folder to GitHub Pages.
**Why**: Native GitHub integration, free hosting, automatic deploys on push. Fallback: Cloudflare Pages with the same static `dist/` output.

## Risks / Trade-offs

- **Font licensing**: Must bundle a font with a permissive license (e.g., Liberation Sans, Roboto). Using system fonts is not possible in the browser for geometry extraction.
  → Mitigation: Bundle a single open-source bold sans-serif font.

- **Large STL base mesh**: The `empty.stl` is ~200KB. Loading it on every page visit adds latency.
  → Mitigation: Acceptable size for a single-page tool. Could compress with gzip (served compressed by GitHub Pages automatically).

- **Text geometry quality**: Three.js `ExtrudeGeometry` can produce non-manifold geometry at sharp corners or with certain fonts, which may cause issues in slicers.
  → Mitigation: Use a clean sans-serif font, moderate extrusion depth, and test output in common slicers.

- **Mesh merging vs. stacking**: True CSG boolean union is expensive and complex. Simply placing the text mesh on top of the plaque (overlapping slightly) produces a valid-enough STL for most slicers.
  → Mitigation: Start with simple mesh stacking (text geometry placed at plaque surface Z). If slicer issues arise, add CSG union as an enhancement.

- **Browser compatibility**: WebGL is required. Older browsers or restricted environments may not support it.
  → Mitigation: Show a fallback message if WebGL is unavailable. Target modern evergreen browsers only.
