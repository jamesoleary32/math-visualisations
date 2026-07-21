// Markov chains — discrete-state, discrete-time.
// Blitzstein & Hwang, Chapter 11.
//
// The arc: the Markov (memoryless) property; the transition matrix as the whole
// chain (rows are conditional distributions, so each row sums to 1); a distribution
// over states evolves by π ↦ πP; a stationary distribution solves πP = π and is the
// long-run fraction of time spent in each state; convergence needs irreducibility +
// aperiodicity (a period-2 chain oscillates forever); and reversibility (detailed
// balance) gives a stationary π for free — the engine behind MCMC.
//
// The running chain is a 3-state birth-death "weather" chain (Sun–Cloud–Rain):
// irreducible, aperiodic, AND reversible, so one example carries the whole lesson.
// Stationary distribution and all evolutions are computed from the real matrix.

const STATES = ['Sunny', 'Cloudy', 'Rainy'];
const SHORT  = ['S', 'C', 'R'];
const COL    = ['#f5a623', '#78909c', '#1565c0'];   // sun / cloud / rain

// birth-death chain on a line: S ↔ C ↔ R (no direct S↔R). Rows sum to 1.
const P = [
  [0.7, 0.3, 0.0],
  [0.2, 0.5, 0.3],
  [0.0, 0.4, 0.6],
];

// period-2 counterexample for the convergence step
const PER = [[0, 1], [1, 0]];
const PER_STATES = ['A', 'B'];
const PER_COL = ['#e8710a', '#1565c0'];

// ── Math ────────────────────────────────────────────────────────────────────
function stepDist(dist, M) {          // row vector times matrix: out_j = Σ_i dist_i M_ij
  const n = M.length, out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[j] += dist[i] * M[i][j];
  return out;
}
function stationary(M, iters = 4000) {
  let d = new Array(M.length).fill(1 / M.length);
  for (let k = 0; k < iters; k++) d = stepDist(d, M);
  return d;
}
function samplePath(M, start, len) {
  let s = start; const path = [s];
  for (let k = 0; k < len; k++) {
    const r = Math.random(); let acc = 0, ns = s;
    for (let j = 0; j < M.length; j++) { acc += M[s][j]; if (r < acc) { ns = j; break; } }
    s = ns; path.push(s);
  }
  return path;
}

// ── Colour helper ─────────────────────────────────────────────────────────────
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

// ── Diagram primitives ──────────────────────────────────────────────────────
function drawNode(ctx, p, R, short, full, color, hi) {
  ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 6.283);
  ctx.fillStyle = hi ? hexA(color, 0.18) : '#fff'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = hi ? 3 : 1.8; ctx.stroke();
  ctx.fillStyle = color; ctx.font = '600 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(short, p.x, p.y);
  if (full) { ctx.fillStyle = '#999'; ctx.font = '11px system-ui'; ctx.fillText(full, p.x, p.y + R + 13); }
}

function arrowCurved(ctx, a, b, bend, label, color, R) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x - ux * R, ey = b.y - uy * R;
  const mx = (sx + ex) / 2, my = (sy + ey) / 2, nx = -uy, ny = ux;
  const cxp = mx + nx * bend, cyp = my + ny * bend;
  ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cxp, cyp, ex, ey); ctx.stroke();
  const aa = Math.atan2(ey - cyp, ex - cxp), hh = 8;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hh * Math.cos(aa - 0.4), ey - hh * Math.sin(aa - 0.4));
  ctx.lineTo(ex - hh * Math.cos(aa + 0.4), ey - hh * Math.sin(aa + 0.4)); ctx.fill();
  if (label) { ctx.fillStyle = color; ctx.font = '11.5px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cxp + nx * 9, cyp + ny * 9); }
}

function selfLoop(ctx, p, R, label, color) {
  const cx = p.x, cy = p.y - R - 12, r = 12;
  ctx.strokeStyle = color; ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0.72 * Math.PI, 0.28 * Math.PI, false); ctx.stroke();
  const aEnd = 0.28 * Math.PI, ex = cx + r * Math.cos(aEnd), ey = cy + r * Math.sin(aEnd), tang = aEnd + Math.PI / 2, hh = 7;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hh * Math.cos(tang - 0.5), ey - hh * Math.sin(tang - 0.5));
  ctx.lineTo(ex - hh * Math.cos(tang + 0.5), ey - hh * Math.sin(tang + 0.5)); ctx.fill();
  if (label) { ctx.fillStyle = color; ctx.font = '11.5px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(label, cx, cy - r - 4); }
}

