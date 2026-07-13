// Multi-class cross-entropy — the training loss for classification.
//
// Logits -> softmax -> probabilities -> L = -log(p_c). The payoff is the
// gradient: dL/dz = p - y, just "prediction minus target". The final steps show
// why that matters — with MSE the gradient dies exactly when the model is
// confidently wrong, which is the worst possible moment to stop learning.

const CLASSES = ['cat', 'dog', 'bird'];
const LR = 0.8;

// ── Maths ─────────────────────────────────────────────────────────────────────
function softmax(z) {
  const m = Math.max(...z);                 // shift for numerical stability
  const e = z.map(v => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(v => v / s);
}

function model(st) {
  const p = softmax(st.z);
  const y = CLASSES.map((_, i) => (i === st.c ? 1 : 0));
  const L = -Math.log(Math.max(p[st.c], 1e-12));
  const grad = p.map((pk, k) => pk - y[k]);   // dL/dz = p - y
  return { p, y, L, grad };
}

// ── Colours ───────────────────────────────────────────────────────────────────
const LOGIT = '#90a4ae', PROB = '#1565c0', TRUE = '#2e7d32',
      GRAD_UP = '#2e7d32', GRAD_DOWN = '#e8710a', CE = '#1565c0', MSE = '#c62828';

// ── Drawing helpers ───────────────────────────────────────────────────────────
function barGroup(ctx, x0, baseY, vals, opts) {
  const { bw = 34, gap = 16, scale = 42, colorFn, labelFn, valFn, signed = false } = opts;
  vals.forEach((v, i) => {
    const x = x0 + i * (bw + gap);
    const h = v * scale;
    ctx.fillStyle = colorFn ? colorFn(v, i) : PROB;
    if (signed) ctx.fillRect(x, h >= 0 ? baseY - h : baseY, bw, Math.abs(h));
    else        ctx.fillRect(x, baseY - h, bw, Math.max(0, h));
    // value above (or below, for negatives)
    ctx.fillStyle = '#666'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    const vy = signed && h < 0 ? baseY + Math.abs(h) + 14 : baseY - Math.max(h, 0) - 7;
    if (valFn) ctx.fillText(valFn(v, i), x + bw / 2, vy);
    // class label under the axis
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui';
    ctx.fillText(labelFn ? labelFn(i) : CLASSES[i], x + bw / 2, baseY + (signed ? 46 : 20));
  });
  // baseline
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0 - 10, baseY);
  ctx.lineTo(x0 + vals.length * (bw + gap) - gap + 10, baseY);
  ctx.stroke();
  ctx.textAlign = 'left';
}

function heading(ctx, text, x, y, color = '#aaa') {
  ctx.fillStyle = color; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function arrow(ctx, x0, y0, x1, y1, color = '#bbb', w = 2) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, hd = 9;
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * hd, y1 - uy * hd); ctx.stroke();
  ctx.beginPath(); ctx.fillStyle = color;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * hd - uy * hd * 0.45, y1 - uy * hd + ux * hd * 0.45);
  ctx.lineTo(x1 - ux * hd + uy * hd * 0.45, y1 - uy * hd - ux * hd * 0.45);
  ctx.closePath(); ctx.fill();
}

