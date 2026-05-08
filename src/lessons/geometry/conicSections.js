// Conic Sections — 5 steps from the sliced cone to the unified focus-directrix definition.
//
// All conics are drawn parametrically in world space.
// Eccentricity slider is shared across steps 2-5.

import { renderEquation } from '../../ui/equation.js';

// ── Conic geometry helpers ────────────────────────────────────────────────────

// Polar form of a conic with focus at origin, semi-latus rectum p, eccentricity e.
// r(θ) = p / (1 + e·cos θ)
function conicR(p, e, theta) {
  const denom = 1 + e * Math.cos(theta);
  return Math.abs(denom) < 1e-9 ? Infinity : p / denom;
}

// Sample conic in Cartesian coords centred so focus is at origin.
// Returns array of [x, y] pairs (segments broken at infinity for hyperbola/parabola).
function sampleConic(p, e, nPts = 400) {
  const segments = [[]];
  const twoPI = Math.PI * 2;
  for (let i = 0; i <= nPts; i++) {
    const theta = (i / nPts) * twoPI;
    const r = conicR(p, e, theta);
    if (!isFinite(r) || r > 30) {
      if (segments[segments.length - 1].length > 0) segments.push([]);
      continue;
    }
    segments[segments.length - 1].push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return segments.filter(s => s.length > 1);
}

// Centre of ellipse (focus at origin → centre at (−a·e, 0), a = p/(1−e²))
function ellipseCentre(p, e) {
  if (e >= 1) return [0, 0];
  const a = p / (1 - e * e);
  return [-a * e, 0];
}

// Semi-axes
function semiAxes(p, e) {
  const a = p / (1 - e * e);
  const b = p / Math.sqrt(1 - e * e);
  return { a, b };
}

// ── Form-aware conic helpers ──────────────────────────────────────────────────
// The four standard polar forms differ only in cos/sin and ±.

const FORM_EQUATIONS = {
  a: 'r = \\dfrac{p}{1 + e\\cos\\theta}',
  b: 'r = \\dfrac{p}{1 - e\\cos\\theta}',
  c: 'r = \\dfrac{p}{1 + e\\sin\\theta}',
  d: 'r = \\dfrac{p}{1 - e\\sin\\theta}',
};

const FORM_LABELS = {
  a: '1 + e cos θ',
  b: '1 − e cos θ',
  c: '1 + e sin θ',
  d: '1 − e sin θ',
};

function conicRForm(p, e, theta, form) {
  let denom;
  if      (form === 'a') denom = 1 + e * Math.cos(theta);
  else if (form === 'b') denom = 1 - e * Math.cos(theta);
  else if (form === 'c') denom = 1 + e * Math.sin(theta);
  else                   denom = 1 - e * Math.sin(theta);
  return Math.abs(denom) < 1e-9 ? Infinity : p / denom;
}

function sampleConicForm(p, e, form, nPts = 400) {
  const segments = [[]];
  for (let i = 0; i <= nPts; i++) {
    const theta = (i / nPts) * Math.PI * 2;
    const r = conicRForm(p, e, theta, form);
    if (!isFinite(r) || r > 30) {
      if (segments[segments.length - 1].length > 0) segments.push([]);
      continue;
    }
    segments[segments.length - 1].push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return segments.filter(s => s.length > 1);
}

// Periapsis world position for each form (closest point to focus)
function periapsisPos(p, e, form) {
  const r = p / (1 + e);
  if (form === 'a') return [ r,  0];
  if (form === 'b') return [-r,  0];
  if (form === 'c') return [ 0,  r];
  return                   [ 0, -r];
}

// Apoapsis world position (ellipse only)
function apoapsisPos(p, e, form) {
  const r = p / (1 - e);
  if (form === 'a') return [-r,  0];
  if (form === 'b') return [ r,  0];
  if (form === 'c') return [ 0, -r];
  return                   [ 0,  r];
}

// Directrix line endpoints and label position for each form
function directrixGeom(p, e, form) {
  const d = p / e;
  if (form === 'a') return { pts: [[ d,-5],[ d, 5]], lx:  d+0.1, ly: 2.6, horiz: false };
  if (form === 'b') return { pts: [[-d,-5],[-d, 5]], lx: -d-1.5, ly: 2.6, horiz: false };
  if (form === 'c') return { pts: [[-5, d],[ 5, d]], lx:  2.6,   ly: d+0.2, horiz: true };
  return                   { pts: [[-5,-d],[ 5,-d]], lx:  2.6,   ly:-d-0.3, horiz: true };
}

function drawDirectrixForm(c2d, p, e, form, live) {
  if (e < 1e-6) return;
  const { pts, lx, ly } = directrixGeom(p, e, form);
  if (live) {
    c2d.showLine(pts, { color: COLORS.directrix, width: 1, dash: [5, 4] });
    c2d.showText('directrix', lx, ly, { color: COLORS.directrix, size: 11 });
  } else {
    c2d.addLine(pts, { color: COLORS.directrix, width: 1, dash: [5, 4] });
    c2d.addText('directrix', lx, ly, { color: COLORS.directrix, size: 11 });
  }
}

// ── Shared slider helper ───────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id = `sl-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(2)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(2);
    onChange(v);
  });
  return input;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

