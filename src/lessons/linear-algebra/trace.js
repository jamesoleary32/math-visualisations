function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `tr-${Math.random().toString(36).slice(2)}`;
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
function det2(M)      { return M[0]*M[3] - M[1]*M[2]; }
function mul2(A, B) {
  return [
    A[0]*B[0] + A[1]*B[2],  A[0]*B[1] + A[1]*B[3],
    A[2]*B[0] + A[3]*B[2],  A[2]*B[1] + A[3]*B[3],
  ];
}
function trM(M) { return M[0] + M[3]; }

function fillQuad(c2d, pts, fill, stroke, sw) {
  c2d.raw((ctx, cam) => {
    ctx.beginPath();
    ctx.moveTo(cam.wx(pts[0][0]), cam.wy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(cam.wx(pts[i][0]), cam.wy(pts[i][1]));
    ctx.closePath();
    if (fill)   { ctx.fillStyle = fill;   ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw ?? 2; ctx.stroke(); }
  });
}

export default {
  title:   'The Trace',
  subject: 'Linear Algebra',

  initState: () => ({
    a: 3, b: 1, c: 0, d: 2,
    theta: 0,
    eps: 0.3,
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

    // ── Step 1: Definition ────────────────────────────────────────────────────
    {
      title: 'The Diagonal Sum',
      description: 'The trace of a square matrix is the sum of its diagonal entries. Drag all four sliders — only a and d affect it. The off-diagonal entries b and c are completely invisible to the trace.',
      equation: '\\operatorname{tr}\\!\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = a + d',
      notes: 'The off-diagonal entries b and c play no role — only the diagonal a and d appear.\n\nThis does not by itself explain why the trace is basis-independent. When you rotate the coordinate system, each individual diagonal entry changes — a₁₁ in the rotated basis is completely different from a₁₁ in the standard basis. What stays fixed is their sum.\n\nThe real reason: tr(A) equals the sum of eigenvalues (see Step 3), and eigenvalues do not depend on coordinates at all. Basis-independence of the trace is a consequence of basis-independence of eigenvalues.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'a', -3, 3, 0.1, state.a, v => v.toFixed(1), v => { state.a = v; });
        addSlider(state._controls, 'b', -3, 3, 0.1, state.b, v => v.toFixed(1), v => { state.b = v; });
        addSlider(state._controls, 'c', -3, 3, 0.1, state.c, v => v.toFixed(1), v => { state.c = v; });
        addSlider(state._controls, 'd', -3, 3, 0.1, state.d, v => v.toFixed(1), v => { state.d = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { a, b, c, d } = state;

        // Column vectors
        c2d.addArrow(0, 0, a, c, { color: '#c62828', width: 2.5 });
        c2d.addArrow(0, 0, b, d, { color: '#2e7d32', width: 2.5 });
        c2d.addText(`col₁=(${a.toFixed(1)},${c.toFixed(1)})`, a + 0.12, c - 0.28, { color: '#c62828', size: 11 });
        c2d.addText(`col₂=(${b.toFixed(1)},${d.toFixed(1)})`, b + 0.12, d + 0.18, { color: '#2e7d32', size: 11 });

        // Diagonal projections — these are what trace picks out
        if (Math.abs(a) > 0.05) {
          c2d.addLine([[0,0],[a,0]], { color: '#1565c088', width: 2, dash: [4,3] });
          c2d.addPoint(a, 0, { radius: 5, color: '#1565c0' });
          c2d.addText(`a = ${a.toFixed(1)}`, a > 0 ? a + 0.1 : a - 0.9, -0.36, { color: '#1565c0', size: 11 });
        }
        if (Math.abs(d) > 0.05) {
          c2d.addLine([[0,0],[0,d]], { color: '#1565c088', width: 2, dash: [4,3] });
          c2d.addPoint(0, d, { radius: 5, color: '#1565c0' });
          c2d.addText(`d = ${d.toFixed(1)}`, 0.12, d > 0 ? d + 0.2 : d - 0.35, { color: '#1565c0', size: 11 });
        }

        c2d.addText(`tr(A) = ${a.toFixed(1)} + ${d.toFixed(1)} = ${(a+d).toFixed(1)}`,
          -5.5, -3.5, { color: '#1565c0', size: 13 });
        c2d.addText('b and c do not appear', -5.5, -4.1, { color: '#aaa', size: 11 });
      },
    },

    // ── Step 2: Basis invariance ──────────────────────────────────────────────
    {
      title: 'The Trace Does Not Depend on Basis',
      description: 'Rotate the coordinate system with the slider. The matrix entries change completely — but the diagonal sum does not move. The trace is a property of the linear transformation, not of the coordinates used to write it.',
      equation: '\\operatorname{tr}(PAP^{-1}) = \\operatorname{tr}(A)\\quad\\text{for any invertible }P',
      notes: 'A = [[3, 1], [0, 2]],  tr(A) = 3 + 2 = 5.\n\nP is a rotation by θ, so PAP⁻¹ is A expressed in the rotated basis. Its diagonal entries change with θ — but their sum stays at 5.\n\nThis will follow in one line once we have the cyclic property (Step 5).',
      setup(c2d, state) {
        clearControls(state);
        state.theta = 0;
        addSlider(state._controls, 'basis rotation  θ', 0, Math.PI, 0.02, state.theta,
          v => `${(v * 180 / Math.PI).toFixed(0)}°`, v => { state.theta = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { theta } = state;
        const cos = Math.cos(theta), sin = Math.sin(theta);
        const P    = [ cos, -sin,  sin, cos];
        const Pinv = [ cos,  sin, -sin, cos];
        const A    = [3, 1, 0, 2];
        const B    = mul2(mul2(P, A), Pinv);

        // Standard basis (faint)
        c2d.addArrow(0, 0, 1, 0, { color: '#c6282844', width: 1.5 });
        c2d.addArrow(0, 0, 0, 1, { color: '#2e7d3244', width: 1.5 });

        // Rotated basis
        c2d.addArrow(0, 0,  cos, sin, { color: '#c62828', width: 2 });
        c2d.addArrow(0, 0, -sin, cos, { color: '#2e7d32', width: 2 });
        c2d.addText("e₁'",  cos + 0.12, sin + 0.12,  { color: '#c62828', size: 12 });
        c2d.addText("e₂'", -sin - 0.42, cos + 0.12,  { color: '#2e7d32', size: 12 });

        const b11 = B[0], b22 = B[3];

        c2d.addText('A in standard basis:   3 + 2 = 5',
          -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText(`PAP⁻¹ in rotated basis:   ${b11.toFixed(2)} + ${b22.toFixed(2)} = ${(b11+b22).toFixed(2)}`,
          -5.5, 3.7, { color: '#e65100', size: 12 });
        c2d.addText('trace unchanged  ✓', -5.5, 3.2, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 3: Sum of eigenvalues ────────────────────────────────────────────
    {
      title: 'Sum of Eigenvalues',
      description: 'The trace equals the sum of eigenvalues. This is the deeper reason for basis-independence — eigenvalues are intrinsic to a transformation, and the trace is their simplest aggregate. It falls out of expanding the characteristic polynomial.',
      equation: '\\det(\\lambda I - A) = \\lambda^2 - \\underbrace{\\operatorname{tr}(A)}_{\\lambda_1+\\lambda_2}\\,\\lambda + \\underbrace{\\det(A)}_{\\lambda_1\\lambda_2}',
      notes: 'The trace was not defined to equal the eigenvalue sum — that emerges when you expand the characteristic polynomial and apply Vieta\'s formulas (the coefficients of a polynomial equal elementary symmetric functions of its roots).\n\nHere the sliders set λ₁ and λ₂ directly. A diagonal matrix [[λ₁,0],[0,λ₂]] has those as its exact eigenvalues.',
      setup(c2d, state) {
        clearControls(state);
        state.a = 3; state.d = 2;
        addSlider(state._controls, 'λ₁', -3, 4, 0.1, state.a, v => v.toFixed(1), v => { state.a = v; });
        addSlider(state._controls, 'λ₂', -3, 4, 0.1, state.d, v => v.toFixed(1), v => { state.d = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const l1 = state.a;
        const l2 = state.d;
        const trVal  = l1 + l2;
        const detVal = l1 * l2;

        // Number line
        const ly = 1.2;
        c2d.addLine([[-5.5, ly], [5.5, ly]], { color: '#ccc', width: 1.5 });
        for (let i = -5; i <= 5; i++) {
          c2d.addLine([[i, ly - 0.1], [i, ly + 0.1]], { color: '#bbb', width: 1 });
          c2d.addText(String(i), i - 0.1, ly - 0.42, { color: '#bbb', size: 10 });
        }

        // Clamp to visible range for dots
        const cl1 = Math.max(-5.4, Math.min(5.4, l1));
        const cl2 = Math.max(-5.4, Math.min(5.4, l2));
        const ctr = Math.max(-5.4, Math.min(5.4, trVal));

        // λ₁ and λ₂
        c2d.addPoint(cl1, ly, { radius: 7, color: '#c62828' });
        c2d.addText(`λ₁ = ${l1.toFixed(1)}`, cl1 - 0.25, ly + 0.45, { color: '#c62828', size: 12 });

        c2d.addPoint(cl2, ly, { radius: 7, color: '#1565c0' });
        c2d.addText(`λ₂ = ${l2.toFixed(1)}`, cl2 - 0.25, ly - 0.6,  { color: '#1565c0', size: 12 });

        // Sum marker
        c2d.addPoint(ctr, ly, { radius: 5, color: '#2e7d32' });
        c2d.addText(`tr = ${trVal.toFixed(1)}`, ctr - 0.25, ly + 0.45, { color: '#2e7d32', size: 11 });

        // Bracket above showing addition
        if (Math.abs(l1 - l2) > 0.2 && Math.abs(trVal) < 5.8) {
          const x0 = Math.min(cl1, cl2), x1 = Math.max(cl1, cl2);
          c2d.addLine([[x0, ly+0.22],[x1, ly+0.22]], { color: '#2e7d3266', width: 2 });
          c2d.addLine([[x0, ly+0.12],[x0, ly+0.32]], { color: '#2e7d3266', width: 1.5 });
          c2d.addLine([[x1, ly+0.12],[x1, ly+0.32]], { color: '#2e7d3266', width: 1.5 });
        }

        c2d.addText(`tr(A) = λ₁ + λ₂ = ${l1.toFixed(1)} + ${l2.toFixed(1)} = ${trVal.toFixed(1)}`,
          -5.5, -0.6, { color: '#2e7d32', size: 13 });
        c2d.addText(`det(A) = λ₁ · λ₂ = ${l1.toFixed(1)} × ${l2.toFixed(1)} = ${detVal.toFixed(1)}`,
          -5.5, -1.3, { color: '#555', size: 12 });
        c2d.addText(`char. poly: λ² − ${trVal.toFixed(1)}λ + ${detVal.toFixed(1)}`,
          -5.5, -2.2, { color: '#888', size: 12 });
        c2d.addText('tr is the coefficient of λ (negated) — it fell out, not put in',
          -5.5, -2.8, { color: '#aaa', size: 11 });
      },
    },

    // ── Step 4: Infinitesimal determinant ────────────────────────────────────
    {
      title: 'Rate of Volume Change',
      description: 'For a small perturbation εA of the identity, det(I + εA) ≈ 1 + ε·tr(A) to first order. The trace is the derivative of the determinant at the identity — it measures how fast area is expanding or contracting.',
      equation: '\\det(I + \\varepsilon A) = 1 + \\varepsilon\\,\\operatorname{tr}(A) + O(\\varepsilon^2)',
      notes: 'tr > 0: flow expands area\ntr < 0: flow contracts area\ntr = 0: area-preserving  →  incompressible fluid, Hamiltonian mechanics\n\nIn differential geometry:  div(v) = tr(Jac(v)).\nThe divergence of a vector field is exactly the trace of its Jacobian — the rate of volume change per unit volume along the flow.',
      setup(c2d, state) {
        clearControls(state);
        state.a = 1; state.b = 0.5; state.c = 0.2; state.d = 1.5;
        state.eps = 0.3;
        addSlider(state._controls, 'ε', 0, 0.8, 0.01, state.eps, v => v.toFixed(2), v => { state.eps = v; });
        addSlider(state._controls, 'a  (affects tr)', -2, 2, 0.1, state.a, v => v.toFixed(1), v => { state.a = v; });
        addSlider(state._controls, 'd  (affects tr)', -2, 2, 0.1, state.d, v => v.toFixed(1), v => { state.d = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { a, b, c, d, eps } = state;
        const trVal = a + d;
        // M = I + εA
        const M = [1 + eps*a, eps*b, eps*c, 1 + eps*d];
        const exactDet  = det2(M);
        const approxDet = 1 + eps * trVal;
        const err = Math.abs(exactDet - approxDet);

        // Original unit square (faint)
        const sq = [[0,0],[1,0],[1,1],[0,1]];
        fillQuad(c2d, sq, 'rgba(0,0,0,0.05)', '#ccc', 1);

        // Deformed square under I + εA
        const dsq = sq.map(([x,y]) => tx(M, x, y));
        const expanding = trVal > 0.05;
        const contracting = trVal < -0.05;
        const fillCol = expanding  ? 'rgba(21,101,192,0.18)'
                      : contracting ? 'rgba(198,40,40,0.18)'
                      :               'rgba(46,125,50,0.18)';
        const edgeCol = expanding  ? '#1565c0'
                      : contracting ? '#c62828'
                      :               '#2e7d32';
        fillQuad(c2d, dsq, fillCol, edgeCol, 2);

        const label = expanding ? 'expanding' : contracting ? 'contracting' : 'area-preserving';
        c2d.addText(`tr(A) = ${trVal.toFixed(1)}  →  ${label}`,
          -5.5, 4.2, { color: edgeCol, size: 12 });
        c2d.addText(`exact:   det(I + εA) = ${exactDet.toFixed(4)}`,  -5.5, 3.7, { color: '#555',    size: 12 });
        c2d.addText(`approx:  1 + ε·tr(A) = ${approxDet.toFixed(4)}`, -5.5, 3.2, { color: '#e65100', size: 12 });
        c2d.addText(`error (O(ε²)): ${err.toFixed(5)}`,               -5.5, 2.7, { color: '#aaa',    size: 11 });
      },
    },

    // ── Step 5: Cyclic property ───────────────────────────────────────────────
    {
      title: 'The Cyclic Property  tr(AB) = tr(BA)',
      description: 'The trace is the unique linear functional on matrices satisfying tr(AB) = tr(BA). Everything else — basis invariance, the matrix inner product — is a corollary. Drag the sliders: AB and BA produce different parallelograms, but always the same trace.',
      equation: '\\operatorname{tr}(AB) = \\operatorname{tr}(BA)',
      notes: 'Basis invariance in one line:\n  tr(PAP⁻¹) = tr(A·PP⁻¹) = tr(A·I) = tr(A)\n\nMatrix inner product:  ⟨A, B⟩ = tr(AᵀB)\nSymmetry holds because tr(AᵀB) = tr(Bᵀ(Aᵀ)ᵀ) = tr(BᵀA) — cyclic.\n\nQuantum mechanics:  expected value of observable O in state ρ is tr(ρO).\nThe cyclic property is why operator ordering does not matter there.',
      setup(c2d, state) {
        clearControls(state);
        state.a = 3; state.b = 1; state.c = 0; state.d = 2;
        addSlider(state._controls, 'a', -3, 3, 0.1, state.a, v => v.toFixed(1), v => { state.a = v; });
        addSlider(state._controls, 'b', -3, 3, 0.1, state.b, v => v.toFixed(1), v => { state.b = v; });
        addSlider(state._controls, 'c', -3, 3, 0.1, state.c, v => v.toFixed(1), v => { state.c = v; });
        addSlider(state._controls, 'd', -3, 3, 0.1, state.d, v => v.toFixed(1), v => { state.d = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const { a, b, c, d } = state;
        const A = [a, b, c, d];
        const B = [1, 2, 0, 3];  // fixed

        const AB = mul2(A, B);
        const BA = mul2(B, A);

        const sq = [[0,0],[1,0],[1,1],[0,1]];
        fillQuad(c2d, sq.map(([x,y]) => tx(AB, x, y)), 'rgba(21,101,192,0.14)', '#1565c0', 1.5);
        fillQuad(c2d, sq.map(([x,y]) => tx(BA, x, y)), 'rgba(198,40,40,0.14)',  '#c62828', 1.5);

        const trAB = trM(AB), trBA = trM(BA);

        c2d.addText('AB  (blue)   B = [[1,2],[0,3]] fixed', -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText('BA  (red)    different shape, same trace', -5.5, 3.7, { color: '#c62828', size: 12 });
        c2d.addText(`tr(AB) = ${trAB.toFixed(2)}`, -5.5, 3.0, { color: '#1565c0', size: 13 });
        c2d.addText(`tr(BA) = ${trBA.toFixed(2)}`, -5.5, 2.5, { color: '#c62828', size: 13 });
        c2d.addText('equal  ✓', -5.5, 2.0, { color: '#2e7d32', size: 13 });
      },
    },

  ],
};
