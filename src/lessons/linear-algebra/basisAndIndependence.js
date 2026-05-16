// Linear Independence, Span & Basis — Linear Algebra
//
// Vectors v₁…vₖ are linearly independent if the only solution to
//   c₁v₁ + … + cₖvₖ = 0  is  c₁ = … = cₖ = 0.
//
// The span of a set is the subspace of all linear combinations.
// A basis is a linearly independent set whose span is the whole space.
// Coordinates express any vector uniquely in terms of a basis.

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `bas-${Math.random().toString(36).slice(2)}`;
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
  title:   'Basis, Span & Linear Independence',
  subject: 'Linear Algebra',

  initState: () => ({
    k: 2.0,         // step 1: v₂ = k · v₁ (dependence demo)
    v2Angle: 80,    // step 2: angle of v₂ (independence demo)
    spanAngle: 80,  // step 3: same for span demo
    c1: 1.0,        // step 5: coordinate c₁
    c2: 0.8,        // step 5: coordinate c₂
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

    // ── Step 1: Linear Dependence ─────────────────────────────────────────────
    {
      title: 'Linear Dependence',
      description: 'Vectors are linearly dependent if one is a scalar multiple of another — or if some non-trivial combination gives the zero vector. Geometrically: they all lie on the same line through 0.',
      equation: 'c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 = \\mathbf{0}\\quad\\text{with }(c_1,c_2)\\ne(0,0)',
      notes: 'Here v₂ = k·v₁, so the combination 1·v₁ + (−1/k)·v₂ = 0 is non-trivial. The red dashed arrow traces this closed loop back to the origin — a signature of dependence. Drag k to rescale v₂.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'scale factor  k  (v₂ = k·v₁)', 0.3, 3, 0.05, state.k,
          v => v.toFixed(2), v => state.k = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const v1 = [2, 1];
        const k  = state.k;
        const v2 = [v1[0] * k, v1[1] * k];

        // Shared line through 0
        const n1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
        const d  = [v1[0]/n1, v1[1]/n1];
        c2d.addLine([[-8*d[0], -8*d[1]], [8*d[0], 8*d[1]]], { color: '#1565c0' + '25', width: 1.5, dash: [6, 4] });

        // v₁
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('v₁', v1[0] + 0.15, v1[1] + 0.22, { color: '#1565c0', size: 13, italic: true });

        // v₂ = k·v₁
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#c62828', width: 2.5 });
        c2d.addText(`v₂ = ${k.toFixed(2)}v₁`, v2[0] + 0.15, v2[1] - 0.35, { color: '#c62828', size: 12 });

        // Non-trivial zero combination: 0 → v₁ → v₁ + (-1/k)v₂ = 0
        // Second leg: from v₁, go -(1/k)*v₂ back to origin
        c2d.addArrow(v1[0], v1[1], 0, 0, { color: '#c62828', width: 2, dash: [5, 3] });

        c2d.addPoint(0, 0, { radius: 6, color: '#e65100' });
        c2d.addText('DEPENDENT — both on same line', -5.5, 4.3, { color: '#c62828', size: 12 });
        c2d.addText(`v₁ + (${(-1/k).toFixed(2)})·v₂ = 0  (non-trivial)`, -5.5, 3.8, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: Linear Independence ───────────────────────────────────────────
    {
      title: 'Linear Independence',
      description: 'Vectors are linearly independent when the only combination giving 0 is the trivial one. Geometrically: they point in genuinely different directions and the parallelogram they form has non-zero area.',
      equation: 'c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 = \\mathbf{0}\\implies c_1 = c_2 = 0',
      notes: 'Independence test: det([v₁ v₂]) = v₁ₓv₂ᵧ − v₁ᵧv₂ₓ ≠ 0. The determinant equals the signed area of the parallelogram. Zero area ↔ collinear ↔ dependent. Drag the slider to rotate v₂.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle of v₂  (degrees)', 5, 175, 1, state.v2Angle,
          v => `${v}°`, v => state.v2Angle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const v1  = [2, 1];
        const ang = state.v2Angle * Math.PI / 180;
        const v2  = [Math.cos(ang) * 2.2, Math.sin(ang) * 2.2];
        const det = v1[0]*v2[1] - v1[1]*v2[0];
        const indep = Math.abs(det) > 0.15;

        // Parallelogram fill
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.moveTo(cam.wx(0),            cam.wy(0));
          ctx.lineTo(cam.wx(v1[0]),        cam.wy(v1[1]));
          ctx.lineTo(cam.wx(v1[0]+v2[0]),  cam.wy(v1[1]+v2[1]));
          ctx.lineTo(cam.wx(v2[0]),        cam.wy(v2[1]));
          ctx.closePath();
          ctx.fillStyle   = indep ? '#e3f2fd' : '#ffebee';
          ctx.fill();
          ctx.strokeStyle = indep ? '#1565c090' : '#c6282870';
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });

        // Diagonal of parallelogram (v₁+v₂) — faint
        c2d.addArrow(0, 0, v1[0]+v2[0], v1[1]+v2[1], { color: '#88888860', width: 1.5, dash: [4, 3] });

        // v₁ and v₂
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('v₁', v1[0] + 0.15, v1[1] + 0.22, { color: '#1565c0', size: 13, italic: true });
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#2e7d32', width: 2.5 });
        c2d.addText('v₂', v2[0] - 0.4, v2[1] + 0.22, { color: '#2e7d32', size: 13, italic: true });

        const statusColor = indep ? '#2e7d32' : '#c62828';
        const status      = indep ? 'INDEPENDENT' : 'DEPENDENT (collinear)';
        c2d.addText(status, -5.5, 4.3, { color: statusColor, size: 12 });
        c2d.addText(`det([v₁ v₂]) = ${det.toFixed(2)}`, -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText(`parallelogram area = ${Math.abs(det).toFixed(2)}`, -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 3: Span and Independence ─────────────────────────────────────────
    {
      title: 'Span Depends on Independence',
      description: 'Independent vectors add a genuinely new direction to the span. Dependent vectors contribute nothing new — however many copies you take, the span stays a line. Rotate v₂ to see the transition.',
      equation: `\\dim\\bigl(\\operatorname{span}(\\mathbf{v}_1,\\mathbf{v}_2)\\bigr)
        = \\begin{cases} 1 & \\text{dependent} \\\\ 2 & \\text{independent} \\end{cases}`,
      notes: 'Three vectors in ℝ² are always dependent — the third can always be written as a combination of the first two. More generally, any k > n vectors in ℝⁿ are linearly dependent.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle of v₂  (degrees)', 3, 177, 1, state.spanAngle,
          v => `${v}°`, v => state.spanAngle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const v1  = [2, 1];
        const ang = state.spanAngle * Math.PI / 180;
        const v2  = [Math.cos(ang) * 2, Math.sin(ang) * 2];
        const det = v1[0]*v2[1] - v1[1]*v2[0];
        const indep = Math.abs(det) > 0.2;

        // Fill for full span
        if (indep) {
          c2d.raw((ctx, cam) => {
            ctx.fillStyle = '#e8f4fd';
            ctx.fillRect(0, 0, cam.width, cam.height);
          });
        }

        c2d.addGrid({ spacing: 1, color: indep ? '#dde8f0' : '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // span(v₁) — always draw the line
        const n1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
        const d1 = [v1[0]/n1, v1[1]/n1];
        c2d.addLine([[-8*d1[0], -8*d1[1]], [8*d1[0], 8*d1[1]]],
          { color: '#1565c0' + (indep ? '40' : '80'), width: indep ? 1.5 : 2.5, dash: [6, 4] });

        // span(v₂) line — only meaningful when not parallel to v₁
        if (indep) {
          const n2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1]);
          const d2 = [v2[0]/n2, v2[1]/n2];
          c2d.addLine([[-8*d2[0], -8*d2[1]], [8*d2[0], 8*d2[1]]],
            { color: '#2e7d32' + '40', width: 1.5, dash: [6, 4] });
        }

        // Vectors
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('v₁', v1[0] + 0.15, v1[1] + 0.22, { color: '#1565c0', size: 13, italic: true });
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#2e7d32', width: 2.5 });
        c2d.addText('v₂', v2[0] - 0.4, v2[1] + 0.22, { color: '#2e7d32', size: 13, italic: true });

        if (indep) {
          c2d.addText('span(v₁, v₂) = ℝ²  (blue plane)', -5.5, 4.3, { color: '#1565c0', size: 12 });
          c2d.addText('Independent → new direction → full plane', -5.5, 3.8, { color: '#555', size: 12 });
        } else {
          c2d.addText('span(v₁, v₂) = one line (dashed)', -5.5, 4.3, { color: '#c62828', size: 12 });
          c2d.addText('Dependent → no new direction added', -5.5, 3.8, { color: '#555', size: 12 });
        }
        c2d.addText(`det = ${det.toFixed(2)}`, -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

    // ── Step 4: Basis ─────────────────────────────────────────────────────────
    {
      title: 'Basis',
      description: 'A basis is a linearly independent set that spans the whole space. Any two non-parallel vectors form a basis for ℝ². The basis defines a coordinate grid — a new way to measure the plane.',
      equation: 'B = \\{\\mathbf{b}_1, \\mathbf{b}_2\\} \\text{ basis of }\\mathbb{R}^2 \\iff \\begin{cases}\\text{independent}\\\\\\operatorname{span}(B)=\\mathbb{R}^2\\end{cases}',
      notes: 'The standard basis {e₁, e₂} gives the familiar square grid. A non-standard basis gives a tilted, scaled grid — but every point in the plane is still reachable. A basis for ℝⁿ always has exactly n vectors: this is the dimension theorem.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();

        const b1 = [2, 1], b2 = [-1, 2];

        // Draw the b-grid (lattice lines in b₁ and b₂ directions)
        const t = 7;
        for (let n = -4; n <= 4; n++) {
          // Lines parallel to b₁ through n·b₂
          const ox1 = n*b2[0], oy1 = n*b2[1];
          c2d.addLine([[ox1 - t*b1[0], oy1 - t*b1[1]], [ox1 + t*b1[0], oy1 + t*b1[1]]],
            { color: '#1565c0' + '22', width: 1 });
          // Lines parallel to b₂ through n·b₁
          const ox2 = n*b1[0], oy2 = n*b1[1];
          c2d.addLine([[ox2 - t*b2[0], oy2 - t*b2[1]], [ox2 + t*b2[0], oy2 + t*b2[1]]],
            { color: '#2e7d32' + '22', width: 1 });
        }

        // Standard axes (heavier)
        c2d.addAxes({ color: '#d0d0d0' });
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });

        // Standard basis
        c2d.addArrow(0, 0, 1, 0, { color: '#aaa', width: 2 });
        c2d.addText('e₁', 1.1, 0.18, { color: '#aaa', size: 12, italic: true });
        c2d.addArrow(0, 0, 0, 1, { color: '#aaa', width: 2 });
        c2d.addText('e₂', 0.1, 1.2, { color: '#aaa', size: 12, italic: true });

        // Non-standard basis b₁, b₂
        c2d.addArrow(0, 0, b1[0], b1[1], { color: '#1565c0', width: 3 });
        c2d.addText('b₁', b1[0] + 0.15, b1[1] + 0.25, { color: '#1565c0', size: 14, italic: true });
        c2d.addArrow(0, 0, b2[0], b2[1], { color: '#2e7d32', width: 3 });
        c2d.addText('b₂', b2[0] - 0.45, b2[1] + 0.25, { color: '#2e7d32', size: 14, italic: true });

        c2d.addText('Grey: standard grid {e₁, e₂}', -5.5, 4.3, { color: '#aaa', size: 12 });
        c2d.addText('Coloured grid: basis {b₁, b₂}', -5.5, 3.8, { color: '#1565c0', size: 12 });
        c2d.addText('det(b₁,b₂) = 5 ≠ 0 — independent, spans ℝ²', -5.5, 3.3, { color: '#555', size: 12 });
      },
    },

    // ── Step 5: Coordinates in a Basis ────────────────────────────────────────
    {
      title: 'Coordinates in a Basis',
      description: 'Every vector w has a unique representation w = c₁b₁ + c₂b₂ in a given basis. The scalars (c₁, c₂) are the coordinates of w with respect to that basis. Change the sliders to move w.',
      equation: '\\mathbf{w} = c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2 \\quad\\text{(unique for any basis)}',
      notes: 'Coordinates are basis-dependent: the same vector w has different numbers (c₁, c₂) in different bases. The standard coordinates are the special case b₁=e₁, b₂=e₂. Changing basis is a linear map — this is the change-of-basis matrix.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'coordinate  c₁', -2.5, 2.5, 0.05, state.c1,
          v => v.toFixed(2), v => state.c1 = v);
        addSlider(state._controls, 'coordinate  c₂', -2.5, 2.5, 0.05, state.c2,
          v => v.toFixed(2), v => state.c2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const b1 = [2, 1], b2 = [-1, 2];
        const c1 = state.c1, c2 = state.c2;

        // b-grid (faint)
        const t = 7;
        for (let n = -4; n <= 4; n++) {
          const ox1 = n*b2[0], oy1 = n*b2[1];
          c2d.addLine([[ox1 - t*b1[0], oy1 - t*b1[1]], [ox1 + t*b1[0], oy1 + t*b1[1]]],
            { color: '#1565c0' + '18', width: 1 });
          const ox2 = n*b1[0], oy2 = n*b1[1];
          c2d.addLine([[ox2 - t*b2[0], oy2 - t*b2[1]], [ox2 + t*b2[0], oy2 + t*b2[1]]],
            { color: '#2e7d32' + '18', width: 1 });
        }

        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Basis vectors
        c2d.addArrow(0, 0, b1[0], b1[1], { color: '#1565c0' + '80', width: 2 });
        c2d.addArrow(0, 0, b2[0], b2[1], { color: '#2e7d32' + '80', width: 2 });
        c2d.addText('b₁', b1[0]+0.15, b1[1]+0.22, { color: '#1565c0' + 'aa', size: 12, italic: true });
        c2d.addText('b₂', b2[0]-0.45, b2[1]+0.22, { color: '#2e7d32' + 'aa', size: 12, italic: true });

        // c₁·b₁ component
        const leg1 = [c1*b1[0], c1*b1[1]];
        // c₂·b₂ component
        const leg2 = [c2*b2[0], c2*b2[1]];
        // w = leg1 + leg2
        const w = [leg1[0]+leg2[0], leg1[1]+leg2[1]];

        // Draw the path: 0 → c₁b₁ → w
        if (Math.abs(c1) > 0.04) {
          c2d.addArrow(0, 0, leg1[0], leg1[1], { color: '#1565c0', width: 2.5 });
          c2d.addText(`c₁b₁`, leg1[0]*0.5 + 0.15, leg1[1]*0.5 + 0.25, { color: '#1565c0', size: 11 });
        }
        if (Math.abs(c2) > 0.04) {
          c2d.addArrow(leg1[0], leg1[1], w[0], w[1], { color: '#2e7d32', width: 2.5 });
          c2d.addText(`c₂b₂`, leg1[0]+leg2[0]*0.5 + 0.15, leg1[1]+leg2[1]*0.5 + 0.15, { color: '#2e7d32', size: 11 });
        }

        // w
        if (Math.sqrt(w[0]*w[0]+w[1]*w[1]) > 0.08) {
          c2d.addArrow(0, 0, w[0], w[1], { color: '#6a1b9a', width: 3 });
          c2d.addPoint(w[0], w[1], { radius: 5, color: '#6a1b9a' });
          c2d.addText('w', w[0]+0.18, w[1]+0.22, { color: '#6a1b9a', size: 14, italic: true });
        }

        c2d.addText(`w = ${c1.toFixed(2)}·b₁ + ${c2.toFixed(2)}·b₂`, -5.5, 4.3, { color: '#6a1b9a', size: 12 });
        c2d.addText(`w = (${w[0].toFixed(2)}, ${w[1].toFixed(2)}) in standard coords`, -5.5, 3.8, { color: '#555', size: 12 });
        c2d.addText('Each (c₁, c₂) gives a unique w', -5.5, 3.3, { color: '#888', size: 12 });
      },
    },

  ],
};
