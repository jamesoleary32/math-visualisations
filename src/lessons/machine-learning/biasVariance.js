// Noise, Bias & Variance — the three sources of test error.
//
// A regression playground: data is drawn from a smooth true function plus
// Gaussian noise, and we fit polynomials of varying capacity. Each source of
// error is isolated visually, then recombined into the U-shaped total.
//
//   total error = noise (irreducible) + bias² + variance

const XMAX    = 2.6;   // x-range of the data
const MAXDEG  = 9;     // highest polynomial capacity
const NSETS   = 14;    // resampled training sets shown on screen
const NTRIALS = 120;    // resampled training sets used for the bias/variance maths
const RIDGE   = 1e-6;  // tiny regulariser so high-degree fits stay solvable

// the true, unknowable function we are trying to recover
function trueF(x) { return 1.4 * Math.sin(1.15 * x); }

// ── Small numerics ────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {                       // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function solve(A, b) {                      // Gaussian elimination, partial pivot
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
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

// least-squares polynomial fit, in normalised u = x/XMAX for conditioning
function polyfit(xs, ys, deg) {
  const m = deg + 1;
  const ATA = Array.from({ length: m }, () => new Array(m).fill(0));
  const ATy = new Array(m).fill(0);
  for (let n = 0; n < xs.length; n++) {
    const u = xs[n] / XMAX;
    const phi = new Array(m);
    phi[0] = 1;
    for (let i = 1; i < m; i++) phi[i] = phi[i - 1] * u;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) ATA[i][j] += phi[i] * phi[j];
      ATy[i] += phi[i] * ys[n];
    }
  }
  for (let i = 0; i < m; i++) ATA[i][i] += RIDGE;
  return solve(ATA, ATy);
}

function polyval(c, x) {
  const u = x / XMAX;
  let s = 0, p = 1;
  for (let i = 0; i < c.length; i++) { s += c[i] * p; p *= u; }
  return s;
}

// Fixed design: the input locations are chosen once and held fixed; only the
// noise is resampled. This is what makes the decomposition clean — the fit is
// linear in y, so E[f-hat] is exactly the noiseless fit, giving a bias that
// falls monotonically with capacity. Resampling the x's too would let variance
// leak into the bias term.
function designXs(N) {
  const rng = mulberry32(20260712);          // fixed: same design every time
  const xs = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1) + 0.35 * (rng() - 0.5) / (N - 1);
    xs.push(Math.max(-XMAX, Math.min(XMAX, -XMAX + 2 * XMAX * t)));
  }
  return xs;
}

function makeDataset(rng, xs, sigma) {
  return { xs, ys: xs.map(x => trueF(x) + sigma * gauss(rng)) };
}

// ── Cached computation ────────────────────────────────────────────────────────
function dsKey(st)  { return `${st.seed}|${st.N}|${st.sigma}`; }

function getDatasets(st) {
  const key = dsKey(st);
  if (st._ds && st._ds.key === key) return st._ds.sets;
  const rng = mulberry32(st.seed * 7919 + 13);
  const xs = designXs(st.N);
  const sets = [];
  for (let i = 0; i < NSETS; i++) sets.push(makeDataset(rng, xs, st.sigma));
  st._ds = { key, sets };
  return sets;
}

function getFits(st) {
  const key = `${dsKey(st)}|${st.degree}`;
  if (st._fits && st._fits.key === key) return st._fits.fits;
  const fits = getDatasets(st).map(d => polyfit(d.xs, d.ys, st.degree));
  st._fits = { key, fits };
  return fits;
}

// bias² and variance across every capacity, averaged over NTRIALS resamples
function getTradeoff(st) {
  const key = dsKey(st);
  if (st._tr && st._tr.key === key) return st._tr.data;

  const rng = mulberry32(st.seed * 104729 + 7);
  const xs = designXs(st.N);
  const trials = [];
  for (let i = 0; i < NTRIALS; i++) trials.push(makeDataset(rng, xs, st.sigma));

  const K = 41, grid = [];
  for (let k = 0; k < K; k++) grid.push(-XMAX + 2 * XMAX * k / (K - 1));

  const data = [];
  for (let deg = 1; deg <= MAXDEG; deg++) {
    const preds = trials.map(d => {
      const c = polyfit(d.xs, d.ys, deg);
      return grid.map(x => polyval(c, x));
    });
    let bias2 = 0, varr = 0;
    for (let k = 0; k < K; k++) {
      let mean = 0;
      for (let j = 0; j < preds.length; j++) mean += preds[j][k];
      mean /= preds.length;
      bias2 += (mean - trueF(grid[k])) ** 2;
      let v = 0;
      for (let j = 0; j < preds.length; j++) v += (preds[j][k] - mean) ** 2;
      varr += v / preds.length;
    }
    bias2 /= K; varr /= K;
    const noise = st.sigma * st.sigma;
    data.push({ deg, bias2, varr, noise, total: noise + bias2 + varr });
  }
  st._tr = { key, data };
  return data;
}

