// The Multinomial: Marginals & Lumping — Blitzstein & Hwang, Chapter 7.
//
// One idea, seen twice. Take X ~ Mult_k(n, p). Merge some categories together
// and count them as one; the result is STILL Multinomial, just with fewer
// categories and their probabilities added. Two special cases:
//
//   marginal   : lump everything except category i  ->  X_i        ~ Bin(n, p_i)
//   pairwise   : lump categories i and j            ->  X_i + X_j  ~ Bin(n, p_i + p_j)
//
// Collapsing all the way down to 2 categories is exactly a Binomial (Mult_2).
//
// Everything is computed. Verified: the empirical distribution of X_i matches
// Bin(n, p_i), and of X_i + X_j matches Bin(n, p_i + p_j), to Monte-Carlo noise.

const CATS = ['A', 'B', 'C', 'D'];
const COLORS = ['#1565c0', '#e8710a', '#2e7d32', '#7b1fa2'];
const K = CATS.length;

// ── RNG ───────────────────────────────────────────────────────────────────────
function mul32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Exact binomial pmf (log-gamma for stability) ──────────────────────────────
const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
            -176.61502916214059, 12.507343278686905, -0.13857109526572012,
            9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < 8; i++) x += LG[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function binpmf(k, n, p) {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)
    + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

// ── Multinomial sampling ──────────────────────────────────────────────────────
function normProbs(st) {
  const s = st.p.reduce((a, b) => a + b, 0);
  return st.p.map(v => v / s);
}

function drawOnce(n, p, r) {
  const cum = []; let s = 0;
  for (const pi of p) { s += pi; cum.push(s); }
  const c = new Array(p.length).fill(0);
  for (let t = 0; t < n; t++) {
    const u = r();
    let k = 0;
    while (k < cum.length - 1 && u > cum[k]) k++;
    c[k]++;
  }
  return c;
}

// group[i] = which lump each category belongs to. Returns merged probs + a color per lump.
function lumpsOf(st) {
  const p = normProbs(st);
  const map = new Map();
  st.group.forEach((g, i) => {
    if (!map.has(g)) map.set(g, { prob: 0, cats: [], color: COLORS[i] });
    const L = map.get(g);
    L.prob += p[i]; L.cats.push(i);
  });
  return [...map.values()];
}

// The distribution being tracked this step: the lump containing category `st.focus`.
function focusProb(st) {
  const p = normProbs(st);
  const g = st.group[st.focus];
  return st.group.reduce((s, gi, i) => s + (gi === g ? p[i] : 0), 0);
}
function focusCats(st) {
  const g = st.group[st.focus];
  return st.group.map((gi, i) => (gi === g ? i : -1)).filter(i => i >= 0);
}

// empirical histogram of the focus-lump count over many draws (cached)
function empirical(st) {
  const key = `${st.n}|${st.p.join(',')}|${st.group.join('')}|${st.focus}|${st.seed}`;
  if (st._emp && st._emp.key === key) return st._emp.h;
  const p = normProbs(st), r = mul32(st.seed * 131 + 7);
  const cats = focusCats(st);
  const T = 8000;
  const h = new Array(st.n + 1).fill(0);
  for (let i = 0; i < T; i++) {
    const c = drawOnce(st.n, p, r);
    const x = cats.reduce((s, ci) => s + c[ci], 0);
    h[x]++;
  }
  for (let k = 0; k <= st.n; k++) h[k] /= T;
  st._emp = { key, h };
  return h;
}

// ── Drawing ───────────────────────────────────────────────────────────────────
// the probability strip: one horizontal bar split into category regions.
// `merged` collapses each lump into a single block outlined together.
function drawStrip(ctx, c, st, x0, y, w, h, merged) {
  const p = normProbs(st);
  if (!merged) {
    let x = x0;
    p.forEach((pi, i) => {
      const seg = pi * w;
      ctx.fillStyle = COLORS[i];
      ctx.fillRect(x, y, seg, h);
      if (seg > 22) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(CATS[i], x + seg / 2, y + h / 2 + 4);
      }
      x += seg;
    });
  } else {
    // draw in original order but outline lumps, colour by lump
    const g = st.group;
    let x = x0;
    p.forEach((pi, i) => {
      const seg = pi * w;
      // lump colour = colour of the first category in that lump
      const first = g.findIndex(gg => gg === g[i]);
      ctx.fillStyle = COLORS[first];
      ctx.globalAlpha = i === first ? 1 : 0.75;
      ctx.fillRect(x, y, seg, h);
      ctx.globalAlpha = 1;
      x += seg;
    });
    // lump boundaries
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    let bx = x0; const seen = new Set();
    // draw white separators only between different lumps
    x = x0;
    for (let i = 0; i < p.length; i++) {
      const seg = p[i] * w;
      if (i > 0 && st.group[i] !== st.group[i - 1]) {
        ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + h + 3); ctx.stroke();
      }
      x += seg;
    }
  }
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1; ctx.strokeRect(x0, y, w, h);
}

