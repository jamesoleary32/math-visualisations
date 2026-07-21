// Marginal distributions — reading one variable out of a joint.
// Blitzstein & Hwang, Chapter 7 (Joint Distributions).
//
// The arc: a joint pmf is a table over (X, Y) summing to 1; the MARGINAL of X is
// the row sums (sum out Y), written literally in the margin — hence the name; the
// continuous analog integrates Y out; the crucial catch is that marginals do NOT
// determine the joint (same margins, wildly different dependence); and equality of
// joint with the product of marginals is exactly independence.
//
// Running example: X = today's weather (Sunny/Cloudy/Rainy), Y = did you take an
// umbrella (No/Yes). All sums / correlations computed from the real tables.

// ── Joint pmf: weather × umbrella (rows X, cols Y), sums to 1 ──────────────────
const J = [
  [0.30, 0.05],   // Sunny:  No, Yes
  [0.20, 0.15],   // Cloudy
  [0.03, 0.27],   // Rainy
];
const XSHORT = ['S', 'C', 'R'], XFULL = ['Sunny', 'Cloudy', 'Rainy'];
const XCOL = ['#f5a623', '#78909c', '#1565c0'];
const YLAB = ['No umb.', 'Umbrella'], YCOL = ['#b0b0b0', '#2e7d32'];

const rowSums = M => M.map(r => r.reduce((a, b) => a + b, 0));
const colSums = M => M[0].map((_, j) => M.reduce((a, r) => a + r[j], 0));

// ── Colour ──────────────────────────────────────────────────────────────────
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const BLUE = '#1565c0', GREEN = '#2e7d32', RED = '#c62828', GREY = '#999';

// ── Joint table with marginal bars in the margins ─────────────────────────────
function jointTable(ctx, x, y, cell, M, rShort, rCol, cLab, cCol, opts = {}) {
  const nr = M.length, nc = M[0].length, cmax = opts.cmax || 0.32, MAXM = opts.maxm || 0.6;
  const rs = rowSums(M), cs = colSums(M);
  ctx.textBaseline = 'middle';

  // column headers
  ctx.font = '600 11px system-ui'; ctx.textAlign = 'center';
  for (let j = 0; j < nc; j++) { ctx.fillStyle = cCol[j]; ctx.fillText(cLab[j], x + cell / 2 + j * cell, y - 13); }

  // cells + row labels
  for (let i = 0; i < nr; i++) {
    ctx.fillStyle = rCol[i]; ctx.textAlign = 'right'; ctx.font = '600 12px system-ui'; ctx.fillText(rShort[i], x - 9, y + cell / 2 + i * cell);
    ctx.textAlign = 'center'; ctx.font = '11.5px system-ui';
    for (let j = 0; j < nc; j++) {
      const v = M[i][j], t = Math.min(1, v / cmax);
      ctx.fillStyle = v > 0 ? hexA(BLUE, 0.10 + 0.72 * t) : '#f7f7f7';
      ctx.fillRect(x + j * cell, y + i * cell, cell - 2, cell - 2);
      ctx.fillStyle = t > 0.6 ? '#fff' : '#274b73';
      ctx.fillText(v.toFixed(2), x + j * cell + cell / 2, y + i * cell + cell / 2);
    }
  }
  if (opts.row !== undefined) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y + opts.row * cell - 1, nc * cell, cell); }
  if (opts.col !== undefined) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.strokeRect(x + opts.col * cell - 1, y - 1, cell, nr * cell); }

  // marginal of X = row sums, drawn to the right
  if (opts.rowMargin) {
    const bx = x + nc * cell + 20, bw = 74;
    ctx.fillStyle = GREY; ctx.font = '10.5px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('P(X)  = Σ row', bx, y - 8);
    ctx.textBaseline = 'middle';
    for (let i = 0; i < nr; i++) {
      const L = bw * rs[i] / MAXM, by = y + i * cell;
      ctx.fillStyle = hexA(rCol[i], opts.row === i || opts.row === undefined ? 0.85 : 0.3); ctx.fillRect(bx, by + cell * 0.18, L, cell * 0.64);
      ctx.fillStyle = '#555'; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText(rs[i].toFixed(2), bx + L + 5, by + cell / 2);
    }
  }
  // marginal of Y = column sums, drawn below
  if (opts.colMargin) {
    const by = y + nr * cell + 20, bh = 46;
    ctx.fillStyle = GREY; ctx.font = '10.5px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('P(Y) = Σ col', x - 9, by + bh / 2);
    for (let j = 0; j < nc; j++) {
      const H = bh * cs[j] / MAXM, bx = x + j * cell;
      ctx.fillStyle = hexA(cCol[j], opts.col === j || opts.col === undefined ? 0.85 : 0.3); ctx.fillRect(bx + cell * 0.18, by, cell * 0.64, H);
      ctx.fillStyle = '#555'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(cs[j].toFixed(2), bx + cell / 2, by + H + 12);
    }
  }
}

