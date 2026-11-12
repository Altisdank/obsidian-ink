const MAX_BYTES = 20 * 1024 * 1024;
const MAX_CHARACTERS = 500000;
const MAX_PAGES = 250;
const FORMATS = {
  txt: [{ value: 'pdf', label: 'PDF (.pdf)' }, { value: 'docx', label: 'Word (.docx)' }],
  md: [{ value: 'pdf', label: 'PDF (.pdf)' }, { value: 'docx', label: 'Word (.docx)' }, { value: 'txt', label: 'Text (.txt)' }],
  docx: [{ value: 'pdf', label: 'PDF (.pdf)' }, { value: 'txt', label: 'Text (.txt)' }],
  pdf: [{ value: 'txt', label: 'Text (.txt)' }, { value: 'docx', label: 'Word (.docx)' }],
};

export function documentOutputs(extension) {
  return (FORMATS[String(extension).toLowerCase().replace(/^\./, '')] || []).map((format) => ({ ...format }));
}

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Konverteringen avbröts.', 'AbortError');
}

function progress(options, fraction, message) {
  abortIfNeeded(options.signal);
  options.onProgress?.(fraction, message);
}

function validateText(text) {
  if (text.length > MAX_CHARACTERS) throw new Error('Dokumentet innehåller för mycket text. Dela upp det i delar med högst 500 000 tecken.');
  if (!text.trim()) throw new Error('Dokumentet innehåller ingen läsbar text.');
  return text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000E-\u001F]/g, '');
}

// Inspect declared ZIP sizes before a DOCX library expands XML or embedded files.
function validateDocxArchive(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw new Error('Filen är inte ett giltigt Word-dokument (.docx).');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  if (count === 0xffff || count > 5000 || offset === 0xffffffff) throw new Error('Det här Word-dokumentet är för stort eller komplext.');
  let expanded = 0;
  let foundDocument = false;
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Word-filen verkar vara skadad.');
    const flags = view.getUint16(offset + 8, true);
    if (flags & 1) throw new Error('Lösenordsskyddade Word-filer stöds inte.');
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    expanded += size;
    if (size > 30 * 1024 * 1024 || expanded > 100 * 1024 * 1024) throw new Error('Word-filen innehåller för mycket komprimerat material. Dela upp dokumentet först.');
    if (offset + 46 + nameLength + extraLength + commentLength > bytes.length) throw new Error('Word-filen verkar vara skadad.');
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === 'word/document.xml') foundDocument = true;
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!foundDocument) throw new Error('Filen saknar innehållet i ett Word-dokument (.docx).');
}

function readText(bytes, warnings) {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  if (encoding === 'utf-8' && bytes.subarray(0, 4096).includes(0)) throw new Error('Filen verkar innehålla binära data i stället för vanlig text.');
  try { return new TextDecoder(encoding, { fatal: true }).decode(bytes); }
  catch {
    warnings.push('Texten lästes med Windows-1252 eftersom den inte var UTF-8. Kontrollera specialtecknen.');
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

async function readDocx(bytes, warnings, options) {
  validateDocxArchive(bytes);
  progress(options, .18, 'Läser texten i Word-dokumentet…');
  const { extractRawText } = await import('./vendor/documents/docx-read.js');
  abortIfNeeded(options.signal);
  const result = await extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  warnings.push('Word-dokumentets text har konverterats. Bilder, tabellutseende och avancerad formatering följer inte med.');
  if (result.messages?.some((message) => message.type === 'warning')) warnings.push('Word-dokumentet innehöll delar som inte kunde läsas. Kontrollera resultatet mot originalet.');
  return result.value;
}

function textFromPdfItems(items) {
  let text = '';
  let previous = null;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const x = item.transform?.[4] || 0;
    const y = item.transform?.[5] || 0;
    const height = Math.abs(item.height || item.transform?.[3] || 12);
    if (previous && !text.endsWith('\n')) {
      if (Math.abs(y - previous.y) > Math.max(height, previous.height) * .45) text += '\n';
      else if (x - previous.right > Math.max(height, previous.height) * .12 && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
    }
    text += item.str;
    if (item.hasEOL) text += '\n';
    previous = { y, right: x + (item.width || 0), height };
  }
  return text.trim();
}

async function readPdf(bytes, warnings, options) {
  progress(options, .1, 'Öppnar PDF-filen…');
  const pdfjs = await import('./vendor/documents/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/documents/pdf.worker.mjs', import.meta.url).href;
  abortIfNeeded(options.signal);
  const loading = pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
    standardFontDataUrl: new URL('./vendor/documents/standard_fonts/', import.meta.url).href,
    cMapUrl: new URL('./vendor/documents/cmaps/', import.meta.url).href,
    cMapPacked: true,
  });
  const abort = () => { void loading.destroy(); };
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    const pdf = await loading.promise;
    if (pdf.numPages > MAX_PAGES) throw new Error(`PDF-filen har för många sidor. Högst ${MAX_PAGES} sidor stöds åt gången.`);
    const pages = [];
    let characters = 0;
    let emptyPages = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      progress(options, .15 + .42 * (number / pdf.numPages), `Läser PDF-sida ${number} av ${pdf.numPages}…`);
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = textFromPdfItems(content.items);
      if (!text) emptyPages++;
      characters += text.length;
      if (characters > MAX_CHARACTERS) throw new Error('PDF-filen innehåller för mycket text. Dela upp den i mindre filer.');
      pages.push(text);
      page.cleanup();
    }
    if (!pages.some((page) => page.trim())) throw new Error('PDF-filen saknar läsbar text. Den kan vara skannad. Textigenkänning (OCR) ingår inte.');
    warnings.push('Texten har hämtats ur PDF-filen. Bilder, spalter och sidlayout följer inte med. Kontrollera läsordningen.');
    if (emptyPages) warnings.push(`${emptyPages} ${emptyPages === 1 ? 'sida saknade' : 'sidor saknade'} läsbar text och kan innehålla skannade bilder.`);
    return pages.join('\n\n');
  } catch (error) {
    abortIfNeeded(options.signal);
    if (error?.name === 'PasswordException') throw new Error('Lösenordsskyddade PDF-filer stöds inte. Öppna och spara en oskyddad kopia först.');
    if (error?.name === 'InvalidPDFException') throw new Error('PDF-filen verkar vara skadad eller har fel format.');
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', abort);
    await loading.destroy().catch(() => {});
  }
}

