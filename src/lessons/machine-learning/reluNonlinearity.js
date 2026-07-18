// Why ReLU? — nonlinearity, and why composing linear layers buys nothing.
// Prince, Understanding Deep Learning, Chapter 3 (Shallow Networks).
//
// The arc: a linear unit is a line; composing linear layers is STILL a line
// (w₂(w₁x+b₁)+b₂ collapses to one affine map), so depth without a nonlinearity is
// wasted; ReLU is the simplest bend; one ReLU unit is a placeable hinge; summing
// hinges traces any continuous curve (universal approximation); and ReLU beats
// sigmoid/tanh because its gradient is 1 on the active side (no vanishing).
//
// Everything is plotted from the actual functions. The piecewise-linear fit in the
// "sum the hinges" step is a genuine sum of ReLUs that interpolates the target at
// its knots — verified in node.

const X0 = -4, X1 = 4, Y0 = -3.4, Y1 = 4;
const target = x => Math.sin(1.3 * x) + 0.35 * x;   // the curve to approximate
const relu = z => Math.max(0, z);

// piecewise-linear interpolant of `target`, expressed as a sum of ReLUs:
//   f(x) = y0 + k0(x-x0) + Σ_j (k_j − k_{j-1}) · ReLU(x − x_j)
function plModel(nUnits) {
  const N = nUnits + 1;                 // segments; interior hinges = N-1 = nUnits
  const xs = [], ys = [];
  for (let j = 0; j <= N; j++) { const x = X0 + (X1 - X0) * j / N; xs.push(x); ys.push(target(x)); }
  const k = [];
  for (let j = 0; j < N; j++) k.push((ys[j + 1] - ys[j]) / (xs[j + 1] - xs[j]));
  return { xs, ys, k };
}
function plEval(m, x) {
  let y = m.ys[0] + m.k[0] * (x - m.xs[0]);
  for (let j = 1; j < m.k.length; j++) y += (m.k[j] - m.k[j - 1]) * relu(x - m.xs[j]);
  return y;
}

const sigmoid = z => 1 / (1 + Math.exp(-z));