// mean prediction across the on-screen fits (the "average model")
function meanCurve(st, xsGrid) {
  const fits = getFits(st);
  return xsGrid.map(x => fits.reduce((s, c) => s + polyval(c, x), 0) / fits.length);
}

// ── Colours ───────────────────────────────────────────────────────────────────
const TRUE = '#00897b', DATA = '#1565c0', FIT = '#e8710a',
      NOISE = '#9e9e9e', BIAS = '#7b1fa2', VAR = '#e8710a', TOTAL = '#111';

// ── Drawing ───────────────────────────────────────────────────────────────────
function grid(c2d) {
  c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
  c2d.addAxes({ color: '#dcdcdc' });
  c2d.addText('x', XMAX + 0.15, 0.12, { color: '#bbb', size: 12, italic: true });
  c2d.addText('y', 0.12, 2.05, { color: '#bbb', size: 12, italic: true });
}

function curve(c2d, fn, color, width, dash = []) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const x = -XMAX + 2 * XMAX * i / 120;
    const y = fn(x);
    if (y > -2.3 && y < 2.3) pts.push([x, y]);
    else pts.push([x, Math.max(-2.3, Math.min(2.3, y))]);
  }
  c2d.addLine(pts, { color, width, dash });
}

function drawScene(c2d, st, o) {
  grid(c2d);
  const sets = getDatasets(st);
  const d0 = sets[0];

  if (o.trueF) curve(c2d, trueF, TRUE, 2.6, [7, 4]);

  // every resampled fit, faint — this spread IS the variance
  if (o.manyFits) {
    const fits = getFits(st);
    fits.forEach(c => curve(c2d, x => polyval(c, x), '#f3c9a5', 1.4));
  }

  // the average model across resamples — its gap from the truth IS the bias
  if (o.meanFit) {
    const xs = [];
    for (let i = 0; i <= 120; i++) xs.push(-XMAX + 2 * XMAX * i / 120);
    const ms = meanCurve(st, xs);
    c2d.addLine(xs.map((x, i) => [x, Math.max(-2.3, Math.min(2.3, ms[i]))]),
                { color: BIAS, width: 2.8 });
    // shade the bias gap at sample points
    if (o.biasGap) {
      for (let i = 6; i <= 114; i += 12) {
        const x = xs[i];
        c2d.addLine([[x, trueF(x)], [x, ms[i]]], { color: BIAS, width: 1.2, dash: [3, 3] });
      }
    }
  }

  // a single fit on one training set
  if (o.fit) {
    const c = polyfit(d0.xs, d0.ys, st.degree);
    curve(c2d, x => polyval(c, x), FIT, 2.8);
  }

  // residuals from the data to the TRUE function — the irreducible noise
  if (o.residuals) {
    for (let i = 0; i < d0.xs.length; i++) {
      c2d.addLine([[d0.xs[i], trueF(d0.xs[i])], [d0.xs[i], d0.ys[i]]],
                  { color: NOISE, width: 1.2, dash: [3, 3] });
    }
  }

  if (o.data) {
    for (let i = 0; i < d0.xs.length; i++) {
      c2d.addPoint(d0.xs[i], d0.ys[i], { radius: 4.5, color: DATA });
    }
  }
}

