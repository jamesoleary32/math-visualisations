// Channels in CNNs — the depth dimension of a convolutional tensor.
// Prince, Understanding Deep Learning, Chapter 10 (companion to Convolutional Networks).
//
// The arc: an image is a stack of channels (RGB = 3); a single filter spans ALL
// input channels and collapses them to one feature map; a layer has K filters, so
// output channels = number of filters; the channel dimension is densely connected
// while space is weight-shared; channels are feature types; and a 1×1 convolution
// is pure channel mixing.
//
// Shapes and parameter counts are computed from the actual tensors so the numbers
// on screen are the real ones.

const H = 5, W = 5, K = 3, CIN = 3;   // input 5×5×3, valid 3×3 conv → 3×3, K filters

// ── Input: a 5×5×3 "image" with a distinct pattern per channel ────────────────
function makeRGB() {
  const ch = [[], [], []];
  for (let i = 0; i < H; i++) {
    ch[0].push([]); ch[1].push([]); ch[2].push([]);
    for (let j = 0; j < W; j++) {
      ch[0][i].push(i < 3 && j < 3 ? 0.95 : 0.08);            // R: block, top-left
      ch[1][i].push(i === j || i === j - 1 ? 0.9 : 0.12);     // G: diagonal
      ch[2][i].push(i === 0 || j === 0 || i === 4 || j === 4 ? 0.85 : 0.06); // B: border
    }
  }
  return ch;
}

// K filters, each CIN×3×3 (+ bias). Fixed illustrative weights.
function makeFilters() {
  const F = [];
  const seeds = [0.7, -0.4, 0.9];
  for (let f = 0; f < K; f++) {
    const ker = [];
    for (let c = 0; c < CIN; c++) {
      const m = [];
      for (let a = 0; a < 3; a++) { const r = []; for (let b = 0; b < 3; b++) r.push(Math.round((Math.sin(f * 3 + c * 7 + a * 2 + b) * seeds[c]) * 10) / 10); m.push(r); }
      ker.push(m);
    }
    F.push(ker);
  }
  return F;
}

