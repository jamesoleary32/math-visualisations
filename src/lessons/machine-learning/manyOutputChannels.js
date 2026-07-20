// Why multiple output channels? — the "not four copies" lesson.
// Prince, Understanding Deep Learning, Chapter 10 (companion to Channels in CNNs).
//
// This lesson answers ONE confusion directly: if a conv layer outputs 4 channels,
// what motivates "repeating the same thing four times"? The answer is that we are
// NOT repeating anything — we learn four DIFFERENT filters, each a different
// detector asking a different question of the same input. The arc:
//   one filter answers one question  →  the wrong mental model (four copies) →
//   four different filters give four different maps  →  four different questions →
//   each filter still spans all input channels (their h^(k) equation)  →
//   K is a design choice (slider).
//
// Feature maps are computed from the real tensors, so the pictures are honest.

const N = 7, CIN = 3, OH = N - 2, OW = N - 2;   // 7×7×3 input, valid 3×3 conv → 5×5

// ── Input: a small scene with edges, a diagonal and a solid blob ───────────────
// One intensity field, lightly tinted into 3 channels so the "3 input channels"
// story is real without cluttering the picture.
function makeInput() {
  const ch = [[], [], []];
  for (let i = 0; i < N; i++) {
    ch[0].push([]); ch[1].push([]); ch[2].push([]);
    for (let j = 0; j < N; j++) {
      let v = 0.08;
      if (i >= 1 && i <= 3 && j >= 1 && j <= 3) v = 0.95;      // bright block, top-left
      if (i + j === 8 || i + j === 9) v = Math.max(v, 0.9);    // diagonal, lower-right
      ch[0][i].push(v);            // R
      ch[1][i].push(v * 0.85);     // G
      ch[2][i].push(v * 0.7);      // B
    }
  }
  return ch;
}

// Eight hand-set 3×3 detectors. Each becomes one filter (one kernel per input
// channel, scaled per channel so a filter is visibly THREE kernels, not one).
const BASE = [
  [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]],   // vertical edge
  [[-1, -1, -1], [0, 0, 0], [1, 1, 1]],   // horizontal edge
  [[0, 1, 1], [-1, 0, 1], [-1, -1, 0]],   // diagonal ╱
  [[1, 1, 0], [1, 0, -1], [0, -1, -1]],   // diagonal ╲
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],      // bright blob (average)
  [[0, -1, 0], [-1, 4, -1], [0, -1, 0]],  // centre–surround spot
  [[1, 0, -1], [2, 0, -2], [1, 0, -1]],   // strong vertical
  [[1, 2, 1], [0, 0, 0], [-1, -2, -1]],   // strong horizontal
];
const NAMES = ['vertical edges', 'horizontal edges', 'diagonal ╱', 'diagonal ╲',
  'bright blobs', 'spots / centres', 'strong V-edges', 'strong H-edges'];
const CH_W = [1, 0.7, 0.4];   // per-input-channel scale, so 3 kernels differ

function makeFilters() {
  return BASE.map(b => CH_W.map(w => b.map(r => r.map(x => Math.round(x * w * 10) / 10))));
}

// multi-channel valid cross-correlation: img[CIN][N][N] ⊛ ker[CIN][3][3] → [5][5]
function convMC(img, ker) {
  const out = [];
  for (let i = 0; i < OH; i++) {
    const row = [];
    for (let j = 0; j < OW; j++) {
      let s = 0;
      for (let c = 0; c < CIN; c++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++)
        s += img[c][i + a][j + b] * ker[c][a][b];
      row.push(s);
    }
    out.push(row);
  }
  return out;
}
const maxAbs = m => Math.max(1e-9, ...m.flat().map(Math.abs));

// ── Colour ─────────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const POS = [21, 101, 192], NEG = [232, 113, 10];         // blue / orange
function divColor(v, ma) { const t = Math.max(-1, Math.min(1, v / ma)), c = t >= 0 ? POS : NEG, a = Math.abs(t); return rgb(lerp(255, c[0], a), lerp(255, c[1], a), lerp(255, c[2], a)); }