// pmf/empirical panel: exact Binomial bars + empirical overlay dots
function drawDist(ctx, c, st, box) {
  const [L, T, R, B] = box;
  const n = st.n, p = focusProb(st);
  const emp = empirical(st);
  const pmf = [];
  let ymax = 0;
  for (let k = 0; k <= n; k++) { const v = binpmf(k, n, p); pmf.push(v); ymax = Math.max(ymax, v, emp[k]); }
  ymax *= 1.15;

  const bw = (R - L) / (n + 1);
  const sy = v => B - v / ymax * (B - T);

  ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L, B); ctx.lineTo(R, B); ctx.stroke();

  // exact Binomial as bars
  for (let k = 0; k <= n; k++) {
    const x = L + k * bw + bw * 0.5;
    ctx.fillStyle = '#cfe0f5';
    ctx.fillRect(x - bw * 0.32, sy(pmf[k]), bw * 0.64, B - sy(pmf[k]));
  }
  // empirical as dots
  for (let k = 0; k <= n; k++) {
    if (emp[k] < 1e-4) continue;
    const x = L + k * bw + bw * 0.5;
    ctx.beginPath(); ctx.fillStyle = '#1565c0';
    ctx.arc(x, sy(emp[k]), 3, 0, Math.PI * 2); ctx.fill();
  }
  // x ticks
  ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
  const step = n > 24 ? 5 : n > 12 ? 2 : 1;
  for (let k = 0; k <= n; k += step) ctx.fillText(k, L + k * bw + bw * 0.5, B + 14);

  ctx.textAlign = 'left'; ctx.font = '12px system-ui';
  ctx.fillStyle = '#8fb3e0'; ctx.fillText('bars: exact Binomial pmf', L + 6, T + 14);
  ctx.fillStyle = '#1565c0'; ctx.fillText('dots: empirical (8000 multinomial draws)', L + 6, T + 32);
  ctx.textAlign = 'left';
}

