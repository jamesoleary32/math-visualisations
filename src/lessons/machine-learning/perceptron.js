// Perceptron lesson — 5 steps from neuron diagram to convergence.

const LEARNING_RATE = 0.3;

const DATA = [
  { x1:  1.2, x2:  1.0, label:  1 },
  { x1:  0.8, x2:  1.6, label:  1 },
  { x1:  1.5, x2:  0.5, label:  1 },
  { x1:  0.5, x2:  0.8, label:  1 },
  { x1:  1.8, x2:  1.4, label:  1 },
  { x1: -1.0, x2: -0.8, label: -1 },
  { x1: -0.6, x2: -1.4, label: -1 },
  { x1: -1.4, x2: -0.4, label: -1 },
  { x1: -0.8, x2: -1.0, label: -1 },
  { x1: -1.6, x2: -1.2, label: -1 },
];

function activate(z) { return z >= 0 ? 1 : -1; }
function predict(w1, w2, b, x1, x2) { return activate(w1*x1 + w2*x2 + b); }
function boundaryX2(w1, w2, b, x1) {
  return Math.abs(w2) < 1e-6 ? 0 : -(w1*x1 + b) / w2;
}

function mkInitState() {
  return {
    w1: 0.6, w2: 0.8, b: 0.0,
    x1: 1.5, x2: 0.5,
    animT: 0,
    highlight: null,
    _controls: null,
    cfg: { mode: 'diagram', showBoundary: false, learning: false }
  };
}

// ── Panel controls ────────────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id = `sl-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(1)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(1);
    onChange(v);
  });
  return input;
}

// ── Neuron diagram ────────────────────────────────────────────────────────────

function drawNeuronDiagram(c2d, state, showOutput) {
  const { w1, w2, b, x1, x2 } = state;
  const z    = w1*x1 + w2*x2 + b;
  const yhat = activate(z);

  c2d.raw((ctx, c) => {
    // ── Weighted connection lines ──
    function edge(ax, ay, bx, by, weight, color) {
      const sx0 = c.wx(ax), sy0 = c.wy(ay);
      const sx1 = c.wx(bx), sy1 = c.wy(by);
      const thick = Math.min(4, 0.8 + Math.abs(weight) * 1.6);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = thick;
      ctx.globalAlpha = 0.6 + Math.min(0.4, Math.abs(weight) * 0.3);
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx1, sy1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // weight label at midpoint
      const mx = c.wx((ax+bx)*0.5) + 12, my = c.wy((ay+by)*0.5) - 8;
      ctx.fillStyle = color;
      ctx.font = 'italic 12px Georgia, serif';
      ctx.fillText(`w${weight === w1 ? '₁' : '₂'}=${weight.toFixed(1)}`, mx, my);
    }

    edge(-2.6, 0.9, -0.52, 0.12, w1, '#1565c0');
    edge(-2.6, -0.9, -0.52, -0.12, w2, '#e65100');

    // bias line from below
    ctx.beginPath();
    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(c.wx(0), c.wy(-1.6));
    ctx.lineTo(c.wx(0), c.wy(-0.52));
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Input nodes ──
    function inputNode(nx, ny, label, value, color) {
      const sx = c.wx(nx), sy = c.wy(ny);
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'italic bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, sy - 2);
      ctx.font = '11px system-ui';
      ctx.fillText(`= ${value.toFixed(1)}`, sx, sy + 13);
      ctx.textAlign = 'left';
    }

    inputNode(-3, 0.9, 'x₁', x1, '#1565c0');
    inputNode(-3, -0.9, 'x₂', x2, '#e65100');

    // bias node
    const bsx = c.wx(0), bsy = c.wy(-1.9);
    ctx.beginPath();
    ctx.arc(bsx, bsy, 22, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4,3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#7b1fa2';
    ctx.font = 'italic 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`b=${b.toFixed(1)}`, bsx, bsy + 4);
    ctx.textAlign = 'left';

    // ── Neuron node ──
    const nsx = c.wx(0), nsy = c.wy(0);
    const nr  = 42;
    ctx.beginPath();
    ctx.arc(nsx, nsy, nr, 0, Math.PI*2);
    ctx.fillStyle = '#f8f8f8';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // z value inside
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Σ', nsx, nsy - 8);
    ctx.font = '11px system-ui';
    ctx.fillStyle = z >= 0 ? '#2e7d32' : '#c62828';
    ctx.fillText(`z = ${z.toFixed(2)}`, nsx, nsy + 8);
    ctx.textAlign = 'left';

    // ── Output ──
    if (showOutput) {
      // arrow
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.moveTo(nsx + nr, nsy);
      ctx.lineTo(c.wx(2.4), nsy);
      ctx.stroke();
      // arrowhead
      ctx.beginPath();
      ctx.fillStyle = '#333';
      const ax = c.wx(2.4);
      ctx.moveTo(ax, nsy);
      ctx.lineTo(ax - 10, nsy - 6);
      ctx.lineTo(ax - 10, nsy + 6);
      ctx.closePath();
      ctx.fill();

      // output node
      const osx = c.wx(2.8), osy = nsy;
      ctx.beginPath();
      ctx.arc(osx, osy, 28, 0, Math.PI*2);
      ctx.fillStyle = yhat === 1 ? '#e3f2fd' : '#fff3e0';
      ctx.fill();
      ctx.strokeStyle = yhat === 1 ? '#1565c0' : '#e65100';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle  = yhat === 1 ? '#1565c0' : '#e65100';
      ctx.font = 'bold 13px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('ŷ', osx, osy - 4);
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(yhat === 1 ? '+1' : '−1', osx, osy + 12);
      ctx.textAlign = 'left';
    }

    // ── Computation breakdown (below diagram) ──
    const bly = c.wy(-2.6);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`z = w₁x₁ + w₂x₂ + b  =  ${w1.toFixed(1)}×${x1.toFixed(1)} + ${w2.toFixed(1)}×${x2.toFixed(1)} + ${b.toFixed(1)}  =  ${z.toFixed(2)}`, c.cx, bly);
    ctx.textAlign = 'left';
  });
}

