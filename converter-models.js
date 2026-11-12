const FORMATS = [
  { value: 'stl', label: 'STL · binär triangelyta' },
  { value: '3mf', label: '3MF · modell i millimeter' },
  { value: 'obj', label: 'OBJ · geometri utan material' }
];
const CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const PRODUCTION = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';
const RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const MODEL_RELATION = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';
const MAX_TRIANGLES = 500000;
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_UNPACKED = 80 * 1024 * 1024;
const UNITS = { micron: .001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export function modelOutputs(extension) {
  return /^(stl|3mf|obj)$/i.test(String(extension || '').replace(/^\./, '')) ? FORMATS.map(item => ({ ...item })) : [];
}

function fail(message) { throw new Error(message); }
function abort(signal) { if (signal?.aborted) throw new DOMException('Konverteringen avbröts.', 'AbortError'); }
async function breathe(signal) { abort(signal); await new Promise(resolve => setTimeout(resolve, 0)); abort(signal); }
function number(value, message = 'Modellen innehåller en ogiltig koordinat.') {
  if (value === null || String(value).trim() === '') fail(message);
  const result = Number(value);
  if (!Number.isFinite(result) || Math.abs(result) > 1e9) fail(message);
  return result === 0 ? 0 : result;
}
function integer(value, minimum = 0) {
  const result = Number(value);
  if (value === null || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(result) || result < minimum) fail('Modellen har en ogiltig referens eller ett ogiltigt index.');
  return result;
}
function childElements(node, name, namespace = CORE) {
  return Array.from(node.children).filter(child => child.localName === name && child.namespaceURI === namespace);
}
function oneChild(node, name) {
  const found = childElements(node, name);
  if (found.length !== 1) fail(`3MF-modellen saknar eller har flera ${name}-delar.`);
  return found[0];
}
function parseXml(bytes, description) {
  let text;
  try { text = decoder.decode(bytes); } catch { fail(`${description} är inte giltig UTF-8.`); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail('XML med dokumenttyper eller externa entiteter stöds inte.');
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length || document.documentElement.localName === 'parsererror') fail(`${description} innehåller felaktig XML.`);
  return document;
}
function safePath(value, base = '') {
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { fail('3MF-filen innehåller en ogiltig intern sökväg.'); }
  if (!decoded || /[\\\u0000-\u001f?#:]/.test(decoded) || decoded.startsWith('//')) fail('3MF-filen hänvisar till en sökväg som inte stöds.');
  const parts = (decoded.startsWith('/') ? decoded.slice(1) : base + decoded).split('/');
  const output = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') { if (!output.length) fail('3MF-filen har en ogiltig intern sökväg.'); output.pop(); }
    else output.push(part);
  }
  return output.join('/');
}
function matrix(value, scale = 1) {
  if (!value) return IDENTITY.slice();
  const values = value.trim().split(/\s+/).map(item => number(item, '3MF-modellen har en ogiltig transformation.'));
  if (values.length !== 12) fail('En 3MF-transformation måste innehålla tolv tal.');
  values[9] *= scale; values[10] *= scale; values[11] *= scale;
  if (Math.abs(determinant(values)) < 1e-12) fail('Modellen har en transformation som plattar till geometrin till noll.');
  return values;
}
function determinant(m) { return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[3] * (m[1] * m[8] - m[2] * m[7]) + m[6] * (m[1] * m[5] - m[2] * m[4]); }
// 3MF stores row-vector matrices; composition below maps child space into parent space.
function compose(parent, local) {
  const result = Array(12).fill(0);
  for (let column = 0; column < 3; column++) {
    for (let row = 0; row < 3; row++) result[column * 3 + row] = parent[row] * local[column * 3] + parent[3 + row] * local[column * 3 + 1] + parent[6 + row] * local[column * 3 + 2];
    result[9 + column] = parent[column] * local[9] + parent[3 + column] * local[10] + parent[6 + column] * local[11] + parent[9 + column];
  }
  return result;
}
function point(x, y, z, m = IDENTITY) {
  return [number(x * m[0] + y * m[3] + z * m[6] + m[9]), number(x * m[1] + y * m[4] + z * m[7] + m[10]), number(x * m[2] + y * m[5] + z * m[8] + m[11])];
}
class Mesh {
  constructor() { this.parts = []; this.buffer = new Float64Array(9 * 4096); this.used = 0; this.triangles = 0; this.min = [Infinity, Infinity, Infinity]; this.max = [-Infinity, -Infinity, -Infinity]; }
  add(a, b, c) {
    if (++this.triangles > MAX_TRIANGLES) fail('Modellen får innehålla högst 500 000 trianglar efter att alla delar har placerats.');
    for (const vertex of [a, b, c]) for (let axis = 0; axis < 3; axis++) {
      const value = number(vertex[axis]);
      this.buffer[this.used++] = value;
      this.min[axis] = Math.min(this.min[axis], value); this.max[axis] = Math.max(this.max[axis], value);
    }
    if (this.used === this.buffer.length) { this.parts.push(this.buffer); this.buffer = new Float64Array(9 * 4096); this.used = 0; }
  }
  finish() {
    if (!this.triangles) fail('Modellen innehåller inga triangelytor att konvertera.');
    const points = new Float64Array(this.triangles * 9);
    let offset = 0;
    for (const part of this.parts) { points.set(part, offset); offset += part.length; }
    points.set(this.buffer.subarray(0, this.used), offset);
    this.parts.length = 0; this.buffer = null;
    return { points, triangles: this.triangles, bounds: { min: this.min, max: this.max }, sizeMm: this.max.map((value, index) => value - this.min[index]) };
  }
}

async function readStl(bytes, signal) {
  const mesh = new Mesh();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = bytes.length >= 84 ? view.getUint32(80, true) : 0;
  if (bytes.length >= 84 && 84 + count * 50 === bytes.length) {
    if (count > MAX_TRIANGLES) fail('Modellen får innehålla högst 500 000 trianglar.');
    for (let i = 0; i < count; i++) {
      const offset = 84 + i * 50 + 12;
      const triangle = [0, 1, 2].map(vertex => [0, 1, 2].map(axis => view.getFloat32(offset + vertex * 12 + axis * 4, true)));
      mesh.add(...triangle);
      if (i % 4096 === 0) await breathe(signal);
    }
  } else {
    let text;
    try { text = decoder.decode(bytes); } catch { fail('STL-filen är skadad eller har felaktig längd.'); }
    if (!/^\s*solid(?:\s|$)/i.test(text) || !/endsolid(?:\s|$)/i.test(text)) fail('Filen är inte en läsbar ASCII- eller binär STL.');
    const facets = text.split(/\bendfacet\b/i);
    if (facets.length - 1 > MAX_TRIANGLES) fail('Modellen får innehålla högst 500 000 trianglar.');
    let found = 0;
    for (let facetIndex = 0; facetIndex < facets.length - 1; facetIndex++) {
      const block = facets[facetIndex];
      if ((block.match(/\bfacet\s+normal\b/gi) || []).length !== 1) fail('STL-filen innehåller ofullständiga ytor.');
      const facet = /\bfacet\s+normal\s+[^\r\n]+\s+outer\s+loop\s+([\s\S]*?)\s+endloop\s*$/i.exec(block);
      if (!facet) fail('STL-filen innehåller ofullständiga ytor.');
      const vertices = [...facet[1].matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi)];
      if (vertices.length !== 3) fail('En STL-yta innehåller inte exakt tre hörn.');
      mesh.add(...vertices.map(match => match.slice(1).map(item => number(item))));
      if (++found % 4096 === 0) await breathe(signal);
    }
    if (found !== (text.match(/\bfacet\s+normal\b/gi) || []).length) fail('STL-filen innehåller ofullständiga ytor.');
  }
  return mesh.finish();
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});
function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 255];
  return (crc ^ -1) >>> 0;
}