const COLORS = {
  ellipse:  '#1565c0',
  circle:   '#2e7d32',
  parabola: '#e65100',
  hyperbola:'#7b1fa2',
  focus:    '#c62828',
  directrix:'#888888',
  axis:     '#cccccc',
};

function conicColor(e) {
  if (e < 0.01)  return COLORS.circle;
  if (e < 1)     return COLORS.ellipse;
  if (e < 1.01)  return COLORS.parabola;
  return COLORS.hyperbola;
}

function conicName(e) {
  if (e < 0.01)  return 'Circle';
  if (e < 1)     return 'Ellipse';
  if (e < 1.01)  return 'Parabola';
  return 'Hyperbola';
}

function drawConicCurve(c2d, p, e, color, live) {
  const segs = sampleConic(p, e);
  for (const seg of segs) {
    if (live) c2d.showLine(seg, { color, width: 2.5 });
    else      c2d.addLine(seg,  { color, width: 2.5 });
  }
}

function drawFocus(c2d, live) {
  if (live) {
    c2d.showPoint(0, 0, { radius: 5, color: COLORS.focus, label: 'F' });
  } else {
    c2d.addPoint(0, 0, { radius: 5, color: COLORS.focus, label: 'F' });
  }
}

function drawDirectrix(c2d, p, e, live) {
  if (e < 1e-6) return;
  // For r = p/(1 + e·cosθ) with focus at origin, the corresponding directrix is at x = +p/e.
  const x = p / e;
  const pts = [[x, -5], [x, 5]];
  if (live) {
    c2d.showLine(pts, { color: COLORS.directrix, width: 1, dash: [5, 4] });
    c2d.showText('directrix', x + 0.1, 2.6, { color: COLORS.directrix, size: 11 });
  } else {
    c2d.addLine(pts, { color: COLORS.directrix, width: 1, dash: [5, 4] });
    c2d.addText('directrix', x + 0.1, 2.6, { color: COLORS.directrix, size: 11 });
  }
}

function drawAxes(c2d) {
  c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
  c2d.addAxes({ color: '#e0e0e0' });
}

