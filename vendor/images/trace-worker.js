importScripts('./imagetracer-1.2.6.js');

self.onmessage = ({ data }) => {
  try {
    if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1 || data.width > 1024 || data.height > 1024) throw new Error('Bilden är för stor för vektorisering.');
    const pixels = new Uint8ClampedArray(data.data);
    if (pixels.length !== data.width * data.height * 4) throw new Error('Bildens pixeldata kunde inte läsas.');
    self.postMessage({ progress: .5 });
    let svg = self.ImageTracer.imagedataToSVG({ width: data.width, height: data.height, data: pixels }, {
      numberofcolors: 16, colorquantcycles: 2, colorsampling: 2,
      mincolorratio: .02, ltres: 1, qtres: 1, pathomit: 8,
      rightangleenhance: true, layering: 0, strokewidth: 0,
      scale: 1, roundcoords: 2, viewbox: true, desc: false
    });
    if (!svg.includes('<path')) throw new Error('Inga tydliga konturer hittades. Prova en större eller tydligare bild.');
    svg = svg.replace('<svg ', `<svg width="${Math.round(data.outputWidth)}" height="${Math.round(data.outputHeight)}" `);
    self.postMessage({ svg });
  } catch (error) {
    self.postMessage({ error: error?.message || 'Bilden kunde inte vektoriseras.' });
  }
};
