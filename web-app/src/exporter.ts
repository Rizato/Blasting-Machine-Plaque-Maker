import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

export type ExportFormat = 'stl' | '3mf';

export function exportModel(geometry: THREE.BufferGeometry, text: string, format: ExportFormat) {
  if (format === '3mf') {
    export3MF(geometry, text);
  } else {
    exportSTL(geometry, text);
  }
}

function exportSTL(geometry: THREE.BufferGeometry, text: string) {
  const mesh = new THREE.Mesh(geometry);
  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary: true });

  download(new Blob([result], { type: 'application/octet-stream' }), text, 'stl');
}

function export3MF(geometry: THREE.BufferGeometry, text: string) {
  // Expand to non-indexed so we have raw triangles
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = nonIndexed.getAttribute('position');
  const triCount = Math.floor(positions.count / 3);

  // Deduplicate vertices using a spatial hash map
  // Round to 4 decimal places (~0.1 micron precision) for dedup
  const precision = 10000;
  const vertexMap = new Map<string, number>();
  const uniqueVerts: number[] = []; // flat [x,y,z, x,y,z, ...]
  const triangles: number[] = [];   // flat [v1,v2,v3, v1,v2,v3, ...]

  function getVertexIndex(x: number, y: number, z: number): number {
    const rx = Math.round(x * precision) / precision;
    const ry = Math.round(y * precision) / precision;
    const rz = Math.round(z * precision) / precision;
    const key = `${rx},${ry},${rz}`;
    const existing = vertexMap.get(key);
    if (existing !== undefined) return existing;
    const idx = uniqueVerts.length / 3;
    vertexMap.set(key, idx);
    uniqueVerts.push(rx, ry, rz);
    return idx;
  }

  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    const v1 = getVertexIndex(positions.getX(i), positions.getY(i), positions.getZ(i));
    const v2 = getVertexIndex(positions.getX(i + 1), positions.getY(i + 1), positions.getZ(i + 1));
    const v3 = getVertexIndex(positions.getX(i + 2), positions.getY(i + 2), positions.getZ(i + 2));

    // Skip degenerate triangles
    if (v1 === v2 || v2 === v3 || v1 === v3) continue;

    triangles.push(v1, v2, v3);
  }

  // Build XML
  const vertLines: string[] = [];
  for (let i = 0; i < uniqueVerts.length; i += 3) {
    vertLines.push(`          <vertex x="${uniqueVerts[i]}" y="${uniqueVerts[i + 1]}" z="${uniqueVerts[i + 2]}" />`);
  }

  const triLines: string[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    triLines.push(`          <triangle v1="${triangles[i]}" v2="${triangles[i + 1]}" v3="${triangles[i + 2]}" />`);
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${vertLines.join('\n')}
        </vertices>
        <triangles>
${triLines.join('\n')}
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  const zip = buildZip([
    { name: '[Content_Types].xml', data: new TextEncoder().encode(contentTypesXml) },
    { name: '_rels/.rels', data: new TextEncoder().encode(relsXml) },
    { name: '3D/3dmodel.model', data: new TextEncoder().encode(modelXml) },
  ]);

  download(new Blob([zip.buffer as ArrayBuffer], { type: 'application/vnd.ms-package.3dmanufacturing' }), text, '3mf');
}

function download(blob: Blob, text: string, ext: string) {
  const safeName = text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plaque-${safeName}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Minimal ZIP builder (store-only, no compression) ────────────────────────

interface ZipEntry { name: string; data: Uint8Array; }

function buildZip(entries: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);

    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, entry.data.length, true);
    lv.setUint32(22, entry.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local).set(nameBytes, 30);

    localHeaders.push(new Uint8Array(local));
    localHeaders.push(entry.data);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central).set(nameBytes, 46);

    centralHeaders.push(new Uint8Array(central));
    offset += 30 + nameBytes.length + entry.data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);
  ev.setUint16(20, 0, true);

  const parts = [...localHeaders, ...centralHeaders, new Uint8Array(eocd)];
  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) { result.set(p, pos); pos += p.length; }

  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
