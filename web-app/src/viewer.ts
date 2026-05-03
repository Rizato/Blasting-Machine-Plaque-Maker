import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class PlaqueViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private plaqueMesh: THREE.Mesh | null = null;
  private textMesh: THREE.Mesh | null = null;
  private ovalMesh: THREE.Mesh | null = null;
  private container: HTMLElement;
  private themeMediaQuery: MediaQueryList;
  private grid: THREE.GridHelper | null = null;
  private axisLines: THREE.LineSegments | null = null;
  private readonly themeListener: () => void;
  private readonly gridMajorColorAttribute = new THREE.Color();
  private readonly gridMinorColorAttribute = new THREE.Color();

  constructor(container: HTMLElement, plaqueGeo: THREE.BufferGeometry) {
    this.container = container;
    this.themeMediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    this.themeListener = () => this.applyViewportTheme();

    this.scene = new THREE.Scene();

    // Compute camera position from actual plaque size
    plaqueGeo.computeBoundingBox();
    const bb = plaqueGeo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    const maxDim = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    const minZ = bb.min.z;

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

    this.setupSceneDecorations(cx, cy, minZ, maxDim);
    this.setupLighting(cx, cy, cz, maxDim);
    this.applyViewportTheme();
    this.themeMediaQuery.addEventListener("change", this.themeListener);

    window.addEventListener("resize", () => this.handleResize());

    this.animate();
  }

  ensureSized() {
    requestAnimationFrame(() => {
      this.handleResize();
    });
  }

  private setupSceneDecorations(cx: number, cy: number, minZ: number, size: number) {
    const gridSize = Math.max(size * 3, 120);
    const divisions = 48;
    this.grid = new THREE.GridHelper(gridSize, divisions, 0x6f90ea, 0x33405f);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.set(cx, cy, minZ - 0.15);
    (this.grid.material as THREE.Material).transparent = true;
    this.scene.add(this.grid);

    const axisExtent = gridSize * 0.5;
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx - axisExtent, cy, minZ - 0.12),
      new THREE.Vector3(cx + axisExtent, cy, minZ - 0.12),
      new THREE.Vector3(cx, cy - axisExtent, minZ - 0.12),
      new THREE.Vector3(cx, cy + axisExtent, minZ - 0.12),
    ]);
    const axisMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
    axisGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        [
          1, 0.2, 0.2,
          1, 0.2, 0.2,
          0.2, 1, 0.35,
          0.2, 1, 0.35,
        ],
        3,
      ),
    );
    this.axisLines = new THREE.LineSegments(axisGeometry, axisMaterial);
    this.scene.add(this.axisLines);
  }

  private setupLighting(cx: number, cy: number, cz: number, size: number) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdde7ff, 0x4a5677, 0.85);
    hemi.position.set(cx, cy, cz + size * 2.5);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.position.set(cx - size * 0.9, cy - size * 0.7, cz + size * 1.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.left = -size;
    keyLight.shadow.camera.right = size;
    keyLight.shadow.camera.top = size;
    keyLight.shadow.camera.bottom = -size;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = size * 5;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6eeff, 0.75);
    fillLight.position.set(cx + size * 0.9, cy + size * 0.6, cz + size * 1.2);
    this.scene.add(fillLight);

    const sideLight = new THREE.DirectionalLight(0xf4f7ff, 0.55);
    sideLight.position.set(cx + size * 1.2, cy - size * 1.1, cz + size * 0.8);
    this.scene.add(sideLight);

    const rimLight = new THREE.DirectionalLight(0xc8d7ff, 0.35);
    rimLight.position.set(cx, cy + size * 1.3, cz + size * 1.6);
    this.scene.add(rimLight);
  }

  private applyViewportTheme() {
    const isLight = this.themeMediaQuery.matches;
    this.scene.background = new THREE.Color(isLight ? 0xe9eef9 : 0x121323);

    if (this.grid) {
      const materials = Array.isArray(this.grid.material)
        ? (this.grid.material as THREE.LineBasicMaterial[])
        : ([this.grid.material, this.grid.material] as THREE.LineBasicMaterial[]);
      const [majorMaterial, minorMaterial] = materials;
      majorMaterial.opacity = isLight ? 0.6 : 0.9;
      minorMaterial.opacity = isLight ? 0.42 : 0.88;
      majorMaterial.transparent = true;
      minorMaterial.transparent = true;

      this.updateGridVertexColors(isLight);
    }

    if (this.axisLines) {
      const axisMaterial = this.axisLines.material as THREE.LineBasicMaterial;
      axisMaterial.opacity = isLight ? 0.95 : 0.9;
    }
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
      color: 0xd6d8df,
      roughness: 0.7,
      metalness: 0.05,
    });
    this.plaqueMesh = new THREE.Mesh(geometry, material);
    this.plaqueMesh.castShadow = true;
    this.plaqueMesh.receiveShadow = true;
    this.scene.add(this.plaqueMesh);
  }

  setOvalRing(geometry: THREE.BufferGeometry | null) {
    if (this.ovalMesh) {
      this.scene.remove(this.ovalMesh);
      this.ovalMesh.geometry.dispose();
      this.ovalMesh = null;
    }
    if (!geometry) return;

    const material = new THREE.MeshStandardMaterial({
      color: 0xd6d8df,
      roughness: 0.7,
      metalness: 0.05,
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
      color: 0xd6d8df,
      roughness: 0.7,
      metalness: 0.05,
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

  private updateGridVertexColors(isLight: boolean) {
    if (!this.grid) return;

    const colorAttr = this.grid.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (!colorAttr) return;

    const majorColor = this.gridMajorColorAttribute.set(isLight ? 0x2f66ff : 0x6f90ea);
    const minorColor = this.gridMinorColorAttribute.set(isLight ? 0x83a3ea : 0x4f6ba9);
    const colors = colorAttr.array as Float32Array;

    for (let i = 0; i < colors.length; i += 6) {
      const isMajorLine =
        Math.abs(colors[i] - 0.43529412150382996) < 0.01 ||
        Math.abs(colors[i] - 0.2) < 0.01 ||
        Math.abs(colors[i + 3] - 0.43529412150382996) < 0.01 ||
        Math.abs(colors[i + 3] - 0.2) < 0.01;
      const color = isMajorLine ? majorColor : minorColor;

      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
      colors[i + 3] = color.r;
      colors[i + 4] = color.g;
      colors[i + 5] = color.b;
    }

    colorAttr.needsUpdate = true;
  }
}

function mergeForExport(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVertices = 0;

  const nonIndexed = geometries.map((g) => {
    if (g.index) return g.toNonIndexed();
    return g;
  });

  for (const geo of nonIndexed) {
    totalVertices += geo.getAttribute("position").count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geo of nonIndexed) {
    const pos = geo.getAttribute("position");
    const norm = geo.getAttribute("normal");
    for (let i = 0; i < pos.count * 3; i++) {
      positions[offset * 3 + i] = (pos.array as Float32Array)[i];
      normals[offset * 3 + i] = (norm.array as Float32Array)[i];
    }
    offset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return merged;
}
