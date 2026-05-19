// Shallow Neural Network — 2D heatmap
// Reproduces Figure 3.8 from Prince — Understanding Deep Learning.
// Shows how three ReLU hidden units compose to produce a piecewise linear surface.

const W = 3.2;  // world half-extent of heatmap (input [-1,1] maps to world [-W,W])

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return {
    h: [
      [-0.3,  1.5,  0.9],   // unit 1: [bias, w_x1, w_x2]
      [ 0.1,  0.2,  1.8],   // unit 2
      [ 0.2, -1.3,  0.8],   // unit 3
    ],
    phi: [0.0, 0.8, -0.7, 0.6],  // [phi0, phi1, phi2, phi3]
    _controls: null,
  };
}

// ── Math ──────────────────────────────────────────────────────────────────────

function preAct(theta, x1, x2) {
  return theta[0] + theta[1] * x1 + theta[2] * x2;
}

const relu = z => Math.max(0, z);

// ── Color ─────────────────────────────────────────────────────────────────────

// Warm palette: dark brown → burnt orange → pale gold — matches the book's figure
function valToRGB(v, lo, hi) {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  let r, g, b;
  if (t < 0.5) {
    const s = t * 2;
    r = (42  + s * 155) | 0;
    g = (16  + s *  66) | 0;
    b = ( 4  + s *  14) | 0;
  } else {
    const s = (t - 0.5) * 2;
    r = (197 + s *  48) | 0;
    g = ( 82 + s * 128) | 0;
    b = ( 18 + s * 122) | 0;
  }
  return [r, g, b];
}

// ── Heatmap ───────────────────────────────────────────────────────────────────

function drawHeatmap(ctx, c, valueFn, lo, hi) {
  const sxMin = c.wx(-W) | 0;
  const sxMax = c.wx( W) | 0;
  const syMin = c.wy( W) | 0;   // small canvas y = top = large world y
  const syMax = c.wy(-W) | 0;
  const pw = sxMax - sxMin;
  const ph = syMax - syMin;
  if (pw <= 1 || ph <= 1) return;

  const img = ctx.createImageData(pw, ph);
  const d   = img.data;
  const pwm = pw - 1, phm = ph - 1;
  for (let py = 0; py < ph; py++) {
    const x2 = 1 - (py / phm) * 2;       // top → x2=+1, bottom → x2=−1
    for (let px = 0; px < pw; px++) {
      const x1 = (px / pwm) * 2 - 1;      // left → x1=−1, right → x1=+1
      const v  = valueFn(x1, x2);
      const [r, g, b] = valToRGB(v, lo, hi);
      const i = (py * pw + px) * 4;
      d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
    }
  }
  ctx.putImageData(img, sxMin, syMin);
}

// ── Boundary line ─────────────────────────────────────────────────────────────

// Draw the zero-crossing of theta[0] + theta[1]*x1 + theta[2]*x2 = 0
// clipped to the heatmap square.
function drawBoundary(ctx, c, theta, color = '#4dd0c4', lw = 2.5) {
  const [b, w1, w2] = theta;
  let p0, p1;

  if (Math.abs(w2) > 0.01) {
    // x2 = -(b + w1*x1) / w2  evaluated at x1 = ±1
    p0 = [-1, -(b - w1) / w2];
    p1 = [ 1, -(b + w1) / w2];
  } else if (Math.abs(w1) > 0.01) {
    // Nearly vertical line: x1 = -b/w1
    const x1 = -b / w1;
    p0 = [x1, -2]; p1 = [x1, 2];
  } else return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(c.wx(-W), c.wy(W), c.wx(W) - c.wx(-W), c.wy(-W) - c.wy(W));
  ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.moveTo(c.wx(p0[0] * W), c.wy(p0[1] * W));
  ctx.lineTo(c.wx(p1[0] * W), c.wy(p1[1] * W));
  ctx.stroke();
  ctx.restore();
}

// ── Frame (axes + title) ──────────────────────────────────────────────────────

