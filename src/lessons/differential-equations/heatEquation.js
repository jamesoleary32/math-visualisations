// Heat Equation — ∂u/∂t = α ∂²u/∂x²
// The canonical parabolic PDE. Visualised via Fourier series on [0,1] with
// Dirichlet boundary conditions u(0,t) = u(1,t) = 0.
//
// Exact solution: u(x,t) = Σ_n B_n sin(nπx) exp(−α n²π²t)

const ALPHA = 0.02;   // thermal diffusivity
const N_MODES = 40;   // Fourier modes to sum
const N_PTS   = 200;  // spatial grid for display

// ── Fourier ───────────────────────────────────────────────────────────────────

// Compute Fourier sine coefficients B_n for a given initial profile u(x)
// using the formula B_n = 2 ∫₀¹ u(x) sin(nπx) dx  (trapezoidal rule)
function fourierCoeffs(uFunc, nModes) {
  const dx = 1 / 500;
  const B  = new Float64Array(nModes + 1);
  for (let n = 1; n <= nModes; n++) {
    let sum = 0;
    for (let i = 0; i <= 500; i++) {
      const x = i * dx;
      sum += uFunc(x) * Math.sin(n * Math.PI * x) * dx;
    }
    B[n] = 2 * sum;
  }
  return B;
}

// Evaluate u(x, t) from coefficients
function evalU(B, x, t, nModes) {
  let u = 0;
  for (let n = 1; n <= nModes; n++) {
    u += B[n] * Math.sin(n * Math.PI * x) * Math.exp(-ALPHA * n*n * Math.PI*Math.PI * t);
  }
  return u;
}

// ── Initial conditions ────────────────────────────────────────────────────────

const IC_LIST = [
  {
    id: 'spike',
    label: 'Spike at centre',
    fn: x => (Math.abs(x - 0.5) < 0.04 ? 1 : 0),
    notes: 'A concentrated heat pulse. The Fourier series needs many modes to represent the sharp spike, so many modes are excited simultaneously. As time progresses the high-frequency modes (n large) decay fastest, leaving a smooth Gaussian-like bump that gradually fades.',
  },
  {
    id: 'sine',
    label: 'sin(πx)  — single mode',
    fn: x => Math.sin(Math.PI * x),
    notes: 'The fundamental Fourier mode n=1. With a single-mode initial condition the solution is exact and simple: u(x,t) = sin(πx) e^{−απ²t}. The shape never changes — it just decays in amplitude exponentially. This is the slowest-decaying mode.',
  },
  {
    id: 'sine3',
    label: 'sin(3πx)  — mode 3',
    fn: x => Math.sin(3 * Math.PI * x),
    notes: 'Mode n=3 decays 9× faster than mode n=1 (rate ∝ n²). The pattern fades much more quickly while preserving its shape. This illustrates why the heat equation smooths — high-frequency spatial variations die out first.',
  },
  {
    id: 'step',
    label: 'Step function',
    fn: x => (x < 0.5 ? 1 : 0),
    notes: 'A discontinuous initial condition — left half hot, right half cold. The Fourier series of a step function contains all odd modes (1, 3, 5, ...). The sharp discontinuity at x=0.5 smooths out immediately, while the overall profile gradually levels to zero.',
  },
  {
    id: 'triangle',
    label: 'Triangle',
    fn: x => (x < 0.5 ? 2*x : 2*(1-x)),
    notes: 'A smooth triangular profile. Fourier coefficients decay as 1/n², so the series converges faster than the step. The peak at x=0.5 diffuses outward symmetrically.',
  },
];

