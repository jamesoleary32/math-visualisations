// Determinant — Geometric Interpretation
//
// The determinant of a 2×2 matrix measures two things:
//   1. How much the matrix scales areas  (|det| = area scale factor)
//   2. Whether it flips orientation      (sign of det)
//
// For M = [[a,b],[c,d]]:  det = ad − bc

// ── Matrix helpers ─────────────────────────────────────────────────────────────

function tx(M, x, y) {
  return [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
}

function det(M) {
  return M[0]*M[3] - M[1]*M[2];
}

function sampleOrbit(pts) { return pts; }

function drawTransformedGrid(c2d, M) {
  for (let i = -7; i <= 7; i++) {
    c2d.addLine([tx(M,-7,i), tx(M,7,i)], { color: '#e0e8f0', width: 1 });
    c2d.addLine([tx(M,i,-7), tx(M,i,7)], { color: '#e0e8f0', width: 1 });
  }
}

function drawFilledQuad(c2d, pts, fillColor, strokeColor, strokeWidth, live) {
  const method = live ? 'showRaw' : 'raw';
  c2d[method]((ctx, cam) => {
    ctx.beginPath();
    ctx.moveTo(cam.wx(pts[0][0]), cam.wy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(cam.wx(pts[i][0]), cam.wy(pts[i][1]));
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth ?? 2; ctx.stroke(); }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `det-${Math.random().toString(36).slice(2)}`;
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

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'The Determinant',
  subject: 'Linear Algebra',

  initState: () => ({
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

    // ── Step 1: Unit square — before any transformation ──────────────────────
    {
      title: 'The Unit Square — Area = 1',
      description: 'Before any transformation, the two basis vectors e₁ = (1,0) and e₂ = (0,1) span a unit square. Its area is exactly 1.',
      equation: '\\det(I) = \\det\\!\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix} = 1',
      notes: 'Every 2D linear transformation is determined by where it sends the two basis vectors. The unit square — built from those two vectors — tracks area changes.',
      setup(c2d, state) {
        clearControls(state);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Unit square
        const sq = [[0,0],[1,0],[1,1],[0,1]];
        drawFilledQuad(c2d, sq, 'rgba(21,101,192,0.12)', '#1565c0', 2, false);

        // Basis vectors
        c2d.addArrow(0, 0, 1, 0, { color: '#c62828', width: 2 });
        c2d.addArrow(0, 0, 0, 1, { color: '#2e7d32', width: 2 });
        c2d.addText('e₁ = (1, 0)', 1.08, -0.25, { color: '#c62828', size: 12 });
        c2d.addText('e₂ = (0, 1)', 0.1, 1.15,  { color: '#2e7d32', size: 12 });
        c2d.addText('area = 1', 0.28, 0.42,     { color: '#1565c0', size: 13 });
      },
    },

    // ── Step 2: Matrix transforms square → parallelogram ─────────────────────
    {
      title: 'A Scales Area by |det(A)|',
      description: 'Applying matrix A sends every point (x, y) to (ax + by, cx + dy). The unit square becomes a parallelogram. Its area is exactly |det(A)| = |ad − bc|.',
      equation: '\\det\\!\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc',
      notes: 'Use the sliders to reshape the matrix. Watch the parallelogram change. When det > 0 (blue), orientation is preserved. When det < 0 (red), a reflection occurred.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'a', -3, 3, 0.1, state.a, v => v.toFixed(1), v => state.a = v);
        addSlider(state._controls, 'b', -3, 3, 0.1, state.b, v => v.toFixed(1), v => state.b = v);
        addSlider(state._controls, 'c', -3, 3, 0.1, state.c, v => v.toFixed(1), v => state.c = v);
        addSlider(state._controls, 'd', -3, 3, 0.1, state.d, v => v.toFixed(1), v => state.d = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { a, b, c, d } = state;
        const M = [a, b, c, d];
        const D = det(M);
        const isPos = D >= 0;
        const fillCol = isPos ? 'rgba(21,101,192,0.15)' : 'rgba(198,40,40,0.15)';
        const edgeCol = isPos ? '#1565c0' : '#c62828';

        // Original unit square (faint)
        const sq = [[0,0],[1,0],[1,1],[0,1]];
        drawFilledQuad(c2d, sq, 'rgba(0,0,0,0.04)', '#bbb', 1, false);

        // Transformed parallelogram
        const p0 = tx(M,0,0), p1 = tx(M,1,0), p2 = tx(M,1,1), p3 = tx(M,0,1);
        drawFilledQuad(c2d, [p0,p1,p2,p3], fillCol, edgeCol, 2, false);

        // Column vectors (where basis vectors land)
        c2d.addArrow(0, 0, a, c, { color: '#c62828', width: 2 });
        c2d.addArrow(0, 0, b, d, { color: '#2e7d32', width: 2 });

        // Labels
        c2d.addText(`A(e₁) = (${a.toFixed(1)}, ${c.toFixed(1)})`, a + 0.12, c - 0.25, { color: '#c62828', size: 11 });
        c2d.addText(`A(e₂) = (${b.toFixed(1)}, ${d.toFixed(1)})`, b + 0.12, d + 0.15, { color: '#2e7d32', size: 11 });

        // Det display
        const detLabel = `det(A) = ${a.toFixed(1)}×${d.toFixed(1)} − ${b.toFixed(1)}×${c.toFixed(1)} = ${D.toFixed(2)}`;
        c2d.addText(detLabel, -5.5, 4.2, { color: edgeCol, size: 12 });
        c2d.addText(`area = |det| = ${Math.abs(D).toFixed(2)}`, -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

    // ── Step 3: Transformed grid — det scales everything ─────────────────────
    {
      title: 'The Whole Plane Scales by |det(A)|',
      description: 'Every region in the plane — not just the unit square — has its area scaled by |det(A)|. The transformed grid shows this globally.',
      equation: '\\text{Area}_{\\text{after}} = |\\det(A)| \\cdot \\text{Area}_{\\text{before}}',
      notes: 'Notice that all the parallelograms in the transformed grid are congruent. This is the key property: a linear map applies a uniform area scaling everywhere.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'a', -3, 3, 0.1, state.a, v => v.toFixed(1), v => state.a = v);
        addSlider(state._controls, 'b', -3, 3, 0.1, state.b, v => v.toFixed(1), v => state.b = v);
        addSlider(state._controls, 'c', -3, 3, 0.1, state.c, v => v.toFixed(1), v => state.c = v);
        addSlider(state._controls, 'd', -3, 3, 0.1, state.d, v => v.toFixed(1), v => state.d = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });

        const { a, b, c, d } = state;
        const M = [a, b, c, d];
        const D = det(M);
        const isPos = D >= 0;
        const edgeCol = isPos ? '#1565c0' : '#c62828';

        // Original grid (very faint)
        for (let i = -6; i <= 6; i++) {
          c2d.addLine([[-6,i],[6,i]], { color: '#e8e8e8', width: 1 });
          c2d.addLine([[i,-6],[i,6]], { color: '#e8e8e8', width: 1 });
        }

        // Transformed grid
        drawTransformedGrid(c2d, M);

        // Highlight one transformed cell
        const cell = [[0,0],[1,0],[1,1],[0,1]].map(([x,y]) => tx(M,x,y));
        drawFilledQuad(c2d, cell, isPos ? 'rgba(21,101,192,0.18)' : 'rgba(198,40,40,0.18)', edgeCol, 2, false);

        // Axes through origin
        c2d.addAxes({ color: '#ccc' });
        c2d.addPoint(0, 0, { radius: 4, color: '#555' });

        c2d.addText(`det(A) = ${D.toFixed(2)}`, -5.5, 4.2, { color: edgeCol, size: 13 });
      },
    },

    // ── Step 4: det = 0 — collapse, no inverse ───────────────────────────────
    {
      title: 'det = 0 — The Plane Collapses',
      description: 'When det(A) = 0, the transformation squashes the entire plane onto a single line. Area becomes zero. The mapping is irreversible — multiple points map to the same image, so A⁻¹ cannot exist.',
      equation: '\\det(A)=0 \\implies A^{-1} \\text{ does not exist}',
      notes: 'A singular matrix has linearly dependent columns — one column is a scalar multiple of the other. Every input vector gets projected onto that common line.',
      setup(c2d, state) {
        clearControls(state);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });

        // Singular matrix: column 2 = 2 × column 1 → det = 0
        const M = [1, 2, 0.5, 1];

        // Show several input vectors collapsing to the same line
        const colors = ['#e53935','#fb8c00','#43a047','#1e88e5','#8e24aa'];
        const inputs = [[-2,-1],[-1,-0.5],[1,0.5],[2,1],[0,-2]];
        inputs.forEach(([x,y], i) => {
          const [tx_, ty_] = tx(M, x, y);
          c2d.addArrow(0, 0, x, y,   { color: colors[i % colors.length], width: 1.5 });
          c2d.addArrow(0, 0, tx_, ty_, { color: colors[i % colors.length], width: 2 });
        });

        // The image line: direction (1, 0.5)
        c2d.addLine([[-7,-3.5],[7,3.5]], { color: '#555', width: 1.5, dash: [6,4] });
        c2d.addText('image: all points collapse here', 1.2, 0.9, { color: '#555', size: 11 });

        c2d.addText('M = [[1, 2], [0.5, 1]]', -5.5, 4.2, { color: '#c62828', size: 12 });
        c2d.addText('det(M) = 1·1 − 2·0.5 = 0', -5.5, 3.7, { color: '#c62828', size: 12 });
      },
    },

  ],
};
