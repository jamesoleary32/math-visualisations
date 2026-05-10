// ODE Overview — ordinary differential equations from the slope-field perspective.
// The central idea: dy/dx = f(x,y) assigns a slope to every point in the plane.
// Solutions are curves that are everywhere tangent to that slope.

// ── ODE library ───────────────────────────────────────────────────────────────

const ODES = [
  {
    id: 'exp-growth',
    label: "dy/dx = y",
    latex: "\\dfrac{dy}{dx} = y",
    f: (x, y) => y,
    yRange: [-3, 3],
    notes: 'dy/dx = y means the slope equals the current value — the more you have, the faster you grow. Solution: y = Ce^x. Every solution is an exponential, scaled by the initial value C = y(0).\n\nThis models unconstrained population growth, compound interest, or radioactive decay (with a minus sign).',
  },
  {
    id: 'exp-decay',
    label: "dy/dx = −y",
    latex: "\\dfrac{dy}{dx} = -y",
    f: (x, y) => -y,
    yRange: [-3, 3],
    notes: 'Solution: y = Ce^{−x}. Slopes are positive below the x-axis and negative above it — the curve is always being pulled back toward zero.\n\nModels radioactive decay, Newton\'s law of cooling (temperature difference decaying), discharging a capacitor.',
  },
  {
    id: 'linear',
    label: "dy/dx = x",
    latex: "\\dfrac{dy}{dx} = x",
    f: (x, y) => x,
    yRange: [-4, 4],
    notes: 'The slope depends only on x — the field has horizontal bands. Solution: y = x²/2 + C. Each solution is an upward parabola; different C values just shift them vertically.\n\nNote: the solution curves don\'t depend on y at all — this ODE is "separable" and trivially integrable.',
  },
  {
    id: 'logistic',
    label: "dy/dx = y(1−y)",
    latex: "\\dfrac{dy}{dx} = y(1-y)",
    f: (x, y) => y * (1 - y),
    yRange: [-0.5, 1.8],
    notes: 'The logistic equation. Slopes are zero on y = 0 and y = 1 (the equilibria). Between them slopes are positive — solutions rise from 0 toward 1. Above y=1 slopes are negative — solutions fall back.\n\nSolution: y = 1/(1 + Ce^{−x}). Models population growth with a carrying capacity, the spread of disease, or learning curves.',
  },
  {
    id: 'approach',
    label: "dy/dx = x − y",
    latex: "\\dfrac{dy}{dx} = x - y",
    f: (x, y) => x - y,
    yRange: [-3, 3],
    notes: 'Zero-slope line along y = x (the "nullcline"). Above y = x slopes are negative (pulled down); below they are positive (pushed up). Solutions converge toward and then track y = x − 1.\n\nSolution: y = x − 1 + Ce^{−x}. The particular solution y = x−1 is called the "particular integral"; Ce^{−x} is the complementary function that decays away.',
  },
  {
    id: 'saddle',
    label: "dy/dx = x/y",
    latex: "\\dfrac{dy}{dx} = \\dfrac{x}{y}",
    f: (x, y) => Math.abs(y) < 0.05 ? Infinity : x / y,
    yRange: [-3, 3],
    notes: 'Separable: y dy = x dx → y²/2 = x²/2 + C → y² − x² = const. Solutions are hyperbolas centred on the origin, with the axes as asymptotes.\n\nThe field is undefined on the x-axis (y = 0) — this is a singular line. Solutions that reach it stop or switch branch.',
  },
];

// ── Slope / direction field ───────────────────────────────────────────────────