function getIC(id) { return IC_LIST.find(o => o.id === id) ?? IC_LIST[0]; }

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSelector(container, label, options, currentId, onChange) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:12px;color:#888;font-family:system-ui;';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  const sel = document.createElement('select');
  sel.style.cssText = 'padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;font-family:system-ui;background:#fafafa;';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o.id; opt.textContent = o.label;
    if (o.id === currentId) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  wrap.appendChild(sel);
  container.appendChild(wrap);
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `he-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span>
      <span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(3)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const vel = wrap.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); vel.textContent = v.toFixed(3); onChange(v); });
}

// ── World-space helpers ───────────────────────────────────────────────────────
// Map x ∈ [0,1] → world [-4, 4],  u ∈ [-0.3, 1.3] → world [-3, 3.5]

const WX0 = -4, WX1 = 4;         // world x extent
const WY0 = -3, WY1 = 3.5;       // world y extent
const U_MIN = -0.3, U_MAX = 1.3;

function toWorldX(x) { return WX0 + x * (WX1 - WX0); }
function toWorldY(u) { return WY0 + ((u - U_MIN) / (U_MAX - U_MIN)) * (WY1 - WY0); }

function drawAxes(c2d) {
  // x-axis at u=0
  const y0 = toWorldY(0);
  c2d.addLine([[WX0, y0], [WX1 + 0.3, y0]], { color: '#ccc', width: 1 });
  // y-axis
  c2d.addLine([[WX0, WY0], [WX0, WY1]], { color: '#ccc', width: 1 });
  // Labels
  c2d.addText('x', WX1 + 0.2, y0 - 0.3, { color: '#888', size: 12 });
  c2d.addText('u', WX0 + 0.1, WY1, { color: '#888', size: 12 });
  c2d.addText('0', WX0 - 0.35, y0 - 0.28, { color: '#aaa', size: 10 });
  c2d.addText('1', WX1 - 0.1, y0 - 0.28,  { color: '#aaa', size: 10 });
  c2d.addText('1', WX0 - 0.35, toWorldY(1) - 0.1, { color: '#aaa', size: 10 });
}

function drawProfile(c2d, B, t, color, live, nModes = N_MODES) {
  const pts = [];
  for (let i = 0; i <= N_PTS; i++) {
    const x = i / N_PTS;
    const u = evalU(B, x, t, nModes);
    pts.push([toWorldX(x), toWorldY(u)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width: 2.5 });
}

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  const ic = IC_LIST[0];
  return {
    icId:  ic.id,
    B:     fourierCoeffs(ic.fn, N_MODES),
    t:     0,
    speed: 0.5,
    modeN: 1,
    _controls: null,
  };
}

function loadIC(state, id) {
  const ic    = getIC(id);
  state.icId  = id;
  state.B     = fourierCoeffs(ic.fn, N_MODES);
  state.t     = 0;
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'The Heat Equation',
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
    // ── Step 1: The PDE ───────────────────────────────────────────────────────
    {
      title: 'The Heat Equation — a PDE',
      description: 'Unlike an ODE, the heat equation involves partial derivatives with respect to both space and time. It describes how a temperature distribution u(x,t) evolves — heat flows from hot to cold, smoothing out any variation.',
      equation: "\\frac{\\partial u}{\\partial t} = \\alpha\\,\\frac{\\partial^2 u}{\\partial x^2}",
      notes: 'This is a partial differential equation (PDE) — u depends on two independent variables x (position) and t (time).\n\nPhysical meaning of each term:\n  ∂u/∂t    — rate of temperature change at a fixed point\n  ∂²u/∂x²  — curvature of the temperature profile\n\nIf the profile is concave down (∂²u/∂x² < 0) at a point, heat flows away → temperature falls.\nIf concave up (∂²u/∂x² > 0), heat flows in → temperature rises.\nFlat regions (∂²u/∂x² = 0) don\'t change.\n\nα is the thermal diffusivity — a material property. Large α means fast diffusion.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawAxes(c2d);

        // Draw three snapshots of a diffusing spike to preview the behaviour
        const ic  = IC_LIST[0]; // spike
        const B   = fourierCoeffs(ic.fn, N_MODES);
        const times  = [0.001, 0.05, 0.3];
        const colors = ['#c62828', '#e65100', '#1565c0'];
        const labels = ['t ≈ 0', 't = 0.05', 't = 0.30'];

        for (let i = 0; i < times.length; i++) {
          drawProfile(c2d, B, times[i], colors[i], false);
          // Place label near peak
          const uPeak  = evalU(B, 0.5, times[i], N_MODES);
          c2d.addText(labels[i], toWorldX(0.52), toWorldY(uPeak) + 0.1, { color: colors[i], size: 11 });
        }

        c2d.addText('α = ' + ALPHA, WX0 + 0.1, WY1 - 0.3, { color: '#555', size: 11 });
      },
      update() {},
    },

    // ── Step 2: Diffusion animation ───────────────────────────────────────────
    {
      title: 'Diffusion in Action',
      description: 'Watch the temperature profile evolve over time. Sharp features smooth out quickly, broad features persist. The profile always decays to zero (for Dirichlet boundary conditions).',
      equation: "u(x,t) = \\sum_{n=1}^{\\infty} B_n \\sin(n\\pi x)\\, e^{-\\alpha n^2\\pi^2 t}",
      notes: '',  // set from IC
      setup(c2d, state) {
        clearControls(state);
        addSelector(state._controls, 'initial condition', IC_LIST, state.icId, id => {
          loadIC(state, id);
          document.getElementById('step-notes').textContent = getIC(id).notes;
        });
        addSlider(state._controls, 'speed', 0.1, 3, 0.05, state.speed, v => state.speed = v);
        document.getElementById('step-notes').textContent = getIC(state.icId).notes;
        state.t = 0;
      },
      update(c2d, state, dt) {
        state.t += dt * state.speed * 0.1;
        if (state.t > 2) state.t = 0;

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawAxes(c2d);

        // Ghost of initial condition
        drawProfile(c2d, state.B, 0.001, 'rgba(180,180,180,0.4)', false);

        // Current profile
        drawProfile(c2d, state.B, state.t, '#1565c0', false);

        c2d.addText(`t = ${state.t.toFixed(3)}`, WX0 + 0.1, WY1 - 0.3, { color: '#1565c0', size: 12 });
      },
    },

    // ── Step 3: Fourier modes ─────────────────────────────────────────────────
    {
      title: 'Fourier Modes and Decay Rates',
      description: 'Every initial condition decomposes into sine modes sin(nπx). Each mode decays independently and exponentially in time — but higher modes decay n² times faster. This is why the heat equation smooths.',
      equation: "u_n(x,t) = \\sin(n\\pi x)\\,e^{-\\alpha n^2\\pi^2 t} \\\\[8pt] \\text{decay rate: }\\lambda_n = \\alpha n^2\\pi^2",
      notes: 'Mode n=1 decays at rate α π² ≈ 0.197\nMode n=2 decays 4× faster: 4α π²\nMode n=3 decays 9× faster: 9α π²\n\nThis n² scaling is the mathematical reason diffusion smooths sharp features: a rapidly varying spatial pattern (high n) disappears almost immediately, while slowly varying patterns (low n) persist.\n\nIn signal processing, the heat equation acts as a low-pass filter — it removes high-frequency spatial content while preserving low-frequency structure.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'mode  n', 1, 8, 1, state.modeN, v => { state.modeN = Math.round(v); state.t = 0; });
        addSlider(state._controls, 'speed', 0.1, 3, 0.05, state.speed, v => state.speed = v);
        state.t = 0;
      },
      update(c2d, state, dt) {
        state.t += dt * state.speed * 0.1;
        if (state.t > 3 / (ALPHA * state.modeN * state.modeN * Math.PI * Math.PI)) state.t = 0;

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawAxes(c2d);

        const n = state.modeN;

        // Draw this single mode: sin(nπx) * exp(-α n²π²t)
        const amp = Math.exp(-ALPHA * n * n * Math.PI * Math.PI * state.t);
        const pts = [];
        for (let i = 0; i <= N_PTS; i++) {
          const x = i / N_PTS;
          const u = amp * Math.sin(n * Math.PI * x);
          pts.push([toWorldX(x), toWorldY(u)]);
        }
        c2d.addLine(pts, { color: '#1565c0', width: 2.5 });

        // Ghost of t=0
        const ptsInit = [];
        for (let i = 0; i <= N_PTS; i++) {
          const x = i / N_PTS;
          ptsInit.push([toWorldX(x), toWorldY(Math.sin(n * Math.PI * x))]);
        }
        c2d.addLine(ptsInit, { color: 'rgba(21,101,192,0.18)', width: 1.5, dash: [4,3] });

        const rate = ALPHA * n * n * Math.PI * Math.PI;
        c2d.addText(`n = ${n}   decay rate λ = ${rate.toFixed(3)}`, WX0 + 0.1, WY1 - 0.3,
          { color: '#1565c0', size: 12 });
        c2d.addText(`amplitude = e^{-λt} = ${amp.toFixed(3)}`, WX0 + 0.1, WY1 - 0.75,
          { color: '#555', size: 11 });
      },
    },

    // ── Step 4: General solution ──────────────────────────────────────────────
    {
      title: 'General Solution — Superposition',
      description: 'Any initial temperature profile decomposes into Fourier modes. Each mode then decays independently. The full solution is their superposition — modes of all frequencies fading at different rates until the bar reaches thermal equilibrium.',
      equation: "u(x,t) = \\sum_{n=1}^{N} B_n \\sin(n\\pi x)\\, e^{-\\alpha n^2\\pi^2 t}",
      notes: '',
      setup(c2d, state) {
        clearControls(state);
        addSelector(state._controls, 'initial condition', IC_LIST, state.icId, id => {
          loadIC(state, id);
          document.getElementById('step-notes').textContent = getIC(id).notes;
        });
        addSlider(state._controls, 'modes to include  N', 1, 40, 1, N_MODES, v => state.nModesShow = Math.round(v));
        addSlider(state._controls, 'speed', 0.1, 3, 0.05, state.speed, v => state.speed = v);

        state.nModesShow = state.nModesShow ?? N_MODES;
        state.t = 0;
        document.getElementById('step-notes').textContent = getIC(state.icId).notes;
      },
      update(c2d, state, dt) {
        state.t += dt * state.speed * 0.1;
        if (state.t > 2) state.t = 0;

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawAxes(c2d);

        const nShow = state.nModesShow ?? N_MODES;

        // Draw individual mode contributions (faint coloured lines)
        const modeColors = ['#c62828','#e65100','#f9a825','#2e7d32','#1565c0','#6a1b9a','#00838f','#558b2f'];
        for (let n = 1; n <= Math.min(nShow, 8); n++) {
          const amp = state.B[n] * Math.exp(-ALPHA * n*n * Math.PI*Math.PI * state.t);
          if (Math.abs(amp) < 0.005) continue;
          const pts = [];
          for (let i = 0; i <= N_PTS; i++) {
            const x = i / N_PTS;
            pts.push([toWorldX(x), toWorldY(amp * Math.sin(n * Math.PI * x))]);
          }
          c2d.addLine(pts, { color: modeColors[(n-1) % modeColors.length] + '55', width: 1.2 });
        }

        // Full solution
        drawProfile(c2d, state.B, state.t, '#1565c0', false, nShow);

        // Ghost initial
        drawProfile(c2d, state.B, 0.001, 'rgba(180,180,180,0.35)', false, nShow);

        c2d.addText(`t = ${state.t.toFixed(3)}   N = ${nShow} modes`, WX0 + 0.1, WY1 - 0.3,
          { color: '#1565c0', size: 12 });
      },
    },
  ],
};
