// Double Descent — why more capacity keeps helping past the interpolation threshold.
//
// Everything plotted here is COMPUTED, not illustrated. A fixed noisy dataset, a
// frozen layer of random ReLU features (the same "frozen hidden layer" idea as the
// Simplified Network lesson), and only the output weights are learned. Sweeping the
// capacity gives, for this dataset:
//
//     m= 8   train 7.2e-3   test 0.039   ||w||  21    classical sweet spot
//     m=18   train 2.2e-20  test 0.390   ||w|| 251    interpolation threshold
//     m=80   train 1.0e-24  test 0.041   ||w||  14    still interpolating, but smooth
//
// The mechanism is the weight norm: at the threshold there is essentially ONE way to
// thread the points and it is violent. With more capacity there are infinitely many,
// and the minimum-norm one — the one gradient descent implicitly finds — is smooth.

const N = 15;             // training points
const SIG = 0.18;         // noise
const SEED = 21;
const MAXM = 80;          // largest capacity
const trueF = x => Math.sin(2 * Math.PI * x);
const relu = v => Math.max(0, v);

// ── RNG ───────────────────────────────────────────────────────────────────────
function mul32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = r => {
  let u = 0, v = 0;
  while (!u) u = r(); while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// ── Linear algebra: symmetric eigendecomposition → pseudo-inverse ─────────────
// A pseudo-inverse (rather than a ridge) is essential: a ridge would damp exactly
// the ill-conditioning at the threshold that CAUSES the wild interpolant.
function jacobi(Sin) {
  const n = Sin.length;
  const S = Sin.map(r => [...r]);
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 40; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += S[i][j] * S[i][j];
    if (Math.sqrt(off) < 1e-14) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(S[p][q]) < 1e-18) continue;
      const th = (S[q][q] - S[p][p]) / (2 * S[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const a = S[k][p], b = S[k][q]; S[k][p] = c * a - s * b; S[k][q] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = S[p][k], b = S[q][k]; S[p][k] = c * a - s * b; S[q][k] = s * a + c * b; }
      for (let k = 0; k < n; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
  }
  return { val: S.map((r, i) => r[i]), vec: V };
}

function pinvApply(S, b, rel = 1e-10) {
  const { val, vec } = jacobi(S);
  const n = b.length;
  const mx = Math.max(...val.map(Math.abs));
  const tol = rel * mx;
  const x = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    if (Math.abs(val[k]) <= tol) continue;          // genuinely null direction
    let ub = 0;
    for (let i = 0; i < n; i++) ub += vec[i][k] * b[i];
    const c = ub / val[k];
    for (let i = 0; i < n; i++) x[i] += c * vec[i][k];
  }
  return x;
}

// ── The model: frozen random ReLU features, learned output weights ────────────
const feats = (x, F) => [1, ...F.map(([a, b]) => relu(a * x + b))];

// One nested pool: capacity m uses the first m-1 features, so raising capacity
// ADDS units rather than redrawing them.
const POOL = (() => {
  const r = mul32(SEED);
  return Array.from({ length: MAXM }, () => {
    const c = r();                       // kink somewhere in [0,1] — no dead units
    const s = r() < 0.5 ? -1 : 1;
    return [s, -s * c];
  });
})();

const DATA = (() => {
  const r = mul32(SEED * 31 + 5);
  const xs = Array.from({ length: N }, (_, i) => i / (N - 1));
  const ys = xs.map(x => trueF(x) + SIG * gauss(r));
  return { xs, ys };
})();

function fit(m) {
  const F = POOL.slice(0, m - 1);
  const { xs, ys } = DATA;
  const A = xs.map(x => feats(x, F));
  let w;
  if (m < N) {                                   // overdetermined: least squares
    const ATA = Array.from({ length: m }, () => new Array(m).fill(0));
    const ATy = new Array(m).fill(0);
    for (let n = 0; n < N; n++) {
      const p = A[n];
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) ATA[i][j] += p[i] * p[j];
        ATy[i] += p[i] * ys[n];
      }
    }
    w = pinvApply(ATA, ATy);
  } else {                                       // MINIMUM-NORM interpolating solution
    const AAT = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += A[i][k] * A[j][k];
      AAT[i][j] = s;
    }
    const al = pinvApply(AAT, ys);
    w = new Array(m).fill(0);
    for (let k = 0; k < m; k++) {
      let s = 0;
      for (let i = 0; i < N; i++) s += A[i][k] * al[i];
      w[k] = s;
    }
  }
  return { w, F };
}

const predict = (w, F, x) => feats(x, F).reduce((s, v, i) => s + v * w[i], 0);

