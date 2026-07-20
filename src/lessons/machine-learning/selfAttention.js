// Dot-product self-attention — the core operation of a transformer.
// Prince, Understanding Deep Learning, Chapter 12 (Transformers).
//
// The arc: a sequence of token vectors; the SAME three matrices W_Q, W_K, W_V
// project every token into queries, keys, values (parameter sharing across
// positions); scores are dot products q_i·k_j; scale by √d and softmax each row
// to get attention weights (each row sums to 1); the output is a weighted sum of
// values; and the punchline — W_Q/W_K/W_V are shared, learned, fixed, while the
// attention weights are dynamic, recomputed from the data every forward pass.
//
// Every matrix (Q, K, V, scores, attention, output) is computed exactly from the
// fixed embeddings and projections; attention rows sum to 1 (verified in node).

const N = 5, D = 4, F = 2.2;
const X0 = [[1.0, 0.2, -0.5, 0.3], [0.4, 1.1, 0.1, -0.2], [-0.3, 0.5, 0.9, 0.4], [0.8, -0.4, 0.2, 1.0], [0.1, 0.9, -0.7, 0.6]];
const X = X0.map(r => r.map(v => v * F));
const WQ = [[0.9, 0.1, 0, 0.2], [0.1, 0.8, 0.2, 0], [0, 0.2, 0.9, 0.1], [0.2, 0, 0.1, 0.8]];
const WK = [[0.8, 0, 0.2, 0.1], [0.2, 0.9, 0, 0.1], [0.1, 0.1, 0.8, 0.2], [0, 0.2, 0.1, 0.9]];
const WV = [[0.5, 0.3, 0, 0.2], [0.2, 0.6, 0.2, 0], [0, 0.2, 0.7, 0.1], [0.3, 0, 0.1, 0.6]];

const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
const Tr = A => A[0].map((_, j) => A.map(r => r[j]));
const softmax = r => { const m = Math.max(...r), e = r.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); };

const Q = mm(X, WQ), K = mm(X, WK), V = mm(X, WV);
const S = mm(Q, Tr(K)).map(r => r.map(v => v / Math.sqrt(D)));
const A = S.map(softmax);
const O = mm(A, V);
const maxAbs = M => Math.max(1e-9, ...M.flat().map(Math.abs));

// ── Colour ──────────────────────────────────────────────────────────────────
const BLUE = [21, 101, 192], ORANGE = [232, 113, 10], GREENc = [46, 125, 50];
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const divColor = (v, ma) => { const t = Math.max(-1, Math.min(1, v / ma)), c = t >= 0 ? BLUE : ORANGE, a = Math.abs(t); return rgb(lerp(255, c[0], a), lerp(255, c[1], a), lerp(255, c[2], a)); };
const attnColor = v => rgb(lerp(255, GREENc[0], v), lerp(255, GREENc[1], v), lerp(255, GREENc[2], v));
const TOK = ['t₁', 't₂', 't₃', 't₄', 't₅'];