// multi-channel valid cross-correlation: img[CIN][H][W] ⊛ ker[CIN][3][3] → [H-2][W-2]
function convMC(img, ker) {
  const oH = H - 2, oW = W - 2, out = [];
  for (let i = 0; i < oH; i++) {
    const row = [];
    for (let j = 0; j < oW; j++) {
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

// ── Colour ────────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
const CH_COL = [[211, 47, 47], [46, 125, 50], [21, 101, 192]]; // R, G, B tints
const POS = [21, 101, 192], NEG = [232, 113, 10];
function tintColor(v, c) { return rgb(lerp(255, c[0], v), lerp(255, c[1], v), lerp(255, c[2], v)); }
function divColor(v, ma) { const t = Math.max(-1, Math.min(1, v / ma)), c = t >= 0 ? POS : NEG, a = Math.abs(t); return rgb(lerp(255, c[0], a), lerp(255, c[1], a), lerp(255, c[2], a)); }

// ── Drawing primitives ────────────────────────────────────────────────────────
function grid(ctx, x, y, cell, data, colorFn, labelFn) {
  const r = data.length, c = data[0].length;
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    ctx.fillStyle = colorFn(data[i][j], i, j);
    ctx.fillRect(x + j * cell, y + i * cell, cell - 1, cell - 1);
    if (labelFn) { ctx.fillStyle = '#555'; ctx.font = `${Math.floor(cell * 0.4)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(labelFn(data[i][j]), x + j * cell + cell / 2, y + i * cell + cell / 2); }
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

// an offset "stack" of `depth` cards; the front card carries `frontData`+colorFn
function stack(ctx, x, y, cell, rows, cols, depth, frontData, frontColor, tint) {
  const dx = 7, dy = 7;
  for (let k = depth - 1; k >= 1; k--) {
    const ox = x + k * dx, oy = y - k * dy;
    ctx.fillStyle = tint ? `rgba(${tint[0]},${tint[1]},${tint[2]},0.10)` : 'rgba(120,120,120,0.08)';
    ctx.fillRect(ox, oy, cols * cell, rows * cell);
    ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 1; ctx.strokeRect(ox - 0.5, oy - 0.5, cols * cell, rows * cell);
  }
  if (frontData) grid(ctx, x, y, cell, frontData, frontColor);
  else { ctx.fillStyle = tint ? `rgba(${tint[0]},${tint[1]},${tint[2]},0.18)` : '#f2f2f2'; ctx.fillRect(x, y, cols * cell, rows * cell); ctx.strokeStyle = '#cfcfcf'; ctx.strokeRect(x - 0.5, y - 0.5, cols * cell, rows * cell); }
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  const img = makeRGB();
  const filters = makeFilters();
  const outs = filters.map(f => convMC(img, f));   // K feature maps, each 3×3
  const ma = Math.max(...outs.map(maxAbs));

  c2d.raw((ctx, c) => {
    const midY = c.height * 0.46;
    const cell = 26;
    const gridW = W * cell;

    // ── right-side readout ──
    const rx = c.width - 250;
    let ry = 56;
    const line = (label, val, color = '#333') => {
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, rx, ry);
      ctx.fillStyle = color; ctx.font = '600 15px system-ui'; ctx.fillText(val, rx, ry + 19); ry += 46;
    };
    const note = lines => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };

    if (o.mode === 'stack') {
      // colour image  =  R + G + B planes
      const x0 = 60, y0 = midY - gridW / 2;
      grid(ctx, x0, y0, cell, img[0], (_, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255));
      capLabel(ctx, 'colour image', x0 + gridW / 2, y0 - 12);
      capLabel(ctx, '5 × 5 × 3', x0 + gridW / 2, y0 + gridW + 20, '#bbb', 11);
      arrow(ctx, x0 + gridW + 14, midY, x0 + gridW + 54, midY, '=');
      const names = ['R', 'G', 'B'];
      const px = x0 + gridW + 70, small = 20;
      for (let ci = 0; ci < 3; ci++) {
        const gx = px + ci * (W * small + 26), gy = midY - W * small / 2;
        grid(ctx, gx, gy, small, img[ci], v => tintColor(v, CH_COL[ci]));
        capLabel(ctx, names[ci] + ' channel', gx + W * small / 2, gy - 10, rgb(...CH_COL[ci]), 11);
      }
      line('a pixel is', `${CIN} numbers`);
      note(['Each channel is one 2D map.', 'Grayscale would be H×W×1;', 'RGB is H×W×3. The channel', 'axis is the depth of the tensor.']);
    }

    else if (o.mode === 'collapse') {
      // input stack (depth 3)  ⊛  one filter (3 kernels)  =  one feature map
      const x0 = 56, y0 = midY - gridW / 2;
      stack(ctx, x0, y0, cell, H, W, CIN, img[0], (v, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255), [120, 120, 120]);
      capLabel(ctx, 'input  5×5×3', x0 + gridW / 2, y0 + gridW + 22, '#bbb', 11);

      const kx = x0 + gridW + 60, kcell = 20, ky = midY - CIN * (3 * kcell + 6) / 2;
      arrow(ctx, x0 + gridW + 22, midY, kx - 10, midY, '⊛');
      for (let ci = 0; ci < CIN; ci++) {
        const gy = ky + ci * (3 * kcell + 8);
        grid(ctx, kx, gy, kcell, filters[0][ci], v => divColor(v, maxAbs(filters[0][ci])), v => (v === 0 ? '' : v.toFixed(1)));
      }
      capLabel(ctx, 'one filter  3×3×3', kx + 3 * kcell / 2, ky - 10);

      const fx = kx + 3 * kcell + 60, fcell = 30, fgrid = (W - 2) * fcell, fy = midY - fgrid / 2;
      arrow(ctx, kx + 3 * kcell + 12, midY, fx - 10, midY, '=');
      grid(ctx, fx, fy, fcell, outs[0], v => divColor(v, ma));
      capLabel(ctx, 'feature map  3×3×1', fx + fgrid / 2, fy - 12);

      const s = outs[0][0][0];
      ctx.fillStyle = '#555'; ctx.font = '12.5px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('one filter spans all 3 input channels: 3×3×3 = 27 weights + 1 bias', 56, y0 + gridW + 48);
      ctx.fillText(`→ one number per position (e.g. output[0][0] = ${s.toFixed(1)})`, 56, y0 + gridW + 68);
    }

    else if (o.mode === 'multi' || o.mode === 'features') {
      // input stack (depth CIN)  →  K filters  →  output stack (depth K)
      const x0 = 56, y0 = midY - gridW / 2;
      stack(ctx, x0, y0, cell, H, W, CIN, img[0], (v, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255), [120, 120, 120]);
      capLabel(ctx, 'input  5×5×3', x0 + gridW / 2, y0 + gridW + 22, '#bbb', 11);

      const bx = x0 + gridW + 46;
      arrow(ctx, x0 + gridW + 14, midY, bx + 44, midY, `${K} filters`);
      // K little filter chips
      for (let f = 0; f < K; f++) {
        const chy = midY - (K * 20) / 2 + f * 20;
        ctx.fillStyle = '#eef2f7'; ctx.strokeStyle = '#c3d0e0'; ctx.lineWidth = 1;
        ctx.fillRect(bx, chy, 40, 15); ctx.strokeRect(bx - 0.5, chy - 0.5, 40, 15);
      }

      const ocell = 30, ogrid = (W - 2) * ocell, ox = bx + 92, oy = midY - ogrid / 2;
      // output stack, front = feature map colored per-channel in features mode
      const featCols = [POS, [123, 31, 162], NEG];
      for (let k = K - 1; k >= 1; k--) {
        const gx = ox + k * 9, gy = oy - k * 9;
        const col = o.mode === 'features' ? featCols[k % featCols.length] : [120, 120, 120];
        grid(ctx, gx, gy, ocell, outs[k], v => divColor(v, ma), null);
        void col;
      }
      grid(ctx, ox, oy, ocell, outs[0], v => (o.mode === 'features' ? tintColor(Math.abs(v) / ma, featCols[0]) : divColor(v, ma)));
      capLabel(ctx, `output  3×3×${K}`, ox + ogrid / 2 + 9, oy + ogrid + 26, '#bbb', 11);

      if (o.mode === 'multi') {
        line('input channels', String(CIN));
        line('filters', String(K));
        line('output channels', String(K), '#2e7d32');
        note(['Output channels = number of', 'filters. You choose K; each filter', 'is its own C×3×3 stack and makes', 'one feature map.']);
      } else {
        line('each output channel', 'a feature type', '#7b1fa2');
        note(['One channel might fire on', 'vertical edges, another on a', 'colour blob. Tensor depth =', 'how many features detected', 'at each location.']);
      }
    }

    else if (o.mode === 'params') {
      const x0 = 60, y0 = midY - gridW / 2;
      stack(ctx, x0, y0, cell, H, W, CIN, img[0], (v, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255), [120, 120, 120]);
      capLabel(ctx, 'input  5×5×3', x0 + gridW / 2, y0 + gridW + 22, '#bbb', 11);
      const per = CIN * 9 + 1, total = K * per;
      ctx.fillStyle = '#555'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('weight tensor shape:  [ K, C_in, k_H, k_W ]  =  [ ' + `${K}, ${CIN}, 3, 3 ]`, 60, y0 + gridW + 50);
      ctx.fillText('space is weight-shared (one kernel slid everywhere);', 60, y0 + gridW + 72);
      ctx.fillText('channels are NOT — every in→out channel pair has its own kernel.', 60, y0 + gridW + 90);
      line('weights per filter', `${CIN}·3·3 + 1 = ${per}`);
      line('total (K filters)', `${K} × ${per} = ${total}`, '#2e7d32');
      note(['A dense layer on the same input', 'would need one weight per', '(pixel × output) — orders of', 'magnitude more.']);
    }

    else if (o.mode === 'onexone') {
      // 1×1 conv: input stack → 1×1×Cin filter at a pixel → one output; K of them → depth K
      const x0 = 60, y0 = midY - gridW / 2;
      stack(ctx, x0, y0, cell, H, W, CIN, img[0], (v, i, j) => rgb(img[0][i][j] * 255, img[1][i][j] * 255, img[2][i][j] * 255), [120, 120, 120]);
      // highlight one pixel column through the depth
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2.4; ctx.strokeRect(x0 + 2 * cell - 1, y0 + 2 * cell - 1, cell + 1, cell + 1);
      capLabel(ctx, 'input  5×5×3', x0 + gridW / 2, y0 + gridW + 22, '#bbb', 11);
      arrow(ctx, x0 + gridW + 14, midY, x0 + gridW + 70, midY, '1×1');
      // one output pixel
      const ox = x0 + gridW + 84;
      ctx.fillStyle = divColor(0.6, 1); ctx.fillRect(ox, midY - 14, 28, 28); ctx.strokeStyle = '#bbb'; ctx.strokeRect(ox - 0.5, midY - 14.5, 28, 28);
      capLabel(ctx, 'mix of the 3 channels', ox + 14, midY + 40, '#999', 11);
      line('spatial extent', '1 × 1');
      line('what it does', 'mix channels', '#1565c0');
      note(['A 1×1 filter has no spatial reach —', 'it is a weighted sum ACROSS', 'channels at each pixel. Use K of', 'them to change the channel count', '(the ResNet/Inception bottleneck).']);
    }
  });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Channels in CNNs',
  subject: 'Machine Learning',

  initState() { return {}; },
  init(c2d) { c2d.scale = 1; },

  steps: [
    {
      title: 'An image is a stack of channels',
      description: 'A colour image is not a flat grid — at every pixel it holds three numbers, red, green and blue. Each of those forms its own 2D map: a $\\textbf{channel}$. So the data is $H \\times W \\times C$; a channel is one slice of that depth. Grayscale is $C=1$; RGB is $C=3$.',
      equation: '\\text{tensor shape} = H \\times W \\times C',
      notes: 'This third axis — depth, or channels — is the one that confuses people. Hold onto the picture: every tensor flowing through a CNN is a stack of 2D feature maps, and "channels" is how many are in the stack.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'stack' }); },
    },
    {
      title: 'One filter spans all input channels',
      description: 'Here is the crux. A "$3\\times3$ filter" on a 3-channel input is not 9 weights — it is $3\\times3\\times3 = 27$ (plus a bias). The filter slides over width and height, but at each position it covers the $\\textbf{full depth}$ at once, multiplies all 27 values by its 27 weights, and sums them to a $\\textbf{single}$ number. Three input channels collapse into one feature map.',
      equation: '(\\mathbf{I} * \\mathbf{K})_{ij} = \\sum_{c}\\sum_{a,b} \\mathbf{I}_{c,\\,i+a,\\,j+b}\\;\\mathbf{K}_{c,a,b} + b',
      notes: 'The filter does NOT slide along the channel axis — it spans it. That is why one filter, however many input channels it sees, produces exactly one output channel.\n\nValid convolution of 5×5 by 3×3 gives a 3×3 map, as before; the channel collapse happens on top of that.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'collapse' }); },
    },
    {
      title: 'Many filters → many output channels',
      description: 'A convolutional layer is not one filter but a $\\textbf{bank of } K$. Each filter is its own $C_{\\text{in}}\\times3\\times3$ stack and produces one feature map; stack those $K$ maps and the layer outputs $H \\times W \\times K$. So the number of output channels is simply how many filters you put in the layer.',
      equation: '\\text{output channels} = \\text{number of filters } K',
      notes: 'Input channels are handed to you by the previous layer; output channels are your design choice. The very next layer\'s filters will then be C×3×3 with C = this K — each new filter looks across all K maps below it.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'multi' }); },
    },
    {
      title: 'Space is shared; channels are not',
      description: 'Along width and height the $\\textbf{same}$ kernel is reused at every position — the parameter sharing that gives translation equivariance. Along channels there is $\\textbf{no}$ sharing: every filter has its own kernel for every input channel. A conv layer is convolutional in space but fully-connected in depth.',
      equation: '\\text{weights} = [\\,K,\\; C_{\\text{in}},\\; k_H,\\; k_W\\,]',
      notes: 'That 4-D weight tensor is the whole story of a conv layer. Read the counts on the right: a handful of weights per filter, reused across every pixel — cheap, and with a built-in prior that patterns can appear anywhere.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'params' }); },
    },
    {
      title: 'Channels are feature types',
      description: 'What do the output channels $\\textbf{mean}$? After training, each is a different learned detector: one channel\'s map lights up on vertical edges, another on horizontal, another on a patch of colour. The depth of a tensor is how many distinct features the layer looks for at each location — edges early, textures and object-parts deeper.',
      equation: '\\text{channel } k \\;\\equiv\\; \\text{response of feature detector } k',
      notes: 'This is why deep tensors get "taller" (more channels) as they get spatially smaller: the network trades resolution for a richer vocabulary of features.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'features' }); },
    },
    {
      title: 'The 1×1 convolution: pure channel mixing',
      description: 'The cleanest way to feel that channels are a dense dimension: a $1\\times1$ convolution. It has no spatial extent at all — a $1\\times1\\times C_{\\text{in}}$ filter is just a weighted sum $\\textbf{across channels}$ at each pixel. It does nothing spatially and everything channel-wise, and by choosing how many you use it re-sizes the channel count.',
      equation: '\\text{out}_{ij} = \\sum_{c} w_c \\, \\mathbf{I}_{c,i,j}',
      notes: 'This is the "bottleneck" trick in ResNet and Inception: cheaply shrink 256 channels to 64, do the expensive 3×3 work, then expand back. It only makes sense once you see the channel axis as a small dense layer applied identically at every pixel.',
      setup() {}, update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'onexone' }); },
    },
  ],
};
