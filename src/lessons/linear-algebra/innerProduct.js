function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `ip-${Math.random().toString(36).slice(2)}`;
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

export default {
  title: 'Inner Product',
  subject: 'Linear Algebra',

  initState: () => ({ w1: 1.0, w2: 1.0, alpha: 1.5, _controls: null }),

  init(c2d, state, panelEl) {
    c2d.scale = 55;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: Polynomials as vectors ────────────────────────────────────────
    {
      title: 'Polynomials Are Vectors',
      description: 'The set of all polynomials of degree ≤ 2 is a vector space. You can add any two and get another; you can scale any one by a number and stay in the space. No notion of length or angle is needed — just closure under addition and scaling.',
      equation: '(p_1 + p_2)(x) = p_1(x) + p_2(x) \\qquad (\\alpha\\, p)(x) = \\alpha\\,p(x)',
      notes: 'p₁(x) = x  (orange)\np₂(x) = 1 − x²  (red)\np₁ + p₂ = x + 1 − x²  (blue)\nα · p₁  (dashed — drag slider)\n\nThe basis is {1, x, x²}: every degree-≤-2 polynomial is a + bx + cx² for some a, b, c ∈ ℝ. This is a 3-dimensional vector space — each polynomial is really just a triple (a, b, c) in disguise.\n\nThe question the rest of this lesson answers: can we measure "angle" between two polynomials? That needs something the vector space axioms alone do not provide.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'scalar  α', 0.5, 2.5, 0.05, state.alpha,
          v => v.toFixed(2), v => { state.alpha = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const xL = -4.5, xR = 4.5, yS = 2.2;
        const toWX = t => xL + t * (xR - xL);
        const toWY = y => y * yS;

        // axes
        c2d.addLine([[xL - 0.3, 0], [xR + 0.3, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[xL, -0.12], [xL, 0.12]], { color: '#aaa', width: 1 });
        c2d.addLine([[0,   -0.12], [0,  0.12]], { color: '#aaa', width: 1 });
        c2d.addLine([[xR, -0.12], [xR, 0.12]], { color: '#aaa', width: 1 });
        c2d.addText('0', xL - 0.1, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('0.5', -0.25, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('1', xR - 0.12, -0.38, { color: '#aaa', size: 11 });

        function sample(fn) {
          const pts = [];
          for (let i = 0; i <= 200; i++) {
            const t = i / 200;
            pts.push([toWX(t), toWY(fn(t))]);
          }
          return pts;
        }

        const p1 = t => t;
        const p2 = t => 1 - t * t;
        const sum = t => p1(t) + p2(t);
        const scaled = t => state.alpha * p1(t);

        // α·p₁ dashed first (behind)
        c2d.addLine(sample(scaled), { color: '#e6510088', width: 1.5, dash: [5, 3] });

        // p₁, p₂, sum
        c2d.addLine(sample(p1),  { color: '#e65100', width: 2 });
        c2d.addLine(sample(p2),  { color: '#c62828', width: 2 });
        c2d.addLine(sample(sum), { color: '#1565c0', width: 2.5 });

        c2d.addText('p₁(x) = x',             xR + 0.15, toWY(p1(1)),  { color: '#e65100', size: 12 });
        c2d.addText('p₂(x) = 1−x²',           xR + 0.15, toWY(p2(1)) + 0.3, { color: '#c62828', size: 12 });
        c2d.addText('p₁+p₂',                  xR + 0.15, toWY(sum(1)), { color: '#1565c0', size: 12 });
        c2d.addText(`α·p₁  (α=${state.alpha.toFixed(2)})`,
          xR + 0.15, toWY(scaled(1)) - 0.35, { color: '#e65100aa', size: 11 });
      },
    },

    // ── Step 2: Matrices as vectors ───────────────────────────────────────────
    {
      title: '2×2 Matrices Are Vectors',
      description: 'The set of all 2×2 matrices is a vector space. Matrices can be added entry-by-entry and scaled by a number. The result is always another 2×2 matrix. This is a 4-dimensional vector space — each matrix is really four numbers.',
      equation: 'A + B = \\begin{pmatrix}a_{11}+b_{11}&a_{12}+b_{12}\\\\a_{21}+b_{21}&a_{22}+b_{22}\\end{pmatrix}',
      notes: 'The canvas shows how each matrix transforms the unit square (blue = A, red = B, green = A+B).\n\nA = [[1.5, 0.5], [0, 1]]\nB = [[0.5, 0], [0.5, 1]]\nA+B = [[2, 0.5], [0.5, 2]]\n\nThe four entries (a₁₁, a₁₂, a₂₁, a₂₂) are the "coordinates". The standard basis is the four matrices with a single 1 and zeros elsewhere — E₁₁, E₁₂, E₂₁, E₂₂.\n\nAgain: no length or angle yet. Can we say two matrices are "perpendicular"? That is an extra structure — an inner product — that we will add later.',
      setup(c2d, state) {
        clearControls(state);

        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const A = [1.5, 0.5, 0, 1];
        const B = [0.5, 0,   0.5, 1];
        const C = [A[0]+B[0], A[1]+B[1], A[2]+B[2], A[3]+B[3]];

        function txPts(M) {
          const tx = (x, y) => [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
          const p = [[0,0],[1,0],[1,1],[0,1]];
          return p.map(([x,y]) => tx(x, y));
        }

        function drawQuad(pts, fill, stroke) {
          c2d.raw((ctx, cam) => {
            ctx.beginPath();
            ctx.moveTo(cam.wx(pts[0][0]), cam.wy(pts[0][1]));
            pts.forEach(([x,y]) => ctx.lineTo(cam.wx(x), cam.wy(y)));
            ctx.closePath();
            ctx.fillStyle = fill;   ctx.fill();
            ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
          });
        }

        // Unit square (faint)
        drawQuad([[0,0],[1,0],[1,1],[0,1]], 'rgba(0,0,0,0.03)', '#ddd');

        drawQuad(txPts(A), 'rgba(21,101,192,0.12)', '#1565c0');
        drawQuad(txPts(B), 'rgba(198,40,40,0.12)',  '#c62828');
        drawQuad(txPts(C), 'rgba(46,125,50,0.15)',  '#2e7d32');

        c2d.addText('A  (blue)',     -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText('B  (red)',      -5.5, 3.7, { color: '#c62828', size: 12 });
        c2d.addText('A+B  (green)', -5.5, 3.2, { color: '#2e7d32', size: 12 });
        c2d.addText('unit square (faint)', -5.5, 2.7, { color: '#bbb', size: 11 });
      },
    },

    // ── Step 3: Continuous functions as vectors ───────────────────────────────
    {
      title: 'Continuous Functions Are Vectors',
      description: 'The set of all continuous functions on an interval — written C[a, b] — is a vector space. Functions can be added pointwise and scaled. Unlike polynomials or matrices, this space is infinite-dimensional: no finite list of basis functions spans it.',
      equation: '(f + g)(x) = f(x) + g(x) \\qquad (\\alpha f)(x) = \\alpha\\,f(x)',
      notes: 'f(x) = sin(x)  (blue)\ng(x) = sin(2x)/2  (red)\nf + g  (green)\nα · f  (dashed — drag slider)\n\nInfinite-dimensional means: to describe an arbitrary function in C[0, 2π] you generally need infinitely many "coordinates". The Fourier basis {1, sin x, cos x, sin 2x, cos 2x, …} is one such infinite basis.\n\nThis is the space where the inner product ⟨f, g⟩ = ∫f·g dx lives — the foundation of Fourier analysis, signal processing, and quantum mechanics.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'scalar  α', 0.5, 2.5, 0.05, state.alpha,
          v => v.toFixed(2), v => { state.alpha = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();

        const N = 300, xMax = 2 * Math.PI;
        const wXL = -5.0, wXR = 5.0;
        const toWX = t => wXL + (t / xMax) * (wXR - wXL);
        const toWY = y => y * 2.0;
        const wXPi = toWX(Math.PI);

        c2d.addLine([[wXL, 0], [wXR, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[wXL, -0.1],[wXL, 0.1]], { color: '#aaa', width: 1 });
        c2d.addLine([[wXPi,-0.1],[wXPi,0.1]], { color: '#aaa', width: 1 });
        c2d.addLine([[wXR, -0.1],[wXR, 0.1]], { color: '#aaa', width: 1 });
        c2d.addText('0',  wXL + 0.05, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('π',  wXPi - 0.1, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('2π', wXR - 0.42, -0.38, { color: '#aaa', size: 11 });

        function sample(fn) {
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const t = (i / N) * xMax;
            pts.push([toWX(t), toWY(fn(t))]);
          }
          return pts;
        }

        const f   = t => Math.sin(t);
        const g   = t => Math.sin(2 * t) / 2;
        const sum = t => f(t) + g(t);
        const sc  = t => state.alpha * f(t);

        c2d.addLine(sample(sc),  { color: '#1565c088', width: 1.5, dash: [5, 3] });
        c2d.addLine(sample(f),   { color: '#1565c0', width: 2 });
        c2d.addLine(sample(g),   { color: '#c62828', width: 2 });
        c2d.addLine(sample(sum), { color: '#2e7d32', width: 2.5 });

        c2d.addText('f(x) = sin(x)',     wXPi + 0.2, toWY(1) + 0.3,  { color: '#1565c0', size: 12 });
        c2d.addText('g(x) = sin(2x)/2', wXL + 0.1,  toWY(-0.5) - 0.3, { color: '#c62828', size: 12 });
        c2d.addText('f + g',            wXR - 1.2,  toWY(sum(5)) + 0.3, { color: '#2e7d32', size: 12 });
        c2d.addText(`α·f  (α=${state.alpha.toFixed(2)})`,
          wXPi - 1.0, toWY(sc(Math.PI / 2)) + 0.3, { color: '#1565c088', size: 11 });
      },
    },

    // ── Step 4: Dot product as a specific case ────────────────────────────────
    {
      title: 'The Dot Product — A Specific Case',
      description: 'The dot product assigns a scalar to any two vectors in ℝⁿ. It satisfies three special properties — symmetry, linearity, and positive-definiteness — that are the seed of a far more general idea.',
      equation: '\\langle \\mathbf{u},\\,\\mathbf{v}\\rangle = u_1 v_1 + u_2 v_2 + \\cdots + u_n v_n',
      notes: 'u = (2, 1),  v = (1, 2)\n⟨u, v⟩ = 2·1 + 1·2 = 4\n\nFrom here we write ⟨u, v⟩ to emphasise that the dot product is just one possible choice of inner product.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });
        c2d.addArrow(0, 0, 2, 1, { color: '#1565c0', width: 2.5 });
        c2d.addText('u = (2, 1)', 2.1, 0.85, { color: '#1565c0', size: 13 });
        c2d.addArrow(0, 0, 1, 2, { color: '#c62828', width: 2.5 });
        c2d.addText('v = (1, 2)', 1.1, 2.1, { color: '#c62828', size: 13 });
        c2d.addText('⟨u, v⟩ = 4  — a scalar, not a vector', -5.5, -3.8, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: The three axioms ───────────────────────────────────────────────
    {
      title: 'The Three Axioms',
      description: 'Any map ⟨·,·⟩ : V × V → ℝ satisfying these three properties is called an inner product on V. The vector space V together with that choice of inner product is an inner product space.',
      equation: '\\begin{aligned}\\langle u,\\,v\\rangle &= \\langle v,\\,u\\rangle & &\\text{(symmetry)}\\\\[4pt]\\langle \\alpha u + \\beta w,\\,v\\rangle &= \\alpha\\langle u,v\\rangle + \\beta\\langle w,v\\rangle & &\\text{(linearity)}\\\\[4pt]\\langle v,\\,v\\rangle &\\geq 0,\\quad\\text{and }= 0 \\iff v=\\mathbf{0} & &\\text{(positive-definiteness)}\\end{aligned}',
      notes: 'The standard dot product satisfies all three — it is the canonical example.\n\nBut many other maps satisfy them too: weighted sums on ℝⁿ, integrals over function spaces, and more. Any such map inherits the full geometric toolkit: length, angle, projection, orthogonality.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });
        c2d.addArrow(0, 0, 2, 1, { color: '#1565c0', width: 2 });
        c2d.addArrow(0, 0, 1, 2, { color: '#c62828', width: 2 });
        c2d.addText('u', 2.15, 0.85, { color: '#1565c0', size: 14, italic: true });
        c2d.addText('v', 1.05, 2.12, { color: '#c62828', size: 14, italic: true });
        c2d.addText('V — any vector space', -5.5, 4.25, { color: '#bbb', size: 12 });
      },
    },

    // ── Step 3: Weighted inner product (interactive) ───────────────────────────
    {
      title: 'Example: Weighted Inner Product on ℝ²',
      description: 'When your two dimensions have different scales or importance — price vs. quantity, a noisy variable vs. a precise one — the standard dot product gives misleading geometry. A weighted inner product lets you control how much each dimension contributes. The axioms still hold, but the notion of orthogonality changes.',
      equation: '\\langle \\mathbf{u},\\,\\mathbf{v}\\rangle_{W} = w_1\\,u_1 v_1 + w_2\\,u_2 v_2',
      notes: 'u = (2, 1) and v = (−1, 4) are fixed.\n⟨u, v⟩_W = w₁·(2)(−1) + w₂·(1)(4) = −2w₁ + 4w₂\n\nThe dashed green line is the orthogonal complement of v — every vector d satisfying ⟨d, v⟩_W = 0. Solving: w₁·(−1)·d₁ + w₂·4·d₂ = 0, so d points in direction (4w₂, w₁). This line rotates as you adjust the weights.\n\nWhen u lands on that line, ⟨u, v⟩_W = 0: u and v are orthogonal under this inner product even though they are not Euclidean-perpendicular.\n\nOrthogonality is not an absolute fact — it is a choice. Two vectors are "unrelated" only relative to a specific inner product. The Mahalanobis distance in statistics is exactly this: weight each dimension by 1/σ², so variables with high variance count for less. Points "equally statistically surprising" then sit on a circle in the weighted geometry, not an ellipse.',
      setup(c2d, state) {
        clearControls(state);
        state.w2 = state.w2 ?? 1.0;
        addSlider(state._controls, 'weight  w₁', 0.5, 4, 0.05, state.w1,
          v => v.toFixed(2), v => { state.w1 = v; });
        addSlider(state._controls, 'weight  w₂', 0.5, 4, 0.05, state.w2,
          v => v.toFixed(2), v => { state.w2 = v; });
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const w1 = state.w1;
        const w2 = state.w2 ?? 1.0;

        // v = (-1, 4) — fixed, red
        c2d.addArrow(0, 0, -1, 4, { color: '#c62828', width: 2.5 });
        c2d.addText('v', -1.45, 4.15, { color: '#c62828', size: 14, italic: true });

        // orthogonal complement of v under ⟨·,·⟩_W:
        // w1·(-1)·d1 + w2·4·d2 = 0  →  direction (4w2, w1)
        const dx = 4 * w2, dy = w1;
        const dLen = Math.sqrt(dx * dx + dy * dy);
        const ext = 5.2;
        c2d.addLine([
          [-dx / dLen * ext, -dy / dLen * ext],
          [ dx / dLen * ext,  dy / dLen * ext],
        ], { color: '#2e7d3268', width: 1.5, dash: [6, 4] });
        c2d.addText('vectors ⊥ to v  (⟨d, v⟩_W = 0)',
          dx / dLen * ext * 0.55 + 0.1,
          dy / dLen * ext * 0.55 + 0.28,
          { color: '#2e7d32', size: 11 });

        // u = (2, 1) — blue
        c2d.addArrow(0, 0, 2, 1, { color: '#1565c0', width: 2.5 });
        c2d.addText('u', 2.15, 0.85, { color: '#1565c0', size: 14, italic: true });

        // inner product value: -2w1 + 4w2
        const ip = -2 * w1 + 4 * w2;
        const isZero = Math.abs(ip) < 0.15;
        c2d.addText(
          `⟨u, v⟩_W  =  −2·${w1.toFixed(2)} + 4·${w2.toFixed(2)}  =  ${ip.toFixed(2)}`,
          -5.5, -3.5, { color: isZero ? '#2e7d32' : '#555', size: 12 }
        );
        if (isZero) {
          c2d.addText('u ⊥ v  under this inner product!', -5.5, -4.1, { color: '#2e7d32', size: 12 });
        }
      },
    },

    // ── Step 4: Function space L² ─────────────────────────────────────────────
    {
      title: 'Example: Function Space L²[0, 2π]',
      description: 'Continuous functions on [0, 2π] form a vector space — we can add them and scale them. Define an inner product by integration. Under it, sin and cos are orthogonal — the fact underlying all of Fourier analysis.',
      equation: '\\langle f,\\,g\\rangle_{L^2} = \\int_0^{2\\pi} f(x)\\,g(x)\\,dx',
      notes: '∫₀^{2π} sin(x)·cos(x) dx = 0      →  sin ⊥ cos\n∫₀^{2π} sin²(x) dx = π              →  ‖sin‖ = √π\n∫₀^{2π} cos²(x) dx = π              →  ‖cos‖ = √π\n\nThe orange curve is the integrand f·g = sin·cos. Its positive and negative areas cancel exactly — that is ⟨sin, cos⟩ = 0.',
      setup(c2d, state) {
        clearControls(state);

        const N = 300;
        const xMax = 2 * Math.PI;
        const wXL = -5.3, wXR = 5.3;
        const toWX = t => wXL + (t / xMax) * (wXR - wXL);
        const toWY = y => y * 1.6;
        const wXPi = toWX(Math.PI);

        // axes
        c2d.addLine([[wXL, 0], [wXR, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[0, -2.2], [0, 2.2]], { color: '#eee', width: 1 });

        // tick marks
        c2d.addLine([[wXL, -0.09], [wXL,  0.09]], { color: '#aaa', width: 1 });
        c2d.addLine([[wXPi, -0.09], [wXPi, 0.09]], { color: '#aaa', width: 1 });
        c2d.addLine([[wXR, -0.09], [wXR,  0.09]], { color: '#aaa', width: 1 });

        // tick labels
        c2d.addText('0',  wXL + 0.1, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('π',  wXPi - 0.08, -0.38, { color: '#aaa', size: 11 });
        c2d.addText('2π', wXR - 0.45, -0.38, { color: '#aaa', size: 11 });

        // sample a curve into world-coordinate point array
        function sample(fn) {
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const t = (i / N) * xMax;
            pts.push([toWX(t), toWY(fn(t))]);
          }
          return pts;
        }

        // sin·cos filled region
        c2d.raw((ctx, cam) => {
          const scPts = sample(t => Math.sin(t) * Math.cos(t));
          ctx.beginPath();
          ctx.fillStyle = '#e6510018';
          ctx.moveTo(cam.wx(wXL), cam.wy(0));
          scPts.forEach(([x, y]) => ctx.lineTo(cam.wx(x), cam.wy(y)));
          ctx.lineTo(cam.wx(wXR), cam.wy(0));
          ctx.closePath();
          ctx.fill();
        });

        // curves
        c2d.addLine(sample(t => Math.sin(t)), { color: '#1565c0', width: 2 });
        c2d.addLine(sample(t => Math.cos(t)), { color: '#c62828', width: 2 });
        c2d.addLine(sample(t => Math.sin(t) * Math.cos(t)), { color: '#e65100', width: 1.5 });

        // labels
        c2d.addText('cos(x)', wXL + 0.15, toWY(1) + 0.3,  { color: '#c62828', size: 12 });
        c2d.addText('sin(x)', wXPi - 0.5, toWY(1) + 0.3,  { color: '#1565c0', size: 12 });
        c2d.addText('sin·cos  (area = 0)', wXPi + 0.3, toWY(-0.5) - 0.25, { color: '#e65100', size: 12 });
      },
    },

    // ── Step 5: Induced norm and angle ────────────────────────────────────────
    {
      title: 'Induced Norm and Angle',
      description: 'Every inner product automatically defines a notion of length and angle. The same formulas hold in ℝⁿ, function spaces, or any inner product space — all geometry flows from the single operation ⟨·,·⟩.',
      equation: '\\|v\\| = \\sqrt{\\langle v,\\,v\\rangle} \\qquad \\cos\\theta = \\frac{\\langle u,\\,v\\rangle}{\\|u\\|\\,\\|v\\|}',
      notes: 'For u=(2,1), v=(1,2) with the standard inner product:\n‖u‖ = √5 ≈ 2.24,   ‖v‖ = √5 ≈ 2.24\ncos θ = 4/5   →   θ ≈ 36.9°\n\nIn L²: ‖sin‖ = ‖cos‖ = √π,  ⟨sin, cos⟩ = 0  →  θ = 90°\n\nThe circle marks ‖u‖ = ‖v‖ = √5.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ux = 2, uy = 1, vx = 1, vy = 2;
        const uLen = Math.sqrt(ux * ux + uy * uy);
        const vLen = Math.sqrt(vx * vx + vy * vy);
        const ip   = ux * vx + uy * vy;
        const theta = Math.acos(ip / (uLen * vLen));

        // radius circle at ‖u‖ = √5
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.strokeStyle = '#1565c020';
          ctx.lineWidth = 1;
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(Math.sqrt(5)), 0, Math.PI * 2);
          ctx.stroke();
        });

        c2d.addArrow(0, 0, ux, uy, { color: '#1565c0', width: 2.5 });
        c2d.addArrow(0, 0, vx, vy, { color: '#c62828', width: 2.5 });
        c2d.addText('u', ux + 0.15, uy - 0.12, { color: '#1565c0', size: 14, italic: true });
        c2d.addText('v', vx + 0.1,  vy + 0.12, { color: '#c62828', size: 14, italic: true });

        // angle arc between u and v
        c2d.raw((ctx, cam) => {
          const aU = Math.atan2(-uy, ux);  // canvas angle for u
          const aV = Math.atan2(-vy, vx);  // canvas angle for v
          ctx.beginPath();
          ctx.strokeStyle = '#e65100';
          ctx.lineWidth = 1.5;
          // aV ≈ -1.107 < aU ≈ -0.464: draw clockwise from aV to aU
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(0.6), aV, aU, false);
          ctx.stroke();
        });
        c2d.addText('θ', 0.5, 0.52, { color: '#e65100', size: 13 });

        c2d.addText(`‖u‖ = √5 ≈ ${uLen.toFixed(2)}`, -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText(`‖v‖ = √5 ≈ ${vLen.toFixed(2)}`, -5.5, 3.7, { color: '#555', size: 12 });
        c2d.addText(`θ = arccos(4/5) ≈ ${(theta * 180 / Math.PI).toFixed(1)}°`, -5.5, 3.2, { color: '#555', size: 12 });
      },
    },

    // ── Step 6: Cauchy-Schwarz ─────────────────────────────────────────────────
    {
      title: 'Cauchy-Schwarz Inequality',
      description: 'In any inner product space, the magnitude of an inner product is bounded by the product of the norms. This universal inequality proves the angle formula always gives a valid cosine — and implies the triangle inequality.',
      equation: '|\\langle u,\\,v\\rangle| \\leq \\|u\\|\\,\\|v\\|',
      notes: 'For u=(2,1), v=(1,2):\n|⟨u,v⟩| = 4 ≤ √5·√5 = 5  ✓\n\nEquality holds iff u ∥ v (one is a scalar multiple of the other).\n\nConsequences in every inner product space:\n• cos θ ∈ [−1, 1] — angles are well-defined\n• Triangle inequality: ‖u + v‖ ≤ ‖u‖ + ‖v‖\n• In L²: |∫fg dx| ≤ √(∫f²) · √(∫g²)',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        c2d.addArrow(0, 0, 2, 1, { color: '#1565c0', width: 2.5 });
        c2d.addArrow(0, 0, 1, 2, { color: '#c62828', width: 2.5 });
        c2d.addText('u', 2.15, 0.85, { color: '#1565c0', size: 14, italic: true });
        c2d.addText('v', 1.05, 2.12, { color: '#c62828', size: 14, italic: true });

        // bounding circle at radius √5
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.strokeStyle = '#1565c020';
          ctx.lineWidth = 1;
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(Math.sqrt(5)), 0, Math.PI * 2);
          ctx.stroke();
        });

        c2d.addText('|⟨u, v⟩| = 4', -5.5, 4.2, { color: '#555', size: 13 });
        c2d.addText('‖u‖ · ‖v‖ = √5 · √5 = 5', -5.5, 3.7, { color: '#555', size: 13 });
        c2d.addText('4 ≤ 5  ✓  (equality ↔ u ∥ v)', -5.5, 3.2, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 7: Generalized projection ────────────────────────────────────────
    {
      title: 'Generalized Projection',
      description: 'The projection formula uses only inner product operations, so it works unchanged in any inner product space — ℝⁿ, L², or beyond. Applying it repeatedly to extract orthogonal components is the Gram-Schmidt process.',
      equation: '\\operatorname{proj}_{\\mathbf{w}}\\mathbf{u} = \\frac{\\langle \\mathbf{u},\\,\\mathbf{w}\\rangle}{\\langle \\mathbf{w},\\,\\mathbf{w}\\rangle}\\,\\mathbf{w}',
      notes: 'u = (2, 1), w = (1, 2)\n⟨u, w⟩ = 4,   ⟨w, w⟩ = 5\nproj = (4/5)·(1, 2) = (0.8, 1.6)\nu − proj = (1.2, −0.6)  ⊥ w  ✓\n\nIn function spaces:\nproj_g f = ⟨f, g⟩/⟨g, g⟩ · g\nThis is how Fourier coefficients are computed: each aₙ = ⟨f, sin(nx)⟩/⟨sin(nx), sin(nx)⟩.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const ux = 2, uy = 1;
        const wx = 1, wy = 2;
        const s  = (ux * wx + uy * wy) / (wx * wx + wy * wy);  // 4/5
        const px = s * wx, py = s * wy;
        const rx = ux - px, ry = uy - py;

        // w
        c2d.addArrow(0, 0, wx, wy, { color: '#c62828', width: 2.5 });
        c2d.addText('w', wx + 0.1, wy + 0.12, { color: '#c62828', size: 14, italic: true });

        // u
        c2d.addArrow(0, 0, ux, uy, { color: '#1565c0', width: 2.5 });
        c2d.addText('u', ux + 0.15, uy - 0.12, { color: '#1565c0', size: 14, italic: true });

        // projection vector
        c2d.addArrow(0, 0, px, py, { color: '#e65100', width: 2.5 });
        c2d.addText('proj', px + 0.1, py - 0.32, { color: '#e65100', size: 13 });

        // perpendicular remainder (dashed)
        c2d.addLine([[px, py], [ux, uy]], { color: '#999', width: 1.5, dash: [4, 3] });

        // right-angle marker at foot of perpendicular
        const wLen = Math.sqrt(wx * wx + wy * wy);
        const wu   = [wx / wLen, wy / wLen];
        const perp = [-wu[1], wu[0]];
        const ms   = 0.15;
        c2d.addLine([
          [px + perp[0] * ms,            py + perp[1] * ms           ],
          [px + perp[0] * ms + wu[0]*ms, py + perp[1] * ms + wu[1]*ms],
          [px + wu[0] * ms,              py + wu[1] * ms              ],
        ], { color: '#999', width: 1 });

        c2d.addText(`proj = (${px.toFixed(1)}, ${py.toFixed(1)})`, -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText(`u − proj = (${rx.toFixed(1)}, ${ry.toFixed(1)})  ⊥ w`, -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

  ],
};
