// A Simplified Network — Prince, Figure 8.4 (§8.2, Sources of error).
//
// Three ReLU hidden units whose weights and biases are FROZEN, chosen so each
// activation has slope 1 with joints equally spaced at x = 0, 1/3, 2/3. Only the
// output parameters phi = {beta, w1, w2, w3} remain learnable.
//
// The point: those four parameters span EXACTLY the piecewise-linear functions on
// [0,1] with joints at 1/3 and 2/3 — and nothing else. The "nothing else" is the
// model class's built-in bias, which is why Prince uses this model to dissect error.

const JOINTS = [0, 1 / 3, 2 / 3];
const relu = v => Math.max(0, v);

// hidden unit i: slope-1 ReLU with its joint
const hidden = (i, x) => relu(x - JOINTS[i]);

// y = beta + sum_i w_i * h_i(x)
function yOf(phi, x) {
  return phi[0] + phi[1] * hidden(0, x) + phi[2] * hidden(1, x) + phi[3] * hidden(2, x);
}

// the three segment slopes: w1, w1+w2, w1+w2+w3
const slopesOf = phi => [phi[1], phi[1] + phi[2], phi[1] + phi[2] + phi[3]];

// the three example functions from panels e), f), g)
const PRESETS = {
  e: [0.45, -0.1, -1.6, 1.9],
  f: [-0.75, 4.0, -4.6, -2.4],
  g: [0.35, 1.4, -5.6, 7.6],
};

// the smooth function we will try (and fail) to represent
const trueF = x => 0.7 * Math.sin(2 * Math.PI * x);

// ── Least squares: the BEST this model class can possibly do ──────────────────
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) continue;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = Math.abs(M[r][r]) < 1e-12 ? 0 : s / M[r][r];
  }
  return x;
}

// best-fit parameters for a hidden layer with the given joints (linear in phi)
function bestFit(joints) {
  const m = joints.length + 1;                  // beta + one weight per unit
  const ATA = Array.from({ length: m }, () => new Array(m).fill(0));
  const ATy = new Array(m).fill(0);
  const K = 400;
  for (let k = 0; k <= K; k++) {
    const x = k / K;
    const phi = [1, ...joints.map(j => relu(x - j))];
    const t = trueF(x);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) ATA[i][j] += phi[i] * phi[j];
      ATy[i] += phi[i] * t;
    }
  }
  for (let i = 0; i < m; i++) ATA[i][i] += 1e-9;
  return solve(ATA, ATy);
}

const evalFit = (coef, joints, x) =>
  coef[0] + joints.reduce((s, j, i) => s + coef[i + 1] * relu(x - j), 0);

// mean squared approximation error of the best fit — this is the BIAS
function biasOf(joints) {
  const coef = bestFit(joints);
  let e = 0; const K = 400;
  for (let k = 0; k <= K; k++) {
    const x = k / K;
    e += (evalFit(coef, joints, x) - trueF(x)) ** 2;
  }
  return { coef, mse: e / (K + 1) };
}

const jointsFor = K => Array.from({ length: K }, (_, i) => i / K);

// ── Colours (following the figure) ────────────────────────────────────────────
const H = ['#e57373', '#4db6ac', '#90a4ae'];     // h1, h2, h3
const OUT = '#546e7a', TRUEC = '#00897b', FIT = '#e8710a', GRIDC = '#e8e8e8';

