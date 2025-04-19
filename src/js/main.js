import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";
import interact from "interactjs";
import * as webllm from "@mlc-ai/web-llm";

const isDebug = import.meta.env.DEV;

const progressSentences = ["Remplissage du mug de café ☕️", "Ajout des lunettes sur le nez 👓", "Ouverture de l'éditeur de texte 📝", "Branchement du cerveau en cours 🧠", "Chargement de la créativité 🎨", "Alignement des pixels parfaits 📐", "Connexion au mode développeur 💻", "Synchronisation avec le café du jour ☕️", "Compilation de la motivation 🔧", "Ouverture de la console 🎛️", "Recherche de la page 404 🔍", "Recherche des paquets perdus 🔍"];
let availableProgressSentences = [...progressSentences];

document.addEventListener("DOMContentLoaded", async () => {
  let moebiusTwists = 1;
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
      console.log("initializing", report.text);
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
      console.log(ms);
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

  // 3D Scene
  const container = document.querySelector(".ddd-scene");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  function moebius(u, v, target) {
    const U = u * Math.PI * 2 * moebiusTwists;
    const V = (v - 0.5) * 2;
    const x = (1 + (V / 2) * Math.cos(U / 2)) * Math.cos(U);
    const y = (1 + (V / 2) * Math.cos(U / 2)) * Math.sin(U);
    const z = (V / 2) * Math.sin(U / 2);
    const scale = isMobile ? 0.5 : 1;
    target.set(x * scale, y * scale, z * scale);
  }

  function klein(u, v, target) {
    u *= Math.PI * 2;
    v *= 2 * Math.PI;
    let x = (2 + Math.cos(u) * Math.sin(v) - (Math.sin(u) * Math.sin(2 * v)) / 2) * Math.cos(u);
    let y = (2 + Math.cos(u) * Math.sin(v) - (Math.sin(u) * Math.sin(2 * v)) / 2) * Math.sin(u);
    let z = Math.sin(u) * Math.sin(v) + (Math.cos(u) * Math.sin(2 * v)) / 2;
    const scale = isMobile ? 0.3 : 0.5;
    target.set(x * scale, y * scale, z * scale);
  }

  function enneper(u, v, target) {
    u = u * 4 - 2;
    v = v * 4 - 2;
    let x = u - (u * u * u) / 3 + u * v * v;
    let y = v - (v * v * v) / 3 + v * u * u;
    let z = u * u - v * v;
    const scale = isMobile ? 0.1 : 0.2;
    target.set(x * scale, y * scale, z * scale);
  }

  // Nouveau code pour la génération dynamique de l'arrière plan avec transformation
  let backgroundMesh = null;

  function transitionBackgroundMesh(shapeFunction) {
    const segmentsU = 100,
      segmentsV = 50;
    // Si aucun mesh n'est présent, créer directement le mesh
    if (!backgroundMesh) {
      const geometry = new ParametricGeometry(shapeFunction, segmentsU, segmentsV);
      const material = isLightMode ? new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0, color: 0xffffff }) : new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0 });
      backgroundMesh = new THREE.Mesh(geometry, material);
      scene.add(backgroundMesh);
      return;
    }
    const duration = 2000; // Durée de la transformation en ms
    const startTime = performance.now();
    // Génère la géométrie cible avec la même résolution
    const targetGeometry = new ParametricGeometry(shapeFunction, segmentsU, segmentsV);
    const targetMaterial = isLightMode ? new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true, opacity: backgroundMesh.material.opacity, color: 0xffffff }) : new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, transparent: true, opacity: backgroundMesh.material.opacity });

    // En cas de mode light, sauvegarde la couleur initiale
    const initialColor = isLightMode && backgroundMesh.material.color ? backgroundMesh.material.color.clone() : null;

    const targetPositions = targetGeometry.attributes.position.array;
    const currentGeometry = backgroundMesh.geometry;
    const currentPositions = currentGeometry.attributes.position.array;
    // Si le nombre de points ne correspond pas, on recrée le mesh directement
    if (currentPositions.length !== targetPositions.length) {
      scene.remove(backgroundMesh);
      backgroundMesh = new THREE.Mesh(targetGeometry, targetMaterial);
      scene.add(backgroundMesh);
      return;
    }

    function animateMorph() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      for (let i = 0; i < currentPositions.length; i++) {
        currentPositions[i] = currentPositions[i] * (1 - t) + targetPositions[i] * t;
      }
      currentGeometry.attributes.position.needsUpdate = true;
      // Interpolation de la couleur en mode light
      if (isLightMode && initialColor) {
        backgroundMesh.material.color.copy(initialColor).lerp(targetMaterial.color, t);
      }
      if (t < 1) {
        requestAnimationFrame(animateMorph);
      } else {
        // Transformation terminée : on remplace la géométrie et le matériau par les nouveaux
        backgroundMesh.geometry.dispose();
        backgroundMesh.geometry = targetGeometry;
        backgroundMesh.material.dispose();
        backgroundMesh.material = targetMaterial;
      }
    }
    animateMorph();
  }

  const backgroundShapes = {
    moebius: moebius,
    klein: klein,
    enneper: enneper,
  };

  let initialShape = "moebius";
  const bgSelect = document.querySelector("#background-shape");
  if (bgSelect) {
    initialShape = bgSelect.value;
  }
  transitionBackgroundMesh(backgroundShapes[initialShape]);

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    if (backgroundMesh && backgroundMesh.material.opacity < 1) {
      backgroundMesh.material.opacity = Math.min(backgroundMesh.material.opacity + 0.01, 1);
    }
    backgroundMesh.rotation.x += 0.001;
    backgroundMesh.rotation.y += 0.001;
    renderer.render(scene, camera);
  }
  animate();

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
      console.log("isLightMode", isLightMode);
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
      console.log("isAmbiantSoundPlaying", isAmbiantSoundPlaying);
    },
    false
  );

  const bgSelectElem = document.querySelector("#background-shape");
  if (bgSelectElem) {
    bgSelectElem.addEventListener("change", () => {
      const selectedValue = bgSelectElem.value;
      transitionBackgroundMesh(backgroundShapes[selectedValue]);
    });
  }
  if (bgSelectElem) {
    bgSelectElem.addEventListener("change", () => {
      const selectedValue = bgSelectElem.value;
      transitionBackgroundMesh(backgroundShapes[selectedValue]);
    });
  }

  const refLinks = document.querySelectorAll(".ref__link");
  refLinks.forEach((refLink) => {
    refLink.addEventListener("click", () => {
      if (refLink.dataset.target === "blank") {
        window.open(refLink.dataset.href);
      } else {
        openWindow("window-browser", "max", "max", refLink.dataset.href, true);
      }
    });
  });

  const paintEl = document.querySelector(".paint");
  if (paintEl) {
    const canvas = paintEl.querySelector(".paint__canvas");
    const ctx = canvas.getContext("2d");
    const colorPickerLabel = paintEl.querySelector(".paint__tool--color");
    const colorPicker = paintEl.querySelector(".paint__color");
    const sizePicker = paintEl.querySelector(".paint__size");
    const clearBtn = paintEl.querySelector(".paint__clear");
    const toolBtns = paintEl.querySelectorAll(".paint__tool");

    let isDrawing = false;
    let tool = "pencil";

    paintEl.dataset.activeTool = tool;

    colorPicker.addEventListener("change", () => {
      colorPickerLabel.style.setProperty("--picker_color", colorPicker.value);
    });

    canvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.strokeStyle = tool === "eraser" ? "#fff" : colorPicker.value;
      ctx.lineWidth = sizePicker.value;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    canvas.addEventListener("mouseup", () => {
      isDrawing = false;
    });

    canvas.addEventListener("mouseleave", () => {
      isDrawing = false;
    });

    canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
      },
      { passive: false }
    );

    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
        ctx.strokeStyle = tool === "eraser" ? "#fff" : colorPicker.value;
        ctx.lineWidth = sizePicker.value;
        ctx.lineCap = "round";
        ctx.stroke();
      },
      { passive: false }
    );

    canvas.addEventListener("touchend", () => {
      isDrawing = false;
    });

    clearBtn.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    toolBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tool = btn.dataset.tool === "eraser" ? "eraser" : "pencil";
        paintEl.dataset.activeTool = tool;
      });
    });
  }

  const openWindow = async (id = null, width = 480, height = 320, url = "", reload = false) => {
    const windowEl = windows[id].el;
    if (windows[id].isOpen) {
      focusWindow(windowEl);
      windowEl.classList.remove("window--minimized");
      windowEl.classList.add("window--visible");
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
      // windowContent.querySelector(".window__content-video").play();
    }

    if ((id === "window-browser" && reload) || (id === "window-browser" && !windows[id].isOpen)) {
      console.log(!windows[id].isOpen);
      if (!windows[id].isOpen) {
        setTimeout(() => {
          windowContent.querySelector(".window__content-iframe").setAttribute("src", url);
        }, 500);
        document.querySelector(".taskbar__action--browser").classList.remove("taskbar__action--hidden");
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

        windows[id].isOpen = false;
      }, 200);
    });

    if (id === "window-game" && !windows[id].isOpen) {
      // windowContent.innerHTML = `<iframe id="minecraft-game" style="width: 100%; height: 100%" src="src/games/js-minecraft/index.html" tabindex="0"></iframe>`;
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
              openWindow("window-music", 660, 418);
              break;
            case "game":
              openWindow("window-game", "max", "max");
              break;
            case "terminal":
              openWindow("window-terminal");
              break;
            case "paint":
              openWindow("window-paint", 820, 610);
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
});

window.addEventListener("error", (e) => {
  console.error("Erreur JS non capturée :", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Promesse rejetée sans catch :", e.reason);
});
