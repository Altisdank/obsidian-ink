const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'g', 'defs', 'symbol', 'use', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'marker']);
const SVG_ATTRIBUTES = new Set(('id x y x1 y1 x2 y2 cx cy r rx ry width height viewBox preserveAspectRatio d points transform fill stroke fill-opacity stroke-opacity opacity stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset fill-rule clip-rule clip-path mask display visibility color font-size font-family font-style font-weight text-anchor dominant-baseline letter-spacing word-spacing dx dy rotate baseline-shift textLength lengthAdjust gradientUnits gradientTransform spreadMethod offset stop-color stop-opacity fx fy fr patternUnits patternContentUnits patternTransform clipPathUnits maskUnits maskContentUnits markerWidth markerHeight refX refY orient markerUnits marker-start marker-mid marker-end').split(' '));
const STYLE_ATTRIBUTES = new Set(('fill stroke fill-opacity stroke-opacity opacity stroke-width stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset fill-rule clip-rule clip-path mask display visibility color font-size font-family font-style font-weight text-anchor dominant-baseline letter-spacing word-spacing baseline-shift marker-start marker-mid marker-end').split(' '));
const LOCAL_REFERENCE = /^url\(\s*(['"]?)#([A-Za-z_][\w:.-]*)\1\s*\)$/i;

function svgLength(value) {
  const match = /^\s*(\d*\.?\d+)(px|in|cm|mm|pt|pc)?\s*$/i.exec(value || '');
  if (!match) return 0;
  return Number(match[1]) * ({ px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 96 / 72, pc: 16 }[match[2]?.toLowerCase() || 'px']);
}

// The source SVG never enters the page DOM. Rebuild a small, inert SVG vocabulary.
export function sanitizeSvgForRaster(source) {
  if (source.length > 5 * 1024 * 1024) throw new Error('SVG-filen är för komplex. Använd en SVG på högst 5 MB.');
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('SVG-filer med dokumenttyper eller externa entiteter stöds inte.');
  const input = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (input.getElementsByTagName('parsererror').length || input.documentElement?.localName !== 'svg' || input.documentElement?.namespaceURI !== SVG_NS) throw new Error('Filen är inte en giltig SVG-bild.');
  const output = document.implementation.createDocument(SVG_NS, 'svg', null);
  let removed = 0;
  let count = 0;
  let hasText = false;
  let drawable = 0;
  const cleanValue = (value) => {
    if (value.length > 500000 || /[\\<>]|@import|expression\s*\(|javascript:|data:|https?:|ftp:|file:|\/\//i.test(value)) return null;
    if (/url\s*\(/i.test(value) && !LOCAL_REFERENCE.test(value.trim())) return null;
    return value;
  };
  function copyElement(node, depth) {
    if (++count > 10000 || depth > 50) throw new Error('SVG-filen innehåller för många eller för djupt nästlade objekt.');
    if (node.namespaceURI !== SVG_NS || !SVG_TAGS.has(node.localName)) { removed++; return null; }
    const clone = output.createElementNS(SVG_NS, node.localName);
    if (['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'use'].includes(node.localName)) drawable++;
    if (node.localName === 'text') hasText = true;
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name;
      if (name === 'xmlns' || name === 'xmlns:xlink') continue;
      if (name === 'href' || name === 'xlink:href') {
        if (node.localName === 'use' && /^#[A-Za-z_][\w:.-]*$/.test(attribute.value)) clone.setAttribute('href', attribute.value);
        else removed++;
        continue;
      }
      if (name === 'style') {
        for (const declaration of attribute.value.split(';')) {
          if (!declaration.trim()) continue;
          const colon = declaration.indexOf(':');
          const property = declaration.slice(0, colon).trim().toLowerCase();
          const value = declaration.slice(colon + 1).trim();
          const safe = cleanValue(value);
          if (colon >= 0 && STYLE_ATTRIBUTES.has(property) && safe !== null) clone.setAttribute(property, safe);
          else removed++;
        }
        continue;
      }
      if (!SVG_ATTRIBUTES.has(name) || (attribute.namespaceURI && attribute.namespaceURI !== SVG_NS)) { removed++; continue; }
      const value = cleanValue(attribute.value);
      if (value === null || (name === 'id' && !/^[A-Za-z_][\w:.-]*$/.test(value))) { removed++; continue; }
      clone.setAttribute(name, value);
    }
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) { const cleaned = copyElement(child, depth + 1); if (cleaned) clone.appendChild(cleaned); }
      else if ((child.nodeType === 3 || child.nodeType === 4) && ['text', 'tspan', 'title', 'desc'].includes(node.localName)) clone.appendChild(output.createTextNode(child.nodeValue));
    }
    return clone;
  }
  const root = copyElement(input.documentElement, 0);
  if (!drawable) throw new Error('SVG-filen saknar bildobjekt som verktyget kan läsa. Inbäddade bilder och externa resurser stöds inte.');
  output.replaceChild(root, output.documentElement);
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const validViewBox = viewBox.length === 4 && viewBox.every((value) => Number.isFinite(value) && Math.abs(value) <= 10000000) && viewBox[2] > 0 && viewBox[3] > 0;
  if (!validViewBox) root.removeAttribute('viewBox');
  let width = svgLength(root.getAttribute('width'));
  let height = svgLength(root.getAttribute('height'));
  if (validViewBox) {
    if (width && !height) height = width * viewBox[3] / viewBox[2];
    else if (height && !width) width = height * viewBox[2] / viewBox[3];
    else if (!width && !height) { width = viewBox[2]; height = viewBox[3]; }
  }
  width = Math.max(1, Math.round(width || 300));
  height = Math.max(1, Math.round(height || 150));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width * height > 40000000 || Math.max(width, height) > 12000) throw new Error('SVG-bilden är för stor. Använd högst 40 megapixlar och 12 000 pixlar per sida.');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  const ids = new Map();
  const all = Array.from(root.getElementsByTagName('*'));
  if (root.hasAttribute('id')) ids.set(root.getAttribute('id'), root);
  for (const node of all) if (node.hasAttribute('id')) {
    if (ids.has(node.getAttribute('id'))) throw new Error('SVG-filen innehåller dubbla objekt-ID:n. Exportera en ny kopia.');
    ids.set(node.getAttribute('id'), node);
  }
  const references = (node) => {
    const refs = new Set();
    for (const element of [node, ...Array.from(node.getElementsByTagName('*'))]) for (const attr of Array.from(element.attributes)) {
      const reference = attr.name === 'href' ? attr.value.slice(1) : LOCAL_REFERENCE.exec(attr.value)?.[2];
      if (reference) refs.add(reference);
    }
    return refs;
  };
  const graph = new Map([...ids].map(([id, node]) => [id, references(node)]));
  const done = new Set();
  function visit(id, active = new Set()) {
    if (active.has(id) || active.size > 30) throw new Error('SVG-filen innehåller cirkulära eller för långa objektreferenser.');
    if (done.has(id)) return;
    active.add(id);
    for (const next of graph.get(id) || []) if (ids.has(next)) visit(next, active);
    active.delete(id);
    done.add(id);
  }
  for (const id of ids.keys()) visit(id);
  const warnings = [];
  if (removed) warnings.push('SVG-filen innehöll delar som togs bort: skript, externa resurser, CSS-regler, filter eller andra funktioner som inte stöds. Kontrollera bilden.');
  if (hasText) warnings.push('Text i SVG använder tillgängliga typsnitt och kan se annorlunda ut. För exakt utseende: gör texten till konturer före export.');
  return { blob: new Blob([new XMLSerializer().serializeToString(output)], { type: 'image/svg+xml' }), width, height, warnings };
}
