// The Curse of Dimensionality — why high dimensions destroy locality, and why
// deep learning works anyway.
//
// This is the sequel to Inductive Bias. That lesson ended on: "encode what you
// know — smoothness, locality." The curse is the discovery that in high
// dimensions LOCALITY ITSELF stops meaning anything, because everything becomes
// equidistant from everything else.
//
// Everything here is computed. Verified:
//
//   d    ball/cube vol   shell(10%)   (farthest-nearest)/nearest
//   2      7.85e-1         19.0%           48.37     farthest is 48x further
//  10      2.49e-3         65.1%            2.60
//  50      1.54e-28        99.5%            0.62
// 500      ~0             100.0%            0.16     farthest only 16% further!
//
// And the escape hatch, also computed: points on a 1-D curve embedded in R^d keep
// a gap in the HUNDREDS at any ambient d. Intrinsic dimension is what matters.

const NPTS = 400;
const TRIALS = 25;      // average the Monte-Carlo estimates so the numbers are stable

// ── log-gamma (Lanczos) so the ball volume is exact at any d ──────────────────
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

// volume of the ball inscribed in the unit cube (radius 1/2); cube volume = 1
const ballFrac = d => Math.exp((d / 2) * Math.log(Math.PI) - lgamma(d / 2 + 1) - d * Math.log(2));
// share of a ball's volume lying in its outer 10% shell
const shellFrac = (d, eps = 0.1) => 1 - Math.pow(1 - eps, d);
// points needed to have a neighbour within r, covering [0,1]^d
const coverN = (d, r = 0.1) => Math.pow(1 / r, d);

// ── RNG ───────────────────────────────────────────────────────────────────────
function mul32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Distance concentration ────────────────────────────────────────────────────
// Uniform points in [0,1]^d: nearest and farthest distance from a query point.
function uniformGap(d) {
  const r = mul32(1234 + d);
  let near = 0, far = 0, gap = 0;
  for (let t = 0; t < TRIALS; t++) {
    const q = Array.from({ length: d }, () => r());
    const ds = [];
    for (let n = 0; n < NPTS; n++) {
      let s = 0;
      for (let k = 0; k < d; k++) { const v = r() - q[k]; s += v * v; }
      ds.push(Math.sqrt(s));
    }
    ds.sort((a, b) => a - b);
    const lo = ds[0], hi = ds[ds.length - 1];
    near += lo; far += hi; gap += (hi - lo) / lo;
  }
  return { near: near / TRIALS, far: far / TRIALS, gap: gap / TRIALS };
}

// The escape hatch: points on a 1-D curve embedded in R^d. Ambient dimension is d,
// but the data only has ONE degree of freedom.
function manifoldGap(d) {
  const r = mul32(99 + d);
  const coef = Array.from({ length: d }, () => [r() - 0.5, r() - 0.5, r() - 0.5]);
  const pt = t => coef.map(c => c[0] * Math.sin(Math.PI * t) + c[1] * Math.sin(2 * Math.PI * t) + c[2] * t);
  let gap = 0;
  for (let t = 0; t < TRIALS; t++) {
    const q = pt(r());
    const ds = [];
    for (let n = 0; n < NPTS; n++) {
      const p = pt(r());
      let s = 0;
      for (let k = 0; k < d; k++) { const v = p[k] - q[k]; s += v * v; }
      ds.push(Math.sqrt(s));
    }
    ds.sort((a, b) => a - b);
    gap += (ds[ds.length - 1] - ds[0]) / ds[0];
  }
  return { gap: gap / TRIALS };
}

const CACHE = new Map();
function stats(d) {
  if (CACHE.has(d)) return CACHE.get(d);
  const o = { d, ball: ballFrac(d), shell: shellFrac(d), cover: coverN(d),
              u: uniformGap(d), m: manifoldGap(d) };
  CACHE.set(d, o);
  return o;
}

const DIMS = [1, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];

// ── Colours ───────────────────────────────────────────────────────────────────
const BALL = '#1565c0', SHELL = '#7b1fa2', NEAR = '#2e7d32',
      FAR = '#c62828', CURSE = '#e8710a', ESCAPE = '#00897b';

