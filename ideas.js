(() => {
  'use strict';
  const root = document.querySelector('.ideas-studio');
  if (!root) return;
  const find = (id) => root.querySelector(`#${id}`);
  const fonts = [
  {
    "id": "great-vibes",
    "name": "Great Vibes",
    "family": "OI Great Vibes",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "allura",
    "name": "Allura",
    "family": "OI Allura",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "parisienne",
    "name": "Parisienne",
    "family": "OI Parisienne",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "caveat",
    "name": "Caveat",
    "family": "OI Caveat",
    "group": "script",
    "tags": "penna handstil personlig"
  },
  {
    "id": "unifraktur-maguntia",
    "name": "UnifrakturMaguntia",
    "family": "OI Unifraktur",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "grenze-gotisch",
    "name": "Grenze Gotisch",
    "family": "OI Grenze",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "pirata-one",
    "name": "Pirata One",
    "family": "OI Pirata",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "bebas-neue",
    "name": "Bebas Neue",
    "family": "OI Bebas",
    "group": "classic",
    "tags": "smal hög affisch rubrik"
  },
  {
    "id": "space-mono",
    "name": "Space Mono",
    "family": "OI Space Mono",
    "group": "classic",
    "tags": "kod teknisk retro"
  },
  {
    "id": "lora",
    "name": "Lora",
    "family": "OI Lora",
    "group": "classic",
    "tags": "bok läsbar mjuk berättelse"
  },
  {
    "id": "instrument-serif",
    "name": "Instrument Serif",
    "family": "Instrument Serif",
    "group": "classic",
    "tags": "ren klassisk"
  },
  {
    "id": "work-sans",
    "name": "Work Sans",
    "family": "Work Sans",
    "group": "classic",
    "tags": "ren klassisk"
  },
  {
    "id": "playfair-display",
    "name": "Playfair Display",
    "family": "OI Playfair Display",
    "group": "classic",
    "tags": "editorial elegant klassisk kontrast"
  },
  {
    "id": "libre-baskerville",
    "name": "Libre Baskerville",
    "family": "OI Libre Baskerville",
    "group": "classic",
    "tags": "klassisk bok tidlös läsbar"
  },
  {
    "id": "manrope",
    "name": "Manrope",
    "family": "OI Manrope",
    "group": "classic",
    "tags": "modern ren geometrisk"
  },
  {
    "id": "outfit",
    "name": "Outfit",
    "family": "OI Outfit",
    "group": "classic",
    "tags": "geometrisk rund modern"
  },
  {
    "id": "sora",
    "name": "Sora",
    "family": "OI Sora",
    "group": "classic",
    "tags": "teknisk modern tydlig"
  },
  {
    "id": "anton",
    "name": "Anton",
    "family": "OI Anton",
    "group": "classic",
    "tags": "fet smal stark rubrik"
  },
  {
    "id": "abril-fatface",
    "name": "Abril Fatface",
    "family": "OI Abril Fatface",
    "group": "classic",
    "tags": "fet editorial kontrast affisch"
  },
  {
    "id": "righteous",
    "name": "Righteous",
    "family": "OI Righteous",
    "group": "classic",
    "tags": "retro geometrisk rund"
  },
  {
    "id": "pacifico",
    "name": "Pacifico",
    "family": "OI Pacifico",
    "group": "script",
    "tags": "pensel retro lekfull handstil"
  },
  {
    "id": "dancing-script",
    "name": "Dancing Script",
    "family": "OI Dancing Script",
    "group": "script",
    "tags": "elegant mjuk handstil"
  },
  {
    "id": "sacramento",
    "name": "Sacramento",
    "family": "OI Sacramento",
    "group": "script",
    "tags": "personlig mjuk handstil elegant"
  },
  {
    "id": "ibm-plex-mono",
    "name": "IBM Plex Mono",
    "family": "OI IBM Plex Mono",
    "group": "classic",
    "tags": "teknisk kod precision"
  },
  {
    "id": "jetbrains-mono",
    "name": "JetBrains Mono",
    "family": "OI JetBrains Mono",
    "group": "classic",
    "tags": "kod läsbar teknisk"
  },
  {
    "id": "fira-code",
    "name": "Fira Code",
    "family": "OI Fira Code",
    "group": "classic",
    "tags": "kod ligaturer teknisk"
  },
  {
    "id": "unifraktur-cook",
    "name": "UnifrakturCook",
    "family": "OI UnifrakturCook",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "new-rocker",
    "name": "New Rocker",
    "family": "OI New Rocker",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "almendra",
    "name": "Almendra",
    "family": "OI Almendra",
    "group": "gothic",
    "tags": "gotisk blackletter tatuering ornament kraftfull"
  },
  {
    "id": "alex-brush",
    "name": "Alex Brush",
    "family": "OI Alex Brush",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "pinyon-script",
    "name": "Pinyon Script",
    "family": "OI Pinyon Script",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "tangerine",
    "name": "Tangerine",
    "family": "OI Tangerine",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "italianno",
    "name": "Italianno",
    "family": "OI Italianno",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "monsieur-la-doulaise",
    "name": "Monsieur La Doulaise",
    "family": "OI Monsieur La Doulaise",
    "group": "script",
    "tags": "kalligrafi script tatuering elegant sammanhängande"
  },
  {
    "id": "kaushan-script",
    "name": "Kaushan Script",
    "family": "OI Kaushan Script",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "marck-script",
    "name": "Marck Script",
    "family": "OI Marck Script",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "mr-dafoe",
    "name": "Mr Dafoe",
    "family": "OI Mr Dafoe",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "borel",
    "name": "Borel",
    "family": "OI Borel",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "bad-script",
    "name": "Bad Script",
    "family": "OI Bad Script",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "courgette",
    "name": "Courgette",
    "family": "OI Courgette",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "charm",
    "name": "Charm",
    "family": "OI Charm",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "kalam",
    "name": "Kalam",
    "family": "OI Kalam",
    "group": "script",
    "tags": "handstil penna tatuering personlig mjuk"
  },
  {
    "id": "bodoni-moda",
    "name": "Bodoni Moda",
    "family": "OI Bodoni Moda",
    "group": "classic",
    "tags": "elegant editorial tidlös mode"
  },
  {
    "id": "space-grotesk",
    "name": "Space Grotesk",
    "family": "OI Space Grotesk",
    "group": "classic",
    "tags": "geometrisk modern ren"
  },
  {
    "id": "syne",
    "name": "Syne",
    "family": "OI Syne",
    "group": "classic",
    "tags": "expressiv bred experimentell"
  },
  {
    "id": "cormorant-garamond",
    "name": "Cormorant Garamond",
    "family": "OI Cormorant Garamond",
    "group": "classic",
    "tags": "elegant editorial klassisk tidlös"
  },
  {
    "id": "archivo-black",
    "name": "Archivo Black",
    "family": "OI Archivo Black",
    "group": "classic",
    "tags": "fet stark rubrik"
  },
  {
    "id": "dm-sans",
    "name": "DM Sans",
    "family": "OI DM Sans",
    "group": "classic",
    "tags": "ren modern enkel läsbar"
  }
];
  const byId = (id) => fonts.find((font) => font.id === id) || fonts[0];
  const labels = { script: 'Handstil', gothic: 'Gotiskt', classic: 'Klassiskt', custom: 'Eget typsnitt' };
  const storageKey = 'obsidianink.favorite-fonts.v1';
  let favorites = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) favorites = new Set(saved.filter((id) => fonts.some((font) => font.id === id)));
  } catch { /* The workbench also works with storage disabled. */ }
  let selected = fonts[0].id;
  let filter = 'all';
  let background = 'light';
  let alignment = 'center';
  let customCount = 0;
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
    const query = find('ideas-search').value.trim().toLocaleLowerCase('sv');
    const visible = fonts.filter((font) => (filter === 'all' || (filter === 'favorites' ? favorites.has(font.id) : font.group === filter)) && `${font.name} ${font.tags || ''} ${labels[font.group]}`.toLocaleLowerCase('sv').includes(query));
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
        try { localStorage.setItem(storageKey, JSON.stringify([...favorites].filter((id) => !byId(id).custom))); }
        catch { setStatus('Favoriten finns kvar under besöket. Webbläsaren tillåter inte att den sparas till nästa gång.'); }
        renderCatalog(favorite.id);
      });
      card.append(choose, favorite);
      fragment.append(card);
    }
    find('ideas-fonts').replaceChildren(fragment);
    find('ideas-font-count').textContent = `${visible.length} ${visible.length === 1 ? 'stil' : 'stilar'}`;
    find('ideas-empty').hidden = visible.length !== 0;
    find('ideas-empty').textContent = query ? 'Inget typsnitt matchar sökningen. Prova ett annat namn eller välj Alla.' : filter === 'custom' ? 'Lägg till en egen TTF- eller OTF-fil för att se den här.' : 'Tryck på hjärtat vid ett typsnitt för att spara det här.';
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

  function drawLine(ctx, line, x, y, spacing, outline) {
    const draw = (value, left) => outline ? ctx.strokeText(value, left, y) : ctx.fillText(value, left, y);
    if ('letterSpacing' in ctx || spacing === 0) { draw(line, x); return; }
    for (const character of characters(line)) {
      draw(character, x);
      x += ctx.measureText(character).width + spacing;
    }
  }

  function drawCanvas(canvas, font) {
    const pixels = Number(find('ideas-size').value) * 2;
    const spacing = Number(find('ideas-spacing').value) * 2;
    const curve = Number(find('ideas-curve').value) * 2;
    const outline = find('ideas-outline').checked;
    const mirrored = find('ideas-mirror').checked;
    const width = 1200;
    const padding = 120;
    const inkLayer = document.createElement('canvas');
    const ink = inkLayer.getContext('2d');
    const ctx = canvas.getContext('2d');
    if (!ctx || !ink) throw new Error('Canvas unavailable');
    configureText(ink, pixels, font, spacing);
    const lines = wrapLines(ink, sampleText(), spacing, width - padding * 2);
    const metrics = lines.map((line) => ink.measureText(line));
    const ascent = Math.max(pixels, ...metrics.map((m) => m.actualBoundingBoxAscent || pixels));
    const descent = Math.max(pixels * .35, ...metrics.map((m) => m.actualBoundingBoxDescent || 0));
    const lineHeight = Math.max(pixels * 1.5, ascent + descent + pixels * .2);
    const curvePadding = Math.abs(curve);
    const height = Math.max(560, Math.ceil(lines.length * lineHeight + padding * 2 + curvePadding * 2));
    canvas.width = inkLayer.width = width;
    canvas.height = inkLayer.height = height;
    configureText(ink, pixels, font, spacing);
    const color = background === 'dark' ? '#f5f0e7' : '#26312d';
    ink.fillStyle = ink.strokeStyle = color;
    ink.lineWidth = Math.max(1.5, pixels / 55);
    ink.lineJoin = 'round';
    const firstBaseline = (height - lines.length * lineHeight) / 2 + ascent;
    lines.forEach((line, index) => {
      const measured = lineWidth(ink, line, spacing);
      const leftOverhang = Math.max(0, metrics[index].actualBoundingBoxLeft || 0);
      const rightOverhang = Math.max(0, (metrics[index].actualBoundingBoxRight || measured) - measured);
      let x = (width - measured - leftOverhang - rightOverhang) / 2 + leftOverhang;
      if (alignment === 'left') x = padding + leftOverhang;
      if (alignment === 'right') x = width - padding - measured - rightOverhang;
      drawLine(ink, line, x, firstBaseline + index * lineHeight, spacing, outline);
    });
    if (background !== 'transparent') {
      ctx.fillStyle = background === 'dark' ? '#263531' : '#fbf8f1';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.save();
    if (mirrored) { ctx.translate(width, 0); ctx.scale(-1, 1); }
    if (curve === 0) ctx.drawImage(inkLayer, 0, 0);
    else {
      // Bend the rendered ink, keeping connected script letters together.
      for (let x = 0; x < width; x += 1) {
        const position = Math.max(0, Math.min(1, (x - padding) / (width - padding * 2)));
        const offset = curve * (4 * Math.pow(position - .5, 2) - 1);
        ctx.drawImage(inkLayer, x, 0, 1, height, x, offset, 1, height);
      }
    }
    ctx.restore();
    const effects = [outline && 'kontur', mirrored && 'spegelvänd', curve !== 0 && 'böjd', background === 'transparent' && 'genomskinlig bakgrund'].filter(Boolean);
    canvas.setAttribute('aria-label', `${sampleText()} i ${font.name}. ${lines.length} ${lines.length === 1 ? 'rad' : 'rader'}.${effects.length ? ' ' + effects.join(', ') + '.' : ''}`);
  }

  async function drawPreviews() {
    const version = ++renderVersion;
    const font = byId(selected);
    const comparison = byId(compareSelect.value);
    find('ideas-selected-name').textContent = font.name;
    find('ideas-size-value').value = find('ideas-size').value;
    find('ideas-spacing-value').value = find('ideas-spacing').value;
    find('ideas-curve-value').value = find('ideas-curve').value;
    find('ideas-text-count').textContent = `${textInput.value.length} / 160`;
    find('ideas-canvas-wrap').dataset.background = background;
    compareCanvas.classList.toggle('ideas-compare-canvas-transparent', background === 'transparent');
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
      `Böjning: ${find('ideas-curve').value}`,
      `Justering: ${{left:'Vänster',center:'Centrerad',right:'Höger'}[alignment]}`,
      `Kontur: ${find('ideas-outline').checked ? 'Ja' : 'Nej'}. Spegelvänd skiss: ${find('ideas-mirror').checked ? 'Ja' : 'Nej'}.`,
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
  for (const input of [textInput, find('ideas-size'), find('ideas-spacing'), find('ideas-curve'), find('ideas-outline'), find('ideas-mirror')]) input.addEventListener('input', scheduleRender);
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
    find('ideas-curve').value = '0';
    find('ideas-outline').checked = false;
    find('ideas-mirror').checked = false;
    find('ideas-search').value = '';
    alignment = 'center';
    root.querySelectorAll('[data-ideas-align]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ideasAlign === alignment)));
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
  document.querySelectorAll('[data-lettering-text][data-lettering-font]').forEach((link) => link.addEventListener('click', () => {
    const font = fonts.find((item) => item.id === link.dataset.letteringFont);
    if (!font) return;
    selected = font.id;
    textInput.value = (link.dataset.letteringText || '').slice(0, textInput.maxLength > 0 ? textInput.maxLength : 160);
    filter = 'all';
    find('ideas-search').value = '';
    root.querySelectorAll('[data-ideas-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ideasFilter === filter)));
    renderCatalog();
    scheduleRender();
    requestAnimationFrame(() => textInput.focus({ preventScroll: true }));
  }));
  find('ideas-search').addEventListener('input', () => renderCatalog());
  root.querySelectorAll('[data-ideas-align]').forEach((button) => button.addEventListener('click', () => {
    alignment = button.dataset.ideasAlign;
    root.querySelectorAll('[data-ideas-align]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    scheduleRender();
  }));
  find('ideas-custom-font').addEventListener('change', async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(ttf|otf)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setStatus('Välj en TTF- eller OTF-fil på högst 10 MB.'); input.value = ''; return;
    }
    if (customCount >= 5) {
      setStatus('Du kan prova fem egna typsnitt per besök. Ladda om sidan om du vill börja om.'); input.value = ''; return;
    }
    input.disabled = true;
    try {
      const family = `OI Custom ${customCount + 1}`;
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      customCount += 1;
      const font = { id: `custom-${customCount}`, name: file.name.replace(/\.(ttf|otf)$/i, '').slice(0, 80), family, group: 'custom', custom: true };
      fonts.push(font);
      const option = document.createElement('option'); option.value = font.id; option.textContent = font.name + ' (egen)'; compareSelect.append(option);
      selected = font.id;
      filter = 'custom';
      find('ideas-search').value = '';
      root.querySelectorAll('[data-ideas-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.ideasFilter === filter)));
      renderCatalog(); scheduleRender();
      setStatus('Ditt typsnitt är tillagt för det här besöket. Filen stannar i webbläsaren.');
    } catch { setStatus('Typsnittet kunde inte öppnas. Kontrollera att filen är en giltig TTF eller OTF.'); }
    finally { input.disabled = false; input.value = ''; }
  });
  renderCatalog();
  scheduleRender();
})();
