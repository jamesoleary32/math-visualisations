// Orthogonal Matrices — Linear Algebra
//
// An n×n matrix Q is orthogonal when QᵀQ = I.
// Equivalently: its columns (and rows) form an orthonormal set.
// Key properties: Qᵀ = Q⁻¹, det(Q) = ±1, ‖Qv‖ = ‖v‖ for all v.

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `om-${Math.random().toString(36).slice(2)}`;
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

// ── Vector helpers ─────────────────────────────────────────────────────────────
function dot(a, b)  { return a[0]*b[0] + a[1]*b[1]; }
function norm(v)    { return Math.sqrt(dot(v, v)); }
function scl(v, s)  { return [v[0]*s, v[1]*s]; }
function unit(v)    { const n = norm(v); return n < 1e-10 ? [0,0] : [v[0]/n, v[1]/n]; }

// Rotation matrix applied to a 2D vector
function rot(v, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c*v[0] - s*v[1], s*v[0] + c*v[1]];
}

// Reflect vector across line at angle phi
function reflect(v, phi) {
  const c2 = Math.cos(2*phi), s2 = Math.sin(2*phi);
  return [c2*v[0] + s2*v[1], s2*v[0] - c2*v[1]];
}

function rightAngleMark(c2d, corner, dir1, dir2, size = 0.19) {
  const d1 = unit(dir1), d2 = unit(dir2);
  c2d.addLine([
    [corner[0] + d1[0]*size,               corner[1] + d1[1]*size              ],
    [corner[0] + d1[0]*size + d2[0]*size,  corner[1] + d1[1]*size + d2[1]*size ],
    [corner[0] + d2[0]*size,               corner[1] + d2[1]*size              ],
  ], { color: '#999', width: 1 });
}

// Draw a shape (array of [x,y] vertices) as a closed polygon with arrows between them
function drawShape(c2d, pts, color, width, dash) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i+1) % pts.length];
    c2d.addLine([a, b], { color, width: width ?? 1.5, dash });
  }
}

// A simple triangle for transformation demos
const TRIANGLE = [[2, 0.5], [3.5, 0.5], [2, 2]];

