// Inductive Bias — the assumptions that make generalisation possible at all.
//
// Seven noiseless points. Infinitely many functions pass through them exactly, so
// the DATA cannot tell you which to pick. Whatever picks for you — the model class,
// the optimiser, the regulariser, the architecture — is the inductive bias.
//
// Everything here is computed. Verified numbers (test MSE against the truth, while
// every model has exactly zero training error):
//
//                        smooth truth   step truth
//   polynomial (deg 6)      0.00004        0.10704     <- best, then nearly worst
//   smooth (min-norm)       0.00123        0.03080
//   piecewise linear        0.00305        0.02882     <- best on the step
//   nearest neighbour       0.02889        0.04668
//
// The polynomial's smoothness assumption is superb when the world is smooth and
// catastrophic when it is not. There is no universally good bias.

const K = 7;
const XS = Array.from({ length: K }, (_, i) => i / (K - 1));

const TRUTHS = {
  smooth: { name: 'smooth (a sine)', f: x => 0.8 * Math.sin(2 * Math.PI * x) },
  step:   { name: 'a step',          f: x => (x < 0.45 ? -0.6 : 0.6) },
};

// sin(6πx) is EXACTLY zero at every sample point x = i/6, so adding any multiple of
// it leaves the model interpolating — a constructive family of infinitely many fits.
const NULLFN = x => Math.sin(6 * Math.PI * x);

// ── Linear algebra ────────────────────────────────────────────────────────────
function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-13) continue;
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = Math.abs(M[r][r]) < 1e-13 ? 0 : s / M[r][r];
  }
  return x;
}

// minimum-norm interpolant in a given feature basis (the optimiser's implicit choice)
function minNorm(ys, phi, m) {
  const A = XS.map(x => phi(x, m));
  const G = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += A[i][k] * A[j][k];
    G[i][j] = s;
  }
  const al = solve(G, [...ys]);
  const W = new Array(m).fill(0);
  for (let k = 0; k < m; k++) {
    let w = 0;
    for (let i = 0; i < K; i++) w += A[i][k] * al[i];
    W[k] = w;
  }
  return x => {
    const p = phi(x, m);
    let s = 0;
    for (let k = 0; k < m; k++) s += W[k] * p[k];
    return s;
  };
}

const relu = v => Math.max(0, v);
const phiRamps = (x, m) => [1, ...Array.from({ length: m - 1 }, (_, i) => relu(x - i / (m - 1)))];

// ── The five interpolants — every one passes through all seven points ─────────
function buildModels(ys) {
  const smooth = minNorm(ys, phiRamps, 60);
  return {
    nearest: {
      label: 'nearest neighbour', color: '#9e9e9e',
      bias: 'assumes the answer is locally constant',
      f: x => {
        let bi = 0, bd = Infinity;
        XS.forEach((xi, i) => { const d = Math.abs(x - xi); if (d < bd) { bd = d; bi = i; } });
        return ys[bi];
      },
    },
    pwlin: {
      label: 'piecewise linear', color: '#1565c0',
      bias: 'assumes the answer moves linearly between points',
      f: x => {
        for (let i = 0; i < K - 1; i++) {
          if (x >= XS[i] && x <= XS[i + 1]) {
            const t = (x - XS[i]) / (XS[i + 1] - XS[i]);
            return ys[i] * (1 - t) + ys[i + 1] * t;
          }
        }
        return ys[K - 1];
      },
    },
    poly: {
      label: 'polynomial (deg 6)', color: '#e8710a',
      bias: 'assumes the answer is a smooth, low-degree polynomial',
      f: x => {
        let s = 0;
        for (let i = 0; i < K; i++) {
          let L = 1;
          for (let j = 0; j < K; j++) if (j !== i) L *= (x - XS[j]) / (XS[i] - XS[j]);
          s += ys[i] * L;
        }
        return s;
      },
    },
    smooth: {
      label: 'smooth (min-norm)', color: '#2e7d32',
      bias: 'assumes small weights — what gradient descent implicitly prefers',
      f: smooth,
    },
    wiggly: {
      label: 'wiggly', color: '#7b1fa2',
      bias: 'assumes nothing against high-frequency wobble',
      f: x => smooth(x) + 0.55 * NULLFN(x),
    },
  };
}

const testMSE = (f, truth) => {
  let e = 0;
  const C = 400;
  for (let k = 0; k <= C; k++) { const x = k / C; e += (f(x) - truth(x)) ** 2; }
  return e / (C + 1);
};

// ── Drawing ───────────────────────────────────────────────────────────────────
const TRUEC = '#00897b', PTC = '#111';

