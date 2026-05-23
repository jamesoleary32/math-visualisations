// Row Space & Column Space — Linear Algebra
//
// For an m×n matrix A:
//   Col(A) = span of columns; lives in ℝᵐ (output space) = { Ax : x ∈ ℝⁿ }
//   Row(A) = span of rows; lives in ℝⁿ (input space)
//   Null(A) = { x : Ax = 0 }; ⊥ to Row(A) in ℝⁿ
//   rank(A) = dim Col(A) = dim Row(A)   (rank theorem)
//   rank + nullity = n                  (rank-nullity theorem)
//
// Rank-1 matrix A = [[2,1],[4,2]] used throughout steps 2–5:
//   Columns: c₁=[2,4], c₂=[1,2] — c₁=2c₂, so Col(A)=span([1,2])  (line y=2x)
//   Rows:    r₁=[2,1], r₂=[4,2] — r₂=2r₁, so Row(A)=span([2,1])  (line y=0.5x)
//   Null(A): 2x₁+x₂=0 → direction [1,−2]; check: [2,1]·[1,−2]=0 ✓

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `rcs-${Math.random().toString(36).slice(2)}`;
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

function dot(a, b)  { return a[0]*b[0] + a[1]*b[1]; }
function norm(v)    { return Math.sqrt(v[0]*v[0] + v[1]*v[1]); }

// ── Lesson ─────────────────────────────────────────────────────────────────────

