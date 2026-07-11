// Backpropagation lesson — a fine-grained computation graph for one sigmoid
// neuron with squared-error loss. Every operation is its own node, so each
// node has an explicit local forward op AND an explicit local gradient rule.
// Forward pass = evaluate nodes left→right; backward pass = apply each node's
// local rule right→left, multiplying the upstream gradient (the chain rule).

const LR = 0.5; // learning rate for the gradient-step demo

// ── The graph ─────────────────────────────────────────────────────────────────
// world coords: origin centre, y up. Leaves on the left, loss on the right.
const NODES = {
  x1: { x: -3.9, y:  1.9, kind: 'leaf', label: 'x₁' },
  w1: { x: -3.9, y:  1.1, kind: 'leaf', label: 'w₁', param: true },
  x2: { x: -3.9, y: -1.1, kind: 'leaf', label: 'x₂' },
  w2: { x: -3.9, y: -1.9, kind: 'leaf', label: 'w₂', param: true },
  m1: { x: -2.5, y:  1.5, kind: 'op',   label: '×' },
  m2: { x: -2.5, y: -1.5, kind: 'op',   label: '×' },
  s:  { x: -1.2, y:  0.0, kind: 'op',   label: '+' },
  b:  { x: -1.2, y: -2.0, kind: 'leaf', label: 'b', param: true },
  z:  { x:  0.1, y:  0.0, kind: 'op',   label: '+' },
  a:  { x:  1.4, y:  0.0, kind: 'op',   label: 'σ' },
  d:  { x:  2.7, y:  0.0, kind: 'op',   label: '−' },
  y:  { x:  2.7, y: -1.8, kind: 'leaf', label: 'y' },
  L:  { x:  3.9, y:  0.0, kind: 'op',   label: 'L' },
};

const EDGES = [
  ['x1','m1'], ['w1','m1'], ['x2','m2'], ['w2','m2'],
  ['m1','s'], ['m2','s'], ['s','z'], ['b','z'],
  ['z','a'], ['a','d'], ['y','d'], ['d','L'],
];

// ── Forward + backward (always computed; reveal controls what is shown) ────────
function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

function compute(st) {
  const { w1, w2, b, x1, x2, y } = st;
  const m1 = w1 * x1, m2 = w2 * x2;
  const s  = m1 + m2, z = s + b;
  const a  = sigmoid(z);
  const d  = a - y;
  const L  = 0.5 * d * d;
  const f = { x1, w1, x2, w2, b, y, m1, m2, s, z, a, d, L };

  // gradients — each is (upstream) × (local derivative)
  const gL  = 1;
  const gd  = gL * d;          // L = ½d²           → dL/dd = d
  const ga  = gd * 1;          // d = a − y         → dd/da = 1
  const gy  = gd * -1;         // d = a − y         → dd/dy = −1
  const gz  = ga * a * (1 - a);// a = σ(z)          → da/dz = a(1−a)
  const gs  = gz * 1;          // z = s + b         → dz/ds = 1
  const gb  = gz * 1;          // z = s + b         → dz/db = 1
  const gm1 = gs * 1;          // s = m1 + m2       → ds/dm1 = 1
  const gm2 = gs * 1;
  const gw1 = gm1 * x1;        // m1 = w1·x1        → dm1/dw1 = x1
  const gx1 = gm1 * w1;        //                     dm1/dx1 = w1
  const gw2 = gm2 * x2;
  const gx2 = gm2 * w2;
  const g = { L: gL, d: gd, a: ga, y: gy, z: gz, s: gs, b: gb,
              m1: gm1, m2: gm2, w1: gw1, x1: gx1, w2: gw2, x2: gx2 };
  return { f, g };
}

const fmt = v => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));

