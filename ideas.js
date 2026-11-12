(() => {
  'use strict';
  const root = document.querySelector('.ideas-studio');
  if (!root) return;
  const find = (id) => root.querySelector(`#${id}`);
  const fonts = [
    { id: 'great-vibes', name: 'Great Vibes', family: 'OI Great Vibes', group: 'script' },
    { id: 'allura', name: 'Allura', family: 'OI Allura', group: 'script' },
    { id: 'parisienne', name: 'Parisienne', family: 'OI Parisienne', group: 'script' },
    { id: 'caveat', name: 'Caveat', family: 'OI Caveat', group: 'script' },
    { id: 'unifraktur-maguntia', name: 'Unifraktur Maguntia', family: 'OI Unifraktur', group: 'gothic' },
    { id: 'grenze-gotisch', name: 'Grenze Gotisch', family: 'OI Grenze', group: 'gothic' },
    { id: 'pirata-one', name: 'Pirata One', family: 'OI Pirata', group: 'gothic' },
    { id: 'bebas-neue', name: 'Bebas Neue', family: 'OI Bebas', group: 'classic' },
    { id: 'space-mono', name: 'Space Mono', family: 'OI Space Mono', group: 'classic' },
    { id: 'lora', name: 'Lora', family: 'OI Lora', group: 'classic' },
    { id: 'instrument-serif', name: 'Instrument Serif', family: 'Instrument Serif', group: 'classic' },
    { id: 'work-sans', name: 'Work Sans', family: 'Work Sans', group: 'classic' }
  ];
  const byId = (id) => fonts.find((font) => font.id === id) || fonts[0];
  const labels = { script: 'Handstil', gothic: 'Gotiskt', classic: 'Klassiskt' };
  const storageKey = 'obsidianink.favorite-fonts.v1';
  let favorites = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) favorites = new Set(saved.filter((id) => fonts.some((font) => font.id === id)));
  } catch { /* The workbench also works with storage disabled. */ }
  let selected = fonts[0].id;
  let filter = 'all';
  let background = 'light';
  let renderVersion = 0;
  let currentRender = Promise.resolve();
  const textInput = find('ideas-text');
  const mainCanvas = find('ideas-canvas');
  const compareCanvas = find('ideas-compare-canvas');
  const compareSelect = find('ideas-compare-font');
  const status = find('ideas-status');
  const briefStatus = find('ideas-brief-status');
  const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('sv', { granularity: 'grapheme' }) : null;
  const characters = (value) => graphemes ? [...graphemes.segment(value)].map((item) => item.segment) : Array.from(value);
  const sampleText = () => textInput.value.trim() || 'Dina ord';

  function setStatus(message) { status.textContent = message; }

  function renderCatalog(focusId) {
    const visible = fonts.filter((font) => filter === 'all' || (filter === 'favorites' ? favorites.has(font.id) : font.group === filter));
    const fragment = document.createDocumentFragment();
    for (const font of visible) {
      const card = document.createElement('div');
      card.className = `ideas-font-card${selected === font.id ? ' is-selected' : ''}`;
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'ideas-font-choice';
      choose.dataset.fontId = font.id;
      choose.id = `ideas-choice-${font.id}`;
      choose.setAttribute('aria-pressed', String(font.id === selected));
      choose.setAttribute('aria-label', `Välj ${font.name}, ${labels[font.group]}`);
      const name = document.createElement('span');
      name.className = 'ideas-font-name';
      name.textContent = font.name;
      const sample = document.createElement('span');
      sample.className = 'ideas-font-sample';
      sample.style.fontFamily = `"${font.family}", serif`;
      sample.textContent = sampleText().replace(/\n/g, ' ');
      sample.setAttribute('aria-hidden', 'true');
      choose.append(name, sample);
      choose.addEventListener('click', () => {
        selected = font.id;
        renderCatalog(choose.id);
        scheduleRender();
      });
      const favorite = document.createElement('button');
      favorite.type = 'button';
      favorite.className = 'ideas-favorite';
      favorite.id = `ideas-favorite-${font.id}`;
      favorite.textContent = favorites.has(font.id) ? '♥' : '♡';
      favorite.setAttribute('aria-pressed', String(favorites.has(font.id)));
      favorite.setAttribute('aria-label', `${favorites.has(font.id) ? 'Ta bort' : 'Spara'} ${font.name} ${favorites.has(font.id) ? 'från' : 'bland'} favoriter`);
      favorite.addEventListener('click', () => {
        if (favorites.has(font.id)) favorites.delete(font.id); else favorites.add(font.id);
        try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); }
        catch { setStatus('Favoriten finns kvar under besöket. Webbläsaren tillåter inte att den sparas till nästa gång.'); }
        renderCatalog(favorite.id);
      });
      card.append(choose, favorite);
      fragment.append(card);
    }
    find('ideas-fonts').replaceChildren(fragment);
    find('ideas-font-count').textContent = `${visible.length} ${visible.length === 1 ? 'stil' : 'stilar'}`;
    find('ideas-empty').hidden = visible.length !== 0;
    if (focusId) {
      const target = find(focusId);
      if (target) target.focus({ preventScroll: true });
      else root.querySelector(`[data-ideas-filter="${filter}"]`).focus({ preventScroll: true });
    }
  }

  function configureText(ctx, pixels, font, spacing) {
    ctx.font = `400 ${pixels}px "${font.family}"`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  }

  function lineWidth(ctx, value, spacing) {
    if ('letterSpacing' in ctx || spacing === 0) return ctx.measureText(value).width;
    return characters(value).reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, characters(value).length - 1) * spacing;
  }

  function wrapLines(ctx, value, spacing, available) {
    const lines = [];
    for (const paragraph of value.split('\n')) {
      if (!paragraph.trim()) { lines.push(''); continue; }
      let line = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (lineWidth(ctx, candidate, spacing) <= available) { line = candidate; continue; }
        if (line) { lines.push(line); line = ''; }
        for (const character of characters(word)) {
          if (line && lineWidth(ctx, line + character, spacing) > available) { lines.push(line); line = ''; }
          line += character;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  function drawLine(ctx, line, x, y, spacing) {
    if ('letterSpacing' in ctx || spacing === 0) { ctx.fillText(line, x, y); return; }
    for (const character of characters(line)) {
      ctx.fillText(character, x, y);
      x += ctx.measureText(character).width + spacing;
    }
  }

  function drawCanvas(canvas, font) {
    const pixels = Number(find('ideas-size').value) * 2;
    const spacing = Number(find('ideas-spacing').value) * 2;
    const width = 1200;
    const padding = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    configureText(ctx, pixels, font, spacing);
    const lines = wrapLines(ctx, sampleText(), spacing, width - padding * 2);
    const lineHeight = pixels * 1.5;
    const height = Math.max(560, Math.ceil(lines.length * lineHeight + padding * 2));
    canvas.width = width;
    canvas.height = height;
    configureText(ctx, pixels, font, spacing);
    ctx.fillStyle = background === 'dark' ? '#263531' : '#fbf8f1';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = background === 'dark' ? '#f5f0e7' : '#26312d';
    const firstBaseline = (height - lines.length * lineHeight) / 2 + lineHeight * .72;
    lines.forEach((line, index) => {
      const metrics = ctx.measureText(line);
      const measured = lineWidth(ctx, line, spacing);
      const leftOverhang = Math.max(0, metrics.actualBoundingBoxLeft || 0);
      const rightOverhang = Math.max(0, (metrics.actualBoundingBoxRight || measured) - measured);
      const x = Math.max(padding, (width - measured - leftOverhang - rightOverhang) / 2 + leftOverhang);
      drawLine(ctx, line, x, firstBaseline + index * lineHeight, spacing);
    });
    canvas.setAttribute('aria-label', `${sampleText()} i ${font.name}. ${lines.length} ${lines.length === 1 ? 'rad' : 'rader'}.`);
  }

  async function drawPreviews() {
    const version = ++renderVersion;
    const font = byId(selected);
    const comparison = byId(compareSelect.value);
    find('ideas-selected-name').textContent = font.name;
    find('ideas-size-value').value = find('ideas-size').value;
    find('ideas-spacing-value').value = find('ideas-spacing').value;
    find('ideas-text-count').textContent = `${textInput.value.length} / 160`;
    find('ideas-canvas-wrap').dataset.background = background;
    root.querySelectorAll('.ideas-font-sample').forEach((node) => { node.textContent = sampleText().replace(/\n/g, ' '); });
    find('ideas-download').disabled = true;
    try {
      await Promise.all([font, comparison].map((item) => document.fonts.load(`400 136px "${item.family}"`, sampleText())));
      if (version !== renderVersion) return false;
      drawCanvas(mainCanvas, font);
      drawCanvas(compareCanvas, comparison);
      find('ideas-download').disabled = false;
      return true;
    } catch {
      if (version === renderVersion) setStatus('Typsnittet kunde inte läsas in. Prova ett annat eller ladda om sidan.');
      return false;
    }
  }

  function scheduleRender() { currentRender = drawPreviews(); }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    root.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function buildBrief() {
    const font = byId(selected);
    const cmInput = find('ideas-cm');
    if (!cmInput.reportValidity()) return null;
    const width = cmInput.value && cmInput.validity.valid ? `${cmInput.value.replace('.', ',')} cm` : 'Inte bestämt ännu';
    return [
      'Min tatueringsidé till Johan / obsidianink', '',
      `Text: ${textInput.value.trim() || 'Ingen text vald ännu'}`,
      `Typsnitt som inspiration: ${font.name}`,
      `Bokstavsavstånd i skissen: ${find('ideas-spacing').value}`,
      `Placering: ${find('ideas-placement').value || 'Inte bestämt ännu'}`,
      `Ungefärlig bredd: ${width}`, '',
      `Mina tankar: ${find('ideas-notes').value.trim() || 'Jag vill gärna prata vidare om idén.'}`, '',
      'Det här är en idéskiss att prata med Johan om, inte ett färdigt tatueringsunderlag.'
    ].join('\n');
  }

  for (const font of fonts) {
    const option = document.createElement('option');
    option.value = font.id;
    option.textContent = font.name;
    compareSelect.append(option);
    const license = document.createElement('a');
    license.href = `assets/fonts/${font.id}-OFL.txt`;
    license.textContent = font.name;
    license.target = '_blank';
    license.rel = 'noopener';
    find('ideas-license-links').append(license);
  }
  compareSelect.value = 'unifraktur-maguntia';
  for (const input of [textInput, find('ideas-size'), find('ideas-spacing')]) input.addEventListener('input', scheduleRender);
  compareSelect.addEventListener('change', scheduleRender);
  root.querySelectorAll('[data-ideas-filter]').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.ideasFilter;
    root.querySelectorAll('[data-ideas-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderCatalog();
  }));
  root.querySelectorAll('[data-ideas-example]').forEach((button) => button.addEventListener('click', () => { textInput.value = button.dataset.ideasExample; scheduleRender(); }));
  root.querySelectorAll('[data-ideas-background]').forEach((button) => button.addEventListener('click', () => {
    background = button.dataset.ideasBackground;
    root.querySelectorAll('[data-ideas-background]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    scheduleRender();
  }));
  find('ideas-reset').addEventListener('click', () => {
    selected = fonts[0].id;
    textInput.value = 'Forever';
    find('ideas-size').value = '68';
    find('ideas-spacing').value = '0';
    compareSelect.value = 'unifraktur-maguntia';
    background = 'light';
    filter = 'all';
    root.querySelectorAll('[data-ideas-background]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ideasBackground === background)));
    root.querySelectorAll('[data-ideas-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ideasFilter === filter)));
    renderCatalog();
    scheduleRender();
    setStatus('Skissen är återställd. Dina favoriter och bokningstankar finns kvar.');
  });
  find('ideas-download').addEventListener('click', async () => {
    if (!await currentRender) return;
    const button = find('ideas-download');
    button.disabled = true;
    mainCanvas.toBlob((blob) => {
      button.disabled = false;
      if (!blob) { setStatus('Bilden kunde inte sparas. Prova igen.'); return; }
      download(blob, `obsidianink-ideskiss-${selected}.png`);
      setStatus('PNG-skissen är hämtad. Bifoga den gärna när du skriver till Johan.');
    }, 'image/png');
  });
  find('ideas-copy-brief').addEventListener('click', async () => {
    const text = buildBrief();
    if (text === null) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      find('ideas-copy-fallback').hidden = true;
      briefStatus.textContent = 'Din idé är kopierad. Klistra in den i ditt meddelande till Johan.';
    } catch {
      const output = find('ideas-brief-output');
      output.value = text;
      find('ideas-copy-fallback').hidden = false;
      output.focus();
      output.select();
      briefStatus.textContent = 'Automatisk kopiering gick inte. Texten är markerad så att du kan kopiera den själv.';
    }
  });
  find('ideas-save-brief').addEventListener('click', () => {
    const text = buildBrief();
    if (text === null) return;
    download(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'obsidianink-min-tatueringside.txt');
    briefStatus.textContent = 'Ditt underlag är hämtat som en textfil.';
  });
  renderCatalog();
  scheduleRender();
})();
