// Convolutional Networks — why images want convolution, not dense layers.
// Prince, Understanding Deep Learning, Chapter 10.
//
// The arc: the parameter blow-up of flattening an image into a dense layer;
// convolution as a small kernel sliding and taking a dot product; kernels as
// learned feature detectors; parameter sharing → translation equivariance
// (shift the input, the feature map shifts); stride & padding and the output-size
// formula; max-pooling for downsampling and local invariance; and stacking, where
// the receptive field grows and features get more abstract.
//
// All feature maps are computed live by cross-correlation, so the picture always
// matches the arithmetic. Verified in node: 7×7 ⊛ 3×3 (valid) → 5×5, stride 2 → 3×3,
// 2×2 max-pool of 5×5 → 2×2.

// ── Data ────────────────────────────────────────────────────────────────────
const IN = 7;

// A "plus" shape: a vertical bar (cols 3–4) and a horizontal bar (rows 3–4),
// optionally shifted horizontally so we can watch equivariance.
function makeInput(shift = 0) {
  const g = [];
  for (let i = 0; i < IN; i++) {
    const row = [];
    for (let j = 0; j < IN; j++) {
      const jj = j - shift;
      const vbar = jj === 3 || jj === 4;
      const hbar = i === 3 || i === 4;
      row.push(vbar || hbar ? 1 : 0);
    }
    g.push(row);
  }
  return g;
}

const KERNELS = {
  'Identity':        [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  'Vertical edge':   [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  'Horizontal edge': [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  'Blur':            [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]],
  'Sharpen':         [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
};
const KERNEL_NAMES = Object.keys(KERNELS);

function convolve(img, ker, stride = 1) {
  const H = img.length, W = img[0].length, k = ker.length;
  const oH = Math.floor((H - k) / stride) + 1, oW = Math.floor((W - k) / stride) + 1;
  const out = [];
  for (let i = 0; i < oH; i++) {
    const row = [];
    for (let j = 0; j < oW; j++) {
      let s = 0;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) s += img[i * stride + a][j * stride + b] * ker[a][b];
      row.push(s);
    }
    out.push(row);
  }
  return out;
}

function maxpool2(m) {
  const H = m.length, W = m[0].length, oH = Math.floor(H / 2), oW = Math.floor(W / 2), out = [];
  for (let i = 0; i < oH; i++) {
    const row = [];
    for (let j = 0; j < oW; j++) {
      let mx = -Infinity;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) mx = Math.max(mx, m[i * 2 + a][j * 2 + b]);
      row.push(mx);
    }
    out.push(row);
  }
  return out;
}

const maxAbs = m => Math.max(1e-9, ...m.flat().map(Math.abs));

// ── Colour ──────────────────────────────────────────────────────────────────
const POS = [21, 101, 192], NEG = [232, 113, 10], INK = [55, 71, 79];
const lerp = (a, b, t) => a + (b - a) * t;
const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
function grayColor(v) { return rgb([lerp(255, INK[0], v), lerp(255, INK[1], v), lerp(255, INK[2], v)]); }
function divColor(v, ma) {
  const t = Math.max(-1, Math.min(1, v / ma));
  const c = t >= 0 ? POS : NEG, a = Math.abs(t);
  return rgb([lerp(255, c[0], a), lerp(255, c[1], a), lerp(255, c[2], a)]);
}
const fmtNum = v => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1));