// ── Drawing ───────────────────────────────────────────────────────────────────
function drawGraph(c2d, st) {
  const { f, g } = compute(st);
  const rv = st.reveal;

  c2d.raw((ctx, c) => {
    // header legend
    ctx.textAlign = 'left';
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#1565c0'; ctx.fillText('forward  →  value', 14, 22);
    ctx.fillStyle = '#e8710a'; ctx.fillText('← backward  gradient ∂L/∂·', 14, 40);

    // ── edges ──
    for (const [an, bn] of EDGES) {
      const A = NODES[an], B = NODES[bn];
      const active = rv.edges && rv.edges.some(e => e[0] === an && e[1] === bn);
      arrow(ctx, c.wx(A.x), c.wy(A.y), c.wx(B.x), c.wy(B.y),
            active ? '#e8710a' : '#d5d5d5', active ? 2.4 : 1.3, 24);
    }

    // ── nodes ──
    for (const key in NODES) {
      const n = NODES[key];
      const sx = c.wx(n.x), sy = c.wy(n.y);
      const r  = n.kind === 'leaf' ? 20 : 23;
      const hl = rv.hl && rv.hl.includes(key);

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = n.param ? '#eef6ef' : (n.kind === 'leaf' ? '#ffffff' : '#f7f7f7');
      ctx.fill();
      ctx.lineWidth   = hl ? 3 : 1.6;
      ctx.strokeStyle = hl ? '#111'
                          : (n.param ? '#2e7d32' : (n.kind === 'leaf' ? '#9db9d6' : '#c0c0c0'));
      ctx.stroke();

      // symbol / name
      const showF = rv.fwd && rv.fwd.includes(key);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#444';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(n.label, sx, sy - (showF ? 4 : 5) + (n.kind === 'leaf' && showF ? 0 : 5));

      // forward value (blue)
      if (showF) {
        ctx.font = '11px system-ui';
        ctx.fillStyle = '#1565c0';
        ctx.fillText(fmt(f[key]), sx, sy + 13);
      }
      // gradient (orange) below the node
      if (rv.grad && rv.grad.includes(key) && g[key] !== undefined) {
        ctx.font = 'italic 11px Georgia, serif';
        ctx.fillStyle = '#e8710a';
        ctx.fillText(fmt(g[key]), sx, sy + r + 13);
      }
    }

    // ── per-step annotation (a local-derivative reminder near an edge) ──
    if (rv.annot) {
      ctx.textAlign = 'center';
      ctx.font = 'italic 12px Georgia, serif';
      ctx.fillStyle = '#e8710a';
      ctx.fillText(rv.annot.text, c.wx(rv.annot.x), c.wy(rv.annot.y));
    }

    // ── bottom readout ──
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#888';
    ctx.fillText(
      `L = ${fmt(f.L)}     ∂L/∂w₁ = ${fmt(g.w1)}   ∂L/∂w₂ = ${fmt(g.w2)}   ∂L/∂b = ${fmt(g.b)}`,
      c.cx, c.height - 22);
  });
}

// arrow from (sx0,sy0) to (sx1,sy1) in screen space, trimmed by `pad` px at each end
function arrow(ctx, sx0, sy0, sx1, sy1, color, width, pad) {
  const dx = sx1 - sx0, dy = sy1 - sy0;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const x0 = sx0 + ux * pad, y0 = sy0 + uy * pad;
  const x1 = sx1 - ux * pad, y1 = sy1 - uy * pad;
  ctx.beginPath();
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const h = 8;
  ctx.beginPath(); ctx.fillStyle = color;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5);
  ctx.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5);
  ctx.closePath(); ctx.fill();
}

// ── Panel controls (same idiom as perceptron.js) ──────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id = `bp-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(1)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">`;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(1);
    onChange(v);
  });
}

function addButton(container, text, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = 'padding:8px 12px;font-size:13px;border:1px solid #2e7d32;color:#2e7d32;'
    + 'background:#fff;border-radius:6px;cursor:pointer;';
  btn.addEventListener('click', onClick);
  container.appendChild(btn);
}