// ── Plot helpers ──────────────────────────────────────────────────────────────
function plotBox(ctx, box, opts = {}) {
  const [L, T, R, B] = box;
  const { ylo = -1, yhi = 1, joints = JOINTS, xlabel = 'Input, x', ylabel = null } = opts;
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.strokeRect(L, T, R - L, B - T);

  // dotted verticals at the joints — where the kinks can occur
  ctx.setLineDash([2, 3]); ctx.strokeStyle = GRIDC;
  joints.forEach(j => {
    if (j <= 0) return;
    const px = L + j * (R - L);
    ctx.beginPath(); ctx.moveTo(px, T); ctx.lineTo(px, B); ctx.stroke();
  });
  ctx.setLineDash([]);

  ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(xlabel, (L + R) / 2, B + 30);
  ctx.fillText('0.0', L, B + 15); ctx.fillText('1.0', R, B + 15);
  ctx.textAlign = 'right';
  ctx.fillText(yhi.toFixed(1), L - 6, T + 4);
  ctx.fillText(ylo.toFixed(1), L - 6, B + 4);
  if (ylabel) {
    ctx.save(); ctx.translate(L - 34, (T + B) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText(ylabel, 0, 0); ctx.restore();
  }
  ctx.textAlign = 'left';

  const sx = x => L + x * (R - L);
  const sy = y => B - (y - ylo) / (yhi - ylo) * (B - T);
  return { sx, sy };
}

function plotFn(ctx, m, fn, color, width = 2.4, dash = []) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.setLineDash(dash);
  for (let i = 0; i <= 300; i++) {
    const x = i / 300;
    const px = m.sx(x), py = m.sy(fn(x));
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.setLineDash([]);
}

// ── a) the network diagram ────────────────────────────────────────────────────
function drawNetwork(c2d, st) {
  c2d.raw((ctx, c) => {
    const cx = c.width / 2, cy = 150;
    const node = (x, y, label, color = '#333', r = 20, fill = '#fff') => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = color; ctx.font = 'italic 14px Georgia, serif';
      ctx.textAlign = 'center'; ctx.fillText(label, x, y + 5); ctx.textAlign = 'left';
    };
    const edge = (x0, y0, x1, y1, color, dashed, w = 1.5) => {
      const a = Math.atan2(y1 - y0, x1 - x0);
      const sx0 = x0 + 20 * Math.cos(a), sy0 = y0 + 20 * Math.sin(a);
      const sx1 = x1 - 22 * Math.cos(a), sy1 = y1 - 22 * Math.sin(a);
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1); ctx.stroke(); ctx.setLineDash([]);
      // arrowhead
      ctx.beginPath(); ctx.fillStyle = color;
      ctx.moveTo(sx1 + 6 * Math.cos(a), sy1 + 6 * Math.sin(a));
      ctx.lineTo(sx1 - 3 * Math.sin(a), sy1 + 3 * Math.cos(a));
      ctx.lineTo(sx1 + 3 * Math.sin(a), sy1 - 3 * Math.cos(a));
      ctx.closePath(); ctx.fill();
    };

    const xIn = cx - 210, xH = cx - 20, xOut = cx + 180;
    const hy = [cy - 70, cy, cy + 70];

    // fixed (dashed) input → hidden connections
    for (let i = 0; i < 3; i++) {
      edge(xIn, cy - 55, xH, hy[i], '#d9b3b3', true);   // from the bias unit "1"
      edge(xIn, cy + 25, xH, hy[i], '#bbb', true);      // from x
    }
    node(xIn, cy - 55, '1', '#e57373', 17, '#fdf1f1');
    node(xIn, cy + 25, 'x', '#666', 20);

    for (let i = 0; i < 3; i++) {
      node(xH, hy[i], `h${i + 1}`, H[i], 21, '#fff');
      edge(xH, hy[i], xOut, cy, '#666', false, 1.8);
      ctx.fillStyle = '#333'; ctx.font = 'italic 13px Georgia, serif';
      ctx.fillText(`ω${i + 1}`, (xH + xOut) / 2 - 6, (hy[i] + cy) / 2 - 6 + (i === 1 ? -4 : 0));
    }
    node(xOut, cy, 'y', '#333', 21, '#f6f6f6');
    ctx.fillStyle = '#333'; ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('β', xOut - 12, cy - 34);

    // legend
    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#c07b7b';
    ctx.fillText('dashed = FROZEN (weights & biases fixed)', cx, cy + 130);
    ctx.fillStyle = '#333';
    ctx.fillText('solid = learnable   φ = { β, ω₁, ω₂, ω₃ }', cx, cy + 152);
    ctx.textAlign = 'left';
  });
}

// ── b–d) the three hidden activations, side by side ───────────────────────────
function drawHiddenUnits(c2d, st) {
  c2d.raw((ctx, c) => {
    const pad = 54, gap = 26;
    const w = (c.width - pad * 2 - gap * 2) / 3;
    const T = 90, B = T + 190;
    for (let i = 0; i < 3; i++) {
      const L = pad + i * (w + gap);
      const m = plotBox(ctx, [L, T, L + w, B], {
        ylo: -1, yhi: 1, joints: [JOINTS[i]],
        ylabel: i === 0 ? 'Activation' : null,
      });
      // the zero line, so the flat part is visibly AT zero
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, m.sy(0)); ctx.lineTo(L + w, m.sy(0)); ctx.stroke();
      plotFn(ctx, m, x => hidden(i, x), H[i], 2.8);
      ctx.fillStyle = H[i]; ctx.font = 'italic 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`h${i + 1}`, (L + L + w) / 2, B - 12);
      ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui';
      ctx.fillText(`joint at x = ${['0', '1/3', '2/3'][i]}`, (L + L + w) / 2, T - 12);
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('each unit:  hᵢ = ReLU(x − jointᵢ)   —   slope 1, joints equally spaced',
                 c.width / 2, B + 66);
    ctx.textAlign = 'left';
  });
}

