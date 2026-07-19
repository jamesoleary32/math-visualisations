// Change of Variables & the Jacobian — how a density transforms under Y = g(X).
// Blitzstein & Hwang, Chapter 8 (Transformations).
//
// The arc: transforming a random variable must conserve probability mass; in 1D
// that means dividing by the slope, f_Y(y) = f_X(x)/|g'(x)|; in higher dimensions
// the local linear map is the Jacobian matrix, |det J| is the local area/volume
// scaling factor, and the density formula becomes f_Y(y) = f_X(x)/|det J|.
//
// Densities are integrated/plotted from the real functions (∫f_Y = 1 verified in
// node); determinants and the deformed grid are computed exactly.

const SQ2PI = Math.sqrt(2 * Math.PI);
const phi = x => Math.exp(-x * x / 2) / SQ2PI;   // f_X = standard normal

// ── 1D transforms ─────────────────────────────────────────────────────────────
function cubicInv(y) { let x = y; for (let i = 0; i < 40; i++) x -= ((x + x * x * x / 9) - y) / (1 + x * x / 3); return x; }
const TF = {
  linear: { label: 'y = 1.2x + 0.4', g: x => 1.2 * x + 0.4, gp: () => 1.2, ginv: y => (y - 0.4) / 1.2, xr: [-3, 3], yr: [-3.4, 4.4] },
  exp:    { label: 'y = e^{0.6x}', g: x => Math.exp(0.6 * x), gp: x => 0.6 * Math.exp(0.6 * x), ginv: y => Math.log(y) / 0.6, xr: [-3, 3], yr: [0, 6.2], pos: true },
  cubic:  { label: 'y = x + x³/9', g: x => x + x * x * x / 9, gp: x => 1 + x * x / 3, ginv: cubicInv, xr: [-3, 3], yr: [-4.4, 4.4] },
};
const fY = (tf, y) => { if (tf.pos && y <= 0) return 0; const x = tf.ginv(y); return phi(x) / Math.abs(tf.gp(x)); };

// ── 2D maps ───────────────────────────────────────────────────────────────────
const A = [[1.25, 0.55], [-0.2, 0.95]];             // linear map, det ≈ 1.30
const detA = A[0][0] * A[1][1] - A[0][1] * A[1][0];
const linMap = (x1, x2) => [A[0][0] * x1 + A[0][1] * x2, A[1][0] * x1 + A[1][1] * x2];
const nlMap = (x1, x2) => [x1 + 0.2 * x1 * x1, x2 + 0.2 * x2 * x2];  // separable quadratic
const nlDet = (x1, x2) => (1 + 0.4 * x1) * (1 + 0.4 * x2);
const W2 = 2.2;                                      // 2D world half-window

// ── Colour ──────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const BLUE = [21, 101, 192], ORANGE = [232, 113, 10], GREEN = '#2e7d32', INK = '#37474f';
// diverging around 1: <1 compresses (orange), >1 expands (blue)
function detColor(d) { const t = Math.max(-1, Math.min(1, Math.log(d) / Math.log(3))); const c = t >= 0 ? BLUE : ORANGE, a = Math.abs(t) * 0.8; return rgb(lerp(255, c[0], a), lerp(255, c[1], a), lerp(255, c[2], a)); }

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    if (o.mode === '1d') return draw1D(ctx, c, st, o);
    return draw2D(ctx, c, st, o);
  });
}