const CACHE = new Map();
function stats(m) {
  if (CACHE.has(m)) return CACHE.get(m);
  const { w, F } = fit(m);
  const { xs, ys } = DATA;
  const train = xs.reduce((s, x, i) => s + (predict(w, F, x) - ys[i]) ** 2, 0) / N;
  let test = 0;
  const K = 200;
  for (let k = 0; k <= K; k++) {
    const x = k / K;
    test += (predict(w, F, x) - trueF(x)) ** 2;
  }
  test /= K + 1;
  const norm = Math.sqrt(w.reduce((s, v) => s + v * v, 0));
  const out = { m, w, F, train, test, norm };
  CACHE.set(m, out);
  return out;
}

// the capacity at which training error first hits zero
const THRESHOLD = (() => {
  for (let m = 2; m <= MAXM; m++) if (stats(m).train < 1e-8) return m;
  return MAXM;
})();

let SWEEP = null;                       // computed lazily (~180ms for all capacities)
function sweep() {
  if (SWEEP) return SWEEP;
  SWEEP = [];
  for (let m = 2; m <= MAXM; m++) SWEEP.push(stats(m));
  return SWEEP;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const TRUEC = '#00897b', DATAC = '#1565c0', FITC = '#e8710a',
      NORMC = '#7b1fa2', TRAINC = '#2e7d32', TESTC = '#c62828';

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawFit(c2d, st) {
  const s = stats(st.m);
  c2d.raw((ctx, c) => {
    const L = 80, R = c.width - 60, T = 60, B = 330;
    const sx = x => L + x * (R - L);
    const sy = y => (T + B) / 2 - (y / 2.2) * (B - T) / 2;      // y in [-2.2, 2.2]

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.strokeRect(L, T, R - L, B - T);
    ctx.strokeStyle = '#f2f2f2';
    ctx.beginPath(); ctx.moveTo(L, sy(0)); ctx.lineTo(R, sy(0)); ctx.stroke();

    // true function
    ctx.beginPath(); ctx.strokeStyle = TRUEC; ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 4]);
    for (let i = 0; i <= 300; i++) {
      const x = i / 300, py = sy(trueF(x));
      i === 0 ? ctx.moveTo(sx(x), py) : ctx.lineTo(sx(x), py);
    }
    ctx.stroke(); ctx.setLineDash([]);

    // the fitted function — clipped to the box so a wild fit doesn't paint over everything
    ctx.save();
    ctx.beginPath(); ctx.rect(L, T, R - L, B - T); ctx.clip();
    ctx.beginPath(); ctx.strokeStyle = FITC; ctx.lineWidth = 2.8;
    for (let i = 0; i <= 700; i++) {
      const x = i / 700, py = sy(predict(s.w, s.F, x));
      i === 0 ? ctx.moveTo(sx(x), py) : ctx.lineTo(sx(x), py);
    }
    ctx.stroke();
    ctx.restore();

    // training data
    DATA.xs.forEach((x, i) => {
      ctx.beginPath(); ctx.fillStyle = DATAC;
      ctx.arc(sx(x), sy(DATA.ys[i]), 5, 0, Math.PI * 2); ctx.fill();
    });

    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = TRUEC; ctx.fillText('true function', L + 10, T + 20);
    ctx.fillStyle = DATAC; ctx.fillText(`${N} noisy training points`, L + 10, T + 38);
    ctx.fillStyle = FITC;  ctx.fillText('fitted model', L + 10, T + 56);

    // readouts — the three numbers that tell the whole story
    const interp = s.train < 1e-8;
    ctx.textAlign = 'center'; ctx.font = '13px system-ui';
    ctx.fillStyle = '#555';
    ctx.fillText(`capacity: ${s.m} parameters      (${N} training points)`, (L + R) / 2, B + 40);

    ctx.font = '14px system-ui';
    ctx.fillStyle = TRAINC;
    ctx.fillText(`training error: ${interp ? '0  (interpolates every point)' : s.train.toFixed(4)}`,
                 (L + R) / 2, B + 70);
    ctx.fillStyle = TESTC;
    ctx.fillText(`test error: ${s.test.toFixed(3)}`, (L + R) / 2, B + 96);
    ctx.fillStyle = NORMC;
    ctx.fillText(`weight norm ‖w‖: ${s.norm.toFixed(0)}`, (L + R) / 2, B + 122);

    if (s.m === THRESHOLD) {
      ctx.fillStyle = '#c62828'; ctx.font = '12px system-ui';
      ctx.fillText('◀ interpolation threshold', (L + R) / 2, B + 148);
    }
    ctx.textAlign = 'left';
  });
}

