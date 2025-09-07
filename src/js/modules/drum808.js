// TR-808-like Drum Machine module
// Exports: initDrumMachine(windowEl)

let drumCtx = null;
let drumMaster = null;

const drumState = {
  bpm: 120,
  swing: 0,
  isPlaying: false,
  currentStep: 0,
  steps: 16,
  lookahead: 25 / 1000,
  scheduleAhead: 0.1,
  nextNoteTime: 0,
  timerID: null,
  pattern: {},
  instruments: [
    { id: "bd", name: "Bass Drum", file: "bd.wav", volume: 0.9 },
    { id: "sd", name: "Snare", file: "sd.wav", volume: 0.8 },
    { id: "lt", name: "Low Tom", file: "lt.wav", volume: 0.8 },
    { id: "mt", name: "Mid Tom", file: "mt.wav", volume: 0.8 },
    { id: "ht", name: "High Tom", file: "ht.wav", volume: 0.8 },
    { id: "rs", name: "Rimshot", file: "rim.wav", volume: 0.7 },
    { id: "cp", name: "Clap", file: "clap.wav", volume: 0.7 },
    { id: "ch", name: "Closed Hat", file: "ch.wav", volume: 0.7 },
    { id: "oh", name: "Open Hat", file: "oh.wav", volume: 0.7 },
    { id: "cy", name: "Cymbal", file: "cym.wav", volume: 0.7 },
    { id: "cb", name: "Cowbell", file: "cow.wav", volume: 0.7 },
  ],
  buffers: {},
  gains: {},
  mutes: {},
  solos: {},
  playingSources: {},
};

function ensureAudio() {
  if (!drumCtx) {
    drumCtx = new (window.AudioContext || window.webkitAudioContext)();
    drumMaster = drumCtx.createGain();
    drumMaster.gain.value = 0.9;
    drumMaster.connect(drumCtx.destination);
  }
}

async function loadSample(file) {
  const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const url = `${base}samples/808/${file}`;
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return new Promise((resolve, reject) => {
    drumCtx.decodeAudioData(arr, resolve, reject);
  });
}

async function loadAllSamples() {
  ensureAudio();
  const loads = drumState.instruments.map(async (inst) => {
    const buf = await loadSample(inst.file).catch(() => null);
    drumState.buffers[inst.id] = buf;
  });
  await Promise.all(loads);
}

function buildPattern() {
  const saved = localStorage.getItem("drum808_pattern_v1");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.steps && parsed.pattern) {
        drumState.steps = parsed.steps;
        drumState.pattern = parsed.pattern;
        return;
      }
    } catch {}
  }
  drumState.instruments.forEach((inst) => {
    drumState.pattern[inst.id] = Array.from({ length: drumState.steps }, () => ({ on: false, accent: false }));
  });
}

function savePattern() {
  const payload = { steps: drumState.steps, pattern: drumState.pattern };
  localStorage.setItem("drum808_pattern_v1", JSON.stringify(payload));
}

function scheduleNote(instId, time, velocity = 1) {
  const buffer = drumState.buffers[instId];
  if (!buffer) {
    const osc = drumCtx.createOscillator();
    const gain = drumCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.2 * velocity, time + 0.005);
    gain.gain.linearRampToValueAtTime(0.0, time + 0.08);
    osc.connect(gain).connect(drumMaster);
    osc.start(time);
    osc.stop(time + 0.09);
    return;
  }

  const src = drumCtx.createBufferSource();
  src.buffer = buffer;

  const g = drumState.gains[instId] || drumCtx.createGain();
  if (!drumState.gains[instId]) {
    g.gain.value = drumState.instruments.find((x) => x.id === instId)?.volume ?? 0.8;
    g.connect(drumMaster);
    drumState.gains[instId] = g;
  }

  const isMuted = !!drumState.mutes[instId];
  const anySolo = Object.values(drumState.solos).some(Boolean);
  const soloed = anySolo ? !!drumState.solos[instId] : true;
  const finalGain = isMuted || !soloed ? 0 : 1;

  const hitGain = drumCtx.createGain();
  hitGain.gain.value = finalGain * velocity;

  src.connect(hitGain).connect(g);

  // hi-hat choke
  try {
    if (instId === "ch" && drumState.playingSources["oh"]) {
      drumState.playingSources["oh"].forEach((node) => {
        try { node.stop(time); } catch {}
      });
    }
  } catch {}

  if (!drumState.playingSources[instId]) {
    drumState.playingSources[instId] = new Set();
  }
  drumState.playingSources[instId].add(src);
  src.onended = () => {
    try { drumState.playingSources[instId]?.delete(src); } catch {}
  };

  src.start(time);
}

function nextStepTimeInterval() {
  const sixteenth = (60.0 / drumState.bpm) / 4;
  const isEven = ((drumState.currentStep + 1) % 2 === 0);
  const swingDelay = isEven ? sixteenth * drumState.swing : 0;
  return sixteenth + swingDelay;
}