function draw1D(ctx, c, st, o) {
  const tf = TF[st.tf];
  const stripL = 82, stripB = 66;
  const L = 46 + stripL, T = 26;
  const size = Math.min(c.height - T - stripB - 26, c.width - L - 290);
  const R = L + size, B = T + size;
  const [xa, xb] = tf.xr, [ya, yb] = tf.yr;
  const px = x => L + (x - xa) / (xb - xa) * size;
  const py = y => B - (y - ya) / (yb - ya) * size;

  // frame + zero axes
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
  ctx.strokeStyle = '#eee';
  if (xa < 0 && xb > 0) { ctx.beginPath(); ctx.moveTo(px(0), T); ctx.lineTo(px(0), B); ctx.stroke(); }
  if (ya < 0 && yb > 0) { ctx.beginPath(); ctx.moveTo(L, py(0)); ctx.lineTo(R, py(0)); ctx.stroke(); }

  // equal-probability bands in x (quantiles of N(0,1)), mapped through g
  const edges = [-1.6, -0.8, 0, 0.8, 1.6].filter(e => e > xa && e < xb);
  const bandsX = [-xb, ...edges, xb];
  // f_X in bottom strip
  const fxScale = stripB / 0.45;
  const fxY = v => B + stripB - v * fxScale;
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let i = 0; i <= 200; i++) { const x = xa + (xb - xa) * i / 200; const X = px(x), Y = fxY(phi(x)); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
  ctx.stroke();
  // shade alternating x-bands under f_X
  for (let b = 0; b < bandsX.length - 1; b++) {
    if (b % 2) continue;
    ctx.fillStyle = 'rgba(21,101,192,0.10)';
    ctx.fillRect(px(bandsX[b]), B + 4, px(bandsX[b + 1]) - px(bandsX[b]), stripB);
  }
  ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('f_X(x)', (L + R) / 2, B + stripB + 18);

  // the transform curve
  ctx.strokeStyle = rgb(...BLUE); ctx.lineWidth = 2.8; ctx.beginPath();
  let started = false;
  for (let i = 0; i <= 240; i++) { const x = xa + (xb - xa) * i / 240; let y = tf.g(x); if (y < ya || y > yb) { started = false; continue; } const X = px(x), Y = py(y); started ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); started = true; }
  ctx.stroke();
  ctx.fillStyle = rgb(...BLUE); ctx.font = '600 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(tf.label, R - 108, T + 18);

  if (o.showFY) {
    // f_Y in left strip (horizontal density along y)
    const fyMax = Math.max(...Array.from({ length: 160 }, (_, i) => fY(tf, ya + (yb - ya) * i / 159)));
    const fyX = v => L - 6 - v / fyMax * stripL;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const y = ya + (yb - ya) * i / 200; const X = fyX(fY(tf, y)), Y = py(y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke();
    // shade the mapped bands on f_Y + guide lines from curve
    for (let b = 0; b < bandsX.length - 1; b++) {
      const y0 = tf.g(bandsX[b]), y1 = tf.g(bandsX[b + 1]);
      if (b % 2 === 0) { ctx.fillStyle = 'rgba(21,101,192,0.10)'; ctx.fillRect(L - 6 - stripL, py(Math.max(ya, Math.min(y0, y1))), stripL, Math.abs(py(y1) - py(y0))); }
    }
    ctx.save(); ctx.translate(L - stripL - 22, (T + B) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('f_Y(y)', 0, 0); ctx.restore();
    // guide lines for interior edges
    ctx.strokeStyle = '#d9c4b6'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    edges.forEach(e => { const y = tf.g(e); if (y > ya && y < yb) { ctx.beginPath(); ctx.moveTo(px(e), B); ctx.lineTo(px(e), py(y)); ctx.lineTo(L, py(y)); ctx.stroke(); } });
    ctx.setLineDash([]);
  }

  // readout
  const rx = R + 34; let ry = T + 20; ctx.textAlign = 'left';
  const line = (a, b, col = INK) => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 14px system-ui'; ctx.fillText(b, rx, ry + 18); ry += 44; };
  const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + 4 + i * 17)); };
  if (o.showFY) {
    line('change of variables', 'f_Y(y) = f_X(x)/|g′(x)|', rgb(...BLUE));
    note(['Each shaded band holds the', 'same probability. Where the', 'curve is steep the band', 'stretches → density thins;', 'where it is flat it piles up.']);
  } else {
    line('the question', 'Y = g(X), so f_Y = ?');
    note(['A band of width dx under f_X', 'carries mass f_X(x)·dx. It maps', 'to a band of width dy = g′(x)·dx.', 'Same mass, new width — so the', 'height must rescale.']);
  }
}