// the three REAL curves vs capacity
function drawCurves(c2d, st) {
  const data = sweep();
  c2d.raw((ctx, c) => {
    const L = 80, R = c.width - 70, T = 60, B = c.height - 130;
    const sx = m => L + (m - 2) / (MAXM - 2) * (R - L);

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();

    // interpolation threshold
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e0a0a0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx(THRESHOLD), T); ctx.lineTo(sx(THRESHOLD), B); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c62828'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('interpolation', sx(THRESHOLD), T - 22);
    ctx.fillText('threshold', sx(THRESHOLD), T - 10);

    // log scale — test error spans 0.04 to 0.4, norms span 14 to 251
    const lo = 0.02, hi = 0.6;
    const syT = v => B - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (B - T);
    const maxN = Math.max(...data.map(d => d.norm));
    const syN = v => B - v / maxN * (B - T);

    const line = (fn, color, w, dash = []) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
      data.forEach((d, i) => {
        const px = sx(d.m), py = fn(d);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke(); ctx.setLineDash([]);
    };

    line(d => syN(d.norm), NORMC, 2, [5, 4]);                        // ‖w‖
    line(d => syT(Math.max(d.train, lo)), TRAINC, 2.4);              // train
    line(d => syT(d.test), TESTC, 3);                                // test

    // marker at the current capacity
    const cur = stats(st.m);
    ctx.beginPath(); ctx.fillStyle = TESTC;
    ctx.arc(sx(cur.m), syT(cur.test), 5, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = 'left'; ctx.font = '12px system-ui';
    ctx.fillStyle = TESTC;  ctx.fillText('test error  (log scale)', L + 12, T + 18);
    ctx.fillStyle = TRAINC; ctx.fillText('training error → 0 and stays there', L + 12, T + 36);
    ctx.fillStyle = NORMC;  ctx.fillText('‖w‖  weight norm — the mechanism', L + 12, T + 54);

    ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.font = '12px system-ui';
    ctx.fillText('capacity (number of parameters)', (L + R) / 2, B + 34);

    const t = data.find(d => d.m === THRESHOLD), last = data[data.length - 1];
    const best = data.filter(d => d.m < THRESHOLD).reduce((a, b) => (b.test < a.test ? b : a));
    ctx.fillStyle = '#666'; ctx.font = '12px system-ui';
    ctx.fillText(`classical best (m=${best.m}): test ${best.test.toFixed(3)}   →   `
      + `threshold (m=${t.m}): test ${t.test.toFixed(3)}, ‖w‖ ${t.norm.toFixed(0)}   →   `
      + `m=${last.m}: test ${last.test.toFixed(3)}, ‖w‖ ${last.norm.toFixed(0)}`,
      (L + R) / 2, B + 62);
    ctx.fillStyle = '#aaa';
    ctx.fillText('every number here is computed from this dataset — nothing is illustrative',
      (L + R) / 2, B + 88);
    ctx.textAlign = 'left';
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function capacitySlider(st) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>capacity (parameters)</span>
      <span id="dd-v" style="font-family:Georgia,serif;font-style:italic">${st.m}</span>
    </div>
    <input type="range" id="dd-m" min="2" max="${MAXM}" step="1" value="${st.m}"
      style="width:100%;accent-color:#1565c0">
    <div style="font-size:11px;color:#bbb;font-family:system-ui">
      ${N} training points · threshold at ${THRESHOLD}
    </div>`;
  st._controls.appendChild(wrap);
  const input = wrap.querySelector('#dd-m');
  const val = wrap.querySelector('#dd-v');
  input.addEventListener('input', () => { st.m = parseInt(input.value, 10); val.textContent = st.m; });
}

function jumpButtons(st) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;';
  [['sweet spot', 8], ['threshold', THRESHOLD], ['huge', MAXM]].forEach(([label, m]) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1;padding:7px;font-size:12px;border:1px solid #90a4ae;color:#546e7a;'
      + 'background:#fff;border-radius:6px;cursor:pointer;';
    b.addEventListener('click', () => { st.m = m; clearControls(st); capacitySlider(st); jumpButtons(st); });
    row.appendChild(b);
  });
  st._controls.appendChild(row);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Double Descent',
  subject: 'Machine Learning',

  initState() { return { m: 8, _controls: null }; },

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
      title: 'The classical picture',
      description: 'Fifteen noisy points from a smooth function. The model is a frozen layer of random ReLU units — only the output weights are learned, so capacity just means "how many units". At low capacity it underfits; raise it and the fit improves.',
      equation: 'y = \\sum_{i} w_i\\,\\mathrm{ReLU}(a_i x + b_i) + w_0, \\qquad (a_i, b_i)\\ \\text{frozen}',
      notes: 'Drag capacity from 2 upward. Around 8 parameters the model tracks the true function nicely — this is the sweet spot the bias–variance lesson predicts.\n\nThe classical story says: go past this and you are overfitting, so stop here. Hold that thought.',
      setup(c2d, st) { st.m = 8; clearControls(st); capacitySlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawFit(c2d, st); },
    },
    {
      title: 'The interpolation threshold',
      description: `Keep raising capacity. At ${THRESHOLD} parameters something abrupt happens: the model has just enough freedom to pass through every single training point. The training error becomes exactly zero.`,
      equation: '\\text{parameters} \\approx \\text{training points} \\;\\Longrightarrow\\; \\text{training error} = 0',
      notes: 'This is the interpolation threshold — roughly where the number of parameters matches the number of training points.\n\nNotice the training error does not just get small. It becomes 0 to machine precision: the curve is forced through all 15 dots exactly.',
      setup(c2d, st) { st.m = THRESHOLD; clearControls(st); capacitySlider(st); jumpButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawFit(c2d, st); },
    },
    {
      title: 'Zero training error, terrible model',
      description: 'Look at what that perfect fit actually costs. To thread every noisy point the curve has to lash violently between them. Training error is zero and the model is useless — test error is at its worst, and the weight norm has exploded.',
      equation: '\\text{train} = 0, \\quad \\text{test} = 0.390, \\quad \\lVert w \\rVert = 251',
      notes: 'This is the classical nightmare, and it is exactly why the U-shaped curve says "stop before here".\n\nAt this capacity there is essentially only ONE way to thread the points, and it is a violent one. The huge weight norm is the symptom: enormous coefficients cancelling each other between the data points.',
      setup(c2d, st) { st.m = THRESHOLD; clearControls(st); capacitySlider(st); jumpButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawFit(c2d, st); },
    },
    {
      title: 'Now keep going — the surprise',
      description: 'Classical wisdom says more capacity can only make this worse. Push it to 80 parameters — five times the number of data points. The model STILL passes through every point exactly (training error is still zero) — but the curve is now smooth, and the test error has collapsed back down.',
      equation: '\\text{train} = 0 \\;\\text{(still)}, \\quad \\text{test} : 0.390 \\rightarrow 0.041, \\quad \\lVert w \\rVert : 251 \\rightarrow 14',
      notes: 'Read that again: same data, same zero training error, wildly different function.\n\nThe model is now hugely overparameterised — and it is BETTER. This is double descent, and it is why enormous neural networks generalise at all, despite having far more parameters than training examples.\n\nDrag the slider slowly from the threshold up to 80 and watch the thrashing smooth itself out.',
      setup(c2d, st) { st.m = MAXM; clearControls(st); capacitySlider(st); jumpButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawFit(c2d, st); },
    },
    {
      title: 'Why: the minimum-norm solution',
      description: 'Past the threshold there are INFINITELY many settings of the weights that fit the data perfectly. So which one do we get? The one with the smallest weight norm — that is what least squares (and, implicitly, gradient descent) converges to.',
      equation: '\\min_{w} \\lVert w \\rVert \\quad \\text{subject to} \\quad y_i = f(x_i; w)\\ \\ \\forall i',
      notes: 'And a small weight norm means a smooth function. So the extra capacity is not being spent on wiggling harder — it is buying more ways to thread the points, letting the optimiser pick a gentle one.\n\nThat is the whole trick: more parameters widen the set of perfect fits, and the implicit bias toward small norms then selects a smooth member of that set.\n\n‖w‖ is the number to watch — it peaks at the threshold and collapses afterwards.',
      setup(c2d, st) { clearControls(st); capacitySlider(st); jumpButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawFit(c2d, st); },
    },
    {
      title: 'The whole curve',
      description: 'All three quantities against capacity. Training error falls to zero at the threshold and stays pinned there. Test error traces the classical U, spikes at the threshold, then descends a second time. And the weight norm — the mechanism — peaks exactly where the damage is worst.',
      equation: '\\text{test error: descend} \\;\\rightarrow\\; \\text{spike} \\;\\rightarrow\\; \\text{descend again}',
      notes: 'Every point on these curves is computed from this dataset — nothing is drawn for illustration.\n\nAn honest caveat: this is a 15-point toy. At this scale the phenomenon is noisy and heavy-tailed — a different noise draw shifts the spike around. The clean, reliable double-descent curve you see in the literature (Belkin et al. 2019; Prince §8.4) emerges from averaging over many runs at much larger scale.\n\nWhat IS robust, and what you should take away, is the mechanism: past the threshold, training error stays at zero while ‖w‖ collapses and the function smooths out.',
      setup(c2d, st) { clearControls(st); capacitySlider(st); jumpButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); drawCurves(c2d, st); },
    },
  ],
};