// ── e–g) the output, built from the three units ───────────────────────────────
function drawOutput(c2d, st, o = {}) {
  const phi = st.phi;
  c2d.raw((ctx, c) => {
    const L = 90, R = c.width - 60, T = 60, B = 300;
    const m = plotBox(ctx, [L, T, R, B], { ylo: -1, yhi: 1, ylabel: 'Output, y' });
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, m.sy(0)); ctx.lineTo(R, m.sy(0)); ctx.stroke();

    // the weighted hidden units, faint — showing what y is made of
    if (o.showParts) {
      for (let i = 0; i < 3; i++) {
        plotFn(ctx, m, x => phi[i + 1] * hidden(i, x), H[i], 1.6, [5, 4]);
      }
    }
    plotFn(ctx, m, x => yOf(phi, x), OUT, 3);

    // joint labels
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('1/3', m.sx(1 / 3), T - 8);
    ctx.fillText('2/3', m.sx(2 / 3), T - 8);

    // the parameter → geometry readout: the heart of the lesson
    if (o.showSlopes) {
      const s = slopesOf(phi);
      const segMid = [1 / 6, 0.5, 5 / 6];
      for (let i = 0; i < 3; i++) {
        const x = segMid[i];
        ctx.fillStyle = OUT; ctx.font = '11px system-ui';
        ctx.fillText(`slope ${s[i].toFixed(1)}`, m.sx(x), m.sy(yOf(phi, x)) - 12);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#666'; ctx.font = '12px system-ui';
      const lines = [
        `β  = ${phi[0].toFixed(2)}   →  y(0), the intercept`,
        `ω₁ = ${phi[1].toFixed(2)}   →  slope of segment 1        = ${s[0].toFixed(2)}`,
        `ω₂ = ${phi[2].toFixed(2)}   →  slope CHANGE at x = 1/3   → ${s[1].toFixed(2)}`,
        `ω₃ = ${phi[3].toFixed(2)}   →  slope CHANGE at x = 2/3   → ${s[2].toFixed(2)}`,
      ];
      lines.forEach((t, i) => ctx.fillText(t, L, B + 62 + i * 20));
    }
    ctx.textAlign = 'left';
  });
}

// ── the bias of this model class ──────────────────────────────────────────────
function drawBias(c2d, st) {
  const joints = jointsFor(st.K);
  const { coef, mse } = biasOf(joints);
  c2d.raw((ctx, c) => {
    const L = 90, R = c.width - 60, T = 60, B = 320;
    const m = plotBox(ctx, [L, T, R, B], { ylo: -1, yhi: 1, joints, ylabel: 'Output, y' });
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, m.sy(0)); ctx.lineTo(R, m.sy(0)); ctx.stroke();

    // the residual — the gap no choice of phi can close
    ctx.strokeStyle = '#f0c9a5'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 60; i++) {
      const x = i / 60;
      ctx.beginPath();
      ctx.moveTo(m.sx(x), m.sy(trueF(x)));
      ctx.lineTo(m.sx(x), m.sy(evalFit(coef, joints, x)));
      ctx.stroke();
    }
    plotFn(ctx, m, trueF, TRUEC, 2.6, [7, 4]);
    plotFn(ctx, m, x => evalFit(coef, joints, x), FIT, 3);

    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = TRUEC; ctx.fillText('true function (unknowable)', L + 12, T + 20);
    ctx.fillStyle = FIT;   ctx.fillText('BEST possible fit for this model class', L + 12, T + 40);

    ctx.textAlign = 'center'; ctx.font = '14px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`${st.K} hidden units  →  ${st.K - 1} interior joint(s)  →  bias (mean squared gap) = ${mse.toFixed(4)}`,
                 (L + R) / 2, B + 62);
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
    ctx.fillText('this gap is BIAS — no amount of data can close it, only more units can',
                 (L + R) / 2, B + 86);
    ctx.textAlign = 'left';
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `sn-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">`;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = fmt(v);
    onChange(v);
  });
}

function phiSliders(st) {
  const names = ['β', 'ω₁', 'ω₂', 'ω₃'];
  names.forEach((n, i) =>
    addSlider(st._controls, n, -6, 6, 0.1, st.phi[i], v => v.toFixed(1), v => { st.phi[i] = v; }));
}