// Draw a normalised direction field for f on a grid.
// Each tick is a line segment of fixed world-length centred at the grid point.
function drawField(ctx, self, f, xMin, xMax, yMin, yMax, spacing, len, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.2;
  for (let xi = xMin; xi <= xMax + 1e-9; xi += spacing) {
    for (let yi = yMin; yi <= yMax + 1e-9; yi += spacing) {
      const slope = f(xi, yi);
      if (!isFinite(slope)) continue;
      // Normalise direction (1, slope) to length len/2 each side
      const mag = Math.sqrt(1 + slope * slope);
      const dx  = (len / 2) / mag;
      const dy  = (len / 2) * slope / mag;
      ctx.beginPath();
      ctx.moveTo(self.wx(xi - dx), self.wy(yi - dy));
      ctx.lineTo(self.wx(xi + dx), self.wy(yi + dy));
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Euler integration: returns array of [x, y] points
function eulerCurve(f, x0, y0, xEnd, step) {
  const pts = [[x0, y0]];
  let x = x0, y = y0;
  const sign = xEnd >= x0 ? 1 : -1;
  while (sign * x < sign * xEnd) {
    const s = f(x, y);
    if (!isFinite(s) || Math.abs(y) > 30) break;
    y += s * step * sign;
    x += step * sign;
    pts.push([x, y]);
  }
  return pts;
}

// Clip a curve to the canvas world bounds and split at discontinuities
function clippedSegments(pts, yMin, yMax) {
  const segs = [[]];
  for (const [x, y] of pts) {
    if (y < yMin || y > yMax) {
      if (segs[segs.length - 1].length > 0) segs.push([]);
    } else {
      segs[segs.length - 1].push([x, y]);
    }
  }
  return segs.filter(s => s.length > 1);
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addOdeSelector(container, currentId, onChange) {
  const wrap  = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  const label = document.createElement('div');
  label.style.cssText = 'font-size:12px;color:#888;font-family:system-ui;';
  label.textContent = 'equation';
  wrap.appendChild(label);
  const sel = document.createElement('select');
  sel.style.cssText = 'padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;font-family:Georgia,serif;background:#fafafa;';
  for (const ode of ODES) {
    const opt = document.createElement('option');
    opt.value   = ode.id;
    opt.textContent = ode.label;
    if (ode.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.appendChild(sel);
  container.appendChild(wrap);
}

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return { odeId: 'exp-growth', _controls: null };
}

function getOde(id) { return ODES.find(o => o.id === id) ?? ODES[0]; }

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Ordinary Differential Equations',
  subject: 'Differential Equations',

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 70;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    // ── Step 1: What is an ODE? ───────────────────────────────────────────────
    {
      title: 'What is an ODE?',
      description: "An ordinary differential equation relates a function to its own derivatives. Rather than solving for a number, you're solving for a function whose rate of change obeys a given rule.",
      equation: "\\frac{dy}{dx} = f(x,\\, y) \\\\[10pt] \\text{unknown: the function } y(x)",
      notes: 'The equation dy/dx = f(x, y) assigns a slope to every point in the x-y plane. A solution is any curve y(x) whose tangent at each point matches the prescribed slope.\n\nExamples:\n  dy/dx = y          exponential growth\n  dy/dx = −ky        exponential decay\n  dy/dx = y(1−y)     logistic growth\n  d²x/dt² = −ω²x    simple harmonic oscillator\n\nThe last one is a second-order ODE — it involves the second derivative. First-order ODEs (involving only y\') are the simplest family and are the focus of this lesson.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addLine([[-5, 0], [5, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[0, -4], [0, 4]], { color: '#ccc', width: 1 });

        // Draw y = e^x (solution of dy/dx = y, C=1) as an example
        const pts = [];
        for (let x = -4; x <= 2.2; x += 0.05) {
          const y = Math.exp(x);
          if (y > 6) break;
          pts.push([x, y]);
        }
        c2d.addLine(pts, { color: '#1565c0', width: 2.5 });
        c2d.addText('y = eˣ  (solution of dy/dx = y)', -3.8, 2.0, { color: '#1565c0', size: 12 });

        // Annotate one point showing slope = value
        const x0 = 0.5, y0 = Math.exp(0.5);
        const sc = 0.8;
        c2d.addPoint(x0, y0, { radius: 5, color: '#c62828' });
        c2d.addArrow(x0 - sc, y0 - y0*sc, x0 + sc, y0 + y0*sc, { color: '#c62828', width: 2 });
        c2d.addText(`slope = y = ${y0.toFixed(2)}`, x0 + 0.15, y0 - 0.4, { color: '#c62828', size: 11 });

        c2d.addText('x', 4.7, -0.3, { color: '#aaa', size: 12 });
        c2d.addText('y', 0.15, 3.8, { color: '#aaa', size: 12 });
      },
      update() {},
    },

    // ── Step 2: Slope field ───────────────────────────────────────────────────
    {
      title: 'The Slope Field',
      description: "At every point (x, y) the ODE specifies a slope. Drawing a short line segment with that slope at each grid point produces a slope field — a portrait of all possible solution behaviour at once.",
      equation: "\\text{At each }(x,y):\\quad \\text{slope} = f(x,y)",
      notes: '',  // set dynamically
      setup(c2d, state) {
        clearControls(state);
        addOdeSelector(state._controls, state.odeId, id => {
          state.odeId = id;
          const ode = getOde(id);
          // Update notes dynamically
          document.getElementById('step-notes').textContent = ode.notes;
        });
        // Set initial notes
        const ode = getOde(state.odeId);
        document.getElementById('step-notes').textContent = ode.notes;
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const ode = getOde(state.odeId);

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addLine([[-5, 0], [5, 0]], { color: '#ddd', width: 1 });
        c2d.addLine([[0, -4], [0, 4]], { color: '#ddd', width: 1 });

        c2d.raw((ctx, self) => {
          drawField(ctx, self, ode.f, -4.5, 4.5, -3.8, 3.8, 0.45, 0.35, '#1565c0');
        });

        c2d.addText(ode.label, -4.5, 3.5, { color: '#1565c0', size: 13 });
      },
    },

    // ── Step 3: Solution curves ───────────────────────────────────────────────
    {
      title: 'Solution Curves and Initial Conditions',
      description: 'Each curve that threads through the slope field, staying tangent to every tick it passes, is a solution. An initial condition y(x₀) = y₀ picks exactly one curve from the family.',
      equation: "y(x_0) = y_0 \\;\\Rightarrow\\; \\text{unique solution}",
      notes: '',
      setup(c2d, state) {
        clearControls(state);
        addOdeSelector(state._controls, state.odeId, id => {
          state.odeId = id;
          document.getElementById('step-notes').textContent = getOde(id).notes;
        });
        document.getElementById('step-notes').textContent = getOde(state.odeId).notes;
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const ode  = getOde(state.odeId);
        const step = 0.04;
        const CURVE_COLORS = [
          '#c62828','#1565c0','#2e7d32','#e65100','#6a1b9a','#00838f','#558b2f',
        ];

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addLine([[-5, 0], [5, 0]], { color: '#ddd', width: 1 });
        c2d.addLine([[0, -4], [0, 4]], { color: '#ddd', width: 1 });

        // Faint slope field
        c2d.raw((ctx, self) => {
          drawField(ctx, self, ode.f, -4.5, 4.5, -3.8, 3.8, 0.45, 0.32, 'rgba(21,101,192,0.2)');
        });

        // Solution curves from different initial conditions at x = -4
        const y0s = [-3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3];
        y0s.forEach((y0, i) => {
          const color = CURVE_COLORS[i % CURVE_COLORS.length];
          const fwd   = eulerCurve(ode.f, -4, y0, 4.5, step);
          const segs  = clippedSegments(fwd, -4.5, 4.5);
          for (const seg of segs) c2d.addLine(seg, { color, width: 2 });
          // IC dot
          if (Math.abs(y0) <= 3.8) c2d.addPoint(-4, y0, { radius: 4, color });
        });

        c2d.addText(ode.label, -4.5, 3.5, { color: '#333', size: 13 });
        c2d.addText('each curve = one solution (one IC)', -4.5, -3.5, { color: '#888', size: 11 });
      },
    },

    // ── Step 4: Order and linearity ───────────────────────────────────────────
    {
      title: 'Order and Linearity',
      description: "ODEs are classified by their order (highest derivative present) and linearity (whether y and its derivatives appear only to the first power). These determine which solution methods apply.",
      equation: "\\text{1st order: } F(x,\\,y,\\,y') = 0 \\\\[8pt] \\text{2nd order: } F(x,\\,y,\\,y',\\,y'') = 0 \\\\[8pt] \\text{Linear: coefficients depend on }x\\text{ only}",
      notes: 'Order: the order of the highest derivative.\n  dy/dx = y              1st order\n  d²x/dt² = −ω²x        2nd order (SHM)\n  d³y/dx³ + y = 0       3rd order\n\nLinearity: an ODE is linear if y and all its derivatives appear only to the first power, not multiplied together.\n  dy/dx + P(x)y = Q(x)  linear (1st order)\n  dy/dx = y²             nonlinear (y appears squared)\n  dy/dx = y(1−y)         nonlinear (y² term)\n\nA second-order ODE y\'\' = f(x,y,y\') can always be written as two coupled first-order ODEs by introducing v = y\':\n  dy/dx = v\n  dv/dx = f(x, y, v)\n\nThis is the trick used by numerical integrators.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addLine([[-5, 0], [5, 0]], { color: '#ddd', width: 1 });
        c2d.addLine([[0, -4], [0, 4]], { color: '#ddd', width: 1 });

        // Show two contrasting slope fields side by side:
        // Left half: linear dy/dx = −y; Right half: nonlinear dy/dx = y(1−y)
        const step = 0.04;

        // Linear solutions (left half, x < 0): dy/dx = -y
        const fLin = (x, y) => -y;
        [-3,-2,-1,0,1,2,3].forEach((y0, i) => {
          const color = '#1565c0';
          const pts   = eulerCurve(fLin, -4, y0, -0.1, step);
          const segs  = clippedSegments(pts, -4, 4);
          for (const s of segs) c2d.addLine(s, { color, width: 1.8 });
        });
        c2d.raw((ctx, self) => {
          drawField(ctx, self, fLin, -4.5, -0.3, -3.8, 3.8, 0.5, 0.32, 'rgba(21,101,192,0.25)');
        });
        c2d.addText("linear: dy/dx = −y", -4.3, 3.5, { color: '#1565c0', size: 11 });

        // Nonlinear solutions (right half, x > 0): dy/dx = y(1-y)
        const fLog = (x, y) => y * (1 - y);
        [-0.5,0,0.2,0.5,0.8,1,1.5,2].forEach(y0 => {
          const color = '#e65100';
          const pts   = eulerCurve(fLog, 0, y0, 4.5, step);
          const segs  = clippedSegments(pts, -4, 4);
          for (const s of segs) c2d.addLine(s, { color, width: 1.8 });
        });
        c2d.raw((ctx, self) => {
          drawField(ctx, self, fLog, 0.2, 4.5, -3.8, 3.8, 0.5, 0.32, 'rgba(230,81,0,0.25)');
        });
        c2d.addText("nonlinear: dy/dx = y(1−y)", 0.2, 3.5, { color: '#e65100', size: 11 });

        // Dividing line
        c2d.addLine([[0, -4], [0, 4]], { color: '#ccc', width: 1.5, dash: [6, 4] });
      },
      update() {},
    },
  ],
};