// ── Scatter plot ──────────────────────────────────────────────────────────────

function drawScatter(c2d, state) {
  const { w1, w2, b, cfg } = state;

  c2d.addGrid({ spacing: 1, color: '#ececec' });
  c2d.addAxes({ color: '#dddddd' });
  c2d.addText('x₁', 3.3, 0.15, { color: '#aaa', size: 12 });
  c2d.addText('x₂', 0.15, 3.3, { color: '#aaa', size: 12 });

  if (cfg.showBoundary) {
    const x1L = -3.5, x1R = 3.5;
    c2d.addLine([[x1L, boundaryX2(w1,w2,b,x1L)],[x1R, boundaryX2(w1,w2,b,x1R)]],
      { color: '#bbb', width: 1.5, dash: [6,4] });

    // weight vector (normal to boundary)
    const wLen = Math.sqrt(w1*w1 + w2*w2) + 0.001;
    const scale = 1.1 / wLen;
    c2d.addArrow(0, 0, w1*scale, w2*scale, { color: '#2e7d32', width: 2 });
    c2d.addText('w', w1*scale+0.12, w2*scale+0.12, { color: '#2e7d32', size: 14, italic: true });
  }

  DATA.forEach((pt, i) => {
    const correct = predict(w1, w2, b, pt.x1, pt.x2) === pt.label;
    const isPos   = pt.label === 1;
    const isHit   = i === state.highlight;
    let color = isPos ? '#1565c0' : '#e65100';
    if (!correct && cfg.showBoundary) color = isPos ? '#90caf9' : '#ffcc80';
    const r = isHit ? 10 : 7;
    c2d.addPoint(pt.x1, pt.x2, { radius: r, color, label: isPos ? '+1' : '−1' });
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

export default {
  title:   "Perceptron",
  subject: "Machine Learning",

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 75;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'ml-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: "The Neuron",
      description: "A perceptron multiplies each input by a weight, sums the results, adds a bias, and produces a single number z. Use the sliders to change the input values and watch z update live.",
      equation: "z = w_1 x_1 + w_2 x_2 + b",
      notes: "The line thickness on each connection reflects the magnitude of the weight.\n\nChanging x₁ or x₂ changes z proportionally to its weight — a large weight means that input has more influence.\n\nIn this step the weights are fixed. The next step shows how weights themselves shape the output.",
      setup(c2d, state) {
        state.w1 = 0.6; state.w2 = 0.8; state.b = 0.0;
        state.x1 = 1.5; state.x2 = 0.5;
        state.cfg = { mode: 'diagram', showBoundary: false, learning: false };
        clearControls(state);
        addSlider(state._controls, 'x₁', -3, 3, 0.1, state.x1, v => state.x1 = v);
        addSlider(state._controls, 'x₂', -3, 3, 0.1, state.x2, v => state.x2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawNeuronDiagram(c2d, state, false);
      }
    },
    {
      title: "Weights Determine Importance",
      description: "The weights w₁ and w₂ control how much each input contributes to z. A large positive weight amplifies the input; a negative weight suppresses or inverts it. The bias b shifts the threshold.",
      equation: "z = w_1 x_1 + w_2 x_2 + b",
      notes: "Try setting w₁ to 0 — x₁ has no effect on z whatsoever.\n\nTry making w₁ negative — increasing x₁ now decreases z.\n\nThe bias b shifts z up or down independently of the inputs. It lets the neuron fire even when all inputs are zero (if b > 0).",
      setup(c2d, state) {
        state.x1 = 1.5; state.x2 = 0.5;
        state.cfg = { mode: 'diagram', showBoundary: false, learning: false };
        clearControls(state);
        addSlider(state._controls, 'w₁', -2, 2, 0.1, state.w1, v => state.w1 = v);
        addSlider(state._controls, 'w₂', -2, 2, 0.1, state.w2, v => state.w2 = v);
        addSlider(state._controls, 'b',  -2, 2, 0.1, state.b,  v => state.b  = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawNeuronDiagram(c2d, state, false);
      }
    },
    {
      title: "Activation & Output",
      description: "z is passed through a step function — if z ≥ 0 the perceptron fires (+1), otherwise it doesn't (−1). The output node on the right shows ŷ. Drag the weights or bias until the output flips.",
      equation: "\\hat{y} = \\text{sign}(z) = \\begin{cases} +1 & z \\ge 0 \\\\ -1 & z < 0 \\end{cases}",
      notes: "Watch the output node change colour when z crosses zero.\n\nThe bias b is the easiest way to shift the threshold — try dragging it from −2 to +2.\n\nThis step function is the simplest activation. Real networks use sigmoid or ReLU to allow gradient-based training.",
      setup(c2d, state) {
        state.x1 = 1.5; state.x2 = 0.5;
        state.cfg = { mode: 'diagram', showBoundary: false, learning: false };
        clearControls(state);
        addSlider(state._controls, 'w₁', -2, 2, 0.1, state.w1, v => state.w1 = v);
        addSlider(state._controls, 'w₂', -2, 2, 0.1, state.w2, v => state.w2 = v);
        addSlider(state._controls, 'b',  -2, 2, 0.1, state.b,  v => state.b  = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawNeuronDiagram(c2d, state, true);
      }
    },
    {
      title: "Decision Boundary",
      description: "When classifying 2D points, w defines a line — the decision boundary — that divides the plane into two regions. Points above the line are classified +1, below are −1. Drag the weights to rotate the boundary.",
      equation: "w_1 x_1 + w_2 x_2 + b = 0",
      notes: "The green arrow is the weight vector w. It always points perpendicular to the boundary, toward the +1 region.\n\nFaded points are currently misclassified.\n\nDrag w₁, w₂, b and try to separate the blue (+1) and orange (−1) clusters completely.",
      setup(c2d, state) {
        state.w1 = 0.3; state.w2 = -0.5; state.b = 0.1;
        state.cfg = { mode: 'scatter', showBoundary: true, learning: false };
        clearControls(state);
        addSlider(state._controls, 'w₁', -2, 2, 0.1, state.w1, v => state.w1 = v);
        addSlider(state._controls, 'w₂', -2, 2, 0.1, state.w2, v => state.w2 = v);
        addSlider(state._controls, 'b',  -2, 2, 0.1, state.b,  v => state.b  = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawScatter(c2d, state);
      }
    },
    {
      title: "The Learning Rule",
      description: "For each misclassified point, nudge the weights so that point would be correctly classified. Repeat until no errors remain. This is the perceptron learning rule — guaranteed to converge if the data is linearly separable.",
      equation: "\\mathbf{w} \\leftarrow \\mathbf{w} + \\eta\\, y^{(i)} \\mathbf{x}^{(i)}, \\quad b \\leftarrow b + \\eta\\, y^{(i)}",
      notes: "The highlighted point is the current misclassified example being corrected.\n\nFaded points are currently misclassified — watch them sharpen as the boundary rotates into place.\n\nThe Perceptron Convergence Theorem guarantees this terminates in finite steps — but only if the data is linearly separable. For XOR or other non-separable cases, it never converges (the reason multi-layer networks were invented).",
      setup(c2d, state) {
        state.w1 = 0.3; state.w2 = -0.5; state.b = 0.1;
        state.animT = 0;
        state.highlight = null;
        state.cfg = { mode: 'scatter', showBoundary: true, learning: true };
        clearControls(state);
      },
      update(c2d, state, dt) {
        state.animT += dt;

        const errors = DATA.map((pt, i) => ({ pt, i }))
          .filter(({ pt }) => predict(state.w1, state.w2, state.b, pt.x1, pt.x2) !== pt.label);

        if (errors.length > 0) {
          const idx  = Math.floor(state.animT * 1.5) % errors.length;
          const { pt, i } = errors[idx];
          state.highlight = i;
          const lr = LEARNING_RATE * dt * 4;
          state.w1 += lr * pt.label * pt.x1;
          state.w2 += lr * pt.label * pt.x2;
          state.b  += lr * pt.label;
        } else {
          state.highlight = null;
        }

        c2d.clearPersistent();
        drawScatter(c2d, state);

        if (errors.length === 0) {
          c2d.addText('Converged ✓', -3.3, -2.8, { color: '#2e7d32', size: 14 });
        }
      }
    }
  ]
};