function draw2D(ctx, c, st, o) {
  const size = Math.min(c.height - 150, (c.width - 320) / 2 - 30);
  const gap = 66, T = 40;
  const L1 = 46, L2 = L1 + size + gap;
  const mp = (L, wx, wy) => [L + (wx + W2) / (2 * W2) * size, T + size - (wy + W2) / (2 * W2) * size];
  const g = o.mode === 'nonlin2d' || o.mode === 'density2d' ? nlMap : linMap;
  const N = 12;                         // grid lines
  const step = 2 * W2 / N;

  // panel frames + titles
  [[L1, 'input plane  (x₁, x₂)'], [L2, 'output plane  (y₁, y₂)']].forEach(([L, t]) => {
    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(t, L + size / 2, T - 12);
  });

  // input grid (plain)
  ctx.strokeStyle = '#e9e9e9'; ctx.lineWidth = 1;
  for (let k = 0; k <= N; k++) {
    ctx.beginPath(); let p = mp(L1, -W2 + k * step, -W2); ctx.moveTo(p[0], p[1]); p = mp(L1, -W2 + k * step, W2); ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.beginPath(); p = mp(L1, -W2, -W2 + k * step); ctx.moveTo(p[0], p[1]); p = mp(L1, W2, -W2 + k * step); ctx.lineTo(p[0], p[1]); ctx.stroke();
  }

  // output: deformed grid (+ det heatmap for nonlinear)
  if (o.mode === 'nonlin2d') {
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x1 = -W2 + i * step, x2 = -W2 + j * step;
      const c0 = mp(L2, ...nlMap(x1, x2)), c1 = mp(L2, ...nlMap(x1 + step, x2)), c2 = mp(L2, ...nlMap(x1 + step, x2 + step)), c3 = mp(L2, ...nlMap(x1, x2 + step));
      ctx.fillStyle = detColor(nlDet(x1 + step / 2, x2 + step / 2));
      ctx.beginPath(); ctx.moveTo(...c0); ctx.lineTo(...c1); ctx.lineTo(...c2); ctx.lineTo(...c3); ctx.closePath(); ctx.fill();
    }
  }
  ctx.strokeStyle = o.mode === 'nonlin2d' ? 'rgba(120,120,120,0.35)' : '#c8d6e8'; ctx.lineWidth = 1;
  for (let k = 0; k <= N; k++) {
    const v = -W2 + k * step;
    ctx.beginPath(); for (let s = 0; s <= 40; s++) { const u = -W2 + 2 * W2 * s / 40; const p = mp(L2, ...g(v, u)); s ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.stroke();
    ctx.beginPath(); for (let s = 0; s <= 40; s++) { const u = -W2 + 2 * W2 * s / 40; const p = mp(L2, ...g(u, v)); s ? ctx.lineTo(...p) : ctx.moveTo(...p); } ctx.stroke();
  }

  // linear: highlight the unit square → parallelogram
  if (o.mode === 'linear2d') {
    const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
    ctx.fillStyle = 'rgba(46,125,50,0.18)'; ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
    ctx.beginPath(); sq.forEach((s, i) => { const p = mp(L1, s[0], s[1]); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); sq.forEach((s, i) => { const p = mp(L2, ...linMap(s[0], s[1])); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); ctx.closePath(); ctx.fill(); ctx.stroke();
    // basis vectors as columns of A (from origin)
    if (o.basis) {
      const o0 = mp(L2, 0, 0);
      [[A[0][0], A[1][0], 'col 1'], [A[0][1], A[1][1], 'col 2']].forEach(([vx, vy, lab]) => {
        const p = mp(L2, vx, vy); ctx.strokeStyle = ORANGE_HEX; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(...o0); ctx.lineTo(...p); ctx.stroke();
        ctx.fillStyle = ORANGE_HEX; ctx.font = '11px system-ui'; ctx.fillText(lab, p[0] + 4, p[1] - 4);
      });
    }
  }

  // density clouds (step 6): push a Gaussian through g
  if (o.mode === 'density2d') {
    const r = mulberry(7); const cx = 0.4, cy = 0.4, sd = 0.6;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 700; i++) {
      const x1 = cx + sd * gauss(r), x2 = cy + sd * gauss(r);
      if (Math.abs(x1) > W2 || Math.abs(x2) > W2) continue;
      ctx.fillStyle = '#455a64'; let p = mp(L1, x1, x2); ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgb(...BLUE); p = mp(L2, ...nlMap(x1, x2)); ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // readout
  const rx = L2 + size + 34; let ry = T + 8; ctx.textAlign = 'left';
  const line = (a, b, col = INK) => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 14px system-ui'; ctx.fillText(b, rx, ry + 18); ry += 44; };
  const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + 4 + i * 16)); };
  if (o.mode === 'linear2d') {
    line('Jacobian J', o.basis ? 'columns = images of ê₁, ê₂' : '[[1.25, 0.55], [−0.2, 0.95]]', rgb(...BLUE));
    if (o.det) line('area factor  |det J|', detA.toFixed(2), GREEN);
    note(o.det ? ['The green unit square (area 1)', 'becomes a parallelogram of', 'area |det J| ≈ 1.30. Every cell', 'scales by the same factor —', 'a linear map is uniform.'] : ['Near any point a smooth map', 'looks linear: dy = J·dx. The', 'columns of J are where the two', 'unit arrows are sent.']);
  } else if (o.mode === 'nonlin2d') {
    line('Jacobian is local', 'J = J(x), so |det J| varies', rgb(...BLUE));
    note(['Colour = local |det J|: blue', 'where area expands (>1),', 'orange where it compresses', '(<1). Each little cell scales', 'by its own local factor.']);
  } else {
    line('change of variables', 'f_Y(y) = f_X(x)/|det J|', rgb(...BLUE));
    note(['Push a Gaussian cloud through', 'g. Where the map compresses', 'area the points bunch up —', 'higher density; where it', 'expands they spread — lower.', 'Probability is conserved.']);
  }
}