// ── Grid drawing ────────────────────────────────────────────────────────────
function drawGrid(ctx, x, y, cell, data, o = {}) {
  const H = data.length, W = data[0].length;
  for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
    const v = data[i][j];
    ctx.fillStyle = o.type === 'div' ? divColor(v, o.maxabs) : grayColor(v);
    ctx.fillRect(x + j * cell, y + i * cell, cell - 1, cell - 1);
    if (o.labels) {
      const strong = o.type === 'div' ? Math.abs(v / o.maxabs) > 0.55 : v > 0.55;
      ctx.fillStyle = strong ? '#fff' : '#666';
      ctx.font = `${Math.floor(cell * 0.34)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(fmtNum(v), x + j * cell + cell / 2, y + i * cell + cell / 2);
    }
  }
  ctx.strokeStyle = '#e2e2e2'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, W * cell, H * cell);
  // highlighted input patch (receptive window)
  if (o.patch) {
    const [pi, pj, ph, pw] = o.patch;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + pj * cell - 1, y + pi * cell - 1, pw * cell + 1, ph * cell + 1);
  }
  if (o.cell) {
    const [ci, cj] = o.cell;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
    ctx.strokeRect(x + cj * cell - 1, y + ci * cell - 1, cell + 1, cell + 1);
  }
  if (o.title) {
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(o.title, x + W * cell / 2, y - 10);
  }
  if (o.sub) {
    ctx.fillStyle = '#bbb'; ctx.font = '10.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(o.sub, x + W * cell / 2, y + H * cell + 16);
  }
  return { w: W * cell, h: H * cell };
}

function arrow(ctx, x0, y0, x1, y1, label) {
  ctx.strokeStyle = '#c8c8c8'; ctx.fillStyle = '#c8c8c8'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), h = 7;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4));
  ctx.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4));
  ctx.fill();
  if (label) { ctx.fillStyle = '#aaa'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, (x0 + x1) / 2, y0 - 8); }
}

// ── Main draw ───────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  const img = makeInput(st.shift);
  const ker = KERNELS[st.kernel];
  const fmap = convolve(img, ker, st.stride);
  const ma = maxAbs(fmap);

  c2d.raw((ctx, c) => {
    const midY = c.height * 0.46;
    const cellIn = Math.min(38, Math.max(22, (c.width - 380) / 20));
    const inW = IN * cellIn;

    // ── layout anchors ──
    const leftX = 70;
    const inY = midY - inW / 2;

    // sliding-window animation position (over the feature map)
    let pos = null;
    if (o.slide) {
      const total = fmap.length * fmap[0].length;
      const idx = Math.floor(st.anim) % total;
      pos = [Math.floor(idx / fmap[0].length), idx % fmap[0].length];
    }

    // INPUT
    const patch = pos ? [pos[0] * st.stride, pos[1] * st.stride, ker.length, ker.length] : (o.rfPatch || null);
    drawGrid(ctx, leftX, inY, cellIn, img, {
      type: 'gray', labels: o.inLabels, title: `input  ${IN}×${IN}`,
      patch, sub: o.inSub,
    });

    // KERNEL (small, centre)
    const cellK = 30, kX = leftX + inW + 70, kSize = ker.length * cellK;
    const kY = midY - kSize / 2;
    if (o.showKernel) {
      drawGrid(ctx, kX, kY, cellK, ker, { type: 'div', maxabs: maxAbs(ker), labels: true, title: `kernel  ${st.kernel}` });
      arrow(ctx, leftX + inW + 12, midY, kX - 12, midY, '⊛');
    }

    // FEATURE MAP
    const fX = o.showKernel ? kX + kSize + 70 : leftX + inW + 90;
    const cellF = cellIn * (IN / Math.max(fmap.length, 4)) * 0.9;
    const fY = midY - fmap.length * cellF / 2;
    if (o.showFeature) {
      drawGrid(ctx, fX, fY, cellF, fmap, {
        type: 'div', maxabs: ma, labels: o.fLabels, cell: pos,
        title: `feature map  ${fmap.length}×${fmap[0].length}`,
        sub: o.stride > 1 ? `stride ${st.stride}` : null,
      });
      if (o.showKernel) arrow(ctx, kX + kSize + 12, midY, fX - 12, midY);
      else arrow(ctx, leftX + inW + 12, midY, fX - 12, midY, '⊛ ' + st.kernel);
    }

    // POOL
    if (o.pool) {
      const pooled = maxpool2(fmap);
      const cellP = cellF, pX = fX + fmap[0].length * cellF + 66, pY = midY - pooled.length * cellP / 2;
      drawGrid(ctx, pX, pY, cellP, pooled, {
        type: 'div', maxabs: ma, labels: true, title: `2×2 max-pool  ${pooled.length}×${pooled[0].length}`,
      });
      arrow(ctx, fX + fmap[0].length * cellF + 12, midY, pX - 12, midY, 'max');
    }

    // ── the running multiply–accumulate for the slide step ──
    if (o.slide && pos) {
      const [oi, oj] = pos;
      let s = 0;
      for (let a = 0; a < ker.length; a++) for (let b = 0; b < ker.length; b++)
        s += img[oi * st.stride + a][oj * st.stride + b] * ker[a][b];
      ctx.fillStyle = '#555'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`output[${oi}][${oj}]  =  Σ (patch · kernel)  =  ${fmtNum(s)}`, leftX, inY + inW + 46);
    }

    // ── receptive-field schematic (step 7) ──
    if (o.receptive) {
      ctx.fillStyle = '#555'; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('one unit two conv-layers deep sees a 5×5 patch of the input', leftX, inY + inW + 46);
      ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
      ctx.fillText('stack more layers → the receptive field grows → features get more abstract', leftX, inY + inW + 66);
    }

    // ── right-side readout ──
    const rx = Math.max(fX + fmap[0].length * cellF + 40, c.width - 250);
    let ry = 54;
    const row = (label, val, color = '#333') => {
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, rx, ry);
      ctx.fillStyle = color; ctx.font = '600 15px system-ui'; ctx.fillText(val, rx, ry + 19); ry += 46;
    };
    if (o.params) {
      const dense = (IN * IN) * (fmap.length * fmap[0].length);
      row('dense layer weights', dense.toLocaleString(), '#c62828');
      row('conv kernel weights', String(ker.length * ker.length), '#2e7d32');
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui';
      ctx.fillText('the same 9 weights are reused', rx, ry);
      ctx.fillText('at every position — that reuse is', rx, ry + 15);
      ctx.fillText('what makes it translation-equivariant.', rx, ry + 30);
    }
    if (o.sizeInfo) {
      row('output size formula', '(N − k)/s + 1');
      row(`(${IN} − ${ker.length})/${st.stride} + 1`, `${fmap.length}`);
    }
  });
}

// ── Panel controls ──────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function kernelButtons(st) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
  KERNEL_NAMES.forEach(name => {
    const b = document.createElement('button');
    b.textContent = name;
    const sel = () => st.kernel === name;
    b.style.cssText = `padding:5px 9px;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid ${sel() ? '#1565c0' : '#ccc'};background:${sel() ? '#1565c0' : '#fff'};color:${sel() ? '#fff' : '#555'};`;
    b.addEventListener('click', () => {
      st.kernel = name;
      wrap.querySelectorAll('button').forEach((btn, i) => {
        const on = KERNEL_NAMES[i] === name;
        btn.style.border = `1px solid ${on ? '#1565c0' : '#ccc'}`;
        btn.style.background = on ? '#1565c0' : '#fff';
        btn.style.color = on ? '#fff' : '#555';
      });
    });
    wrap.appendChild(b);
  });
  st._controls.appendChild(wrap);
}

function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'cnn-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}

// ── Lesson ──────────────────────────────────────────────────────────────────
export default {
  title:   'Convolutional Networks',
  subject: 'Machine Learning',

  initState() {
    return { kernel: 'Vertical edge', stride: 1, shift: 0, anim: 0, _controls: null };
  },

  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'Why not just flatten the image?',
      description: 'A dense (fully-connected) layer treats an image as one long vector and gives every output its own weight to every pixel. That throws away all spatial structure and explodes the parameter count — even this tiny $7\\times7$ image would need thousands of weights for a single small layer.',
      equation: '\\text{dense weights} = (\\text{pixels}) \\times (\\text{outputs})',
      notes: 'Two things are wrong with the dense approach for images: it has no notion that nearby pixels belong together, and a pattern learned in one corner has to be re-learned from scratch in every other corner.\n\nConvolution fixes both by using a small, reusable filter. That is the whole idea of this lesson.',
      setup(c2d, st) { st.kernel = 'Vertical edge'; st.stride = 1; st.shift = 0; clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { inLabels: true, params: true, inSub: 'flattened → a 49-vector' }); },
    },
    {
      title: 'Convolution: a small kernel slides and takes a dot product',
      description: 'A convolution slides a small $3\\times3$ kernel across the image. At each position it multiplies the overlapping patch by the kernel element-by-element and sums — one number, written into the feature map. Watch the black window move; the highlighted output cell is the sum it just produced.',
      equation: '(\\text{feature})_{ij} = \\sum_{a,b} \\text{input}_{i+a,\\,j+b}\\; \\cdot\\; \\text{kernel}_{a,b}',
      notes: 'This is the same "multiply-and-accumulate" as a dot product, applied to a little patch at a time. A valid convolution of a 7×7 input with a 3×3 kernel produces a 5×5 map — you lose a one-pixel border because the kernel needs room to sit.\n\nThe kernel here detects vertical edges: it fires positive (blue) on left edges, negative (orange) on right edges.',
      setup(c2d, st) {
        st.kernel = 'Vertical edge'; st.stride = 1; st.shift = 0; st.anim = 0; clearControls(st);
      },
      update(c2d, st, dt) { st.anim += (dt || 0.016) * 2.5; c2d.clearPersistent(); draw(c2d, st, { showKernel: true, showFeature: true, slide: true, inLabels: true }); },
    },
    {
      title: 'The kernel is a feature detector',
      description: 'Change the kernel and the feature map lights up wherever that feature appears. A vertical-edge kernel responds along vertical strokes, a horizontal-edge kernel along horizontal ones, a blur smooths, a sharpen accentuates. In a real network these nine weights are not hand-designed — they are learned by gradient descent.',
      equation: '\\text{kernel weights are parameters, learned end-to-end}',
      notes: 'Try each kernel and read the feature map. Blue = strong positive response, orange = strong negative, pale = little response.\n\nThe key mental shift: a convolutional layer is a bank of these detectors. Training discovers which little patterns are worth detecting — edges and blobs in early layers, then textures, then parts.',
      setup(c2d, st) { st.stride = 1; st.shift = 0; clearControls(st); kernelButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showKernel: true, showFeature: true, fLabels: true }); },
    },
    {
      title: 'Parameter sharing → translation equivariance',
      description: 'The same kernel is applied at every position, so a convolutional layer has only as many weights as the kernel — nine here, no matter how big the image. And because the detector is the same everywhere, moving the input moves the response with it: shift the plus and the feature map shifts identically. That property is translation equivariance.',
      equation: '\\text{shift the input} \\;\\Rightarrow\\; \\text{the feature map shifts the same way}',
      notes: 'Drag the shift slider and watch the feature map slide in lockstep — the network did not have to learn the pattern separately at each location.\n\nCompare the weight counts on the right: a dense layer needs one weight per (pixel × output); the kernel reuses just nine. Fewer parameters, and a built-in prior that objects can appear anywhere.',
      setup(c2d, st) {
        st.kernel = 'Vertical edge'; st.stride = 1; clearControls(st);
        addSlider(st, 'shift input →', 0, 2, 1, () => st.shift, v => st.shift = v, v => `${v} col`);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showKernel: true, showFeature: true, params: true }); },
    },
    {
      title: 'Stride & padding set the output size',
      description: 'Stride is how far the kernel jumps between positions. Stride 1 visits every pixel; stride 2 skips every other one, halving the feature map and downsampling. With no padding the output shrinks by the kernel size; padding the border with zeros can keep it the same size.',
      equation: '\\text{out} = \\left\\lfloor \\frac{N - k + 2p}{s} \\right\\rfloor + 1',
      notes: 'Drag the stride. At stride 1 the 7×7 input gives a 5×5 map; at stride 2 it gives 3×3. Larger stride = coarser, cheaper feature map.\n\nThe formula on the right is worth memorising — it is how you track tensor shapes through a whole network (here with padding p = 0).',
      setup(c2d, st) {
        st.kernel = 'Vertical edge'; st.shift = 0; clearControls(st);
        addSlider(st, 'stride s', 1, 3, 1, () => st.stride, v => st.stride = v, v => `${v}`);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showKernel: true, showFeature: true, fLabels: true, sizeInfo: true, stride: true }); },
    },
    {
      title: 'Pooling: downsample and gain local invariance',
      description: 'Max-pooling slides a small window (here $2\\times2$) and keeps only the maximum in each. It halves the resolution and, because it reports "was the feature present anywhere in this window" rather than exactly where, it buys a little translation invariance on top of convolution.',
      equation: '(\\text{pool})_{ij} = \\max_{a,b \\in 2\\times2} (\\text{feature})_{2i+a,\\,2j+b}',
      notes: 'The 5×5 feature map becomes a 2×2 summary — each cell the strongest response in its quadrant.\n\nConvolution is equivariant (feature moves with the input); pooling adds a dose of invariance (small moves stop mattering). Stacked, they let deep layers care about what is present without fussing over exact pixels.',
      setup(c2d, st) { st.kernel = 'Vertical edge'; st.stride = 1; st.shift = 0; clearControls(st); kernelButtons(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showFeature: true, pool: true }); },
    },
    {
      title: 'Stacking: the receptive field grows',
      description: 'Real CNNs stack many conv-and-pool layers. A single $3\\times3$ conv sees a $3\\times3$ patch; feed its output into another $3\\times3$ conv and that unit now depends on a $5\\times5$ patch of the original image. Layer by layer the receptive field widens, so deep units respond to large, abstract structure — edges become textures become parts become objects.',
      equation: '\\text{two } 3\\times3 \\text{ convs} \\;\\Rightarrow\\; 5\\times5 \\text{ receptive field}',
      notes: 'The black box marks the input region a single deep unit can "see". Early layers are local and concrete; deep layers are global and abstract — the hierarchy that makes CNNs so effective on images.\n\nThat is the whole architecture: convolution for cheap, shift-equivariant feature detection; pooling for downsampling and invariance; depth for a growing receptive field.',
      setup(c2d, st) { st.kernel = 'Vertical edge'; st.stride = 1; st.shift = 0; clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showFeature: true, receptive: true, rfPatch: [1, 1, 5, 5] }); },
    },
  ],
};
