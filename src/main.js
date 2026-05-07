import { createScene }    from './core/scene.js';
import { createRenderers } from './core/renderer.js';
import { createCamera }    from './core/camera.js';
import { createControls }  from './core/controls.js';
import { World }           from './core/world.js';
import { updatePanel }     from './ui/panel.js';
import { setupNavigation } from './ui/navigation.js';

// run(lesson) bootstraps the entire engine for a single lesson.
//
// Lesson shape:
// {
//   title, subject,
//   camera?:   { position, lookAt, fov },
//   controls?: { target },
//   initState?(): object,          // returns initial simulation state
//   init?(world, state, panelEl),  // one-time scene setup (fixed objects, custom UI)
//   steps: [{
//     title, description, equation, notes,
//     setup?(world, state),         // called on step enter
//     update?(world, state, dt)     // called every frame (live layer)
//   }]
// }
export function run(lesson) {
  const canvas    = document.getElementById('canvas');
  const container = document.getElementById('canvas-container');
  const panelEl   = document.getElementById('panel');

  const scene                    = createScene();
  const { glRenderer, labelRenderer } = createRenderers(canvas, container);
  const camera                   = createCamera(lesson.camera);
  const controls                 = createControls(camera, glRenderer.domElement, lesson.controls);
  const world                    = new World(scene);

  // Resize canvas + label overlay together
  function resize() {
    const w = container.clientWidth  || window.innerWidth  * 0.6;
    const h = container.clientHeight || window.innerHeight;
    glRenderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  // Delay one tick so CSS layout has resolved
  setTimeout(resize, 0);

  // Stamp the subject label
  document.getElementById('subject').textContent = lesson.subject ?? '';

  // Lesson-level state shared across all steps (simulation variables, cfg, etc.)
  const state = lesson.initState ? lesson.initState() : {};

  // One-time init: fixed scene objects, custom panel HTML, slider listeners, etc.
  if (lesson.init) lesson.init(world, state, panelEl);

  // Step navigation
  let currentStep = 0;

  function go(i) {
    currentStep = i;
    world.clearPersistent();
    world.clearLive();
    const step = lesson.steps[i];
    if (step.setup) step.setup(world, state);
    updatePanel(step, i, lesson.steps.length);
  }

  setupNavigation(go, () => currentStep, lesson.steps.length);

  // Central animation loop — lessons register nothing; main.js drives everything
  let lastTime = performance.now();

  function tick() {
    requestAnimationFrame(tick);

    const now = performance.now();
    const dt  = Math.min((now - lastTime) / 1000, 0.05);
    lastTime  = now;

    // Clear live layer, let the current step repopulate it
    world.clearLive();
    const step = lesson.steps[currentStep];
    if (step.update) step.update(world, state, dt);

    controls.update();
    glRenderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  go(0);
  requestAnimationFrame(tick);
}