// small RNG for the cloud
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const ORANGE_HEX = 'rgb(232,113,10)';

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function tfButtons(st) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  Object.entries(TF).forEach(([key, tf]) => {
    const b = document.createElement('button'); b.textContent = tf.label;
    const paint = () => { wrap.querySelectorAll('button').forEach((btn, i) => { const on = Object.keys(TF)[i] === st.tf; btn.style.cssText = `padding:5px 9px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; }); };
    b.addEventListener('click', () => { st.tf = key; paint(); });
    wrap.appendChild(b); if (key === st.tf) setTimeout(paint, 0);
  });
  st._controls.appendChild(wrap);
  wrap.querySelectorAll('button').forEach((btn, i) => { const on = Object.keys(TF)[i] === st.tf; btn.style.cssText = `padding:5px 9px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Change of Variables & the Jacobian',
  subject: 'Probability',
  initState() { return { tf: 'exp', _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:11px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'Transforming a random variable',
      description: 'Suppose $X$ has a known density and we form $Y = g(X)$. What is the density of $Y$? The one rule that fixes the answer is conservation of probability: the chance that $X$ lands in a tiny interval must equal the chance that $Y$ lands in the image of that interval.',
      equation: 'P(x < X < x+dx) = P(y < Y < y+dy)',
      notes: 'A sliver of width $dx$ under $f_X$ carries mass $f_X(x)\\,dx$. The map sends it to a sliver of width $dy = g\'(x)\\,dx$. The mass is the same — so if the width changed, the height must change to compensate.',
      setup(c2d, st) { st.tf = 'exp'; clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: '1d', showFY: false }); },
    },
    {
      title: '1D: divide by the slope',
      description: 'Equating the two masses $f_Y(y)\\,dy = f_X(x)\\,dx$ and using $dy = g\'(x)\\,dx$ gives the change-of-variables formula: $f_Y(y) = f_X(x)/|g\'(x)|$, with $x = g^{-1}(y)$. Where $g$ is steep the density is stretched thin; where $g$ is flat it piles up.',
      equation: 'f_Y(y) = f_X(x)\\,\\Big|\\tfrac{dx}{dy}\\Big| = \\frac{f_X(x)}{|g\'(x)|}',
      notes: 'Each shaded band holds equal probability. Switch the transform: the linear map just rescales uniformly; the exponential stretches large values (a log-normal); the cubic compresses the middle and stretches the tails.\n\nThe absolute value is there because only the size of the stretch matters, not its direction.',
      setup(c2d, st) { clearControls(st); tfButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: '1d', showFY: true }); },
    },
    {
      title: 'Into 2D: the Jacobian matrix',
      description: 'With two variables, $g$ maps the plane to the plane and warps a grid. Near any point the map is approximately linear, $d\\mathbf{y} = J\\,d\\mathbf{x}$, where the Jacobian $J$ collects the partial derivatives. Its columns are exactly where the two unit arrows $\\hat{e}_1, \\hat{e}_2$ get sent.',
      equation: 'J = \\begin{bmatrix} \\partial y_1/\\partial x_1 & \\partial y_1/\\partial x_2 \\\\ \\partial y_2/\\partial x_1 & \\partial y_2/\\partial x_2 \\end{bmatrix}',
      notes: 'For a linear map the Jacobian is the same matrix everywhere. The grid on the right is the input grid pushed through $g$; the orange arrows are the columns of $J$ — the images of the unit vectors that span each little cell.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'linear2d', basis: true }); },
    },
    {
      title: '|det J| is the area-scaling factor',
      description: 'The unit square is spanned by $\\hat{e}_1, \\hat{e}_2$; after the map it is the parallelogram spanned by the columns of $J$. The area of that parallelogram — relative to the original — is exactly $|\\det J|$. That single number is how much the map locally stretches or shrinks area.',
      equation: '\\text{area}(g(\\text{cell})) = |\\det J|\\,\\cdot\\,\\text{area}(\\text{cell})',
      notes: 'The green unit square (area 1) becomes a parallelogram of area $|\\det J| \\approx 1.30$. For this linear map every cell scales by the same 1.30 — a linear transformation stretches area uniformly across the whole plane.\n\nThis is the same determinant you met in linear algebra, now doing a job in probability.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'linear2d', det: true }); },
    },
    {
      title: 'Nonlinear maps: the Jacobian is local',
      description: 'When $g$ is nonlinear the Jacobian depends on where you are, so $|\\det J|$ changes from point to point. Some regions of the plane are expanded, others compressed. Each little cell of the grid scales by its own local $|\\det J|$.',
      equation: '\\det J(\\mathbf{x}) \\ \\text{varies with position } \\mathbf{x}',
      notes: 'The colour is the local area factor: blue where the map expands area ($|\\det J| > 1$), orange where it compresses it ($< 1$). You can see the grid cells grow and shrink to match.\n\nA linear map has one determinant; a curved map has a determinant field.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'nonlin2d' }); },
    },
    {
      title: 'Change of variables for densities',
      description: 'Putting it together: to conserve probability in the plane, divide the density by the local area factor. $f_Y(\\mathbf{y}) = f_X(\\mathbf{x})/|\\det J|$. Where the map compresses area the density concentrates; where it expands, the density dilutes — exactly as in 1D, with $|\\det J|$ playing the role of $|g\'(x)|$.',
      equation: 'f_Y(\\mathbf{y}) = \\frac{f_X(\\mathbf{x})}{|\\det J|}, \\qquad \\mathbf{x} = g^{-1}(\\mathbf{y})',
      notes: 'A Gaussian cloud is pushed through the nonlinear map. Watch the points bunch together where area shrinks (higher density) and spread out where it grows (lower density). The number of points — the probability — is conserved throughout.\n\nThis is the multivariate change-of-variables theorem, and it is what lets you derive densities for transformed random vectors.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'density2d' }); },
    },
  ],
};
