export function initPaint() {
  const paintEl = document.querySelector(".paint");
  if (!paintEl) return;

  const canvas = paintEl.querySelector(".paint__canvas");
  const ctx = canvas.getContext("2d");
  const colorPickerLabel = paintEl.querySelector(".paint__tool--color");
  const colorPicker = paintEl.querySelector(".paint__color");
  const sizePicker = paintEl.querySelector(".paint__size");
  const clearBtn = paintEl.querySelector(".paint__clear");
  const toolBtns = paintEl.querySelectorAll(".paint__tool");

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  let isDrawing = false;
  let tool = "pencil";
  paintEl.dataset.activeTool = tool;

  function resizeCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const parent = canvas.parentElement || paintEl;
    const rect = parent.getBoundingClientRect();
    const parentRect = parent ? parent.getBoundingClientRect() : { width: 0, height: 0 };

    let cssWidth;
    let cssHeight;

    if (!isMobile) {
      cssWidth = 800;
      cssHeight = 500;
    } else {
      cssWidth = rect.width || parentRect.width || canvas.clientWidth || 0;
      cssHeight = rect.height || parentRect.height || canvas.clientHeight || 0;
    }

    if (!cssWidth || !cssHeight) return;

    const targetW = Math.floor(cssWidth * dpr);
    const targetH = Math.floor(cssHeight * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let roPending = false;
  const ro = new ResizeObserver(() => {
    if (roPending) return;
    roPending = true;
    requestAnimationFrame(() => {
      roPending = false;
      resizeCanvas();
    });
  });
  if (isMobile) {
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    } else {
      ro.observe(canvas);
    }
  }

  canvas.style.touchAction = "none";
  paintEl.style.overflow = "hidden";
  canvas.style.display = "block";
  canvas.style.boxSizing = "border-box";

  if (!isMobile) {
    canvas.style.width = "800px";
    canvas.style.height = "500px";
    if (paintEl) {
      paintEl.style.width = "800px";
      // paintEl.style.height = "500px";
    }
    resizeCanvas();
  } else {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
  }

  colorPicker.addEventListener("change", () => {
    colorPickerLabel.style.setProperty("--picker_color", colorPicker.value);
  });

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches?.[0] || e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      isDrawing = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    { passive: false }
  );

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = tool === "eraser" ? "#fff" : colorPicker.value;
      ctx.lineWidth = Number(sizePicker.value);
      ctx.stroke();
    },
    { passive: false }
  );

  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => {
    canvas.addEventListener(t, () => {
      isDrawing = false;
    });
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
