import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { Font } from "three/addons/loaders/FontLoader.js";
import { PLAQUE, OVAL, TEXT_RX, TEXT_RY, STROKE_W } from "./plaque-config.ts";

const cachedFonts = new Map<string, Font>();

export interface TextSettings {
  textDepth: number;
  useOvalDeform: boolean;
}

export async function loadFont(url: string): Promise<Font> {
  const cachedFont = cachedFonts.get(url);
  if (cachedFont) return cachedFont;
  return new Promise((resolve, reject) => {
    const loader = new FontLoader();
    loader.load(
      url,
      (font) => {
        cachedFonts.set(url, font);
        resolve(font);
      },
      undefined,
      (err) => reject(err),
    );
  });
}

// ── Oval envelope warp — ported from oval_logo.py ──────────────────────────

function warpXY(normX: number, normY: number): [number, number] {
  const xo = PLAQUE.centerX + (-TEXT_RX + normX * 2.0 * TEXT_RX);

  const dxClip = (xo - PLAQUE.centerX) / OVAL.rx;
  const rad = Math.max(0.0, 1.0 - dxClip * dxClip);
  const outerH = OVAL.ry * Math.sqrt(rad);
  const halfH = Math.min(TEXT_RY * Math.sqrt(rad), outerH);

  const yo = PLAQUE.centerY + halfH * (2.0 * normY - 1.0);

  return [xo, yo];
}

// ── Generate warped text geometry ───────────────────────────────────────────

export function generateTextGeometry(
  text: string,
  font: Font,
  settings: TextSettings,
): THREE.BufferGeometry | null {
  const upperText = text.toUpperCase();

  const textGeo = new TextGeometry(upperText, {
    font: font,
    size: 10,
    depth: settings.textDepth,
    bevelEnabled: false,
    curveSegments: 8,
  });

  textGeo.computeBoundingBox();
  const bb = textGeo.boundingBox!;

  const textWidth = bb.max.x - bb.min.x;
  const textHeight = bb.max.y - bb.min.y;
  if (textWidth === 0 || textHeight === 0) return null;

  if (!settings.useOvalDeform) {
    const maxWidth = OVAL.rx * 2 * 0.96;
    const maxHeight = OVAL.ry * 2 * 0.9;
    const fitScale = Math.min(maxWidth / textWidth, maxHeight / textHeight);
    textGeo.scale(fitScale, fitScale, 1);
    textGeo.computeBoundingBox();
    const scaledBb = textGeo.boundingBox!;
    const scaledWidth = scaledBb.max.x - scaledBb.min.x;
    const scaledHeight = scaledBb.max.y - scaledBb.min.y;
    textGeo.translate(
      PLAQUE.centerX - (scaledBb.min.x + scaledWidth / 2),
      PLAQUE.centerY - (scaledBb.min.y + scaledHeight / 2),
      PLAQUE.surfaceZ,
    );
    textGeo.computeVertexNormals();
    textGeo.computeBoundingBox();
    return textGeo;
  }

  const posAttr = textGeo.getAttribute("position");
  const positions = posAttr.array as Float32Array;

  for (let i = 0; i < posAttr.count; i++) {
    const px = positions[i * 3 + 0];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2]; // 0..1

    const normX = (px - bb.min.x) / textWidth;
    const normY = (py - bb.min.y) / textHeight;

    const [wx, wy] = warpXY(normX, normY);
    const wz = PLAQUE.surfaceZ + pz;

    positions[i * 3 + 0] = wx;
    positions[i * 3 + 1] = wy;
    positions[i * 3 + 2] = wz;
  }

  posAttr.needsUpdate = true;
  textGeo.computeVertexNormals();
  textGeo.computeBoundingBox();

  return textGeo;
}

// ── Generate oval ring geometry ─────────────────────────────────────────────

export function generateOvalRing(settings: TextSettings): THREE.BufferGeometry {
  const segments = 128;
  const rx = OVAL.rx;
  const ry = OVAL.ry;
  const outerRx = rx + STROKE_W;
  const outerRy = ry + STROKE_W;

  const outerPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    outerPoints.push(new THREE.Vector2(Math.cos(angle) * outerRx, Math.sin(angle) * outerRy));
  }

  const innerPoints: THREE.Vector2[] = [];
  for (let i = segments; i >= 0; i--) {
    const angle = (i / segments) * Math.PI * 2;
    innerPoints.push(new THREE.Vector2(Math.cos(angle) * rx, Math.sin(angle) * ry));
  }

  const outerShape = new THREE.Shape(outerPoints);
  const holePath = new THREE.Path(innerPoints);
  outerShape.holes.push(holePath);

  const geo = new THREE.ExtrudeGeometry(outerShape, {
    depth: settings.textDepth,
    bevelEnabled: false,
  });

  // Position centered on plaque, flush with surface
  geo.translate(PLAQUE.centerX, PLAQUE.centerY, PLAQUE.surfaceZ);
  geo.computeVertexNormals();

  return geo;
}