function scene(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const W = Math.min(c.width - 120, 620), L = (c.width - W) / 2;

    // title strip
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(o.stripLabel || 'each trial lands in one category with these probabilities:', L, 34);
    drawStrip(ctx, c, st, L, 46, W, 40, !!o.merged);

    // probabilities readout under the strip
    const p = normProbs(st);
    ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    let x = L;
    if (!o.merged) {
      p.forEach((pi, i) => { const seg = pi * W; if (seg > 26) { ctx.fillStyle = COLORS[i]; ctx.fillText(pi.toFixed(2), x + seg / 2, 104); } x += seg; });
    }

    // the tracked count + its distribution
    if (o.dist) {
      const cats = focusCats(st).map(i => CATS[i]);
      const label = 'X_' + cats.join(' + X_');   // "X_A"  or  "X_A + X_B"
      const fp = focusProb(st);
      ctx.textAlign = 'center'; ctx.font = '600 15px system-ui'; ctx.fillStyle = '#333';
      ctx.fillText(`${label}  ~  Bin(${st.n}, ${fp.toFixed(2)})`, c.width / 2, 150);
      drawDist(ctx, c, st, [L, 180, L + W, 360]);
    }

    if (o.note) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
      o.note.split('\n').forEach((ln, i) => ctx.fillText(ln, c.width / 2, 388 + i * 18));
    }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function probSliders(st) {
  CATS.forEach((cat, i) => {
    const id = 'mn-p' + i;
    const w = document.createElement('div');
    w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
    w.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:12px;color:${COLORS[i]};font-family:system-ui">
        <span>weight of ${cat}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${st.p[i].toFixed(2)}</span>
      </div>
      <input type="range" id="${id}" min="0.05" max="1" step="0.01" value="${st.p[i]}"
        style="width:100%;accent-color:${COLORS[i]}">`;
    st._controls.appendChild(w);
    const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
    inp.addEventListener('input', () => {
      st.p[i] = parseFloat(inp.value);
      const P = normProbs(st);
      st._controls.querySelectorAll('[id^="mn-p"][id$="-v"]').forEach((el, j) =>
        el.textContent = P[j].toFixed(2));
    });
  });
}

function nSlider(st) {
  const w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>trials n</span><span id="mn-n-v" style="font-family:Georgia,serif;font-style:italic">${st.n}</span>
    </div>
    <input type="range" id="mn-n" min="5" max="40" step="1" value="${st.n}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector('#mn-n-v');
  inp.addEventListener('input', () => { st.n = parseInt(inp.value, 10); v.textContent = st.n; });
}

// let the reader choose which categories to lump with A (the focus)
function mergeToggles(st) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:12px;color:#888;font-family:system-ui;';
  lbl.textContent = 'merge into A’s group:';
  wrap.appendChild(lbl);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;';
  [1, 2, 3].forEach(i => {
    const b = document.createElement('button');
    const on = () => st.group[i] === st.group[0];
    const paint = () => {
      b.style.cssText = `flex:1;padding:7px;font-size:12px;border:1.5px solid ${COLORS[i]};`
        + `color:${on() ? '#fff' : COLORS[i]};background:${on() ? COLORS[i] : '#fff'};`
        + 'border-radius:6px;cursor:pointer;';
    };
    b.textContent = CATS[i];
    b.addEventListener('click', () => { st.group[i] = on() ? i : st.group[0]; paint(); });
    paint();
    row.appendChild(b);
  });
  wrap.appendChild(row);
  st._controls.appendChild(wrap);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Multinomial: Marginals & Lumping',
  subject: 'Probability',

  initState() {
    return { p: [0.5, 0.3, 0.15, 0.05], n: 20, focus: 0, group: [0, 1, 2, 3], seed: 1, _controls: null };
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
      title: 'The Multinomial',
      description: 'Run $n$ independent trials. Each lands in exactly one of $k$ categories, with probabilities $\\mathbf{p} = (p_1, \\dots, p_k)$ that sum to 1. The counts $\\mathbf{X} = (X_1, \\dots, X_k)$ — how many trials landed in each category — are Multinomial. Rolling a 4-sided die $n$ times, with weighted faces.',
      equation: '\\mathbf{X} \\sim \\mathrm{Mult}_k(n, \\mathbf{p}), \\qquad X_1 + \\dots + X_k = n',
      notes: 'The strip is one trial: a spinner landing in a coloured region, region width = probability. Drag the weights (they auto-normalise to sum to 1) and the trial count.\n\nThe counts are linked — they must add up to n — so the categories are not independent. That coupling is what makes the next results non-obvious, and also what makes them clean.',
      setup(c2d, st) { st.group = [0, 1, 2, 3]; clearControls(st); probSliders(st); nSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); scene(c2d, st, {}); },
    },
    {
      title: 'One category is Binomial (the marginal)',
      description: 'Focus on a single category, say A. Ask each trial only one question: "did it land in A, yes or no?" That is an independent success/fail trial with success probability $p_A$ — so the count $X_A$ is exactly Binomial. The dots (empirical, from 8000 multinomial draws) sit right on the exact Binomial bars.',
      equation: 'X_i \\sim \\mathrm{Bin}(n, p_i)',
      notes: 'To get one category\'s marginal, you mentally lump every OTHER category into a single "not A" bin. The multinomial collapses to just two outcomes — A or not-A — and two outcomes is a Binomial.\n\nDrag the weight of A and watch both the bars and the dots shift together. They stay locked, because the marginal really is Bin(n, p_A) — not an approximation.',
      setup(c2d, st) { st.focus = 0; st.group = [0, 1, 2, 3]; clearControls(st); probSliders(st); nSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); scene(c2d, st, { dist: true, stripLabel: 'category A vs. everything else:' }); },
    },
    {
      title: 'Merge two categories',
      description: 'Now genuinely glue two categories together and count them as one. Paint A and B the same colour: a trial "succeeds" if it lands in A or B, with probability $p_A + p_B$ (disjoint, so the probabilities just add). The combined count $X_A + X_B$ is Binomial again.',
      equation: 'X_i + X_j \\sim \\mathrm{Bin}(n,\\, p_i + p_j)',
      notes: 'This is Theorem 7.4.4 (multinomial lumping). Toggle B into A\'s group and watch the tracked distribution jump from Bin(n, p_A) to Bin(n, p_A + p_B) — the dots follow instantly.\n\nThe marginal from the previous step is just this with a single category; here we merge two. Same move, wider bin.',
      setup(c2d, st) { st.focus = 0; st.group = [0, 0, 2, 3]; clearControls(st); mergeToggles(st); probSliders(st); nSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); scene(c2d, st, { merged: true, dist: true, stripLabel: 'merged group (A ∪ B ∪ …) vs. the rest:' }); },
    },
    {
      title: 'Merge into fewer categories — still Multinomial',
      description: 'Lumping does not just give a Binomial for one merged group; the WHOLE reduced vector of counts is still Multinomial, now on fewer categories with their probabilities added. Merging A and B turns a 4-category multinomial into a 3-category one.',
      equation: '(X_1{+}X_2,\\, X_3, \\dots, X_k) \\sim \\mathrm{Mult}_{k-1}\\big(n,\\, (p_1{+}p_2,\\, p_3, \\dots, p_k)\\big)',
      notes: 'Toggle categories in and out of A\'s group and read the merged strip: each block is a new category, its width the summed probability, and they still cover the whole bar (probabilities still sum to 1).\n\nThe tracked distribution below always stays Binomial — because any ONE category of a multinomial is Binomial, and the merged group is just one category of the smaller multinomial. It is turtles all the way down.',
      setup(c2d, st) { st.focus = 0; st.group = [0, 0, 2, 3]; clearControls(st); mergeToggles(st); probSliders(st); },
      update(c2d, st) { c2d.clearPersistent(); scene(c2d, st, { merged: true, dist: true, stripLabel: 'the reduced multinomial (merged categories):' }); },
    },
    {
      title: 'Why: it is just relabelling',
      description: 'None of this needs algebra. Painting two regions the same colour does not touch the experiment: each trial is still an independent draw, still lands in exactly one region, and the region probabilities still sum to 1. Coarsening the categories cannot break the structure — it only changes how many boxes you count into.',
      equation: '\\underbrace{\\mathrm{Mult}_k}_{\\text{fine}} \\;\\xrightarrow{\\;\\text{merge}\\;}\\; \\underbrace{\\mathrm{Mult}_{k-1}}_{\\text{coarser}} \\;\\xrightarrow{\\;\\text{down to 2}\\;}\\; \\underbrace{\\mathrm{Bin}}_{\\mathrm{Mult}_2}',
      notes: 'The Binomial IS the two-category Multinomial. So "a marginal is Binomial" and "lumping stays Multinomial" are the same statement seen from two distances — collapse all the way to two colours and you have named a Binomial.\n\nThe honest subtlety: this works for MERGING categories. The reverse — splitting a total back into its parts, or conditioning on a category sum — is harder, because fixing X_1 + ... + X_k = n makes the categories negatively dependent. Lumping is the easy, always-valid direction.',
      setup(c2d, st) { st.focus = 0; st.group = [0, 0, 2, 3]; clearControls(st); mergeToggles(st); },
      update(c2d, st) { c2d.clearPersistent(); scene(c2d, st, { merged: true, note: 'merge → coarser multinomial → (at 2 categories) Binomial' }); },
    },
  ],
};
