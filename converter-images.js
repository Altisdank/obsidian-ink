const outputFormats = [
  { value: 'png', label: 'PNG – bevara genomskinlighet', type: 'image/png' },
  { value: 'jpg', label: 'JPG – mindre bildfil', type: 'image/jpeg' },
  { value: 'webp', label: 'WebP – kompakt webbformat', type: 'image/webp' },
  { value: 'svg', label: 'SVG – vektorisera bilden', type: 'image/svg+xml' }
];

export function imageOutputs(extension = '') {
  const isSvg = String(extension).toLowerCase().replace(/^\./, '') === 'svg';
  return outputFormats.filter((format) => !isSvg || format.value !== 'svg').map((format) => ({ ...format }));
}

async function loadSvgImage(blob, signal) {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  try {
    await new Promise((resolve, reject) => {
      const abort = () => { image.src = ''; reject(new DOMException('Avbruten', 'AbortError')); };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error('SVG-bilden kunde inte öppnas efter rensning. Prova att exportera en enklare SVG.')); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      image.src = url;
    });
    return image;
  } finally { URL.revokeObjectURL(url); }
}

function traceImage(imageData, width, height, signal, onProgress) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker(new URL('./vendor/images/trace-worker.js', import.meta.url)); }
    catch { reject(new Error('Webbläsaren kunde inte starta vektoriseringen. Prova en uppdaterad webbläsare.')); return; }
    let timer;
    const cleanup = () => { worker.terminate(); clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Avbruten', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    timer = setTimeout(() => { cleanup(); reject(new Error('Bilden är för komplex för vektorisering. Prova en enklare eller mindre bild.')); }, 60000);
    worker.onmessage = ({ data }) => {
      if (data.progress) { onProgress(data.progress, 'Vektoriserar färger och konturer…'); return; }
      cleanup();
      if (data.error) reject(new Error(data.error));
      else resolve(data.svg);
    };
    worker.onerror = () => { cleanup(); reject(new Error('Vektoriseringen misslyckades. Prova en mindre eller enklare bild.')); };
    worker.postMessage({ width: imageData.width, height: imageData.height, data: imageData.data.buffer, outputWidth: width, outputHeight: height }, [imageData.data.buffer]);
  });
}

export async function convertImage(file, format, { onProgress = () => {}, signal, maxEdge = 0, quality = .9, background = '#ffffff' } = {}) {
  const abort = () => { if (signal?.aborted) throw new DOMException('Avbruten', 'AbortError'); };
  abort();
  if (file.size > 20 * 1024 * 1024) throw new Error('Bilden får vara högst 20 MB.');
  if (!file.size) throw new Error('Bildfilen är tom.');
  const isSvg = /\.svg$/i.test(file.name) || file.type === 'image/svg+xml';
  const output = imageOutputs(isSvg ? 'svg' : '').find(item => item.value === format);
  if (!output) throw new Error('Välj ett annat bildformat. SVG kan sparas som PNG, JPG eller WebP.');
  onProgress(.1, 'Läser bilden…');
  let bitmap;
  const warnings = ['Animation och kamerans metadata följer inte med i den nya bilden.'];
  if (isSvg) {
    const { sanitizeSvgForRaster } = await import('./vendor/images/svg-safe.js');
    const safe = sanitizeSvgForRaster(await file.text());
    abort();
    warnings.push(...safe.warnings);
    bitmap = await loadSvgImage(safe.blob, signal);
  } else {
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error('Bilden kunde inte öppnas. Prova en vanlig PNG-, JPG-, WebP-, GIF-, BMP- eller SVG-fil.'); }
  }
  let canvas;
  try {
    abort();
    const width = bitmap.naturalWidth || bitmap.width;
    const height = bitmap.naturalHeight || bitmap.height;
    if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) throw new Error('Bilden saknar en giltig storlek.');
    if (width * height > 40000000 || Math.max(width, height) > 12000) throw new Error('Bilden är för stor för verktyget. Använd högst 40 megapixlar och 12 000 pixlar per sida.');
    const scale = Number(maxEdge) > 0 ? Math.min(1, Number(maxEdge) / Math.max(width, height)) : 1;
    const outputWidth = Math.max(1, Math.round(width * scale));
    const outputHeight = Math.max(1, Math.round(height * scale));
    const traceScale = format === 'svg' ? Math.min(1, 1024 / Math.max(outputWidth, outputHeight)) : 1;
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(outputWidth * traceScale));
    canvas.height = Math.max(1, Math.round(outputHeight * traceScale));
    const ctx = canvas.getContext('2d', format === 'svg' ? { willReadFrequently: true } : undefined);
    if (!ctx) throw new Error('Webbläsaren kunde inte skapa bilden.');
    if (format === 'jpg') { ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(background) ? background : '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    onProgress(.4, format === 'svg' ? 'Förbereder vektoriseringen…' : 'Skapar den nya bildfilen…');
    let blob;
    if (format === 'svg') {
      const svg = await traceImage(ctx.getImageData(0, 0, canvas.width, canvas.height), outputWidth, outputHeight, signal, onProgress);
      blob = new Blob([svg], { type: 'image/svg+xml' });
      warnings.push('SVG-filen innehåller riktiga vektorkonturer med högst 16 färger. Färger, små detaljer och kanter kan ändras. Passar bäst för symboler och enkla illustrationer.');
      if (traceScale < 1) warnings.push('För vektoriseringen analyserades bilden i högst 1 024 pixlar längs längsta sidan. SVG-filen behåller vald storlek och kan skalas.');
    } else {
      blob = await new Promise(resolve => canvas.toBlob(resolve, output.type, Math.max(.5, Math.min(1, Number(quality) || .9))));
      if (!blob || blob.type !== output.type) throw new Error('Din webbläsare kan inte spara det formatet. Prova PNG eller JPG.');
    }
    abort();
    if (format === 'jpg') warnings.push('Genomskinliga delar har fått den bakgrundsfärg du valde.');
    onProgress(1, 'Bilden är klar.');
    const filename = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 150) || 'bild';
    return { blob, filename: filename + '.' + format, warnings, dimensions: `${outputWidth} × ${outputHeight} px${format === 'svg' ? ' · vektorgrafik' : ''}` };
  } finally {
    bitmap?.close?.();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
