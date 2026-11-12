/* Local worker: no file content leaves the browser. */
'use strict';

function pcm16(value) {
  const sample = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  return Math.round(sample < 0 ? sample * 32768 : sample * 32767);
}

function encodeWav(channels, sampleRate) {
  const frames = channels[0].length;
  const channelCount = channels.length;
  const buffer = new ArrayBuffer(44 + frames * channelCount * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, frames * channelCount * 2, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      view.setInt16(offset, pcm16(channels[channel][frame]), true);
      offset += 2;
    }
    if (frame % 262144 === 0) postMessage({ type: 'progress', value: frame / frames });
  }
  return [buffer];
}

function encodeMp3(channels, sampleRate, bitrate) {
  importScripts('./lame.min.js');
  const encoder = new lamejs.Mp3Encoder(channels.length, sampleRate, bitrate);
  const parts = [];
  const frames = channels[0].length;
  const blockSize = 1152;
  for (let start = 0; start < frames; start += blockSize) {
    const end = Math.min(frames, start + blockSize);
    const block = channels.map((channel) => {
      const samples = new Int16Array(end - start);
      for (let i = start; i < end; i++) samples[i - start] = pcm16(channel[i]);
      return samples;
    });
    const encoded = encoder.encodeBuffer(block[0], block[1]);
    if (encoded.length) parts.push(new Uint8Array(encoded).buffer);
    if (start % (blockSize * 32) === 0) postMessage({ type: 'progress', value: start / frames });
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(new Uint8Array(tail).buffer);
  return parts;
}

self.onmessage = ({ data }) => {
  try {
    const { channels, sampleRate, format, bitrate } = data;
    if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 || !channels[0].length || !channels.every((channel) => channel.length === channels[0].length)) {
      throw new Error('Ljudets kanaler kunde inte läsas.');
    }
    const parts = format === 'mp3' ? encodeMp3(channels, sampleRate, bitrate) : encodeWav(channels, sampleRate);
    postMessage({ type: 'done', parts }, parts);
  } catch (error) {
    postMessage({ type: 'error', message: error.message || 'Ljudfilen kunde inte konverteras.' });
  }
};
