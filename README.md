# Plaque Maker

**[Live site](https://rizato.github.io/Blasting-Machine-Plaque-Maker)**

A browser-based tool for generating 3D plaques with oval-warped raised text, ready for 3D printing. No backend required — everything runs client-side.

## Features

- **Oval envelope warp** — Text is warped into an oval shape with a raised ring border, matching the style from `oval_logo.py`
- **Interactive 3D preview** — Three.js viewport with click-drag rotation and scroll-to-zoom
- **STL export** — Download the generated plaque as a binary STL for 3D printing
- **Fully client-side** — No server needed; deploys as a static site

## Getting started

```bash
cd web-app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Type your text and press Enter or click Generate.

## How it works

1. The base plaque mesh is loaded from `empty.stl`
2. Text is generated using Three.js TextGeometry with the built-in Helvetiker Bold font
3. Each vertex of the text geometry is warped through an oval envelope function (ported from `oval_logo.py`)
4. A raised oval ring border is generated around the text
5. Text and ring are positioned flush with the plaque surface, inside the raised lip
6. The combined mesh can be exported as STL

## Project structure

```
web-app/
  public/
    empty.stl                        # Base plaque mesh
    helvetiker_bold.typeface.json    # Built-in Three.js font
  src/
    main.ts              # App entry point and UI wiring
    viewer.ts            # Three.js scene, camera, controls, lighting
    text-generator.ts    # Font loading, oval warp, text + ring geometry
    plaque-loader.ts     # STL loading
    plaque-config.ts     # Dimensions computed from loaded STL
    exporter.ts          # Binary STL export and download
    style.css            # Landing and editor UI styles
  index.html
  vite.config.ts
```

## Reference files

- `empty.stl` / `empty.3mf` — Blank plaque (47 x 27 x 4 mm)
- `tnt.stl` / `tnt.3mf` — Example plaque with text, used as reference for sizing
- `oval_logo.py` — Original Python CLI for generating 2D oval badge logos (PNG/SVG)

## Building for production

```bash
cd web-app
npm run build
```

Output goes to `web-app/dist/`.

## Deployment

See [DEPLOY.md](DEPLOY.md) for GitHub Pages setup instructions.

## Tech stack

- [Vite](https://vite.dev/) + TypeScript
- [Three.js](https://threejs.org/) — 3D rendering, STL loading/export, text geometry
