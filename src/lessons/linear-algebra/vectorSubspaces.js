// Vector Subspaces — Linear Algebra
//
// A subspace W of ℝⁿ is a non-empty subset satisfying three axioms:
//   1. Zero vector: 0 ∈ W
//   2. Closure under addition: u, v ∈ W → u+v ∈ W
//   3. Closure under scalar multiplication: v ∈ W, c ∈ ℝ → cv ∈ W
//
// In ℝ²: the only subspaces are {0}, lines through the origin, and ℝ² itself.

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `sub-${Math.random().toString(36).slice(2)}`;
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
  title:   'Vector Subspaces',
  subject: 'Linear Algebra',

  initState: () => ({
    lineAngle: 35,
    tU: 1.5,
    scalar: 2.0,
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

    // ── Step 1: The Three Axioms ──────────────────────────────────────────────
    {
      title: 'What is a Subspace?',
      description: 'A subspace W of ℝⁿ is a subset you can never escape by adding vectors or scaling them. Three axioms must all hold simultaneously.',
      equation: `\\begin{aligned}
        &\\textbf{1.}\\quad \\mathbf{0} \\in W \\\\[4pt]
        &\\textbf{2.}\\quad \\mathbf{u},\\mathbf{v} \\in W \\implies \\mathbf{u}+\\mathbf{v} \\in W \\\\[4pt]
        &\\textbf{3.}\\quad \\mathbf{v} \\in W,\\ c \\in \\mathbb{R} \\implies c\\mathbf{v} \\in W
      \\end{aligned}`,
      notes: 'Axiom 1 rules out the empty set. Axioms 2–3 together enforce closure under all linear combinations: c₁u + c₂v ∈ W for any u, v ∈ W and scalars c₁, c₂.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ang = 35 * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);

        // The subspace line (faint)
        c2d.addLine([[-8*dx, -8*dy], [8*dx, 8*dy]], { color: '#1565c0' + '35', width: 2, dash: [6, 4] });

        // u and v on the line
        const u = [dx * 1.8,  dy * 1.8];
        const v = [dx * -2.5, dy * -2.5];
        c2d.addArrow(0, 0, u[0], u[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('u', u[0] + 0.15, u[1] + 0.15, { color: '#1565c0', size: 13, italic: true });

        c2d.addArrow(0, 0, v[0], v[1], { color: '#2e7d32', width: 2.5 });
        c2d.addText('v', v[0] - 0.35, v[1] - 0.1, { color: '#2e7d32', size: 13, italic: true });

        // u+v (axiom 2)
        const sum = [u[0] + v[0], u[1] + v[1]];
        c2d.addArrow(0, 0, sum[0], sum[1], { color: '#6a1b9a', width: 2.5 });
        c2d.addText('u+v', sum[0] + 0.15, sum[1] + 0.15, { color: '#6a1b9a', size: 13, italic: true });

        // 2u (axiom 3)
        const su = [u[0] * 2, u[1] * 2];
        c2d.addArrow(0, 0, su[0], su[1], { color: '#c62828', width: 2, dash: [4, 3] });
        c2d.addText('2u', su[0] + 0.15, su[1] + 0.15, { color: '#c62828', size: 13, italic: true });

        // Zero vector (axiom 1)
        c2d.addPoint(0, 0, { radius: 7, color: '#e65100' });

        // Legend
        c2d.addText('Axiom 1: 0 ∈ W  (orange dot)', -5.5, 4.3, { color: '#e65100', size: 12 });
        c2d.addText('Axiom 2: u+v ∈ W  (purple)', -5.5, 3.8, { color: '#6a1b9a', size: 12 });
        c2d.addText('Axiom 3: 2u ∈ W  (red dashed)', -5.5, 3.3, { color: '#c62828', size: 12 });
      },
    },

    // ── Step 2: All Subspaces of ℝ² ──────────────────────────────────────────
    {
      title: 'All Subspaces of ℝ²',
      description: 'In ℝ² there are exactly three kinds of subspace: {0}, any line through the origin, and the whole plane. Drag the slider — every angle gives a valid 1D subspace.',
      equation: 'W \\subseteq \\mathbb{R}^2 \\text{ subspace} \\iff W \\in \\bigl\\{\\{\\mathbf{0}\\},\\ \\ell_{\\mathbf{0}},\\ \\mathbb{R}^2\\bigr\\}',
      notes: 'Why must lines pass through 0? Axiom 3 requires 0·v = 0 to be in W for any v ∈ W. So 0 must always belong to W — and a line missing the origin fails Axiom 1 immediately.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'line angle', 0, 180, 1, state.lineAngle,
          v => `${v}°`, v => state.lineAngle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ang = state.lineAngle * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);

        // The 1D subspace line
        c2d.addLine([[-8*dx, -8*dy], [8*dx, 8*dy]], { color: '#1565c0', width: 2.5 });

        // Example vectors on the line
        c2d.addArrow(0, 0,  dx * 2.2,  dy * 2.2, { color: '#1565c0', width: 2 });
        c2d.addArrow(0, 0, -dx * 1.6, -dy * 1.6, { color: '#1565c0', width: 2 });

        // Mark zero
        c2d.addPoint(0, 0, { radius: 6, color: '#1565c0' });

        // Perpendicular label offset so text doesn't sit on the line
        const px = -dy * 0.3, py = dx * 0.3;
        c2d.addText('span(d)', dx * 3.5 + px, dy * 3.5 + py + 0.3, { color: '#1565c0', size: 12 });

        // Classification labels
        c2d.addText('0D: {0} — just the origin', -5.5, 4.3, { color: '#aaa', size: 12 });
        c2d.addText('1D: lines through 0 — rotate the slider', -5.5, 3.8, { color: '#1565c0', size: 12 });
        c2d.addText('2D: all of ℝ² — the full plane', -5.5, 3.3, { color: '#aaa', size: 12 });
      },
    },

    // ── Step 3: Closure Under Addition ────────────────────────────────────────
    {
      title: 'Closure Under Addition',
      description: 'Pick any two vectors on the subspace line. Their sum must also lie on the line. Drag the slider to move u — u + v always lands back on the same line.',
      equation: '\\mathbf{u} = t_1\\mathbf{d},\\quad \\mathbf{v} = t_2\\mathbf{d} \\implies \\mathbf{u}+\\mathbf{v} = (t_1+t_2)\\,\\mathbf{d}',
      notes: 'A line through 0 is {td : t ∈ ℝ}. Adding two elements gives (t₁+t₂)d — still the same form — so the sum is always on the line. The proof is just arithmetic on the parameter.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'position of u  (t₁)', -3, 3, 0.05, state.tU,
          v => v.toFixed(2), v => state.tU = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ang = 35 * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);

        // Subspace line
        c2d.addLine([[-8*dx, -8*dy], [8*dx, 8*dy]], { color: '#1565c0' + '30', width: 1.5, dash: [6, 4] });

        const t1 = state.tU;
        const t2 = -1.8;

        const u   = [dx * t1, dy * t1];
        const v   = [dx * t2, dy * t2];
        const sum = [u[0] + v[0], u[1] + v[1]];

        // v (fixed, green)
        if (Math.abs(t2) > 0.05) {
          c2d.addArrow(0, 0, v[0], v[1], { color: '#2e7d32', width: 2.5 });
          c2d.addText('v', v[0] - 0.4, v[1] - 0.15, { color: '#2e7d32', size: 13, italic: true });
        }

        // u (slider, blue)
        if (Math.abs(t1) > 0.05) {
          c2d.addArrow(0, 0, u[0], u[1], { color: '#1565c0', width: 2.5 });
          c2d.addText('u', u[0] + 0.15, u[1] + 0.2, { color: '#1565c0', size: 13, italic: true });
        }

        // Parallelogram ghost arrows (v translated to tip of u, and vice versa)
        c2d.addArrow(u[0], u[1], sum[0], sum[1], { color: '#2e7d32' + '60', width: 1.5, dash: [4, 3] });
        c2d.addArrow(v[0], v[1], sum[0], sum[1], { color: '#1565c0' + '60', width: 1.5, dash: [4, 3] });

        // u+v (purple)
        c2d.addArrow(0, 0, sum[0], sum[1], { color: '#6a1b9a', width: 2.5 });
        c2d.addPoint(sum[0], sum[1], { radius: 5, color: '#6a1b9a' });

        const offX = dy * 0.35, offY = -dx * 0.35;
        c2d.addText('u+v', sum[0] + offX + 0.1, sum[1] + offY + 0.1, { color: '#6a1b9a', size: 13, italic: true });

        c2d.addText('u+v always stays on the line ✓', -5.5, 4.3, { color: '#6a1b9a', size: 12 });
        c2d.addText(`t₁ = ${t1.toFixed(2)},  t₂ = ${t2.toFixed(2)},  t₁+t₂ = ${(t1+t2).toFixed(2)}`, -5.5, 3.8, { color: '#888', size: 12 });
      },
    },

    // ── Step 4: Closure Under Scalar Multiplication ───────────────────────────
    {
      title: 'Closure Under Scalar Multiplication',
      description: 'Scale any vector on the subspace by any real number. The result stays on the line — negative scalars flip direction, but the vector never leaves the subspace.',
      equation: '\\mathbf{v} = t\\,\\mathbf{d} \\implies c\\mathbf{v} = (ct)\\,\\mathbf{d} \\in W',
      notes: 'A half-plane {y ≥ 0} fails this axiom: the vector (0,1) is inside, but scaling by c = −1 gives (0,−1), which is outside. Any subset bounded in direction cannot be a subspace.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'scalar  c', -3, 3, 0.05, state.scalar,
          v => v.toFixed(2), v => state.scalar = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ang = 35 * Math.PI / 180;
        const dx = Math.cos(ang), dy = Math.sin(ang);

        // Subspace line
        c2d.addLine([[-8*dx, -8*dy], [8*dx, 8*dy]], { color: '#1565c0' + '30', width: 1.5, dash: [6, 4] });

        const t = 1.8;
        const v  = [dx * t, dy * t];
        const c  = state.scalar;
        const cv = [v[0] * c, v[1] * c];

        // v
        c2d.addArrow(0, 0, v[0], v[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('v', v[0] + 0.18, v[1] + 0.2, { color: '#1565c0', size: 13, italic: true });

        // cv
        if (Math.abs(c) > 0.03) {
          c2d.addArrow(0, 0, cv[0], cv[1], { color: '#c62828', width: 2.5 });
          c2d.addPoint(cv[0], cv[1], { radius: 5, color: '#c62828' });
          const offX = dy * 0.35, offY = -dx * 0.35;
          c2d.addText(`cv`, cv[0] + offX + 0.1, cv[1] + offY + 0.1, { color: '#c62828', size: 13, italic: true });
        }

        const sign = c < 0 ? 'negative c — direction flips' : c === 0 ? 'c = 0 → cv = 0 ∈ W' : 'positive c — same direction';
        c2d.addText('cv always stays on the line ✓', -5.5, 4.3, { color: '#c62828', size: 12 });
        c2d.addText(sign, -5.5, 3.8, { color: '#888', size: 12 });
        c2d.addText(`c = ${c.toFixed(2)}`, -5.5, 3.3, { color: '#555', size: 12 });
      },
    },

    // ── Step 5: Span — Generating Subspaces ───────────────────────────────────
    {
      title: 'Span — Generating Subspaces',
      description: 'The span of a set of vectors is the smallest subspace containing them — all possible linear combinations. One vector spans a line; two linearly independent vectors span all of ℝ².',
      equation: '\\operatorname{span}(\\mathbf{v}_1, \\mathbf{v}_2) = \\{\\,c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 : c_1, c_2 \\in \\mathbb{R}\\,\\}',
      notes: 'span is always a subspace: it contains 0 (take c₁=c₂=0), is closed under addition and scaling by construction. If v₁ and v₂ are parallel their span is 1D (a line); if independent it is 2D (= ℝ²).',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();

        // Shade ℝ² to represent span(v₁, v₂)
        c2d.raw((ctx, cam) => {
          ctx.fillStyle = '#e8f4fd';
          ctx.fillRect(0, 0, cam.width, cam.height);
        });

        c2d.addGrid({ spacing: 1, color: '#dde8f0' });
        c2d.addAxes({ color: '#b0c8d8' });

        const v1 = [2, 1];
        const v2 = [-1, 2];

        // span(v₁) — the line through 0 in direction v₁
        const n1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
        const d1 = [v1[0]/n1, v1[1]/n1];
        c2d.addLine([[-8*d1[0], -8*d1[1]], [8*d1[0], 8*d1[1]]], { color: '#1565c0' + '55', width: 1.5, dash: [6, 4] });

        // span(v₂) — the line through 0 in direction v₂
        const n2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1]);
        const d2 = [v2[0]/n2, v2[1]/n2];
        c2d.addLine([[-8*d2[0], -8*d2[1]], [8*d2[0], 8*d2[1]]], { color: '#2e7d32' + '55', width: 1.5, dash: [6, 4] });

        // v₁
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#1565c0', width: 3 });
        c2d.addText('v₁', v1[0] + 0.18, v1[1] + 0.2, { color: '#1565c0', size: 14, italic: true });

        // v₂
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#2e7d32', width: 3 });
        c2d.addText('v₂', v2[0] - 0.45, v2[1] + 0.2, { color: '#2e7d32', size: 14, italic: true });

        // Example combination: v₁ + v₂
        const combo = [v1[0]+v2[0], v1[1]+v2[1]];
        c2d.addArrow(v1[0], v1[1], combo[0], combo[1], { color: '#2e7d32' + '70', width: 1.5, dash: [4,3] });
        c2d.addArrow(v2[0], v2[1], combo[0], combo[1], { color: '#1565c0' + '70', width: 1.5, dash: [4,3] });
        c2d.addArrow(0, 0, combo[0], combo[1], { color: '#6a1b9a', width: 2.5 });
        c2d.addText('v₁+v₂', combo[0] + 0.18, combo[1] + 0.18, { color: '#6a1b9a', size: 12, italic: true });

        // Another combination: 2v₁ − v₂
        const combo2 = [2*v1[0]-v2[0], 2*v1[1]-v2[1]];
        c2d.addArrow(0, 0, combo2[0], combo2[1], { color: '#e65100', width: 2 });
        c2d.addText('2v₁−v₂', combo2[0] + 0.18, combo2[1] - 0.3, { color: '#e65100', size: 12, italic: true });

        // Labels
        c2d.addText('Blue plane = span(v₁, v₂) = ℝ²', -5.5, 4.3, { color: '#1565c0', size: 12 });
        c2d.addText('Dashed lines = span(v₁) and span(v₂)', -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText('v₁, v₂ independent → span fills the plane', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

  ],
};