// Inspect ZIP metadata before allocating inflation buffers. Only model/relationship
// parts are read; thumbnails, printer profiles and external URLs are never opened.
async function readPackage(bytes, signal, zip) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.length) break;
  if (end < Math.max(0, bytes.length - 65557)) fail('3MF-filen är inte ett giltigt ZIP-paket.');
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) fail('Delade ZIP-paket stöds inte.');
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (count > 2048 || count === 65535 || offset + directorySize !== end) fail('3MF-paketet är för komplext eller använder ZIP64, som inte stöds.');
  const entries = new Map();
  let expanded = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) fail('3MF-paketets filförteckning är skadad.');
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    if (next > end || compressed === 0xffffffff || size === 0xffffffff || local === 0xffffffff || (flags & 1)) fail('Krypterade eller ogiltiga ZIP-paket stöds inte.');
    expanded += size;
    if (expanded > MAX_UNPACKED) fail('3MF-paketet blir större än 80 MB när det packas upp. Välj en mindre modell.');
    let rawName;
    try { rawName = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)); } catch { fail('3MF-paketet har ett filnamn som inte stöds.'); }
    const name = safePath(rawName);
    if (entries.has(name)) fail('3MF-paketet innehåller dubbla filnamn.');
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) fail('3MF-paketets filinformation är skadad.');
    const dataOffset = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (dataOffset + compressed > end || ![0, 8].includes(method)) fail('3MF-paketet använder en komprimering som inte stöds.');
    entries.set(name, { name, method, compressed, size, dataOffset, crc: view.getUint32(offset + 16, true) });
    offset = next;
  }
  if (offset !== end) fail('3MF-paketets filförteckning är ofullständig.');
  const extracted = new Map();
  return async function get(name) {
    if (extracted.has(name)) return extracted.get(name);
    const entry = entries.get(name);
    if (!entry) fail(`3MF-paketet saknar en refererad modelldel: ${name}`);
    if (extracted.size >= 64) fail('3MF-paketet innehåller för många modelldelar.');
    await breathe(signal);
    let result;
    const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressed);
    try { result = entry.method === 0 ? compressed.slice() : zip.inflateSync(compressed, { out: new Uint8Array(entry.size) }); }
    catch { fail('En del i 3MF-paketet kunde inte packas upp.'); }
    if (result.length !== entry.size || crc32(result) !== entry.crc) fail('3MF-paketet innehåller skadade eller ofullständiga data.');
    abort(signal);
    extracted.set(name, result);
    return result;
  };
}