// ── Drawing primitives (shared style with channelsInCnns.js) ───────────────────
function grid(ctx, x, y, cell, data, colorFn, labelFn) {
  const r = data.length, c = data[0].length;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    ctx.fillStyle = colorFn(data[i][j], i, j);
    ctx.fillRect(x + j * cell, y + i * cell, cell - 1, cell - 1);
    if (labelFn) { ctx.fillStyle = '#555'; ctx.font = `${Math.floor(cell * 0.42)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(labelFn(data[i][j]), x + j * cell + cell / 2, y + i * cell + cell / 2); }
  }
  ctx.strokeStyle = '#dcdcdc'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, c * cell, r * cell);
}
function capLabel(ctx, text, cx, y, color = '#888', size = 12) {
  ctx.fillStyle = color; ctx.font = `${size}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, cx, y);
}
function arrow(ctx, x0, y0, x1, y1, label) {
  ctx.strokeStyle = '#c4c4c4'; ctx.fillStyle = '#c4c4c4'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), hh = 7;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - hh * Math.cos(a - 0.4), y1 - hh * Math.sin(a - 0.4));
  ctx.lineTo(x1 - hh * Math.cos(a + 0.4), y1 - hh * Math.sin(a + 0.4)); ctx.fill();
  if (label) { ctx.fillStyle = '#999'; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, (x0 + x1) / 2, y0 - 9); }
}
// a small filter "chip"
function chip(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.2;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x - 0.5, y - 0.5, w, h);
}

function drawInput(ctx, img, x0, y0, cell) {
  grid(ctx, x0, y0, cell, img[0], (_, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255));
  capLabel(ctx, 'input  7×7×3', x0 + N * cell / 2, y0 + N * cell + 20, '#bbb', 11);
}