// ── Colours ─────────────────────────────────────────────────────────────────
const CURVE = '#1565c0', LIN = '#c62828', HINGE = '#2e7d32', FAINT = '#c9c9c9', KINK = '#e8710a';

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const S = Math.min(c.height - 90, c.width - 340);
    const L = 66, T = (c.height - S) / 2, R = L + S, B = T + S;
    const px = x => L + (x - X0) / (X1 - X0) * (R - L);
    const py = y => B - (y - Y0) / (Y1 - Y0) * (B - T);

    // grid
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1; ctx.beginPath();
    for (let gx = Math.ceil(X0); gx <= X1; gx++) { ctx.moveTo(px(gx), T); ctx.lineTo(px(gx), B); }
    for (let gy = Math.ceil(Y0); gy <= Y1; gy++) { ctx.moveTo(L, py(gy)); ctx.lineTo(R, py(gy)); }
    ctx.stroke();
    // axes
    ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 1.3; ctx.beginPath();
    ctx.moveTo(L, py(0)); ctx.lineTo(R, py(0)); ctx.moveTo(px(0), T); ctx.lineTo(px(0), B); ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('x', R - 6, py(0) - 8); ctx.fillText('y', px(0) + 12, T + 12);

    const plot = (fn, color, width = 2.6, clampY = true) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 320; i++) {
        const x = X0 + (X1 - X0) * i / 320;
        let y = fn(x);
        if (clampY && (y < Y0 - 1 || y > Y1 + 1)) { started = false; continue; }
        const X = px(x), Y = py(Math.max(Y0 - 1, Math.min(Y1 + 1, y)));
        started ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); started = true;
      }
      ctx.stroke();
    };

    // right-side readout
    const rx = R + 40; let ry = T + 24;
    const row = (label, val, color = '#333', big = false) => {
      ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, rx, ry);
      ctx.fillStyle = color; ctx.font = `${big ? 'bold 18px' : '600 14px'} system-ui`; ctx.fillText(val, rx, ry + (big ? 23 : 19));
      ry += big ? 50 : 42;
    };
    const note = lines => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, rx, ry + 4 + i * 17)); };

    if (o.mode === 'line') {
      plot(x => st.w * x + st.b, LIN);
      row('slope w', st.w.toFixed(2)); row('intercept b', st.b.toFixed(2));
      note(['A straight line — the most', 'a single linear unit can be.']);
    }

    else if (o.mode === 'compose') {
      const we = st.w1 * st.w2, be = st.w2 * st.b1 + st.b2;
      plot(x => st.w1 * x + st.b1, FAINT, 1.8);           // inner layer u(x)
      plot(x => st.w2 * (st.w1 * x + st.b1) + st.b2, LIN); // composed y(x)
      row('effective slope', `w₂w₁ = ${we.toFixed(2)}`, LIN);
      row('effective intercept', `w₂b₁+b₂ = ${be.toFixed(2)}`, LIN, false);
      note(['Two linear layers, and still', 'one straight line. The grey line', 'is the hidden layer; the red is', 'the whole network — identical', 'in kind. Depth bought nothing.']);
    }

    else if (o.mode === 'relu') {
      plot(x => relu(x), CURVE);
      ctx.fillStyle = KINK; ctx.beginPath(); ctx.arc(px(0), py(0), 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('slope 0', px(-3), py(0) + 18); ctx.fillText('slope 1', px(2), py(2) - 10);
      row('ReLU(z)', 'max(0, z)', CURVE);
      note(['One kink at the origin.', "Derivative: 1 where z>0,", '0 where z<0 — the flat side', 'and the pass-through side.']);
    }

    else if (o.mode === 'unit') {
      const kink = st.uw !== 0 ? -st.ub / st.uw : 0;
      plot(x => st.ua * relu(st.uw * x + st.ub), CURVE);
      if (kink > X0 && kink < X1) { ctx.fillStyle = KINK; ctx.beginPath(); ctx.arc(px(kink), py(0), 5, 0, Math.PI * 2); ctx.fill(); }
      row('weight w', st.uw.toFixed(2)); row('bias b', st.ub.toFixed(2)); row('scale a', st.ua.toFixed(2));
      row('kink at x', kink.toFixed(2), KINK);
      note(['w,b slide and tilt the hinge;', 'a scales and can flip it.', 'One unit = one joint.']);
    }

    else if (o.mode === 'sum') {
      const m = plModel(st.n);
      plot(target, FAINT, 2.4);                 // target
      plot(x => plEval(m, x), CURVE);           // ReLU sum
      // knot markers (interior = hinges)
      for (let j = 1; j < m.xs.length - 1; j++) {
        ctx.fillStyle = HINGE; ctx.beginPath(); ctx.arc(px(m.xs[j]), py(m.ys[j]), 3.5, 0, Math.PI * 2); ctx.fill();
      }
      row('hidden ReLU units', String(st.n), HINGE, true);
      row('breakpoints', String(st.n));
      note(['Grey = target curve, blue =', 'the sum of ReLUs. Each unit', 'adds one hinge; more units', 'hug the curve more tightly.', 'None of this is possible with', 'linear layers alone.']);
    }

    else if (o.mode === 'whyrelu') {
      plot(x => relu(x), CURVE, 2.6);
      plot(x => 2 * sigmoid(x) - 0, '#8e24aa', 2.2);
      plot(x => Math.tanh(x), '#00897b', 2.2);
      ctx.fillStyle = CURVE; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('ReLU', px(2.4), py(relu(2.4)) - 8);
      ctx.fillStyle = '#8e24aa'; ctx.fillText('sigmoid', px(-3.9), py(2 * sigmoid(-3.9)) - 8);
      ctx.fillStyle = '#00897b'; ctx.fillText('tanh', px(1.4), py(Math.tanh(1.4)) + 20);
      note(['Sigmoid & tanh flatten out —', 'their gradient → 0 in the tails,', 'so signal decays through depth', '(vanishing gradients).', '', "ReLU's active-side slope stays", 'exactly 1: gradient flows.']);
    }
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'relu-' + label.replace(/[^a-z0-9]/gi, '');
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
const f2 = v => v.toFixed(2);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Why ReLU?',
  subject: 'Machine Learning',

  initState() {
    return { w: 1.1, b: 0.4, w1: 1.3, b1: 0.6, w2: -0.9, b2: 0.5, uw: 1.6, ub: -1.4, ua: 1.5, n: 4, _controls: null };
  },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:11px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'A linear layer is just a line',
      description: 'A single linear unit computes $y = wx + b$ — scale the input by a weight, add a bias. Whatever $w$ and $b$ you choose, the graph is a straight line. Interesting models need to bend; one linear unit never can.',
      equation: 'y = wx + b',
      notes: 'Drag the slope and offset. No setting produces a curve: the output is an affine function of the input, and that is the ceiling of a single linear layer.',
      setup(c2d, st) { clearControls(st); addSlider(st, 'slope w', -2, 2, 0.05, () => st.w, v => st.w = v, f2); addSlider(st, 'intercept b', -2, 2, 0.05, () => st.b, v => st.b = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'line' }); },
    },
    {
      title: 'Stacking linear layers changes nothing',
      description: 'Feed one linear layer into another: $u = w_1x + b_1$, then $y = w_2u + b_2$. Multiply it out and $y = (w_2w_1)x + (w_2b_1 + b_2)$ — still a straight line. A stack of purely linear layers is no more expressive than a single one.',
      equation: 'w_2(w_1 x + b_1) + b_2 = (w_2 w_1)\\,x + (w_2 b_1 + b_2)',
      notes: 'Try any of the four knobs — the composed function (red) is always a line, and the readout shows the single equivalent slope and intercept it collapses to.\n\nThe same is true with matrices: $A_2(A_1\\mathbf{x}) = (A_2 A_1)\\mathbf{x}$ is one matrix. This is exactly why a nonlinearity must sit between the linear parts — without one, depth is wasted.',
      setup(c2d, st) {
        clearControls(st);
        addSlider(st, 'w₁', -2, 2, 0.05, () => st.w1, v => st.w1 = v, f2);
        addSlider(st, 'b₁', -2, 2, 0.05, () => st.b1, v => st.b1 = v, f2);
        addSlider(st, 'w₂', -2, 2, 0.05, () => st.w2, v => st.w2 = v, f2);
        addSlider(st, 'b₂', -2, 2, 0.05, () => st.b2, v => st.b2 = v, f2);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'compose' }); },
    },
    {
      title: 'ReLU: the simplest possible bend',
      description: 'The rectified linear unit is $\\mathrm{ReLU}(z) = \\max(0, z)$: positive values pass through unchanged, negatives clamp to zero. It is two straight pieces joined by one kink at the origin — the least nonlinearity that still counts as nonlinear.',
      equation: '\\mathrm{ReLU}(z) = \\max(0, z)',
      notes: 'Its derivative is as simple as it gets: 1 where $z>0$, 0 where $z<0$. That constant slope of 1 on the active side is a big part of why gradients survive deep ReLU networks — we return to it at the end.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'relu' }); },
    },
    {
      title: 'One ReLU unit places one hinge',
      description: 'Wrap a linear unit in a ReLU and scale it: $y = a\\,\\mathrm{ReLU}(wx + b)$. Now the bend is controllable — $w$ and $b$ set where the kink sits (at $x = -b/w$) and how steep it is, and $a$ scales it or flips it. One unit, one joint.',
      equation: 'y = a\\,\\mathrm{ReLU}(wx + b), \\qquad \\text{kink at } x = -\\tfrac{b}{w}',
      notes: 'Drag the three knobs and watch the single hinge slide, tilt and flip. Alone it is still almost trivial — but hinges add, and that is the next step.',
      setup(c2d, st) {
        clearControls(st);
        addSlider(st, 'weight w', -2, 2, 0.05, () => st.uw, v => st.uw = v, f2);
        addSlider(st, 'bias b', -3, 3, 0.05, () => st.ub, v => st.ub = v, f2);
        addSlider(st, 'scale a', -2.5, 2.5, 0.05, () => st.ua, v => st.ua = v, f2);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'unit' }); },
    },
    {
      title: 'Sum the hinges → any shape',
      description: 'Add several ReLU units, $y = \\sum_i a_i\\,\\mathrm{ReLU}(w_ix + b_i) + c$. Each contributes one kink, and where they overlap their slopes add. With enough units the piecewise-linear result traces any continuous curve as closely as you like — universal approximation, built from nothing but hinges.',
      equation: 'y = \\sum_{i=1}^{n} a_i\\,\\mathrm{ReLU}(w_i x + b_i) + c',
      notes: 'Drag the number of hidden units. Each new unit adds a breakpoint and the blue fit hugs the grey target more tightly — a shallow network with one ReLU hidden layer, where width buys accuracy.\n\nEvery one of these bends is impossible with linear layers alone: that is the whole reason for the nonlinearity.',
      setup(c2d, st) { clearControls(st); addSlider(st, 'hidden units', 1, 12, 1, () => st.n, v => st.n = v, v => String(v)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'sum' }); },
    },
    {
      title: 'Why ReLU, specifically?',
      description: 'Any nonlinearity breaks the linear collapse — so why $\\mathrm{ReLU}$ over $\\mathrm{sigmoid}$ or $\\tanh$? It is the cheapest to compute (just a comparison), its gradient is exactly 1 on the active side so it does not saturate, and it makes many units output exactly zero — sparse, efficient representations.',
      equation: "\\mathrm{ReLU}'(z) = \\begin{cases} 1 & z>0 \\\\ 0 & z<0 \\end{cases}",
      notes: 'Sigmoid and tanh flatten into tails where the derivative is almost zero, so in a deep stack the gradient signal decays layer by layer — the vanishing-gradient problem. ReLU keeps a healthy slope of 1 wherever a unit is active, so the signal keeps flowing. Simpler to compute, and it actually trains.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'whyrelu' }); },
    },
  ],
};