function paramSliders(st) {
  clearControls(st);
  addSlider(st._controls, 'w₁', -2, 2, 0.1, st.w1, v => st.w1 = v);
  addSlider(st._controls, 'w₂', -2, 2, 0.1, st.w2, v => st.w2 = v);
  addSlider(st._controls, 'b',  -2, 2, 0.1, st.b,  v => st.b  = v);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
function mkState() {
  return { w1: 0.5, w2: -0.5, b: 0.2, x1: 1.0, x2: 0.5, y: 1.0,
           reveal: {}, _controls: null };
}

const LEAVES = ['x1','w1','x2','w2','b','y']; // inputs are known from the start

export default {
  title:   'Backpropagation',
  subject: 'Machine Learning',

  initState: mkState,

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'ml-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    // ── FORWARD ──────────────────────────────────────────────────────────────
    {
      title: 'The computation graph',
      description: 'One sigmoid neuron with squared-error loss, broken into its smallest operations. Every node is a single op with two jobs: compute a value going forward, and pass a gradient going backward. The known inputs $x_1,x_2$, weights $w_1,w_2,b$ and target $y$ sit on the left.',
      equation: 'L = \\tfrac{1}{2}\\big(\\sigma(w_1x_1 + w_2x_2 + b) - y\\big)^2',
      notes: 'Read the graph left→right: multiply, add, activate, compare to the target, square.\n\nBecause each node is a single operation, its local derivative is trivial — that is the whole trick behind backprop.\n\nThe sliders change the trainable parameters; watch every value update live.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: [...LEAVES], grad: [], hl: [] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Forward ①  — the products',
      description: 'Each weight multiplies its input: $m_1 = w_1x_1$ and $m_2 = w_2x_2$. This is the only place the weights meet the data.',
      equation: 'm_1 = w_1 x_1, \\qquad m_2 = w_2 x_2',
      notes: 'A “×” node just multiplies its two incoming values.\n\nRemember these two products — on the way back, a multiply node has an especially neat gradient rule.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: [...LEAVES, 'm1', 'm2'], grad: [], hl: ['m1', 'm2'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Forward ②  — sum and bias',
      description: 'Add the products, then add the bias: $s = m_1 + m_2$ and $z = s + b$. Now $z$ is the neuron’s pre-activation — a single number.',
      equation: 'z = (m_1 + m_2) + b = w_1x_1 + w_2x_2 + b',
      notes: 'A “+” node just adds its inputs.\n\nWe deliberately split the sum into two “+” nodes so the graph stays binary — it makes the backward rule uniform.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: [...LEAVES, 'm1', 'm2', 's', 'z'], grad: [], hl: ['s', 'z'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Forward ③  — the nonlinearity',
      description: 'Squash $z$ through the sigmoid to get the activation $a = \\sigma(z)$, a value in $(0,1)$. This is the neuron’s output.',
      equation: 'a = \\sigma(z) = \\dfrac{1}{1 + e^{-z}}',
      notes: 'The sigmoid is the only nonlinear node here.\n\nIts local derivative has a famously clean form, $\\sigma\'(z) = a(1-a)$, which we will use on the way back.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: [...LEAVES, 'm1', 'm2', 's', 'z', 'a'], grad: [], hl: ['a'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Forward ④  — the loss',
      description: 'Compare to the target and square: $d = a - y$, then $L = \\tfrac{1}{2}d^2$. The forward pass is complete — a single scalar $L$ measures how wrong we are.',
      equation: 'd = a - y, \\qquad L = \\tfrac{1}{2}d^2',
      notes: 'Every node now holds a forward value (blue).\n\nThe forward pass is just evaluation in order. Everything interesting — the learning — happens on the way back.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: [...LEAVES, 'm1', 'm2', 's', 'z', 'a', 'd', 'L'], grad: [], hl: ['d', 'L'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    // ── BACKWARD ─────────────────────────────────────────────────────────────
    {
      title: 'Backward: seed the gradient',
      description: 'Now go right→left. We want $\\partial L/\\partial(\\text{node})$ for every node. Seed the output with $\\partial L/\\partial L = 1$ — the loss’s gradient with respect to itself.',
      equation: '\\frac{\\partial L}{\\partial L} = 1',
      notes: 'Each node will receive an “upstream” gradient from its right, multiply it by its own local derivative, and send the result left. That single rule, repeated, is backpropagation.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: ['L'], hl: ['L'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Backward through the loss',
      description: 'The square node: $L = \\tfrac12 d^2$ has local derivative $d$, so $\\partial L/\\partial d = d$. The subtract node $d = a - y$ copies the gradient: $\\partial L/\\partial a = d$ and $\\partial L/\\partial y = -d$.',
      equation: '\\frac{\\partial L}{\\partial d} = d,\\quad \\frac{\\partial L}{\\partial a} = d,\\quad \\frac{\\partial L}{\\partial y} = -d',
      notes: 'Upstream (1) × local derivative (d) = d.\n\nA subtract node sends its gradient unchanged to the positive input and negated to the one being subtracted.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: ['L', 'd', 'a', 'y'], hl: ['d', 'a'],
                      edges: [['a','d'], ['d','L'], ['y','d']],
                      annot: { x: 3.3, y: 0.6, text: '× d' } };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Backward through the sigmoid',
      description: 'The nonlinearity’s local derivative is $\\sigma\'(z) = a(1-a)$. Multiply the upstream gradient by it to pass through: $\\partial L/\\partial z = \\partial L/\\partial a \\cdot a(1-a)$. This scaled quantity is often called $\\delta$.',
      equation: '\\frac{\\partial L}{\\partial z} = \\frac{\\partial L}{\\partial a}\\, a(1-a) \\;\\equiv\\; \\delta',
      notes: 'The sigmoid saturates: when $a$ is near 0 or 1, $a(1-a)\\to0$ and the gradient nearly vanishes — the origin of the vanishing-gradient problem.\n\nEverything to the left of $z$ is a linear op, so $\\delta$ is the key quantity to carry back.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: ['L', 'd', 'a', 'y', 'z'], hl: ['a', 'z'],
                      edges: [['z','a']],
                      annot: { x: 0.75, y: 0.6, text: '× a(1−a)' } };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Backward through the adds',
      description: 'An add node just copies its gradient to every input. So $\\partial L/\\partial s = \\partial L/\\partial b = \\delta$, and likewise $\\partial L/\\partial m_1 = \\partial L/\\partial m_2 = \\delta$.',
      equation: '\\frac{\\partial L}{\\partial s} = \\frac{\\partial L}{\\partial b} = \\frac{\\partial L}{\\partial m_1} = \\frac{\\partial L}{\\partial m_2} = \\delta',
      notes: 'Local rule for “+”: derivative 1 on each input, so the upstream gradient flows through unchanged and un-split.\n\nAlready we have $\\partial L/\\partial b$ — one of the three numbers we ultimately need.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: ['L', 'd', 'a', 'y', 'z', 's', 'b', 'm1', 'm2'],
                      hl: ['s', 'b', 'm1', 'm2'],
                      edges: [['s','z'], ['b','z'], ['m1','s'], ['m2','s']],
                      annot: { x: -0.55, y: 0.6, text: '× 1' } };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'Backward through the products',
      description: 'A multiply node sends the gradient to each input scaled by the other input: $\\partial L/\\partial w_1 = \\partial L/\\partial m_1 \\cdot x_1$, and $\\partial L/\\partial x_1 = \\partial L/\\partial m_1 \\cdot w_1$. Now we have every weight gradient.',
      equation: '\\frac{\\partial L}{\\partial w_1} = \\delta\\,x_1,\\quad \\frac{\\partial L}{\\partial w_2} = \\delta\\,x_2,\\quad \\frac{\\partial L}{\\partial b} = \\delta',
      notes: 'Local rule for “×”: swap the inputs. The gradient to $w_1$ is scaled by $x_1$; the gradient to $x_1$ (which a deeper layer would need) is scaled by $w_1$.\n\nThe three parameter gradients are shown in the readout at the bottom — this is exactly what gradient descent consumes.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: allGrad(), hl: ['w1', 'w2', 'x1', 'x2'],
                      edges: [['x1','m1'], ['w1','m1'], ['x2','m2'], ['w2','m2']],
                      annot: { x: -3.2, y: 1.55, text: '× the other input' } };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'The three local rules',
      description: 'That is all of backprop. Every node applied one local rule to its upstream gradient: “+” copies, “×” swaps the other input, “σ” scales by $a(1-a)$. Compose them along the graph and you have $\\nabla L$ for a network of any depth.',
      equation: '\\text{grad}_{\\text{in}} = \\text{grad}_{\\text{out}} \\times \\frac{\\partial(\\text{node out})}{\\partial(\\text{node in})}',
      notes: '“+” → copy the gradient to each input.\n“×” → multiply by the other input.\n“σ” → multiply by a(1−a).\n\nEach node only needs to know its own local rule and the values it saw on the forward pass. Nothing is global — which is why it scales to billions of parameters.',
      setup(c2d, st) {
        paramSliders(st);
        st.reveal = { fwd: allFwd(), grad: allGrad(), hl: [] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
    {
      title: 'One gradient step',
      description: 'The gradients tell each parameter which way to move to reduce $L$. Nudge them the opposite way — $w \\leftarrow w - \\eta\\,\\partial L/\\partial w$ — and the loss drops. Press the button repeatedly and watch $L$ fall (and the gradients shrink toward zero).',
      equation: 'w \\leftarrow w - \\eta\\,\\frac{\\partial L}{\\partial w}, \\qquad \\eta = 0.5',
      notes: 'Each step re-runs the forward pass, back-propagates, and updates the parameters — the full training loop in miniature.\n\nAs $a \\to y$ the loss and every gradient shrink; the neuron has learned this single example.',
      setup(c2d, st) {
        clearControls(st);
        addSlider(st._controls, 'y (target)', 0, 1, 0.05, st.y, v => st.y = v);
        addButton(st._controls, 'Take a gradient step  ↓L', () => {
          const { g } = compute(st);
          st.w1 -= LR * g.w1;
          st.w2 -= LR * g.w2;
          st.b  -= LR * g.b;
        });
        st.reveal = { fwd: allFwd(), grad: allGrad(), hl: ['w1', 'w2', 'b'] };
      },
      update(c2d, st) { c2d.clearPersistent(); drawGraph(c2d, st); },
    },
  ],
};

// helpers that list all forward/gradient node keys
function allFwd()  { return ['x1','w1','x2','w2','b','y','m1','m2','s','z','a','d','L']; }
function allGrad() { return ['L','d','a','y','z','s','b','m1','m2','w1','w2','x1','x2']; }
