// Simple Snake game module
// Exports: initSnake(windowEl)

export function initSnake(windowEl) {
  const content = windowEl.querySelector('.window__content--snake');
  if (!content || content.dataset.snakeInit === 'true') return;
  content.dataset.snakeInit = 'true';

  const canvas = content.querySelector('.snake__canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = content.querySelector('.snake__score');

  const cell = 16;
  const cols = Math.floor(canvas.width / cell);
  const rows = Math.floor(canvas.height / cell);

  let snake = [{ x: 8, y: 8 }];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let apple = spawnApple();
  let score = 0;
  let speed = 120; // ms per step
  let last = 0;
  let running = false; // start paused
  let started = false;

  function spawnApple() {
    while (true) {
      const a = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      if (!snake.some(s => s.x === a.x && s.y === a.y)) return a;
    }
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
  }

  function step(timestamp) {
    if (!running) return;
    if (timestamp - last < speed) {
      anim = requestAnimationFrame(step);
      return;
    }
    last = timestamp;
    // apply nextDir but prevent reverse
    if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) dir = nextDir;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // collisions with walls
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
      return gameOver();
    }
    // collisions with self
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }

    snake.unshift(head);
    if (head.x === apple.x && head.y === apple.y) {
      score += 1;
      scoreEl.textContent = String(score);
      apple = spawnApple();
      // speed up a bit
      if (speed > 60) speed -= 2;
    } else {
      snake.pop();
    }

    // render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // apple
    drawCell(apple.x, apple.y, '#ff6a00');
    // snake
    snake.forEach((s, i) => drawCell(s.x, s.y, i === 0 ? '#ffffff' : '#cfd8dc'));

    anim = requestAnimationFrame(step);
  }

  function onKey(e) {
    switch (e.key) {
      case ' ':
      case 'Enter':
        // start or toggle pause
        e.preventDefault();
        if (!started) {
          started = true;
          running = true;
          last = 0;
          anim = requestAnimationFrame(step);
        } else {
          running = !running;
          if (running) { last = 0; anim = requestAnimationFrame(step); }
        }
        break;
      case 'ArrowUp': case 'z': case 'Z': nextDir = { x: 0, y: -1 }; e.preventDefault(); if (!started) { started = true; running = true; last = 0; anim = requestAnimationFrame(step); } break;
      case 'ArrowDown': case 's': case 'S': nextDir = { x: 0, y: 1 }; e.preventDefault(); if (!started) { started = true; running = true; last = 0; anim = requestAnimationFrame(step); } break;
      case 'ArrowLeft': case 'q': case 'Q': nextDir = { x: -1, y: 0 }; e.preventDefault(); if (!started) { started = true; running = true; last = 0; anim = requestAnimationFrame(step); } break;
      case 'ArrowRight': case 'd': case 'D': nextDir = { x: 1, y: 0 }; e.preventDefault(); if (!started) { started = true; running = true; last = 0; anim = requestAnimationFrame(step); } break;
      case 'r': case 'R':
        restart();
        break;
    }
  }

  function gameOver() {
    running = false;
    // overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over - R to restart', canvas.width / 2, canvas.height / 2);
  }

  function restart() {
    snake = [{ x: 8, y: 8 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    apple = spawnApple();
    score = 0;
    scoreEl.textContent = '0';
    speed = 120;
    running = true;
    last = 0;
    anim = requestAnimationFrame(step);
  }

  // draw initial state and wait for user action to start
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCell(apple.x, apple.y, '#ff6a00');
  snake.forEach((s, i) => drawCell(s.x, s.y, i === 0 ? '#ffffff' : '#cfd8dc'));
  let anim = null;
  window.addEventListener('keydown', onKey, { passive: false });

  // cleanup when window closes
  windowEl.__snakeCleanup = () => {
    cancelAnimationFrame(anim);
    window.removeEventListener('keydown', onKey);
  };
}