function scheduleAhead() {
  while (drumState.nextNoteTime < drumCtx.currentTime + drumState.scheduleAhead) {
    const step = drumState.currentStep;
    const anySolo = Object.values(drumState.solos).some(Boolean);

    drumState.instruments.forEach((inst) => {
      const cell = drumState.pattern[inst.id]?.[step];
      if (!cell || !cell.on) return;
      if (anySolo && !drumState.solos[inst.id]) return;
      const velocity = cell.accent ? 1.0 : 0.8;
      scheduleNote(inst.id, drumState.nextNoteTime, velocity);
    });

    updatePlayhead(step);
    const interval = nextStepTimeInterval();
    drumState.nextNoteTime += interval;
    drumState.currentStep = (drumState.currentStep + 1) % drumState.steps;
  }
}

function updatePlayhead(step) {
  const grid = document.querySelector(".drum__grid");
  if (!grid) return;
  grid.querySelectorAll(".drum__step").forEach((b, idx) => {
    b.classList.toggle("is-playing", (idx % drumState.steps) === step);
  });
}

function start() {
  ensureAudio();
  drumCtx.resume();
  if (drumState.isPlaying) return;
  drumState.isPlaying = true;
  drumState.currentStep = 0;
  drumState.nextNoteTime = drumCtx.currentTime + 0.06;
  drumState.timerID = setInterval(scheduleAhead, drumState.lookahead * 1000);
  document.body.classList.add("body--audio-playing");
}

function stop() {
  if (!drumState.isPlaying) return;
  drumState.isPlaying = false;
  clearInterval(drumState.timerID);
  drumState.timerID = null;
  updatePlayhead(-1);
  document.body.classList.remove("body--audio-playing");
}

function toggleCell(instId, step, accentToggle = false) {
  const cell = drumState.pattern[instId][step];
  if (accentToggle) {
    if (cell.on) cell.accent = !cell.accent;
  } else {
    cell.on = !cell.on;
    if (!cell.on) cell.accent = false;
  }
  savePattern();
}

function renderDrumUI(root) {
  const daaw = root.querySelector(".music-daaw");
  if (daaw) daaw.innerHTML = "";

  const container = document.createElement("div");
  container.className = "drum";

  const controls = document.createElement("div");
  controls.className = "drum__controls";

  const bpmWrap = document.createElement("div");
  bpmWrap.className = "drum__ctrl";
  bpmWrap.innerHTML = `
    <label class="drum__label">BPM</label>
    <input class="drum__bpm" type="range" min="60" max="200" step="1" value="${drumState.bpm}">
    <input class="drum__bpm-input" type="number" min="60" max="200" step="1" value="${drumState.bpm}">
  `;

  const swingWrap = document.createElement("div");
  swingWrap.className = "drum__ctrl";
  swingWrap.innerHTML = `
    <label class="drum__label">Swing</label>
    <input class="drum__swing" type="range" min="0" max="0.6" step="0.01" value="${drumState.swing}">
  `;

  const patternWrap = document.createElement("div");
  patternWrap.className = "drum__ctrl";
  patternWrap.innerHTML = `
    <label class="drum__label">Pas</label>
    <select class="drum__steps">
      <option value="16" ${drumState.steps === 16 ? "selected" : ""}>16</option>
      <option value="8" ${drumState.steps === 8 ? "selected" : ""}>8</option>
    </select>
  `;

  const miscWrap = document.createElement("div");
  miscWrap.className = "drum__ctrl";
  miscWrap.innerHTML = `
    <button class="drum__save">Sauver</button>
    <button class="drum__clear">Clear</button>
  `;

  const presetWrap = document.createElement("div");
  presetWrap.className = "drum__ctrl";
  presetWrap.innerHTML = `
    <label class="drum__label">Preset</label>
    <select class="drum__preset">
      <option value="none">---</option>
      <option value="four">Four on the Floor</option>
      <option value="electro">Electro 808</option>
      <option value="boomBap">Boom Bap</option>
    </select>
    <button class="drum__preset-load">Load</button>
  `;

  controls.append(bpmWrap, swingWrap, patternWrap, miscWrap, presetWrap);

  const grid = document.createElement("div");
  grid.className = "drum__grid";

  drumState.instruments.forEach((inst) => {
    const row = document.createElement("div");
    row.className = "drum__row";

    const head = document.createElement("div");
    head.className = "drum__row-head";
    head.innerHTML = `
      <span class="drum__inst">${inst.name}</span>
      <button class="drum__btn drum__btn--mute" data-inst="${inst.id}" title="Mute">M</button>
      <button class="drum__btn drum__btn--solo" data-inst="${inst.id}" title="Solo">S</button>
      <input class="drum__vol" type="range" min="0" max="1" step="0.01" value="${inst.volume}" data-inst="${inst.id}">
    `;

    const stepsWrap = document.createElement("div");
    stepsWrap.className = "drum__steps-wrap";
    for (let s = 0; s < drumState.steps; s++) {
      const btn = document.createElement("button");
      btn.className = "drum__step";
      btn.dataset.inst = inst.id;
      btn.dataset.step = String(s);
      if (drumState.pattern[inst.id][s].on) btn.classList.add("is-active");
      if (drumState.pattern[inst.id][s].accent) btn.classList.add("is-accent");
      if ((s % 4) === 0) btn.classList.add("is-beat");
      btn.addEventListener("click", () => {
        toggleCell(inst.id, s, false);
        btn.classList.toggle("is-active");
        btn.classList.remove("is-accent");
      });
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleCell(inst.id, s, true);
        if (drumState.pattern[inst.id][s].on) {
          btn.classList.toggle("is-accent");
        }
      });
      stepsWrap.appendChild(btn);
    }

    row.appendChild(head);
    row.appendChild(stepsWrap);
    grid.appendChild(row);
  });

  container.appendChild(controls);
  container.appendChild(grid);
  daaw?.appendChild(container);

  const bpmRange = container.querySelector(".drum__bpm");
  const bpmInput = container.querySelector(".drum__bpm-input");
  const swingInput = container.querySelector(".drum__swing");
  const stepsSelect = container.querySelector(".drum__steps");
  const saveBtn = container.querySelector(".drum__save");
  const clearBtn = container.querySelector(".drum__clear");
  const presetSelect = container.querySelector(".drum__preset");
  const presetLoad = container.querySelector(".drum__preset-load");

  bpmRange.addEventListener("input", () => {
    drumState.bpm = parseInt(bpmRange.value, 10);
    bpmInput.value = drumState.bpm;
  });
  bpmInput.addEventListener("change", () => {
    drumState.bpm = Math.min(200, Math.max(60, parseInt(bpmInput.value || "120", 10)));
    bpmRange.value = drumState.bpm;
  });
  swingInput.addEventListener("input", () => {
    drumState.swing = parseFloat(swingInput.value);
  });
  stepsSelect.addEventListener("change", () => {
    const s = parseInt(stepsSelect.value, 10);
    drumState.steps = s;
    Object.keys(drumState.pattern).forEach((k) => {
      const old = drumState.pattern[k];
      const next = Array.from({ length: s }, (_, i) => old?.[i] ?? { on: false, accent: false });
      drumState.pattern[k] = next;
    });
    savePattern();
    renderDrumUI(root);
  });

  saveBtn.addEventListener("click", () => savePattern());
  clearBtn.addEventListener("click", () => {
    Object.keys(drumState.pattern).forEach((k) => {
      drumState.pattern[k] = Array.from({ length: drumState.steps }, () => ({ on: false, accent: false }));
    });
    savePattern();
    renderDrumUI(root);
  });

  presetLoad.addEventListener("click", () => {
    const name = presetSelect.value;
    if (!name || name === "none") return;
    applyPreset(name);
    savePattern();
    renderDrumUI(root);
  });

  const playBtn = root.querySelector(".music__controls-button--play");
  const stopBtn = root.querySelector(".music__controls-button--stop");
  if (playBtn) playBtn.onclick = () => start();
  if (stopBtn) stopBtn.onclick = () => stop();
}

