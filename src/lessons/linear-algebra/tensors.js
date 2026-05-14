// Tensors
//
// A tensor is an object that transforms consistently under changes of
// coordinate system. Scalars, vectors, and matrices are all special cases.
//
// Rank 0: scalar   — no indices,  survives rotation unchanged
// Rank 1: vector   — one index,   components change but arrow stays fixed
// Rank 2: tensor   — two indices, takes a vector → gives a vector
//
// The inertia dyadic J (Thomson §5.2) is a rank-2 tensor: h = J·ω

// ── Helpers ───────────────────────────────────────────────────────────────────

function tx(M, x, y) {
  return [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
}

// 2D rotation matrix
function rot2(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c, -s, s, c];
}

// Transform a 2×2 tensor T under rotation R: T' = R T Rᵀ
function transformTensor(R, T) {
  // T' = R T Rᵀ
  // First compute T Rᵀ, then R(T Rᵀ)
  const Rt = [R[0], R[2], R[1], R[3]]; // transpose
  const TRt = [
    T[0]*Rt[0] + T[1]*Rt[2],  T[0]*Rt[1] + T[1]*Rt[3],
    T[2]*Rt[0] + T[3]*Rt[2],  T[2]*Rt[1] + T[3]*Rt[3],
  ];
  return [
    R[0]*TRt[0] + R[1]*TRt[2],  R[0]*TRt[1] + R[1]*TRt[3],
    R[2]*TRt[0] + R[3]*TRt[2],  R[2]*TRt[1] + R[3]*TRt[3],
  ];
}

// Eigenvalues of a 2×2 symmetric matrix [[a,b],[b,d]]
function eig2(a, b, d) {
  const tr  = a + d;
  const det = a*d - b*b;
  const disc = Math.sqrt(Math.max(0, tr*tr/4 - det));
  const l1 = tr/2 + disc;
  const l2 = tr/2 - disc;
  // Eigenvectors
  let v1, v2;
  if (Math.abs(b) > 1e-10) {
    v1 = normalise([l1 - d, b]);
    v2 = normalise([l2 - d, b]);
  } else {
    v1 = a >= d ? [1,0] : [0,1];
    v2 = a >= d ? [0,1] : [1,0];
  }
  return { l1, l2, v1, v2 };
}

function normalise([x, y]) {
  const m = Math.sqrt(x*x + y*y);
  return m < 1e-10 ? [1,0] : [x/m, y/m];
}

