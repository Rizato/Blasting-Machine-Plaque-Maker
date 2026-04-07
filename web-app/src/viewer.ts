import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class PlaqueViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private plaqueMesh: THREE.Mesh | null = null;
  private textMesh: THREE.Mesh | null = null;
  private ovalMesh: THREE.Mesh | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement, plaqueGeo: THREE.BufferGeometry) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);

    // Compute camera position from actual plaque size
    plaqueGeo.computeBoundingBox();
    const bb = plaqueGeo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    const maxDim = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(cx, cy - maxDim * 0.8, cz + maxDim * 1.2);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(cx, cy, cz);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = maxDim * 0.3;
    this.controls.maxDistance = maxDim * 5;
    this.controls.update();

    this.setupLighting(cx, cy, maxDim);

    window.addEventListener('resize', () => this.handleResize());

    this.animate();
  }

  ensureSized() {
    requestAnimationFrame(() => {
      this.handleResize();
    });
  }

  private setupLighting(cx: number, cy: number, size: number) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(cx - size, cy - size * 0.5, size * 1.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(cx + size * 0.5, cy + size * 0.3, size);
    this.scene.add(fillLight);
  }

  private handleResize() {
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setPlaque(geometry: THREE.BufferGeometry) {
    if (this.plaqueMesh) {
      this.scene.remove(this.plaqueMesh);
      this.plaqueMesh.geometry.dispose();
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.plaqueMesh = new THREE.Mesh(geometry, material);
    this.plaqueMesh.castShadow = true;
    this.plaqueMesh.receiveShadow = true;
    this.scene.add(this.plaqueMesh);
  }

  setOvalRing(geometry: THREE.BufferGeometry) {
    if (this.ovalMesh) {
      this.scene.remove(this.ovalMesh);
      this.ovalMesh.geometry.dispose();
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.ovalMesh = new THREE.Mesh(geometry, material);
    this.ovalMesh.castShadow = true;
    this.ovalMesh.receiveShadow = true;
    this.scene.add(this.ovalMesh);
  }

  setTextGeometry(geometry: THREE.BufferGeometry | null) {
    if (this.textMesh) {
      this.scene.remove(this.textMesh);
      this.textMesh.geometry.dispose();
    }
    if (!geometry) return;

    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.textMesh = new THREE.Mesh(geometry, material);
    this.textMesh.castShadow = true;
    this.textMesh.receiveShadow = true;
    this.scene.add(this.textMesh);
  }

  getCombinedGeometry(): THREE.BufferGeometry | null {
    const geos: THREE.BufferGeometry[] = [];
    if (this.plaqueMesh) geos.push(this.plaqueMesh.geometry);
    if (this.ovalMesh) geos.push(this.ovalMesh.geometry);
    if (this.textMesh) geos.push(this.textMesh.geometry);
    if (geos.length === 0) return null;
    if (geos.length === 1) return geos[0].clone();

    return mergeForExport(geos);
  }

  hasText(): boolean {
    return this.textMesh !== null;
  }
}

function mergeForExport(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVertices = 0;

  const nonIndexed = geometries.map(g => {
    if (g.index) return g.toNonIndexed();
    return g;
  });

  for (const geo of nonIndexed) {
    totalVertices += geo.getAttribute('position').count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geo of nonIndexed) {
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    for (let i = 0; i < pos.count * 3; i++) {
      positions[offset * 3 + i] = (pos.array as Float32Array)[i];
      normals[offset * 3 + i] = (norm.array as Float32Array)[i];
    }
    offset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}
