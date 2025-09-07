import interact from "interactjs";
import * as webllm from "@mlc-ai/web-llm";
import gsap from "gsap";
import { initDrumMachine } from "./modules/drum808.js";
import { initBackground } from "./modules/background3d.js";
import { initScreensaver } from "./modules/screensaver.js";
import { initPaint } from "./modules/paint.js";
import { initSnake } from "./games/snake.js";

const isDebug = import.meta.env.DEV;

const progressSentences = ["Remplissage du mug de café ☕️", "Ajout des lunettes sur le nez 👓", "Ouverture de l'éditeur de texte 📝", "Branchement du cerveau en cours 🧠", "Chargement de la créativité 🎨", "Alignement des pixels parfaits 📐", "Connexion au mode développeur 💻", "Synchronisation avec le café du jour ☕️", "Compilation de la motivation 🔧", "Ouverture de la console 🎛️", "Recherche de la page 404 🔍", "Recherche des paquets perdus 🔍"];
let availableProgressSentences = [...progressSentences];

document.addEventListener("DOMContentLoaded", async () => {
  const progressBar = document.querySelector(".progress__bar");
  const progressMessage = document.querySelector(".progress__message");
  const windowEl = document.querySelector(".windows");
  const taskBar = document.querySelector(".taskbar");
  const taskBarWeatherEl = taskBar.querySelector(".weather__icon");
  const taskBarDateEl = taskBar.querySelector(".taskbar__date");
  const taskBarTimerEl = taskBar.querySelector(".taskbar__timer");
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isWebGPUSupported = !!navigator.gpu;

  const windows = {};
  const windowElems = document.querySelectorAll(".window");
  windowElems.forEach((windowEl) => {
    const windowId = windowEl.id;
    windows[windowId] = { el: windowEl, isOpen: false };
  });

  let highestZ = 1;

  let isLightMode = false;
  let isAmbiantSoundPlaying = false;
  let previousIndex = 0;
  let newIndex = 0;

  let chatInstance;
  let isLLMReady = false;

  async function initChatLLM(statusElement) {
    const engine = new webllm.MLCEngine();
    await engine.setInitProgressCallback((report) => {
      // console.log("initializing", report.text);
      if (statusElement) {
        statusElement.innerHTML = `<span class="chat__item-text">${report.text}</span><span class="processing">...</span>`;
      }
    });
    // const model = "Phi-3.5-mini-instruct-q4f16_1-MLC";
    const model = "Mistral-7B-Instruct-v0.3-q4f16_1-MLC";
    await engine.reload(model);

    chatInstance = engine;
    isLLMReady = true;
    if (statusElement) {
      statusElement.classList.add("chat__item--loaded");
      statusElement.innerHTML = `<span>Je suis MB Assistant, vous pouvez me poser toutes vos questions sur Matthieu BERARD ou sur un autre sujet ! <strong>Attention</strong>, soyez patient je peux mettre du temps à répondre</span>`;
    }
  }

  async function sendToLLM(question) {
    const messages = [
      {
        role: "system",
        content: `Tu es MB Assistant, l’assistant personnel de Matthieu Bérard — un développeur fullstack passionné, humble et sympathique. Tu parles en son nom en donnant des réponses courtes et claires. Matthieu est spécialisé en front-end (thèmes personnalisés pour Hubspot et WordPress), mais il travaille aussi côté back avec Node.js (serverless), PHP et un peu de Python. Il travaille chez Markentive depuis 2019, après avoir été chez Haikara (2017–2019), et il s’est formé à l’IFOCOP (dev web, React, gestion de projet). Il aime les animations CSS au service de l’UX, bidouiller des projets persos (apps Electron, extensions Chromium), jouer aux jeux vidéo et bricoler de l’électronique. Il s’intéresse aussi à React, Svelte et à l’optimisation des interfaces. Tu réponds aux questions sur ses compétences, son parcours ou ses centres d’intérêt avec précision, concision et bienveillance.`,
      },
      {
        role: "user",
        content: question,
      },
    ];

    const completion = await chatInstance.chat.completions.create({ messages });

    return completion.choices[0].message.content;
  }

  function isFirstVisit() {
    return sessionStorage.getItem("hasVisited") === "true";
  }

  const isFirstVisitStatus = isFirstVisit();

  if (isFirstVisitStatus) {
    document.body.classList.add("body--reload");
  } else {
    sessionStorage.setItem("hasVisited", "true");
  }

  const delay = (ms) =>
    new Promise((res) => {
      // console.log(ms);
      setTimeout(res, ms);
    });

  const updateProgressMessage = () => {
    if (availableProgressSentences.length === 0) {
      availableProgressSentences = [...progressSentences];
    }
    const randomIndex = Math.floor(Math.random() * availableProgressSentences.length);
    const sentence = availableProgressSentences[randomIndex];
    availableProgressSentences.splice(randomIndex, 1);
    progressMessage.textContent = sentence;
  };
  updateProgressMessage();

  const taskbarTime = () => {
    setInterval(() => {
      taskBarTimerEl.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }, 1000);
  };
  taskbarTime();

  const taskbarDate = () => {
    const date = new Date();
    const options = { weekday: "short", day: "2-digit", month: "short" };
    let dateStr = date.toLocaleDateString("fr-FR", options);
    dateStr = dateStr.replace(/^(\w+)\.?/, (match, p1) => `${p1.slice(0, 1).toUpperCase()}${p1.slice(1)}.`).replace(" avr.", " avr.");
    taskBarDateEl.textContent = dateStr;
  };
  taskbarDate();

  const taskBarNightorDay = (taskBarWeatherEl) => {
    const hour = new Date().getHours();
    taskBarWeatherEl.textContent = hour >= 6 && hour < 18 ? "🌞" : "🌚";
  };
  taskBarNightorDay(taskBarWeatherEl);

  const weatherInterval = setInterval(() => {
    taskBarNightorDay(taskBarWeatherEl);
  }, 1000);

  await delay(isDebug ? 100 : isFirstVisitStatus ? 200 : 500);
  document.body.classList.add("loading"); // show progress bar

  await delay(isDebug ? 100 : 1000);
  progressMessage.classList.add("progress__message--animation");
  const messageInterval = setInterval(updateProgressMessage, 2000);

  progressBar.classList.add("progress__bar--animation");

  await delay(isDebug ? 100 : isFirstVisitStatus ? 2000 : 8000);
  clearInterval(messageInterval);

  document.body.classList.remove("loading");
  document.body.classList.add("loaded");
  progressMessage.classList.remove("progress__message--animation");

  await delay(1000);

  taskBar.classList.add("taskbar--visible");
  windowEl.classList.add("windows--visible");

  // 3D Background module
  const bg = initBackground({ isMobile, isLightMode });

  const focusWindow = (windowElement) => {
    const currentZ = parseInt(windowElement.style.zIndex) || 0;
    if (currentZ < highestZ) {
      highestZ++;
      windowElement.style.zIndex = highestZ;
    }
  };

  const ambiantSoundPlayer = document.querySelector(".ambiant-sound");

  function playWithFade(audio, duration = 2000) {
    audio.volume = 0;
    audio.play().catch((e) => console.warn("play error", e));
    const interval = 50;
    const step = interval / duration;
    const timer = setInterval(() => {
      audio.volume = Math.min(audio.volume + step, 1);
      if (audio.volume === 1) clearInterval(timer);
    }, interval);
  }

  function pauseWithFade(audio, duration = 2000) {
    const interval = 50;
    const step = interval / duration;
    const timer = setInterval(() => {
      audio.volume = Math.max(audio.volume - step, 0);
      if (audio.volume === 0) {
        clearInterval(timer);
        audio.pause();
      }
    }, interval);
  }

  const lightModeEl = document.querySelector("#light-mode");
  lightModeEl.addEventListener(
    "change",
    () => {
      isLightMode = !isLightMode;
      document.body.classList.toggle("body--light");
      try {
        bg.setLightMode(isLightMode);
      } catch {}
      // console.log("isLightMode", isLightMode);
    },
    false
  );

  const ambiantSoundEl = document.querySelector("#ambiant-sound");
  ambiantSoundEl.addEventListener(
    "change",
    () => {
      isAmbiantSoundPlaying = ambiantSoundEl.checked;
      if (isAmbiantSoundPlaying) {
        if (isMobile) {
          ambiantSoundPlayer.play();
          document.body.classList.add("body--audio-playing");
        } else {
          playWithFade(ambiantSoundPlayer, 1500);
          document.body.classList.add("body--audio-playing");
        }
      } else {
        if (isMobile) {
          ambiantSoundPlayer.pause();
          document.body.classList.remove("body--audio-playing");
        } else {
          pauseWithFade(ambiantSoundPlayer, 1000);
          setTimeout(() => {
            document.body.classList.remove("body--audio-playing");
          }, 1000);
        }
      }
      // console.log("isAmbiantSoundPlaying", isAmbiantSoundPlaying);
    },
    false
  );

  // Background shape select is handled inside background3d module

  const refLinks = document.querySelectorAll(".ref__link");
  refLinks.forEach((refLink) => {
    refLink.addEventListener("click", () => {
      if (refLink.dataset.target === "blank") {
        window.open(refLink.dataset.href);
      } else {
        openWindow("window-browser", "max", "max", refLink.dataset.href, true);
      }
    });

    const tooltip = refLink.querySelector(".ref__link-tooltip");
    if (tooltip) {
      const refLinkPos = refLink.getBoundingClientRect();
      const newTooltip = tooltip.cloneNode(true);

      document.body.appendChild(newTooltip);

      refLink.addEventListener("mouseenter", () => {
        newTooltip.classList.add("ref__link-tooltip--visible");
      });

      refLink.addEventListener("mouseleave", () => {
        newTooltip.classList.remove("ref__link-tooltip--visible");
      });

      refLink.addEventListener("mousemove", (e) => {
        newTooltip.style.top = `${e.clientY + 22}px`;
        newTooltip.style.left = `${e.clientX + 12}px`;
      });
    }
  });

  // Game links tooltip (same behavior as refs)
  const gameLinks = document.querySelectorAll(".game__link");
  gameLinks.forEach((gameLink) => {
    const tooltip = gameLink.querySelector(".game__link-tooltip");
    if (tooltip) {
      const newTooltip = tooltip.cloneNode(true);
      document.body.appendChild(newTooltip);

      gameLink.addEventListener("mouseenter", () => {
        newTooltip.classList.add("game__link-tooltip--visible");
      });
      gameLink.addEventListener("mouseleave", () => {
        newTooltip.classList.remove("game__link-tooltip--visible");
      });
      gameLink.addEventListener("mousemove", (e) => {
        newTooltip.style.top = `${e.clientY + 22}px`;
        newTooltip.style.left = `${e.clientX + 12}px`;
      });
    }
    gameLink.addEventListener("click", () => {
      const game = gameLink.dataset.game;
      switch (game) {
        case "snake":
          openWindow("window-snake", isMobile ? "max" : 480, isMobile ? "max" : 520);
          break;
        default:
          openWindow("window-game", 660, 418);
      }
    });
  });

  // Paint module
  initPaint();

  const isWindows = navigator.userAgent.includes("Windows");

  const unixCommands = {
    pwd: () => "/home/user",
    ls: (args) => (args.length ? `Listing of ${args.join(" ")}:\nfile.txt\nnotes.md\nsrc\n.git` : "Documents\nDownloads\nPictures\nProjects"),
    whoami: () => "user",
    date: () => new Date().toString(),
    clear: () => "",
    echo: (args) => args.join(" "),
    uname: (args) => (args.includes("-a") ? "Darwin hostname 23.5.0 Darwin Kernel Version 23.5.0 x86_64" : "Darwin"),
    hostname: () => "matthieu-mac",
    pwdx: () => "/home/user", // fun extra
    cd: (args) => (args[0] ? `Changed directory to ${args[0]}` : "Stayed in /home/user"),
    cat: (args) => (args.length ? args.map((f) => `----- ${f} -----\nLorem ipsum dolor sit amet...\nEnd of ${f}\n`).join("\n") : "cat: missing file operand"),
    head: (args) => (args[0] ? `==> ${args[0]} <==\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5` : "head: missing file operand"),
    tail: (args) => (args[0] ? `==> ${args[0]} <==\nLast 5\nLast 4\nLast 3\nLast 2\nLast 1` : "tail: missing file operand"),
    grep: (args) => (args.length >= 2 ? `Binary file ${args[1]} matches\n${args[0]}: matched 3 lines` : "usage: grep PATTERN FILE"),
    find: (args) => `/home/user/Projects/app/index.js\n/home/user/Projects/app/src/main.js\n/home/user/Documents/${args[0] || "readme.md"}`,
    which: (args) => (args[0] ? `/usr/bin/${args[0]}` : "which: missing command"),
    whereis: (args) => (args[0] ? `${args[0]}: /usr/bin/${args[0]} /usr/share/man/man1/${args[0]}.1.gz` : "whereis: missing command"),
    man: (args) => (args[0] ? `${args[0]}(1) — dummy manual page\n${args[0]} does something very useful. (stub)` : "What manual page do you want?"),
    ps: () => `PID   TTY      TIME CMD\n 1337 ttys000  0:00 node dev\n 1492 ttys001  0:01 bash\n 2048 ttys002  0:00 vim main.js`,
    top: () => `top - 12:34 up 3 days,  4:12,  3 users,  load average: 0.42, 0.38, 0.35\nPID   COMMAND  %CPU %MEM\n1337  node     12.0  3.2\n1492  bash      0.0  0.1\n2048  vim       0.2  0.3`,
    kill: (args) => (args[0] ? `Terminated process ${args[0]}` : "kill: usage: kill PID"),
    mkdir: (args) => (args[0] ? `Created directory '${args[0]}'` : "mkdir: missing operand"),
    rmdir: (args) => (args[0] ? `Removed directory '${args[0]}'` : "rmdir: missing operand"),
    touch: (args) => (args.length ? args.map((f) => `Touched '${f}'`).join("\n") : "touch: missing file operand"),
    rm: (args) => (args.length ? args.map((f) => `Removed '${f}'`).join("\n") : "rm: missing operand"),
    mv: (args) => (args.length >= 2 ? `Moved '${args[0]}' -> '${args[1]}'` : "mv: missing file operands"),
    cp: (args) => (args.length >= 2 ? `Copied '${args[0]}' -> '${args[1]}'` : "cp: missing file operands"),
    chmod: (args) => (args.length >= 2 ? `Mode of '${args[1]}' changed to ${args[0]}` : "chmod: missing operand"),
    chown: (args) => (args.length >= 2 ? `Owner of '${args[1]}' changed to ${args[0]}` : "chown: missing operand"),
    df: () => `Filesystem   Size  Used Avail Use% Mounted on\n/dev/disk1  465G  120G  345G  26% /`,
    du: (args) => `12K ./Documents\n64K ./Downloads\n4.0K ./Pictures\n${args[0] || "."} total: 80K`,
    env: () => `PATH=/usr/local/bin:/usr/bin:/bin\nHOME=/home/user\nSHELL=/bin/zsh`,
    export: (args) => (args[0] ? `export ${args[0]} (saved)` : "export: missing argument"),
    alias: (args) => (args[0] ? `alias ${args[0]} (set)` : "alias ll='ls -alF'\nalias gs='git status'"),
    unalias: (args) => (args[0] ? `unalias ${args[0]}` : "unalias: usage: unalias name"),
    uptime: () => `14:22  up 3 days,  4:12,  3 users,  load average: 0.42, 0.38, 0.35`,
    ifconfig: () => `en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST>\n\tinet 192.168.1.42 netmask 0xffffff00 broadcast 192.168.1.255\n\tether: aa:bb:cc:dd:ee:ff`,
    ip: (args) => `192.168.1.42/24 dev en0 proto kernel scope link src 192.168.1.42`,
    ping: (args) => {
      const host = args[0] || "example.com";
      return `PING ${host} (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=57 time=20.1 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=57 time=19.8 ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 packets received, 0.0% packet loss`;
    },
    curl: (args) => {
      const url = args[0] || "https://example.com";
      return `HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<!doctype html><title>Dummy</title><h1>Fetched ${url}</h1>`;
    },
    wget: (args) => {
      const url = args[0] || "https://example.com/file.txt";
      return `--2025-09-06--  ${url}\nSaving to: 'file.txt'\n'file.txt' saved [1420/1420]`;
    },
    less: (args) => (args[0] ? `== ${args[0]} ==\n(less) Press q to quit...\nLorem ipsum...` : "less: missing file operand"),
    more: (args) => (args[0] ? `== ${args[0]} ==\n(more) Press q to continue...\nLorem ipsum...` : "more: missing file operand"),
    vi: (args) => `Opening vi ${args[0] || ""} (not really). :q to quit`,
    vim: (args) => `Opening vim ${args[0] || ""} (not really). :q to quit`,
    nano: (args) => `Opening nano ${args[0] || ""} (not really). Ctrl+X to exit`,
    fortune: () => "You will use Vim and like it.",
    sl: () => "You see a steam locomotive running across your terminal!",
    help: () => "Common commands: pwd, ls, cd, cat, echo, head, tail, grep, find, man, ps, top, kill, mkdir, rmdir, touch, rm, mv, cp, chmod, chown, uname, hostname, ifconfig, ip, ping, curl, wget, uptime, df, du, env, export, alias, unalias, which, whereis, less, more, vi, vim, nano, clear, date, whoami, fortune, sl",
  };

  const windowsCommands = {
    dir: () => " Volume in drive C is OS\n Directory of C:\\Users\\User\n\nDocuments\nDownloads\nPictures\nProjects",
    echo: (args) => args.join(" "),
    cls: () => "",
    whoami: () => "C:\\Users\\User",
    date: () => new Date().toString(),
    help: () => "List of commands: dir, echo, cls, whoami, date, help",
    starwars: () => "Playing Star Wars Episode IV in ASCII... (not really)",
  };

  const easterEggs = {
    "sudo rm -rf /": () => {
      const wipeDiv = document.createElement("div");
      wipeDiv.classList.add("wipe__overlay");
      document.body.prepend(wipeDiv);

      const wipeDivHeight = wipeDiv.getBoundingClientRect().height / 30;
      const wipeDivWidth = wipeDiv.getBoundingClientRect().width / 30;
      const wipeDivCollection = [];

      for (let i = 0; i < wipeDivHeight; i++) {
        for (let i = 0; i < wipeDivWidth; i++) {
          const square = document.createElement("div");
          square.classList.add("wipe__square");
          square.style.setProperty("--delay", `${Math.random() * 2}s`);

          wipeDivCollection.push(square);

          wipeDiv.appendChild(square);
        }
      }

      setTimeout(() => {
        wipeDiv.classList.add("wipe__overlay--visible");
      }, 500);

      return `Suppression en cours<span class="processing">...</span>`;
    },
    fall: () => {
      document.querySelectorAll(".window, .window__shortcut, .taskbar").forEach((el) => {
        const rect = el.getBoundingClientRect();

        gsap.set(el, {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          margin: 0,
        });

        gsap.to(el, {
          y: window.innerHeight - rect.top - rect.height,
          rotation: (Math.random() - 0.5) * 120,
          ease: "bounce.out",
          duration: 2 + Math.random(),
        });
      });

      return `🌪️`;
    },
    "hack the planet": () => "HACK THE PLANET!",
    "make coffee": () => "Error 418: I’m a teapot.",
  };

  function parseCommand(input) {
    const [cmd, ...args] = input.trim().split(" ");
    const cmdMap = isWindows ? windowsCommands : unixCommands;
    if (easterEggs[input]) return easterEggs[input]();
    if (cmdMap[cmd]) return typeof cmdMap[cmd] === "function" ? cmdMap[cmd](args) : cmdMap[cmd];
    return `Command not found: ${cmd}`;
  }

  // === TR-808-like Drum Machine ===
  let drumCtx = null;
  let drumMaster = null;
  let drumState = {
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
    playingSources: {}, // {instId: Set<AudioBufferSourceNode>}
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
    const base = import.meta && import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : "/";
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

    // Hi-hat choke: a Closed Hat cuts any Open Hat currently ringing
    try {
      if (instId === "ch" && drumState.playingSources["oh"]) {
        drumState.playingSources["oh"].forEach((node) => {
          try {
            node.stop(time);
          } catch {}
        });
      }
    } catch {}

    // Track active sources per instrument for choke/cleanup
    if (!drumState.playingSources[instId]) {
      drumState.playingSources[instId] = new Set();
    }
    drumState.playingSources[instId].add(src);
    src.onended = () => {
      try {
        drumState.playingSources[instId]?.delete(src);
      } catch {}
    };

    src.start(time);
  }

  function nextStepTimeInterval() {
    const sixteenth = 60.0 / drumState.bpm / 4;
    const isEven = (drumState.currentStep + 1) % 2 === 0;
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
      b.classList.toggle("is-playing", idx % drumState.steps === step);
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

    // Presets
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
        if (s % 4 === 0) btn.classList.add("is-beat");
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

    container.querySelectorAll(".drum__vol").forEach((vol) => {
      vol.addEventListener("input", () => {
        const instId = vol.dataset.inst;
        const g = drumState.gains[instId] || drumCtx?.createGain();
        if (!drumState.gains[instId] && g) {
          g.connect(drumMaster);
          drumState.gains[instId] = g;
        }
        if (g) g.gain.value = parseFloat(vol.value);
      });
    });

    container.querySelectorAll(".drum__btn--mute").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.inst;
        drumState.mutes[id] = !drumState.mutes[id];
        btn.classList.toggle("is-active", !!drumState.mutes[id]);
      });
    });

    container.querySelectorAll(".drum__btn--solo").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.inst;
        drumState.solos[id] = !drumState.solos[id];
        btn.classList.toggle("is-active", !!drumState.solos[id]);
      });
    });

    const playBtn = root.querySelector(".music__controls-button--play");
    const stopBtn = root.querySelector(".music__controls-button--stop");
    if (playBtn) playBtn.onclick = () => start();
    if (stopBtn) stopBtn.onclick = () => stop();
  }

  async function initDrumMachine(windowEl) {
    const root = windowEl.querySelector(".window__content--music");
    if (!root || root.dataset.drumInit === "true") return;
    root.dataset.drumInit = "true";

    buildPattern();
    ensureAudio();
    await loadAllSamples();
    renderDrumUI(root);
  }
  // === End Drum Machine ===

  // Presets utilities (after End marker to keep grouping simple)
  function stepsFrom(str) {
    // str length should be 16; 'x' = on, 'X' = accent, '.' = off
    const arr = [];
    const len = Math.min(str.length, drumState.steps);
    for (let i = 0; i < drumState.steps; i++) {
      if (i < len) {
        const c = str[i];
        arr.push({ on: c === "x" || c === "X", accent: c === "X" });
      } else {
        arr.push({ on: false, accent: false });
      }
    }
    return arr;
  }

  function applyPreset(name) {
    const p = {};
    switch (name) {
      case "four": // 4-on-the-floor house style
        drumState.bpm = 124;
        p.bd = stepsFrom("x...x...x...x...");
        p.sd = stepsFrom("....x.......x...");
        p.cp = stepsFrom("....x.......x...");
        p.ch = stepsFrom("x.x.x.x.x.x.x.x.");
        p.oh = stepsFrom("....x.......x...");
        break;
      case "electro": // classic 808 electro
        drumState.bpm = 112;
        p.bd = stepsFrom("x...x...x..x....");
        p.sd = stepsFrom("....x.......x...");
        p.cp = stepsFrom("........x.......");
        p.ch = stepsFrom("x.xxx.x.xxx.x.x.");
        p.oh = stepsFrom("........x.......");
        p.cb = stepsFrom("....x...........");
        break;
      case "boomBap": // 90s boom bap flavor
        drumState.bpm = 92;
        p.bd = stepsFrom("x.......x.......");
        p.sd = stepsFrom("....x.......x...");
        p.cp = stepsFrom("........x.......");
        p.ch = stepsFrom("x.x.x.x.x.x.x.x.");
        break;
      default:
        return;
    }

    // apply over existing pattern, clear unspecified rows
    Object.keys(drumState.pattern).forEach((k) => {
      if (p[k]) {
        drumState.pattern[k] = p[k];
      } else {
        drumState.pattern[k] = Array.from({ length: drumState.steps }, () => ({ on: false, accent: false }));
      }
    });
  }

  const openWindow = async (id = null, width = 480, height = 320, url = "", reload = false) => {
    const windowEl = windows[id].el;
    if (windows[id].isOpen) {
      focusWindow(windowEl);
      windowEl.classList.remove("window--minimized");
      windowEl.classList.add("window--visible");
      if (id === "window-browser" && url) {
        const iframe = windowEl.querySelector(".window__content-iframe");
        if (reload || iframe.getAttribute("src") !== url) {
          iframe.setAttribute("src", url);
        }
        const browserAction = document.querySelector(".taskbar__action--browser");
        if (browserAction) browserAction.classList.remove("taskbar__action--hidden");
      }
      return;
    }

    if (isMobile) {
      windowEl.style.top = `0px`;
      windowEl.style.left = `0px`;
      windowEl.style.width = `${window.innerWidth}px`;
      windowEl.style.height = `${window.innerHeight}px`;
      windowEl.style.zIndex = ++highestZ;
    } else {
      windowEl.style.top = `${height === "max" ? 0 : Math.random() * 100}px`;
      windowEl.style.left = `${width === "max" ? 0 : Math.random() * 100}px`;
      windowEl.style.width = `${width === "max" ? window.innerWidth : width}px`;
      windowEl.style.height = `${height === "max" ? window.innerHeight : height}px`;
      windowEl.style.zIndex = ++highestZ;
    }

    const windowContent = windowEl.querySelector(".window__content");

    if (id === "window-dont-press-button" && !windows[id].isOpen) {
      windowContent.querySelector(".window__content-video").play();
    }

    if (id === "window-music" && !windows[id].isOpen) {
      try {
        initDrumMachine(windowEl);
      } catch (e) {
        console.error("Drum machine init error", e);
      }
    }

    if (id === "window-browser") {
      const iframe = windowContent.querySelector(".window__content-iframe");
      if (!windows[id].isOpen) {
        setTimeout(() => {
          iframe.setAttribute("src", url);
        }, 500);
        const browserAction = document.querySelector(".taskbar__action--browser");
        if (browserAction) browserAction.classList.remove("taskbar__action--hidden");
      } else if (reload && url) {
        iframe.setAttribute("src", url);
      }
    }

    if (id === "window-snake" && !windows[id].isOpen) {
      try {
        initSnake(windowEl);
      } catch (e) {
        console.error("Snake init error", e);
      }
    }

    if (id === "window-chat" && !windows[id].isOpen) {
      const chatList = windowContent.querySelector(".chat__list");
      const chatForm = windowContent.querySelector(".chat__form");
      const chatFormInput = chatForm.querySelector(".chat__input");

      if (isMobile && !isWebGPUSupported) {
        const errorItem = document.createElement("li");
        errorItem.classList.add("chat__item", "chat__item--bot", "chat__item--visible", "chat__item--system");
        errorItem.innerHTML = `<span class="chat__item-text">Votre appareil ne prend pas en charge WebGPU. Le modèle ne peut pas être chargé sur ce navigateur.</span>`;
        chatList.appendChild(errorItem);
        return;
      } else {
        if (!isLLMReady) {
          const systemItem = document.createElement("li");
          systemItem.classList.add("chat__item", "chat__item--bot", "chat__item--visible", "chat__item--system", "chat__item--valid");
          systemItem.innerHTML = `
            <span class="chat__item-text">Ce chat fonctionne grâce à un modèle d’intelligence artificielle (<a href="https://mistral.ai/fr" target="_blank" rel="noopener noreferrer">Mistral 7B</a>) chargé dans votre navigateur. Ce chargement peut prendre du temps selon votre connexion et votre appareil. Ce même modèle va utiliser une place importante de votre stockage</span>
            <button class="chat__load-model"><span>Charger le modèle</span><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.0205 2V9L14.0205 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.0205 9L10.0205 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 13H6.41C6.79 13 7.13 13.21 7.3 13.55L8.47 15.89C8.81 16.57 9.5 17 10.26 17H13.79C14.55 17 15.24 16.57 15.58 15.89L16.75 13.55C16.92 13.21 17.27 13 17.64 13H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.02051 4.13C3.48051 4.65 2.02051 6.73 2.02051 11V15C2.02051 20 4.02051 22 9.02051 22H15.0205C20.0205 22 22.0205 20 22.0205 15V11C22.0205 6.73 20.5605 4.65 17.0205 4.13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          `;
          chatList.appendChild(systemItem);

          const loadButton = systemItem.querySelector(".chat__load-model");
          loadButton.addEventListener("click", async () => {
            loadButton.disabled = true;
            loadButton.textContent = "Chargement...";
            await initChatLLM(systemItem);
          });
        }
      }

      chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const question = chatFormInput.value.trim();
        if (!question) return;

        const userItem = document.createElement("li");
        userItem.classList.add("chat__item", "chat__item--user");
        userItem.textContent = question;
        chatList.appendChild(userItem);
        setTimeout(() => {
          userItem.classList.add("chat__item--visible");
          userItem.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 200);

        chatFormInput.value = "";

        const botItem = document.createElement("li");
        botItem.classList.add("chat__item", "chat__item--bot");
        setTimeout(() => {
          botItem.classList.add("chat__item--visible");
        }, 600);
        botItem.innerHTML = `Réflexion<span class="processing">...</span>`;
        chatList.appendChild(botItem);
        botItem.scrollIntoView({ behavior: "smooth", block: "end" });
        if (!isLLMReady) {
          botItem.textContent = `Le modèle se charge encore<span class="processing">...</span>`;
          return;
        }
        const reply = await sendToLLM(question);
        botItem.innerHTML = reply;
      });
    }

    windowEl.querySelector(".window__action--close").addEventListener("click", () => {
      windowEl.classList.remove("window--visible");

      setTimeout(() => {
        if (id === "window-dont-press-button") {
          const videoEl = windowEl.querySelector(".window__content-video");
          if (isMobile) {
            setTimeout(() => {
              videoEl.currentTime = 0;
              videoEl.pause();
            }, 200);
          } else {
            pauseWithFade(videoEl, 500);
            setTimeout(() => {
              videoEl.currentTime = 0;
              videoEl.pause();
            }, 500);
          }
        }

        if (id === "window-browser") {
          windowEl.querySelector(".window__content-iframe").setAttribute("src", "");
          document.querySelector(".taskbar__action--browser").classList.add("taskbar__action--hidden");
        }

        if (id === "window-chat") {
          windowEl.querySelector(".chat__list").innerHTML = "";
        }
        if (id === "window-game") {
          // windowEl.querySelector("#minecraft-game").remove();
        }
        if (id === "window-terminal") {
          terminalLoadingAbort = true;
          windowEl.querySelector(".terminal__list").innerHTML = "";
          setTimeout(() => {
            terminalLoadingAbort = false;
          }, 500);
        }

        windows[id].isOpen = false;
      }, 200);
    });

    if (id === "window-game" && !windows[id].isOpen) {
      // windowContent.innerHTML = `<iframe id="minecraft-game" style="width: 100%; height: 100%" src="src/games/js-minecraft/index.html" tabindex="0"></iframe>`;
    }

    if (id === "window-terminal" && !windows[id].isOpen) {
      const terminal = windowContent.querySelector(".terminal");

      let commandHistory = [];
      let historyIndex = -1;

      async function bootTerminal() {
        const terminalItem = document.createElement("li");
        terminalItem.classList.add("terminal__item");
        terminalItem.innerHTML = `Démarrage du terminal<span class="processing">...</span>`;
        terminal.appendChild(terminalItem);
        await delay(3000);
        if (terminalLoadingAbort) return;
        terminalItem.innerHTML = `Démarrage du terminal<svg class="terminal__check" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><use href="#check"></svg>`;
        await delay(500);
        if (terminalLoadingAbort) return;

        await delay(1000);
        if (terminalLoadingAbort) return;
        createTerminalInput();
      }

      function createTerminalInput() {
        const inputItem = document.createElement("li");
        inputItem.classList.add("terminal__item");
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.classList.add("terminal__input");
        inputItem.appendChild(inputField);
        terminal.appendChild(inputItem);
        inputField.focus();

        inputField.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const command = inputField.value.trim();
            if (!command) return;

            commandHistory.push(command);
            historyIndex = commandHistory.length;

            inputItem.remove();

            const commandItem = document.createElement("li");
            commandItem.classList.add("terminal__item");
            commandItem.textContent = command;
            terminal.appendChild(commandItem);

            const responseItem = document.createElement("li");
            responseItem.classList.add("terminal__item");
            responseItem.innerHTML = parseCommand(command);
            terminal.appendChild(responseItem);

            createTerminalInput();
            responseItem.scrollIntoView({ behavior: "smooth", block: "end" });
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (historyIndex > 0) {
              historyIndex--;
              inputField.value = commandHistory[historyIndex];
            }
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
              historyIndex++;
              inputField.value = commandHistory[historyIndex];
            } else {
              historyIndex = commandHistory.length;
              inputField.value = "";
            }
          }

          if (e.ctrlKey && e.key === "c") {
            e.preventDefault();
            inputField.value += "^C";
            inputField.disabled = true;
            inputField.classList.add("terminal__input--disabled");
            const interruptItem = document.createElement("li");
            interruptItem.classList.add("terminal__item");
            interruptItem.textContent = "Commande interrompue.";
            terminal.appendChild(interruptItem);
            createTerminalInput();
            interruptItem.scrollIntoView({ behavior: "smooth", block: "end" });
          }

          if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
            e.preventDefault();
            terminal.innerHTML = "";
            createTerminalInput();
          }
        });

        document.addEventListener("click", (e) => {
          if (e.target.closest("#window-terminal") && !e.target.closest(".terminal__input")) {
            inputField.focus();
          }
        });
      }

      let terminalLoadingAbort = false;

      bootTerminal();
    }

    windowEl.querySelector(".window__action--minimize").addEventListener("click", () => {
      minimizeWindow(windowEl);
    });

    windowEl.querySelector(".window__action--maximize").addEventListener("click", () => {
      maximizeWindow(windowEl);
    });

    function minimizeWindow(elem) {
      elem.classList.add("window--minimized");
      elem.classList.remove("window--visible");
    }

    function maximizeWindow(elem) {
      if (elem.dataset.maximized !== "true") {
        elem.dataset.maximized = "true";
        elem.dataset.originalWidth = elem.style.width;
        elem.dataset.originalHeight = elem.style.height;
        elem.dataset.originalLeft = elem.style.left;
        elem.dataset.originalTop = elem.style.top;
        elem.style.top = "0px";
        elem.style.left = "0px";
        elem.style.width = "100%";
        elem.style.height = "100%";
        elem.style.transform = "translate(0,0)";
      } else {
        elem.style.top = elem.dataset.originalTop;
        elem.style.left = elem.dataset.originalLeft;
        elem.style.width = elem.dataset.originalWidth;
        elem.style.height = elem.dataset.originalHeight;
        setTimeout(() => {
          delete elem.dataset.maximized;
        }, 200);
      }
    }

    setTimeout(() => {
      windowEl.classList.add("window--visible");
      windows[id].isOpen = true;
    }, 200);

    windowEl.addEventListener("mousedown", () => {
      focusWindow(windowEl);
    });

    interact(windowEl).draggable({
      inertia: true,
      allowFrom: ".window__header",
      modifiers: [interact.modifiers.restrictRect({ restriction: "parent" })],
      listeners: { move: dragMoveListener },
    });

    interact(windowEl).resizable({
      edges: { top: true, left: true, bottom: true, right: true },
      margin: 4,
      modifiers: [interact.modifiers.restrictEdges({ outer: "parent" }), interact.modifiers.restrictSize({ min: { width: 100, height: 100 } })],
      listeners: {
        move(event) {
          let { x, y } = event.target.dataset;
          x = (parseFloat(x) || 0) + event.deltaRect.left;
          y = (parseFloat(y) || 0) + event.deltaRect.top;
          event.target.style.width = `${event.rect.width}px`;
          event.target.style.height = `${event.rect.height}px`;
          event.target.style.transform = `translate(${x}px, ${y}px)`;
          event.target.dataset.x = x;
          event.target.dataset.y = y;
        },
      },
    });
  };

  const windowShortcuts = document.querySelectorAll(".window__shortcut");
  windowShortcuts.forEach((shortcut) => {
    interact(shortcut).draggable({
      inertia: true,
      modifiers: [interact.modifiers.restrictRect({ restriction: ".windows" })],
      listeners: {
        start(event) {
          shortcut.dataset.dragged = "false";
        },
        move(event) {
          shortcut.dataset.dragged = "true";
          dragMoveListener(event);
        },
        end(event) {
          setTimeout(() => delete shortcut.dataset.dragged, 100);
        },
      },
    });
    const btn = shortcut.querySelector(".window__shortcut-action");
    if (btn) {
      btn.addEventListener("click", (e) => {
        if (shortcut.dataset.dragged === "true") {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }
  });

  function dragMoveListener(event) {
    const target = event.target;
    let x = (parseFloat(target.dataset.x) || 0) + event.dx;
    let y = (parseFloat(target.dataset.y) || 0) + event.dy;
    target.style.transform = `translate(${x}px, ${y}px)`;
    target.dataset.x = x;
    target.dataset.y = y;
  }

  const actionButtons = document.querySelectorAll(".taskbar__action, .window__shortcut-action");
  if (actionButtons.length) {
    actionButtons.forEach((button) => {
      button.addEventListener(
        "click",
        (e) => {
          const action = e.currentTarget.dataset.action;
          switch (action) {
            case "settings":
              openWindow("window-settings", 280, 340);
              break;
            case "browser":
              openWindow("window-browser");
              break;
            case "user":
              openWindow("window-user", 1080, 720);
              break;
            case "finder":
              openWindow("window-portfolio", 532, 360);
              break;
            case "chat":
              openWindow("window-chat", 660, 320);
              break;
            case "music":
              openWindow("window-music", 980, 502);
              break;
            case "game":
              openWindow("window-game", 660, 320);
              break;
            case "terminal":
              openWindow("window-terminal");
              break;
            case "paint":
              openWindow("window-paint", isMobile ? "max" : 820, isMobile ? "max" : 610);
              break;
            case "github":
            case "codepen":
            case "linkedin":
              window.open(button.dataset.href, "");
              button.blur();
              break;
            default:
              break;
          }
          button.blur();
        },
        false
      );
    });
  }

  const dontPressButton = document.querySelector(".dont-press-the-button");
  dontPressButton.addEventListener("click", () => {
    openWindow("window-dont-press-button", 660, 418);
  });

  const contextualMenu = document.querySelector(".contextual-menu");
  if (contextualMenu) {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const x = e.clientX;
      const y = e.clientY;
      contextualMenu.style.left = `${x}px`;
      contextualMenu.style.top = `${y}px`;
      contextualMenu.classList.add("contextual-menu--visible");
    });

    document.addEventListener("click", (e) => {
      if (contextualMenu.classList.contains("contextual-menu--visible")) {
        const isClickInside = contextualMenu.contains(e.target);
        if (!isClickInside) {
          contextualMenu.classList.remove("contextual-menu--visible");
        }
      }
    });

    const contextualMenuItems = contextualMenu.querySelectorAll(".contextual-menu__item");
    contextualMenuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        contextualMenu.classList.remove("contextual-menu--visible");
      });
    });
  }
  // Screensaver module
  initScreensaver();
});

window.addEventListener("error", (e) => {
  if (e.message && /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i.test(e.message)) return;
  console.error("Erreur JS non capturée :", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Promesse rejetée sans catch :", e.reason);
});

// screensaver moved in module

function changePP() {
  const ppEl = document.querySelector(".window__content-header-pp");
  if (!ppEl) return;

  const now = new Date();
  const day = now.getDay(); // 0 = dimanche, 6 = samedi
  const hour = now.getHours();
  const minutes = now.getMinutes();

  let src = "profil_01.svg";

  const isWeekend = day === 0 || day === 6;
  const isWorkHour = day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  const isPause = isWorkHour && hour % 2 === 0 && minutes < 20;

  if (isWeekend) {
    src = "profil_03.svg" || "profil_02.svg";
  } else if (isPause) {
    src = "profil_01.svg";
  } else if (isWorkHour) {
    src = "profil_04.svg";
  }

  ppEl.setAttribute("src", `./images/${src}`);
}

changePP();