function stepsFrom(str) {
  const arr = [];
  const len = Math.min(str.length, drumState.steps);
  for (let i = 0; i < drumState.steps; i++) {
    if (i < len) {
      const c = str[i];
      arr.push({ on: c === 'x' || c === 'X', accent: c === 'X' });
    } else {
      arr.push({ on: false, accent: false });
    }
  }
  return arr;
}

function applyPreset(name) {
  const p = {};
  switch (name) {
    case 'four':
      drumState.bpm = 124;
      p.bd = stepsFrom('x...x...x...x...');
      p.sd = stepsFrom('....x.......x...');
      p.cp = stepsFrom('....x.......x...');
      p.ch = stepsFrom('x.x.x.x.x.x.x.x.');
      p.oh = stepsFrom('....x.......x...');
      break;
    case 'electro':
      drumState.bpm = 112;
      p.bd = stepsFrom('x...x...x..x....');
      p.sd = stepsFrom('....x.......x...');
      p.cp = stepsFrom('........x.......');
      p.ch = stepsFrom('x.xxx.x.xxx.x.x.');
      p.oh = stepsFrom('........x.......');
      p.cb = stepsFrom('....x...........');
      break;
    case 'boomBap':
      drumState.bpm = 92;
      p.bd = stepsFrom('x.......x.......');
      p.sd = stepsFrom('....x.......x...');
      p.cp = stepsFrom('........x.......');
      p.ch = stepsFrom('x.x.x.x.x.x.x.x.');
      break;
    default:
      return;
  }

  Object.keys(drumState.pattern).forEach((k) => {
    if (p[k]) {
      drumState.pattern[k] = p[k];
    } else {
      drumState.pattern[k] = Array.from({ length: drumState.steps }, () => ({ on: false, accent: false }));
    }
  });
}

export async function initDrumMachine(windowEl) {
  const root = windowEl.querySelector(".window__content--music");
  if (!root || root.dataset.drumInit === "true") return;
  root.dataset.drumInit = "true";

  buildPattern();
  ensureAudio();
  await loadAllSamples();
  renderDrumUI(root);
}

