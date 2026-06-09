// Kernel & Range of a Linear Transformation — Linear Algebra
//
// A linear map T : V → W (here T = A : ℝ² → ℝ²) has two subspaces attached:
//   range(T) = im(T) = { T(x) : x ∈ V }      ⊂ W   (codomain side — what comes out)
//   ker(T)   = { x ∈ V : T(x) = 0 }            ⊂ V   (domain side — what collapses to 0)
//
// Rank-nullity:  dim(ker T) + dim(range T) = dim V.
// Injective ⟺ ker T = {0}.   Surjective ⟺ range T = W.
//
// Worked transformation throughout (rank 1, so both subspaces are visible lines):
//   A = [[1,2],[2,4]]
//   columns c₁=[1,2], c₂=[2,4]=2c₁  → range(A) = span([1,2])  (line y = 2x in W)
//   A x = 0 ⇒ x + 2y = 0            → ker(A)   = span([2,−1]) (line y = −x/2 in V)
//   Image of the unit circle is the segment k·[1,2], k ∈ [−√5, √5] — a 1D collapse.

// ── Helpers ────────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `kr-${Math.random().toString(36).slice(2)}`;
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

// A = [[1,2],[2,4]] applied to a 2-vector
function apply(x) { return [x[0] + 2*x[1], 2*x[0] + 4*x[1]]; }

const SQ5 = Math.sqrt(5);
const RANGE_DIR = [1/SQ5,  2/SQ5];   // range(A) unit direction  (output space, line y=2x)
const KER_DIR   = [2/SQ5, -1/SQ5];   // ker(A)   unit direction  (input space,  line y=−x/2)

// ── Lesson ─────────────────────────────────────────────────────────────────────

