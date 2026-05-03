import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { MAGNET_OPTIONS, MAGNET_POCKET } from "./plaque-config.ts";
import type { MagnetSizeId } from "./plaque-config.ts";

const loader = new STLLoader();
const evaluator = new Evaluator();

evaluator.useGroups = false;
evaluator.attributes = ["position", "normal"];

export function loadPlaque(url: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        resolve(geometry);
      },
      undefined,
      (error) => reject(error),
    );
  });
}

export function createPlaqueWithMagnetPocket(
  baseGeometry: THREE.BufferGeometry,
  magnetSizeId: MagnetSizeId,
): THREE.BufferGeometry {
  const plaqueGeometry = baseGeometry.clone().toNonIndexed();
  plaqueGeometry.deleteAttribute("uv");
  plaqueGeometry.clearGroups();
  plaqueGeometry.computeVertexNormals();
  plaqueGeometry.computeBoundingBox();

  const pocketGeometry = createMagnetPocketGeometry(plaqueGeometry, magnetSizeId);

  const plaqueBrush = new Brush(plaqueGeometry);
  plaqueBrush.updateMatrixWorld(true);

  const pocketBrush = new Brush(pocketGeometry);
  pocketBrush.updateMatrixWorld(true);

  const result = evaluator.evaluate(plaqueBrush, pocketBrush, SUBTRACTION);
  const resultGeometry = result.geometry.clone();
  resultGeometry.computeVertexNormals();
  resultGeometry.computeBoundingBox();
  return resultGeometry;
}

function createMagnetPocketGeometry(
  plaqueGeometry: THREE.BufferGeometry,
  magnetSizeId: MagnetSizeId,
): THREE.BufferGeometry {
  const magnet = MAGNET_OPTIONS.find((option) => option.id === magnetSizeId);
  if (!magnet) {
    throw new Error(`Unsupported magnet size: ${magnetSizeId}`);
  }

  const bb = plaqueGeometry.boundingBox;
  if (!bb) {
    throw new Error("Plaque geometry is missing a bounding box.");
  }

  const pocketRadius = (magnet.diameter + MAGNET_POCKET.widthClearance) / 2;
  const pocketDepth = magnet.depth + MAGNET_POCKET.depthClearance;
  const lipRadius = MAGNET_POCKET.lipRadius;
  const openingRadius = pocketRadius + lipRadius;
  const centerX = (bb.min.x + bb.max.x) / 2;
  const centerY = (bb.min.y + bb.max.y) / 2;
  const backZ = bb.min.z;
  const plaqueThickness = bb.max.z - bb.min.z;
  const eps = 0.08;
  const arcSegments = 32;

  if (pocketDepth >= plaqueThickness) {
    throw new Error(
      `Magnet pocket depth (${pocketDepth} mm) exceeds plaque thickness (${plaqueThickness} mm).`,
    );
  }

  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0, -eps),
    new THREE.Vector2(openingRadius, -eps),
  ];

  for (let step = 1; step <= arcSegments; step++) {
    const t = step / arcSegments;
    const angle = t * (Math.PI / 2);
    profile.push(
      new THREE.Vector2(
        openingRadius - lipRadius * Math.sin(angle),
        -eps + lipRadius * (1 - Math.cos(angle)),
      ),
    );
  }

  profile.push(new THREE.Vector2(pocketRadius, pocketDepth + eps));
  profile.push(new THREE.Vector2(0, pocketDepth + eps));

  const geometry = new THREE.LatheGeometry(profile, 64);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(centerX, centerY, backZ);
  geometry.computeVertexNormals();
  return geometry.toNonIndexed();
}