// logits (left) → softmax → probabilities (right)
function drawPipeline(c2d, st, o) {
  const { p, L } = model(st);
  c2d.raw((ctx, c) => {
    const baseY = 150;
    heading(ctx, 'logits  z   (any real number)', 40, 40);
    barGroup(ctx, 46, baseY, st.z, {
      scale: 26, signed: true, colorFn: () => LOGIT, valFn: v => v.toFixed(1),
    });

    if (!o.probs) return;

    arrow(ctx, 250, baseY - 40, 320, baseY - 40, '#bbb');
    ctx.fillStyle = '#00897b'; ctx.font = 'italic 14px Georgia, serif';
    ctx.textAlign = 'center'; ctx.fillText('softmax', 285, baseY - 50);
    ctx.textAlign = 'left';

    heading(ctx, 'probabilities  p   (sum = 1)', 340, 40);
    barGroup(ctx, 346, baseY, p, {
      scale: 90,
      colorFn: (v, i) => (o.markTrue && i === st.c ? TRUE : PROB),
      valFn: v => v.toFixed(2),
    });

    if (o.markTrue) {
      ctx.fillStyle = TRUE; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
      const bx = 346 + st.c * (34 + 16) + 17;
      ctx.fillText('true class', bx, baseY + 38);
      ctx.textAlign = 'left';
    }

    if (o.loss) {
      ctx.fillStyle = '#333'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(
        `L = −log(p_${CLASSES[st.c]}) = −log(${p[st.c].toFixed(2)}) = ${L.toFixed(3)}`,
        c.width / 2, baseY + 80);
      ctx.textAlign = 'left';
    }
  });
}

