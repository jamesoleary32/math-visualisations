// Convolution: the density of a sum T = X + Y of independent random variables.
// Blitzstein & Hwang, Chapter 8 (Transformations), Theorem 8.2.1.
//
// Two geometric pictures for the same formula:
//   discrete — the joint PMF is an outer-product grid P(X=x)P(Y=y); P(T=t) is the
//   sum of the grid along the anti-diagonal x + y = t.
//   continuous — f_T(t) = ∫ f_X(x) f_Y(t−x) dx is "flip f_Y, slide it to t, and
//   integrate the overlap with f_X". Sliding traces out f_T.
//
// PMFs/PDFs and the resulting convolution are computed exactly (uniform⊛uniform is
// the exact triangle; normal⊛normal is the exact wider normal).

// ── Discrete example: two short PMFs on {0,1,2,3} ─────────────────────────────
const PX = [0.10, 0.40, 0.30, 0.20];
const PY = [0.30, 0.30, 0.20, 0.20];
const NT = PX.length + PY.length - 1;            // support of T = 0..6
function convD(a, b) { const out = new Array(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]; return out; }
const PT = convD(PX, PY);
const maxJoint = Math.max(...PX.flatMap(px => PY.map(py => px * py)));

// ── Continuous densities ──────────────────────────────────────────────────────
const SQ2PI = Math.sqrt(2 * Math.PI);
const nrm = (x, m, s) => Math.exp(-(((x - m) / s) ** 2) / 2) / (s * SQ2PI);
const KIND = {
  uniform: {
    label: 'uniform',
    fX: x => (x >= 0 && x <= 1 ? 1 : 0),
    fY: x => (x >= 0 && x <= 1 ? 1 : 0),
    fT: t => Math.max(0, Math.min(1, t) - Math.max(0, t - 1)),  // triangle on [0,2]
    ymax: 1.35,
  },
  normal: {
    label: 'normal',
    fX: x => nrm(x, 0.5, 0.28),
    fY: x => nrm(x, 0.5, 0.28),
    fT: t => nrm(t, 1.0, Math.sqrt(2) * 0.28),                  // N(1, 2·0.28²)
    ymax: 1.6,
  },
};

// ── Colour ──────────────────────────────────────────────────────────────────
const BLUE = [21, 101, 192], ORANGE = [232, 113, 10], GREEN = '#2e7d32', INK = '#37474f';
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => (o.mode === 'grid' ? drawGrid(ctx, c, st, o) : drawSlide(ctx, c, st, o)));
}