// Draw a point on the conic + lines to focus and directrix (focus-directrix property)
function drawFocusDirectrixPoint(c2d, p, e, theta) {
  const r   = conicR(p, e, theta);
  if (!isFinite(r) || r > 20) return;
  const px  = r * Math.cos(theta);
  const py  = r * Math.sin(theta);
  const dx  = p / e; // directrix at x = +p/e (same side as periapsis, outside the conic)

  // Line to focus
  c2d.showLine([[0, 0], [px, py]], { color: COLORS.focus, width: 1.5, dash: [4, 3] });
  // Line to directrix (horizontal)
  c2d.showLine([[px, py], [dx, py]], { color: COLORS.directrix, width: 1.5, dash: [4, 3] });
  // Point on conic
  c2d.showPoint(px, py, { radius: 6, color: '#333' });

  // Labels
  c2d.showText(`r = ${r.toFixed(2)}`, px * 0.5 + 0.1, py * 0.5 + 0.2, { color: COLORS.focus, size: 11 });
  const dDist = Math.abs(px - dx);
  c2d.showText(`d = ${dDist.toFixed(2)}`, (px + dx) * 0.5, py + 0.2, { color: COLORS.directrix, size: 11 });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

function addFormSelector(container, currentForm, onChange) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  const label = document.createElement('div');
  label.style.cssText = 'font-size:12px;color:#888;font-family:system-ui';
  label.textContent = 'polar form';
  wrap.appendChild(label);
  const btns = document.createElement('div');
  btns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:5px;';
  ['a','b','c','d'].forEach(key => {
    const btn = document.createElement('button');
    btn.dataset.form = key;
    btn.textContent = FORM_LABELS[key];
    const active = key === currentForm;
    btn.style.cssText = `padding:6px 4px;border-radius:6px;border:1px solid ${active ? '#1565c0' : '#ddd'};background:${active ? '#e3f2fd' : '#f8f8f8'};color:${active ? '#1565c0' : '#666'};cursor:pointer;font-size:11px;font-family:Georgia,serif;transition:all 0.1s`;
    btn.addEventListener('click', () => {
      btns.querySelectorAll('button').forEach(b => {
        b.style.borderColor = '#ddd'; b.style.background = '#f8f8f8'; b.style.color = '#666';
      });
      btn.style.borderColor = '#1565c0'; btn.style.background = '#e3f2fd'; btn.style.color = '#1565c0';
      onChange(key);
    });
    btns.appendChild(btn);
  });
  wrap.appendChild(btns);
  container.appendChild(wrap);
}

function mkInitState() {
  return { e: 0.6, p: 1.8, form: 'a', theta: Math.PI / 4, animT: 0, _controls: null };
}