// −log(p) curve with the current p_c marked
function drawLossCurve(c2d, st) {
  const { p, L } = model(st);
  c2d.raw((ctx, c) => {
    const L0 = 90, R = c.width - 70, T = 250, B = c.height - 90;
    const YMAX = 5;
    const sx = q => L0 + q * (R - L0);
    const sy = v => B - Math.min(v, YMAX) / YMAX * (B - T);

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L0, T); ctx.lineTo(L0, B); ctx.lineTo(R, B); ctx.stroke();

    ctx.beginPath(); ctx.strokeStyle = '#e8710a'; ctx.lineWidth = 2.6;
    let started = false;
    for (let i = 1; i <= 200; i++) {
      const q = i / 200, v = -Math.log(q);
      if (v > YMAX) continue;
      const px = sx(q), py = sy(v);
      started ? ctx.lineTo(px, py) : (ctx.moveTo(px, py), started = true);
    }
    ctx.stroke();

    // current point
    ctx.setLineDash([3, 3]); ctx.strokeStyle = '#bbb';
    ctx.beginPath(); ctx.moveTo(sx(p[st.c]), B); ctx.lineTo(sx(p[st.c]), sy(L)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.fillStyle = '#111';
    ctx.arc(sx(p[st.c]), sy(L), 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('probability assigned to the TRUE class,  p_c', (L0 + R) / 2, B + 34);
    ctx.fillText('0', L0, B + 16); ctx.fillText('1', R, B + 16);
    ctx.fillStyle = '#e8710a';
    ctx.fillText('L = −log(p_c)', L0 + 90, T + 20);
    ctx.fillStyle = '#c62828'; ctx.textAlign = 'left';
    ctx.fillText('confident and WRONG → loss explodes', L0 + 8, T + 44);
    ctx.fillStyle = TRUE;
    ctx.fillText('certain and right → L = 0', R - 170, B - 12);
    ctx.textAlign = 'left';
  });
}

// gradient bars: dL/dz = p − y
function drawGradient(c2d, st) {
  const { p, grad, L } = model(st);
  c2d.raw((ctx, c) => {
    const baseY = 150;
    heading(ctx, 'probabilities  p', 46, 40);
    barGroup(ctx, 46, baseY, p, {
      scale: 90, colorFn: (v, i) => (i === st.c ? TRUE : PROB), valFn: v => v.toFixed(2),
    });

    arrow(ctx, 250, baseY - 40, 320, baseY - 40, '#bbb');
    ctx.fillStyle = '#333'; ctx.font = 'italic 13px Georgia, serif';
    ctx.textAlign = 'center'; ctx.fillText('p − y', 285, baseY - 50); ctx.textAlign = 'left';

    heading(ctx, 'gradient  ∂L/∂z = p − y', 340, 40);
    barGroup(ctx, 346, baseY + 40, grad, {
      scale: 70, signed: true,
      colorFn: v => (v < 0 ? GRAD_UP : GRAD_DOWN),
      valFn: v => v.toFixed(2),
    });

    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = GRAD_UP;
    ctx.fillText('negative → push this logit UP', c.width / 2, baseY + 150);
    ctx.fillStyle = GRAD_DOWN;
    ctx.fillText('positive → push the others DOWN', c.width / 2, baseY + 170);
    ctx.fillStyle = '#333'; ctx.font = '14px system-ui';
    ctx.fillText(`L = ${L.toFixed(3)}`, c.width / 2, baseY + 205);
    ctx.textAlign = 'left';
  });
}

// |gradient| vs confidence: cross-entropy vs squared error (sigmoid, y = 1)
function drawWhyNotMSE(c2d, st) {
  c2d.raw((ctx, c) => {
    const L0 = 90, R = c.width - 70, T = 70, B = c.height - 140;
    const sx = a => L0 + a * (R - L0);
    const sy = v => B - v / 1.05 * (B - T);

    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L0, T); ctx.lineTo(L0, B); ctx.lineTo(R, B); ctx.stroke();

    const plot = (fn, color) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.8;
      for (let i = 0; i <= 200; i++) {
        const a = i / 200;
        const px = sx(a), py = sy(fn(a));
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    };
    // y = 1.  cross-entropy: |dL/dz| = 1 − a.   MSE: |dL/dz| = (1 − a)·a(1 − a)
    plot(a => 1 - a, CE);
    plot(a => (1 - a) * a * (1 - a), MSE);

    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = CE;  ctx.fillText('cross-entropy:  |∂L/∂z| = 1 − a', L0 + 14, T + 22);
    ctx.fillStyle = MSE; ctx.fillText('squared error:  |∂L/∂z| = (1 − a)·a(1 − a)', L0 + 14, T + 42);

    // the danger zone — confidently wrong
    ctx.fillStyle = 'rgba(198,40,40,0.06)';
    ctx.fillRect(L0, T, sx(0.15) - L0, B - T);
    ctx.fillStyle = '#c62828'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('confidently', sx(0.075), B + 26);
    ctx.fillText('WRONG', sx(0.075), B + 42);

    // read off the gap at a = 0.02
    const a0 = 0.02, ce = 1 - a0, ms = (1 - a0) * a0 * (1 - a0);
    ctx.beginPath(); ctx.fillStyle = CE;  ctx.arc(sx(a0), sy(ce), 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = MSE; ctx.arc(sx(a0), sy(ms), 4.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('a  =  probability assigned to the true class', (L0 + R) / 2, B + 70);
    ctx.fillStyle = '#333'; ctx.font = '13px system-ui';
    ctx.fillText(`at a = 0.02:   cross-entropy gradient ${ce.toFixed(2)}   vs   MSE gradient ${ms.toFixed(4)}`,
                 (L0 + R) / 2, B + 100);
    ctx.fillStyle = '#c62828';
    ctx.fillText(`MSE's learning signal is ${(ce / ms).toFixed(0)}× smaller — it stalls when most wrong`,
                 (L0 + R) / 2, B + 122);
    ctx.textAlign = 'left';
  });
}

// training: repeated z ← z − η(p − y)
function drawTraining(c2d, st) {
  drawPipeline(c2d, st, { probs: true, markTrue: true, loss: true });
  c2d.raw((ctx, c) => {
    const L0 = 90, R = c.width - 70, T = 290, B = c.height - 80;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L0, T); ctx.lineTo(L0, B); ctx.lineTo(R, B); ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('loss per gradient step', L0 + 8, T + 16);

    const h = st.hist;
    if (h.length > 1) {
      const maxL = Math.max(...h, 0.5);
      const sx = i => L0 + i / Math.max(h.length - 1, 1) * (R - L0);
      const sy = v => B - v / maxL * (B - T - 20);
      ctx.beginPath(); ctx.strokeStyle = '#e8710a'; ctx.lineWidth = 2.4;
      h.forEach((v, i) => (i === 0 ? ctx.moveTo(sx(i), sy(v)) : ctx.lineTo(sx(i), sy(v))));
      ctx.stroke();
      h.forEach((v, i) => {
        ctx.beginPath(); ctx.fillStyle = '#e8710a';
        ctx.arc(sx(i), sy(v), 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(`L = ${h[h.length - 1].toFixed(3)}  after ${h.length - 1} step(s)`, R, B + 22);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#ccc'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('press "Take a gradient step" to start training', (L0 + R) / 2, (T + B) / 2);
      ctx.textAlign = 'left';
    }
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `ce-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">`;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = fmt(v);
    onChange(v);
  });
}

function addButton(container, text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = 'padding:8px 12px;font-size:13px;border:1px solid #2e7d32;color:#2e7d32;'
    + 'background:#fff;border-radius:6px;cursor:pointer;';
  b.addEventListener('click', onClick);
  container.appendChild(b);
}

const zSliders = st => CLASSES.forEach((cl, i) =>
  addSlider(st._controls, `z (${cl})`, -4, 4, 0.1, st.z[i], v => v.toFixed(1), v => { st.z[i] = v; st.hist = []; }));

const trueSlider = st =>
  addSlider(st._controls, 'true class', 0, 2, 1, st.c, v => CLASSES[v], v => { st.c = v; st.hist = []; });

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Multi-class Cross-Entropy',
  subject: 'Machine Learning',

  initState() {
    return { z: [2.0, 0.5, -1.0], c: 0, hist: [], _controls: null };
  },

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
    {
      title: 'Logits — the raw scores',
      description: 'The last layer of a classifier emits one raw score per class — the logits $z$. They are unbounded: any real number, positive or negative. They are not probabilities, and they do not sum to anything in particular.',
      equation: '\\mathbf{z} = (z_{\\text{cat}},\\; z_{\\text{dog}},\\; z_{\\text{bird}}) \\in \\mathbb{R}^3',
      notes: 'Drag the sliders. A bigger logit means the network prefers that class — but by how much? A raw score of 2.0 is meaningless on its own.\n\nTo turn scores into something we can compute a loss against, we need a probability distribution. That is the next step.',
      setup(c2d, st) { clearControls(st); zSliders(st); },
      update(c2d, st) { c2d.clearPersistent(); drawPipeline(c2d, st, {}); },
    },
    {
      title: 'Softmax — scores become probabilities',
      description: 'Exponentiate each logit and divide by the total. Everything becomes positive, and the three now sum to exactly 1 — a genuine probability distribution over the classes.',
      equation: 'p_i = \\mathrm{softmax}(\\mathbf{z})_i = \\dfrac{e^{z_i}}{\\sum_j e^{z_j}}',
      notes: 'Exponentiating exaggerates gaps: raise one logit slightly and it takes a disproportionate share of the probability mass.\n\nBecause the total is pinned at 1, the classes compete — pushing one probability up necessarily pushes the others down. That coupling is what makes the gradient so clean later.',
      setup(c2d, st) { clearControls(st); zSliders(st); },
      update(c2d, st) { c2d.clearPersistent(); drawPipeline(c2d, st, { probs: true }); },
    },
    {
      title: 'The loss — surprise at the right answer',
      description: 'The label is one-hot: all the mass on the true class. Cross-entropy sums $-y_k \\log p_k$ over the classes — but every term with $y_k = 0$ vanishes, so it collapses to just the negative log-probability of the true class.',
      equation: 'L = -\\sum_k y_k \\log p_k = -\\log p_c',
      notes: 'Only the probability assigned to the TRUE class appears in the loss. The other two never show up explicitly.\n\nBut they matter implicitly: softmax forces the total to 1, so inflating a wrong class necessarily deflates $p_c$ and raises the loss.\n\nChange the true class with the slider and watch the loss jump.',
      setup(c2d, st) { clearControls(st); zSliders(st); trueSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawPipeline(c2d, st, { probs: true, markTrue: true, loss: true }); },
    },
    {
      title: 'Why the logarithm',
      description: 'Plot $-\\log(p_c)$. Predict the right answer with certainty and the loss is exactly 0. But as your confidence in the truth collapses toward 0, the loss rises without bound.',
      equation: 'L = -\\log p_c \\;\\longrightarrow\\; \\infty \\quad \\text{as} \\quad p_c \\to 0',
      notes: 'This is maximum likelihood in disguise: minimising $-\\log p_c$ is exactly maximising the likelihood the model assigns to the observed data.\n\nThe unbounded penalty is the point. Squared error would cap the punishment for a confident mistake at a mild constant; cross-entropy makes it catastrophic — which is what you want from a classifier.\n\nDrag the logits so the true class gets a low probability, and watch the marker climb the wall.',
      setup(c2d, st) { clearControls(st); zSliders(st); trueSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawPipeline(c2d, st, { probs: true, markTrue: true }); drawLossCurve(c2d, st); },
    },
    {
      title: 'The gradient — prediction minus target',
      description: 'Here is the payoff. Push cross-entropy back through the softmax and almost everything cancels. What survives is startlingly simple: the gradient with respect to the logits is just the predicted distribution minus the one-hot target.',
      equation: '\\frac{\\partial L}{\\partial \\mathbf{z}} = \\mathbf{p} - \\mathbf{y}',
      notes: 'Read the bars: the true class gets $p_c - 1$, which is negative — so gradient descent pushes that logit UP. Every wrong class gets $+p_k$ — so their logits get pushed DOWN, in proportion to how much probability they wrongly claimed.\n\nNo sigmoid derivative, no softmax Jacobian, no messy chain of factors. Just error = prediction − target.\n\nThat cancellation is not a coincidence — it is the whole reason this pairing is used.',
      setup(c2d, st) { clearControls(st); zSliders(st); trueSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); drawGradient(c2d, st); },
    },
    {
      title: 'Why not squared error',
      description: 'Compare the size of the learning signal as the model becomes confidently wrong (left edge). Cross-entropy grows toward its maximum. Squared error collapses to nearly nothing — because its gradient still carries the saturating $a(1-a)$ factor.',
      equation: '\\underbrace{|1 - a|}_{\\text{cross-entropy}} \\qquad \\text{vs} \\qquad \\underbrace{(1-a)\\,a(1-a)}_{\\text{squared error}}',
      notes: 'At $a = 0.02$ — the model is 98% sure of the WRONG answer — cross-entropy delivers a gradient of 0.98, while squared error delivers 0.019. About 50× weaker, precisely when you most need the model to move.\n\nThis is the term that survived in the backpropagation lesson: there we used MSE, and $\\partial L/\\partial z = (a-y)\\cdot a(1-a)$ kept the killer $a(1-a)$ factor. Cross-entropy annihilates it.\n\nThat is the whole argument. Classification uses cross-entropy because squared error stops learning exactly when it is most wrong.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); drawWhyNotMSE(c2d, st); },
    },
    {
      title: 'Training',
      description: 'Put it together. Each step: forward through softmax, compute $\\mathbf{p} - \\mathbf{y}$, and nudge the logits the opposite way. Press the button repeatedly — the true class rises toward probability 1 and the loss falls toward 0.',
      equation: '\\mathbf{z} \\leftarrow \\mathbf{z} - \\eta\\,(\\mathbf{p} - \\mathbf{y})',
      notes: 'The loss curve below tracks each step.\n\nNotice the updates get smaller as the model gets it right: once $p_c \\to 1$, the gradient $\\mathbf{p} - \\mathbf{y} \\to \\mathbf{0}$ and training naturally slows to a halt. The loss is its own stopping signal.\n\nReset and pick a different true class to watch it climb out of a confidently wrong start.',
      setup(c2d, st) {
        clearControls(st);
        st.hist = [model(st).L];
        trueSlider(st);
        addButton(st._controls, 'Take a gradient step  ↓L', () => {
          const { grad } = model(st);
          st.z = st.z.map((v, i) => v - LR * grad[i]);
          st.hist.push(model(st).L);
          if (st.hist.length > 60) st.hist.shift();
        });
        addButton(st._controls, 'Reset', () => { st.z = [2.0, 0.5, -1.0]; st.hist = [model(st).L]; });
      },
      update(c2d, st) { c2d.clearPersistent(); drawTraining(c2d, st); },
    },
  ],
};