function drawGrid(ctx, c, st, o) {
  const t = st.tg;
  const cell = Math.min(64, (Math.min(c.height, c.width * 0.5) - 120) / PX.length);
  const gx = 78, gy = 60, gsz = PX.length * cell;

  // cells (x = column, y = row; y increases upward)
  for (let x = 0; x < PX.length; x++) for (let y = 0; y < PY.length; y++) {
    const j = PX[x] * PY[y];
    const cx = gx + x * cell, cy = gy + (PY.length - 1 - y) * cell;
    ctx.fillStyle = rgb(BLUE, 0.12 + 0.8 * (j / maxJoint));
    ctx.fillRect(cx, cy, cell - 1, cell - 1);
    if (x + y === t) { ctx.strokeStyle = GREEN; ctx.lineWidth = 2.4; ctx.strokeRect(cx + 1, cy + 1, cell - 3, cell - 3); }
  }
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(gx - 0.5, gy - 0.5, gsz, gsz);
  // axis labels
  ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  for (let x = 0; x < PX.length; x++) ctx.fillText(String(x), gx + x * cell + cell / 2, gy + gsz + 16);
  ctx.fillText('x  (value of X)', gx + gsz / 2, gy + gsz + 34);
  ctx.textAlign = 'right';
  for (let y = 0; y < PY.length; y++) ctx.fillText(String(y), gx - 8, gy + (PY.length - 1 - y) * cell + cell / 2 + 4);
  ctx.save(); ctx.translate(gx - 40, gy + gsz / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('y  (value of Y)', 0, 0); ctx.restore();
  // diagonal label
  ctx.fillStyle = GREEN; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(`x + y = ${t}`, gx + gsz - 4, gy - 14);

  // T bar chart on the right
  const bx = gx + gsz + 70, bw = 26, bh = 150, by = gy + gsz;
  const pmax = Math.max(...PT);
  ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('PMF of  T = X + Y', bx + NT * bw / 2, gy - 14);
  for (let k = 0; k < NT; k++) {
    const h = PT[k] / pmax * bh, x0 = bx + k * bw;
    ctx.fillStyle = k === t ? GREEN : rgb(BLUE, 0.55);
    ctx.fillRect(x0, by - h, bw - 4, h);
    ctx.fillStyle = k === t ? GREEN : '#aaa'; ctx.font = k === t ? '600 11px system-ui' : '11px system-ui';
    ctx.fillText(String(k), x0 + (bw - 4) / 2, by + 15);
  }
  ctx.strokeStyle = '#e2e2e2'; ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.lineTo(bx + NT * bw, by); ctx.stroke();

  // readout
  const rx = bx; let ry = by + 44; ctx.textAlign = 'left';
  ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(`P(T = ${t})  =  sum along the diagonal`, rx, ry);
  ctx.fillStyle = GREEN; ctx.font = 'bold 17px system-ui'; ctx.fillText(PT[t].toFixed(3), rx, ry + 22);
  ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
  ['Each green cell is a way to make', `T = ${t}: a pair (x, y) with x+y = ${t}.`, 'Their joint probabilities sum to', 'the height of the green bar.'].forEach((l, i) => ctx.fillText(l, rx, ry + 46 + i * 16));
}

function drawSlide(ctx, c, st, o) {
  const K = KIND[st.kind], t = st.tc;
  const L = 60, T = 30, size = Math.min(c.height - 110, c.width - 300), R = L + size, B = T + size;
  const xa = -0.7, xb = 2.7, ya = 0, yb = K.ymax;
  const px = x => L + (x - xa) / (xb - xa) * size;
  const py = y => B - (y - ya) / (yb - ya) * size;

  // axes
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
  ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(L, py(0)); ctx.lineTo(R, py(0)); ctx.stroke();

  const curve = (fn, color, width) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); let s = false; for (let i = 0; i <= 300; i++) { const x = xa + (xb - xa) * i / 300; const Y = py(Math.min(yb, fn(x))); const X = px(x); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; } ctx.stroke(); };

  // overlap product (shaded) — its area is f_T(t)
  ctx.fillStyle = rgb([46, 125, 50], 0.28); ctx.beginPath(); ctx.moveTo(px(xa), py(0));
  for (let i = 0; i <= 300; i++) { const x = xa + (xb - xa) * i / 300; const prod = K.fX(x) * K.fY(t - x); ctx.lineTo(px(x), py(Math.min(yb, prod))); }
  ctx.lineTo(px(xb), py(0)); ctx.closePath(); ctx.fill();

  curve(K.fX, rgb(BLUE), 2.4);                       // f_X(x)
  curve(x => K.fY(t - x), rgb(ORANGE), 2.4);         // f_Y(t − x): flipped + shifted
  // f_T(t) traced across, current point
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath();
  for (let i = 0; i <= 300; i++) { const tt = xa + (xb - xa) * i / 300; const X = px(tt), Y = py(Math.min(yb, K.fT(tt))); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
  // current t marker
  ctx.strokeStyle = GREEN; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px(t), T); ctx.lineTo(px(t), B); ctx.stroke();
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(px(t), py(K.fT(t)), 5, 0, 6.28); ctx.fill();

  // legend
  ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
  ctx.fillStyle = rgb(BLUE); ctx.fillText('f_X(x)', px(0.05), py(K.fX(0.15)) - 8);
  ctx.fillStyle = rgb(ORANGE); ctx.fillText('f_Y(t − x)', px(t) - 66, T + 18);
  ctx.fillStyle = '#999'; ctx.fillText('f_T(t)', px(1) + 4, py(K.fT(1)) - 8);

  // readout
  const rx = R + 30; let ry = T + 20; ctx.textAlign = 'left';
  ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText('f_T(t) = ∫ f_X(x) f_Y(t−x) dx', rx, ry);
  ctx.fillStyle = rgb(BLUE); ctx.font = 'bold 15px system-ui'; ctx.fillText('= shaded overlap area', rx, ry + 20); ry += 52;
  ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(`t = ${t.toFixed(2)}`, rx, ry); ctx.fillStyle = GREEN; ctx.font = '600 14px system-ui'; ctx.fillText(`f_T(t) = ${K.fT(t).toFixed(3)}`, rx, ry + 18); ry += 46;
  ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
  ['Blue is fixed. Orange is f_Y', 'flipped left-to-right and slid to t.', 'Where they overlap, multiply and', 'add up (green) — that area is the', 'height of f_T at this t. Slide t and', 'the green dot traces the whole', 'grey curve.'].forEach((l, i) => ctx.fillText(l, rx, ry + i * 16));
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'cv-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}
function kindButtons(st) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;';
  Object.entries(KIND).forEach(([key, k]) => {
    const b = document.createElement('button'); b.textContent = k.label;
    const paint = () => wrap.querySelectorAll('button').forEach((btn, i) => { const on = Object.keys(KIND)[i] === st.kind; btn.style.cssText = `padding:5px 11px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; });
    b.addEventListener('click', () => { st.kind = key; paint(); });
    wrap.appendChild(b);
  });
  st._controls.appendChild(wrap);
  wrap.querySelectorAll('button').forEach((btn, i) => { const on = Object.keys(KIND)[i] === st.kind; btn.style.cssText = `padding:5px 11px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Convolution: the Sum of Two Random Variables',
  subject: 'Probability',
  initState() { return { tg: 3, tc: 0.8, kind: 'uniform', _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'T = X + Y: many ways to hit t',
      description: 'For independent $X$ and $Y$, what is the distribution of their sum $T = X + Y$? The event $T = t$ happens for every pair $(x, y)$ with $x + y = t$. On the grid of joint outcomes, those pairs lie on a single anti-diagonal line.',
      equation: 'P(T = t) = \\sum_{x+y=t} P(X=x)\\,P(Y=y)',
      notes: 'The grid shows the joint PMF: because $X$ and $Y$ are independent, cell $(x,y)$ has probability $P(X=x)P(Y=y)$ — an outer product (darker = more likely).\n\nThe green cells are every way to make $T = t$. Add their probabilities and you get $P(T=t)$ — the green bar on the right.',
      setup(c2d, st) { st.tg = 3; clearControls(st); addSlider(st, 'target sum t', 0, NT - 1, 1, () => st.tg, v => st.tg = v, v => String(v)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'grid' }); },
    },
    {
      title: 'Slide the diagonal → the whole PMF',
      description: 'Sweep $t$ and the anti-diagonal slides across the grid, sampling a different set of pairs each time. Collect the diagonal sums for every $t$ and you have the entire PMF of $T$ — here it fills in as a little hill. Summing a grid along its diagonals is exactly a convolution.',
      equation: 'P(T=t) = \\sum_{x} P(X=x)\\,P(Y=t-x)',
      notes: 'Notice the $t - x$: as you walk along the diagonal increasing $x$ by one, $y = t - x$ decreases by one. That opposing motion — one index up, the other down — is the signature of a convolution, and it is where the "flip" in the continuous version comes from.',
      setup(c2d, st) { clearControls(st); addSlider(st, 'target sum t', 0, NT - 1, 1, () => st.tg, v => st.tg = v, v => String(v)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'grid' }); },
    },
    {
      title: 'Continuous: flip and slide',
      description: 'For continuous variables the sum turns into an integral: $f_T(t) = \\int f_X(x)\\,f_Y(t-x)\\,dx$. Read it geometrically: take $f_Y$, flip it left-to-right, slide it so its origin sits at $t$, multiply it point-by-point with $f_X$, and integrate. That overlap area is $f_T(t)$.',
      equation: 'f_T(t) = \\int_{-\\infty}^{\\infty} f_X(x)\\,f_Y(t-x)\\,dx',
      notes: 'Blue $f_X$ stays put; orange is $f_Y(t-x)$ — flipped and shifted to $t$. The green region is their product, and its area is the height of $f_T$ at this $t$ (the green dot on the grey curve).\n\nDrag $t$: the flipped copy slides right, the overlap grows then shrinks, and the dot traces out the whole density of the sum.',
      setup(c2d, st) { st.kind = 'uniform'; clearControls(st); addSlider(st, 'slide to t', -0.2, 2.4, 0.02, () => st.tc, v => st.tc = v, v => v.toFixed(2)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide' }); },
    },
    {
      title: 'Why the flip, and why sums smooth out',
      description: 'The flip is the continuous echo of the discrete $t-x$: to collect all pairs summing to $t$, one variable must run up while the other runs down, so $f_Y$ is reflected before sliding. And convolution always smooths: two flat uniforms convolve into a triangle; two normals convolve into a single wider normal.',
      equation: '\\text{Uniform} * \\text{Uniform} = \\text{Triangle}, \\qquad \\mathcal{N} * \\mathcal{N} = \\mathcal{N}',
      notes: 'Switch between uniform and normal and slide $t$. The uniform overlap is the length of the intersection of two boxes — a triangle peaking when they line up at $t = 1$. Two normals give a normal with the variances added ($\\sigma^2 = \\sigma_X^2 + \\sigma_Y^2$).\n\nThis is why sums of many independent pieces trend toward a bell — every convolution rounds the shape off a little more (the CLT, felt geometrically).',
      setup(c2d, st) { clearControls(st); kindButtons(st); addSlider(st, 'slide to t', -0.2, 2.4, 0.02, () => st.tc, v => st.tc = v, v => v.toFixed(2)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide' }); },
    },
  ],
};