export default {
  title:   "Conic Sections",
  subject: "Geometry",

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 75;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'geom-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: "Slicing a Cone",
      description: "Every conic section — circle, ellipse, parabola, hyperbola — is the curve you get by intersecting a plane with a double cone. The angle of the cut determines which curve appears.",
      equation: "\\text{tilt angle} \\rightarrow \\begin{cases} = 0° & \\text{circle} \\\\ < \\alpha & \\text{ellipse} \\\\ = \\alpha & \\text{parabola} \\\\ > \\alpha & \\text{hyperbola} \\end{cases}",
      notes: "α is the half-angle of the cone.\n\nCircle: plane perpendicular to the axis.\nEllipse: plane tilted but still cuts only one nappe.\nParabola: plane exactly parallel to one side of the cone — the boundary case.\nHyperbola: plane steep enough to cut both nappes — two separate branches appear.\n\nAll four are described by a single equation. The next steps show how.",
      setup(c2d, state) {
        clearControls(state);
        drawAxes(c2d);
        const P = 1.8;

        // Draw all four conics at once to show the family
        drawConicCurve(c2d, P, 0.0,  COLORS.circle,   false); // circle
        drawConicCurve(c2d, P, 0.6,  COLORS.ellipse,  false); // ellipse
        drawConicCurve(c2d, P, 1.0,  COLORS.parabola, false); // parabola
        drawConicCurve(c2d, P, 1.7,  COLORS.hyperbola,false); // hyperbola

        // Labels
        c2d.addText('circle  (e = 0)',     1.9,  1.7, { color: COLORS.circle,    size: 12 });
        c2d.addText('ellipse  (e = 0.6)',  2.2,  0.9, { color: COLORS.ellipse,   size: 12 });
        c2d.addText('parabola  (e = 1)',   2.5, -0.2, { color: COLORS.parabola,  size: 12 });
        c2d.addText('hyperbola  (e = 1.7)',2.5, -1.1, { color: COLORS.hyperbola, size: 12 });

        drawFocus(c2d, false);
      },
      update() {}
    },
    {
      title: "Eccentricity — One Number, Four Shapes",
      description: "Every conic is characterised by a single number e, the eccentricity. It measures how much the curve deviates from a circle. Drag the slider to morph continuously through the entire family.",
      equation: "e = 0: \\text{ circle} \\quad e < 1: \\text{ ellipse} \\quad e = 1: \\text{ parabola} \\quad e > 1: \\text{ hyperbola}",
      notes: "Watch the curve transform continuously as e increases.\n\nAt e = 0 the two foci coincide at the centre — perfect symmetry.\nAs e → 1 the ellipse stretches until one end escapes to infinity — the parabola.\nPast e = 1 the curve breaks into two branches — the hyperbola.\n\nThe transition through e = 1 is smooth in the algebra even though the shape changes dramatically.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 1.9, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawAxes(c2d);
        const color = conicColor(state.e);
        drawConicCurve(c2d, state.p, state.e, color, false);
        drawFocus(c2d, false);
        c2d.addText(`${conicName(state.e)}   e = ${state.e.toFixed(2)}`, -3.8, 3.0,
          { color, size: 14 });
      }
    },
    {
      title: "The Focus & Directrix",
      description: "Every conic can be defined by a focus point F and a line called the directrix. For any point P on the curve, the ratio of its distance to the focus and its distance to the directrix is always exactly e.",
      equation: "\\frac{r}{d} = e \\quad \\Longleftrightarrow \\quad r = e \\cdot d",
      notes: "The moving point P satisfies r/d = e at every position on the curve.\n\nFor a circle (e=0): every point is equidistant from the centre — the directrix retreats to infinity.\nFor an ellipse: r < d (focus is inside, directrix is outside).\nFor a parabola: r = d exactly.\nFor a hyperbola: r > d.\n\nThis single ratio definition unifies all four curves.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0.1, 1.9, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state, dt) {
        state.animT += dt * 0.5;
        state.theta  = state.animT;

        c2d.clearPersistent();
        drawAxes(c2d);
        const color = conicColor(state.e);
        drawConicCurve(c2d, state.p, state.e, color, false);
        drawFocus(c2d, false);
        drawDirectrix(c2d, state.p, state.e, false);
        drawFocusDirectrixPoint(c2d, state.p, state.e, state.theta);
        c2d.addText(`e = ${state.e.toFixed(2)}`, -3.8, 3.0, { color, size: 13 });
      }
    },
    {
      title: "Four Polar Forms",
      description: "Changing cos↔sin rotates the conic 90°. Changing the sign flips which side the periapsis faces. All four forms describe the same family — just in different orientations. Select a form to see the conic and its directrix rotate.",
      equation: "r = \\dfrac{p}{1 + e\\cos\\theta}",
      notes: "The directrix is always perpendicular to the axis of symmetry, on the same side as the periapsis.\n\ncos θ → axis along x  (conic opens left or right)\nsin θ → axis along y  (conic opens up or down)\n\n+ → periapsis toward +axis,  directrix at +p/e\n− → periapsis toward −axis,  directrix at −p/e\n\nThe red dot marks the periapsis (closest point to focus). For ellipses the blue dot marks the apoapsis.",
      setup(c2d, state) {
        state.form = state.form ?? 'a';
        clearControls(state);
        addFormSelector(state._controls, state.form, key => {
          state.form = key;
          renderEquation(FORM_EQUATIONS[key]);
        });
        addSlider(state._controls, 'eccentricity  e', 0, 1.9, 0.01, state.e, v => state.e = v);
        addSlider(state._controls, 'semi-latus rectum  p', 0.5, 3.0, 0.05, state.p, v => state.p = v);
        renderEquation(FORM_EQUATIONS[state.form]);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawAxes(c2d);
        const { e, p, form } = state;
        const color = conicColor(e);

        // Conic curve
        const segs = sampleConicForm(p, e, form);
        for (const seg of segs) c2d.addLine(seg, { color, width: 2.5 });

        // Directrix
        drawDirectrixForm(c2d, p, e, form, false);

        // Focus
        drawFocus(c2d, false);

        // Periapsis
        const [px, py] = periapsisPos(p, e, form);
        c2d.addPoint(px, py, { radius: 5, color: '#c62828' });
        c2d.addText(`r_min=${( p/(1+e) ).toFixed(2)}`, px + 0.12, py - 0.28, { color: '#c62828', size: 11 });

        // Apoapsis (ellipse only)
        if (e < 1) {
          const rApo = p / (1 - e);
          if (rApo < 8) {
            const [ax, ay] = apoapsisPos(p, e, form);
            c2d.addPoint(ax, ay, { radius: 5, color: '#1565c0' });
            c2d.addText(`r_max=${rApo.toFixed(2)}`, ax + 0.12, ay - 0.28, { color: '#1565c0', size: 11 });
          }
        }

        c2d.addText(`${conicName(e)}   e = ${e.toFixed(2)},  p = ${p.toFixed(2)}`, -3.8, 3.0, { color, size: 13 });
      }
    },
    {
      title: "Ellipse Geometry — Axes & Foci",
      description: "For an ellipse, the semi-major axis a and semi-minor axis b are related to p and e. The two foci sit symmetrically inside the ellipse. Every point on the curve has the same sum of distances to the two foci.",
      equation: "a = \\frac{p}{1-e^2}, \\quad b = \\frac{p}{\\sqrt{1-e^2}}, \\quad c = ae \\quad (a^2 = b^2 + c^2)",
      notes: "c = ae is the distance from the centre to each focus.\n\nAs e → 0: c → 0, both foci merge at the centre — circle.\nAs e → 1: c → a, one focus reaches the end of the ellipse.\n\nKepler's first law: planetary orbits are ellipses with the Sun at one focus (not the centre).\n\nDrag e to see how the foci move and the ellipse flattens.",
      setup(c2d, state) {
        state.e = Math.min(state.e, 0.95);
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 0.95, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawAxes(c2d);

        const { e, p } = state;
        if (e >= 1) { state.e = 0.95; return; }

        const a  = p / (1 - e * e);
        const b  = p / Math.sqrt(1 - e * e);
        const fc = a * e;   // focus-to-centre distance
        const ox = -fc;     // centre x (focus at origin → centre at −ae)

        drawConicCurve(c2d, p, e, COLORS.ellipse, false);

        // Full extent dashed axes through centre
        c2d.addLine([[ox - a, 0], [ox + a, 0]], { color: '#ddd', width: 1, dash: [4, 3] });
        c2d.addLine([[ox, -b],    [ox, b]],      { color: '#ddd', width: 1, dash: [4, 3] });

        // ── Semi-major axis arrow: centre → right vertex ──────────────────────
        const COLOR_A = '#1565c0';
        c2d.addArrow(ox, 0, ox + a, 0, { color: COLOR_A, width: 2 });
        c2d.addText(`a = ${a.toFixed(2)}`, ox + a * 0.45, 0.22, { color: COLOR_A, size: 12 });

        // ── Semi-minor axis arrow: centre → top ───────────────────────────────
        const COLOR_B = '#2e7d32';
        c2d.addArrow(ox, 0, ox, b, { color: COLOR_B, width: 2 });
        c2d.addText(`b = ${b.toFixed(2)}`, ox + 0.12, b * 0.52, { color: COLOR_B, size: 12 });

        // ── c arrow: centre → F₁ (focus at origin) ───────────────────────────
        const COLOR_C = COLORS.focus;
        c2d.addArrow(ox, 0, 0, 0, { color: COLOR_C, width: 2 });
        c2d.addText(`c = ${fc.toFixed(2)}`, ox * 0.5 + 0.05, -0.28, { color: COLOR_C, size: 12 });

        // Right-angle marker at centre where the two arrows meet
        c2d.raw((ctx, self) => {
          const s  = 0.15;
          const sx = self.wx(ox + s);
          const sy = self.wy(s);
          const ex = self.wx(ox);
          const ey = self.wy(0);
          ctx.save();
          ctx.strokeStyle = '#aaa';
          ctx.lineWidth   = 1;
          ctx.beginPath();
          ctx.moveTo(sx, ey);
          ctx.lineTo(sx, sy);
          ctx.lineTo(ex, sy);
          ctx.stroke();
          ctx.restore();
        });

        // Both foci
        c2d.addPoint(0,     0, { radius: 5, color: COLOR_C });
        c2d.addPoint(-2*fc, 0, { radius: 5, color: COLOR_C });
        c2d.addText('F₁', 0.12,      -0.35, { color: COLOR_C, size: 11 });
        c2d.addText('F₂', -2*fc+0.12,-0.35, { color: COLOR_C, size: 11 });

        // Centre
        c2d.addPoint(ox, 0, { radius: 3, color: '#aaa' });
        c2d.addText('O', ox - 0.3, 0.15, { color: '#aaa', size: 11 });

        c2d.addText(`e = ${e.toFixed(2)}`, -3.8, 3.0, { color: COLORS.ellipse, size: 13 });
      }
    }
  ]
};
