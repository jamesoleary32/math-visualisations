// Linear Transformations — Linear Algebra
//
// A map T: V → W is linear when T(u+v) = T(u)+T(v) and T(αv) = αT(v).
// The same definition applies in any vector space: polynomials, matrices, functions.

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `lt-${Math.random().toString(36).slice(2)}`;
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

// ── Vector helpers (for Step 1 only) ──────────────────────────────────────────
function rot2(v, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [c*v[0] - s*v[1], s*v[0] + c*v[1]];
}

// ── Polynomial helpers ─────────────────────────────────────────────────────────
// Coefficients: [a₀, a₁, a₂, ...] = a₀ + a₁x + a₂x² + ...

function evalPoly(coeffs, x) {
  let y = 0, xk = 1;
  for (const c of coeffs) { y += c * xk; xk *= x; }
  return y;
}

function diffPoly(coeffs) {
  return coeffs.slice(1).map((c, i) => c * (i + 1));
}

function integPoly(coeffs, C = 0) {
  return [C, ...coeffs.map((c, i) => c / (i + 1))];
}

function plotPoly(c2d, coeffs, xMin, xMax, style) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const x = xMin + (xMax - xMin) * i / 120;
    pts.push([x, evalPoly(coeffs, x)]);
  }
  c2d.addLine(pts, style);
}

function polyLabel(coeffs) {
  const names = ['', 'x', 'x²', 'x³'];
  const parts = [];
  [...coeffs].reverse().forEach((c, ri) => {
    const i = coeffs.length - 1 - ri;
    if (Math.abs(c) < 1e-9) return;
    const absC = Math.abs(c);
    const sign = c < 0 ? '−' : '+';
    const mag  = (absC === 1 && i > 0) ? '' : absC % 1 === 0 ? String(absC) : absC.toFixed(1);
    parts.push({ sign, mag, name: names[i] ?? `x^${i}` });
  });
  if (!parts.length) return '0';
  const first = parts[0];
  const head  = (first.sign === '−' ? '−' : '') + first.mag + first.name;
  const tail   = parts.slice(1).map(p => ` ${p.sign} ${p.mag}${p.name}`).join('');
  return head + tail;
}