export default {
  title:   'Row Space & Column Space',
  subject: 'Linear Algebra',

  initState: () => ({
    bAngleDeg: 63,   // starts near Col(A) angle ≈ 63.4° so b begins "reachable"
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

    // ── Step 1: Column Space — full rank ──────────────────────────────────────
    {
      title: 'Column Space — What Can A Output?',
      description: 'Each column of $A$ is the image of a standard basis vector: $A\\mathbf{e}_1 = \\mathbf{c}_1$, $A\\mathbf{e}_2 = \\mathbf{c}_2$. The column space is the span of those images — every vector $A\\mathbf{x}$ can ever produce. When the columns are independent the span is all of $\\mathbb{R}^2$.',
      equation: `\\operatorname{Col}(A) = \\operatorname{span}(\\mathbf{c}_1, \\mathbf{c}_2) = \\bigl\\{\\,x_1\\mathbf{c}_1 + x_2\\mathbf{c}_2 : x_1,x_2 \\in \\mathbb{R}\\,\\bigr\\}`,
      notes: '$A = \\left(\\begin{smallmatrix}2&1\\\\1&2\\end{smallmatrix}\\right)$. Columns $\\mathbf{c}_1=[2,1]^\\top$ and $\\mathbf{c}_2=[1,2]^\\top$ point in independent directions, so their span fills the plane. For any target $\\mathbf{b}$, the system $A\\mathbf{x}=\\mathbf{b}$ is solvable. This is a rank-2 matrix — full rank.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();

        // Shade ℝ² — Col(A) = full plane
        c2d.raw((ctx, cam) => {
          ctx.fillStyle = '#e8f4fd';
          ctx.fillRect(0, 0, cam.width, cam.height);
        });

        c2d.addGrid({ spacing: 1, color: '#dde8f0' });
        c2d.addAxes({ color: '#b0c8d8' });

        // Standard basis (faint dashed lines — e₁ and e₂ map to the columns)
        c2d.addLine([[0,0],[1,0]], { color: '#1565c080', width: 1.5, dash: [5,4] });
        c2d.addLine([[0,0],[0,1]], { color: '#2e7d3280', width: 1.5, dash: [5,4] });
        c2d.addText('e₁', 1.06, 0.14, { color: '#1565c070', size: 11, italic: true });
        c2d.addText('e₂', 0.09, 1.14, { color: '#2e7d3270', size: 11, italic: true });

        // Column 1: c₁ = Ae₁ = [2,1]
        c2d.addArrow(0, 0, 2, 1, { color: '#1565c0', width: 3 });
        c2d.addText('c₁=[2,1]', 2.14, 1.18, { color: '#1565c0', size: 12 });

        // Column 2: c₂ = Ae₂ = [1,2]
        c2d.addArrow(0, 0, 1, 2, { color: '#2e7d32', width: 3 });
        c2d.addText('c₂=[1,2]', 1.14, 2.22, { color: '#2e7d32', size: 12 });

        c2d.addText('Col(A) = all of ℝ²  (blue fill)', -5.5, 4.3, { color: '#1565c0', size: 12 });
        c2d.addText('A = [[2,1],[1,2]]  —  rank 2', -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText('c₁ ∦ c₂  →  span fills the plane', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 2: Column space collapses — rank 1 ───────────────────────────────
    {
      title: 'Column Space Collapse — Rank 1',
      description: 'When $A$ has rank 1 its columns are all parallel — they all land on a single line through the origin. Now $\\operatorname{Col}(A)$ is just that 1D line: only targets $\\mathbf{b}$ lying on it can be reached by $A\\mathbf{x}=\\mathbf{b}$. Drag to see which $\\mathbf{b}$ are reachable.',
      equation: `A = \\begin{pmatrix}2&1\\\\4&2\\end{pmatrix},\\quad \\mathbf{c}_1 = 2\\mathbf{c}_2 \\implies \\operatorname{Col}(A) = \\operatorname{span}\\!\\begin{pmatrix}1\\\\2\\end{pmatrix}`,
      notes: 'Drag $\\mathbf{b}$ around the full circle. Only when $\\mathbf{b}$ points along the line $y=2x$ does $A\\mathbf{x}=\\mathbf{b}$ have a solution. Everywhere else: no matter what $\\mathbf{x}$ you choose, $A\\mathbf{x}$ always falls on the same line and misses $\\mathbf{b}$ completely.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'target b (angle)', 0, 360, 1, state.bAngleDeg,
          v => `${v}°`, v => state.bAngleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const sq5 = Math.sqrt(5);
        const cd  = [1/sq5, 2/sq5];   // Col(A) unit direction

        // Column space line
        c2d.addLine([[-6.5*cd[0], -6.5*cd[1]], [6.5*cd[0], 6.5*cd[1]]],
          { color: '#1565c0', width: 2.5 });

        // Both column vectors land on the line
        c2d.addArrow(0, 0, 2, 4, { color: '#1565c0', width: 2.5 });
        c2d.addText('c₁=[2,4]', 2.14, 4.18, { color: '#1565c0', size: 11 });
        c2d.addArrow(0, 0, 1, 2, { color: '#1565c0', width: 2 });
        c2d.addText('c₂=[1,2]', 1.14, 2.22, { color: '#1565c0', size: 11 });

        // Target b
        const ang  = state.bAngleDeg * Math.PI / 180;
        const bLen = 3.2;
        const b    = [Math.cos(ang)*bLen, Math.sin(ang)*bLen];

        // Project b onto Col(A) and measure residual
        const t     = dot(b, cd);
        const bProj = [cd[0]*t, cd[1]*t];
        const inCS  = norm([b[0]-bProj[0], b[1]-bProj[1]]) < 0.22;

        const bCol = inCS ? '#2e7d32' : '#c62828';
        c2d.addArrow(0, 0, b[0], b[1], { color: bCol, width: 2.5 });
        c2d.addText('b', b[0]+0.2, b[1]+0.2, { color: bCol, size: 13, italic: true });

        if (!inCS) {
          // Gap from projection to b shows b is off the column space
          c2d.addLine([[bProj[0], bProj[1]], [b[0], b[1]]],
            { color: '#c62828', width: 1.5, dash: [4,3] });
          c2d.addPoint(bProj[0], bProj[1], { radius: 4, color: '#c62828' });
        }

        c2d.addText('Col(A) = line  y = 2x  (in output ℝ²)', -5.5, 4.3, { color: '#1565c0', size: 12 });
        c2d.addText(
          inCS ? 'b ∈ Col(A) — Ax = b is solvable ✓' : 'b ∉ Col(A) — Ax = b has no solution ✗',
          -5.5, 3.8, { color: bCol, size: 12 });
        c2d.addText('Rotate b — it can only land on the blue line', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 3: Row Space ─────────────────────────────────────────────────────
    {
      title: 'Row Space — Living in the Input',
      description: 'The row space is the span of the rows, treated as vectors in the input space. For the same rank-1 matrix both rows are parallel, so $\\operatorname{Row}(A)$ is also 1D — but this line lives in $\\mathbb{R}^2$ as a subspace of where $\\mathbf{x}$ lives, not where $A\\mathbf{x}$ lands.',
      equation: `\\operatorname{Row}(A) = \\operatorname{span}\\!\\begin{pmatrix}2\\\\1\\end{pmatrix} \\subset \\mathbb{R}^n \\quad(\\text{input space})`,
      notes: '$\\operatorname{Col}(A)$ and $\\operatorname{Row}(A)$ live in different spaces: $\\operatorname{Col}(A)$ is in the output $\\mathbb{R}^2$ (where $A\\mathbf{x}$ lands), $\\operatorname{Row}(A)$ is in the input $\\mathbb{R}^2$ (where $\\mathbf{x}$ lives). Both are 1D because $\\operatorname{rank}(A)=1$. The rank theorem guarantees their dimensions always match.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const sq5 = Math.sqrt(5);
        const rd  = [2/sq5, 1/sq5];   // Row(A) unit direction

        // Row space line
        c2d.addLine([[-7*rd[0], -7*rd[1]], [7*rd[0], 7*rd[1]]],
          { color: '#6a1b9a', width: 2.5 });

        // Row vectors (both parallel)
        c2d.addArrow(0, 0, 2, 1, { color: '#6a1b9a', width: 2.5 });
        c2d.addText('r₁=[2,1]', 2.14, 1.18, { color: '#6a1b9a', size: 11 });
        c2d.addArrow(0, 0, 4, 2, { color: '#6a1b9a', width: 2 });
        c2d.addText('r₂=[4,2]', 4.14, 2.18, { color: '#6a1b9a', size: 11 });

        c2d.addText('Row(A) = line  y = 0.5x  (in input ℝ²)', -5.5, 4.3, { color: '#6a1b9a', size: 12 });
        c2d.addText('A = [[2,1],[4,2]]  —  rank 1', -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText('r₂ = 2r₁  →  row space is 1D, rank unchanged', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 4: Null Space ⊥ Row Space ───────────────────────────────────────
    {
      title: 'Null Space is Orthogonal to Row Space',
      description: 'The null space — all $\\mathbf{x}$ where $A\\mathbf{x}=\\mathbf{0}$ — is always perpendicular to the row space. Every input $\\mathbf{x}$ splits into a row-space component (which $A$ maps to output) and a null-space component (which $A$ sends to zero). Drag to explore.',
      equation: `\\operatorname{Null}(A) \\perp \\operatorname{Row}(A)\\qquad \\mathbf{x} = \\underbrace{\\mathbf{x}_{\\text{row}}}_{A\\text{ sees}} + \\underbrace{\\mathbf{x}_{\\text{null}}}_{A\\mathbf{x}_{\\text{null}}=\\mathbf{0}}`,
      notes: 'For $A = \\left(\\begin{smallmatrix}2&1\\\\4&2\\end{smallmatrix}\\right)$, $A\\mathbf{x}=\\mathbf{0}$ gives $2x_1+x_2=0$, so $\\operatorname{Null}(A)=\\operatorname{span}([1,-2]^\\top)$. Orthogonality check: $[2,1]\\cdot[1,-2]=2-2=0$ ✓. The purple arrow is what $A$ acts on; the red arrow is $A$\'s blind spot.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'input x (angle)', 0, 360, 1, state.xAngleDeg,
          v => `${v}°`, v => state.xAngleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const sq5 = Math.sqrt(5);
        const rd  = [2/sq5,  1/sq5];    // Row(A) direction
        const nd  = [1/sq5, -2/sq5];   // Null(A) direction

        // Faint guide lines for the two subspaces
        c2d.addLine([[-6.5*rd[0], -6.5*rd[1]], [6.5*rd[0], 6.5*rd[1]]],
          { color: '#6a1b9a50', width: 1.5, dash: [6,4] });
        c2d.addLine([[-6.5*nd[0], -6.5*nd[1]], [6.5*nd[0], 6.5*nd[1]]],
          { color: '#c6282850', width: 1.5, dash: [6,4] });

        // Right-angle marker at origin
        const rk = 0.42;
        const rm = [rd[0]*rk + nd[0]*rk, rd[1]*rk + nd[1]*rk];
        c2d.addLine([[rd[0]*rk, rd[1]*rk], rm], { color: '#aaa', width: 1 });
        c2d.addLine([[nd[0]*rk, nd[1]*rk], rm], { color: '#aaa', width: 1 });

        // Input x
        const ang  = state.xAngleDeg * Math.PI / 180;
        const xLen = 3;
        const x    = [Math.cos(ang)*xLen, Math.sin(ang)*xLen];

        // Decompose: x = x_row + x_null
        const tr    = dot(x, rd);
        const tn    = dot(x, nd);
        const xRow  = [rd[0]*tr,  rd[1]*tr];
        const xNull = [nd[0]*tn,  nd[1]*tn];

        // Parallelogram construction lines
        c2d.addLine([[xRow[0], xRow[1]], [x[0], x[1]]], { color: '#c6282860', width: 1.5, dash: [4,3] });
        c2d.addLine([[xNull[0], xNull[1]], [x[0], x[1]]], { color: '#6a1b9a60', width: 1.5, dash: [4,3] });

        // x_row (purple) — what A acts on
        if (Math.abs(tr) > 0.08) {
          c2d.addArrow(0, 0, xRow[0], xRow[1], { color: '#6a1b9a', width: 2.5 });
          c2d.addText('x_row', xRow[0]+0.16, xRow[1]-0.3, { color: '#6a1b9a', size: 11 });
        }

        // x_null (red) — A's blind spot
        if (Math.abs(tn) > 0.08) {
          c2d.addArrow(0, 0, xNull[0], xNull[1], { color: '#c62828', width: 2.5 });
          c2d.addText('x_null', xNull[0]+0.16, xNull[1]+0.2, { color: '#c62828', size: 11 });
        }

        // Full x (dark)
        c2d.addArrow(0, 0, x[0], x[1], { color: '#333', width: 2.5 });
        c2d.addText('x', x[0]+0.18, x[1]+0.2, { color: '#333', size: 13, italic: true });

        c2d.addText('Row(A) — purple  (A sees this part)', -5.5, 4.3, { color: '#6a1b9a', size: 12 });
        c2d.addText('Null(A) — red  (A sends this part to 0)', -5.5, 3.8, { color: '#c62828', size: 12 });
        c2d.addText(`x_null = ${tn.toFixed(2)}·[1,−2]  →  Ax_null = 0`, -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 5: Rank theorem & rank-nullity ───────────────────────────────────
    {
      title: 'Rank Theorem & Rank-Nullity',
      description: 'The row rank always equals the column rank. It means "what $A$ can output" and "what $A$ acts on in the input" always have the same dimension. Rank-nullity then accounts for the leftover: the null space absorbs whatever rank is missing.',
      equation: `\\underbrace{\\dim \\operatorname{Col}(A)}_{\\text{rank}} = \\underbrace{\\dim \\operatorname{Row}(A)}_{\\text{rank}} \\qquad \\dim \\operatorname{Null}(A) + \\operatorname{rank}(A) = n`,
      notes: 'For $A = \\left(\\begin{smallmatrix}2&1\\\\4&2\\end{smallmatrix}\\right)$ ($n=2$, rank $=1$): $\\operatorname{Col}(A)$ is 1D, $\\operatorname{Row}(A)$ is 1D, $\\operatorname{Null}(A)$ is 1D. Rank-nullity: $1+1=2=n$ ✓. For a full-rank $2\\times 2$ matrix (rank $=2$): $\\operatorname{Col}=\\operatorname{Row}=\\mathbb{R}^2$, $\\operatorname{Null}=\\{\\mathbf{0}\\}$, $0+2=2$ ✓.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const sq5 = Math.sqrt(5);
        const cd  = [1/sq5,  2/sq5];   // Col(A) direction (output)
        const rd  = [2/sq5,  1/sq5];   // Row(A) direction (input)
        const nd  = [1/sq5, -2/sq5];   // Null(A) direction (input)

        // Col(A) — blue, output space
        c2d.addLine([[-5.5*cd[0], -5.5*cd[1]], [5.5*cd[0], 5.5*cd[1]]], { color: '#1565c0', width: 2 });
        c2d.addArrow(0, 0, cd[0]*2.5, cd[1]*2.5, { color: '#1565c0', width: 2.5 });
        c2d.addText('Col(A) — 1D (output)', cd[0]*2.65+0.1, cd[1]*2.65, { color: '#1565c0', size: 12 });

        // Row(A) — purple, input space
        c2d.addLine([[-5.5*rd[0], -5.5*rd[1]], [5.5*rd[0], 5.5*rd[1]]], { color: '#6a1b9a', width: 2 });
        c2d.addArrow(0, 0, rd[0]*2.5, rd[1]*2.5, { color: '#6a1b9a', width: 2.5 });
        c2d.addText('Row(A) — 1D (input)', rd[0]*2.65+0.1, rd[1]*2.65+0.22, { color: '#6a1b9a', size: 12 });

        // Null(A) — red, input space
        c2d.addLine([[-5.5*nd[0], -5.5*nd[1]], [5.5*nd[0], 5.5*nd[1]]], { color: '#c62828', width: 2, dash: [6,4] });
        c2d.addArrow(0, 0, nd[0]*2.5, nd[1]*2.5, { color: '#c62828', width: 2.5 });
        c2d.addText('Null(A) — 1D (input)', nd[0]*2.65+0.1, nd[1]*2.65-0.22, { color: '#c62828', size: 12 });

        // Right-angle marker between Row and Null
        const rk = 0.44;
        const rm = [rd[0]*rk + nd[0]*rk, rd[1]*rk + nd[1]*rk];
        c2d.addLine([[rd[0]*rk, rd[1]*rk], rm], { color: '#999', width: 1 });
        c2d.addLine([[nd[0]*rk, nd[1]*rk], rm], { color: '#999', width: 1 });

        c2d.addText('dim(Col) = dim(Row) = rank = 1  ✓', -5.5, 4.3, { color: '#555', size: 12 });
        c2d.addText('rank + nullity = 1 + 1 = 2 = n  ✓', -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText('Row(A) ⊥ Null(A)  (right-angle marker)', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

  ],
};