// ── Continuous joint: bivariate normal density + marginal bells ───────────────
function gauss2(x, y, rho) { const z = (x * x - 2 * rho * x * y + y * y) / (1 - rho * rho); return Math.exp(-0.5 * z) / (2 * Math.PI * Math.sqrt(1 - rho * rho)); }
const stdnorm = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

function continuousJoint(ctx, x0, y0, size, rho) {
  const N = 44, cell = size / N, LO = -3, HI = 3, span = HI - LO;
  let vmax = 0; const grid = [];
  for (let i = 0; i < N; i++) { grid.push([]); for (let j = 0; j < N; j++) { const xv = LO + (j + 0.5) / N * span, yv = HI - (i + 0.5) / N * span; const v = gauss2(xv, yv, rho); grid[i].push(v); vmax = Math.max(vmax, v); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { ctx.fillStyle = hexA(BLUE, 0.05 + 0.9 * grid[i][j] / vmax); ctx.fillRect(x0 + j * cell, y0 + i * cell, cell + 0.6, cell + 0.6); }
  ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, size, size);
  // marginal of X (a standard normal) as a bell along the TOP
  const px = xv => x0 + (xv - LO) / span * size, topH = 44;
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 0; k <= 100; k++) { const xv = LO + k / 100 * span, Y = y0 - 8 - stdnorm(xv) / stdnorm(0) * topH; k ? ctx.lineTo(px(xv), Y) : ctx.moveTo(px(xv), Y); }
  ctx.stroke();
  ctx.fillStyle = GREEN; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText('f_X (marginal of X)', x0, y0 - 8 - topH - 4);
  // marginal of Y as a bell along the RIGHT
  const py = yv => y0 + (HI - yv) / span * size, rightW = 44;
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2; ctx.beginPath();
  for (let k = 0; k <= 100; k++) { const yv = LO + k / 100 * span, X = x0 + size + 8 + stdnorm(yv) / stdnorm(0) * rightW; k ? ctx.lineTo(X, py(yv)) : ctx.moveTo(X, py(yv)); }
  ctx.stroke();
  ctx.save(); ctx.translate(x0 + size + 8 + rightW + 14, y0 + size / 2); ctx.rotate(Math.PI / 2); ctx.fillStyle = GREEN; ctx.textAlign = 'center'; ctx.fillText('f_Y (marginal of Y)', 0, 0); ctx.restore();
}

// ── 2×2 with fixed margins (dependence slider) ────────────────────────────────
// pX = pY = 0.5, t = P(X=yes, Y=yes) ∈ [0, 0.5]. corr = 4t − 1.
function table2(t) { return [[t, 0.5 - t], [0.5 - t, t]]; }