async function read3mf(bytes, signal, zip) {
  if (bytes.length < 22) fail('3MF-filen är för kort för att vara ett giltigt paket.');
  const getPart = await readPackage(bytes, signal, zip);
  const relationships = parseXml(await getPart('_rels/.rels'), 'Paketets relationer');
  const roots = Array.from(relationships.getElementsByTagNameNS(RELATIONSHIPS, 'Relationship')).filter(node => node.getAttribute('Type') === MODEL_RELATION);
  if (roots.length !== 1 || roots[0].getAttribute('TargetMode') === 'External') fail('3MF-paketet måste ha exakt en intern huvudmodell.');
  const rootPath = safePath(roots[0].getAttribute('Target'));
  const models = new Map();
  let totalVertices = 0;
  let totalSourceTriangles = 0;
  async function model(path) {
    if (models.has(path)) return models.get(path);
    const document = parseXml(await getPart(path), '3MF-modellen');
    const element = document.documentElement;
    if (element.localName !== 'model' || element.namespaceURI !== CORE) fail('3MF-filen använder en modellversion som inte stöds.');
    const unit = element.getAttribute('unit') || 'millimeter';
    const scale = UNITS[unit];
    if (!scale) fail('3MF-modellens måttenhet stöds inte.');
    for (const prefix of (element.getAttribute('requiredextensions') || '').split(/\s+/).filter(Boolean)) {
      if (element.lookupNamespaceURI(prefix) !== PRODUCTION) fail(`3MF-filen kräver en utökning (${prefix}) som verktyget inte stöder. Exportera en vanlig meshmodell först.`);
    }
    const resources = oneChild(element, 'resources');
    const objects = new Map();
    for (const object of childElements(resources, 'object')) {
      const id = integer(object.getAttribute('id'), 1);
      if (objects.has(id) || objects.size >= 10000) fail('3MF-modellen har dubbla eller för många objekt.');
      objects.set(id, { element: object, mesh: null });
    }
    const result = { element, scale, objects, path };
    models.set(path, result);
    return result;
  }
  const rootModel = await model(rootPath);
  const output = new Mesh();
  let visits = 0;
  async function visit(path, id, transform, ancestors) {
    abort(signal);
    if (++visits > 100000 || ancestors.size >= 64) fail('Modellen har för många eller för djupt nästlade komponenter.');
    const key = `${path}#${id}`;
    if (ancestors.has(key)) fail('3MF-modellen har en cirkulär komponentreferens.');
    const current = await model(path);
    const resource = current.objects.get(id);
    if (!resource) fail('3MF-modellen hänvisar till ett objekt som saknas.');
    if ((resource.element.getAttribute('type') || 'model') !== 'model') fail('3MF-byggdelen innehåller ett objekt som inte är en vanlig modell.');
    const meshes = childElements(resource.element, 'mesh');
    const components = childElements(resource.element, 'components');
    if (meshes.length + components.length !== 1) fail('Ett 3MF-objekt måste innehålla antingen en mesh eller komponenter.');
    if (meshes.length) {
      if (!resource.mesh) {
        const vertices = childElements(oneChild(meshes[0], 'vertices'), 'vertex');
        const triangles = childElements(oneChild(meshes[0], 'triangles'), 'triangle');
        totalVertices += vertices.length; totalSourceTriangles += triangles.length;
        if (totalVertices > 1500000 || totalSourceTriangles > MAX_TRIANGLES) fail('3MF-modellen innehåller för många hörn eller trianglar.');
        const positions = new Float64Array(vertices.length * 3);
        for (let index = 0; index < vertices.length; index++) {
          for (let axis = 0; axis < 3; axis++) positions[index * 3 + axis] = number(vertices[index].getAttribute(['x', 'y', 'z'][axis])) * current.scale;
          if (index % 8192 === 0) await breathe(signal);
        }
        const indices = new Uint32Array(triangles.length * 3);
        for (let index = 0; index < triangles.length; index++) {
          for (let corner = 0; corner < 3; corner++) {
            const vertex = integer(triangles[index].getAttribute(`v${corner + 1}`));
            if (vertex >= vertices.length) fail('En triangel hänvisar till ett hörn som saknas.');
            indices[index * 3 + corner] = vertex;
          }
          if (index % 8192 === 0) await breathe(signal);
        }
        resource.mesh = { positions, indices };
      }
      const { positions, indices } = resource.mesh;
      const mirrored = determinant(transform) < 0;
      for (let index = 0; index < indices.length; index += 3) {
        const triangle = [0, 1, 2].map(corner => { const start = indices[index + corner] * 3; return point(positions[start], positions[start + 1], positions[start + 2], transform); });
        output.add(triangle[0], triangle[mirrored ? 2 : 1], triangle[mirrored ? 1 : 2]);
        if (index % (4096 * 3) === 0) await breathe(signal);
      }
    } else {
      const nested = new Set(ancestors); nested.add(key);
      for (const component of childElements(components[0], 'component')) {
        const target = component.getAttributeNS(PRODUCTION, 'path');
        if (target && path !== rootPath) fail('Endast huvudmodellen får hänvisa till andra modelldelar i 3MF.');
        const targetPath = target ? safePath(target, path.slice(0, path.lastIndexOf('/') + 1)) : path;
        await visit(targetPath, integer(component.getAttribute('objectid'), 1), compose(transform, matrix(component.getAttribute('transform'), current.scale)), nested);
      }
    }
  }
  for (const item of childElements(oneChild(rootModel.element, 'build'), 'item')) {
    const target = item.getAttributeNS(PRODUCTION, 'path');
    const path = target ? safePath(target, rootPath.slice(0, rootPath.lastIndexOf('/') + 1)) : rootPath;
    await visit(path, integer(item.getAttribute('objectid'), 1), matrix(item.getAttribute('transform'), rootModel.scale), new Set());
  }
  return output.finish();
}

