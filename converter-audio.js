const INPUT_EXTENSIONS = new Set(['mp3', 'wav', 'wave', 'm4a', 'aac', 'ogg', 'oga', 'flac']);
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_SECONDS = 10 * 60;
const SAMPLE_RATE = 44100;

export function audioOutputs(extension) {
  const normalized = String(extension || '').replace(/^\./, '').toLowerCase();
  if (!INPUT_EXTENSIONS.has(normalized)) return [];
  return [
    { value: 'mp3', label: 'MP3 · 192 kbit/s' },
    { value: 'wav', label: 'WAV · okomprimerat ljud' }
  ];
}

function aborted() {
  return new DOMException('Konverteringen avbröts.', 'AbortError');
}

function checkAbort(signal) {
  if (signal?.aborted) throw aborted();
}

// Browser decoding cannot be forcibly cancelled. Discard its result immediately
// on cancellation; encoding runs in its own worker and can be stopped entirely.
function withAbort(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const stop = () => { signal.removeEventListener('abort', stop); reject(aborted()); };
    signal.addEventListener('abort', stop, { once: true });
    promise.then(
      (result) => { signal.removeEventListener('abort', stop); resolve(result); },
      (error) => { signal.removeEventListener('abort', stop); reject(error); }
    );
    if (signal.aborted) stop();
  });
}

function encode(channels, format, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    checkAbort(signal);
    let worker;
    try {
      worker = new Worker(new URL('./vendor/audio/encoder-worker.js', import.meta.url));
    } catch {
      reject(new Error('Webbläsaren kunde inte starta ljudkonverteringen. Prova en aktuell Chrome, Edge, Firefox eller Safari.'));
      return;
    }
    let finished = false;
    const cleanup = () => {
      finished = true;
      signal?.removeEventListener('abort', cancel);
      worker.terminate();
    };
    const cancel = () => {
      if (finished) return;
      cleanup();
      reject(aborted());
    };
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => {
      if (finished) return;
      cleanup();
      reject(new Error('Ljudmotorn kunde inte läsas in. Ladda om sidan och försök igen.'));
    };
    worker.onmessage = ({ data }) => {
      if (finished) return;
      if (data.type === 'progress') {
        onProgress?.(.25 + data.value * .73, `Skapar ${format.toUpperCase()}…`);
      } else if (data.type === 'done') {
        cleanup();
        resolve(new Blob(data.parts, { type: format === 'mp3' ? 'audio/mpeg' : 'audio/wav' }));
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message || 'Ljudfilen kunde inte konverteras.'));
      }
    };
    if (signal?.aborted) { cancel(); return; }
    try {
      worker.postMessage({ format, channels, sampleRate: SAMPLE_RATE, bitrate: 192 }, channels.map((channel) => channel.buffer));
    } catch {
      cleanup();
      reject(new Error('Ljudfilen är för stor för minnet på den här enheten. Prova en kortare fil.'));
    }
  });
}

/**
 * Local-only conversion. onProgress receives (fraction 0–1, Swedish message).
 * Input codec support follows the browser's Web Audio decoder.
 * Output is mono/stereo, 44.1 kHz; WAV is 16-bit PCM, MP3 is 192 kbit/s.
 */
export async function convertAudio(file, format, { onProgress, signal } = {}) {
  checkAbort(signal);
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (!audioOutputs(extension).some((output) => output.value === format)) {
    throw new Error('Välj en MP3-, WAV-, M4A-, AAC-, OGG- eller FLAC-fil och MP3 eller WAV som målformat.');
  }
  if (!file.size) throw new Error('Ljudfilen är tom. Välj en annan fil.');
  if (file.size > MAX_BYTES) throw new Error('Ljudfilen får vara högst 50 MB.');
  const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!OfflineContext || !globalThis.Worker) throw new Error('Den här webbläsaren stöder inte lokal ljudkonvertering. Prova en aktuell Chrome, Edge, Firefox eller Safari.');

  onProgress?.(.02, 'Läser ljudfilen…');
  const bytes = await withAbort(file.arrayBuffer(), signal);
  checkAbort(signal);
  onProgress?.(.08, 'Öppnar ljudet…');
  let decoded;
  try {
    const decoder = new OfflineContext(2, 1, SAMPLE_RATE);
    decoded = await withAbort(decoder.decodeAudioData(bytes), signal);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Webbläsaren kunde inte öppna ljudet. Filen kan vara skadad eller använda en ljudkodning som inte stöds. Prova MP3 eller WAV.');
  }
  checkAbort(signal);
  if (!decoded.length || !Number.isFinite(decoded.duration)) throw new Error('Ljudfilen innehåller inget läsbart ljud.');
  if (decoded.duration > MAX_SECONDS) throw new Error('Välj en ljudfil som är högst 10 minuter lång.');
  if (decoded.numberOfChannels > 2) throw new Error('Ljud med fler än två kanaler stöds inte ännu. Välj en mono- eller stereofil.');
  let channels;
  try {
    channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) => new Float32Array(decoded.getChannelData(channel)));
  } catch {
    throw new Error('Ljudfilen är för stor för minnet på den här enheten. Prova en kortare fil.');
  }
  decoded = null;
  onProgress?.(.25, `Skapar ${format.toUpperCase()}…`);
  const blob = await encode(channels, format, { signal, onProgress });
  checkAbort(signal);
  onProgress?.(1, 'Ljudfilen är klar.');
  const basename = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 150) || 'ljud';
  return {
    blob,
    filename: `${basename}-konverterad.${format}`,
    warnings: [format === 'mp3'
      ? 'MP3 komprimerar ljudet med viss kvalitetsförlust. Titel, omslag och annan metadata följer inte med.'
      : 'WAV-filen innehåller 16-bitars ljud i 44,1 kHz. Titel, omslag och annan metadata följer inte med.']
  };
}
