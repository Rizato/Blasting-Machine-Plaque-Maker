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

async function export3MF(geometry: THREE.BufferGeometry, text: string) {
  // 3MF is a ZIP containing XML files describing the mesh
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = nonIndexed.getAttribute('position');

  // Build vertex list and triangle list
  let verticesXml = '';
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i).toFixed(6);
    const y = positions.getY(i).toFixed(6);
    const z = positions.getZ(i).toFixed(6);
    verticesXml += `          <vertex x="${x}" y="${y}" z="${z}" />\n`;
  }

  let trianglesXml = '';
  for (let i = 0; i < positions.count; i += 3) {
    trianglesXml += `          <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" />\n`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${verticesXml}        </vertices>
        <triangles>
${trianglesXml}        </triangles>
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

  // Build ZIP using the compression streams API isn't available everywhere,
  // so we build an uncompressed ZIP manually (3MF spec allows stored entries)
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

    // Local file header (30 + name + data)
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);  // signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // compression: store
    lv.setUint16(10, 0, true);           // mod time
    lv.setUint16(12, 0, true);           // mod date
    lv.setUint32(14, crc, true);         // crc32
    lv.setUint32(18, entry.data.length, true); // compressed size
    lv.setUint32(22, entry.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);  // name length
    lv.setUint16(28, 0, true);           // extra length
    new Uint8Array(local).set(nameBytes, 30);

    localHeaders.push(new Uint8Array(local));
    localHeaders.push(entry.data);

    // Central directory header (46 + name)
    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);  // signature
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0, true);            // flags
    cv.setUint16(10, 0, true);           // compression
    cv.setUint16(12, 0, true);           // mod time
    cv.setUint16(14, 0, true);           // mod date
    cv.setUint32(16, crc, true);
    cv.setUint32(20, entry.data.length, true);
    cv.setUint32(24, entry.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);           // extra length
    cv.setUint16(32, 0, true);           // comment length
    cv.setUint16(34, 0, true);           // disk number
    cv.setUint16(36, 0, true);           // internal attrs
    cv.setUint32(38, 0, true);           // external attrs
    cv.setUint32(42, offset, true);      // local header offset
    new Uint8Array(central).set(nameBytes, 46);

    centralHeaders.push(new Uint8Array(central));
    offset += 30 + nameBytes.length + entry.data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  // End of central directory (22 bytes)
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
