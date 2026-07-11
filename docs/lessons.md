# The lesson engine

Every interactive lesson is a **thin HTML shell** that loads one **lesson module** from
`src/lessons/`. The shell is ~33 lines and nearly identical across lessons; all the content and
logic live in the module.

## Anatomy of a lesson page

`<subject>/<name>.html` (the shell):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Backpropagation – Machine Learning</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="stylesheet" href="../src/styles/layout.css">
</head>
<body>
  <div id="app">
    <div id="canvas-container"><canvas id="canvas"></canvas></div>
    <div id="panel">
      <a href="../visualizations.html" id="back">← All visualizations</a>
      <div id="subject"></div>
      <h1 id="step-title"></h1>
      <p id="step-description"></p>
      <div id="equation"></div>
      <p id="step-notes"></p>
      <div id="nav">
        <button id="prev">← Prev</button><span id="counter"></span><button id="next">Next →</button>
      </div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script type="module">
    import { run2d } from '../src/main2d.js';
    import lesson    from '../src/lessons/machine-learning/backpropagation.js';
    run2d(lesson);
  </script>
</body>
</html>
```

Use `run2d` for a **2D canvas** lesson (most of them) and `run` (from `../src/main.js`) for a
**3D** lesson. Everything else in the shell stays the same. Note the `../` depth — a lesson two
levels deep (`particle-dynamics/scenarios/`) needs `../../`.

## The lesson module contract

Default-export an object:

```js
export default {
  title:   'Backpropagation',      // page/lesson title
  subject: 'Machine Learning',     // shown in the panel header

  initState() { return { /* mutable state shared across steps */ }; },

  // Called once. c2d is a Canvas2D (2D) or World (3D). panelEl is #panel —
  // use it to inject controls (sliders/buttons) before the #nav element.
  init(c2d, state, panelEl) { /* set c2d.scale, add a controls container, … */ },

  steps: [
    {
      title:       'Forward ① — the products',
      description: 'Prose. Only $…$ segments render as inline KaTeX. No HTML tags.',
      equation:    'm_1 = w_1 x_1',   // full LaTeX, rendered display-mode
      notes:       'Extra prose below the equation; $…$ inline math allowed.',
      setup(c2d, state) { /* runs on entering the step: reset state, (re)build controls */ },
      update(c2d, state, dt) { /* runs every frame: draw. dt = seconds since last frame */ },
    },
    // …
  ],
};
```

- `setup` runs once when the step becomes active; `update` runs every animation frame.
- The panel (`src/ui/panel.js`) renders `description`/`notes` splitting on `$…$` — **plain text
  otherwise**, so HTML tags appear literally. `equation` is display-mode LaTeX.
- Persist mutable values on `state`; steps share it.

## Drawing with Canvas2D

`src/core/canvas2d.js` gives **world space**: origin at centre, y-axis up, `c2d.scale` px per unit
(default 80). Convert with `c.wx(x)`, `c.wy(y)`, `c.ws(size)`.

Two layers:
- **Persistent** (`addGrid`, `addAxes`, `addPoint`, `addLine`, `addArrow`, `addText`, `raw(fn)`)
  survives across frames — but most lessons call `c2d.clearPersistent()` at the top of `update`
  and redraw, so slider changes take effect live.
- **Live** (`showPoint`, `showLine`, `showArrow`, `showText`, `showRaw(fn)`) is cleared each frame.

For custom geometry (network diagrams, heatmaps) use `c2d.raw((ctx, c) => { … })` and draw with the
raw canvas 2D context, using `c.wx/wy/ws` for coordinates. See `machine-learning/perceptron.js` and
`machine-learning/backpropagation.js` for worked examples.

## Interactive controls

Inject DOM controls into the panel in `init`, then (re)populate them per step in `setup`:

```js
init(c2d, state, panelEl) {
  const nav = panelEl.querySelector('#nav');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
  panelEl.insertBefore(div, nav);   // controls sit above the prev/next nav
  state._controls = div;
}
```

Copy the `addSlider(container, label, min, max, step, value, onChange)` helper from
`perceptron.js` / `backpropagation.js` (accent colour `#1565c0`). `onChange` writes to `state`;
the next `update` frame redraws with the new value.

## Adding a new lesson — checklist

1. Create `src/lessons/<subject>/<name>.js` exporting the module (copy an existing one as a template).
2. Create `<subject>/<name>.html` (copy a sibling shell; fix `<title>` and the two import paths).
3. `node --check src/lessons/<subject>/<name>.js`.
4. Wire it into the syllabus: add a nested `topic-viz` link under the relevant topic in `index.html`
   (see `docs/syllabus.md`), and add a gallery card in `visualizations.html`.
5. Run the link + serve checks in `docs/verification.md`.
6. Let the user visually confirm it in the browser.