// ── Draw ───────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const line = (rx, ryObj, a, b, col = '#333') => { ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = GREY; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ryObj.y); ctx.fillStyle = col; ctx.font = '600 15px system-ui'; ctx.fillText(b, rx, ryObj.y + 19); ryObj.y += 44; };
    const note = (rx, ry, ls) => { ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = GREY; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };

    if (o.mode === 'joint' || o.mode === 'marginal') {
      const cell = 62, tx = 130, ty = c.height * 0.30;
      const showM = o.mode === 'marginal';
      jointTable(ctx, tx, ty, cell, J, XSHORT, XCOL, YLAB, YCOL, { rowMargin: showM, colMargin: showM, row: showM ? st.row : undefined, cmax: 0.32 });
      // full X names legend under labels
      ctx.font = '10.5px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let i = 0; i < 3; i++) { ctx.fillStyle = XCOL[i]; ctx.fillText(XFULL[i], tx - 26, ty + cell / 2 + i * cell); }
      const rx = tx + 2 * cell + (showM ? 190 : 40), ry = { y: 66 };
      if (o.mode === 'joint') {
        line(rx, ry, 'joint total', J.flat().reduce((a, b) => a + b, 0).toFixed(2), GREEN);
        note(rx, ry.y, ['Every (weather, umbrella) pair', 'has a probability. The six cells', 'are the JOINT distribution and', 'they sum to 1. Dependence lives', 'here: rainy days pair with the', 'umbrella, sunny days with none.']);
      } else {
        line(rx, ry, 'summing row', XFULL[st.row], XCOL[st.row]);
        line(rx, ry, 'gives P(X=' + XFULL[st.row] + ')', rowSums(J)[st.row].toFixed(2), BLUE);
        note(rx, ry.y, ['The MARGINAL of X ignores Y:', 'add across the row to collapse', 'umbrella away. Written in the', 'right margin — literally where', 'the name comes from. Column sums', 'below give the marginal of Y.']);
      }
    }

    else if (o.mode === 'continuous') {
      const size = Math.min(c.height * 0.5, c.width * 0.42), x0 = 150, y0 = c.height * 0.30;
      continuousJoint(ctx, x0, y0, size, st.rho);
      const rx = x0 + size + 110, ry = { y: 70 };
      line(rx, ry, 'correlation ρ', st.rho.toFixed(2), BLUE);
      line(rx, ry, 'each marginal', 'N(0, 1)', GREEN);
      note(rx, ry.y, ['Continuous joints marginalise by', 'INTEGRATING the other variable', 'out: f_X(x) = ∫ f(x,y) dy — the', 'green bells are those integrals.', '', 'Drag ρ: the joint tilts and', 'stretches, yet both marginals', 'stay exactly N(0,1). The', 'marginals cannot see ρ at all.']);
    }

    else if (o.mode === 'ambiguity') {
      const M = table2(st.t), cell = 66, tx = 150, ty = c.height * 0.30;
      const corr = 4 * st.t - 1;
      jointTable(ctx, tx, ty, cell, M, ['Rain', 'Dry'], ['#1565c0', '#b0b0b0'], ['Umb.', 'No umb.'], ['#2e7d32', '#b0b0b0'], { rowMargin: true, colMargin: true, cmax: 0.5, maxm: 0.6 });
      const rx = tx + 2 * cell + 190, ry = { y: 66 };
      line(rx, ry, 'both margins', '0.5, 0.5  (fixed)', GREEN);
      line(rx, ry, 'correlation', corr.toFixed(2), Math.abs(corr) < 0.05 ? GREY : corr > 0 ? BLUE : RED);
      const kind = Math.abs(corr) < 0.05 ? 'independent' : corr > 0 ? 'positively dependent' : 'negatively dependent';
      line(rx, ry, 'so X, Y are', kind, Math.abs(corr) < 0.05 ? GREY : corr > 0 ? BLUE : RED);
      note(rx, ry.y, ['Drag the interior. The four cells', 'change from anti-aligned to', 'aligned, but the margins never', 'move. Same marginals, a whole', 'family of joints — so marginals', 'do NOT determine the joint. The', 'dependence is information they', 'throw away.']);
    }

    else if (o.mode === 'independence') {
      const rs = rowSums(J), cs = colSums(J);
      const prod = rs.map(r => cs.map(cl => r * cl));   // product-of-marginals joint
      const cell = 52, ty = c.height * 0.28;
      const tx1 = 120, tx2 = tx1 + 2 * cell + 150;
      // actual joint
      ctx.fillStyle = '#666'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('actual joint', tx1 + cell, ty - 30);
      jointTable(ctx, tx1, ty, cell, J, XSHORT, XCOL, YLAB, YCOL, { cmax: 0.32 });
      // product of marginals
      ctx.fillStyle = '#666'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('P(X)·P(Y)', tx2 + cell, ty - 30);
      jointTable(ctx, tx2, ty, cell, prod, XSHORT, XCOL, YLAB, YCOL, { cmax: 0.32 });
      // biggest discrepancy
      let dmax = 0, di = 0, dj = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const d = Math.abs(J[i][j] - prod[i][j]); if (d > dmax) { dmax = d; di = i; dj = j; } }
      const rx = tx1, ry = ty + 3 * cell + 24;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#555'; ctx.font = '12.5px system-ui';
      ctx.fillText(`largest gap at (${XFULL[di]}, ${YLAB[dj]}): actual ${J[di][dj].toFixed(2)} vs product ${prod[di][dj].toFixed(2)}`, rx, ry);
      ctx.fillStyle = RED; ctx.font = '12.5px system-ui';
      ctx.fillText('the two tables differ → weather and umbrella are NOT independent', rx, ry + 18);
      const rxr = tx2 + 2 * cell + 40, ryo = { y: 70 };
      line(rxr, ryo, 'independence', 'P(x,y)=P(x)P(y)', GREEN);
      note(rxr, ryo.y, ['Marginals fix the joint in ONE', 'case: independence, where the', 'joint is exactly the product of', 'the margins. Here the product', 'table differs from the actual', 'joint, so X and Y are dependent —', 'the marginals alone could never', 'have told you that.']);
    }
  });
}