function plot(c2d, st, o) {
  const truth = TRUTHS[st.truth].f;
  const ys = XS.map(truth);
  const M = buildModels(ys);

  c2d.raw((ctx, c) => {
    const L = 80, R = c.width - 60, T = 60, B = 340;
    const sx = x => L + x * (R - L);
    const sy = y => (T + B) / 2 - (y / 1.5) * (B - T) / 2;

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.strokeRect(L, T, R - L, B - T);
    ctx.strokeStyle = '#f2f2f2';
    ctx.beginPath(); ctx.moveTo(L, sy(0)); ctx.lineTo(R, sy(0)); ctx.stroke();

    const curve = (f, color, w, dash = []) => {
      ctx.save();
      ctx.beginPath(); ctx.rect(L, T, R - L, B - T); ctx.clip();
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash);
      for (let i = 0; i <= 600; i++) {
        const x = i / 600, py = sy(f(x));
        i === 0 ? ctx.moveTo(sx(x), py) : ctx.lineTo(sx(x), py);
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    };

    // the truth — only revealed once we start asking which bias was RIGHT
    if (o.truth) curve(truth, TRUEC, 2.6, [7, 4]);

    // the family f(x) + A·sin(6πx): every member interpolates, for any A
    if (o.family) {
      const base = M.smooth.f;
      [-1, -0.6, -0.3, 0, 0.3, 0.6, 1].forEach(a => {
        const on = Math.abs(a - st.A) < 0.001;
        curve(x => base(x) + a * NULLFN(x), on ? '#7b1fa2' : '#e5d5ef', on ? 3 : 1.6);
      });
      curve(x => base(x) + st.A * NULLFN(x), '#7b1fa2', 3);
    }

    // one model, or all of them
    if (o.all) Object.values(M).forEach(m => curve(m.f, m.color, 2.2));
    else if (o.model) curve(M[st.model].f, M[st.model].color, 3);

    // the data — every curve above goes through these
    XS.forEach((x, i) => {
      ctx.beginPath(); ctx.fillStyle = PTC;
      ctx.arc(sx(x), sy(ys[i]), 5.5, 0, Math.PI * 2); ctx.fill();
    });

    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = PTC; ctx.fillText(`${K} data points (noiseless)`, L + 10, T + 20);
    if (o.truth) { ctx.fillStyle = TRUEC; ctx.fillText(`the truth: ${TRUTHS[st.truth].name}`, L + 10, T + 38); }

    // legend / errors
    let y = B + 34;
    if (o.all || o.errors) {
      const rows = Object.entries(M).map(([k, m]) => ({ k, m, err: testMSE(m.f, truth) }));
      rows.sort((a, b) => a.err - b.err);
      rows.forEach(({ k, m, err }, i) => {
        const sel = !o.all && st.model === k;
        ctx.fillStyle = m.color;
        ctx.fillRect(L + 10, y - 9, 18, 3);
        ctx.fillStyle = sel ? '#111' : '#777';
        ctx.font = `${sel ? 'bold ' : ''}12px system-ui`;
        ctx.fillText(m.label, L + 36, y);
        if (o.errors) {
          ctx.fillStyle = i === 0 ? '#2e7d32' : '#999';
          ctx.fillText(`test error ${err.toFixed(5)}${i === 0 ? '   ← best' : ''}`, L + 190, y);
        }
        ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui';
        ctx.fillText('training error 0', L + 340, y);
        y += 20;
      });
    } else if (o.model) {
      const m = M[st.model];
      ctx.fillStyle = m.color; ctx.font = 'bold 13px system-ui';
      ctx.fillText(m.label, L + 10, y);
      ctx.fillStyle = '#888'; ctx.font = '12px system-ui';
      ctx.fillText(m.bias, L + 10, y + 20);
      ctx.fillStyle = '#bbb';
      ctx.fillText('training error: 0 — it passes through every point', L + 10, y + 40);
    }
    ctx.textAlign = 'left';
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function slider(st, label, min, max, step, val, fmt, on) {
  const id = 'ib-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(val)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"
      style="width:100%;accent-color:#7b1fa2">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); on(x); });
}

function modelButtons(st, rebuild) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;';
  const M = buildModels(XS.map(TRUTHS[st.truth].f));
  Object.entries(M).forEach(([k, m]) => {
    const b = document.createElement('button');
    b.textContent = m.label;
    const on = st.model === k;
    b.style.cssText = `padding:7px;font-size:11px;border:1px solid ${m.color};`
      + `color:${on ? '#fff' : m.color};background:${on ? m.color : '#fff'};`
      + 'border-radius:6px;cursor:pointer;';
    b.addEventListener('click', () => { st.model = k; rebuild(st); });
    grid.appendChild(b);
  });
  st._controls.appendChild(grid);
}

