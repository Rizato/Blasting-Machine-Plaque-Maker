## 1. Project Setup

- [ ] 1.1 Initialize Vite + TypeScript project with `npm create vite@latest` (vanilla-ts template)
- [ ] 1.2 Install dependencies: three, @types/three, opentype.js
- [ ] 1.3 Copy `empty.stl` into `public/` as the bundled base plaque asset
- [ ] 1.4 Bundle an open-source bold sans-serif font (e.g., Liberation Sans Bold or Roboto Bold) into `public/`

## 2. Base Plaque Loading

- [ ] 2.1 Create `src/plaque-loader.ts` — use Three.js STLLoader to fetch and parse `empty.stl` into a BufferGeometry
- [ ] 2.2 Analyze `tnt.stl` to extract reference dimensions: plaque surface Z-height, text bounding box, text extrusion depth
- [ ] 2.3 Document the measured reference values as constants in `src/plaque-config.ts`

## 3. Text Geometry Generation

- [ ] 3.1 Create `src/text-generator.ts` — use opentype.js to load the bundled font and extract glyph paths
- [ ] 3.2 Convert opentype.js glyph paths to Three.js Shape objects
- [ ] 3.3 Extrude shapes using Three.js ExtrudeGeometry with depth matching the `tnt.stl` reference
- [ ] 3.4 Implement text centering and scaling logic to fit text within the plaque's usable area
- [ ] 3.5 Position text geometry at plaque surface Z-height with slight overlap for solid printing

## 4. Landing Page UI

- [ ] 4.1 Create `index.html` with landing layout: centered logo + text input field
- [ ] 4.2 Add CSS for landing state (centered content) and editor state (top bar + main viewport)
- [ ] 4.3 Implement CSS transition animation between landing and editor states
- [ ] 4.4 Wire up Enter key and submit button to trigger text submission and state transition

## 5. 3D Preview Viewport

- [ ] 5.1 Create `src/viewer.ts` — initialize Three.js scene, camera, renderer, and lighting
- [ ] 5.2 Add OrbitControls for click-drag rotation and scroll-to-zoom with min/max distance limits
- [ ] 5.3 Set up lighting (directional + ambient) to make raised text clearly visible via shadows
- [ ] 5.4 Implement resize handling so the viewport fills the main content area responsively

## 6. Plaque Generation Pipeline

- [ ] 6.1 Create `src/main.ts` — orchestrate: on text submit → generate text geometry → combine with plaque → display in viewer
- [ ] 6.2 Merge text geometry and plaque into a single mesh using BufferGeometryUtils.mergeGeometries
- [ ] 6.3 Handle text updates: clear previous text mesh, regenerate, and update the scene

## 7. STL Export

- [ ] 7.1 Create `src/exporter.ts` — use Three.js STLExporter to serialize the combined mesh as binary STL
- [ ] 7.2 Implement download trigger: create Blob, generate object URL, trigger download with filename `plaque-<TEXT>.stl`
- [ ] 7.3 Wire export button: disabled when no plaque generated, enabled after generation

## 8. Deployment

- [ ] 8.1 Configure Vite `base` option for GitHub Pages path prefix
- [ ] 8.2 Create `.github/workflows/deploy.yml` — GitHub Actions workflow to build and deploy to GitHub Pages
- [ ] 8.3 Verify production build works: `npm run build` produces correct `dist/` output

## 9. Testing & Polish

- [ ] 9.1 Test with various text inputs: single chars, long words, multi-word, special characters
- [ ] 9.2 Export an STL and verify it opens correctly in a slicer (manual test)
- [ ] 9.3 Test WebGL fallback message for unsupported browsers
- [ ] 9.4 Add a simple application logo/title for the landing page
