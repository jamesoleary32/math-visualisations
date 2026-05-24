function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `mv-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
           style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const vel = wrap.querySelector(`[id="${id}-v"]`);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    vel.textContent = fmt(v);
    onChange(v);
  });
}

function tx(M, x, y) { return [M[0]*x + M[1]*y, M[2]*x + M[3]*y]; }

function drawGrid(c2d, M) {
  for (let i = -7; i <= 7; i++) {
    c2d.addLine([tx(M,-7,i), tx(M,7,i)], { color: '#e0e8f0', width: 1 });
    c2d.addLine([tx(M,i,-7), tx(M,i,7)], { color: '#e0e8f0', width: 1 });
  }
}

export default {
  title: 'Matrix-Vector Multiplication',
  subject: 'Linear Algebra',

  initState: () => ({
    x1: 1.5, x2: 1.0,
    theta: Math.PI / 4,
    a: 2, b: 0.5, c: 0.5, d: 1.5,
    _controls: null,
  }),

  init(c2d, state, panelEl) {
    c2d.scale = 55;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: The rule ──────────────────────────────────────────────────────
    {
      title: 'The Rule: Each Output Entry is a Dot Product',
      description: 'To multiply matrix A by vector x, take each row of A and dot it with x. Row i of A dotted with x gives entry i of the output. Drag the sliders to see how x₁ and x₂ move the result.',
      equation: '\\begin{pmatrix}2&1\\\\1&3\\end{pmatrix}\\begin{pmatrix}x_1\\\\x_2\\end{pmatrix}=\\begin{pmatrix}2x_1+x_2\\\\x_1+3x_2\\end{pmatrix}',
      notes: 'A = [[2, 1], [1, 3]]  (fixed here).\n\nRow 1 · x  =  2x₁ + x₂  →  first output entry\nRow 2 · x  =  x₁ + 3x₂  →  second output entry\n\nThe output Ax is a new vector in ℝ² — not a scalar. A maps vectors to vectors.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'x₁', -2.5, 3, 0.1, state.x1, v => v.toFixed(1), v => { state.x1 = v; });
        addSlider(state._controls, 'x₂', -2.5, 3, 0.1, state.x2, v => v.toFixed(1), v => { state.x2 = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const A = [2, 1, 1, 3];
        const { x1, x2 } = state;
        const [ax, ay] = tx(A, x1, x2);

        // x (blue)
        c2d.addArrow(0, 0, x1, x2, { color: '#1565c0', width: 2.5 });
        c2d.addText('x', x1 + 0.12, x2 + 0.15, { color: '#1565c0', size: 14, italic: true });

        // Ax (red)
        c2d.addArrow(0, 0, ax, ay, { color: '#c62828', width: 2.5 });
        c2d.addText('Ax', ax + 0.12, ay + 0.15, { color: '#c62828', size: 13 });

        // computation
        c2d.addText(
          `row 1·x  =  2·${x1.toFixed(1)} + 1·${x2.toFixed(1)}  =  ${(2*x1+x2).toFixed(1)}`,
          -5.5, -3.3, { color: '#555', size: 12 });
        c2d.addText(
          `row 2·x  =  1·${x1.toFixed(1)} + 3·${x2.toFixed(1)}  =  ${(x1+3*x2).toFixed(1)}`,
          -5.5, -3.9, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: Column picture ────────────────────────────────────────────────
    {
      title: 'Column Picture: Weighted Sum of Columns',
      description: 'There is a second way to read the same multiplication: Ax is a linear combination of the columns of A. The entries of x are the weights. This view — not the row-by-row rule — is usually more geometrically useful.',
      equation: 'A\\mathbf{x} = x_1\\begin{pmatrix}2\\\\1\\end{pmatrix} + x_2\\begin{pmatrix}1\\\\3\\end{pmatrix}',
      notes: 'col₁ = (2, 1),  col₂ = (1, 3).\n\nThe blue arrow is x₁·col₁, the red arrow is x₂·col₂ placed at its tip. Their sum (green) is Ax — the same answer as before, computed differently.\n\nThis view reveals that Ax lives in the span of the columns of A. If you want to know which vectors b can be written as Ax for some x, the answer is: exactly the column space of A.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'x₁  (weight on col₁)', -2.5, 3, 0.1, state.x1, v => v.toFixed(1), v => { state.x1 = v; });
        addSlider(state._controls, 'x₂  (weight on col₂)', -2.5, 3, 0.1, state.x2, v => v.toFixed(1), v => { state.x2 = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { x1, x2 } = state;
        // columns of A
        const c1x = 2, c1y = 1;   // col 1
        const c2x = 1, c2y = 3;   // col 2

        const p1x = x1 * c1x, p1y = x1 * c1y;   // x1 · col1
        const p2x = x2 * c2x, p2y = x2 * c2y;   // x2 · col2
        const ax  = p1x + p2x, ay = p1y + p2y;   // Ax

        // x₁·col₁ from origin (blue)
        c2d.addArrow(0, 0, p1x, p1y, { color: '#1565c0', width: 2.5 });

        // x₂·col₂ from tip of x₁·col₁ (red, translated)
        c2d.addArrow(p1x, p1y, ax, ay, { color: '#c62828', width: 2.5 });

        // Ax = sum (green)
        c2d.addArrow(0, 0, ax, ay, { color: '#2e7d32', width: 2.5 });

        c2d.addText(`x₁·col₁ = (${p1x.toFixed(1)}, ${p1y.toFixed(1)})`,
          -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText(`x₂·col₂ = (${p2x.toFixed(1)}, ${p2y.toFixed(1)})`,
          -5.5, 3.7, { color: '#c62828', size: 12 });
        c2d.addText(`Ax  = (${ax.toFixed(1)}, ${ay.toFixed(1)})`,
          -5.5, 3.2, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 3: Rotation ──────────────────────────────────────────────────────
    {
      title: 'Rotation Matrix',
      description: 'The matrix with cos θ and sin θ in its entries rotates every vector in the plane by angle θ — without changing its length. This is one of the most important special cases of matrix-vector multiplication.',
      equation: 'R_\\theta = \\begin{pmatrix}\\cos\\theta & -\\!\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta\\end{pmatrix}',
      notes: 'The two columns of Rθ are where the standard basis vectors land:\n  e₁ = (1,0)  →  (cos θ, sin θ)\n  e₂ = (0,1)  →  (−sin θ, cos θ)\n\nBoth are unit vectors, and they stay perpendicular — that is why rotation preserves length and angle. det(Rθ) = cos²θ + sin²θ = 1: no area change.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle  θ', 0, 2 * Math.PI, 0.02, state.theta,
          v => `${(v * 180 / Math.PI).toFixed(0)}°`, v => { state.theta = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = state.theta;
        const cos = Math.cos(th), sin = Math.sin(th);
        const R = [cos, -sin, sin, cos];

        // fixed vector v = (2, 1)
        const vx = 2, vy = 1;
        const [rx, ry] = tx(R, vx, vy);

        // unit circle (faint)
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.strokeStyle = '#1565c015';
          ctx.lineWidth = 1;
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(Math.sqrt(5)), 0, Math.PI * 2);
          ctx.stroke();
        });

        // original vector (faint blue)
        c2d.addArrow(0, 0, vx, vy, { color: '#1565c044', width: 2 });
        c2d.addText('v', vx + 0.12, vy + 0.15, { color: '#1565c066', size: 13, italic: true });

        // rotated vector (red)
        c2d.addArrow(0, 0, rx, ry, { color: '#c62828', width: 2.5 });
        c2d.addText('Rθv', rx + 0.12, ry + 0.12, { color: '#c62828', size: 13 });

        // angle arc
        c2d.raw((ctx, cam) => {
          const a0 = Math.atan2(-vy, vx);
          const a1 = Math.atan2(-ry, rx);
          ctx.beginPath();
          ctx.strokeStyle = '#e65100';
          ctx.lineWidth = 1.5;
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(0.7), Math.min(a0,a1), Math.max(a0,a1), a0 > a1);
          ctx.stroke();
        });

        // rotated basis vectors
        c2d.addArrow(0, 0, cos, sin,   { color: '#2e7d3266', width: 1.5 });
        c2d.addArrow(0, 0, -sin, cos,  { color: '#2e7d3266', width: 1.5 });

        c2d.addText(`θ = ${(th * 180 / Math.PI).toFixed(0)}°`, -5.5, 4.2, { color: '#e65100', size: 12 });
        c2d.addText(`v = (${vx}, ${vy})  →  Rθv = (${rx.toFixed(2)}, ${ry.toFixed(2)})`,
          -5.5, 3.7, { color: '#555', size: 12 });
        c2d.addText(`‖v‖ = ‖Rθv‖ = ${Math.sqrt(vx*vx+vy*vy).toFixed(2)}  (length preserved)`,
          -5.5, 3.2, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 4: A transforms the plane ────────────────────────────────────────
    {
      title: 'A Transforms the Whole Plane',
      description: 'A matrix does not just act on one vector — it acts on every vector in the plane simultaneously. The columns of A tell you everything: they are where the standard basis vectors e₁ and e₂ land. Everything else follows by linearity.',
      equation: 'A\\mathbf{e}_1 = \\begin{pmatrix}a\\\\c\\end{pmatrix} \\qquad A\\mathbf{e}_2 = \\begin{pmatrix}b\\\\d\\end{pmatrix}',
      notes: 'Drag the sliders to reshape A. The transformed grid shows where every point ends up.\n\nKey observations:\n• The origin always stays fixed: A·0 = 0\n• Straight lines stay straight — A is linear\n• The parallelogram of (col₁, col₂) is the image of the unit square; its area = |det A|\n• When det A = 0 the whole plane collapses to a line',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'a', -3, 3, 0.1, state.a, v => v.toFixed(1), v => { state.a = v; });
        addSlider(state._controls, 'b', -3, 3, 0.1, state.b, v => v.toFixed(1), v => { state.b = v; });
        addSlider(state._controls, 'c', -3, 3, 0.1, state.c, v => v.toFixed(1), v => { state.c = v; });
        addSlider(state._controls, 'd', -3, 3, 0.1, state.d, v => v.toFixed(1), v => { state.d = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const { a, b, c, d } = state;
        const M = [a, b, c, d];

        // original grid (very faint)
        for (let i = -6; i <= 6; i++) {
          c2d.addLine([[-6,i],[6,i]], { color: '#f0f0f0', width: 1 });
          c2d.addLine([[i,-6],[i,6]], { color: '#f0f0f0', width: 1 });
        }

        // transformed grid
        drawGrid(c2d, M);
        c2d.addAxes({ color: '#ccc' });

        // column vectors (where basis vectors land)
        c2d.addArrow(0, 0, a, c, { color: '#c62828', width: 2.5 });
        c2d.addArrow(0, 0, b, d, { color: '#2e7d32', width: 2.5 });
        c2d.addText(`Ae₁=(${a.toFixed(1)},${c.toFixed(1)})`, a+0.12, c-0.28, { color: '#c62828', size: 11 });
        c2d.addText(`Ae₂=(${b.toFixed(1)},${d.toFixed(1)})`, b+0.12, d+0.18, { color: '#2e7d32', size: 11 });

        const det = a*d - b*c;
        c2d.addText(`det(A) = ${det.toFixed(2)}  — area scale factor`,
          -5.5, -3.6, { color: Math.abs(det) < 0.1 ? '#c62828' : '#555', size: 12 });
      },
    },

    // ── Step 5: Linearity ─────────────────────────────────────────────────────
    {
      title: 'Linearity: A(u + v) = Au + Av',
      description: 'Matrix-vector multiplication is a linear map: it distributes over addition and commutes with scaling. This is not a coincidence — it follows directly from the rule of multiplication, and it is the defining property of all linear transformations.',
      equation: 'A(\\mathbf{u}+\\mathbf{v}) = A\\mathbf{u}+A\\mathbf{v} \\qquad A(\\alpha\\mathbf{u}) = \\alpha A\\mathbf{u}',
      notes: 'A = [[1.5, 0.5], [0.5, 1]]  (fixed).\n\nu = (2, 0.5) → Au = (3.25, 1.5)  (blue)\nv = (−0.5, 1.5) → Av = (0, 1.25)  (red)\nu+v = (1.5, 2) → A(u+v) = (3.25, 2.75)  (green)\n\nAu + Av = (3.25, 2.75) = A(u+v)  ✓\n\nGeometrically: the image of the sum equals the sum of the images. A does not "mix up" the addition — it just applies to each piece separately.',
      setup(c2d, state) {
        clearControls(state);

        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const A = [1.5, 0.5, 0.5, 1];
        const ux = 2, uy = 0.5;
        const vx = -0.5, vy = 1.5;
        const sx = ux + vx, sy = uy + vy;

        const [aux, auy] = tx(A, ux, uy);
        const [avx, avy] = tx(A, vx, vy);
        const [asx, asy] = tx(A, sx, sy);

        // inputs (faint)
        c2d.addArrow(0, 0, ux, uy, { color: '#1565c044', width: 1.5 });
        c2d.addArrow(0, 0, vx, vy, { color: '#c6282844', width: 1.5 });
        c2d.addArrow(0, 0, sx, sy, { color: '#2e7d3244', width: 1.5 });
        c2d.addText('u',   ux+0.1, uy+0.15, { color: '#1565c066', size: 13, italic: true });
        c2d.addText('v',   vx-0.3, vy+0.15, { color: '#c6282866', size: 13, italic: true });
        c2d.addText('u+v', sx+0.1, sy+0.15, { color: '#2e7d3266', size: 13, italic: true });

        // outputs (bold)
        c2d.addArrow(0, 0, aux, auy, { color: '#1565c0', width: 2.5 });
        c2d.addArrow(0, 0, avx, avy, { color: '#c62828', width: 2.5 });
        c2d.addArrow(0, 0, asx, asy, { color: '#2e7d32', width: 3 });
        c2d.addText('Au',    aux+0.12, auy-0.25, { color: '#1565c0', size: 13 });
        c2d.addText('Av',    avx-0.5,  avy+0.2,  { color: '#c62828', size: 13 });
        c2d.addText('A(u+v)', asx+0.12, asy+0.15, { color: '#2e7d32', size: 13 });

        // show Au + Av tail-to-tip equals A(u+v)
        c2d.addArrow(aux, auy, asx, asy, { color: '#c6282888', width: 1.5, dash: [4, 3] });

        c2d.addText('Au + Av  =  A(u+v)  ✓', -5.5, -3.7, { color: '#2e7d32', size: 13 });
      },
    },

  ],
};
