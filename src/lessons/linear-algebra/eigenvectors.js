// Eigenvectors and Eigenvalues
//
// For a matrix A, most vectors v change direction under multiplication: Av ≠ λv.
// Special vectors called eigenvectors are only scaled, never rotated:
//   Av = λv
// where λ (eigenvalue) is the scale factor.
//
// Working matrix: A = [[3, 1], [0, 2]]
//   Eigenvalue λ₁ = 3, eigenvector e₁ = [1, 0]   (x-axis stays fixed)
//   Eigenvalue λ₂ = 2, eigenvector e₂ = [1, 1]   (diagonal stays fixed)

// ── Matrix helpers ─────────────────────────────────────────────────────────────

function tx(M, x, y) {
  return [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
}

// The matrix used throughout this lesson
const A = [3, 1, 0, 2];

// Eigenpairs (exact for A = [[3,1],[0,2]])
// λ₁ = 3, v₁ = (1, 0)
// λ₂ = 2, v₂ = (1, 1) (normalised direction)
const EIG = [
  { lam: 3, v: [1, 0],   color: '#c62828', label: 'λ₁ = 3' },
  { lam: 2, v: [1, 1],   color: '#2e7d32', label: 'λ₂ = 2' },
];

function drawFilledQuad(c2d, pts, fillColor, strokeColor, sw) {
  c2d.raw((ctx, cam) => {
    ctx.beginPath();
    ctx.moveTo(cam.wx(pts[0][0]), cam.wy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(cam.wx(pts[i][0]), cam.wy(pts[i][1]));
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = sw ?? 2; ctx.stroke(); }
  });
}

function drawTransformedGrid(c2d, M, color, width) {
  for (let i = -7; i <= 7; i++) {
    c2d.addLine([tx(M,-7,i), tx(M,7,i)], { color, width });
    c2d.addLine([tx(M,i,-7), tx(M,i,7)], { color, width });
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `eig-${Math.random().toString(36).slice(2)}`;
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
  title:   'Eigenvectors',
  subject: 'Linear Algebra',

  initState: () => ({
    angleDeg: 45,
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

    // ── Step 1: General vectors change direction ──────────────────────────────
    {
      title: 'Most Vectors Change Direction',
      description: 'Apply matrix A to a general vector v — the result Av usually points in a completely different direction. Drag the slider to rotate v and watch Av swing around.',
      equation: 'A = \\begin{pmatrix}3 & 1 \\\\ 0 & 2\\end{pmatrix}',
      notes: 'Only at special directions will Av stay parallel to v. Finding those directions is the eigenvector problem.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'direction of v  (degrees)', 0, 360, 1, state.angleDeg,
          v => `${v}°`, v => state.angleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ang = state.angleDeg * Math.PI / 180;
        const vx = Math.cos(ang), vy = Math.sin(ang);
        const [ax, ay] = tx(A, vx, vy);

        // Input vector v
        c2d.addArrow(0, 0, vx * 2, vy * 2, { color: '#1565c0', width: 2.5 });
        c2d.addText('v', vx * 2 + 0.1, vy * 2 + 0.1, { color: '#1565c0', size: 14, italic: true });

        // Transformed vector Av
        c2d.addArrow(0, 0, ax * 2, ay * 2, { color: '#c62828', width: 2.5 });
        c2d.addText('Av', ax * 2 + 0.1, ay * 2 + 0.1, { color: '#c62828', size: 14, italic: true });

        // Angle between them
        const dotVAv = vx * ax + vy * ay;
        const magV   = Math.sqrt(vx*vx + vy*vy);
        const magAv  = Math.sqrt(ax*ax + ay*ay);
        const cosAng = Math.max(-1, Math.min(1, dotVAv / (magV * magAv)));
        const diffDeg = Math.acos(cosAng) * 180 / Math.PI;

        c2d.addText(`angle between v and Av: ${diffDeg.toFixed(1)}°`, -5.5, 4.2, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: Eigenvectors — only scale ────────────────────────────────────
    {
      title: 'Eigenvectors Stay on Their Line',
      description: 'A matrix A has special directions — eigenvectors — where Av is exactly parallel to v. The vector only grows or shrinks; it never rotates. These are the "natural" directions of the transformation.',
      equation: 'Av = \\lambda v',
      notes: 'For A = [[3,1],[0,2]], the two eigenvectors are e₁ = (1,0) with λ₁ = 3, and e₂ = (1,1) (normalised) with λ₂ = 2. Any scalar multiple of an eigenvector is also an eigenvector.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        EIG.forEach(({ v, lam, color, label }) => {
          const norm = Math.sqrt(v[0]*v[0] + v[1]*v[1]);
          const vn = [v[0]/norm, v[1]/norm];

          // Eigenvector direction line (full span)
          c2d.addLine([[-7*vn[0],-7*vn[1]], [7*vn[0],7*vn[1]]], { color: color + '30', width: 1.5, dash:[6,4] });

          // v
          c2d.addArrow(0, 0, vn[0]*1.8, vn[1]*1.8, { color, width: 2 });
          c2d.addText('v', vn[0]*1.8 + 0.1, vn[1]*1.8 + 0.12, { color, size: 13, italic: true });

          // Av = λv
          const [ax, ay] = tx(A, vn[0], vn[1]);
          c2d.addArrow(0, 0, ax, ay, { color, width: 2.5 });
          c2d.addText(`Av  (${label})`, ax + 0.1, ay + 0.12, { color, size: 12 });
        });
      },
    },

    // ── Step 3: Av = λv — eigenvalue is the scale factor ─────────────────────
    {
      title: 'Av = λv — Eigenvalue = Scale Factor',
      description: 'The eigenvalue λ measures how much the eigenvector is stretched or compressed. λ > 1 means stretching, λ < 1 means shrinking, λ < 0 means flipping direction.',
      equation: 'A\\mathbf{v} = \\lambda \\mathbf{v} \\implies (A - \\lambda I)\\mathbf{v} = \\mathbf{0}',
      notes: 'For λ₁ = 3: the x-axis direction is tripled. For λ₂ = 2: the (1,1) direction is doubled. Eigenvalues are the solutions to det(A − λI) = 0, the characteristic equation.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        EIG.forEach(({ v, lam, color, label }) => {
          const norm = Math.sqrt(v[0]*v[0] + v[1]*v[1]);
          const vn = [v[0]/norm, v[1]/norm];

          // Show v and Av = λv side by side with a brace-like label
          const scale = 1.5;
          const vEnd  = [vn[0]*scale, vn[1]*scale];
          const avEnd = [vn[0]*scale*lam, vn[1]*scale*lam];

          // Eigenvector
          c2d.addArrow(0, 0, vEnd[0], vEnd[1], { color, width: 2 });
          c2d.addText('v', vEnd[0] + 0.1, vEnd[1] + 0.12, { color, size: 13, italic: true });

          // Image = λv
          c2d.addArrow(0, 0, avEnd[0], avEnd[1], { color, width: 3 });
          c2d.addText(`Av = λv  (λ = ${lam})`, avEnd[0] + 0.12, avEnd[1] + 0.12, { color, size: 12 });
        });

        c2d.addText('Characteristic equation: det(A − λI) = 0', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText('(3−λ)(2−λ) = 0  →  λ₁=3, λ₂=2', -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

    // ── Step 4: Eigenvectors span the plane ───────────────────────────────────
    {
      title: 'Eigenbasis — Any Vector as a Combination',
      description: 'When two linearly independent eigenvectors exist, every vector in the plane can be expressed as a combination of them. In the eigenbasis, the matrix is just scaling — two independent scale factors, no rotation.',
      equation: '\\mathbf{w} = c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 \\implies A\\mathbf{w} = c_1\\lambda_1\\mathbf{v}_1 + c_2\\lambda_2\\mathbf{v}_2',
      notes: 'This is why eigenvectors are central to matrix powers, diagonalisation, and differential equations — once decomposed into eigenvectors, applying A repeatedly just multiplies each component by its eigenvalue.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Eigenvector directions (extended)
        const v1 = [1,0], v2 = [1/Math.SQRT2, 1/Math.SQRT2];
        c2d.addLine([[-7,0],[7,0]], { color: '#c62828' + '40', width: 1.5, dash:[6,4] });
        c2d.addLine([[-5,-5],[5,5]], { color: '#2e7d32' + '40', width: 1.5, dash:[6,4] });

        // A sample vector w and its decomposition
        const wx = 2, wy = 1.5;
        // Decompose w in eigenbasis: w = c1*v1 + c2*v2
        // v1=(1,0), v2=(1,1)/√2 — but A's eigenvectors are (1,0) and (1,1) unnormalised
        // w = c1*(1,0) + c2*(1,1) → wy = c2, wx = c1 + c2 → c2=wy, c1=wx-wy
        const c2_ = wy, c1_ = wx - wy;

        // Show decomposition components
        c2d.addArrow(0, 0, c1_, 0, { color: '#c62828', width: 2 });
        c2d.addArrow(c1_, 0, c1_+c2_, c2_, { color: '#2e7d32', width: 2 });
        c2d.addArrow(0, 0, wx, wy, { color: '#555', width: 2.5 });

        // Transformed vector Aw and its eigenbasis components
        const [awx, awy] = tx(A, wx, wy);
        c2d.addArrow(0, 0, 3*c1_, 0, { color: '#c62828', width: 2, dash:[4,3] });
        c2d.addArrow(3*c1_, 0, 3*c1_+2*c2_, 2*c2_, { color: '#2e7d32', width: 2, dash:[4,3] });
        c2d.addArrow(0, 0, awx, awy, { color: '#1565c0', width: 2.5 });

        c2d.addText('w', wx + 0.1, wy, { color: '#555', size: 13, italic: true });
        c2d.addText('Aw', awx + 0.1, awy, { color: '#1565c0', size: 13, italic: true });
        c2d.addText('solid: original decomposition', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText('dashed: each component scaled by its λ', -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

  ],
};
