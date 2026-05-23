// Two Ways to Read Ax — Linear Algebra
//
// Matrix-vector multiplication Ax has two equivalent interpretations:
//
//   Column picture:  Ax = x₁c₁ + x₂c₂        (linear combination of columns)
//     → output lives in Col(A) by construction
//
//   Row picture:     (Ax)ᵢ = rᵢ·x             (each row dot-products with x)
//     → output depends only on how x projects onto each row
//     → if x ⊥ rᵢ, the i-th output is zero
//     → if x ∈ Null(A), all rows return zero: Ax = 0
//
// Steps 1–3 use A = [[2,1],[1,2]] (rank 2, independent rows/columns).
// Steps 4–5 use A = [[2,1],[4,2]] (rank 1, parallel rows) to show the blind spot.

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `axv-${Math.random().toString(36).slice(2)}`;
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

function dot(a, b)    { return a[0]*b[0] + a[1]*b[1]; }
function norm(v)      { return Math.sqrt(v[0]*v[0] + v[1]*v[1]); }
function scl(v, s)    { return [v[0]*s, v[1]*s]; }
function add2(a, b)   { return [a[0]+b[0], a[1]+b[1]]; }

// ── Lesson ─────────────────────────────────────────────────────────────────────

export default {
  title:   'Two Ways to Read Ax',
  subject: 'Linear Algebra',

  initState: () => ({
    x1: 1.2,
    x2: 1.5,
    xAngleDeg: 50,
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

    // ── Step 1: Column Picture ─────────────────────────────────────────────────
    {
      title: 'The Column Picture',
      description: '$A\\mathbf{x}$ is a weighted sum of the columns of $A$, with the entries of $\\mathbf{x}$ as weights. Drag $x_1$ and $x_2$ — the blue and green arrows scale with each weight, and the purple result is always their sum.',
      equation: `\\begin{aligned}
        A\\mathbf{x} &= x_1\\mathbf{c}_1 + x_2\\mathbf{c}_2 \\\\[6pt]
        &= x_1\\begin{pmatrix}2\\\\1\\end{pmatrix} + x_2\\begin{pmatrix}1\\\\2\\end{pmatrix}
      \\end{aligned}`,
      notes: 'The output $A\\mathbf{x}$ is literally assembled from the columns — so it must live in $\\operatorname{Col}(A)$. That is why $\\operatorname{Col}(A)$ is the output space: no matter what $\\mathbf{x}$ you choose, the result is always some combination of the same two columns.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'x₁', -2.5, 2.5, 0.05, state.x1,
          v => v.toFixed(2), v => state.x1 = v);
        addSlider(state._controls, 'x₂', -2.5, 2.5, 0.05, state.x2,
          v => v.toFixed(2), v => state.x2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // A = [[2,1],[1,2]] — columns
        const col1 = [2, 1];
        const col2 = [1, 2];
        const s1   = scl(col1, state.x1);       // x1 * c1
        const s2   = scl(col2, state.x2);       // x2 * c2
        const ax   = add2(s1, s2);              // Ax = x1c1 + x2c2

        // Faint column direction guides
        c2d.addLine([[0,0], scl(col1, 3.5)], { color: '#1565c030', width: 1.5, dash: [5,4] });
        c2d.addLine([[0,0], scl(col2, 3.5)], { color: '#2e7d3230', width: 1.5, dash: [5,4] });
        c2d.addText('c₁', col1[0]*3.6, col1[1]*3.6, { color: '#1565c050', size: 11, italic: true });
        c2d.addText('c₂', col2[0]*3.6+0.1, col2[1]*3.6, { color: '#2e7d3250', size: 11, italic: true });

        // x1*c1 (blue)
        if (Math.abs(state.x1) > 0.05) {
          c2d.addArrow(0, 0, s1[0], s1[1], { color: '#1565c0', width: 2.5 });
          c2d.addText('x₁c₁', s1[0]+0.18, s1[1]+0.18, { color: '#1565c0', size: 11 });
        }

        // x2*c2 (green)
        if (Math.abs(state.x2) > 0.05) {
          c2d.addArrow(0, 0, s2[0], s2[1], { color: '#2e7d32', width: 2.5 });
          c2d.addText('x₂c₂', s2[0]+0.18, s2[1]+0.18, { color: '#2e7d32', size: 11 });
        }

        // Parallelogram construction (dashed)
        c2d.addLine([[s1[0], s1[1]], [ax[0], ax[1]]], { color: '#2e7d3270', width: 1.5, dash: [4,3] });
        c2d.addLine([[s2[0], s2[1]], [ax[0], ax[1]]], { color: '#1565c070', width: 1.5, dash: [4,3] });

        // Ax (purple result)
        c2d.addArrow(0, 0, ax[0], ax[1], { color: '#6a1b9a', width: 3 });
        c2d.addPoint(ax[0], ax[1], { radius: 5, color: '#6a1b9a' });
        c2d.addText('Ax', ax[0]+0.2, ax[1]+0.2, { color: '#6a1b9a', size: 13, italic: true });

        c2d.addText(`x₁ = ${state.x1.toFixed(2)},  x₂ = ${state.x2.toFixed(2)}`, -5.5, 4.3, { color: '#555', size: 12 });
        c2d.addText(`Ax = [${ax[0].toFixed(2)}, ${ax[1].toFixed(2)}]`, -5.5, 3.8, { color: '#6a1b9a', size: 12 });
        c2d.addText('Blue + Green  (tip-to-tail)  →  Purple', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 2: Row Picture ────────────────────────────────────────────────────
    {
      title: 'The Row Picture',
      description: 'The same product $A\\mathbf{x}$, read differently: each output component is one row\'s dot product with $\\mathbf{x}$. Drag $\\mathbf{x}$ — the dashed line shows each row\'s projection onto $\\mathbf{x}$, and the dot product value is the output component.',
      equation: `A\\mathbf{x} = \\begin{pmatrix}\\mathbf{r}_1^\\top\\mathbf{x}\\\\[4pt]\\mathbf{r}_2^\\top\\mathbf{x}\\end{pmatrix} = \\begin{pmatrix}2x_1+x_2\\\\x_1+2x_2\\end{pmatrix}`,
      notes: 'The dot product $\\mathbf{r}_i^\\top\\mathbf{x} = |\\mathbf{r}_i||\\mathbf{x}|\\cos\\theta$ measures how much $\\mathbf{x}$ points in row $i$\'s direction. Each row is a linear functional — a "question" applied to the input. When $\\mathbf{x}\\perp\\mathbf{r}_i$, that output component is exactly zero.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'direction of x (angle)', 0, 360, 1, state.xAngleDeg,
          v => `${v}°`, v => state.xAngleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // A = [[2,1],[1,2]] — rows
        const r1 = [2, 1];
        const r2 = [1, 2];

        const ang = state.xAngleDeg * Math.PI / 180;
        const x   = [Math.cos(ang)*2.5, Math.sin(ang)*2.5];

        const d1 = dot(x, r1);
        const d2 = dot(x, r2);

        // Projection of x onto r1 direction
        const r1n2  = dot(r1, r1);
        const r2n2  = dot(r2, r2);
        const proj1 = scl(r1, d1 / r1n2);
        const proj2 = scl(r2, d2 / r2n2);

        // Row vectors
        c2d.addArrow(0, 0, r1[0], r1[1], { color: '#c62828', width: 2.5 });
        c2d.addText('r₁=[2,1]', r1[0]+0.15, r1[1]+0.2, { color: '#c62828', size: 11 });
        c2d.addArrow(0, 0, r2[0], r2[1], { color: '#e65100', width: 2.5 });
        c2d.addText('r₂=[1,2]', r2[0]+0.15, r2[1]+0.2, { color: '#e65100', size: 11 });

        // x
        c2d.addArrow(0, 0, x[0], x[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('x', x[0]+0.2, x[1]+0.2, { color: '#1565c0', size: 13, italic: true });

        // Projection of x onto r1 (red dashed foot)
        c2d.addLine([[0,0],[proj1[0],proj1[1]]], { color: '#c62828', width: 2, dash: [4,3] });
        c2d.addLine([[proj1[0],proj1[1]],[x[0],x[1]]], { color: '#c6282850', width: 1, dash: [3,3] });
        c2d.addPoint(proj1[0], proj1[1], { radius: 4, color: '#c62828' });

        // Projection of x onto r2 (orange dashed foot)
        c2d.addLine([[0,0],[proj2[0],proj2[1]]], { color: '#e65100', width: 2, dash: [4,3] });
        c2d.addLine([[proj2[0],proj2[1]],[x[0],x[1]]], { color: '#e6510050', width: 1, dash: [3,3] });
        c2d.addPoint(proj2[0], proj2[1], { radius: 4, color: '#e65100' });

        c2d.addText(`r₁·x = ${d1.toFixed(2)}  →  output component 1`, -5.5, 4.3, { color: '#c62828', size: 12 });
        c2d.addText(`r₂·x = ${d2.toFixed(2)}  →  output component 2`, -5.5, 3.8, { color: '#e65100', size: 12 });
        c2d.addText(`Ax = [${d1.toFixed(2)}, ${d2.toFixed(2)}]`, -5.5, 3.3, { color: '#6a1b9a', size: 12 });
      },
    },

    // ── Step 3: Rows as Questions ──────────────────────────────────────────────
    {
      title: 'Rows as Questions',
      description: 'Each row is a question: "how much of $\\mathbf{x}$ points in my direction?" The dot product is the answer. Rotate $\\mathbf{x}$ past the perpendicular of each row — that output component hits zero. Two rows in the same direction ask the same question.',
      equation: `(A\\mathbf{x})_i = 0 \\iff \\mathbf{x} \\perp \\mathbf{r}_i`,
      notes: 'The dashed lines show each row\'s perpendicular complement — the directions it cannot hear. For a full-rank matrix the two rows ask independent questions (different perpendiculars), so there\'s no single direction both miss. When rows become parallel, their perpendiculars coincide: that shared blind spot is the null space.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'direction of x (angle)', 0, 360, 1, state.xAngleDeg,
          v => `${v}°`, v => state.xAngleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const r1 = [2, 1];
        const r2 = [1, 2];

        const r1n = norm(r1);
        const r2n = norm(r2);
        const r1u = [r1[0]/r1n, r1[1]/r1n];
        const r2u = [r2[0]/r2n, r2[1]/r2n];

        // Perpendicular to each row (the "deaf" direction for that row)
        const r1perp = [-r1u[1], r1u[0]];
        const r2perp = [-r2u[1], r2u[0]];

        // Draw perpendicular lines
        c2d.addLine([scl(r1perp,-5.5), scl(r1perp,5.5)], { color: '#c6282835', width: 2, dash: [6,4] });
        c2d.addLine([scl(r2perp,-5.5), scl(r2perp,5.5)], { color: '#e6510035', width: 2, dash: [6,4] });

        // Row vectors
        c2d.addArrow(0, 0, r1[0], r1[1], { color: '#c62828', width: 2.5 });
        c2d.addText('r₁', r1[0]+0.15, r1[1]+0.2, { color: '#c62828', size: 12, italic: true });
        c2d.addArrow(0, 0, r2[0], r2[1], { color: '#e65100', width: 2.5 });
        c2d.addText('r₂', r2[0]+0.15, r2[1]+0.2, { color: '#e65100', size: 12, italic: true });

        // x
        const ang = state.xAngleDeg * Math.PI / 180;
        const x   = [Math.cos(ang)*2.5, Math.sin(ang)*2.5];
        c2d.addArrow(0, 0, x[0], x[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('x', x[0]+0.2, x[1]+0.2, { color: '#1565c0', size: 13, italic: true });

        const d1 = dot(x, r1);
        const d2 = dot(x, r2);
        const zero1 = Math.abs(d1) < 0.25;
        const zero2 = Math.abs(d2) < 0.25;

        c2d.addText(
          zero1 ? 'x ⊥ r₁ → row 1 hears nothing  (output₁ = 0) ✓'
                : `row 1 hears ${d1.toFixed(2)}`,
          -5.5, 4.3, { color: zero1 ? '#c62828' : '#bbb', size: 12 });

        c2d.addText(
          zero2 ? 'x ⊥ r₂ → row 2 hears nothing  (output₂ = 0) ✓'
                : `row 2 hears ${d2.toFixed(2)}`,
          -5.5, 3.8, { color: zero2 ? '#e65100' : '#bbb', size: 12 });

        c2d.addText('Dashed = each row\'s deaf direction', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 4: The Blind Spot — Null Space ───────────────────────────────────
    {
      title: 'The Blind Spot',
      description: 'Switch to a rank-1 matrix: $\\mathbf{r}_2 = 2\\mathbf{r}_1$. Both rows ask the same question — their deaf directions coincide. That shared perpendicular is the null space: a direction the entire matrix cannot detect.',
      equation: `A = \\begin{pmatrix}2&1\\\\4&2\\end{pmatrix},\\quad \\mathbf{r}_2 = 2\\mathbf{r}_1 \\implies \\operatorname{Null}(A) = \\operatorname{span}\\!\\begin{pmatrix}1\\\\-2\\end{pmatrix}`,
      notes: 'Drag $\\mathbf{x}$ toward the null direction $[1,-2]^\\top$. Both dot products approach zero simultaneously — no row can distinguish $\\mathbf{x}$ from $\\mathbf{0}$. This is why $A(\\mathbf{x}+\\mathbf{n}) = A\\mathbf{x}$ for any $\\mathbf{n}\\in\\operatorname{Null}(A)$: the null component is genuinely invisible.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'direction of x (angle)', 0, 360, 1, state.xAngleDeg,
          v => `${v}°`, v => state.xAngleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // A = [[2,1],[4,2]]: rows r1=[2,1], r2=[4,2]
        // Null direction: [1,-2]/√5
        const sq5     = Math.sqrt(5);
        const rowDir  = [2/sq5,  1/sq5];   // direction of both rows
        const nullDir = [1/sq5, -2/sq5];   // perpendicular to both

        // Both rows' deaf direction = the null line
        c2d.addLine([scl(nullDir,-6), scl(nullDir,6)], { color: '#c62828', width: 2, dash: [6,4] });

        // Row space line (faint)
        c2d.addLine([scl(rowDir,-6), scl(rowDir,6)], { color: '#6a1b9a30', width: 1.5, dash: [5,4] });

        // Right-angle marker between row and null
        const rk = 0.44;
        const rm = [rowDir[0]*rk + nullDir[0]*rk, rowDir[1]*rk + nullDir[1]*rk];
        c2d.addLine([[rowDir[0]*rk, rowDir[1]*rk], rm], { color: '#aaa', width: 1 });
        c2d.addLine([[nullDir[0]*rk, nullDir[1]*rk], rm], { color: '#aaa', width: 1 });

        // Row vectors (both parallel)
        c2d.addArrow(0, 0, 2, 1, { color: '#c62828', width: 2.5 });
        c2d.addText('r₁=[2,1]', 2.15, 1.2, { color: '#c62828', size: 11 });
        c2d.addArrow(0, 0, 4, 2, { color: '#c62828', width: 2 });
        c2d.addText('r₂=2r₁', 4.12, 2.18, { color: '#c62828', size: 11 });

        // x
        const ang = state.xAngleDeg * Math.PI / 180;
        const x   = [Math.cos(ang)*2.8, Math.sin(ang)*2.8];
        c2d.addArrow(0, 0, x[0], x[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('x', x[0]+0.2, x[1]+0.2, { color: '#1565c0', size: 13, italic: true });

        // Dot products with r1 and r2
        const r1 = [2, 1];
        const r2 = [4, 2];
        const d1 = dot(x, r1);
        const d2 = dot(x, r2);
        const inNull = Math.abs(dot(x, rowDir)) < 0.18;

        c2d.addText(`r₁·x = ${d1.toFixed(2)}   r₂·x = ${d2.toFixed(2)}  (≈ 2×)`, -5.5, 4.3, { color: '#c62828', size: 12 });
        c2d.addText(
          inNull ? 'x ∈ Null(A) — both rows hear nothing, Ax = 0 ✓'
                 : 'Both rows give the same answer — only one independent question',
          -5.5, 3.8, { color: inNull ? '#2e7d32' : '#888', size: 12 });
        c2d.addText('Red dashed = null space = deaf direction for all rows', -5.5, 3.3, { color: '#c62828', size: 12 });
      },
    },

    // ── Step 5: Why Col = Output, Row = Input ─────────────────────────────────
    {
      title: 'Two Pictures — Two Subspaces',
      description: 'The column picture makes $\\operatorname{Col}(A)$ obvious: every output is built from the columns, so outputs can\'t escape their span. The row picture makes $\\operatorname{Row}(A)$ obvious: outputs depend only on how $\\mathbf{x}$ projects onto the rows, so the null component of $\\mathbf{x}$ is genuinely lost.',
      equation: `\\underbrace{A\\mathbf{x} = x_1\\mathbf{c}_1+x_2\\mathbf{c}_2}_{\\text{output} \\in \\operatorname{Col}(A)} \\qquad \\underbrace{(A\\mathbf{x})_i = \\mathbf{r}_i^\\top\\mathbf{x}}_{\\text{input via }\\operatorname{Row}(A)}`,
      notes: 'Neither picture is more fundamental — they are two views of the same linear map. But each picture makes one space inevitable: you cannot tell the column story without Col(A) appearing, and you cannot tell the row story without Row(A) and Null(A) appearing. This is why those spaces matter.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Using rank-1 matrix A = [[2,1],[4,2]] to show all three spaces clearly
        const sq5     = Math.sqrt(5);
        const colDir  = [1/sq5,  2/sq5];   // Col(A)  direction [1,2]
        const rowDir  = [2/sq5,  1/sq5];   // Row(A)  direction [2,1]
        const nullDir = [1/sq5, -2/sq5];   // Null(A) direction [1,-2]

        // Col(A) — blue, output space
        c2d.addLine([scl(colDir,-5.5), scl(colDir,5.5)], { color: '#1565c0', width: 2 });
        c2d.addArrow(0, 0, 2, 4, { color: '#1565c0', width: 2.5 });
        c2d.addText('c₁=[2,4]', 2.15, 4.18, { color: '#1565c0', size: 11 });
        c2d.addArrow(0, 0, 1, 2, { color: '#1565c0', width: 2 });
        c2d.addText('c₂=[1,2]', 1.12, 2.22, { color: '#1565c0', size: 11 });
        c2d.addText('Col(A)', colDir[0]*5.7, colDir[1]*5.7, { color: '#1565c0', size: 12 });

        // Row(A) — purple, input space
        c2d.addLine([scl(rowDir,-5.5), scl(rowDir,5.5)], { color: '#6a1b9a', width: 2 });
        c2d.addArrow(0, 0, 2, 1, { color: '#6a1b9a', width: 2.5 });
        c2d.addText('r₁=[2,1]', 2.15, 1.18, { color: '#6a1b9a', size: 11 });
        c2d.addText('Row(A)', rowDir[0]*5.7+0.1, rowDir[1]*5.7+0.22, { color: '#6a1b9a', size: 12 });

        // Null(A) — red, input space
        c2d.addLine([scl(nullDir,-5.5), scl(nullDir,5.5)], { color: '#c62828', width: 2, dash: [6,4] });
        c2d.addArrow(0, 0, nullDir[0]*2.2, nullDir[1]*2.2, { color: '#c62828', width: 2.5 });
        c2d.addText('Null(A)', nullDir[0]*2.5+0.1, nullDir[1]*2.5-0.25, { color: '#c62828', size: 12 });

        // Right-angle marker Row ⊥ Null
        const rk = 0.44;
        const rm = [rowDir[0]*rk + nullDir[0]*rk, rowDir[1]*rk + nullDir[1]*rk];
        c2d.addLine([[rowDir[0]*rk, rowDir[1]*rk], rm], { color: '#999', width: 1 });
        c2d.addLine([[nullDir[0]*rk, nullDir[1]*rk], rm], { color: '#999', width: 1 });

        c2d.addText('Blue  — column picture → Col(A) = output space', -5.5, 4.3, { color: '#1565c0', size: 12 });
        c2d.addText('Purple — row picture → Row(A) = detectable input', -5.5, 3.8, { color: '#6a1b9a', size: 12 });
        c2d.addText('Red  — null space = lost input, Row(A) ⊥ Null(A)', -5.5, 3.3, { color: '#c62828', size: 12 });
      },
    },

  ],
};