// ── Matrix drawing ─────────────────────────────────────────────────────────────
function mat(ctx, x, y, cw, ch, M, o) {
  const R = M.length, C = M[0].length;
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
    const v = M[i][j];
    ctx.fillStyle = o.type === 'attn' ? attnColor(v) : divColor(v, o.maxabs);
    ctx.fillRect(x + j * cw, y + i * ch, cw - 1.5, ch - 1.5);
    if (o.labels) {
      const strong = o.type === 'attn' ? v > 0.55 : Math.abs(v / o.maxabs) > 0.55;
      ctx.fillStyle = strong ? '#fff' : '#555'; ctx.font = `${Math.min(11, ch * 0.42)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.type === 'attn' ? v.toFixed(2) : v.toFixed(1), x + j * cw + cw / 2, y + i * ch + ch / 2);
    }
  }
  ctx.strokeStyle = '#dcdcdc'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, C * cw, R * ch);
  if (o.hlRow != null) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4; ctx.strokeRect(x - 1, y + o.hlRow * ch - 1, C * cw, ch + 1); }
  if (o.title) { ctx.fillStyle = '#888'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(o.title, x + C * cw / 2, y - 10); }
  if (o.rowLabels) { ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; for (let i = 0; i < R; i++) ctx.fillText(o.rowLabels[i], x - 6, y + i * ch + ch / 2); }
  if (o.colLabels) { ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; for (let j = 0; j < C; j++) ctx.fillText(o.colLabels[j], x + j * cw + cw / 2, y + R * ch + 6); }
  return { w: C * cw, h: R * ch };
}
function arrow(ctx, x0, y0, x1, y1, label) {
  ctx.strokeStyle = '#c6c6c6'; ctx.fillStyle = '#c6c6c6'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), h = 7; ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); ctx.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4)); ctx.fill();
  if (label) { ctx.fillStyle = '#999'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, (x0 + x1) / 2, y0 - 7); }
}

// ── Main draw ───────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const i = st.qi;
    const rx = c.width - 250; let ry = 44;
    const line = (a, b, col = '#333') => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 14px system-ui'; ctx.fillText(b, rx, ry + 18); ry += 44; };
    const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ls.forEach((l, k) => ctx.fillText(l, rx, ry + k * 16)); };
    const midY = c.height * 0.44;

    if (o.mode === 'tokens') {
      const cw = 40, ch = 34, x0 = 90, y0 = midY - N * ch / 2;
      mat(ctx, x0, y0, cw, ch, X, { type: 'div', maxabs: maxAbs(X), labels: true, title: 'embeddings  X   (5 tokens × 4 dims)', rowLabels: TOK, colLabels: ['d₁', 'd₂', 'd₃', 'd₄'] });
      line('sequence', '5 token vectors', rgb(...BLUE));
      note(['Each row is one token, held as a', '4-dimensional vector. Attention', 'lets every token gather info from', 'the others — the next steps show', 'how it decides from whom.']);
    }

    else if (o.mode === 'qkv') {
      const cw = 30, ch = 26, y0 = midY - N * ch / 2, gap = 58;
      let x = 70;
      x += mat(ctx, x, y0, cw, ch, X, { type: 'div', maxabs: maxAbs(X), title: 'X', rowLabels: TOK }).w + gap;
      arrow(ctx, x - gap + cw * D + 6, midY, x - 8, midY, 'W_Q');
      x += mat(ctx, x, y0, cw, ch, Q, { type: 'div', maxabs: maxAbs(Q), title: 'Q  (queries)' }).w + gap;
      arrow(ctx, x - gap + cw * D + 6, midY, x - 8, midY, 'W_K');
      x += mat(ctx, x, y0, cw, ch, K, { type: 'div', maxabs: maxAbs(K), title: 'K  (keys)' }).w + gap;
      arrow(ctx, x - gap + cw * D + 6, midY, x - 8, midY, 'W_V');
      mat(ctx, x, y0, cw, ch, V, { type: 'div', maxabs: maxAbs(V), title: 'V  (values)' });
      line('projections', 'q,k,v = W·x', rgb(...BLUE));
      note(['The SAME W_Q, W_K, W_V are', 'applied to every token (every', 'row). Three learned matrices,', 'shared across all positions —', 'like a CNN kernel shared across', 'space.']);
    }

    else if (o.mode === 'scores') {
      const cw = 46, ch = 40, x0 = 120, y0 = midY - N * ch / 2;
      mat(ctx, x0, y0, cw, ch, S, { type: 'div', maxabs: maxAbs(S), labels: true, title: 'scores  S[i][j] = q_i · k_j / √d', rowLabels: TOK, colLabels: TOK, hlRow: i });
      ctx.fillStyle = '#888'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('query i →', x0 - 44, y0 - 10); ctx.fillText('← key j', x0 + N * cw / 2, y0 + N * ch + 24);
      line('a score', 'q_i · k_j  (a dot product)', rgb(...BLUE));
      line(`row for ${TOK[i]}`, S[i].map(v => v.toFixed(2)).join('  '));
      note(['Row i = how strongly token i', 'attends to each token j. A big', 'dot product means the query and', 'key point the same way. Not yet', 'normalized — that is next.']);
    }

    else if (o.mode === 'attn') {
      const cw = 46, ch = 40, x0 = 120, y0 = midY - N * ch / 2;
      mat(ctx, x0, y0, cw, ch, A, { type: 'attn', labels: true, title: 'attention  A = softmax(S, per row)', rowLabels: TOK, colLabels: TOK, hlRow: i });
      line('normalize', 'each row → softmax', GREENc && '#2e7d32');
      line(`${TOK[i]} attends`, 'row sums to ' + A[i].reduce((a, b) => a + b, 0).toFixed(2), '#2e7d32');
      note(['Scale by √d, then softmax each', 'row so its weights are positive', 'and sum to 1 — a distribution', 'over which tokens to read from.', 'Darker green = more attention.']);
    }

    else if (o.mode === 'output') {
      // attention row (weights) · V  →  output_i
      const cw = 46, ch = 34, x0 = 96, y0 = midY - N * ch / 2 - 30;
      // weights column (N×1)
      const wcol = A[i].map(v => [v]);
      mat(ctx, x0, y0, 40, ch, wcol, { type: 'attn', labels: true, title: `weights  A[${TOK[i]}]`, rowLabels: TOK });
      const vx = x0 + 40 + 54;
      arrow(ctx, x0 + 40 + 8, midY - 30, vx - 8, midY - 30, '×');
      mat(ctx, vx, y0, cw, ch, V, { type: 'div', maxabs: maxAbs(V), title: 'values  V', colLabels: ['d₁', 'd₂', 'd₃', 'd₄'] });
      const ox = vx + cw * D + 66;
      arrow(ctx, vx + cw * D + 8, midY - 30, ox - 8, midY - 30, 'Σ');
      mat(ctx, ox, midY - 30 - ch / 2, cw, ch, [O[i]], { type: 'div', maxabs: maxAbs(V), labels: true, title: `output  o(${TOK[i]})`, colLabels: ['d₁', 'd₂', 'd₃', 'd₄'] });
      line('output', 'oᵢ = Σⱼ αᵢⱼ vⱼ', rgb(...BLUE));
      note([`${TOK[i]}'s output is a blend of`, 'ALL value vectors, weighted by', 'its attention row. Tokens it', 'attends to strongly contribute', 'more. Every token gets its own', 'such blend, in parallel.']);
    }

    else if (o.mode === 'shared') {
      const cw = 34, ch = 30, y0 = midY - N * ch / 2;
      // the three shared W (4x4) as small panels, then A (dynamic)
      let x = 60;
      [['W_Q', WQ], ['W_K', WK], ['W_V', WV]].forEach(([lab, M]) => {
        mat(ctx, x, midY - D * ch / 2, cw, ch, M, { type: 'div', maxabs: maxAbs(M), title: lab }); x += cw * D + 40;
      });
      ctx.fillStyle = '#c62828'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('SHARED · learned · fixed after training', 60 + (cw * D * 3 + 80) / 2, midY + D * ch / 2 + 30);
      const ax = x + 30;
      mat(ctx, ax, y0, 30, 26, A, { type: 'attn', title: 'attention A', rowLabels: TOK });
      ctx.fillStyle = '#2e7d32'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('DYNAMIC · recomputed per input', ax + 30 * N / 2, y0 + N * 26 + 22);
      line('learned params', 'W_Q, W_K, W_V, W_O', '#c62828');
      line('NOT params', 'the attention weights A', '#2e7d32');
      note(['The matrices are the model —', 'shared across every position,', 'fixed at inference. The attention', 'pattern is an activation, computed', 'fresh from each input (like a', "CNN's feature maps, not its", 'kernel). Param count is', 'independent of sequence length.']);
    }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function queryButtons(st) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:6px;align-items:center;';
  const lab = document.createElement('span'); lab.textContent = 'query token'; lab.style.cssText = 'font-size:12px;color:#888;margin-right:4px;'; wrap.appendChild(lab);
  TOK.forEach((t, k) => {
    const b = document.createElement('button'); b.textContent = t;
    const paint = () => wrap.querySelectorAll('button').forEach((btn, m) => { const on = m === st.qi; btn.style.cssText = `padding:5px 10px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; });
    b.addEventListener('click', () => { st.qi = k; paint(); });
    wrap.appendChild(b); if (k === N - 1) setTimeout(paint, 0);
  });
  st._controls.appendChild(wrap);
  wrap.querySelectorAll('button').forEach((btn, m) => { const on = m === st.qi; btn.style.cssText = `padding:5px 10px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${on ? '#1565c0' : '#ccc'};background:${on ? '#1565c0' : '#fff'};color:${on ? '#fff' : '#555'};`; });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Dot-Product Self-Attention',
  subject: 'Machine Learning',
  initState() { return { qi: 2, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'A sequence of token vectors',
      description: 'A transformer sees a sequence as a stack of vectors — one per token. Self-attention is the operation that lets each token look at all the others and pull in whatever is relevant, mixing information across the whole sequence in one shot.',
      equation: '\\mathbf{X} \\in \\mathbb{R}^{N \\times d}\\quad(N \\text{ tokens},\\ d\\text{-dim each})',
      notes: 'Here N = 5 tokens, each a 4-dimensional embedding (a real model uses hundreds or thousands of dimensions). Everything that follows is computed exactly from this X.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'tokens' }); },
    },
    {
      title: 'Query, Key, Value — three shared matrices',
      description: 'Each token is projected three ways by three learned matrices: a $\\textbf{query}$ ("what am I looking for?"), a $\\textbf{key}$ ("what do I offer?"), and a $\\textbf{value}$ ("what I\'ll pass on"). Crucially, the same $W_Q, W_K, W_V$ are applied to every token.',
      equation: '\\mathbf{q}_i = W_Q\\mathbf{x}_i,\\quad \\mathbf{k}_i = W_K\\mathbf{x}_i,\\quad \\mathbf{v}_i = W_V\\mathbf{x}_i',
      notes: 'This is the parameter sharing you asked about: three matrices, reused at every position — exactly like a CNN slides one kernel across every spatial location. The parameter count does not grow with sequence length.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'qkv' }); },
    },
    {
      title: 'Scores: a dot product for every pair',
      description: 'How much should token $i$ attend to token $j$? Take the $\\textbf{dot product}$ of $i$\'s query with $j$\'s key: a big value means they point the same way — query and key agree. Do this for all pairs and you get an $N\\times N$ score matrix.',
      equation: 'S_{ij} = \\frac{\\mathbf{q}_i \\cdot \\mathbf{k}_j}{\\sqrt{d}}',
      notes: 'Pick a query token (buttons below) to highlight its row — the scores it assigns to every token, itself included. The √d is just a scaling so the dot products do not blow up in high dimensions and saturate the softmax.',
      setup(c2d, st) { clearControls(st); queryButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'scores' }); },
    },
    {
      title: 'Softmax → attention weights',
      description: 'Turn each row of scores into a probability distribution with a softmax: the weights become positive and sum to 1. Row $i$ is now token $i$\'s $\\textbf{attention}$ — how it splits its "read" across the sequence.',
      equation: '\\alpha_{ij} = \\text{softmax}_j(S_{ij}) = \\frac{e^{S_{ij}}}{\\sum_{j\'} e^{S_{ij\'}}}',
      notes: 'Darker green = more attention. Change the query token and watch its row of weights change. Each row sums to 1 — the token is deciding what fraction of its update to take from each other token.',
      setup(c2d, st) { clearControls(st); queryButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'attn' }); },
    },
    {
      title: 'Output: a weighted sum of values',
      description: 'Finally, each token\'s output is the sum of all the value vectors, weighted by its attention row. A token that attends strongly to token 3 pulls mostly token 3\'s value into its update. Every token gets its own blend, all computed in parallel.',
      equation: '\\mathbf{o}_i = \\sum_j \\alpha_{ij}\\,\\mathbf{v}_j',
      notes: 'Pick a query token and read left to right: its weight column times the value matrix, summed, gives its output vector. This is where information actually moves between tokens — attention decides the mixing, values carry the content.',
      setup(c2d, st) { clearControls(st); queryButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'output' }); },
    },
    {
      title: 'Shared weights vs dynamic attention',
      description: 'The one distinction to hold onto: $W_Q, W_K, W_V$ (and the output projection) are the $\\textbf{learned parameters}$ — shared across every position and frozen after training. The attention matrix is $\\textbf{not}$ a parameter — it is recomputed from the data on every forward pass.',
      equation: '\\underbrace{W_Q, W_K, W_V}_{\\text{shared, learned}} \\;\\longrightarrow\\; \\underbrace{\\alpha_{ij}}_{\\text{dynamic activation}}',
      notes: 'This is the usual point of confusion. The matrices are the model; the attention pattern is an activation, like a CNN\'s feature maps rather than its kernel. Because the weights are shared and the attention is content-based, one transformer handles any sequence length — and, without positional encoding, treats the sequence as a set.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'shared' }); },
    },
  ],
};