async function readObj(bytes, signal, earcut) {
  let text;
  try { text = decoder.decode(bytes); } catch { fail('OBJ-filen är inte en läsbar textfil.'); }
  const vertices = [];
  const mesh = new Mesh();
  let lineNumber = 0;
  for (const line of text.replace(/\\\r?\n/g, ' ').split(/\r?\n/)) {
    const fields = line.split('#')[0].trim().split(/\s+/);
    const kind = fields.shift();
    if (kind === 'v') {
      if (fields.length < 3 || vertices.length >= 1500000) fail('OBJ-filen har ogiltiga eller för många hörn.');
      const w = fields.length === 4 ? number(fields[3]) : 1;
      if (!w) fail('OBJ-filen innehåller ett hörn med ogiltig vikt.');
      vertices.push(fields.slice(0, 3).map(value => number(value) / w));
    } else if (kind === 'f') {
      if (fields.length < 3 || fields.length > 4096) fail('En OBJ-yta har för få eller för många hörn.');
      const face = fields.map(field => {
        const token = field.split('/')[0];
        if (!/^-?\d+$/.test(token)) fail('OBJ-filen innehåller en ogiltig hörnreferens.');
        const index = Number(token); const offset = index < 0 ? vertices.length + index : index - 1;
        if (!Number.isSafeInteger(index) || offset < 0 || offset >= vertices.length) fail('En OBJ-yta hänvisar till ett hörn som saknas.');
        return vertices[offset];
      });
      if (face.length === 3) mesh.add(...face);
      else {
        const normal = [0, 0, 0];
        for (let i = 0; i < face.length; i++) {
          const a = face[i], b = face[(i + 1) % face.length];
          normal[0] += (a[1] - b[1]) * (a[2] + b[2]); normal[1] += (a[2] - b[2]) * (a[0] + b[0]); normal[2] += (a[0] - b[0]) * (a[1] + b[1]);
        }
        const length = Math.hypot(...normal);
        if (length < 1e-15) fail('OBJ-filen innehåller en platt eller självskärande polygon utan tydlig yta.');
        const n = normal.map(value => value / length);
        const extent = Math.max(1, ...face.map(v => Math.hypot(...v.map((value, i) => value - face[0][i]))));
        if (face.some(v => Math.abs(v.reduce((sum, value, axis) => sum + (value - face[0][axis]) * n[axis], 0)) > extent * 1e-5)) fail('OBJ-filen innehåller böjda polygoner. Triangulera modellen i ditt 3D-program före konvertering.');
        const dominant = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
        const axes = dominant === 0 ? [1, 2] : dominant === 1 ? [2, 0] : [0, 1];
        const flattened = face.flatMap(v => axes.map(axis => v[axis]));
        const triangles = earcut.default(flattened);
        if (!triangles.length || earcut.deviation(flattened, null, 2, triangles) > 1e-5) fail('En OBJ-polygon kunde inte trianguleras säkert.');
        for (let i = 0; i < triangles.length; i += 3) {
          const a = face[triangles[i]], b = face[triangles[i + 1]], c = face[triangles[i + 2]];
          const orientation = (b[axes[0]] - a[axes[0]]) * (c[axes[1]] - a[axes[1]]) - (b[axes[1]] - a[axes[1]]) * (c[axes[0]] - a[axes[0]]);
          mesh.add(a, orientation * normal[dominant] < 0 ? c : b, orientation * normal[dominant] < 0 ? b : c);
        }
      }
    } else if (['curv', 'curv2', 'surf'].includes(kind)) fail('OBJ-filen innehåller kurvor eller CAD-ytor. Exportera en triangulerad mesh först.');
    if (++lineNumber % 4096 === 0) await breathe(signal);
  }
  return mesh.finish();
}

