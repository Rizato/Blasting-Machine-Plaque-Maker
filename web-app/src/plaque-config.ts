import * as THREE from 'three';

// These get computed from the actual loaded STL geometry
export let PLAQUE = {
  width: 47.0,
  depth: 27.0,
  height: 4.0,
  surfaceZ: 4.0,
  centerX: 0,
  centerY: 0,
  textRaiseHeight: 1.0,
};

export let OVAL = {
  rx: 0,
  ry: 0,
  hMargin: 0.20,
  vMargin: 0.07,
  strokeFraction: 0.030,
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
  const ovalFraction = 0.60;
  OVAL.rx = (PLAQUE.width / 2) * ovalFraction;
  OVAL.ry = (PLAQUE.depth / 2) * ovalFraction;
  OVAL.hMargin = 0.20;
  OVAL.vMargin = 0.07;
  OVAL.strokeFraction = 0.030;

  TEXT_RX = OVAL.rx * (1.0 - OVAL.hMargin);
  TEXT_RY = OVAL.ry * (1.0 - OVAL.vMargin);
  STROKE_W = Math.max(0.3, PLAQUE.width * OVAL.strokeFraction);

  console.log('Plaque dims:', PLAQUE);
  console.log('Oval:', { rx: OVAL.rx, ry: OVAL.ry, TEXT_RX, TEXT_RY, STROKE_W });
}