function drawChain(ctx, nodes, M, short, full, colors, opts = {}) {
  const R = opts.R || 28;
  const labels = opts.labels !== false;
  for (let i = 0; i < M.length; i++) for (let j = 0; j < M.length; j++) {
    if (i === j || M[i][j] <= 0) continue;
    const bend = i < j ? -24 : 24;
    const on = opts.activeRow === i;
    arrowCurved(ctx, nodes[i], nodes[j], bend, labels ? M[i][j].toFixed(1) : '', on ? colors[i] : '#cccccc', R);
  }
  for (let i = 0; i < M.length; i++) if (M[i][i] > 0) selfLoop(ctx, nodes[i], R, labels ? M[i][i].toFixed(1) : '', opts.activeRow === i ? colors[i] : '#cccccc');
  for (let i = 0; i < nodes.length; i++) drawNode(ctx, nodes[i], R, short[i], full ? full[i] : null, colors[i], opts.current === i || opts.activeRow === i);
}

function drawMatrix(ctx, x, y, M, short, colors, cell, opts = {}) {
  const n = M.length;
  ctx.textBaseline = 'middle';
  ctx.font = '600 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = '#aaa'; ctx.fillText('to →', x + n * cell / 2, y - 26);
  for (let j = 0; j < n; j++) { ctx.fillStyle = colors[j]; ctx.fillText(short[j], x + cell / 2 + j * cell, y - 11); }
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i]; ctx.textAlign = 'right'; ctx.fillText(short[i], x - 8, y + cell / 2 + i * cell);
    ctx.textAlign = 'center';
    for (let j = 0; j < n; j++) {
      const v = M[i][j];
      ctx.fillStyle = v > 0 ? hexA('#1565c0', 0.12 + 0.62 * v) : '#f7f7f7';
      ctx.fillRect(x + j * cell, y + i * cell, cell - 2, cell - 2);
      ctx.fillStyle = v > 0.55 ? '#fff' : (v > 0 ? '#274b73' : '#ccc');
      ctx.font = '11.5px system-ui'; ctx.fillText(v === 0 ? '·' : v.toFixed(1), x + j * cell + cell / 2 - 1, y + i * cell + cell / 2);
    }
    if (opts.activeRow === i) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6; ctx.strokeRect(x - 1, y + i * cell - 1, n * cell, cell); }
    // each row is a distribution → sums to 1
    ctx.fillStyle = '#bbb'; ctx.font = '10.5px system-ui'; ctx.textAlign = 'left'; ctx.fillText('= 1', x + n * cell + 6, y + cell / 2 + i * cell);
  }
}

