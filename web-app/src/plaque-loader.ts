import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const loader = new STLLoader();

export function loadPlaque(url: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (geometry) => {
        geometry.computeVertexNormals();
        resolve(geometry);
      },
      undefined,
      (error) => reject(error)
    );
  });
}
