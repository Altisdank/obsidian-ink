import { imageOutputs, convertImage } from './converter-images.js';

const root = document.querySelector('#filverkstad');
if (root) {
  const el = id => root.querySelector(`#${id}`);
  const categories = {
    images: { name: 'bild', accept: '.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg', formats: 'SVG, PNG, JPG, WebP, GIF eller BMP · högst 20 MB', note: 'Spara som PNG, JPG eller WebP, eller vektorisera till SVG. Vektorisering tolkar om bilden och kan ändra detaljer. Animation och kamerans metadata följer inte med.', limit: 20 },
    documents: { name: 'dokument', accept: '.docx,.pdf,.txt,.md', formats: 'Word (DOCX), PDF, TXT eller Markdown · högst 20 MB', note: 'Textkonvertering: bilder och avancerad sidlayout följer inte med. Skannade PDF-filer behöver textigenkänning och stöds inte här.', limit: 20 },
    audio: { name: 'ljudfil', accept: '.mp3,.wav,.m4a,.aac,.ogg,.flac', formats: 'MP3, WAV, M4A, AAC, OGG eller FLAC · högst 50 MB / 10 minuter', note: 'Spara som MP3 eller WAV. Vilka ljudfiler som kan öppnas beror på webbläsarens stöd för filen.', limit: 50 },
    models: { name: '3D-modell', accept: '.stl,.3mf,.obj', formats: 'STL, 3MF eller OBJ · högst 25 MB', note: 'Modellens geometri konverteras. Färger, material och skrivarinställningar följer inte med. STL och OBJ saknar säker måttenhet; här används millimeter.', limit: 25 }
  };
  let category = 'images';
  let file = null;
  let module = null;
  let controller = null;
  let version = 0;
  let resultUrl = null;
  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} kB` : `${(bytes / (1024 * 1024)).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} MB`;

  function status(message, error = false) {
    el('convert-status').textContent = message;
    el('convert-status').dataset.error = String(error);
  }
  function clearResult() {
    el('convert-result-audio').pause();
    el('convert-result-audio').removeAttribute('src');
    el('convert-result-image').removeAttribute('src');
    el('convert-result').hidden = true;
    el('convert-download').removeAttribute('href');
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = null;
  }
  function setBusy(busy) {
    root.setAttribute('aria-busy', String(busy));
    el('convert-cancel').hidden = !busy;
    el('convert-progress').hidden = !busy;
    root.querySelectorAll('[data-convert-category], #convert-pick, #convert-format, #convert-reset, #convert-image-size, #convert-quality, #convert-background').forEach(node => { node.disabled = busy; });
    el('convert-start').disabled = busy || !file || !module;
  }
  function reset() {
    version++;
    controller?.abort();
    file = null;
    module = null;
    el('convert-file').value = '';
    el('convert-file-details').hidden = true;
    el('convert-settings').hidden = true;
    el('convert-vector-note').hidden = true;
    clearResult();
    setBusy(false);
    status('');
  }
  function chooseCategory(value) {
    reset();
    category = value;
    const config = categories[category];
    root.querySelectorAll('[data-convert-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.convertCategory === category)));
    el('convert-file').accept = config.accept;
    el('convert-pick-title').textContent = `Välj en ${config.name}`;
    el('convert-supported').textContent = config.formats;
    el('convert-note').textContent = config.note;
    el('convert-image-settings').hidden = category !== 'images';
    el('convert-vector-note').hidden = true;
  }
  function syncImageOptions() {
    const format = el('convert-format').value;
    el('convert-quality-wrap').hidden = format === 'png' || format === 'svg';
    el('convert-background-wrap').hidden = format !== 'jpg';
    el('convert-vector-note').hidden = category !== 'images' || format !== 'svg';
    el('convert-quality-value').value = `${el('convert-quality').value} %`;
  }
  async function selectFile(selected) {
    if (!selected) return;
    reset();
    const request = version;
    const ext = selected.name.split('.').pop().toLowerCase();
    const config = categories[category];
    if (!config.accept.split(',').includes(`.${ext}`)) { status(`Det formatet stöds inte i den valda kategorin. ${config.formats}`, true); return; }
    if (!selected.size) { status('Filen är tom. Välj en annan fil.', true); return; }
    if (selected.size > config.limit * 1024 * 1024) { status(`Filen får vara högst ${config.limit} MB.`, true); return; }
    status('Förbereder formatval…');
    try {
      const api = category === 'images' ? { outputs: imageOutputs, convert: convertImage } : category === 'documents'
        ? await import('./converter-documents.js').then(m => ({ outputs: m.documentOutputs, convert: m.convertDocument }))
        : category === 'audio' ? await import('./converter-audio.js').then(m => ({ outputs: m.audioOutputs, convert: m.convertAudio }))
        : await import('./converter-models.js').then(m => ({ outputs: m.modelOutputs, convert: m.convertModel }));
      if (request !== version) return;
      const outputs = api.outputs(ext);
      if (!outputs.length) throw new Error('Det formatet kan inte konverteras här.');
      module = api;
      file = selected;
      el('convert-format').replaceChildren(...outputs.map(option => new Option(option.label, option.value)));
      el('convert-filename').textContent = file.name;
      el('convert-filesize').textContent = `${ext.toUpperCase()} / ${formatSize(file.size)}`;
      el('convert-file-details').hidden = false;
      el('convert-settings').hidden = false;
      el('convert-start').disabled = false;
      syncImageOptions();
      status('Välj format och tryck på Konvertera.');
    } catch (error) { if (request === version) status(error.message || 'Verktyget kunde inte läsas in. Ladda om sidan och prova igen.', true); }
  }
  root.querySelectorAll('[data-convert-category]').forEach(button => button.addEventListener('click', () => chooseCategory(button.dataset.convertCategory)));
  el('convert-pick').addEventListener('click', () => el('convert-file').click());
  el('convert-file').addEventListener('change', () => selectFile(el('convert-file').files[0]));
  for (const event of ['dragenter', 'dragover']) el('convert-pick').addEventListener(event, e => { e.preventDefault(); if (!controller || controller.signal.aborted) el('convert-pick').classList.add('is-dragover'); });
  el('convert-pick').addEventListener('dragleave', () => el('convert-pick').classList.remove('is-dragover'));
  el('convert-pick').addEventListener('drop', e => { e.preventDefault(); el('convert-pick').classList.remove('is-dragover'); if (!el('convert-pick').disabled) { if (e.dataTransfer.files.length > 1) status('Välj en fil i taget.', true); else selectFile(e.dataTransfer.files[0]); } });
  el('convert-format').addEventListener('change', () => { clearResult(); syncImageOptions(); status('Redo att konvertera till det valda formatet.'); });
  for (const id of ['convert-image-size', 'convert-quality', 'convert-background']) {
    el(id).addEventListener(id === 'convert-image-size' ? 'change' : 'input', () => {
      clearResult();
      syncImageOptions();
      if (file) status('Inställningen har ändrats. Tryck på Konvertera för att skapa den nya filen.');
    });
  }
  el('convert-reset').addEventListener('click', reset);
  el('convert-cancel').addEventListener('click', () => { controller?.abort(); version++; setBusy(false); status('Konverteringen är avbruten. Du kan prova igen.'); });
  el('convert-start').addEventListener('click', async () => {
    if (!file || !module) return;
    const request = ++version;
    controller = new AbortController();
    clearResult();
    setBusy(true);
    status('Startar konverteringen…');
    el('convert-progress-bar').removeAttribute('value');
    try {
      const result = await module.convert(file, el('convert-format').value, {
        signal: controller.signal,
        maxEdge: Number(el('convert-image-size').value), quality: Number(el('convert-quality').value) / 100, background: el('convert-background').value,
        onProgress: (fraction, message) => {
          if (request !== version) return;
          if (Number.isFinite(fraction)) el('convert-progress-bar').value = Math.max(0, Math.min(1, fraction));
          if (message) status(message);
        }
      });
      if (request !== version || controller.signal.aborted) return;
      if (!(result.blob instanceof Blob) || !result.blob.size) throw new Error('Ingen färdig fil skapades. Prova ett annat format.');
      resultUrl = URL.createObjectURL(result.blob);
      el('convert-download').href = resultUrl;
      el('convert-download').download = result.filename;
      el('convert-result-name').textContent = result.filename;
      el('convert-result-size').textContent = `${formatSize(result.blob.size)}${result.dimensions ? ' / ' + result.dimensions : ''}`;
      el('convert-warnings').replaceChildren(...(result.warnings || []).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
      el('convert-result-image').hidden = category !== 'images';
      el('convert-result-audio').hidden = category !== 'audio';
      if (category === 'images') el('convert-result-image').src = resultUrl;
      if (category === 'audio') el('convert-result-audio').src = resultUrl;
      el('convert-result').hidden = false;
      status('Klart. Din nya fil finns att ladda ned.');
      el('convert-download').focus({ preventScroll: true });
    } catch (error) {
      if (request === version) status(error.name === 'AbortError' ? 'Konverteringen är avbruten.' : error.message || 'Filen kunde inte konverteras. Prova ett annat format.', error.name !== 'AbortError');
    } finally {
      if (request === version) { controller = null; setBusy(false); }
    }
  });
  chooseCategory('images');
}