// ── Main draw ──────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  const img = makeInput();
  const filters = makeFilters();
  const outs = filters.map(f => convMC(img, f));       // 8 feature maps, each 5×5
  const ma = Math.max(...outs.map(maxAbs));

  c2d.raw((ctx, c) => {
    const midY = c.height * 0.5;
    const inCell = 22, inW = N * inCell;
    // Centre each mode's whole composition (diagram + its captions) horizontally,
    // so nothing floats in dead canvas space. Widths include right-hand labels.
    const CONTENT_W = { one: 430, copies: 600, distinct: 560, questions: 560, span: 440, design: 500 };
    const x0 = Math.max(40, (c.width - (CONTENT_W[o.mode] || 460)) / 2);
    const y0 = midY - inW / 2;

    if (o.mode === 'one') {
      drawInput(ctx, img, x0, y0, inCell);
      // one filter, one map
      const chipX = x0 + inW + 46, oCell = 26, oGrid = OW * oCell, oX = chipX + 84, oy = midY - oGrid / 2;
      arrow(ctx, x0 + inW + 12, midY, chipX - 6, midY, '1 filter');
      chip(ctx, chipX, midY - 11, 46, 22, '#f3f6fb', '#9db4d4');
      ctx.fillStyle = '#3f6199'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('w₁', chipX + 23, midY);
      arrow(ctx, chipX + 48, midY, oX - 6, midY);
      grid(ctx, oX, oy, oCell, outs[0], v => divColor(v, ma));
      capLabel(ctx, 'feature map  5×5×1', oX + oGrid / 2, oy - 12);
      capLabel(ctx, `1 filter → 1 map`, oX + oGrid / 2, oy + oGrid + 24, '#bbb', 11);
    }

    else if (o.mode === 'copies') {
      const K = 4;
      drawInput(ctx, img, x0, y0, inCell);
      const oCell = 16, oGrid = OW * oCell, gap = 18, colH = K * oGrid + (K - 1) * gap, oy0 = midY - colH / 2;
      const chipX = x0 + inW + 40, oX = chipX + 92;
      arrow(ctx, x0 + inW + 12, midY, chipX - 6, midY, 'same filter ×4');
      for (let r = 0; r < K; r++) {
        const oy = oy0 + r * (oGrid + gap), cy = oy + oGrid / 2;
        chip(ctx, chipX, cy - 9, 44, 18, '#eef2f7', '#c3d0e0');
        ctx.fillStyle = '#8fa3bd'; ctx.font = '10.5px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('w', chipX + 22, cy);
        arrow(ctx, chipX + 46, cy, oX - 6, cy);
        grid(ctx, oX, oy, oCell, outs[0], v => divColor(v, ma));
      }
      capLabel(ctx, 'output  5×5×4', oX + oGrid / 2, oy0 + colH + 24, '#bbb', 11);
      // "redundant" bracket
      ctx.strokeStyle = '#c62828'; ctx.lineWidth = 2;
      ctx.strokeRect(oX - 5, oy0 - 6, oGrid + 10, colH + 12);
      ctx.fillStyle = '#c62828'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('four identical maps', oX + oGrid + 16, midY - 6);
      ctx.fillStyle = '#c62828'; ctx.font = '11.5px system-ui';
      ctx.fillText('no new information', oX + oGrid + 16, midY + 12);
    }

    else if (o.mode === 'distinct' || o.mode === 'questions') {
      const K = 4, indices = [0, 1, 2, 4];
      drawInput(ctx, img, x0, y0, inCell);
      const oCell = 16, oGrid = OW * oCell, gap = 18, colH = K * oGrid + (K - 1) * gap, oy0 = midY - colH / 2;
      const chipX = x0 + inW + 40, oX = chipX + 92;
      arrow(ctx, x0 + inW + 12, midY, chipX - 6, midY, '4 different filters');
      for (let r = 0; r < K; r++) {
        const f = indices[r], oy = oy0 + r * (oGrid + gap), cy = oy + oGrid / 2;
        chip(ctx, chipX, cy - 9, 44, 18, '#f3f6fb', '#9db4d4');
        ctx.fillStyle = '#3f6199'; ctx.font = '10.5px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('w' + '₁₂₃₄'[r], chipX + 22, cy);
        arrow(ctx, chipX + 46, cy, oX - 6, cy);
        grid(ctx, oX, oy, oCell, outs[f], v => divColor(v, ma));
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        if (o.mode === 'questions') { ctx.fillStyle = '#7b1fa2'; ctx.font = '12px system-ui'; ctx.fillText(`"any ${NAMES[f]}?"`, oX + oGrid + 14, cy); }
        else { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(`channel ${r + 1}`, oX + oGrid + 14, cy); }
      }
      capLabel(ctx, 'output  5×5×4', oX + oGrid / 2, oy0 + colH + 24, '#bbb', 11);
    }

    else if (o.mode === 'span') {
      // one output channel = sum of 3 kernels over 3 input channels (+ bias)
      const f = 0;
      const names = ['R', 'G', 'B'];
      const chCol = [[211, 47, 47], [46, 125, 50], [21, 101, 192]];
      const sCell = 20, sW = N * sCell;
      const ix = x0;
      // three input channels stacked vertically
      const stackH = 3 * (N * sCell) + 2 * 14;
      const iy0 = midY - stackH / 2;
      for (let ci = 0; ci < CIN; ci++) {
        const gy = iy0 + ci * (N * sCell + 14);
        grid(ctx, ix, gy, sCell, img[ci], v => { const t = Math.min(1, v / 0.95); return rgb(lerp(255, chCol[ci][0], t), lerp(255, chCol[ci][1], t), lerp(255, chCol[ci][2], t)); });
        capLabel(ctx, `x^(${ci + 1}) · ${names[ci]}`, ix + sW / 2, gy + N * sCell + 15, rgb(...chCol[ci]), 11);
      }
      // three kernels
      const kx = ix + sW + 60, kcell = 15;
      for (let ci = 0; ci < CIN; ci++) {
        const gy = iy0 + ci * (N * sCell + 14) + (N * sCell - 3 * kcell) / 2;
        arrow(ctx, ix + sW + 12, iy0 + ci * (N * sCell + 14) + N * sCell / 2, kx - 6, iy0 + ci * (N * sCell + 14) + N * sCell / 2, '∗');
        grid(ctx, kx, gy, kcell, filters[f][ci], v => divColor(v, maxAbs(filters[f][ci])), v => (v === 0 ? '' : v.toFixed(1)));
        capLabel(ctx, `w^(1,${ci + 1})`, kx + 3 * kcell / 2, gy - 6, '#666', 10.5);
      }
      // plus + result
      ctx.fillStyle = '#888'; ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', kx + 1.5 * kcell, iy0 + (N * sCell + 14) - 2);
      ctx.fillText('+', kx + 1.5 * kcell, iy0 + 2 * (N * sCell + 14) - 2);
      const oCell = 22, oGrid = OW * oCell, oX = kx + 3 * kcell + 70, oy = midY - oGrid / 2;
      arrow(ctx, kx + 3 * kcell + 14, midY, oX - 8, midY, '=');
      grid(ctx, oX, oy, oCell, outs[f], v => divColor(v, ma));
      capLabel(ctx, 'h^(1)  (one channel)', oX + oGrid / 2, oy - 12, '#333');
    }

    else if (o.mode === 'design') {
      const K = st.K, indices = [...Array(K).keys()];
      drawInput(ctx, img, x0, y0, inCell);
      const oCell = K <= 4 ? 15 : 12, oGrid = OW * oCell;
      const gap = K <= 4 ? 16 : 8, colH = K * oGrid + (K - 1) * gap, oy0 = midY - colH / 2;
      const chipX = x0 + inW + 40, oX = chipX + 88;
      arrow(ctx, x0 + inW + 12, midY, chipX - 6, midY, `${K} filter${K > 1 ? 's' : ''}`);
      for (let r = 0; r < K; r++) {
        const oy = oy0 + r * (oGrid + gap), cy = oy + oGrid / 2;
        chip(ctx, chipX, cy - 8, 40, 16, '#f3f6fb', '#9db4d4');
        arrow(ctx, chipX + 42, cy, oX - 6, cy);
        grid(ctx, oX, oy, oCell, outs[r], v => divColor(v, ma));
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a8a8a'; ctx.font = '10.5px system-ui';
        if (K <= 6) ctx.fillText(NAMES[r], oX + oGrid + 12, cy);
      }
      capLabel(ctx, `output  5×5×${K}`, oX + oGrid / 2, oy0 + colH + 22, '#bbb', 11);
    }
  });
}