function drawFrame(ctx, c, title) {
  const sx0 = c.wx(-W), sx1 = c.wx(W);
  const sy0 = c.wy( W), sy1 = c.wy(-W);

  ctx.strokeStyle = '#ccc';
  ctx.lineWidth   = 1;
  ctx.strokeRect(sx0, sy0, sx1 - sx0, sy1 - sy0);

  ctx.fillStyle  = '#999';
  ctx.font       = '11px system-ui';
  ctx.textAlign  = 'center';
  for (const [x1, label] of [[-1, '−1'], [0, '0'], [1, '1']]) {
    ctx.fillText(label, c.wx(x1 * W), sy1 + 15);
  }
  ctx.fillStyle = '#777';
  ctx.font      = '12px system-ui';
  ctx.fillText('Input, x₁', c.wx(0), sy1 + 30);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#999';
  ctx.font      = '11px system-ui';
  for (const [x2, label] of [[1, '1'], [0, '0'], [-1, '−1']]) {
    ctx.fillText(label, sx0 - 6, c.wy(x2 * W) + 4);
  }

  ctx.save();
  ctx.translate(sx0 - 30, c.wy(0));
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign  = 'center';
  ctx.fillStyle  = '#777';
  ctx.font       = '12px system-ui';
  ctx.fillText('Input, x₂', 0, 0);
  ctx.restore();

  if (title) {
    ctx.fillStyle = '#555';
    ctx.font      = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(title, c.wx(0), sy0 - 8);
  }
  ctx.textAlign = 'left';
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `sn-${Math.random().toString(36).slice(2,8)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span>
      <span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(2)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const vel = wrap.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    vel.textContent = v.toFixed(2);
    onChange(v);
  });
}

function addSectionLabel(container, text) {
  const div = document.createElement('div');
  div.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#ccc;padding-top:6px;font-family:system-ui;';
  div.textContent = text;
  container.appendChild(div);
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Shallow Neural Network',
  subject: 'Machine Learning',

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 70;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: The input space ────────────────────────────────────────────────
    {
      title: 'The 2D Input Space',
      description: 'A network with two inputs x = [x₁, x₂]ᵀ maps every point in this plane to an output value. We can visualise that mapping as a heatmap — dark means low output, light means high output — and read off what the network is doing across the entire input space at once.',
      equation: '\\mathbf{x} = [x_1,\\, x_2]^T,\\quad x_1{,}\\,x_2 \\in [-1, 1]',
      notes: 'Our network has three hidden units and one output. Each hidden unit computes a function of the input, and the output is a weighted sum of those results.\n\nThe next steps build this up one piece at a time, ending with the full piecewise linear surface.',
      setup(c2d, state) {
        clearControls(state);
        c2d.raw((ctx, c) => {
          const sx0 = c.wx(-W), sx1 = c.wx(W);
          const sy0 = c.wy( W), sy1 = c.wy(-W);
          ctx.fillStyle = '#f5f0ec';
          ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
          ctx.strokeStyle = '#e0d8d0';
          ctx.lineWidth   = 1;
          for (const v of [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75]) {
            ctx.beginPath();
            ctx.moveTo(c.wx(v * W), sy0);
            ctx.lineTo(c.wx(v * W), sy1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sx0, c.wy(v * W));
            ctx.lineTo(sx1, c.wy(v * W));
            ctx.stroke();
          }
          drawFrame(ctx, c, null);
        });
      },
    },

    // ── Step 2: Pre-activation ─────────────────────────────────────────────────
    {
      title: 'Pre-activation: a linear function',
      description: 'Each hidden unit starts by computing a weighted sum of the inputs plus a bias — a linear function z = θ₀ + θ₁x₁ + θ₂x₂. Over the input plane, a linear function is always a tilted plane viewed from above: a smooth gradient of parallel stripes.',
      equation: 'z_1 = \\theta_{10} + \\theta_{11}x_1 + \\theta_{12}x_2',
      notes: 'θ₁₀ (bias) slides the stripes left or right without rotating them.\n\nθ₁₁ controls how steeply the function rises across x₁ — large |θ₁₁| makes densely packed near-vertical stripes.\n\nθ₁₂ does the same for x₂ — large |θ₁₂| makes near-horizontal stripes.\n\nNo matter what the weights are, the pattern is always smooth parallel stripes. The kink that makes a neural network interesting comes in the next step.',
      setup(c2d, state) {
        clearControls(state);
        state.h[0] = [-0.3, 1.5, 0.9];
        addSlider(state._controls, 'θ₁₀ (bias)',        -2, 2, 0.05, state.h[0][0], v => state.h[0][0] = v);
        addSlider(state._controls, 'θ₁₁ (weight on x₁)', -2, 2, 0.05, state.h[0][1], v => state.h[0][1] = v);
        addSlider(state._controls, 'θ₁₂ (weight on x₂)', -2, 2, 0.05, state.h[0][2], v => state.h[0][2] = v);
        c2d.raw((ctx, c) => {
          drawHeatmap(ctx, c, (x1, x2) => preAct(state.h[0], x1, x2), -2.5, 2.5);
          drawFrame(ctx, c, 'z₁ = θ₁₀ + θ₁₁x₁ + θ₁₂x₂');
        });
      },
    },

    // ── Step 3: ReLU ──────────────────────────────────────────────────────────
    {
      title: 'ReLU: folding the plane',
      description: 'The ReLU activation clamps all negative values to zero: h₁ = max(0, z₁). This folds the plane in half — everywhere z₁ < 0 collapses to a uniform dark floor. The teal line marks the fold: it is exactly where z₁ = 0.',
      equation: 'h_1 = \\max(0,\\, z_1)',
      notes: 'The teal line is the decision boundary — below it, h₁ = 0 regardless of how far below.\n\nSlide the bias θ₁₀ to move the fold line across the space. Adjust the weights to rotate it.\n\nEvery ReLU hidden unit creates exactly one such fold. The geometry of the network is really the geometry of how these folds are arranged in the input space.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'θ₁₀ (bias)',          -2, 2, 0.05, state.h[0][0], v => state.h[0][0] = v);
        addSlider(state._controls, 'θ₁₁ (weight on x₁)', -2, 2, 0.05, state.h[0][1], v => state.h[0][1] = v);
        addSlider(state._controls, 'θ₁₂ (weight on x₂)', -2, 2, 0.05, state.h[0][2], v => state.h[0][2] = v);
        c2d.raw((ctx, c) => {
          drawHeatmap(ctx, c, (x1, x2) => relu(preAct(state.h[0], x1, x2)), 0, 2.5);
          drawBoundary(ctx, c, state.h[0]);
          drawFrame(ctx, c, 'h₁ = max(0, z₁)');
        });
      },
    },

    // ── Step 4: Output weight ─────────────────────────────────────────────────
    {
      title: 'Output weight: scaling the contribution',
      description: 'Before being summed, each hidden unit is multiplied by an output weight φ. A positive φ keeps the active region bright. A negative φ flips it — the active region becomes dark and the zero region becomes the brighter baseline. φ = 0 silences the unit entirely.',
      equation: '\\phi_1 h_1 = \\phi_1 \\max(0,\\, z_1)',
      notes: 'The fold line stays put — φ₁ only scales the output, it does not move the boundary.\n\nTry dragging φ₁ from +2 to −2. Watch the bright and dark sides swap.\n\nThis is how the network can represent both increasing and decreasing functions: it stacks positively and negatively weighted folds on top of each other.',
      setup(c2d, state) {
        clearControls(state);
        state.phi[1] = 0.8;
        addSlider(state._controls, 'θ₁₀ (bias, moves fold line)', -2, 2, 0.05, state.h[0][0], v => state.h[0][0] = v);
        addSlider(state._controls, 'φ₁ (output weight)',           -2, 2, 0.05, state.phi[1],  v => state.phi[1]  = v);
        c2d.raw((ctx, c) => {
          const fn = (x1, x2) => state.phi[1] * relu(preAct(state.h[0], x1, x2));
          drawHeatmap(ctx, c, fn, -2.5, 2.5);
          drawBoundary(ctx, c, state.h[0]);
          drawFrame(ctx, c, 'φ₁h₁ = φ₁ · max(0, z₁)');
        });
      },
    },

    // ── Step 5: Three hidden units ─────────────────────────────────────────────
    {
      title: 'Three hidden units — three folds',
      description: 'Three hidden units produce three fold lines. Each line divides the space in a different direction. The combination cuts the input plane into regions — and inside each region, a different subset of units is active, so the network computes a different linear function.',
      equation: 'y = \\phi_0 + \\phi_1 h_1 + \\phi_2 h_2 + \\phi_3 h_3',
      notes: 'Slide the bias of each unit to move its fold line without rotating it.\n\nNotice how the three lines divide the space: wherever all three are active the function is steeper; in corners where none are active, the output is just the constant φ₀.\n\nThe number of linear regions grows rapidly with more units — this is the source of a shallow network\'s expressive power.',
      setup(c2d, state) {
        clearControls(state);
        state.h   = [[-0.3, 1.5, 0.9], [0.1, 0.2, 1.8], [0.2, -1.3, 0.8]];
        state.phi = [0.0, 0.8, -0.7, 0.6];
        addSectionLabel(state._controls, 'Hidden unit biases (move fold lines)');
        addSlider(state._controls, 'θ₁₀ (unit 1)', -2, 2, 0.05, state.h[0][0], v => state.h[0][0] = v);
        addSlider(state._controls, 'θ₂₀ (unit 2)', -2, 2, 0.05, state.h[1][0], v => state.h[1][0] = v);
        addSlider(state._controls, 'θ₃₀ (unit 3)', -2, 2, 0.05, state.h[2][0], v => state.h[2][0] = v);
        c2d.raw((ctx, c) => {
          const { h, phi } = state;
          const fn = (x1, x2) => {
            const h1 = relu(preAct(h[0], x1, x2));
            const h2 = relu(preAct(h[1], x1, x2));
            const h3 = relu(preAct(h[2], x1, x2));
            return phi[0] + phi[1]*h1 + phi[2]*h2 + phi[3]*h3;
          };
          drawHeatmap(ctx, c, fn, -2.5, 2.5);
          drawBoundary(ctx, c, h[0]);
          drawBoundary(ctx, c, h[1]);
          drawBoundary(ctx, c, h[2]);
          drawFrame(ctx, c, 'y = φ₀ + φ₁h₁ + φ₂h₂ + φ₃h₃');
        });
      },
    },

    // ── Step 6: Full interactive ───────────────────────────────────────────────
    {
      title: 'Full network — all weights interactive',
      description: 'The hidden unit weights (θ) place and orient the fold lines. The output weights (φ) set the height of the surface in each region. Together they determine the complete piecewise linear function. More hidden units would add more fold lines and more linear pieces.',
      equation: 'y = \\phi_0 + \\sum_{i=1}^{D} \\phi_i\\, \\max\\!\\left(0,\\; \\theta_{i0} + \\boldsymbol{\\theta}_i^T \\mathbf{x}\\right)',
      notes: 'Output weights (φ) change the surface height without moving the fold lines.\nHidden unit weights (θ) move and rotate the fold lines.\n\nWith D hidden units, the network can represent any piecewise linear function with at most D linear regions in the input space. A deeper network (more layers) can represent exponentially more regions for the same number of weights.',
      setup(c2d, state) {
        clearControls(state);
        addSectionLabel(state._controls, 'Output weights (shape surface)');
        addSlider(state._controls, 'φ₁', -2, 2, 0.05, state.phi[1], v => state.phi[1] = v);
        addSlider(state._controls, 'φ₂', -2, 2, 0.05, state.phi[2], v => state.phi[2] = v);
        addSlider(state._controls, 'φ₃', -2, 2, 0.05, state.phi[3], v => state.phi[3] = v);
        addSlider(state._controls, 'φ₀ (bias)', -2, 2, 0.05, state.phi[0], v => state.phi[0] = v);
        addSectionLabel(state._controls, 'Hidden biases (move fold lines)');
        addSlider(state._controls, 'θ₁₀ (unit 1)', -2, 2, 0.05, state.h[0][0], v => state.h[0][0] = v);
        addSlider(state._controls, 'θ₂₀ (unit 2)', -2, 2, 0.05, state.h[1][0], v => state.h[1][0] = v);
        addSlider(state._controls, 'θ₃₀ (unit 3)', -2, 2, 0.05, state.h[2][0], v => state.h[2][0] = v);
        c2d.raw((ctx, c) => {
          const { h, phi } = state;
          const fn = (x1, x2) => {
            const h1 = relu(preAct(h[0], x1, x2));
            const h2 = relu(preAct(h[1], x1, x2));
            const h3 = relu(preAct(h[2], x1, x2));
            return phi[0] + phi[1]*h1 + phi[2]*h2 + phi[3]*h3;
          };
          drawHeatmap(ctx, c, fn, -2.5, 2.5);
          drawBoundary(ctx, c, h[0]);
          drawBoundary(ctx, c, h[1]);
          drawBoundary(ctx, c, h[2]);
          drawFrame(ctx, c, 'y = φ₀ + φ₁h₁ + φ₂h₂ + φ₃h₃');
        });
      },
    },

  ],
};