export default {
  title:   'Orthogonal Matrices',
  subject: 'Linear Algebra',

  initState: () => ({
    theta:     40,
    phi:       30,
    theta2:    60,
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

    // ── Step 1: Orthonormal Columns ────────────────────────────────────────────
    {
      title: 'Orthonormal Columns',
      description: 'A square matrix Q is orthogonal when its columns form an orthonormal set — each column has unit length and every pair of columns is perpendicular. The standard rotation matrix is the simplest example.',
      equation: `Q = \\begin{pmatrix}\\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta\\end{pmatrix}
        \\quad \\mathbf{q}_1 = \\begin{pmatrix}\\cos\\theta\\\\\\sin\\theta\\end{pmatrix},\\;
               \\mathbf{q}_2 = \\begin{pmatrix}-\\sin\\theta\\\\\\cos\\theta\\end{pmatrix}`,
      notes: '‖q₁‖² = cos²θ + sin²θ = 1  ✓\n‖q₂‖² = sin²θ + cos²θ = 1  ✓\nq₁·q₂ = −cosθ sinθ + sinθ cosθ = 0  ✓\n\nThis holds for every angle θ — every rotation matrix is orthogonal. The blue and red unit vectors are always perpendicular, regardless of the rotation angle shown here at 40°.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = 40 * Math.PI / 180;
        const q1 = [Math.cos(th), Math.sin(th)];
        const q2 = [-Math.sin(th), Math.cos(th)];
        const r = 2.5;

        // standard basis (faint)
        c2d.addArrow(0, 0, 1, 0, { color: '#e0e0e0', width: 1.8 });
        c2d.addText('e₁', 1.1, 0.15, { color: '#ccc', size: 12 });
        c2d.addArrow(0, 0, 0, 1, { color: '#e0e0e0', width: 1.8 });
        c2d.addText('e₂', 0.1, 1.18, { color: '#ccc', size: 12 });

        // columns of Q
        c2d.addArrow(0, 0, q1[0]*r, q1[1]*r, { color: '#1565c0', width: 3 });
        c2d.addText('q₁', q1[0]*r + 0.15, q1[1]*r + 0.15, { color: '#1565c0', size: 14, italic: true });
        c2d.addArrow(0, 0, q2[0]*r, q2[1]*r, { color: '#c62828', width: 3 });
        c2d.addText('q₂', q2[0]*r - 0.55, q2[1]*r + 0.15, { color: '#c62828', size: 14, italic: true });

        // right-angle mark
        const ms = 0.22;
        c2d.addLine([
          [q1[0]*ms,            q1[1]*ms           ],
          [q1[0]*ms + q2[0]*ms, q1[1]*ms + q2[1]*ms],
          [q2[0]*ms,            q2[1]*ms           ],
        ], { color: '#888', width: 1.2 });

        // rotation arc label
        const thm = 20 * Math.PI / 180;
        const ra  = 1.1;
        c2d.addText('θ = 40°', Math.cos(thm)*ra + 0.15, Math.sin(thm)*ra + 0.05, { color: '#888', size: 12 });

        c2d.addText('‖q₁‖ = ‖q₂‖ = 1   q₁·q₂ = 0', -5.5, -3.5, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 2: QᵀQ = I, so Qᵀ = Q⁻¹ ─────────────────────────────────────────
    {
      title: 'Transpose is Inverse',
      description: 'Packing the orthonormality conditions into matrix form gives QᵀQ = I. This is remarkable: instead of solving a linear system to invert Q, you just transpose it. Qᵀ = Q⁻¹ is the defining algebraic property of orthogonal matrices.',
      equation: `Q^\\top Q = \\begin{pmatrix}\\mathbf{q}_1^\\top \\\\ \\mathbf{q}_2^\\top\\end{pmatrix}
        \\begin{pmatrix}\\mathbf{q}_1 & \\mathbf{q}_2\\end{pmatrix}
        = \\begin{pmatrix}\\mathbf{q}_1\\cdot\\mathbf{q}_1 & \\mathbf{q}_1\\cdot\\mathbf{q}_2 \\\\
                          \\mathbf{q}_2\\cdot\\mathbf{q}_1 & \\mathbf{q}_2\\cdot\\mathbf{q}_2\\end{pmatrix}
        = \\begin{pmatrix}1&0\\\\0&1\\end{pmatrix} = I`,
      notes: 'Each diagonal entry is 1 because columns have unit length.\nEach off-diagonal entry is 0 because distinct columns are perpendicular.\n\nNote: QQᵀ = I also holds (rows are also orthonormal), so Q⁻¹ = Qᵀ from both sides. In numerical computation this is a huge win — inverting an arbitrary matrix is O(n³) and numerically sensitive; transposing is O(n²) and exact.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = 40 * Math.PI / 180;
        const q1 = [Math.cos(th), Math.sin(th)];
        const q2 = [-Math.sin(th), Math.cos(th)];
        const r  = 2.5;

        // Q columns (solid)
        c2d.addArrow(0, 0, q1[0]*r, q1[1]*r, { color: '#1565c0', width: 3 });
        c2d.addText('q₁', q1[0]*r + 0.15, q1[1]*r + 0.15, { color: '#1565c0', size: 14, italic: true });
        c2d.addArrow(0, 0, q2[0]*r, q2[1]*r, { color: '#c62828', width: 3 });
        c2d.addText('q₂', q2[0]*r - 0.55, q2[1]*r + 0.15, { color: '#c62828', size: 14, italic: true });

        // right-angle mark
        const ms = 0.22;
        c2d.addLine([
          [q1[0]*ms,            q1[1]*ms           ],
          [q1[0]*ms + q2[0]*ms, q1[1]*ms + q2[1]*ms],
          [q2[0]*ms,            q2[1]*ms           ],
        ], { color: '#888', width: 1.2 });

        // Qᵀ rows shown as dashed projections onto axes
        c2d.addLine([[0,0],[q1[0]*r, 0]], { color: '#1565c060', width: 1.5, dash: [5,3] });
        c2d.addLine([[0,0],[0, q1[1]*r]], { color: '#1565c060', width: 1.5, dash: [5,3] });

        const c = Math.cos(th).toFixed(3), s = Math.sin(th).toFixed(3);
        c2d.addText(`Q = [[${c}, −${s}], [${s}, ${c}]]`, -5.5, 4.2, { color: '#555', size: 11 });
        c2d.addText(`Qᵀ= [[${c},  ${s}], [−${s}, ${c}]]`, -5.5, 3.7, { color: '#555', size: 11 });
        c2d.addText('QᵀQ = I  →  Qᵀ = Q⁻¹', -5.5, -3.5, { color: '#2e7d32', size: 13 });
        c2d.addText('Inversion is free: just transpose', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 3: Rotation — det = +1 ───────────────────────────────────────────
    {
      title: 'Rotations: det(Q) = +1',
      description: 'Orthogonal matrices with det(Q) = +1 are pure rotations — they preserve orientation. The 2D rotation matrix rotates every vector by θ counterclockwise. Drag the slider to see how the transformed shape relates to the original.',
      equation: `Q_\\theta = \\begin{pmatrix}\\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta\\end{pmatrix}
        \\qquad \\det(Q_\\theta) = \\cos^2\\!\\theta + \\sin^2\\!\\theta = +1`,
      notes: 'The original triangle (grey) and rotated triangle (blue) have identical side lengths and interior angles. No stretching, shearing, or reflection occurs — Q is a rigid motion that preserves the handedness of the frame.\n\nThe determinant measures signed area scaling: det = +1 means areas are preserved and orientation is unchanged. det = −1 (reflections) flips orientation.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'rotation angle θ (degrees)', 0, 360, 1, state.theta,
          v => `${v}°`, v => state.theta = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = state.theta * Math.PI / 180;

        // original shape (grey dashed)
        drawShape(c2d, TRIANGLE, '#bbb', 1.5, [4, 3]);
        c2d.addText('original', TRIANGLE[0][0] - 0.1, TRIANGLE[0][1] - 0.3, { color: '#bbb', size: 11 });

        // rotated shape (blue)
        const Qtri = TRIANGLE.map(v => rot(v, th));
        drawShape(c2d, Qtri, '#1565c0', 2);
        c2d.addText('Q·v', Qtri[0][0] - 0.1, Qtri[0][1] - 0.35, { color: '#1565c0', size: 11 });

        // rotated basis vectors
        const q1 = [Math.cos(th), Math.sin(th)];
        const q2 = [-Math.sin(th), Math.cos(th)];
        const r  = 1.8;
        c2d.addArrow(0, 0, q1[0]*r, q1[1]*r, { color: '#1565c080', width: 2 });
        c2d.addArrow(0, 0, q2[0]*r, q2[1]*r, { color: '#c6282880', width: 2 });

        const c = Math.cos(th), s = Math.sin(th);
        c2d.addText(`det = ${(c*c + s*s).toFixed(4)} = +1`, -5.5, -3.5, { color: '#2e7d32', size: 12 });
        c2d.addText(`θ = ${state.theta}°`, -5.5, -4.1, { color: '#555', size: 12 });
      },
    },

    // ── Step 4: Reflection — det = −1 ─────────────────────────────────────────
    {
      title: 'Reflections: det(Q) = −1',
      description: 'Orthogonal matrices with det(Q) = −1 are reflections — they flip orientation while still preserving lengths and angles. Here Q reflects across a line through the origin at angle φ. Note the reflected shape has opposite handedness.',
      equation: `Q_\\phi^{\\text{refl}} = \\begin{pmatrix}\\cos 2\\phi & \\sin 2\\phi \\\\ \\sin 2\\phi & -\\cos 2\\phi\\end{pmatrix}
        \\qquad \\det = -(\\cos^2 2\\phi + \\sin^2 2\\phi) = -1`,
      notes: 'The blue vertices go around the triangle in the opposite order to the grey originals — this "handedness flip" is the signature of a reflection.\n\nAll orthogonal matrices are either rotations (det = +1) or reflections (det = −1). The set of n×n orthogonal matrices forms the orthogonal group O(n); the rotations alone form the special orthogonal group SO(n) ⊂ O(n).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'mirror line angle φ (degrees)', 0, 180, 1, state.phi,
          v => `${v}°`, v => state.phi = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const phi = state.phi * Math.PI / 180;

        // mirror line (dashed)
        const ml = [Math.cos(phi), Math.sin(phi)];
        c2d.addLine([scl(ml, -5.5), scl(ml, 5.5)], { color: '#e6510040', width: 1.5, dash: [6, 4] });
        c2d.addText('mirror', ml[0]*4.5 + 0.15, ml[1]*4.5 + 0.15, { color: '#e65100', size: 11 });

        // original shape (grey dashed)
        drawShape(c2d, TRIANGLE, '#bbb', 1.5, [4, 3]);
        c2d.addText('original', TRIANGLE[0][0] - 0.1, TRIANGLE[0][1] - 0.3, { color: '#bbb', size: 11 });

        // reflected shape (blue)
        const Rtri = TRIANGLE.map(v => reflect(v, phi));
        drawShape(c2d, Rtri, '#1565c0', 2);
        c2d.addText('Q·v', Rtri[0][0] - 0.6, Rtri[0][1] - 0.3, { color: '#1565c0', size: 11 });

        // reflection matrix entries
        const c2p = Math.cos(2*phi), s2p = Math.sin(2*phi);
        c2d.addText(`Q = [[${c2p.toFixed(3)},  ${s2p.toFixed(3)}],`, -5.5, 4.2, { color: '#555', size: 11 });
        c2d.addText(`     [${s2p.toFixed(3)}, −${c2p.toFixed(3)}]]`, -5.5, 3.7, { color: '#555', size: 11 });
        c2d.addText('det = −1  (orientation reversed)', -5.5, -3.5, { color: '#c62828', size: 12 });
        c2d.addText('Lengths preserved, handedness flipped', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 5: Preserves Length and Angle ────────────────────────────────────
    {
      title: 'Preserves Length and Inner Product',
      description: 'Any orthogonal Q is a rigid-body transformation. It preserves the length of every vector and the angle between every pair. The proof uses only QᵀQ = I and the linearity of the inner product.',
      equation: `\\|Q\\mathbf{v}\\|^2 = (Q\\mathbf{v})^\\top(Q\\mathbf{v}) = \\mathbf{v}^\\top Q^\\top Q\\,\\mathbf{v} = \\mathbf{v}^\\top I\\,\\mathbf{v} = \\|\\mathbf{v}\\|^2
        \\quad\\Rightarrow\\quad \\langle Q\\mathbf{u},\\,Q\\mathbf{v}\\rangle = \\langle\\mathbf{u},\\mathbf{v}\\rangle`,
      notes: 'The canvas shows two vectors u and v, and their images Qu and Qv after rotation by 40°. The lengths ‖u‖ = ‖Qu‖ and ‖v‖ = ‖Qv‖ are unchanged, and the angle between them is preserved.\n\nThis is why orthogonal matrices are used for coordinate frame changes in orbital mechanics and rigid-body dynamics — they re-express vectors in a new frame without distorting any geometry.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = 40 * Math.PI / 180;
        const u = [2.5, 0.8];
        const v = [0.5, 2.2];
        const Qu = rot(u, th);
        const Qv = rot(v, th);

        // original (grey dashed)
        c2d.addArrow(0, 0, u[0], u[1], { color: '#bbb', width: 2, dash: [4,3] });
        c2d.addText('u', u[0]+0.15, u[1]+0.15, { color: '#bbb', size: 13, italic: true });
        c2d.addArrow(0, 0, v[0], v[1], { color: '#bbb', width: 2, dash: [4,3] });
        c2d.addText('v', v[0]+0.15, v[1]+0.15, { color: '#bbb', size: 13, italic: true });

        // rotated (blue / red)
        c2d.addArrow(0, 0, Qu[0], Qu[1], { color: '#1565c0', width: 3 });
        c2d.addText('Qu', Qu[0]+0.15, Qu[1]+0.15, { color: '#1565c0', size: 13, italic: true });
        c2d.addArrow(0, 0, Qv[0], Qv[1], { color: '#c62828', width: 3 });
        c2d.addText('Qv', Qv[0]-0.55, Qv[1]+0.15, { color: '#c62828', size: 13, italic: true });

        const angleOrig = Math.acos(dot(unit(u), unit(v))) * 180 / Math.PI;
        const angleNew  = Math.acos(Math.max(-1, Math.min(1, dot(unit(Qu), unit(Qv))))) * 180 / Math.PI;

        c2d.addText(`‖u‖ = ${norm(u).toFixed(3)},  ‖Qu‖ = ${norm(Qu).toFixed(3)}  ✓`, -5.5, -3.0, { color: '#2e7d32', size: 12 });
        c2d.addText(`‖v‖ = ${norm(v).toFixed(3)},  ‖Qv‖ = ${norm(Qv).toFixed(3)}  ✓`, -5.5, -3.6, { color: '#2e7d32', size: 12 });
        c2d.addText(`angle(u,v) = ${angleOrig.toFixed(2)}°,  angle(Qu,Qv) = ${angleNew.toFixed(2)}°  ✓`, -5.5, -4.2, { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 6: Composition of Rotations ──────────────────────────────────────
    {
      title: 'Composition of Rotations',
      description: 'The product of two orthogonal matrices is orthogonal — rotating then rotating again is still a rotation. The combined angle adds, and the matrices simply multiply. This is the group property of O(n).',
      equation: `(Q_\\alpha Q_\\beta)^\\top(Q_\\alpha Q_\\beta)
        = Q_\\beta^\\top Q_\\alpha^\\top Q_\\alpha Q_\\beta
        = Q_\\beta^\\top I\\, Q_\\beta = I
        \\qquad Q_\\alpha Q_\\beta = Q_{\\alpha+\\beta}`,
      notes: 'The grey shape is the original. The red shape has been rotated by α alone. The blue shape has been rotated first by β, then by α — identical to a single rotation by α+β (shown dashed).\n\nComposition order matters in 3D (rotations about different axes do not commute in general), but in 2D all rotations commute: Q_α Q_β = Q_β Q_α = Q_{α+β}.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'first rotation α (degrees)', 0, 180, 1, state.theta,
          v => `${v}°`, v => state.theta = v);
        addSlider(state._controls, 'second rotation β (degrees)', 0, 180, 1, state.theta2,
          v => `${v}°`, v => state.theta2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const alpha = state.theta  * Math.PI / 180;
        const beta  = state.theta2 * Math.PI / 180;

        const small = [[0.5, 0.3], [1.8, 0.3], [0.5, 1.5]];

        // original (grey dashed)
        drawShape(c2d, small, '#bbb', 1.5, [4,3]);

        // rotated by α only (red)
        const Atri = small.map(v => rot(v, alpha));
        drawShape(c2d, Atri, '#c62828', 1.8);
        c2d.addText(`Qα (${state.theta}°)`, Atri[1][0]+0.1, Atri[1][1]+0.1, { color: '#c62828', size: 11 });

        // rotated by β then α — i.e. QαQβ
        const ABtri = small.map(v => rot(rot(v, beta), alpha));
        drawShape(c2d, ABtri, '#1565c0', 2.5);
        c2d.addText(`QαQβ (${state.theta + state.theta2}°)`, ABtri[1][0]+0.1, ABtri[1][1]+0.1, { color: '#1565c0', size: 11 });

        // single rotation by α+β (dashed, to confirm they match)
        const Stri = small.map(v => rot(v, alpha + beta));
        drawShape(c2d, Stri, '#1565c060', 1.5, [4,3]);

        c2d.addText(`α + β = ${state.theta + state.theta2}°`, -5.5, -3.5, { color: '#2e7d32', size: 12 });
        c2d.addText('QαQβ (blue solid) = Q_{α+β} (blue dashed)  ✓', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

    // ── Step 7: Coordinate Frame Change ───────────────────────────────────────
    {
      title: 'Coordinate Frame Change',
      description: 'In mechanics, Q most often appears as a rotation between reference frames. A vector expressed in frame A is re-expressed in frame B via v_B = Q v_A. Tensors transform with two factors: T_B = Q T_A Qᵀ — the tensor transformation law central to rigid-body dynamics.',
      equation: `\\mathbf{v}_B = Q\\,\\mathbf{v}_A
        \\qquad T_B = Q\\,T_A\\,Q^\\top
        \\qquad Q^\\top = Q^{-1}`,
      notes: 'The black frame is the inertial (A) frame. The blue frame is the body (B) frame, rotated by θ. The orange vector is the same physical vector expressed in both frames — its components change, but it points the same direction in space.\n\nIn gyrodynamics the inertia tensor transforms exactly as T_B = Q T_A Qᵀ. Choosing Q to align the body axes with the principal axes diagonalises the inertia tensor, vastly simplifying Euler\'s equations.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'frame B rotation θ (degrees)', 0, 360, 1, state.theta,
          v => `${v}°`, v => state.theta = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const th = state.theta * Math.PI / 180;

        // Frame A — inertial (black)
        const AL = 2.2;
        c2d.addArrow(0, 0, AL, 0, { color: '#333', width: 2 });
        c2d.addText('x_A', AL+0.1, 0.15, { color: '#333', size: 12 });
        c2d.addArrow(0, 0, 0, AL, { color: '#333', width: 2 });
        c2d.addText('y_A', 0.1, AL+0.15, { color: '#333', size: 12 });

        // Frame B — rotated (blue)
        const B1 = rot([AL, 0], th);
        const B2 = rot([0, AL], th);
        c2d.addArrow(0, 0, B1[0], B1[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('x_B', B1[0]+0.1, B1[1]+0.15, { color: '#1565c0', size: 12 });
        c2d.addArrow(0, 0, B2[0], B2[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('y_B', B2[0]-0.5, B2[1]+0.1, { color: '#1565c0', size: 12 });

        // right-angle mark for frame B
        const bms = 0.22;
        const b1u = unit(B1), b2u = unit(B2);
        c2d.addLine([
          [b1u[0]*bms,            b1u[1]*bms           ],
          [b1u[0]*bms + b2u[0]*bms, b1u[1]*bms + b2u[1]*bms],
          [b2u[0]*bms,            b2u[1]*bms           ],
        ], { color: '#1565c080', width: 1 });

        // a physical vector (orange) expressed in both frames
        const vA = [2.5, 1.2];
        c2d.addArrow(0, 0, vA[0], vA[1], { color: '#e65100', width: 3 });
        c2d.addText('v', vA[0]+0.15, vA[1]+0.2, { color: '#e65100', size: 14, italic: true });

        // components in each frame
        const c = Math.cos(th), s = Math.sin(th);
        const vBx =  c*vA[0] + s*vA[1];
        const vBy = -s*vA[0] + c*vA[1];

        c2d.addText(`v_A = (${vA[0].toFixed(2)}, ${vA[1].toFixed(2)})`, -5.5, 4.2, { color: '#e65100', size: 12 });
        c2d.addText(`v_B = Q v_A = (${vBx.toFixed(3)}, ${vBy.toFixed(3)})`, -5.5, 3.7, { color: '#1565c0', size: 12 });
        c2d.addText('Same physical vector, different numbers', -5.5, -3.5, { color: '#555', size: 12 });
        c2d.addText('Tensors: T_B = Q T_A Qᵀ', -5.5, -4.1, { color: '#888', size: 12 });
      },
    },

  ],
};
