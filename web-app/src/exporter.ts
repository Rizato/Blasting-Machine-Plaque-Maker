import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export function exportSTL(geometry: THREE.BufferGeometry, text: string) {
  const mesh = new THREE.Mesh(geometry);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary: true });

  const blob = new Blob([result], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const safeName = text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const filename = `plaque-${safeName}.stl`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