function truthToggle(st, rebuild) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;';
  Object.entries(TRUTHS).forEach(([k, t]) => {
    const b = document.createElement('button');
    b.textContent = `truth: ${t.name}`;
    const on = st.truth === k;
    b.style.cssText = `flex:1;padding:7px;font-size:11px;border:1px solid #00897b;`
      + `color:${on ? '#fff' : '#00897b'};background:${on ? '#00897b' : '#fff'};`
      + 'border-radius:6px;cursor:pointer;';
    b.addEventListener('click', () => { st.truth = k; rebuild(st); });
    row.appendChild(b);
  });
  st._controls.appendChild(row);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Inductive Bias',
  subject: 'Machine Learning',

  initState() { return { A: 0.55, model: 'poly', truth: 'smooth', _controls: null }; },

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
      title: 'The data does not determine the answer',
      description: 'Seven points, no noise. How many functions pass exactly through all of them? Infinitely many. Here is a whole family: take any fit and add $A\\sin(6\\pi x)$ — that wobble is exactly zero at every data point, so the result still fits perfectly, for any $A$ you like.',
      equation: 'f(x) + A\\sin(6\\pi x), \\qquad \\sin(6\\pi x_i) = 0 \\ \\ \\text{for every data point } x_i',
      notes: 'Drag A. Every curve you sweep through has EXACTLY zero training error — they all thread all seven dots.\n\nThe data is completely silent about which one is right. It says nothing whatsoever about what happens between the points.\n\nThis is not a quirk of this example. Any finite dataset is consistent with infinitely many functions.',
      setup(c2d, st) { clearControls(st); slider(st, 'A  (wobble amplitude)', -1, 1, 0.01, st.A, v => v.toFixed(2), v => st.A = v); },
      update(c2d, st) { c2d.clearPersistent(); plot(c2d, st, { family: true }); },
    },
    {
      title: 'So you must assume something',
      description: 'If the data cannot choose, something else must. To generalise at all you have to prefer some functions over others BEFORE seeing the data. That preference is the inductive bias — and without one, learning from finite data is impossible.',
      equation: '\\text{data} + \\text{inductive bias} \\;\\Longrightarrow\\; \\text{a single answer}',
      notes: 'These four models all fit the seven points perfectly, yet disagree wildly in between. Each embodies a different assumption:\n\n• nearest neighbour — "the answer is locally constant"\n• piecewise linear — "it moves linearly between points"\n• polynomial — "it is smooth and low-degree"\n• min-norm — "the weights should be small" (what gradient descent quietly prefers)\n\nNone of these is read off the data. Every one is an assumption you brought with you.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); plot(c2d, st, { all: true }); },
    },
    {
      title: 'Where the bias actually comes from',
      description: 'It is rarely a conscious choice. Bias enters through the model class (what is even representable), the optimiser (which of the many perfect fits it lands on), explicit regularisation, and the architecture itself.',
      equation: '\\text{bias} \\;=\\; \\text{model class} \\;+\\; \\text{optimiser} \\;+\\; \\text{regulariser} \\;+\\; \\text{architecture}',
      notes: 'Model class — the Simplified Network could only make 3-segment piecewise-linear functions. Everything else was unreachable by construction.\n\nOptimiser — past the interpolation threshold there were infinitely many perfect fits, and gradient descent implicitly took the minimum-norm one. That is why Double Descent works. Nobody chose it explicitly.\n\nArchitecture — a convolutional layer assumes that a cat is still a cat when it moves left. That assumption is baked into the wiring, not learned.\n\nClick through the models and read what each one is assuming.',
      setup(c2d, st) {
        const rebuild = s => { clearControls(s); modelButtons(s, rebuild); };
        rebuild(st);
      },
      update(c2d, st) { c2d.clearPersistent(); plot(c2d, st, { model: true }); },
    },
    {
      title: 'A good bias is one that matches the world',
      description: 'Now reveal the truth: it was a smooth sine. Suddenly the models can be ranked — and the smooth assumptions win handsomely. The polynomial is nearly perfect; nearest neighbour, which assumed flatness, is 750 times worse.',
      equation: '\\text{poly } 0.00004 \\;<\\; \\text{min-norm } 0.0012 \\;<\\; \\text{p/w linear } 0.0031 \\;<\\; \\text{nearest } 0.029',
      notes: 'Every one of these still has zero training error. They are indistinguishable on the data. They differ only in their assumptions — and the assumptions that happened to match reality generalise best.\n\nThat is what a "good" inductive bias means: not one that is true a priori, but one that is aligned with the world you happen to be in.',
      setup(c2d, st) { st.truth = 'smooth'; clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); plot(c2d, st, { all: true, truth: true, errors: true }); },
    },
    {
      title: 'But no bias is good everywhere',
      description: 'Change the world. Now the truth is a step. The polynomial — the winner a moment ago — collapses to nearly the worst, overshooting wildly as it tries to be smooth through a jump. Its test error goes from 0.00004 to 0.107: over 2771 times worse.',
      equation: '\\text{polynomial}: \\;\\; 0.00004 \\;\\longrightarrow\\; 0.107 \\qquad (\\times\\, 2771)',
      notes: 'The very assumption that made it superb is what makes it catastrophic. Smoothness is a brilliant bet on a sine and a terrible one on a step.\n\nThis is the No Free Lunch theorem in a picture: averaged over ALL possible worlds, no inductive bias beats any other. A learner that generalises well somewhere must generalise badly somewhere else.\n\nSo the game is not to find the universally best bias — there is none. It is to encode what you actually know about your problem: convolutions because images are translation-invariant, attention because language is relational, smoothness because physics usually is.\n\nToggle the truth back and forth and watch the ranking invert.',
      setup(c2d, st) {
        st.truth = 'step';
        const rebuild = s => { clearControls(s); truthToggle(s, rebuild); };
        rebuild(st);
      },
      update(c2d, st) { c2d.clearPersistent(); plot(c2d, st, { all: true, truth: true, errors: true }); },
    },
  ],
};
