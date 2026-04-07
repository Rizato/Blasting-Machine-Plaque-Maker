## Why

The current plaque/logo generation workflow requires running a Python script (`oval_logo.py`) locally with specific dependencies (Pillow, numpy, fonttools, potrace). This limits accessibility — users need a Python environment set up. Converting this to a browser-based web app eliminates all setup friction, lets anyone generate and preview 3D plaques instantly, and enables easy sharing via GitHub Pages.

## What Changes

- **New web application**: Single-page HTML/TypeScript app that replaces the Python CLI workflow for plaque generation
- **In-browser 3D text generation**: Load the empty plaque STL as a base, generate raised text geometry client-side, and merge them
- **Interactive 3D preview**: Three.js-based viewer with click-drag rotation and scroll-to-zoom
- **Export support**: Download generated plaque as STL file directly from the browser
- **Landing UI**: Logo-centered landing page with central text input; transitions to 3D preview after text entry
- **Static deployment**: Deployable as a GitHub Pages site (no backend required)

## Capabilities

### New Capabilities
- `text-input-ui`: Landing page with logo and central text input field; transitions to editor view with text input at top and 3D viewer as main content
- `plaque-generation`: Client-side 3D text geometry generation — loads empty plaque STL as base mesh, generates raised letter geometry on the plaque surface using font outline extrusion, matching the size/placement demonstrated in `tnt.stl`
- `3d-preview`: Interactive Three.js viewer with orbit controls (click-drag to rotate, scroll to zoom) displaying the generated plaque
- `stl-export`: Export the combined plaque+text mesh as a downloadable STL file from the browser

### Modified Capabilities
<!-- No existing capabilities to modify — this is a greenfield web app -->

## Impact

- **New files**: `index.html`, TypeScript source files, build config, GitHub Pages deployment config
- **Dependencies**: Three.js (3D rendering), opentype.js or similar (font parsing in browser), a client-side STL parser/writer
- **Existing code**: `oval_logo.py` remains unchanged — the web app is a parallel implementation, not a replacement
- **Deployment**: New GitHub Pages configuration (or Cloudflare Pages fallback) for static hosting
- **Reference assets**: `empty.stl` / `empty.3mf` used as base plaque template; `tnt.stl` / `tnt.3mf` used as reference for text size and placement