async function writeStl(mesh, signal) {
  const buffer = new ArrayBuffer(84 + mesh.triangles * 50);
  const bytes = new Uint8Array(buffer); bytes.set(encoder.encode('Converted with Obsidian Ink | units: millimeters'));
  const view = new DataView(buffer); view.setUint32(80, mesh.triangles, true);
  for (let triangle = 0; triangle < mesh.triangles; triangle++) {
    const source = triangle * 9; const target = 84 + triangle * 50;
    const p = mesh.points;
    const u = [p[source + 3] - p[source], p[source + 4] - p[source + 1], p[source + 5] - p[source + 2]];
    const v = [p[source + 6] - p[source], p[source + 7] - p[source + 1], p[source + 8] - p[source + 2]];
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...normal) || 1;
    for (let axis = 0; axis < 3; axis++) view.setFloat32(target + axis * 4, normal[axis] / length, true);
    for (let axis = 0; axis < 9; axis++) view.setFloat32(target + 12 + axis * 4, p[source + axis], true);
    if (triangle % 4096 === 0) await breathe(signal);
  }
  return new Blob([buffer], { type: 'model/stl' });
}
function numeric(value) { return String(Number(value.toPrecision(12))); }
async function indexedMesh(mesh, signal) {
  const map = new Map(); const vertices = []; const indices = new Uint32Array(mesh.points.length / 3);
  for (let index = 0; index < mesh.points.length; index += 3) {
    const xyz = [mesh.points[index], mesh.points[index + 1], mesh.points[index + 2]];
    const key = xyz.join(',');
    let id = map.get(key);
    if (id === undefined) { id = vertices.length; map.set(key, id); vertices.push(xyz); }
    indices[index / 3] = id;
    if (index % (4096 * 9) === 0) await breathe(signal);
  }
  return { vertices, indices };
}
async function write3mf(mesh, signal, zip) {
  const indexed = await indexedMesh(mesh, signal);
  const parts = ['<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="sv-SE" xmlns="' + CORE + '"><metadata name="Application">Obsidian Ink / AltisDank</metadata><resources><object id="1" type="model"><mesh><vertices>'];
  for (let i = 0; i < indexed.vertices.length; i++) {
    const v = indexed.vertices[i]; parts.push(`<vertex x="${numeric(v[0])}" y="${numeric(v[1])}" z="${numeric(v[2])}"/>`);
    if (i % 8192 === 0) await breathe(signal);
  }
  parts.push('</vertices><triangles>');
  for (let i = 0; i < indexed.indices.length; i += 3) {
    parts.push(`<triangle v1="${indexed.indices[i]}" v2="${indexed.indices[i + 1]}" v3="${indexed.indices[i + 2]}"/>`);
    if (i % (8192 * 3) === 0) await breathe(signal);
  }
  parts.push('</triangles></mesh></object></resources><build><item objectid="1"/></build></model>');
  const xml = encoder.encode(parts.join(''));
  if (xml.length > MAX_UNPACKED) fail('Den färdiga 3MF-modellen blir för stor för verktyget. Förenkla modellen först.');
  await breathe(signal);
  const packed = zip.zipSync({
    '[Content_Types].xml': encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    '_rels/.rels': encoder.encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="' + RELATIONSHIPS + '"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="' + MODEL_RELATION + '"/></Relationships>'),
    '3D/3dmodel.model': xml
  }, { level: 6 });
  abort(signal);
  return new Blob([packed], { type: 'model/3mf' });
}
async function writeObj(mesh, signal) {
  const indexed = await indexedMesh(mesh, signal);
  const parts = ['# Converted with Obsidian Ink\n# Coordinates in millimeters; geometry only\no ConvertedMesh\n'];
  for (let i = 0; i < indexed.vertices.length; i++) {
    parts.push(`v ${indexed.vertices[i].map(numeric).join(' ')}\n`);
    if (i % 8192 === 0) await breathe(signal);
  }
  for (let i = 0; i < indexed.indices.length; i += 3) {
    parts.push(`f ${indexed.indices[i] + 1} ${indexed.indices[i + 1] + 1} ${indexed.indices[i + 2] + 1}\n`);
    if (i % (8192 * 3) === 0) await breathe(signal);
  }
  return new Blob(parts, { type: 'model/obj' });
}