// ── Controls ────────────────────────────────────────────────────────────────
function clear(st) { if (st._controls) st._controls.innerHTML = ''; }
function button(label, onClick) { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'padding:6px 11px;font-size:12px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;'; b.addEventListener('click', onClick); return b; }
function buttonRow(st, buttons) { const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;'; buttons.forEach(b => w.appendChild(b)); st._controls.appendChild(w); }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'mg-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}
const f2 = v => v.toFixed(2);

// ── Lesson ───────────────────────────────────────────────────────────────────
export default {
  title:   'Marginal Distributions',
  subject: 'Probability',
  initState() { return { row: 2, rho: 0.6, t: 0.25, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'A joint distribution',
      description: 'When two random variables live together, their $\\textbf{joint distribution}$ gives the probability of every combined outcome. Here $X$ is the weather and $Y$ is whether you took an umbrella. The six cells are the joint pmf $P(X=x, Y=y)$, and — like any distribution — they sum to 1.',
      equation: 'P(X=x,\\, Y=y) \\ge 0, \\qquad \\sum_{x}\\sum_{y} P(x,y) = 1',
      notes: 'The joint is the full picture: it encodes not just how often it rains and how often you carry an umbrella, but how those two move together. Notice the mass concentrating on (Sunny, no umbrella) and (Rainy, umbrella) — that co-movement is dependence, and it lives inside the joint.',
      setup(c2d, st) { clear(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'joint' }); },
    },
    {
      title: 'A marginal is a row (or column) sum',
      description: 'To get the distribution of $X$ $\\textbf{alone}$, ignore $Y$: add up each row of the joint. That is the $\\textbf{marginal}$ $P_X(x) = \\sum_y P(x,y)$ — you "sum out" $Y$. The answers, written down the right-hand $\\textbf{margin}$ of the table, are exactly where the name comes from.',
      equation: 'P_X(x) = \\sum_{y} P(x,y), \\qquad P_Y(y) = \\sum_{x} P(x,y)',
      notes: 'Step through the rows: each row collapses to a single number in the margin — the chance of that weather, umbrella forgotten. Column sums along the bottom give the marginal of Y. Both marginals are themselves valid distributions (each sums to 1).',
      setup(c2d, st) { st.row = 2; clear(st); buttonRow(st, [button('◄ row', () => st.row = (st.row + 2) % 3), button('row ►', () => st.row = (st.row + 1) % 3)]); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'marginal' }); },
    },
    {
      title: 'Continuous: integrate the other out',
      description: 'For continuous variables the sum becomes an integral. Given a joint density $f_{X,Y}(x,y)$, the marginal of $X$ is $f_X(x) = \\int f_{X,Y}(x,y)\\,dy$ — you $\\textbf{integrate out}$ $Y$. Here is a bivariate normal; the green bells on the axes are its two marginals, both standard normal.',
      equation: 'f_X(x) = \\int_{-\\infty}^{\\infty} f_{X,Y}(x,y)\\, dy',
      notes: 'Drag the correlation ρ. The joint density tilts and squeezes along a diagonal — its shape changes completely — yet both marginal bells stay exactly N(0,1). The marginals are blind to ρ. That is the whole tension of the next step.',
      setup(c2d, st) { st.rho = 0.6; clear(st); addSlider(st, 'correlation ρ', -0.9, 0.9, 0.05, () => st.rho, v => st.rho = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'continuous' }); },
    },
    {
      title: 'Marginals do not determine the joint',
      description: 'This is the essential catch. Going from joint to marginals $\\textbf{loses information}$ — the dependence. Two variables can have $\\textbf{identical}$ marginals and yet completely different joints. Below, both margins are fixed at $(0.5, 0.5)$; drag the interior and watch the correlation swing from $-1$ to $+1$ while the margins never budge.',
      equation: '\\text{same } P_X,\\, P_Y \\;\\;\\not\\Rightarrow\\;\\; \\text{same } P(x,y)',
      notes: 'At the middle the cells are all 0.25 — independence, ρ = 0. Slide toward one diagonal and rain always coincides with the umbrella (ρ → +1); toward the other and they never coincide (ρ → −1). The marginals are the same in every case. So knowing both marginals is genuinely not enough to know the joint.',
      setup(c2d, st) { st.t = 0.25; clear(st); addSlider(st, 'P(Rain, Umbrella)', 0, 0.5, 0.01, () => st.t, v => st.t = v, f2); buttonRow(st, [button('anti (−1)', () => st.t = 0), button('independent', () => st.t = 0.25), button('aligned (+1)', () => st.t = 0.5)]); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'ambiguity' }); },
    },
    {
      title: 'When marginals are enough: independence',
      description: 'There is exactly one case where the marginals $\\textbf{do}$ rebuild the joint: $\\textbf{independence}$. $X$ and $Y$ are independent precisely when the joint factors into the product of the marginals, $P(x,y) = P_X(x)\\,P_Y(y)$, for every cell. Compare the actual joint with that product below.',
      equation: 'X \\perp Y \\iff P(x,y) = P_X(x)\\,P_Y(y)\\ \\ \\forall x,y',
      notes: 'The right table is what the joint WOULD be if weather and umbrella were independent — just the outer product of the two marginals. It disagrees with the actual joint (rainy-with-umbrella is far more likely than the product predicts), so these variables are dependent.\n\nOnly under independence do the marginals carry the whole story; otherwise the joint holds strictly more.',
      setup(c2d, st) { clear(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'independence' }); },
    },
  ],
};