function drawBars(ctx, x, y, w, h, dist, short, colors, opts = {}) {
  const n = dist.length, gap = w / n, bw = gap * 0.56;
  ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1;
  ctx.fillStyle = '#bbb'; ctx.font = '10px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [0, 0.5, 1].forEach(t => { const yy = y + h - t * h; ctx.strokeStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); ctx.fillStyle = '#bbb'; ctx.fillText(t.toFixed(1), x - 5, yy); });
  for (let i = 0; i < n; i++) {
    const bx = x + gap * i + (gap - bw) / 2, bh = dist[i] * h;
    ctx.fillStyle = hexA(colors[i], 0.85); ctx.fillRect(bx, y + h - bh, bw, bh);
    ctx.fillStyle = '#555'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(dist[i].toFixed(2), bx + bw / 2, y + h - bh - 5);
    ctx.fillStyle = colors[i]; ctx.fillText(short[i], bx + bw / 2, y + h + 15);
    if (opts.stat) {
      const sy = y + h - opts.stat[i] * h;
      ctx.strokeStyle = colors[i]; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(bx - 4, sy); ctx.lineTo(bx + bw + 4, sy); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}

// ── Draw ───────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const R = 28, gap = Math.min(140, (c.width * 0.42) / 2);
    const DX = Math.max(90, c.width * 0.20), DY = c.height * 0.34;
    const nodes = [{ x: DX, y: DY }, { x: DX + gap, y: DY }, { x: DX + 2 * gap, y: DY }];
    const lowY = c.height * 0.60;

    // right-side readout, anchored past the diagram
    const rx = DX + 2 * gap + R + 46;
    let ry = 54; ctx.textBaseline = 'alphabetic';
    const line = (a, b, col = '#333') => { ctx.textAlign = 'left'; ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 15px system-ui'; ctx.fillText(b, rx, ry + 19); ry += 44; };
    const note = ls => { ctx.textAlign = 'left'; ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };

    if (o.mode === 'property') {
      drawChain(ctx, nodes, P, SHORT, STATES, COL, { current: st.pathCur });
      // a sampled trajectory as coloured letters
      const path = st.path || [];
      const py = lowY + 6, sx = DX;
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('a sampled trajectory:', sx, py - 14);
      path.forEach((s, k) => {
        const cxk = sx + k * 30;
        ctx.fillStyle = hexA(COL[s], 0.85); ctx.beginPath(); ctx.arc(cxk + 8, py + 8, 10, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(SHORT[s], cxk + 8, py + 8);
        if (k < path.length - 1) { ctx.fillStyle = '#ccc'; ctx.fillText('→', cxk + 23, py + 8); }
      });
      line('states', '3', '#333');
      note(['Where you go next depends ONLY', 'on today\'s state — never on the', 'days before it. The past is', 'forgotten given the present.', '', 'Resample to see fresh paths from', 'the same rules.']);
    }

    else if (o.mode === 'matrix') {
      drawChain(ctx, nodes, P, SHORT, STATES, COL, { activeRow: st.row });
      const cell = 40, mx = DX, my = lowY - 4;
      drawMatrix(ctx, mx, my, P, SHORT, COL, cell, { activeRow: st.row });
      line('row (from state)', STATES[st.row], COL[st.row]);
      line('each row sums to', '1', '#2e7d32');
      note(['Entry P(i,j) is the probability of', 'going from i to j in one step.', 'Row i is the full distribution of', 'tomorrow given today = i, so it', 'must sum to 1 (a stochastic', 'matrix). Step the highlighted row.']);
    }

    else if (o.mode === 'evolve' || o.mode === 'stationary') {
      drawChain(ctx, nodes, P, SHORT, STATES, COL, { R, labels: true });
      const stat = st.stat;
      drawBars(ctx, DX, lowY, 2 * gap + 2 * R, c.height * 0.26, st.dist, SHORT, COL, o.mode === 'stationary' ? { stat } : {});
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`distribution after ${st.n} step${st.n === 1 ? '' : 's'}`, DX, lowY - 12);
      if (o.mode === 'evolve') {
        line('step n', String(st.n));
        line('rule', 'πₙ₊₁ = πₙ P', '#1565c0');
        note(['Start certain (all mass on one', 'state), then apply P repeatedly.', 'Each step spreads the mass along', 'the arrows. Watch it settle toward', 'a fixed shape — that limit is next.']);
      } else {
        line('stationary π', `${stat.map(v => v.toFixed(2)).join(', ')}`, '#2e7d32');
        line('check', 'πP = π', '#2e7d32');
        note(['Dashed lines are the stationary', 'distribution π. From ANY start —', 'try the presets — the bars', 'converge to the same π: the long-', 'run fraction of days in each state.', 'π is the eigenvector of P for λ=1.']);
      }
    }

    else if (o.mode === 'periodic') {
      const pnodes = [{ x: DX + gap * 0.4, y: DY }, { x: DX + gap * 1.4, y: DY }];
      drawChain(ctx, pnodes, PER, PER_STATES, null, PER_COL, { R });
      drawBars(ctx, DX, lowY, 2 * gap, c.height * 0.26, st.dist, PER_STATES, PER_COL, {});
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`distribution after ${st.n} step${st.n === 1 ? '' : 's'}`, DX, lowY - 12);
      line('this chain', 'period 2', '#c62828');
      line('converges?', 'never', '#c62828');
      note(['A → B → A → B … forever. The', 'distribution oscillates and never', 'settles, so no limit exists. Step', 'it and watch it flip.', '', 'Convergence needs the chain to be', 'IRREDUCIBLE (all states reachable)', 'and APERIODIC (no fixed cycle).', 'The weather chain is both.']);
    }

    else if (o.mode === 'reversible') {
      drawChain(ctx, nodes, P, SHORT, STATES, COL, { activeRow: st.pair !== undefined ? st.pair[0] : undefined });
      const stat = st.stat;
      // detailed-balance check for the highlighted neighbour pair
      const [i, j] = st.pair;
      const lhs = stat[i] * P[i][j], rhs = stat[j] * P[j][i];
      const bx = DX, by = lowY;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#666'; ctx.font = '13px system-ui';
      ctx.fillText('detailed balance across ' + SHORT[i] + ' ↔ ' + SHORT[j] + ':', bx, by - 8);
      ctx.font = '600 15px system-ui';
      ctx.fillStyle = COL[i]; ctx.fillText(`π_${SHORT[i]} · P(${SHORT[i]}→${SHORT[j]}) = ${lhs.toFixed(3)}`, bx, by + 20);
      ctx.fillStyle = '#333'; ctx.font = '15px system-ui'; ctx.fillText('=', bx + 200, by + 20);
      ctx.fillStyle = COL[j]; ctx.font = '600 15px system-ui'; ctx.fillText(`π_${SHORT[j]} · P(${SHORT[j]}→${SHORT[i]}) = ${rhs.toFixed(3)}`, bx + 220, by + 20);
      ctx.fillStyle = Math.abs(lhs - rhs) < 1e-6 ? '#2e7d32' : '#c62828'; ctx.font = '12px system-ui';
      ctx.fillText(Math.abs(lhs - rhs) < 1e-6 ? '✓ balanced — probability flows equally both ways' : '✗ not balanced', bx, by + 44);
      line('stationary π', `${stat.map(v => v.toFixed(2)).join(', ')}`, '#2e7d32');
      line('reversible?', 'yes', '#2e7d32');
      note(['If πᵢPᵢⱼ = πⱼPⱼᵢ for every pair', '(detailed balance), then π is', 'automatically stationary — no', 'linear system to solve. Toggle the', 'pair. This is exactly what MCMC', 'engineers to sample a target π.']);
    }
  });
}