// the error-vs-capacity plot (drawn in screen space)
function drawTradeoff(c2d, st) {
  const data = getTradeoff(st);
  const maxY = Math.max(...data.map(d => d.total)) * 1.15 + 0.02;

  c2d.raw((ctx, c) => {
    const L = 70, R = c.width - 50, T = 50, B = c.height - 70;
    const sx = deg => L + (deg - 1) / (MAXDEG - 1) * (R - L);
    const sy = v => B - Math.min(v, maxY) / maxY * (B - T);

    // axes
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('model capacity  (polynomial degree)', (L + R) / 2, B + 40);
    ctx.save(); ctx.translate(L - 46, (T + B) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('expected test error', 0, 0); ctx.restore();
    for (let d = 1; d <= MAXDEG; d++) ctx.fillText(String(d), sx(d), B + 18);

    const series = (key, color, label, width = 2.4) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width;
      data.forEach((d, i) => {
        const px = sx(d.deg), py = sy(d[key]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    // noise floor — flat, irreducible
    ctx.beginPath(); ctx.strokeStyle = NOISE; ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.moveTo(L, sy(data[0].noise)); ctx.lineTo(R, sy(data[0].noise));
    ctx.stroke(); ctx.setLineDash([]);

    series('bias2', BIAS, 'bias²');
    series('varr',  VAR,  'variance');
    series('total', TOTAL, 'total', 3);

    // marker at the current capacity
    const cur = data[st.degree - 1];
    ctx.beginPath(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(sx(cur.deg), T); ctx.lineTo(sx(cur.deg), B); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.fillStyle = TOTAL;
    ctx.arc(sx(cur.deg), sy(cur.total), 5, 0, Math.PI * 2); ctx.fill();

    // best capacity
    const best = data.reduce((a, b) => (b.total < a.total ? b : a));
    ctx.beginPath(); ctx.fillStyle = '#2e7d32';
    ctx.arc(sx(best.deg), sy(best.total), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e7d32'; ctx.font = '11px system-ui';
    ctx.fillText(`sweet spot: degree ${best.deg}`, sx(best.deg), sy(best.total) - 14);

    // legend
    ctx.textAlign = 'left'; ctx.font = '12px system-ui';
    const items = [[TOTAL, 'total error'], [BIAS, 'bias²'], [VAR, 'variance'], [NOISE, 'noise (irreducible)']];
    items.forEach(([col, txt], i) => {
      const y = T + 4 + i * 17;
      ctx.strokeStyle = col; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(R - 150, y); ctx.lineTo(R - 130, y); ctx.stroke();
      ctx.fillStyle = '#777'; ctx.fillText(txt, R - 124, y + 4);
    });

    // readout
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(
      `degree ${cur.deg}:  noise ${cur.noise.toFixed(3)}  +  bias² ${cur.bias2.toFixed(3)}  +  variance ${cur.varr.toFixed(3)}  =  ${cur.total.toFixed(3)}`,
      (L + R) / 2, T - 22);
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `bv-${label.replace(/[^a-z0-9]/gi, '')}`;
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

function addButton(container, text, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = 'padding:8px 12px;font-size:13px;border:1px solid #1565c0;color:#1565c0;'
    + 'background:#fff;border-radius:6px;cursor:pointer;';
  btn.addEventListener('click', onClick);
  container.appendChild(btn);
}

const sNoise = (st) => addSlider(st._controls, 'noise σ', 0, 0.8, 0.05, st.sigma, v => v.toFixed(2), v => st.sigma = v);
const sDeg   = (st) => addSlider(st._controls, 'capacity (degree)', 1, MAXDEG, 1, st.degree, v => String(v), v => st.degree = v);
const sN     = (st) => addSlider(st._controls, 'training points N', 10, 30, 1, st.N, v => String(v), v => st.N = v);
const bReseed = (st) => addButton(st._controls, 'Resample training sets', () => st.seed++);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Noise, Bias & Variance',
  subject: 'Machine Learning',

  initState() {
    return { sigma: 0.35, degree: 3, N: 14, seed: 1, _controls: null };
  },

  init(c2d, state, panelEl) {
    c2d.scale = 58;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'ml-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'Data = signal + noise',
      description: 'The world generates data from some true function $f(x)$ (teal, dashed) that we never get to see. What we observe are samples corrupted by noise: $y = f(x) + \\epsilon$. All we ever have is the blue dots.',
      equation: 'y = f(x) + \\epsilon, \\qquad \\epsilon \\sim \\mathcal{N}(0, \\sigma^2)',
      notes: 'Drag the noise slider — the dots scatter further from the true curve, but the curve itself never moves.\n\nEvery source of test error traces back to one of three things: this noise, the model being too rigid, or the model being too twitchy. The next steps isolate each one.',
      setup(c2d, st) { clearControls(st); sNoise(st); sN(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawScene(c2d, st, { trueF: true, data: true });
      },
    },
    {
      title: 'Noise — the irreducible floor',
      description: 'Suppose you had the perfect model — the true function itself. You would still be wrong, because the data is noisy. The dashed grey stubs are the residuals no model can ever explain away.',
      equation: '\\mathbb{E}\\big[(y - f(x))^2\\big] = \\sigma^2',
      notes: 'This is the noise floor: error $\\sigma^2$ that no amount of data, capacity, or cleverness can remove.\n\nIt matters because it sets the target. If you ever see test error below the noise floor, you are measuring something wrong (usually a leak between train and test).',
      setup(c2d, st) { clearControls(st); sNoise(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawScene(c2d, st, { trueF: true, data: true, residuals: true });
      },
    },
    {
      title: 'Bias — a model too simple',
      description: 'Now fit a polynomial (orange). Set the capacity to 1 and it is a straight line: it cannot bend to meet $f(x)$ no matter what data you feed it. That systematic, built-in wrongness is the bias.',
      equation: '\\text{bias}(x) = \\mathbb{E}[\\hat f(x)] - f(x)',
      notes: 'Slide the capacity from 1 upward and watch the orange curve become able to track the teal one — bias falls as capacity rises.\n\nBias is an error of the model class, not of the data. A straight line fitted to a curve is wrong in the same direction every time — more data will not save it. This is underfitting.',
      setup(c2d, st) { clearControls(st); st.degree = 1; sDeg(st); sNoise(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawScene(c2d, st, { trueF: true, data: true, fit: true });
      },
    },
    {
      title: 'Variance — a model too twitchy',
      description: 'Here are 14 training sets from the same world — the same input locations, each with a fresh draw of noise — fitted separately (faint orange). At low capacity the fits agree. Crank the capacity to 9 and they fly apart — the model is chasing the noise, and every training set sends it somewhere different.',
      equation: '\\text{variance}(x) = \\mathbb{E}\\Big[\\big(\\hat f(x) - \\mathbb{E}[\\hat f(x)]\\big)^2\\Big]',
      notes: 'The spread of the faint curves *is* the variance. Press "Resample" to draw fresh training sets.\n\nVariance is sensitivity to the particular sample you happened to get. A high-capacity model can interpolate the noise — fitting the training data beautifully while generalising terribly. This is overfitting.',
      setup(c2d, st) { clearControls(st); st.degree = 9; sDeg(st); sNoise(st); bReseed(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawScene(c2d, st, { trueF: true, manyFits: true, data: true });
      },
    },
    {
      title: 'Separating the two',
      description: 'Average all those fits and you get the mean model (purple). Two distinct things are now visible: the gap between the purple and the teal is the bias; the scatter of the faint orange curves around the purple is the variance.',
      equation: '\\mathbb{E}\\big[(\\hat f - f)^2\\big] = \\underbrace{(\\mathbb{E}[\\hat f] - f)^2}_{\\text{bias}^2} + \\underbrace{\\mathbb{E}\\big[(\\hat f - \\mathbb{E}[\\hat f])^2\\big]}_{\\text{variance}}',
      notes: 'At degree 1: purple sits far from teal (high bias) but the faint curves hug it tightly (low variance).\n\nAt degree 9: purple tracks teal closely (low bias) but the faint curves scatter wildly (high variance).\n\nSlide the capacity back and forth and watch one shrink exactly as the other grows. That trade is the whole point.',
      setup(c2d, st) { clearControls(st); st.degree = 3; sDeg(st); sNoise(st); bReseed(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawScene(c2d, st, { trueF: true, manyFits: true, meanFit: true, biasGap: true, data: true });
      },
    },
    {
      title: 'The trade-off',
      description: 'Plot all three against capacity. Bias² falls, variance rises, and the noise floor sits flat beneath everything. Their sum — the total expected test error — is U-shaped, and its minimum is the capacity you actually want.',
      equation: '\\mathbb{E}[\\text{test error}] = \\underbrace{\\sigma^2}_{\\text{noise}} + \\underbrace{\\text{bias}^2}_{\\text{too simple}} + \\underbrace{\\text{variance}}_{\\text{too twitchy}}',
      notes: 'Drag capacity and watch the black marker slide along the U; the green dot marks the sweet spot.\n\nRaise N and the variance curve drops (more data tames a flexible model, so the sweet spot moves right). Raise σ and the whole U lifts by exactly σ² — the floor you can never beat.\n\nModern caveat: very overparameterised networks show "double descent" — push capacity far past interpolation and test error falls *again*, breaking this classical U. Prince §8 covers it.',
      setup(c2d, st) { clearControls(st); sDeg(st); sNoise(st); sN(st); },
      update(c2d, st) {
        c2d.clearPersistent();
        drawTradeoff(c2d, st);
      },
    },
  ],
};