export default {
  title:   'Kernel & Range',
  subject: 'Linear Algebra',

  initState: () => ({
    theta:    0,      // animated angle for the circle→segment collapse
    kerT:     1.3,    // scalar position along the kernel line (step 2)
    target:   1.2,    // which output on the range line we aim at (step 3)
    _controls: null,
  }),

  init(c2d, state, panelEl) {
    c2d.scale = 52;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: The range — what comes out ───────────────────────────────────
    {
      title: 'The Range — Everything T Can Output',
      description: 'A linear transformation $T$ sends each input vector to an output vector. The **range** (or **image**) is the set of *every* output it can possibly produce. Watch the unit circle of inputs get mapped: this rank-1 map crushes the whole circle onto a single line. That line is the range.',
      equation: `\\operatorname{range}(T) = \\operatorname{im}(T) = \\{\\, T(\\mathbf{x}) : \\mathbf{x} \\in V \\,\\} \\subseteq W`,
      notes: 'Here $T(\\mathbf{x}) = A\\mathbf{x}$ with $A=\\left(\\begin{smallmatrix}1&2\\\\2&4\\end{smallmatrix}\\right)$. Both columns point along $[1,2]$, so no input can ever produce an output off the line $y=2x$. The grey dot circles the input; the blue dot is its image, sliding back and forth along the 1D range. The range is always a subspace of the codomain $W$.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state, dt) {
        state.theta = (state.theta + dt * 0.7) % (Math.PI * 2);

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Range line drawn long; the image of the unit circle is the segment k·[1,2]
        c2d.showLine(
          [[-6.5*RANGE_DIR[0], -6.5*RANGE_DIR[1]], [6.5*RANGE_DIR[0], 6.5*RANGE_DIR[1]]],
          { color: '#1565c0', width: 3 });

        // Unit circle of inputs (grey)
        const circ = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          circ.push([Math.cos(a)*1.6, Math.sin(a)*1.6]);
        }
        c2d.showLine(circ, { color: '#bbb', width: 1.5 });

        // Animated input point and its image
        const x   = [Math.cos(state.theta)*1.6, Math.sin(state.theta)*1.6];
        const img = apply(x);
        c2d.showLine([[0,0], x], { color: '#999', width: 1, dash: [4,3] });
        c2d.showPoint(x[0], x[1], { radius: 5, color: '#777', label: 'x' });
        c2d.showLine([x, img], { color: '#1565c060', width: 1, dash: [3,3] });
        c2d.showArrow(0, 0, img[0], img[1], { color: '#1565c0', width: 2.5 });
        c2d.showPoint(img[0], img[1], { radius: 5, color: '#1565c0' });
        c2d.showText('T(x)', img[0]+0.2, img[1]+0.15, { color: '#1565c0', size: 12 });

        c2d.showText('range(T) = line y = 2x   (in codomain W)', -6.4, 4.6, { color: '#1565c0', size: 12 });
        c2d.showText('the whole input circle collapses onto it', -6.4, 4.1, { color: '#888', size: 12 });
        c2d.showText('rank(T) = dim range(T) = 1', -6.4, 3.6, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: The kernel — what collapses to zero ──────────────────────────
    {
      title: 'The Kernel — Inputs That Vanish',
      description: 'The **kernel** (or **null space**) is the set of inputs that $T$ sends to the zero vector. For our rank-1 map this is a whole line through the origin: slide the input along it and the output stays pinned at $\\mathbf{0}$. The kernel measures what the transformation *forgets*.',
      equation: `\\ker(T) = \\{\\, \\mathbf{x} \\in V : T(\\mathbf{x}) = \\mathbf{0} \\,\\} \\subseteq V`,
      notes: 'Solving $A\\mathbf{x}=\\mathbf{0}$ gives $x+2y=0$, so $\\ker(A)=\\operatorname{span}([2,-1]^\\top)$ — the line $y=-x/2$. Drag the red input anywhere along this line: $T(\\mathbf{x})$ never leaves the origin. Note $\\ker(T)$ lives in the **domain** $V$, while $\\operatorname{range}(T)$ lives in the **codomain** $W$ — different spaces. Its dimension is the **nullity**.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'input along ker(T)', -2.5, 2.5, 0.01, state.kerT,
          v => `t = ${v.toFixed(2)}`, v => state.kerT = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Kernel line (red, in the input space)
        c2d.addLine([[-6.5*KER_DIR[0], -6.5*KER_DIR[1]], [6.5*KER_DIR[0], 6.5*KER_DIR[1]]],
          { color: '#c62828', width: 2.5 });
        // Range line (faint blue, for orientation)
        c2d.addLine([[-6.5*RANGE_DIR[0], -6.5*RANGE_DIR[1]], [6.5*RANGE_DIR[0], 6.5*RANGE_DIR[1]]],
          { color: '#1565c040', width: 1.5, dash: [6,4] });

        // Input vector sliding along the kernel
        const t = state.kerT;
        const x = [KER_DIR[0]*t*2.4, KER_DIR[1]*t*2.4];
        c2d.showArrow(0, 0, x[0], x[1], { color: '#c62828', width: 2.5 });
        c2d.showText('x', x[0]+0.18, x[1]-0.22, { color: '#c62828', size: 13, italic: true });

        // Its image: the origin
        const img = apply(x);
        c2d.showPoint(img[0], img[1], { radius: 7, color: '#1565c0' });
        c2d.showText('T(x) = 0', 0.25, -0.35, { color: '#1565c0', size: 12 });

        c2d.addText('ker(T) = line y = −x/2   (in domain V)', -6.4, 4.6, { color: '#c62828', size: 12 });
        c2d.addText('range(T) shown faint for contrast', -6.4, 4.1, { color: '#1565c0', size: 12 });
        c2d.showText(`T([${x[0].toFixed(2)}, ${x[1].toFixed(2)}]) = [0, 0]`, -6.4, 3.6, { color: '#888', size: 12 });
      },
    },

    // ── Step 3: Fibers — the kernel organises every solution ─────────────────
    {
      title: 'Fibers — Why the Kernel Controls Solutions',
      description: 'Pick any target $\\mathbf{b}$ on the range. *Which* inputs map to it? Not one — a whole line of them, parallel to the kernel. Every solution of $T(\\mathbf{x})=\\mathbf{b}$ is one particular solution plus anything in the kernel. Slide $\\mathbf{b}$ along the range and watch its set of pre-images (its **fiber**) sweep across the domain.',
      equation: `T(\\mathbf{x}) = \\mathbf{b} \\iff \\mathbf{x} \\in \\mathbf{x}_p + \\ker(T) \\quad(\\text{a coset of the kernel})`,
      notes: 'For $\\mathbf{b}=s\\,[1,2]^\\top$ the equation $A\\mathbf{x}=\\mathbf{b}$ reduces to $x+2y=s$ — a line parallel to $\\ker(A)$, offset from it. The green dots are sample inputs on that fiber; all of them land on the single green target. This is exactly why solutions are unique only when $\\ker(T)=\\{\\mathbf{0}\\}$: a bigger kernel means a fatter solution set.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'target b on range', -1.8, 1.8, 0.01, state.target,
          v => `s = ${v.toFixed(2)}`, v => state.target = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Range line (blue) and kernel line (faint red, through origin)
        c2d.addLine([[-6.5*RANGE_DIR[0], -6.5*RANGE_DIR[1]], [6.5*RANGE_DIR[0], 6.5*RANGE_DIR[1]]],
          { color: '#1565c0', width: 2 });
        c2d.addLine([[-6.5*KER_DIR[0], -6.5*KER_DIR[1]], [6.5*KER_DIR[0], 6.5*KER_DIR[1]]],
          { color: '#c6282840', width: 1.5, dash: [6,4] });

        const s = state.target;
        const b = [s*1, s*2];   // target on range = s·[1,2]

        // Particular solution x_p = [s, 0]; fiber = x_p + span(ker)
        const xp = [s, 0];
        const fiber = [
          [xp[0] - 6*KER_DIR[0], xp[1] - 6*KER_DIR[1]],
          [xp[0] + 6*KER_DIR[0], xp[1] + 6*KER_DIR[1]],
        ];
        c2d.showLine(fiber, { color: '#2e7d32', width: 2.5 });

        // Sample inputs on the fiber → all map to b
        for (const k of [-1.6, -0.6, 0.6, 1.6]) {
          const x = [xp[0] + KER_DIR[0]*k, xp[1] + KER_DIR[1]*k];
          c2d.showPoint(x[0], x[1], { radius: 4, color: '#2e7d32' });
          c2d.showLine([x, b], { color: '#2e7d3230', width: 1, dash: [3,3] });
        }

        // The target b
        c2d.showArrow(0, 0, b[0], b[1], { color: '#2e7d32', width: 2.5 });
        c2d.showPoint(b[0], b[1], { radius: 6, color: '#1b5e20' });
        c2d.showText('b', b[0]+0.2, b[1]+0.2, { color: '#1b5e20', size: 13, italic: true });

        c2d.addText('fiber over b = xₚ + ker(T)  (green line)', -6.4, 4.6, { color: '#2e7d32', size: 12 });
        c2d.addText('every green input maps to the one green b', -6.4, 4.1, { color: '#888', size: 12 });
        c2d.showText(`solve x + 2y = ${s.toFixed(2)}  →  a whole line of x`, -6.4, 3.6, { color: '#555', size: 12 });
      },
    },

    // ── Step 4: Injective & surjective ───────────────────────────────────────
    {
      title: 'Injective, Surjective — Read From the Two Subspaces',
      description: 'The kernel and range answer the two fundamental questions about any map. $T$ is **injective** (one-to-one) exactly when nothing but $\\mathbf{0}$ collapses — $\\ker(T)=\\{\\mathbf{0}\\}$. $T$ is **surjective** (onto) exactly when the range fills the whole codomain. Our rank-1 map fails both: its kernel is a line, and its range misses most of the plane.',
      equation: `T \\text{ injective} \\iff \\ker(T)=\\{\\mathbf{0}\\} \\qquad T \\text{ surjective} \\iff \\operatorname{range}(T)=W`,
      notes: 'Because $\\ker(A)$ is 1-dimensional, distinct inputs collapse together (not injective). Because $\\operatorname{range}(A)$ is the line $y=2x$, most targets are unreachable (not surjective). A red target off the range has *no* solution; one on the range has infinitely many. For a square matrix the two properties coincide — both hold ⟺ $\\det A \\neq 0$ ⟺ $A$ is invertible.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Range line
        c2d.addLine([[-6.5*RANGE_DIR[0], -6.5*RANGE_DIR[1]], [6.5*RANGE_DIR[0], 6.5*RANGE_DIR[1]]],
          { color: '#1565c0', width: 2.5 });
        // Kernel line (faint)
        c2d.addLine([[-6.5*KER_DIR[0], -6.5*KER_DIR[1]], [6.5*KER_DIR[0], 6.5*KER_DIR[1]]],
          { color: '#c6282850', width: 1.5, dash: [6,4] });

        // Two distinct inputs that share an output (kills injectivity)
        const xa = [1.4, 0.2];
        const xb = [xa[0] + KER_DIR[0]*2.0, xa[1] + KER_DIR[1]*2.0];
        const imgShared = apply(xa); // == apply(xb)
        c2d.addArrow(0, 0, xa[0], xa[1], { color: '#6a1b9a', width: 2 });
        c2d.addArrow(0, 0, xb[0], xb[1], { color: '#6a1b9a', width: 2 });
        c2d.addText('x₁', xa[0]+0.15, xa[1]-0.25, { color: '#6a1b9a', size: 11 });
        c2d.addText('x₂', xb[0]+0.15, xb[1]-0.25, { color: '#6a1b9a', size: 11 });
        c2d.addLine([xa, imgShared], { color: '#6a1b9a30', width: 1, dash: [3,3] });
        c2d.addLine([xb, imgShared], { color: '#6a1b9a30', width: 1, dash: [3,3] });
        c2d.addPoint(imgShared[0], imgShared[1], { radius: 6, color: '#1565c0' });
        c2d.addText('x₁≠x₂ but T(x₁)=T(x₂)', imgShared[0]+0.2, imgShared[1]+0.15, { color: '#1565c0', size: 11 });

        // An unreachable target off the range (kills surjectivity)
        const off = [-2.6, 0.4];
        c2d.addPoint(off[0], off[1], { radius: 6, color: '#c62828' });
        c2d.addText('b ∉ range  (no solution)', off[0]-0.1, off[1]+0.35, { color: '#c62828', size: 11 });

        c2d.addText('not injective: ker(T) ≠ {0}', -6.4, 4.6, { color: '#6a1b9a', size: 12 });
        c2d.addText('not surjective: range(T) ≠ ℝ²', -6.4, 4.1, { color: '#c62828', size: 12 });
        c2d.addText('square + both ⟺ det ≠ 0 ⟺ invertible', -6.4, 3.6, { color: '#555', size: 12 });
      },
    },

    // ── Step 5: Rank-nullity ─────────────────────────────────────────────────
    {
      title: 'Rank–Nullity — The Dimensions Always Balance',
      description: 'The kernel and range are not independent: their dimensions must add up to the dimension of the domain. Whatever the transformation collapses (nullity) plus whatever survives as output (rank) accounts for every input dimension. This is the rank–nullity theorem.',
      equation: `\\underbrace{\\dim \\ker(T)}_{\\text{nullity}} + \\underbrace{\\dim \\operatorname{range}(T)}_{\\text{rank}} = \\dim V`,
      notes: 'For $A=\\left(\\begin{smallmatrix}1&2\\\\2&4\\end{smallmatrix}\\right)$: nullity $=1$, rank $=1$, and $1+1=2=\\dim V$ ✓. Push the kernel to $\\{\\mathbf{0}\\}$ (full rank) and the range grows to fill $\\mathbb{R}^2$; enlarge the kernel and the range must shrink. The theorem holds for *any* linear map between finite-dimensional spaces — e.g. differentiation on degree-$n$ polynomials has a 1-D kernel (the constants), so its range has dimension $n$.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Range — blue (codomain), kernel — red (domain)
        c2d.addLine([[-5.6*RANGE_DIR[0], -5.6*RANGE_DIR[1]], [5.6*RANGE_DIR[0], 5.6*RANGE_DIR[1]]],
          { color: '#1565c0', width: 2.5 });
        c2d.addArrow(0, 0, RANGE_DIR[0]*2.6, RANGE_DIR[1]*2.6, { color: '#1565c0', width: 2.5 });
        c2d.addText('range(T) — 1D', RANGE_DIR[0]*2.8+0.1, RANGE_DIR[1]*2.8+0.1, { color: '#1565c0', size: 12 });

        c2d.addLine([[-5.6*KER_DIR[0], -5.6*KER_DIR[1]], [5.6*KER_DIR[0], 5.6*KER_DIR[1]]],
          { color: '#c62828', width: 2.5, dash: [6,4] });
        c2d.addArrow(0, 0, KER_DIR[0]*2.6, KER_DIR[1]*2.6, { color: '#c62828', width: 2.5 });
        c2d.addText('ker(T) — 1D', KER_DIR[0]*2.8+0.1, KER_DIR[1]*2.8-0.1, { color: '#c62828', size: 12 });

        c2d.addText('nullity + rank = 1 + 1 = 2 = dim V  ✓', -6.4, 4.6, { color: '#555', size: 12 });
        c2d.addText('shrink the kernel → the range must grow', -6.4, 4.1, { color: '#888', size: 12 });
        c2d.addText('holds for any T between f.d. spaces', -6.4, 3.6, { color: '#888', size: 12 });
      },
    },

  ],
};
