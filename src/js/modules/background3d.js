import * as THREE from "three";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";

export function initBackground({ containerSelector = ".ddd-scene", isMobile = false, isLightMode = false }) {
  const container = document.querySelector(containerSelector);
  if (!container) return { setLightMode() {}, transition() {} };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 3;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  let lightMode = isLightMode;

  function moebius(u, v, target) {
    const twists = 1;
    const U = u * Math.PI * 2 * twists;
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

  function torus(u, v, target) {
    // R: grand rayon, r: petit rayon
    const R = 1.1, r = 0.35;
    const U = u * Math.PI * 2;
    const V = v * Math.PI * 2;
    const x = (R + r * Math.cos(V)) * Math.cos(U);
    const y = (R + r * Math.cos(V)) * Math.sin(U);
    const z = r * Math.sin(V);
    const scale = isMobile ? 0.7 : 1;
    target.set(x * scale, y * scale, z * scale);
  }

  function sphere(u, v, target) {
    const U = u * Math.PI * 2;
    const V = v * Math.PI;
    const r = 1.2;
    const x = r * Math.cos(U) * Math.sin(V);
    const y = r * Math.sin(U) * Math.sin(V);
    const z = r * Math.cos(V);
    const scale = isMobile ? 0.8 : 1;
    target.set(x * scale, y * scale, z * scale);
  }

  let backgroundMesh = null;
  let colorSwapTimeout = null;
  let colorFadeRAF = null;
  let overlayMesh = null;
  let autoFadeEnabled = true;

  function makeFinalMaterial(opacity = 1) {
    // Dark: colorful normals. Light: flat white. Both visible w/o lights.
    if (lightMode) {
      return new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, side: THREE.DoubleSide });
    }
    return new THREE.MeshNormalMaterial({ transparent: true, opacity, side: THREE.DoubleSide });
  }

  function makeGrayMaterial(opacity = 1) {
    return new THREE.MeshBasicMaterial({ color: 0x9e9e9e, transparent: true, opacity, side: THREE.DoubleSide });
  }

  function transitionBackgroundMesh(shapeFunction) {
    const segmentsU = 100, segmentsV = 50;
    // Cancel pending color swaps / fades and cleanup overlay if any
    if (colorSwapTimeout) { clearTimeout(colorSwapTimeout); colorSwapTimeout = null; }
    if (colorFadeRAF) { cancelAnimationFrame(colorFadeRAF); colorFadeRAF = null; }
    if (overlayMesh) {
      try { scene.remove(overlayMesh); overlayMesh.material?.dispose?.(); } catch {}
      overlayMesh = null;
    }
    // Disable auto fade-in only after the first mesh exists
    if (backgroundMesh) {
      autoFadeEnabled = false;
    } else {
      autoFadeEnabled = true; // allow initial fade-in
    }
    if (!backgroundMesh) {
      const geometry = new ParametricGeometry(shapeFunction, segmentsU, segmentsV);
      const material = makeFinalMaterial(0);
      backgroundMesh = new THREE.Mesh(geometry, material);
      scene.add(backgroundMesh);
      return;
    }
    const duration = 2000;
    const startTime = performance.now();
    const targetGeometry = new ParametricGeometry(shapeFunction, segmentsU, segmentsV);
    const targetPositions = targetGeometry.attributes.position.array;
    const currentGeometry = backgroundMesh.geometry;
    const currentPositions = currentGeometry.attributes.position.array;
    if (currentPositions.length !== targetPositions.length) {
      // Replace geometry, but handle color ramp: gray -> crossfade to final after delay
      const prevOpacity = backgroundMesh.material.opacity ?? 1;
      const oldMat = backgroundMesh.material; backgroundMesh.material = makeGrayMaterial(prevOpacity); oldMat?.dispose?.();
      backgroundMesh.geometry.dispose();
      backgroundMesh.geometry = targetGeometry;
      // schedule crossfade
      colorSwapTimeout = setTimeout(() => {
        startColorCrossfade(prevOpacity);
      }, 2000);
      return;
    }

    const prevOpacity = backgroundMesh.material.opacity ?? 1;
    if (colorSwapTimeout) { clearTimeout(colorSwapTimeout); colorSwapTimeout = null; }
    const prevMat = backgroundMesh.material; backgroundMesh.material = makeGrayMaterial(prevOpacity); prevMat?.dispose?.();
    function animateMorph() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      for (let i = 0; i < currentPositions.length; i++) {
        currentPositions[i] = currentPositions[i] * (1 - t) + targetPositions[i] * t;
      }
      currentGeometry.attributes.position.needsUpdate = true;
      if (t < 1) {
        requestAnimationFrame(animateMorph);
      } else {
        backgroundMesh.geometry.dispose();
        backgroundMesh.geometry = targetGeometry;
      }
    }
    animateMorph();

    // After morph completes (~duration), crossfade to final material
    colorSwapTimeout = setTimeout(() => {
      startColorCrossfade(prevOpacity);
    }, 2000);
  }

  function startColorCrossfade(targetOpacity) {
    // Clean any previous overlay
    if (overlayMesh) {
      try { scene.remove(overlayMesh); overlayMesh.material?.dispose?.(); } catch {}
      overlayMesh = null;
    }
    // Prepare overlay with final material
    const finalMat = makeFinalMaterial(0);
    overlayMesh = new THREE.Mesh(backgroundMesh.geometry, finalMat);
    scene.add(overlayMesh);

    const baseMat = backgroundMesh.material; // gray material currently on base mesh
    const fadeDuration = 800; // ms
    const start = performance.now();

    function step() {
      const t = Math.min((performance.now() - start) / fadeDuration, 1);
      const a = t; // ease linear; can tweak
      finalMat.opacity = targetOpacity * a;
      baseMat.opacity = targetOpacity * (1 - a);
      if (t < 1) {
        colorFadeRAF = requestAnimationFrame(step);
      } else {
        // swap to final on base, remove overlay
        try {
          const newMat = makeFinalMaterial(targetOpacity);
          backgroundMesh.material = newMat;
          scene.remove(overlayMesh);
          overlayMesh.material.dispose();
        } catch {}
        overlayMesh = null;
        colorFadeRAF = null;
      }
    }
    colorFadeRAF = requestAnimationFrame(step);
  }

  const backgroundShapes = { moebius, klein, enneper, torus, sphere };
  let initialShape = "moebius";
  const bgSelect = document.querySelector("#background-shape");
  if (bgSelect) initialShape = bgSelect.value;
  transitionBackgroundMesh(backgroundShapes[initialShape]);

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  let mouseX = 0, mouseY = 0;
  if (!isMobile) {
    window.addEventListener("mousemove", (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    if (backgroundMesh) {
      if (autoFadeEnabled && backgroundMesh.material.opacity < 1) {
        backgroundMesh.material.opacity = Math.min(backgroundMesh.material.opacity + 0.01, 1);
      }
      backgroundMesh.rotation.x += 0.001 + mouseY * 0.003;
      backgroundMesh.rotation.y += 0.001 + mouseX * 0.003;
    }
    renderer.render(scene, camera);
  }
  animate();

  if (bgSelect) {
    bgSelect.addEventListener('change', () => {
      const shape = backgroundShapes[bgSelect.value] || backgroundShapes.moebius;
      transitionBackgroundMesh(shape);
    });
  }

  return {
    setLightMode(v) { lightMode = !!v; },
    transition(name) {
      const shape = backgroundShapes[name] || backgroundShapes.moebius;
      transitionBackgroundMesh(shape);
    }
  };
}