export default {
  title:   'Linear Transformations',
  subject: 'Linear Algebra',

  initState: () => ({
    cubicCoeff: 1,
    lineCoeff:  2,
    C:          0,
    matA:       1.5,   // off-diagonal entry a₁₂ for transpose demo
    _controls:  null,
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

    // ── Step 1: The Two Axioms ─────────────────────────────────────────────────
    {
      title: 'The Two Axioms',
      description: 'A map T: V → W is linear when it respects vector addition and scalar multiplication. These two conditions together mean T converts any linear combination in V into the same linear combination of outputs — it never bends or shifts the structure.',
      equation: `T(\\mathbf{u}+\\mathbf{v}) = T(\\mathbf{u})+T(\\mathbf{v})
        \\qquad T(\\alpha\\mathbf{v}) = \\alpha\\,T(\\mathbf{v})`,
      notes: 'Canvas: rotation by 40° in ℝ² satisfies both axioms. The rotated sum (purple dashed) lands exactly where the sum of the individual rotated vectors does.\n\nThe same two axioms hold in far more exotic spaces:\n  D: Pₙ → Pₙ₋₁       differentiation on polynomials\n  ∫₀ˣ: Pₙ → Pₙ₊₁    indefinite integration\n  (·)ᵀ: M_{m×n} → M_{n×m}  matrix transpose\n  ev_c: P → ℝ          evaluate p at x = c\n  L(f) = f″ + 3f′ + f  a differential operator\n\nIn each case the proof is two lines: expand T(u+v) and T(αv), use the definition, confirm they split as required.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = 40 * Math.PI / 180;
        const u   = [1.8, 0.4];
        const v   = [0.4, 1.6];
        const upv = [u[0]+v[0], u[1]+v[1]];
        const Tu  = rot2(u, th), Tv = rot2(v, th), Tupv = rot2(upv, th);

        // inputs
        c2d.addArrow(0, 0, u[0], u[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('u', u[0]+0.12, u[1]+0.18, { color: '#1565c0', size: 13, italic: true });
        c2d.addArrow(0, 0, v[0], v[1], { color: '#c62828', width: 2.5 });
        c2d.addText('v', v[0]+0.12, v[1]+0.18, { color: '#c62828', size: 13, italic: true });
        c2d.addArrow(0, 0, upv[0], upv[1], { color: '#6a1b9a', width: 2.5 });
        c2d.addText('u+v', upv[0]+0.12, upv[1]+0.15, { color: '#6a1b9a', size: 13 });

        // outputs
        c2d.addArrow(0, 0, Tu[0], Tu[1], { color: '#1565c0', width: 2, dash: [5,3] });
        c2d.addText('T(u)', Tu[0]+0.12, Tu[1]+0.18, { color: '#1565c060', size: 12 });
        c2d.addArrow(0, 0, Tv[0], Tv[1], { color: '#c62828', width: 2, dash: [5,3] });
        c2d.addText('T(v)', Tv[0]-0.72, Tv[1]+0.1, { color: '#c6282860', size: 12 });
        c2d.addArrow(0, 0, Tupv[0], Tupv[1], { color: '#6a1b9a', width: 2, dash: [5,3] });
        c2d.addText('T(u+v)', Tupv[0]-1.05, Tupv[1]+0.15, { color: '#6a1b9a60', size: 12 });

        c2d.addText('T = rotation by 40°  (an orthogonal map on ℝ²)', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText('T(u+v) = T(u)+T(v)  ✓', -5.5, -3.5, { color: '#2e7d32', size: 13 });
        c2d.addText('Same axioms define linearity in any vector space', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 2: Differentiation on Polynomials ─────────────────────────────────
    {
      title: 'Differentiation D: Pₙ → Pₙ₋₁',
      description: 'Differentiation is linear because the sum and constant-multiple rules hold for derivatives. D maps a degree-n polynomial to a degree-(n−1) polynomial. Drag the slider to change the leading coefficient and watch both curves update together.',
      equation: `D(p+q) = Dp + Dq \\qquad D(\\alpha p) = \\alpha Dp
        \\qquad D(a_0 + a_1 x + a_2 x^2 + a_3 x^3) = a_1 + 2a_2 x + 3a_3 x^2`,
      notes: 'Proof of linearity for D:\n  D(p+q)(x) = lim_{h→0} [(p+q)(x+h) − (p+q)(x)]/h\n             = lim p′(x) + lim q′(x)  = Dp + Dq  ✓\n\nThe derivative lowers degree by exactly one. Constants are the only polynomials with zero derivative — they form the kernel of D (next step). The operation is "destructive" in one direction: once differentiated, the constant term is gone forever.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'cubic coefficient a₃', -2, 2, 0.1, state.cubicCoeff,
          v => v.toFixed(1), v => state.cubicCoeff = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const a3 = state.cubicCoeff;
        // p(x) = a3·x³ − x² + 0.5x + 1
        const p  = [1, 0.5, -1, a3];
        const dp = diffPoly(p);

        plotPoly(c2d, p,  -2.2, 2.2, { color: '#1565c0', width: 2.5 });
        plotPoly(c2d, dp, -2.2, 2.2, { color: '#c62828', width: 2.5 });

        // marker at x=1 to show the derivative as a tangent slope
        const x0 = 1, y0 = evalPoly(p, x0);
        const m  = evalPoly(dp, x0);
        c2d.addPoint(x0, y0, { color: '#1565c0', radius: 4 });
        c2d.addLine([[x0-0.6, y0 - m*0.6], [x0+0.6, y0 + m*0.6]], { color: '#e65100', width: 1.5, dash: [4,3] });
        c2d.addText(`slope = D(p)(1) = ${evalPoly(dp,1).toFixed(2)}`, x0+0.12, y0+0.22, { color: '#e65100', size: 11 });

        c2d.addText(`p(x) = ${polyLabel(p)}`, -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText(`D(p) = ${polyLabel(dp)}`, -5.5, 3.7, { color: '#c62828', size: 12 });
        c2d.addText('Blue: p(x)   Red: D(p) = p′(x)', -5.5, -3.5, { color: '#555', size: 12 });
        c2d.addText('D lowers degree by 1', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 3: Integration ────────────────────────────────────────────────────
    {
      title: 'Integration ∫: Pₙ → Pₙ₊₁',
      description: 'Definite integration (∫₀ˣ) is a linear map that raises degree by one. It is the right inverse of D: differentiating the antiderivative returns the original. Adjust the integrand slope and the constant of integration C to see both curves update.',
      equation: `(\\mathcal{I}f)(x) = \\int_0^x f(t)\\,dt
        \\qquad D \\circ \\mathcal{I} = \\mathrm{id}
        \\qquad \\mathcal{I} \\circ D = \\mathrm{id} - \\text{eval}_0`,
      notes: 'Linearity proof for ∫:\n  ∫₀ˣ(f+g) dt = ∫₀ˣf dt + ∫₀ˣg dt  ✓\n  ∫₀ˣ(αf) dt = α∫₀ˣf dt  ✓\n\nI is not a true inverse of D: D∘I = id (differentiating the antiderivative returns f), but I∘D(p) = p − p(0) — the constant term is lost going through D first. This asymmetry is exactly because constants are in ker(D).\n\nC is the undetermined constant: changing C shifts the antiderivative vertically — the derivative is the same regardless of C.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'integrand slope a₁', -3, 3, 0.1, state.lineCoeff,
          v => v.toFixed(1), v => state.lineCoeff = v);
        addSlider(state._controls, 'constant C', -3, 3, 0.1, state.C,
          v => v.toFixed(1), v => state.C = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // f(x) = a1·x + 1  (linear)
        const f  = [1, state.lineCoeff];
        const Ff = integPoly(f, state.C);   // [C, 1, a1/2]

        plotPoly(c2d, f,  -2.5, 2.5, { color: '#1565c0', width: 2.5 });
        plotPoly(c2d, Ff, -2.5, 2.5, { color: '#c62828', width: 2.5 });

        // shade the area under f from 0 to 1.5 to show what the integral means
        const x1 = 1.5;
        const areaPts = [[0, 0]];
        for (let i = 0; i <= 60; i++) {
          const x = x1 * i / 60;
          areaPts.push([x, evalPoly(f, x)]);
        }
        areaPts.push([x1, 0]);
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.moveTo(cam.wx(areaPts[0][0]), cam.wy(areaPts[0][1]));
          for (const [px, py] of areaPts) ctx.lineTo(cam.wx(px), cam.wy(py));
          ctx.closePath();
          ctx.fillStyle = '#1565c015';
          ctx.fill();
        });
        c2d.addText(`∫₀^1.5 f dt = F(1.5)−F(0) = ${(evalPoly(Ff,1.5)-evalPoly(Ff,0)).toFixed(2)}`, 0.1, -0.6, { color: '#e65100', size: 11 });

        c2d.addText(`f(x) = ${polyLabel(f)}`, -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText(`F(x) = ∫f = ${polyLabel(Ff)}`, -5.5, 3.7, { color: '#c62828', size: 12 });
        c2d.addText('Blue: f(x)   Red: antiderivative F(x)', -5.5, -3.5, { color: '#555', size: 12 });
        c2d.addText('D(F) = f  ✓  — differentiate red, get blue back', -5.5, -4.1, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 4: Kernel ─────────────────────────────────────────────────────────
    {
      title: 'Kernel — the Null Space',
      description: 'The kernel of T is the set of inputs that T sends to zero. It is always a subspace of V. For differentiation, ker(D) is exactly the set of constant polynomials — any polynomial with zero derivative must be flat.',
      equation: `\\ker(T) = \\{\\mathbf{v}\\in V : T(\\mathbf{v}) = \\mathbf{0}\\}
        \\qquad \\ker(D) = \\{p : Dp = 0\\} = P_0 = \\{\\text{constants}\\}`,
      notes: 'Canvas: the four coloured horizontal lines are constant polynomials — each has D(p) = 0 (a zero polynomial). They form a 1-dimensional subspace of Pₙ: any scalar multiple of a constant is still constant, and the sum of two constants is constant.\n\nFor the transpose map T(A) = Aᵀ, ker(T) contains only the zero matrix — symmetric matrices satisfy Aᵀ = A, not Aᵀ = 0, so ker = {0}.\n\nFor the evaluation map ev_c(p) = p(c), ker = {polynomials with a root at c} — a much larger subspace.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // several constants in ker(D)
        const constants = [
          { c: 2,    color: '#1565c0' },
          { c: -1.5, color: '#c62828' },
          { c: 3.5,  color: '#2e7d32' },
          { c: 0.5,  color: '#e65100' },
        ];

        for (const { c: k, color } of constants) {
          plotPoly(c2d, [k], -5, 5, { color, width: 2 });
          c2d.addText(`p = ${k}`, 3.5, k + 0.18, { color, size: 12 });
          c2d.addText(`D(p) = 0  ✓`, 3.5, k - 0.28, { color, size: 11 });
        }

        // zero line label
        c2d.addText('D(p) = 0 for every constant', -5.5, -3.5, { color: '#2e7d32', size: 13 });
        c2d.addText('ker(D) = P₀  — a 1D subspace of Pₙ', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 5: Image and Rank-Nullity ─────────────────────────────────────────
    {
      title: 'Image and Rank-Nullity',
      description: 'The image (range) of T is the set of all outputs T can produce. The rank-nullity theorem says the dimensions of the kernel and image must add up to the dimension of the domain — the map either compresses information into the kernel or expands it into the image, never both at once.',
      equation: `\\dim(\\ker T) + \\dim(\\operatorname{im} T) = \\dim V
        \\qquad \\underbrace{1}_{\\ker D} + \\underbrace{3}_{\\operatorname{im} D} = \\underbrace{4}_{\\dim P_3}`,
      notes: 'For D: P₃ → P₂:\n  ker(D) = {constants} — dimension 1\n  im(D) = P₂ — dimension 3 (every quadratic is some cubic\'s derivative)\n  dim P₃ = 4  →  1 + 3 = 4  ✓\n\nFor D: P₁ → P₀:\n  ker = {constants}, dim = 1\n  im = P₀ = {constants}, dim = 1\n  dim P₁ = 2  →  1 + 1 = 2  ✓\n\nRank-nullity is the linear algebra version of the first isomorphism theorem: V/ker(T) ≅ im(T). The quotient collapses the kernel, leaving a space that is isomorphic to the image.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();

        // Draw a dimension diagram using c2d.raw
        c2d.raw((ctx, cam) => {
          // domain box: P₃, dim 4
          const dx = -3, dy = 1.5, dw = 2.5, dh = 3.5;
          ctx.strokeStyle = '#1565c0';
          ctx.lineWidth   = 2;
          ctx.strokeRect(cam.wx(dx), cam.wy(dy), cam.ws(dw), cam.ws(-dh));

          // kernel sub-box inside domain
          const kh = 3.5 / 4;  // 1/4 of height for dim-1 kernel
          ctx.fillStyle   = '#c6282815';
          ctx.strokeStyle = '#c62828';
          ctx.lineWidth   = 1.5;
          ctx.fillRect(cam.wx(dx), cam.wy(dy - (dh - kh)), cam.ws(dw), cam.ws(kh));
          ctx.strokeRect(cam.wx(dx), cam.wy(dy - (dh - kh)), cam.ws(dw), cam.ws(kh));

          // image box: P₂, dim 3
          const ix = 1.5, iy = 1.5, iw = 2.5, ih = 2.625;
          ctx.fillStyle   = '#2e7d3215';
          ctx.strokeStyle = '#2e7d32';
          ctx.lineWidth   = 2;
          ctx.fillRect(cam.wx(ix), cam.wy(iy), cam.ws(iw), cam.ws(-ih));
          ctx.strokeRect(cam.wx(ix), cam.wy(iy), cam.ws(iw), cam.ws(-ih));

          // arrow from domain to image
          ctx.strokeStyle = '#555';
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(cam.wx(dx + dw), cam.wy(dy - dh/2));
          ctx.lineTo(cam.wx(ix), cam.wy(iy - ih/2));
          ctx.stroke();
          ctx.setLineDash([]);

          // arrowhead
          ctx.fillStyle = '#555';
          ctx.beginPath();
          ctx.moveTo(cam.wx(ix), cam.wy(iy - ih/2));
          ctx.lineTo(cam.wx(ix) - 10, cam.wy(iy - ih/2) - 5);
          ctx.lineTo(cam.wx(ix) - 10, cam.wy(iy - ih/2) + 5);
          ctx.closePath();
          ctx.fill();
        });

        // labels
        c2d.addText('V = P₃', -3.0, 2.1, { color: '#1565c0', size: 13 });
        c2d.addText('dim = 4', -2.9, 1.7, { color: '#1565c0', size: 12 });
        c2d.addText('ker(D)', -2.9, -1.7, { color: '#c62828', size: 12 });
        c2d.addText('dim = 1', -2.9, -2.1, { color: '#c62828', size: 12 });
        c2d.addText('D', -0.55, 0.3, { color: '#555', size: 14, italic: true });
        c2d.addText('W = P₂', 2.0, 2.1, { color: '#2e7d32', size: 13 });
        c2d.addText('im(D) = P₂', 1.9, 1.7, { color: '#2e7d32', size: 12 });
        c2d.addText('dim = 3', 2.0, 1.3, { color: '#2e7d32', size: 12 });

        c2d.addText('1  +  3  =  4', -5.5, -3.5, { color: '#333', size: 14 });
        c2d.addText('dim ker + dim im = dim V  ✓', -5.5, -4.1, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 6: Matrix Representation ─────────────────────────────────────────
    {
      title: 'Matrix Representation',
      description: 'Once you fix bases for V and W, any linear map T has a matrix. Column k of the matrix is the coordinate vector of T(bₖ) in the output basis. Differentiation D: P₂ → P₁ in the standard bases {1, x, x²} and {1, x} gives a concrete 2×3 matrix.',
      equation: `[D] = \\begin{pmatrix} 0 & 1 & 0 \\\\ 0 & 0 & 2 \\end{pmatrix}
        \\quad \\text{since }
        D(1)=0,\\; D(x)=1,\\; D(x^2)=2x`,
      notes: 'How to read the matrix: column k = coordinates of D(bₖ) in {1, x}.\n  D(1) = 0 = 0·1 + 0·x  →  column [0, 0]\n  D(x) = 1 = 1·1 + 0·x  →  column [1, 0]\n  D(x²) = 2x = 0·1 + 2·x →  column [0, 2]\n\nApplying the matrix is identical to differentiating:\n  p = 3 + 2x + x²  →  [3, 2, 1]ᵀ in {1,x,x²}\n  [D][3,2,1]ᵀ = [2, 2]ᵀ  →  2 + 2x  ✓\n\nThe basis choice is arbitrary — different bases give different matrices for the same D. The matrix changes; the map does not.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const bases = [
          { poly: [1, 0, 0], Dpoly: [0],    color: '#1565c0', label: 'b₁=1',  Dlabel: 'D(1)=0'  },
          { poly: [0, 1, 0], Dpoly: [1],    color: '#c62828', label: 'b₂=x',  Dlabel: 'D(x)=1'  },
          { poly: [0, 0, 1], Dpoly: [0, 2], color: '#2e7d32', label: 'b₃=x²', Dlabel: 'D(x²)=2x' },
        ];

        for (const { poly, Dpoly, color, label, Dlabel } of bases) {
          plotPoly(c2d, poly,  -2.5, 2.5, { color, width: 2, dash: [5,4] });
          plotPoly(c2d, Dpoly, -2.5, 2.5, { color, width: 2.5 });
        }

        // annotations at right edge
        c2d.addText('b₁=1 (dashed) → D(1)=0 (solid)', -5.5, 4.2, { color: '#1565c0', size: 11 });
        c2d.addText('b₂=x (dashed) → D(x)=1 (solid)', -5.5, 3.75, { color: '#c62828', size: 11 });
        c2d.addText('b₃=x² (dashed) → D(x²)=2x (solid)', -5.5, 3.3, { color: '#2e7d32', size: 11 });

        c2d.addText('[D] = [[0, 1, 0],', -5.5, -3.2, { color: '#333', size: 12 });
        c2d.addText('       [0, 0, 2]]', -5.5, -3.7, { color: '#333', size: 12 });
        c2d.addText('Columns = images of basis vectors, in output basis', -5.5, -4.2, { color: '#888', size: 11 });
      },
    },

    // ── Step 7: Transpose — Linear Map on Matrices ─────────────────────────────
    {
      title: 'Transpose: Linear Map on Matrices',
      description: 'The space M_{2×2} of 2×2 real matrices is a 4-dimensional vector space. The transpose map T(A) = Aᵀ is a linear map from M_{2×2} to itself. Its matrix in the standard basis {E₁₁, E₁₂, E₂₁, E₂₂} is a permutation matrix — it swaps the two off-diagonal basis elements.',
      equation: `T(A+B) = (A+B)^\\top = A^\\top + B^\\top = T(A)+T(B)
        \\qquad [T] = \\begin{pmatrix}1&0&0&0\\\\0&0&1&0\\\\0&1&0&0\\\\0&0&0&1\\end{pmatrix}`,
      notes: 'Drag the off-diagonal entry a₁₂ to see A and Aᵀ update. The diagonal entries stay fixed (transposing doesn\'t move them); only a₁₂ and a₂₁ swap.\n\nThe 4×4 matrix [T] above: column k gives the coordinates of T(Eₖ) in the standard basis.\n  T(E₁₁) = E₁₁ → [1,0,0,0]ᵀ  (fixed)\n  T(E₁₂) = E₂₁ → [0,0,1,0]ᵀ  (swapped)\n  T(E₂₁) = E₁₂ → [0,1,0,0]ᵀ  (swapped)\n  T(E₂₂) = E₂₂ → [0,0,0,1]ᵀ  (fixed)\n\nNote [T]² = I — transposing twice returns the original. T is its own inverse, making [T] an involution (and an orthogonal matrix!).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'off-diagonal entry a₁₂', -3, 3, 0.1, state.matA,
          v => v.toFixed(1), v => state.matA = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const a12 = state.matA;
        // A = [[2, a12], [0.8, -1]]
        const A  = [[2, a12], [0.8, -1]];
        const At = [[2, 0.8], [a12, -1]];

        function drawMatrix(c2d, mat, cx, cy, label, labelColor) {
          const sz   = 0.9;   // half-size of each cell in world units
          const pad  = 0.08;
          const cols = mat[0].length, rows = mat.length;
          const W = cols * sz * 2, H = rows * sz * 2;
          const x0 = cx - W / 2, y0 = cy + H / 2;

          c2d.raw((ctx, cam) => {
            // outer border
            ctx.strokeStyle = labelColor;
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(cam.wx(x0), cam.wy(y0), cam.ws(W), cam.ws(-H));

            // cell dividers
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth   = 1;
            for (let c = 1; c < cols; c++) {
              ctx.beginPath();
              ctx.moveTo(cam.wx(x0 + c * sz * 2), cam.wy(y0));
              ctx.lineTo(cam.wx(x0 + c * sz * 2), cam.wy(y0 - H));
              ctx.stroke();
            }
            for (let r = 1; r < rows; r++) {
              ctx.beginPath();
              ctx.moveTo(cam.wx(x0),     cam.wy(y0 - r * sz * 2));
              ctx.lineTo(cam.wx(x0 + W), cam.wy(y0 - r * sz * 2));
              ctx.stroke();
            }
          });

          // entry values
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const wx = x0 + (c + 0.5) * sz * 2;
              const wy = y0 - (r + 0.5) * sz * 2;
              const isSwapped = (r === 0 && c === 1) || (r === 1 && c === 0);
              const col = isSwapped ? '#e65100' : '#333';
              c2d.addText(mat[r][c].toFixed(1), wx - 0.18, wy + 0.12, { color: col, size: 13 });
            }
          }

          c2d.addText(label, cx, cy + H / 2 + 0.45, { color: labelColor, size: 13, align: 'center' });
        }

        drawMatrix(c2d, A,  -2.2, 0, 'A',  '#1565c0');
        drawMatrix(c2d, At,  2.2, 0, 'Aᵀ', '#c62828');

        // arrow between them
        c2d.addArrow(-0.7, 0, 0.7, 0, { color: '#555', width: 2 });
        c2d.addText('T(A) = Aᵀ', -0.45, 0.38, { color: '#555', size: 12 });

        c2d.addText('Orange entries swap across the diagonal', -5.5, -3.5, { color: '#e65100', size: 12 });
        c2d.addText('T is linear on M₂ₓ₂ — a 4-dimensional vector space', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

  ],
};
