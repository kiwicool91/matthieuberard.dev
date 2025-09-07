// ESM script to synthesize simple 808-like WAV samples into public/samples/808
// No external deps; generates 16-bit mono PCM at 44.1kHz
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SR = 44100;

function writeWavPCM16(filepath, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) >> 3;
  const byteRate = SR * blockAlign;
  const dataLength = samples.length * 2; // 16-bit
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  let p = 0;
  function w8(v){ view.setUint8(p++, v); }
  function w16(v){ view.setUint16(p, v, true); p+=2; }
  function w32(v){ view.setUint32(p, v, true); p+=4; }
  // RIFF header
  [82,73,70,70].forEach(w8); // 'RIFF'
  w32(36 + dataLength);
  [87,65,86,69].forEach(w8); // 'WAVE'
  // fmt chunk
  [102,109,116,32].forEach(w8); // 'fmt '
  w32(16); // PCM chunk size
  w16(1); // Audio format = PCM
  w16(numChannels);
  w32(SR);
  w32(byteRate);
  w16(blockAlign);
  w16(bitsPerSample);
  // data chunk
  [100,97,116,97].forEach(w8); // 'data'
  w32(dataLength);
  // samples (clamp and convert)
  const clamp = (x) => Math.max(-1, Math.min(1, x));
  for (let i = 0; i < samples.length; i++) {
    const s = clamp(samples[i]);
    const v = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(p, v|0, true); p+=2;
  }
  writeFileSync(filepath, Buffer.from(buffer));
}

// Envelopes / helpers
const expEnv = (t, decay) => Math.exp(-t / decay);
function sine(f, t) { return Math.sin(2 * Math.PI * f * t); }
function noise() { return Math.random() * 2 - 1; }
function lin(a, b, t) { return a + (b - a) * t; }

function genKick(seconds = 0.5) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const f = lin(80, 40, t); // quick downward sweep
    const env = expEnv(t, 0.25) * 0.95;
    out[i] = sine(f, t) * env + (i < 100 ? 0.3 * (noise()) : 0);
  }
  return out;
}

function genSnare(seconds = 0.3) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const tone = sine(180, t) * expEnv(t, 0.1) * 0.4;
    const n = noise() * expEnv(t, 0.06) * 0.7;
    out[i] = n + tone;
  }
  return out;
}

function genTom(freq = 140, seconds = 0.35) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const f = lin(freq * 1.2, freq, t);
    const env = expEnv(t, 0.18);
    out[i] = sine(f, t) * env;
  }
  return out;
}

function genHat(seconds = 0.07) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // crude highpass noise shape
    const n = (noise() - noise() * 0.5) * expEnv(t, 0.02);
    out[i] = n * 0.8;
  }
  return out;
}

function genOpenHat(seconds = 0.35) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const n = (noise() - noise() * 0.5) * expEnv(t, 0.12);
    out[i] = n * 0.6;
  }
  return out;
}

function genCym(seconds = 1.0) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const n = (noise() + sine(6000, t)*0.1) * expEnv(t, 0.4);
    out[i] = n * 0.4;
  }
  return out;
}

function genRim(seconds = 0.06) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const click = (i < 60 ? 1 : 0) * 0.7;
    const tone = sine(2000, t) * expEnv(t, 0.01) * 0.3;
    out[i] = click + tone;
  }
  return out;
}

function genClap(seconds = 0.25) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  const bursts = [0, 0.015, 0.03];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let v = 0;
    for (const b of bursts) {
      const tt = Math.max(0, t - b);
      v += (noise() * expEnv(tt, 0.025));
    }
    out[i] = v * 0.5;
  }
  return out;
}

function genCowbell(seconds = 0.18) {
  const N = Math.floor(SR * seconds);
  const out = new Float32Array(N);
  const f1 = 540, f2 = 800;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = expEnv(t, 0.08);
    const v = Math.sign(sine(f1, t)) * 0.5 + Math.sign(sine(f2, t)) * 0.5;
    out[i] = v * env * 0.6;
  }
  return out;
}

const targets = [
  { file: 'bd.wav', fn: genKick },
  { file: 'sd.wav', fn: genSnare },
  { file: 'lt.wav', fn: () => genTom(110) },
  { file: 'mt.wav', fn: () => genTom(150) },
  { file: 'ht.wav', fn: () => genTom(200) },
  { file: 'rim.wav', fn: genRim },
  { file: 'clap.wav', fn: genClap },
  { file: 'ch.wav', fn: genHat },
  { file: 'oh.wav', fn: genOpenHat },
  { file: 'cym.wav', fn: genCym },
  { file: 'cow.wav', fn: genCowbell },
];

const outDir = resolve(__dirname, '..', 'public', 'samples', '808');
mkdirSync(outDir, { recursive: true });

for (const t of targets) {
  const samples = t.fn();
  const fp = resolve(outDir, t.file);
  writeWavPCM16(fp, samples);
  console.log('Wrote', fp);
}

console.log('Done generating 808-like samples.');

