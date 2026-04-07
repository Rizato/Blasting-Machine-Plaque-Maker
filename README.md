# Plaque Maker

**[Live site](https://rizato.github.io/Blasting-Machine-Plaque-Maker)**

A browser-based tool for generating 3D plaques with oval-warped raised text, for 3D printing.

## Features

- **Oval envelope warp** — Text is warped into an oval shape with a raised ring border, immitating the logo seen on many blasting machines in the 1800s. 
- **Interactive 3D preview** — Three.js viewport with click-drag rotation and scroll-to-zoom
- **STL export** — Download the generated plaque as a binary STL or 3mf for 3D printing
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
3. Each vertex of the text geometry is warped through an oval envelope function
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

## Tech stack

- [Vite](https://vite.dev/) + TypeScript
- [Three.js](https://threejs.org/) — 3D rendering, STL loading/export, text geometry
