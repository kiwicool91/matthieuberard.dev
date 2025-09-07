import gsap from "gsap";

let screensaverActive = false;
let screensaverTimeout;

function moveHelloWorld() {
  const el = document.querySelector(".screensaver p");
  const parent = document.querySelector(".screensaver");
  if (!el || !parent) return;

  const maxX = parent.clientWidth - el.offsetWidth;
  const maxY = parent.clientHeight - el.offsetHeight;

  let x = Math.random() * maxX;
  let y = Math.random() * maxY;
  let vx = 0.75;
  let vy = 0.75;

  function animate() {
    x += vx; y += vy;
    if (x <= 0 || x >= maxX) vx *= -1;
    if (y <= 0 || y >= maxY) vy *= -1;
    gsap.set(el, { x, y });
    if (screensaverActive) requestAnimationFrame(animate);
  }
  animate();
}

export function activateScreensaver() {
  if (screensaverActive) return;
  screensaverActive = true;
  const el = document.querySelector(".screensaver");
  if (!el) return;
  el.style.display = "block";
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1 });
  moveHelloWorld();
}

export function deactivateScreensaver() {
  if (!screensaverActive) return;
  screensaverActive = false;
  const el = document.querySelector(".screensaver");
  if (!el) return;
  gsap.to(el, { opacity: 0, duration: 1, onComplete: () => { el.style.display = "none"; } });
}

export function resetScreensaverTimer(minutes = 5) {
  clearTimeout(screensaverTimeout);
  if (screensaverActive) deactivateScreensaver();
  screensaverTimeout = setTimeout(activateScreensaver, minutes * 60 * 1000);
}

export function initScreensaver() {
  ["mousemove", "keydown", "mousedown", "touchstart"].forEach((evt) => {
    document.addEventListener(evt, () => resetScreensaverTimer(5), { passive: true });
  });
  resetScreensaverTimer(5);
}

