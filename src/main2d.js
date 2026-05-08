import { Canvas2D }        from './core/canvas2d.js';
import { updatePanel }     from './ui/panel.js';
import { setupNavigation } from './ui/navigation.js';

// run2d(lesson) bootstraps the 2D canvas engine for a single lesson.
//
// Lesson shape is identical to run() except setup/update receive a Canvas2D
// instead of a World:
// {
//   title, subject,
//   initState?(): object,
//   init?(c2d, state, panelEl),
//   steps: [{
//     title, description, equation, notes,
//     setup?(c2d, state),
//     update?(c2d, state, dt)
//   }]
// }
export function run2d(lesson) {
  const canvas    = document.getElementById('canvas');
  const container = document.getElementById('canvas-container');
  const panelEl   = document.getElementById('panel');
  const c2d       = new Canvas2D(canvas);

  function resize() {
    canvas.width  = container.clientWidth  || window.innerWidth * 0.6;
    canvas.height = container.clientHeight || window.innerHeight;
  }
  window.addEventListener('resize', () => { resize(); });
  setTimeout(resize, 0);

  document.getElementById('subject').textContent = lesson.subject ?? '';

  const state = lesson.initState ? lesson.initState() : {};
  if (lesson.init) lesson.init(c2d, state, panelEl);

  let currentStep = 0;

  function go(i) {
    currentStep = i;
    c2d.clearPersistent();
    c2d.clearLive();
    const step = lesson.steps[i];
    if (step.setup) step.setup(c2d, state);
    updatePanel(step, i, lesson.steps.length);
  }

  setupNavigation(go, () => currentStep, lesson.steps.length);

  let lastTime = performance.now();

  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt  = Math.min((now - lastTime) / 1000, 0.05);
    lastTime  = now;

    c2d.clearLive();
    const step = lesson.steps[currentStep];
    if (step.update) step.update(c2d, state, dt);

    c2d.flush();
  }

  go(0);
  requestAnimationFrame(tick);
}
