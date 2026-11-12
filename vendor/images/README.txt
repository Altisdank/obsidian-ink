Obsidian Ink image and SVG converter

All image processing takes place locally in the browser. No images are uploaded to a conversion server.

Raster input: PNG, JPEG, WebP, GIF, BMP supported by the browser.
SVG input: SVG -> PNG, JPEG, WebP.
Raster -> SVG: real path-based vector tracing, not an embedded bitmap.

Vector tracing uses ImageTracerJS 1.2.6 by Andras Jankovics.
Source: https://github.com/jankovicsandras/imagetracerjs
Original source file: imagetracer_v1.2.6.js (copied unchanged as imagetracer-1.2.6.js).
License: The Unlicense, retained in LICENSE.txt.

trace-worker.js runs ImageTracer in a dedicated, terminable worker. It quantizes to at most 16 colors, analyzes at most 1,024 pixels along the longest side and keeps the requested SVG display dimensions. Small details, edges and colors can change. It is intended primarily for simple illustrations and symbols, not lossless conversion of photographs. A 60-second timeout prevents an indefinitely running conversion. Abort terminates the worker.

svg-safe.js is the application-specific SVG allowlist. It parses SVG as XML off-document and constructs a fresh SVG using basic shapes, paths, groups, gradients, local references, masks, text and a small set of presentation properties. The source document is never attached to the page. Scripts, event handlers, external URLs, embedded images, foreignObject, CSS style elements, filters, animation and unknown elements/attributes are omitted. DTD/entity declarations, recursive references and oversized SVGs are rejected. Inline presentation styles are converted to whitelisted attributes. Text may use fallback fonts. The resulting SVG is rendered only through an image blob URL, which is revoked after loading.

Limits: input image <=20 MB; SVG text <=5 MB; <=40 megapixels; <=12,000 pixels per side; <=10,000 SVG elements; <=50 levels of nesting. Vector trace analysis <=1,024 pixels per side. Raster exports flatten animation and omit source metadata.

Browser entry: ../../converter-images.js
Development QA only (not for publication): ../../.draft/images/svg-test.html and test.mjs.