function presetButtons(st) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;';
  ['e', 'f', 'g'].forEach(k => {
    const b = document.createElement('button');
    b.textContent = `example ${k})`;
    b.style.cssText = 'flex:1;padding:7px;font-size:12px;border:1px solid #90a4ae;color:#546e7a;'
      + 'background:#fff;border-radius:6px;cursor:pointer;';
    b.addEventListener('click', () => {
      st.phi = [...PRESETS[k]];
      clearControls(st); phiSliders(st); presetButtons(st);
    });
    row.appendChild(b);
  });
  st._controls.appendChild(row);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'A Simplified Network',
  subject: 'Machine Learning',

  initState() {
    return { phi: [...PRESETS.f], K: 3, _controls: null };
  },

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'ml-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'The network — with most of it frozen',
      description: 'A network with one input and three ReLU hidden units. The trick: the weights and biases between input and hidden layer are held FIXED (the dashed arrows). Only the four output parameters $\\phi = \\{\\beta, \\omega_1, \\omega_2, \\omega_3\\}$ can be learned.',
      equation: 'y = \\beta + \\omega_1 h_1 + \\omega_2 h_2 + \\omega_3 h_3',
      notes: 'Freezing the first layer is what makes this model analysable: the output is LINEAR in the four remaining parameters.\n\nThat is why Prince reaches for it in §8.2 — you can see exactly what the model can and cannot represent, and therefore exactly where its error comes from.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); drawNetwork(c2d, st); },
    },
    {
      title: 'The hidden units are fixed ramps',
      description: 'The frozen weights are chosen so each hidden unit is a ReLU with slope one, and their joints are equally spaced across the interval — at $x = 0$, $x = 1/3$ and $x = 2/3$. Each unit is flat at zero until its joint, then rises at 45°.',
      equation: 'h_i = \\mathrm{ReLU}(x - \\text{joint}_i), \\qquad \\text{joints} = 0,\\; \\tfrac13,\\; \\tfrac23',
      notes: 'These three ramps are the entire vocabulary the model has. It cannot change them — it can only scale them and add them up.\n\nNotice each unit "switches on" at its own joint. To the left of its joint it contributes nothing at all.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); drawHiddenUnits(c2d, st); },
    },
    {
      title: 'Adding them up',
      description: 'Scale each ramp by its weight $\\omega_i$, add the offset $\\beta$, and sum. The result is always a piecewise-linear function with joints at $1/3$ and $2/3$. Drag the sliders, or load the three examples from the figure.',
      equation: 'y = \\beta + \\sum_{i=1}^{3}\\omega_i\\,\\mathrm{ReLU}(x - \\text{joint}_i)',
      notes: 'The dashed coloured lines are the individual weighted ramps $\\omega_i h_i$; the solid line is their sum.\n\nA negative weight flips its ramp downward. The kinks can only ever appear at 1/3 and 2/3 — because that is the only place a new ramp switches on.',
      setup(c2d, st) { clearControls(st); phiSliders(st); presetButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawOutput(c2d, st, { showParts: true }); },
    },
    {
      title: 'What the four parameters actually mean',
      description: 'Each parameter has a clean geometric job. $\\beta$ is simply $y(0)$. $\\omega_1$ is the slope of the first segment. And $\\omega_2$, $\\omega_3$ are not slopes at all — they are the CHANGES in slope at each joint.',
      equation: '\\text{slopes} = \\big(\\omega_1,\\;\\; \\omega_1+\\omega_2,\\;\\; \\omega_1+\\omega_2+\\omega_3\\big)',
      notes: 'This is the key insight. Four parameters, four degrees of freedom: one intercept and three segment slopes.\n\nSo the map from φ to "piecewise-linear functions with joints at 1/3 and 2/3" is a bijection — every such function has exactly one φ, and every φ gives exactly one such function.\n\nThe model spans that family completely. Drag ω₂ and watch only the slope CHANGE at 1/3, leaving segment 1 untouched.',
      setup(c2d, st) { clearControls(st); phiSliders(st); presetButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawOutput(c2d, st, { showSlopes: true }); },
    },
    {
      title: 'And nothing else — this is bias',
      description: 'Now try to represent something smooth. The teal curve is the true function; the orange is the BEST fit this model class can achieve — the optimal $\\phi$, found by least squares. The gap never closes, because the model can only make three straight segments with joints nailed at 1/3 and 2/3.',
      equation: '\\text{bias} = \\min_{\\phi}\\;\\mathbb{E}\\big[(f(x) - y(x,\\phi))^2\\big] \\;>\\; 0',
      notes: 'This is bias in its purest form: error that survives even with perfect optimisation and infinite data. It is a property of the MODEL CLASS, not of the data or the training.\n\nNo amount of extra data closes that gap. Only a richer model can.\n\nDrag the hidden-unit slider: more units mean more joints, a finer piecewise-linear approximation, and the bias shrinks toward zero.',
      setup(c2d, st) {
        clearControls(st);
        addSlider(st._controls, 'hidden units', 3, 16, 1, st.K, v => String(v), v => { st.K = v; });
      },
      update(c2d, st) { c2d.clearPersistent(); drawBias(c2d, st); },
    },
  ],
};