function wrapParagraph(paragraph, font, fontSize, maxWidth) {
  if (!paragraph) return [''];
  const lines = [];
  let line = '';
  for (const word of paragraph.replace(/\t/g, '    ').split(/ +/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const character of word) {
      if (line && font.widthOfTextAtSize(line + character, fontSize) > maxWidth) { lines.push(line); line = ''; }
      line += character;
    }
  }
  lines.push(line);
  return lines;
}

async function createPdf(text, title, warnings, options) {
  progress(options, .65, 'Skapar PDF med sidbrytningar…');
  const { PDFDocument, rgb, fontkit } = await import('./vendor/documents/pdf-write.js');
  abortIfNeeded(options.signal);
  const response = await fetch(new URL('./vendor/documents/Lora-Regular.ttf', import.meta.url), { signal: options.signal });
  if (!response.ok) throw new Error('PDF-typsnittet kunde inte hämtas. Ladda om sidan och försök igen.');
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await response.arrayBuffer(), { subset: true });
  pdf.setTitle(title);
  pdf.setCreator('Obsidian Ink · Skapad av AltisDank');
  const supported = new Set(font.getCharacterSet());
  const missing = new Set();
  const safeText = Array.from(text, (character) => {
    if (character === '\n' || character === '\t' || supported.has(character.codePointAt(0))) return character;
    missing.add(character);
    return '?';
  }).join('');
  if (missing.size) warnings.push('Några tecken saknas i PDF-typsnittet och ersattes med ?. Välj Word eller text om du behöver bevara alla tecken.');
  const fontSize = 11;
  const lineHeight = 16.5;
  const width = 595.28;
  const height = 841.89;
  const margin = 48;
  let page = pdf.addPage([width, height]);
  let y = height - margin - fontSize;
  let pageCount = 1;
  const paragraphs = safeText.split('\n');
  for (let index = 0; index < paragraphs.length; index++) {
    abortIfNeeded(options.signal);
    for (const line of wrapParagraph(paragraphs[index], font, fontSize, width - margin * 2)) {
      if (y < margin + fontSize) {
        if (++pageCount > MAX_PAGES) throw new Error(`Resultatet skulle få fler än ${MAX_PAGES} sidor. Dela upp texten först.`);
        page = pdf.addPage([width, height]);
        y = height - margin - fontSize;
      }
      if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(.08, .09, .09) });
      y -= lineHeight;
    }
    if (index % 30 === 0) {
      progress(options, .67 + .23 * ((index + 1) / paragraphs.length), 'Formaterar text och sidor…');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  progress(options, .93, 'Sparar PDF-filen…');
  const bytes = await pdf.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

async function createDocx(text, title, options) {
  progress(options, .7, 'Skapar Word-dokumentet…');
  const { Document, Paragraph, TextRun, Packer } = await import('./vendor/documents/docx-write.js');
  abortIfNeeded(options.signal);
  const paragraphs = text.split('\n').map((line) => new Paragraph({
    children: [new TextRun({ text: line, font: 'Calibri', size: 22 })],
    spacing: { after: 90, line: 276 },
  }));
  const document = new Document({
    creator: 'Obsidian Ink · Skapad av AltisDank',
    title,
    description: 'Textkonvertering via Obsidian Ink',
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 960, right: 960, bottom: 960, left: 960 } } }, children: paragraphs }],
  });
  progress(options, .9, 'Sparar Word-filen…');
  return Packer.toBlob(document);
}

export async function convertDocument(file, format, options = {}) {
  abortIfNeeded(options.signal);
  if (!file || typeof file.arrayBuffer !== 'function' || !file.name) throw new Error('Välj en dokumentfil först.');
  if (file.size > MAX_BYTES) throw new Error('Dokumentet är för stort. Högst 20 MB stöds åt gången.');
  if (!file.size) throw new Error('Filen är tom.');
  const extension = file.name.split('.').pop().toLowerCase();
  if (!documentOutputs(extension).some((output) => output.value === format)) throw new Error('Den här kombinationen av dokumentformat stöds inte.');
  const warnings = [];
  progress(options, .03, 'Läser filen lokalt i webbläsaren…');
  const bytes = new Uint8Array(await file.arrayBuffer());
  abortIfNeeded(options.signal);
  let text;
  if (extension === 'docx') text = await readDocx(bytes, warnings, options);
  else if (extension === 'pdf') text = await readPdf(bytes, warnings, options);
  else text = readText(bytes, warnings);
  if (extension === 'md') warnings.push('Markdown har konverterats som vanlig text. Formateringsmarkeringar finns kvar.');
  text = validateText(text);
  abortIfNeeded(options.signal);
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 150) || 'dokument';
  let blob;
  if (format === 'pdf') blob = await createPdf(text, base, warnings, options);
  else if (format === 'docx') blob = await createDocx(text, base, options);
  else blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  progress(options, 1, 'Dokumentet är klart.');
  return { blob, filename: `${base}.${format}`, warnings };
}