// ── Controls ────────────────────────────────────────────────────────────────
function clear(st) { if (st._controls) st._controls.innerHTML = ''; }
function button(label, onClick) {
  const b = document.createElement('button'); b.textContent = label;
  b.style.cssText = 'padding:6px 11px;font-size:12px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;';
  b.addEventListener('click', onClick); return b;
}
function row(st, buttons) { const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;'; buttons.forEach(b => w.appendChild(b)); st._controls.appendChild(w); }

const STAT = stationary(P);

// ── Lesson ───────────────────────────────────────────────────────────────────
export default {
  title:   'Markov Chains',
  subject: 'Probability',
  initState() { return { row: 0, n: 0, dist: [1, 0, 0], stat: STAT, pair: [0, 1], path: [], pathCur: 0, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'The Markov property',
      description: 'A $\\textbf{Markov chain}$ hops between a set of states, one step at a time. Its defining feature is $\\textbf{memorylessness}$: the probability of the next state depends only on the $\\textbf{current}$ state, not on the whole history of how you got there. Here the states are the weather — Sunny, Cloudy, Rainy — and tomorrow depends only on today.',
      equation: 'P(X_{n+1}=j \\mid X_n=i, X_{n-1}, \\dots, X_0) = P(X_{n+1}=j \\mid X_n=i)',
      notes: 'This is a strong, simplifying assumption — the present "screens off" the past. It is what makes chains tractable: to predict the future you only need to know where you are now.\n\nResample the trajectory to see different futures generated by the same fixed rules.',
      setup(c2d, st) {
        st.path = samplePath(P, 0, 11); st.pathCur = st.path[st.path.length - 1];
        clear(st); row(st, [button('resample path', () => { st.path = samplePath(P, Math.floor(Math.random() * 3), 11); st.pathCur = st.path[st.path.length - 1]; })]);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'property' }); },
    },
    {
      title: 'The transition matrix',
      description: 'Collect every one-step probability into a single $\\textbf{transition matrix}$ $P$, where $P_{ij}$ is the chance of moving from state $i$ to state $j$. Row $i$ is the entire conditional distribution of tomorrow given today $=i$, so $\\textbf{every row sums to 1}$ — a "stochastic matrix". This one matrix specifies the whole chain.',
      equation: 'P_{ij} = P(X_{n+1}=j \\mid X_n=i), \\qquad \\sum_{j} P_{ij} = 1',
      notes: 'Read the diagram and the matrix together: an arrow i → j with weight P(i,j), and a self-loop for staying put. This is a birth-death chain — Sunny and Rainy are not directly connected; the weather passes through Cloudy.\n\nStep through the rows and watch which arrows light up.',
      setup(c2d, st) { st.row = 0; clear(st); row(st, [button('◄ row', () => st.row = (st.row + 2) % 3), button('row ►', () => st.row = (st.row + 1) % 3)]); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'matrix' }); },
    },
    {
      title: 'Evolving a distribution',
      description: 'Now track $\\textbf{uncertainty}$, not a single path. If your belief about today is a row vector $\\pi_n$ over the states, then tomorrow\'s belief is $\\pi_{n+1} = \\pi_n P$. Apply $P$ again and again and the distribution after $n$ steps is $\\pi_0 P^n$. Start certain it is Sunny and watch the mass spread.',
      equation: '\\pi_{n+1} = \\pi_n P \\qquad\\Rightarrow\\qquad \\pi_n = \\pi_0\\, P^{\\,n}',
      notes: 'Each multiplication by P pushes probability mass along the arrows. Step forward and you can see it stop changing — the distribution is heading toward a fixed shape that P leaves alone. That limit is the next step.',
      setup(c2d, st) {
        st.dist = [1, 0, 0]; st.n = 0; clear(st);
        const step = () => { st.dist = stepDist(st.dist, P); st.n++; };
        row(st, [button('step', step), button('step ×5', () => { for (let k = 0; k < 5; k++) step(); }), button('reset', () => { st.dist = [1, 0, 0]; st.n = 0; })]);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'evolve' }); },
    },
    {
      title: 'The stationary distribution',
      description: 'The shape the chain settles into is the $\\textbf{stationary distribution}$ $\\pi$: the one distribution that $P$ leaves unchanged, $\\pi P = \\pi$. For this chain it is the long-run fraction of days that are Sunny, Cloudy, Rainy. Remarkably, from $\\textbf{any}$ starting belief the distribution converges to the same $\\pi$.',
      equation: '\\pi P = \\pi, \\qquad \\textstyle\\sum_i \\pi_i = 1',
      notes: 'The dashed lines mark π. Pick any starting state and step forward — every start funnels to the same dashed shape. Mathematically π is the left eigenvector of P for eigenvalue 1.\n\nThis is why long-run behaviour forgets the initial condition entirely.',
      setup(c2d, st) {
        st.dist = [1, 0, 0]; st.n = 0; clear(st);
        const step = () => { st.dist = stepDist(st.dist, P); st.n++; };
        const start = d => () => { st.dist = d.slice(); st.n = 0; };
        row(st, [button('start Sunny', start([1, 0, 0])), button('start Rainy', start([0, 0, 1])), button('uniform', start([1 / 3, 1 / 3, 1 / 3]))]);
        row(st, [button('step', step), button('run ×20', () => { for (let k = 0; k < 20; k++) step(); })]);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'stationary' }); },
    },
    {
      title: 'When does it converge?',
      description: 'Convergence is not automatic. A chain settles to a unique $\\pi$ only when it is $\\textbf{irreducible}$ (every state can eventually reach every other) and $\\textbf{aperiodic}$ (it is not locked into a fixed cycle). This two-state chain $A \\leftrightarrow B$ is periodic with period 2 — it flips forever and never settles.',
      equation: '\\text{unique limit } \\pi \\iff \\text{irreducible and aperiodic}',
      notes: 'Step it: the distribution just swaps A ↔ B each step, so [1,0] and [0,1] alternate with no limit. States are also classified as recurrent (you return with probability 1) or transient (you might leave forever); an irreducible finite chain is all-recurrent.\n\nOur weather chain has self-loops, so it is aperiodic, and every state reaches every other, so it is irreducible — hence it converged.',
      setup(c2d, st) {
        st.dist = [1, 0]; st.n = 0; clear(st);
        const step = () => { st.dist = stepDist(st.dist, PER); st.n++; };
        row(st, [button('step', step), button('reset', () => { st.dist = [1, 0]; st.n = 0; })]);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'periodic' }); },
    },
    {
      title: 'Reversibility & detailed balance',
      description: 'There is a shortcut to finding $\\pi$. If a distribution satisfies $\\textbf{detailed balance}$ — $\\pi_i P_{ij} = \\pi_j P_{ji}$ for every pair of states — then $\\pi$ is automatically stationary, with no linear system to solve. A chain admitting such a $\\pi$ is $\\textbf{reversible}$: probability flows equally both ways across every edge.',
      equation: '\\pi_i P_{ij} = \\pi_j P_{ji} \\;\\; \\forall i,j \\quad\\Rightarrow\\quad \\pi P = \\pi',
      notes: 'Summing detailed balance over i gives Σᵢ πᵢPᵢⱼ = πⱼ Σᵢ Pⱼᵢ = πⱼ — exactly the stationarity equation. Every birth-death chain (nearest-neighbour hops, like our weather) is reversible, so the check holds on each edge.\n\nThis is the foundation of MCMC: to sample a hard target π, build a chain engineered to satisfy detailed balance for it (Metropolis–Hastings, Gibbs).',
      setup(c2d, st) {
        st.pair = [0, 1]; clear(st);
        row(st, [button('S ↔ C', () => st.pair = [0, 1]), button('C ↔ R', () => st.pair = [1, 2])]);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'reversible' }); },
    },
  ],
};