// ── Lesson ───────────────────────────────────────────────────────────────────
export default {
  title:   'Why Multiple Output Channels?',
  subject: 'Machine Learning',

  initState() { return { K: 4 }; },
  init(c2d, state, panelEl) {
    c2d.scale = 1;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;margin-top:4px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'One filter asks one question',
      description: 'Start with a single filter. It slides over the image and at every position reports one number — roughly, "how strongly does the patch here match $\\textbf{my}$ pattern?" Sweep it across the whole image and those numbers form one $\\textbf{feature map}$. So one filter gives one output channel, and it can only describe $\\textbf{one}$ kind of local pattern.',
      equation: '\\text{1 filter} \\;\\longrightarrow\\; \\text{1 feature map}',
      notes: 'This filter happens to respond to vertical edges — see it light up along the left and right sides of the block. Hold onto that: a filter is a single, specialised pattern-detector.',
      setup(c2d, st) { st._controls.innerHTML = ''; }, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'one' }); },
    },
    {
      title: 'The wrong picture: four copies',
      description: 'Now the confusion. "Four output channels" $\\textbf{sounds}$ like running one filter four times. But if all four filters had the same weights they would produce four $\\textbf{identical}$ maps — the same picture stacked four deep. That carries no more information than one map. So this cannot be what "4 output channels" means.',
      equation: '\\underbrace{h,\\;h,\\;h,\\;h}_{\\text{same filter} \\times 4} \\;=\\; \\text{no new information}',
      notes: 'Whenever "repeating the same thing four times" feels pointless — good. It IS pointless. That instinct is correct; it just points at a mental model the layer does not use.',
      setup(c2d, st) { st._controls.innerHTML = ''; }, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'copies' }); },
    },
    {
      title: 'The real picture: four different filters',
      description: 'A layer with 4 output channels holds $\\textbf{four different filters}$, each with its own weights. Feed the same input to all four and you get four $\\textbf{different}$ feature maps. Compare them: one fires on vertical edges, one on horizontal edges, one on the diagonal, one on the solid blob. Nothing is repeated — four detectors, four pictures.',
      equation: 'h^{(k)} = w^{(k)} * x + b^{(k)}, \\qquad w^{(1)} \\neq w^{(2)} \\neq \\dots',
      notes: 'The superscript $(k)$ is the whole story: each output channel $k$ has its own weight set $w^{(k)}$. Different weights → different question → different map. Stack the four maps and that stack is the layer\'s output.',
      setup(c2d, st) { st._controls.innerHTML = ''; }, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'distinct' }); },
    },
    {
      title: 'Four channels = four questions',
      description: 'So the clean way to read "4 output channels" is: the layer asks $\\textbf{four different questions}$ at every location. Is there a vertical edge here? A horizontal one? A diagonal? A blob? Each question, answered across all positions, becomes one channel. The RGB analogy: one channel might learn red-green transitions, another a small curve, another a texture — all looking at the same image with different learned eyes.',
      equation: '\\text{channel } k \\;\\equiv\\; \\text{"does pattern } k \\text{ occur here?" over all positions}',
      notes: 'This is the motivation you were missing: one filter describes one pattern, so to see several patterns at once you need several filters. The count (4) is just how many distinct detectors you want the layer to learn.',
      setup(c2d, st) { st._controls.innerHTML = ''; }, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'questions' }); },
    },
    {
      title: 'Two different indices: within vs across',
      description: 'Your equation $h^{(1)} = w^{(1,1)}*x^{(1)} + w^{(1,2)}*x^{(2)} + w^{(1,3)}*x^{(3)} + b^{(1)}$ has $\\textbf{two}$ kinds of index, and mixing them up is what breeds the confusion. The $\\textbf{second}$ index runs over the three $\\textbf{input}$ channels — those three kernels sit $\\textbf{inside one filter}$ and are summed into a single map. The $\\textbf{first}$ index is $\\textbf{which filter}$ — that is what multiplies into more output channels.',
      equation: 'h^{(k)} = \\textstyle\\sum_{c} w^{(k,\\,c)} * x^{(c)} + b^{(k)}',
      notes: 'Within a filter: sum over input channels $c$ (collapses depth to one map). Across the layer: index $k$ over filters (grows the output depth). The three $w^{(1,\\cdot)}$ build one channel; the four $w^{(\\cdot)}$ build four channels.',
      setup(c2d, st) { st._controls.innerHTML = ''; }, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'span' }); },
    },
    {
      title: 'K is a design choice',
      description: 'How many output channels? That is $\\textbf{your}$ dial, $K$. Drag it and watch the output stack grow: each new value of $K$ adds one more independent filter, hence one more feature map — never a copy. Few filters, a small pattern vocabulary; many filters, a richer one, at more compute. "4" was simply someone choosing to learn four detectors here.',
      equation: '\\text{output channels} \\;=\\; K \\;=\\; \\text{number of filters (your choice)}',
      notes: 'Input channels are handed to you by the previous layer; output channels you decide. And the next layer\'s filters will each span all $K$ of these maps — so K also sets how much the following layer has to look at.',
      setup(c2d, st) {
        const c = st._controls; c.innerHTML = '';
        const id = 'sl-K';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
        wrap.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
            <span>number of filters K</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${st.K}</span>
          </div>
          <input type="range" id="${id}" min="1" max="8" step="1" value="${st.K}" style="width:100%;accent-color:#1565c0">`;
        c.appendChild(wrap);
        wrap.querySelector('input').addEventListener('input', e => {
          st.K = parseInt(e.target.value, 10);
          wrap.querySelector(`#${id}-v`).textContent = st.K;
        });
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'design' }); },
    },
  ],
};