export async function convertModel(file, format, { onProgress, signal } = {}) {
  abort(signal);
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (!modelOutputs(extension).some(item => item.value === format)) fail('Välj en STL-, 3MF- eller OBJ-fil och ett målformat från listan.');
  if (!file.size) fail('Modellfilen är tom.');
  if (file.size > MAX_BYTES) fail('Modellfilen får vara högst 25 MB.');
  onProgress?.(.03, 'Läser 3D-modellen…');
  const bytes = new Uint8Array(await file.arrayBuffer());
  abort(signal);
  const zip = extension === '3mf' || format === '3mf' ? await import('./vendor/models/fflate.js') : null;
  onProgress?.(.12, 'Kontrollerar modellens ytor och mått…');
  let mesh;
  if (extension === 'stl') mesh = await readStl(bytes, signal);
  else if (extension === '3mf') mesh = await read3mf(bytes, signal, zip);
  else mesh = await readObj(bytes, signal, await import('./vendor/models/earcut.js'));
  abort(signal);
  onProgress?.(.62, `Skapar ${format.toUpperCase()}…`);
  const blob = format === 'stl' ? await writeStl(mesh, signal) : format === '3mf' ? await write3mf(mesh, signal, zip) : await writeObj(mesh, signal);
  abort(signal);
  const warnings = [
    'Bara modellens triangelytor följer med. Färger, texturer, material, separata objektnamn och slicerinställningar tas bort.',
    extension === '3mf' ? '3MF-filens enheter och placeringar har räknats om till millimeter.' : 'STL och OBJ saknar säker måttenhet. Koordinaterna tolkas som millimeter.',
    'Delar behåller sin placering men samlas i en mesh. Överlappande ytor slås inte ihop och modellen repareras inte automatiskt.'
  ];
  if (format === 'stl' || format === 'obj') warnings.push('Välj millimeter när du importerar resultatet i ditt 3D-program.');
  const basename = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 150) || 'modell';
  const dimensions = mesh.sizeMm.map(value => value.toLocaleString('sv-SE', { maximumFractionDigits: 3 })).join(' × ') + ` mm · ${mesh.triangles.toLocaleString('sv-SE')} trianglar`;
  onProgress?.(1, '3D-modellen är klar.');
  return { blob, filename: `${basename}-konverterad.${format}`, warnings, dimensions, details: { triangles: mesh.triangles, sizeMm: mesh.sizeMm, bounds: mesh.bounds, unit: 'millimeter' } };
}
