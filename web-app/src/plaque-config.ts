import * as THREE from "three";

export const MAGNET_OPTIONS = [
  { id: "3x1", label: "3 x 1 mm", diameter: 3, depth: 1 },
  { id: "5x1", label: "5 x 1 mm", diameter: 5, depth: 1 },
  { id: "6x2", label: "6 x 2 mm", diameter: 6, depth: 2 },
  { id: "6x3", label: "6 x 3 mm", diameter: 6, depth: 3 },
  { id: "8x2", label: "8 x 2 mm", diameter: 8, depth: 2 },
  { id: "8x3", label: "8 x 3 mm", diameter: 8, depth: 3 },
] as const;

export type MagnetSizeId = (typeof MAGNET_OPTIONS)[number]["id"];
export type MagnetOption = (typeof MAGNET_OPTIONS)[number];

export const FONT_OPTIONS = [
  {
    id: "helvetiker-bold",
    label: "Helvetiker Bold",
    url: "helvetiker_bold.typeface.json",
  },
] as const;

export type FontOptionId = (typeof FONT_OPTIONS)[number]["id"];

export const MAGNET_POCKET = {
  widthClearance: 0.2,
  depthClearance: 0.25,
  lipRadius: 0.5,
};

// These get computed from the actual loaded STL geometry
export const PLAQUE = {
  width: 47.0,
  depth: 27.0,
  height: 4.0,
  surfaceZ: 4.0,
  centerX: 0,
  centerY: 0,
  textRaiseHeight: 1.0,
};

export const OVAL = {
  rx: 0,
  ry: 0,
  hMargin: 0.2,
  vMargin: 0.07,
  strokeFraction: 0.03,
};

export let TEXT_RX = 0;
export let TEXT_RY = 0;
export let STROKE_W = 0;

/**
 * Call after loading the plaque STL to compute all derived dimensions
 * from the actual geometry bounding box.
 */
export function computeDimensionsFromGeometry(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;

  PLAQUE.width = bb.max.x - bb.min.x;
  PLAQUE.depth = bb.max.y - bb.min.y;
  PLAQUE.height = bb.max.z - bb.min.z;
  PLAQUE.surfaceZ = bb.max.z - 1.0; // 1mm below lip
  PLAQUE.centerX = (bb.min.x + bb.max.x) / 2;
  PLAQUE.centerY = (bb.min.y + bb.max.y) / 2;
  PLAQUE.textRaiseHeight = PLAQUE.height * 0.25; // raise text 25% of plaque thickness

  // Oval sized to fit inside the plaque face with clearance for fillet edges
  const ovalFraction = 0.6;
  OVAL.rx = (PLAQUE.width / 2) * ovalFraction;
  OVAL.ry = (PLAQUE.depth / 2) * ovalFraction;
  OVAL.hMargin = 0.2;
  OVAL.vMargin = 0.07;
  OVAL.strokeFraction = 0.03;

  TEXT_RX = OVAL.rx * (1.0 - OVAL.hMargin);
  TEXT_RY = OVAL.ry * (1.0 - OVAL.vMargin);
  STROKE_W = Math.max(0.3, PLAQUE.width * OVAL.strokeFraction);

  console.log("Plaque dims:", PLAQUE);
  console.log("Oval:", { rx: OVAL.rx, ry: OVAL.ry, TEXT_RX, TEXT_RY, STROKE_W });
}