// Controls
function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `ten-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span>
      <span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
           style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const lbl = wrap.querySelector(`[id="${id}-v"]`);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    lbl.textContent = fmt(v);
    onChange(v);
  });
}

// Draw a 2×2 matrix as colour-coded text
function drawMatrix2(c2d, M, wx, wy, title, diagColor, offColor) {
  c2d.raw((ctx, cam) => {
    const x0 = cam.wx(wx), y0 = cam.wy(wy);
    const cw = 36, rh = 17;

    ctx.font = '11px system-ui';
    ctx.fillStyle = '#888';
    if (title) ctx.fillText(title, x0, y0 - 4);

    const entries = [
      [M[0].toFixed(2), M[1].toFixed(2)],
      [M[2].toFixed(2), M[3].toFixed(2)],
    ];
    entries.forEach((row, i) => {
      row.forEach((v, j) => {
        ctx.fillStyle = (i === j) ? diagColor : offColor;
        ctx.font = (i === j) ? 'bold 11px system-ui' : '11px system-ui';
        ctx.fillText(v, x0 + 10 + j*cw, y0 + 4 + i*rh);
      });
    });

    // Brackets
    const mx = x0 + 4, my = y0 - 8, mw = 2*cw + 14, mh = 2*rh + 2;
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx+4,my); ctx.lineTo(mx,my); ctx.lineTo(mx,my+mh); ctx.lineTo(mx+4,my+mh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx+mw-4,my); ctx.lineTo(mx+mw,my); ctx.lineTo(mx+mw,my+mh); ctx.lineTo(mx+mw-4,my+mh); ctx.stroke();
  });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Tensors',
  subject: 'Linear Algebra',

  initState: () => ({
    angleDeg: 30,
    rotDeg:   40,
    omegaDeg: 25,
    _controls: null,
  }),

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: Rank — scalar, vector, matrix ────────────────────────────────
    {
      title: 'Rank — Scalar, Vector, Matrix',
      description: 'Tensors are a hierarchy. A scalar (rank 0) is a single number. A vector (rank 1) is an array of numbers with a direction. A matrix used as a linear map (rank 2) takes a vector and gives a vector. All three are tensors — they differ only in how many indices they carry.',
      equation: '\\underbrace{T}_{\\text{rank 0}} \\quad \\underbrace{v_i}_{\\text{rank 1}} \\quad \\underbrace{T_{ij}}_{\\text{rank 2}} \\quad \\underbrace{T_{ijk}}_{\\text{rank 3}}\\,\\cdots',
      notes: 'The rank counts how many vectors the tensor "eats". A scalar eats none. A vector eats one (via dot product). A rank-2 tensor eats one vector and produces another.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        // Rank 0 — scalar: a temperature value at a point
        c2d.addPoint(-3.5, 2.5, { radius: 14, color: 'rgba(21,101,192,0.15)' });
        c2d.addText('T = 5.2', -3.5, 2.5, { color: '#1565c0', size: 11, align: 'center' });
        c2d.addText('scalar', -3.5, 2.0, { color: '#aaa', size: 10, align: 'center' });
        c2d.addText('rank 0', -3.5, 1.6, { color: '#bbb', size: 10, align: 'center' });

        // Rank 1 — vector: arrow
        c2d.addArrow(0, 1.5, 1.8, 2.8, { color: '#c62828', width: 2.5 });
        c2d.addText('v', 2.0, 2.9, { color: '#c62828', size: 13, italic: true });
        c2d.addText('vector', 0.8, 1.3, { color: '#aaa', size: 10 });
        c2d.addText('rank 1', 0.8, 0.9, { color: '#bbb', size: 10 });

        // Rank 2 — matrix: takes v gives w
        const M = [2, 0.8, 0.3, 1.5];
        const v = [1.5, 1.0];
        const [wx_, wy_] = tx(M, v[0], v[1]);
        const scale = 0.6;
        c2d.addArrow(-3, -1, -3 + v[0]*scale, -1 + v[1]*scale, { color: '#888', width: 2 });
        c2d.addText('v', -3 + v[0]*scale + 0.1, -1 + v[1]*scale, { color: '#888', size: 12, italic: true });
        c2d.addArrow(-3, -1, -3 + wx_*scale, -1 + wy_*scale, { color: '#2e7d32', width: 2.5 });
        c2d.addText('Tv', -3 + wx_*scale + 0.1, -1 + wy_*scale, { color: '#2e7d32', size: 12, italic: true });
        c2d.addText('rank 2', -4.5, -1.8, { color: '#bbb', size: 10 });
        c2d.addText('tensor', -4.5, -2.2, { color: '#aaa', size: 10 });

        drawMatrix2(c2d, M, -1.5, -0.5, 'T =', '#2e7d32', '#c62828');

        // Labels
        c2d.addText('rank 0 — no indices — one number', -5.5, 4.2, { color: '#1565c0', size: 11 });
        c2d.addText('rank 1 — one index vᵢ — a direction', -5.5, 3.75, { color: '#c62828', size: 11 });
        c2d.addText('rank 2 — two indices Tᵢⱼ — maps v → Tv', -5.5, 3.3, { color: '#2e7d32', size: 11 });
      },
    },

    // ── Step 2: Why not just a matrix? ──────────────────────────────────────
    {
      title: 'Why Not Just a Matrix?',
      description: 'A matrix is a grid of numbers. When you rotate your coordinate frame, those numbers change — but the physics must not. There are many ways to "transform" a matrix; only one keeps the physics consistent across all frames. Rotating by R on one side only breaks it.',
      equation: "\\underbrace{J_{\\text{bad}} = RJ}_{\\text{one factor — breaks physics}} \\qquad \\underbrace{J' = RJR^\\top}_{\\text{two factors — preserves physics}}",
      notes: 'Drag the frame rotation slider. Orange shows what the naive one-sided transform predicts for h — a different physical vector in every frame. Red is the true h = Jω, frame-independent. The correct two-sided transform (T′ = RTRᵀ) always reproduces the same physical h.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'coordinate frame rotation (degrees)', 0, 360, 1, state.rotDeg,
          v => `${Math.round(v)}°`, v => state.rotDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        const J = [7, -3, -3, 8];
        const theta = state.rotDeg * Math.PI / 180;
        const R = rot2(theta);

        // Fixed ω in world frame
        const omega = normalise([1.0, 0.5]);
        const omegaScaled = [omega[0] * 2.2, omega[1] * 2.2];

        // True h = Jω — the frame-independent physical answer
        const h = tx(J, omega[0], omega[1]);
        const hMag = Math.sqrt(h[0]*h[0] + h[1]*h[1]);
        const hScale = 2.5 / Math.max(hMag, 0.01);

        // Naive wrong transform: J_bad = RJ
        // What it predicts for h in world coords = Rᵀ · (J_bad · Rω) = Rᵀ · RJ · Rω = J · Rω
        const Romega = tx(R, omega[0], omega[1]);
        const h_naive = tx(J, Romega[0], Romega[1]);
        const h_naive_mag = Math.sqrt(h_naive[0]*h_naive[0] + h_naive[1]*h_naive[1]);
        const h_naive_scale = 2.5 / Math.max(h_naive_mag, 0.01);

        // Discrepancy angle between h_naive and h_true
        const dot = h[0]*h_naive[0] + h[1]*h_naive[1];
        const cosA = dot / Math.max(hMag * h_naive_mag, 0.01);
        const discrepancy = Math.acos(Math.max(-1, Math.min(1, cosA))) * 180 / Math.PI;

        // Rotated frame axes (dashed)
        const ax = [Math.cos(theta)*3.5, Math.sin(theta)*3.5];
        const ay = [-Math.sin(theta)*3.0, Math.cos(theta)*3.0];
        c2d.addLine([[0,0],[ax[0],ax[1]]], { color: '#1565c0', width: 1.5, dash: [5,4] });
        c2d.addLine([[0,0],[ay[0],ay[1]]], { color: '#1565c0', width: 1.5, dash: [5,4] });
        c2d.addText("x'", ax[0]+0.12, ax[1]+0.1, { color: '#9ebce8', size: 11, italic: true });
        c2d.addText("y'", ay[0]+0.1, ay[1]+0.12, { color: '#9ebce8', size: 11, italic: true });

        // ω (fixed, world frame)
        c2d.addArrow(0, 0, omegaScaled[0], omegaScaled[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('ω', omegaScaled[0]+0.12, omegaScaled[1]+0.1, { color: '#1565c0', size: 13, italic: true });

        // h_naive (orange — wrong)
        c2d.addArrow(0, 0, h_naive[0]*h_naive_scale, h_naive[1]*h_naive_scale, { color: '#e65100', width: 2.5 });
        c2d.addText('h  (naive RJ)', h_naive[0]*h_naive_scale+0.1, h_naive[1]*h_naive_scale+0.12,
          { color: '#e65100', size: 11, italic: true });

        // h_true (red — always correct)
        c2d.addArrow(0, 0, h[0]*hScale, h[1]*hScale, { color: '#c62828', width: 3 });
        c2d.addText('h = Jω  ✓', h[0]*hScale+0.1, h[1]*hScale-0.2,
          { color: '#c62828', size: 11, italic: true });

        const ok = discrepancy < 1.5;
        c2d.addText(
          ok ? '✓ θ ≈ 0 — naive happens to agree' : `✗ discrepancy: ${discrepancy.toFixed(1)}° — physics changed frames!`,
          -5.5, 4.3, { color: ok ? '#2e7d32' : '#b71c1c', size: 12 }
        );
        c2d.addText('orange: naive J_bad = RJ  predicts a different physical h each frame', -5.5, 3.85, { color: '#e65100', size: 11 });
        c2d.addText('red: true h = Jω  — same vector regardless of frame', -5.5, 3.4, { color: '#c62828', size: 11 });
        c2d.addText("fix: use T' = RTRᵀ — two R factors, one per index — next step →", -5.5, 2.95, { color: '#555', size: 11 });

        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
      },
    },

    // ── Step 3: The transformation law ──────────────────────────────────────
    {
      title: 'The Transformation Law',
      description: 'What makes a tensor a tensor — not just a grid of numbers — is that its components transform in a specific, lawful way when you rotate your coordinate axes. The physical object stays the same; only its description in numbers changes.',
      equation: "T'_{ij} = R_{ik}\\,R_{jl}\\,T_{kl} \\qquad (\\text{or }\\mathbf{T}' = R\\,\\mathbf{T}\\,R^\\top \\text{ in 2D})",
      notes: 'Rotate the frame with the slider. The vector arrow stays fixed in space — but its components (numbers) change. The tensor T transforms by two rotation factors (one per index). A scalar transforms by zero — it never changes.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'coordinate frame rotation  (degrees)', 0, 360, 1, state.rotDeg,
          v => `${Math.round(v)}°`, v => state.rotDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });

        const theta = state.rotDeg * Math.PI / 180;
        const R = rot2(theta);

        // Original (world) axes — faint
        c2d.addLine([[-5,0],[5,0]], { color: '#e8e8e8', width: 1 });
        c2d.addLine([[0,-4],[0,4]], { color: '#e8e8e8', width: 1 });

        // Rotated frame axes
        const ax = [Math.cos(theta)*4.5, Math.sin(theta)*4.5];
        const ay = [-Math.sin(theta)*3.5, Math.cos(theta)*3.5];
        c2d.addLine([[0,0],[ax[0],ax[1]]], { color: '#1565c0', width: 1.5, dash: [5,4] });
        c2d.addLine([[0,0],[ay[0],ay[1]]], { color: '#1565c0', width: 1.5, dash: [5,4] });
        c2d.addText("x'", ax[0]+0.15, ax[1]+0.1, { color: '#1565c0', size: 11, italic: true });
        c2d.addText("y'", ay[0]+0.1, ay[1]+0.15, { color: '#1565c0', size: 11, italic: true });

        // The fixed vector v (world coords)
        const vWorld = [2.0, 1.2];
        c2d.addArrow(0, 0, vWorld[0], vWorld[1], { color: '#c62828', width: 2.5 });
        c2d.addText('v', vWorld[0]+0.15, vWorld[1]+0.1, { color: '#c62828', size: 13, italic: true });

        // Components in rotated frame
        const vRot = [
          R[0]*vWorld[0] + R[2]*vWorld[1],
          R[1]*vWorld[0] + R[3]*vWorld[1],
        ];

        // Original tensor T
        const T = [2.5, 0.8, 0.8, 1.2];
        // Transformed tensor T'
        const Tp = transformTensor(R, T);

        // Show component values
        c2d.addText(`v in world frame:   (${vWorld[0].toFixed(2)}, ${vWorld[1].toFixed(2)})`, -5.5, 4.2, { color: '#c62828', size: 11 });
        c2d.addText(`v in rotated frame: (${vRot[0].toFixed(2)}, ${vRot[1].toFixed(2)})`, -5.5, 3.75, { color: '#1565c0', size: 11 });
        c2d.addText('— same arrow, different numbers', -5.5, 3.3, { color: '#aaa', size: 11 });

        drawMatrix2(c2d, T,  -5.5,  2.2, 'T =', '#555', '#888');
        drawMatrix2(c2d, Tp, -1.8,  2.2, "T' = RTRᵀ =", '#555', '#888');

        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
      },
    },

    // ── Step 4: Index notation & Einstein summation ──────────────────────────
    {
      title: 'Index Notation & Einstein Summation',
      description: 'Index notation gives every component a name. vᵢ is the i-th component of a vector. Tᵢⱼ is the (i,j) entry of a rank-2 tensor. The Einstein convention: a repeated index means sum over it. This compresses long expressions into single terms.',
      equation: '(T\\mathbf{v})_i = \\sum_j T_{ij}\\,v_j \\;\\equiv\\; T_{ij}\\,v_j \\qquad (\\text{sum on }j\\text{ implied})',
      notes: 'wᵢ = Tᵢⱼ vⱼ is matrix-vector multiplication written in index form. The repeated j is summed — "contracted". A free index (i) labels which component of the output we get. This notation scales cleanly to rank 3, 4, ... tensors where matrix notation breaks down.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'v direction  (degrees)', 0, 360, 1, state.angleDeg,
          v => `${Math.round(v)}°`, v => state.angleDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        const ang = state.angleDeg * Math.PI / 180;
        const v = [Math.cos(ang) * 2, Math.sin(ang) * 2];

        const T = [2.5, 0.8, 0.8, 1.2];
        const [wx_, wy_] = tx(T, v[0], v[1]);
        const wMag = Math.sqrt(wx_*wx_ + wy_*wy_);
        const wScale = 2.5 / Math.max(wMag, 0.01);

        // v vector
        c2d.addArrow(0, 0, v[0], v[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('v', v[0]+0.15, v[1]+0.1, { color: '#1565c0', size: 13, italic: true });

        // w = Tv
        c2d.addArrow(0, 0, wx_*wScale, wy_*wScale, { color: '#c62828', width: 2.5 });
        c2d.addText('w = Tv', wx_*wScale+0.15, wy_*wScale+0.1, { color: '#c62828', size: 12, italic: true });

        drawMatrix2(c2d, T, -5.5, 2.2, 'T =', '#555', '#888');

        // Index notation breakdown
        c2d.raw((ctx, cam) => {
          const x0 = cam.wx(-5.5), y0 = cam.wy(1.5);
          ctx.font = '11px system-ui';
          ctx.fillStyle = '#555';
          ctx.fillText('wᵢ = Tᵢⱼ vⱼ  (j summed, i free)', x0, y0);
          ctx.fillStyle = '#888';
          ctx.fillText(`w₁ = T₁₁v₁ + T₁₂v₂ = ${T[0].toFixed(1)}×${v[0].toFixed(2)} + ${T[1].toFixed(1)}×${v[1].toFixed(2)} = ${wx_.toFixed(2)}`, x0, y0+18);
          ctx.fillText(`w₂ = T₂₁v₁ + T₂₂v₂ = ${T[2].toFixed(1)}×${v[0].toFixed(2)} + ${T[3].toFixed(1)}×${v[1].toFixed(2)} = ${wy_.toFixed(2)}`, x0, y0+34);
        });

        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
      },
    },

    // ── Step 5: Tensor as a machine — takes v, gives w ───────────────────────
    {
      title: 'Tensor as a Machine',
      description: 'A rank-2 tensor is a linear machine: feed it a vector, get a vector out. The inertia tensor J is exactly this — feed it ω, get h. The same tensor can act on infinitely many input vectors; each one maps to a unique output.',
      equation: '\\mathbf{h} = \\mathcal{J}\\,\\boldsymbol{\\omega} \\qquad \\text{(inertia tensor from Thomson §5.2)}',
      notes: 'The tensor encodes a physical relationship — how angular momentum responds to angular velocity. This relationship exists independently of coordinates. The matrix of numbers is just one coordinate representation of it.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'ω direction  (degrees)', 0, 360, 1, state.omegaDeg,
          v => `${Math.round(v)}°`, v => state.omegaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        // Inertia tensor (2×2 projection of J from moment of momentum lesson)
        const J = [7, -3, -3, 8]; // xy block of Thomson body

        const ang = state.omegaDeg * Math.PI / 180;
        const omega = [Math.cos(ang), Math.sin(ang)];
        const [hx, hy] = tx(J, omega[0], omega[1]);
        const hMag = Math.sqrt(hx*hx + hy*hy);
        const hScale = 2.5 / Math.max(hMag, 0.01);

        // Show several ω → h pairs (faint traces)
        for (let d = 0; d < 360; d += 30) {
          const a = d * Math.PI / 180;
          const ow = [Math.cos(a), Math.sin(a)];
          const [hw1, hw2] = tx(J, ow[0], ow[1]);
          const hm = Math.sqrt(hw1*hw1+hw2*hw2);
          const hs = 2.5/Math.max(hm,0.01);
          c2d.addArrow(0, 0, hw1*hs, hw2*hs, { color: 'rgba(198,40,40,0.12)', width: 1 });
        }

        // Active ω
        c2d.addArrow(0, 0, omega[0]*2.5, omega[1]*2.5, { color: '#1565c0', width: 3 });
        c2d.addText('ω', omega[0]*2.5+0.15, omega[1]*2.5+0.1, { color: '#1565c0', size: 14, italic: true });

        // Active h = J·ω
        c2d.addArrow(0, 0, hx*hScale, hy*hScale, { color: '#c62828', width: 3 });
        c2d.addText('h = J·ω', hx*hScale+0.15, hy*hScale+0.1, { color: '#c62828', size: 12, italic: true });

        const dotOH = omega[0]*hx + omega[1]*hy;
        const cosA  = dotOH / Math.max(hMag, 0.01);
        const angDeg = Math.acos(Math.max(-1,Math.min(1,cosA))) * 180/Math.PI;

        drawMatrix2(c2d, J, -5.5, 2.2, 'J (inertia tensor) =', '#1565c0', '#c62828');

        c2d.addText(`angle ω to h: ${angDeg.toFixed(1)}°`, -5.5, 3.4, {
          color: angDeg < 5 ? '#2e7d32' : '#555', size: 12,
        });
        c2d.addText('faint red: image of unit circle under J', -5.5, 2.95, { color: '#aaa', size: 10 });
        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
      },
    },

    // ── Step 6: Principal axes = eigenvectors ────────────────────────────────
    {
      title: 'Principal Axes — Eigenvectors of the Tensor',
      description: 'For a symmetric tensor, there exist special input directions where the output is parallel to the input — the tensor only scales, never rotates. These are the eigenvectors of T, and the scale factors are the eigenvalues. For the inertia tensor, these are the principal axes.',
      equation: 'T\\,\\mathbf{v} = \\lambda\\,\\mathbf{v} \\implies \\text{no rotation, only scaling by }\\lambda',
      notes: 'Every symmetric rank-2 tensor has a basis of eigenvectors (principal axes) in which the tensor is diagonal. In that basis, all off-diagonal (product of inertia) terms vanish, and h = λω holds as a simple scalar relationship — exactly the 2D case from earlier.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'ω direction  (degrees)', 0, 360, 1, state.omegaDeg,
          v => `${Math.round(v)}°`, v => state.omegaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        const J = [7, -3, -3, 8];
        const { l1, l2, v1, v2 } = eig2(J[0], J[1], J[3]);

        const ang = state.omegaDeg * Math.PI / 180;
        const omega = [Math.cos(ang), Math.sin(ang)];
        const [hx, hy] = tx(J, omega[0], omega[1]);
        const hMag   = Math.sqrt(hx*hx + hy*hy);
        const hScale = 2.5 / Math.max(hMag, 0.01);

        // Principal axis lines (full span)
        c2d.addLine([[-v1[0]*5,-v1[1]*5],[v1[0]*5,v1[1]*5]], { color: '#2e7d32' + '40', width: 1.5, dash:[6,4] });
        c2d.addLine([[-v2[0]*5,-v2[1]*5],[v2[0]*5,v2[1]*5]], { color: '#6a1b9a' + '40', width: 1.5, dash:[6,4] });

        // Eigenvector arrows
        c2d.addArrow(0, 0, v1[0]*2.5, v1[1]*2.5, { color: '#2e7d32', width: 2 });
        c2d.addArrow(0, 0, v2[0]*2.5, v2[1]*2.5, { color: '#6a1b9a', width: 2 });
        c2d.addText(`e₁  λ=${l1.toFixed(1)}`, v1[0]*2.6+0.1, v1[1]*2.6+0.1, { color: '#2e7d32', size: 11 });
        c2d.addText(`e₂  λ=${l2.toFixed(1)}`, v2[0]*2.6+0.1, v2[1]*2.6+0.1, { color: '#6a1b9a', size: 11 });

        // Active ω and h
        c2d.addArrow(0, 0, omega[0]*2.5, omega[1]*2.5, { color: '#1565c0', width: 3 });
        c2d.addText('ω', omega[0]*2.5+0.12, omega[1]*2.5+0.1, { color: '#1565c0', size: 14, italic: true });

        c2d.addArrow(0, 0, hx*hScale, hy*hScale, { color: '#c62828', width: 3 });
        c2d.addText('h', hx*hScale+0.12, hy*hScale+0.1, { color: '#c62828', size: 14, italic: true });

        const dotOH  = omega[0]*hx + omega[1]*hy;
        const cosA   = dotOH / Math.max(hMag, 0.01);
        const angDeg = Math.acos(Math.max(-1,Math.min(1,cosA))) * 180/Math.PI;

        const parallel = angDeg < 3;
        c2d.addText(
          parallel ? '✓ ω on principal axis — h ∥ ω' : `angle ω to h: ${angDeg.toFixed(1)}°`,
          -5.5, 4.2,
          { color: parallel ? '#2e7d32' : '#555', size: 12 }
        );
        c2d.addText('drag ω onto a dashed line to align with a principal axis', -5.5, 3.75,
          { color: '#bbb', size: 10 });
        c2d.addText('in that frame the tensor is diagonal — off-diagonal terms vanish', -5.5, 3.3,
          { color: '#bbb', size: 10 });

        drawMatrix2(c2d, J, -5.5, 2.2, 'J =', '#1565c0', '#c62828');

        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
      },
    },

  ],
};