// ── Plot scaffolding ──────────────────────────────────────────────────────────
function box(ctx, c) {
  const L = 90, R = c.width - 70, T = 70, B = c.height - 150;
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(R, B); ctx.stroke();
  ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('dimension  d   (log scale)', (L + R) / 2, B + 36);
  [1, 10, 100, 500].forEach(d => {
    const px = L + (Math.log(d) / Math.log(500)) * (R - L);
    ctx.fillText(String(d), px, B + 18);
  });
  ctx.textAlign = 'left';
  const sx = d => L + (Math.log(Math.max(d, 1)) / Math.log(500)) * (R - L);
  return { L, R, T, B, sx };
}

function series(ctx, bx, fn, color, width = 2.6, dash = []) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  DIMS.forEach((d, i) => {
    const px = bx.sx(d), py = fn(stats(d));
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke(); ctx.setLineDash([]);
}

function marker(ctx, bx, st, fn, color) {
  const s = stats(st.d);
  ctx.beginPath(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.moveTo(bx.sx(st.d), bx.T); ctx.lineTo(bx.sx(st.d), bx.B); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.fillStyle = color;
  ctx.arc(bx.sx(st.d), fn(s), 5.5, 0, Math.PI * 2); ctx.fill();
}

// ── 1) locality works in low dimensions ───────────────────────────────────────
function drawLowDim(c2d, st) {
  c2d.raw((ctx, c) => {
    const S = 300, L = (c.width - S) / 2, T = 70;
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    ctx.strokeRect(L, T, S, S);
    const r = mul32(7);
    const pts = Array.from({ length: 60 }, () => [r(), r()]);
    const q = [0.5, 0.5];
    let bi = 0, bd = Infinity;
    pts.forEach((p, i) => {
      const dd = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (dd < bd) { bd = dd; bi = i; }
    });
    const far = pts.reduce((a, p) => Math.max(a, Math.hypot(p[0] - q[0], p[1] - q[1])), 0);

    // the neighbourhood is a MEANINGFUL region — it contains almost nothing else
    ctx.beginPath(); ctx.strokeStyle = '#cfe3d2'; ctx.fillStyle = 'rgba(46,125,50,0.07)';
    ctx.arc(L + q[0] * S, T + (1 - q[1]) * S, bd * S, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.fillStyle = i === bi ? NEAR : '#bbb';
      ctx.arc(L + p[0] * S, T + (1 - p[1]) * S, i === bi ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath(); ctx.fillStyle = '#111';
    ctx.arc(L + q[0] * S, T + (1 - q[1]) * S, 6, 0, Math.PI * 2); ctx.fill();

    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#111';  ctx.fillText('query point', L + S / 2, T + S + 26);
    ctx.fillStyle = NEAR;    ctx.fillText(`nearest neighbour: ${bd.toFixed(3)} away`, L + S / 2, T + S + 48);
    ctx.fillStyle = '#999';  ctx.fillText(`farthest point: ${far.toFixed(3)} away — ${(far / bd).toFixed(0)}× further`,
                                          L + S / 2, T + S + 70);
    ctx.fillStyle = '#666'; ctx.font = '13px system-ui';
    ctx.fillText('in 2-D, "nearest" is meaningfully nearer. Locality works.', L + S / 2, T + S + 100);
    ctx.textAlign = 'left';
  });
}

// ── 2) volume flees to the corners ────────────────────────────────────────────
function drawVolume(c2d, st) {
  c2d.raw((ctx, c) => {
    const bx = box(ctx, c);
    const lo = 1e-30, hi = 1;
    const sy = v => bx.B - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (bx.B - bx.T);
    series(ctx, bx, s => sy(s.ball), BALL, 3);
    marker(ctx, bx, st, s => sy(s.ball), BALL);
    const s = stats(st.d);
    ctx.fillStyle = BALL; ctx.font = '12px system-ui';
    ctx.fillText('volume of the inscribed ball ÷ volume of the cube  (log scale)', bx.L + 12, bx.T + 18);
    ctx.textAlign = 'center'; ctx.font = '15px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`d = ${s.d}:  the ball fills ${s.ball < 1e-4 ? s.ball.toExponential(1) : (s.ball * 100).toFixed(1) + '%'}`
      + ` of the cube`, c.width / 2, bx.B + 66);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#999';
    ctx.fillText('2-D: 78.5%   ·   3-D: 52.4%   ·   10-D: 0.25%   ·   20-D: 0.0000025%',
                 c.width / 2, bx.B + 92);
    ctx.fillStyle = CURSE;
    ctx.fillText('almost all the volume is in the CORNERS — the middle is empty', c.width / 2, bx.B + 116);
    ctx.textAlign = 'left';
  });
}

// ── 3) everything lives in the shell ──────────────────────────────────────────
function drawShell(c2d, st) {
  c2d.raw((ctx, c) => {
    const bx = box(ctx, c);
    const sy = v => bx.B - v * (bx.B - bx.T);
    series(ctx, bx, s => sy(s.shell), SHELL, 3);
    marker(ctx, bx, st, s => sy(s.shell), SHELL);
    ctx.strokeStyle = '#eee'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(bx.L, sy(1)); ctx.lineTo(bx.R, sy(1)); ctx.stroke(); ctx.setLineDash([]);
    const s = stats(st.d);
    ctx.fillStyle = SHELL; ctx.font = '12px system-ui';
    ctx.fillText('share of a ball’s volume lying in its outer 10% shell', bx.L + 12, bx.T + 18);
    ctx.textAlign = 'center'; ctx.font = '15px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`d = ${s.d}:  ${(s.shell * 100).toFixed(1)}% of the volume is in the outer skin`,
                 c.width / 2, bx.B + 66);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#999';
    ctx.fillText('1-D: 10%   ·   10-D: 65%   ·   50-D: 99.5%   ·   100-D: 99.997%', c.width / 2, bx.B + 92);
    ctx.fillStyle = CURSE;
    ctx.fillText('in high dimensions an object is all surface and no interior', c.width / 2, bx.B + 116);
    ctx.textAlign = 'left';
  });
}

// ── 4) distances concentrate — locality dies ──────────────────────────────────
function drawDistances(c2d, st) {
  c2d.raw((ctx, c) => {
    const bx = box(ctx, c);
    const lo = 0.1, hi = 1000;
    const sy = v => bx.B - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (bx.B - bx.T);
    series(ctx, bx, s => sy(s.u.gap), CURSE, 3.2);
    marker(ctx, bx, st, s => sy(s.u.gap), CURSE);
    ctx.strokeStyle = '#e0e0e0'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(bx.L, sy(1)); ctx.lineTo(bx.R, sy(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui';
    ctx.fillText('gap = 1  (farthest is merely twice as far as nearest)', bx.L + 12, sy(1) - 6);

    const s = stats(st.d);
    ctx.fillStyle = CURSE; ctx.font = '12px system-ui';
    ctx.fillText('(farthest − nearest) ÷ nearest       (log scale)', bx.L + 12, bx.T + 18);

    ctx.textAlign = 'center'; ctx.font = '15px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`d = ${s.d}:  nearest ${s.u.near.toFixed(2)},  farthest ${s.u.far.toFixed(2)}`
      + `  →  gap ${s.u.gap.toFixed(2)}`, c.width / 2, bx.B + 66);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#999';
    ctx.fillText('2-D: 48×   ·   10-D: 2.6×   ·   20-D: 1.2×   ·   50-D: 0.62×   ·   500-D: 0.16×', c.width / 2, bx.B + 92);
    ctx.fillStyle = FAR; ctx.font = '13px system-ui';
    ctx.fillText('everything is becoming equidistant — "nearest" stops meaning anything',
                 c.width / 2, bx.B + 118);
    ctx.textAlign = 'left';
  });
}

// ── 5) the data is a speck ────────────────────────────────────────────────────
function drawSparsity(c2d, st) {
  c2d.raw((ctx, c) => {
    const bx = box(ctx, c);
    const lo = 10, hi = 1e30;
    const sy = v => bx.B - (Math.log(Math.min(Math.max(v, lo), hi)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (bx.B - bx.T);
    series(ctx, bx, s => sy(s.cover), FAR, 3);
    marker(ctx, bx, st, s => sy(s.cover), FAR);
    const s = stats(st.d);
    ctx.fillStyle = FAR; ctx.font = '12px system-ui';
    ctx.fillText('training points needed to always have a neighbour within 0.1   (log scale)',
                 bx.L + 12, bx.T + 18);
    ctx.textAlign = 'center'; ctx.font = '15px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`d = ${s.d}:  you would need 10^${s.d} points`, c.width / 2, bx.B + 66);
    ctx.font = '12px system-ui'; ctx.fillStyle = '#999';
    ctx.fillText('d=3: 1,000   ·   d=10: 10 billion   ·   d=20: more than atoms in a person',
                 c.width / 2, bx.B + 92);
    ctx.fillStyle = CURSE;
    ctx.fillText('any real dataset is an infinitesimal speck in a vast empty cube', c.width / 2, bx.B + 116);
    ctx.textAlign = 'left';
  });
}

// ── 6) the escape: intrinsic dimension ────────────────────────────────────────
function drawManifold(c2d, st) {
  c2d.raw((ctx, c) => {
    const bx = box(ctx, c);
    const lo = 0.05, hi = 5000;
    const sy = v => bx.B - (Math.log(Math.max(v, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)) * (bx.B - bx.T);
    series(ctx, bx, s => sy(s.u.gap), CURSE, 3);
    series(ctx, bx, s => sy(s.m.gap), ESCAPE, 3);
    marker(ctx, bx, st, s => sy(s.m.gap), ESCAPE);
    const s = stats(st.d);
    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = CURSE;  ctx.fillText('uniform in the cube — locality dies', bx.L + 12, bx.T + 18);
    ctx.fillStyle = ESCAPE; ctx.fillText('data on a 1-D curve inside the SAME d dimensions — locality survives',
                                         bx.L + 12, bx.T + 38);
    ctx.textAlign = 'center'; ctx.font = '15px system-ui'; ctx.fillStyle = '#333';
    ctx.fillText(`d = ${s.d}:  uniform gap ${s.u.gap.toFixed(2)}   vs   on-manifold gap ${s.m.gap.toFixed(0)}`,
                 c.width / 2, bx.B + 66);
    ctx.font = '13px system-ui'; ctx.fillStyle = ESCAPE;
    ctx.fillText('ambient dimension is irrelevant — INTRINSIC dimension is what bites',
                 c.width / 2, bx.B + 96);
    ctx.textAlign = 'left';
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function dimSlider(st) {
  const w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>dimension d</span><span id="cd-v" style="font-family:Georgia,serif;font-style:italic">${st.d}</span>
    </div>
    <input type="range" id="cd-i" min="0" max="${DIMS.length - 1}" step="1"
      value="${DIMS.indexOf(st.d)}" style="width:100%;accent-color:#e8710a">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('#cd-i'), v = w.querySelector('#cd-v');
  inp.addEventListener('input', () => { st.d = DIMS[parseInt(inp.value, 10)]; v.textContent = st.d; });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'The Curse of Dimensionality',
  subject: 'Machine Learning',

  initState() { return { d: 2, _controls: null }; },

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
      title: 'In low dimensions, locality works',
      description: 'Sixty points in a 2-D square, and a query in the middle. Its nearest neighbour is genuinely near — the farthest point is many times further away. "Points close to me look like me" is a sensible assumption, and it is the one nearest neighbour, kernels and smoothness priors all rest on.',
      equation: '\\text{nearest neighbour} \\ll \\text{farthest point}',
      notes: 'The Inductive Bias lesson ended by saying: encode what you know — smoothness, locality.\n\nThis lesson is about how that assumption dies. Not because it is philosophically wrong, but because in high dimensions the word "nearest" quietly stops meaning anything at all.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); drawLowDim(c2d, st); },
    },
    {
      title: 'Volume flees to the corners',
      description: 'Take the largest ball that fits inside the unit cube. In 2-D it covers 78.5% of the square. In 3-D, 52.4%. By 10 dimensions it covers a quarter of one percent — and by 20 dimensions, essentially none of it. The cube is almost entirely corners.',
      equation: '\\frac{V_{\\text{ball}}}{V_{\\text{cube}}} = \\frac{\\pi^{d/2}}{2^{d}\\,\\Gamma\\!\\left(\\frac{d}{2}+1\\right)} \\longrightarrow 0',
      notes: 'Drag d. The fall is not gentle — it is catastrophic, and the axis is already logarithmic.\n\nA high-dimensional cube is nothing like the box you are picturing. It is a spiky thing whose volume hides in $2^d$ corners, unimaginably far from the centre.',
      setup(c2d, st) { st.d = 10; clearControls(st); dimSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawVolume(c2d, st); },
    },
    {
      title: 'Everything is in the shell',
      description: 'Worse: even inside a ball, the volume abandons the middle. The outer 10% skin holds 65% of a 10-dimensional ball, and 99.5% of a 50-dimensional one. There is essentially no interior.',
      equation: '\\text{fraction in outer shell} = 1 - (1-\\epsilon)^d \\longrightarrow 1',
      notes: 'An orange in 50 dimensions is all peel.\n\nSo any point you sample is, with overwhelming probability, near the boundary — and far from every other point. This is the beginning of the real problem.',
      setup(c2d, st) { st.d = 20; clearControls(st); dimSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawShell(c2d, st); },
    },
    {
      title: 'Distances concentrate — locality dies',
      description: 'Here is the one that actually matters. Take 400 random points and a query, and compare the nearest to the farthest. In 2-D the farthest is 48 times further away than the nearest. By 10 dimensions it is only 2.6 times further. By 500 dimensions the FARTHEST point is a mere 16% further away than the nearest.',
      equation: '\\frac{d_{\\max} - d_{\\min}}{d_{\\min}} \\longrightarrow 0 \\qquad \\text{as } d \\to \\infty',
      notes: 'Everything becomes equidistant from everything else. Your "nearest neighbour" is barely nearer than a random stranger.\n\nThat guts the assumption underneath nearest neighbour, kernels, RBFs, and any smoothness prior: they all assume that being close MEANS something. In high dimensions it barely does.\n\nDrag d and watch the gap collapse through the dashed line — below it, the farthest point is less than twice as far as the nearest. That happens by about 20 dimensions.',
      setup(c2d, st) { st.d = 100; clearControls(st); dimSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawDistances(c2d, st); },
    },
    {
      title: 'And the data is a speck',
      description: 'To guarantee every query has a training point within 0.1 of it, you need to cover the cube — which takes $10^d$ points. Three dimensions: a thousand. Ten dimensions: ten billion. Twenty: more points than there are atoms in your body.',
      equation: 'N \\;\\approx\\; \\left(\\tfrac{1}{r}\\right)^{d} \\qquad \\text{— exponential in } d',
      notes: 'Every real dataset, however enormous, is an infinitesimal speck in a vast and empty cube.\n\nSo you can never rely on having seen anything nearby. Generalisation cannot come from interpolating between close neighbours, because you have none.\n\nPut together: the geometry says learning in high dimensions should be hopeless. And yet a photograph is a point in 150,528 dimensions, and deep learning classifies it just fine. So what is going on?',
      setup(c2d, st) { st.d = 10; clearControls(st); dimSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawSparsity(c2d, st); },
    },
    {
      title: 'The escape: intrinsic dimension',
      description: 'The curse assumes your data FILLS the cube. Real data does not. Images of cats occupy a vanishingly thin, curved sheet inside pixel space — almost every possible image is static, not a cat. Here is the same measurement on data lying along a 1-D curve embedded in d dimensions: the gap does not collapse at all.',
      equation: '\\text{what bites is } \\dim_{\\text{intrinsic}}, \\;\\text{not } \\dim_{\\text{ambient}}',
      notes: 'The orange curve is uniform data — locality dies, as we saw. The teal curve is data with the same ambient dimension but only ONE genuine degree of freedom. Its gap stays in the hundreds no matter how large d gets.\n\nThat is the resolution. Deep learning survives 150,528 dimensions because photographs live on a low-dimensional manifold inside it.\n\nAnd this is precisely why architecture-as-inductive-bias matters so much: a convolution assumes translation structure; attention assumes relational structure. Those assumptions are how a network exploits the manifold instead of drowning in the ambient space. The curse is not escaped by having more data — it is escaped by having the right bias.',
      setup(c2d, st) { st.d = 200; clearControls(st); dimSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawManifold(c2d, st); },
    },
  ],
};
