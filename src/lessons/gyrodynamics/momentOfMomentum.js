// Moment of Momentum — Rigid Body
//
// Thomson §5.2: body axes x, y, z are attached to the body with origin O
// (either a fixed point or the moving centre of mass).
// The velocity of any point P_i on the body is:
//   v_i = v_0 + ω × r_i
//
// where v_0 is the velocity of O and r_i is the position of P_i from O.
// Special case: O is a fixed point → v_0 = 0 → v_i = ω × r_i.
//
// The moment of momentum about O is then:
//   H = Σ r_i × m_i v_i = I ω   (when v_0 = 0 or O = centre of mass)
// Thomson §5.2

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `mom-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif">${fmt(value)}</span>
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

// ── Constants ─────────────────────────────────────────────────────────────────

const OMEGA   = 0.5;   // rad/s — angular velocity of the body
const V_SCALE = 1.4;   // display scale for velocity arrows

// Four mass particles fixed in the body (r in world units, phi0 in radians)
const PARTICLES = [
  { r: 1.9, phi0: 0.35,  m: 1.2, color: '#c62828', label: 'P₁' },
  { r: 2.4, phi0: 1.85,  m: 1.5, color: '#1565c0', label: 'P₂' },
  { r: 1.3, phi0: 3.50,  m: 0.8, color: '#2e7d32', label: 'P₃' },
  { r: 2.7, phi0: 5.10,  m: 1.0, color: '#6a1b9a', label: 'P₄' },
];

// ── Kinematics ─────────────────────────────────────────────────────────────────

function pos(p, theta) {
  const phi = p.phi0 + theta;
  return [p.r * Math.cos(phi), p.r * Math.sin(phi)];
}

// Velocity v = ω × r — in 2D: perpendicular to r, CCW
function vel(p, theta) {
  const phi = p.phi0 + theta;
  return [-OMEGA * p.r * Math.sin(phi), OMEGA * p.r * Math.cos(phi)];
}

// Scalar angular momentum contribution: h_i = m_i r_i² ω
function hi(p) { return p.m * p.r * p.r * OMEGA; }

// Total moment of inertia I = Σ m_i r_i²
const I_TOTAL = PARTICLES.reduce((s, p) => s + p.m * p.r * p.r, 0);

// ── Disk particle generator (for sum → integral step) ─────────────────────────
// Uniform disk, radius DISK_R, mass DISK_M. Places particles on concentric rings.
const DISK_R = 2.2, DISK_M = 3.0;

function diskParticles(nRings) {
  const pts = [];
  for (let k = 1; k <= nRings; k++) {
    const r   = k * DISK_R / nRings;
    const n   = Math.max(1, Math.round(2 * Math.PI * k));
    for (let j = 0; j < n; j++) {
      pts.push({ r, phi: (2 * Math.PI * j) / n });
    }
  }
  const m = DISK_M / pts.length;
  return pts.map(p => ({ ...p, m }));
}

function iDiscrete(nRings) {
  return diskParticles(nRings).reduce((s, p) => s + p.m * p.r * p.r, 0);
}

// Exact: I = ½MR² for a uniform disk
const I_EXACT = 0.5 * DISK_M * DISK_R * DISK_R;

// ── Drawing helpers ────────────────────────────────────────────────────────────

// Draw the rigid body structure (spokes + outer boundary)
function drawBody(c2d, theta, alpha = 1) {
  const col = `rgba(180,180,180,${alpha * 0.5})`;
  const pts = PARTICLES.map(p => pos(p, theta));

  // Spokes from O to each particle
  pts.forEach(([x, y]) => {
    c2d.addLine([[0, 0], [x, y]], { color: col, width: 1 });
  });

  // Outer boundary connecting particles (closed polygon)
  c2d.addLine([...pts, pts[0]], { color: col, width: 1.5, dash: [5, 4] });
}

// Draw all particle dots
function drawParticles(c2d, theta, highlight = null) {
  PARTICLES.forEach((p, i) => {
    const [x, y] = pos(p, theta);
    const isHL = highlight === null || highlight === i;
    const color = isHL ? p.color : '#ddd';
    const radius = isHL ? 7 : 5;
    c2d.addPoint(x, y, { radius, color });
    if (isHL) {
      c2d.addText(p.label, x + 0.15, y + 0.15, { color, size: 11 });
    }
  });
}

// Draw ω arc indicator at origin
function drawOmega(c2d) {
  c2d.raw((ctx, cam) => {
    const cx = cam.wx(0), cy = cam.wy(0);
    const R = cam.ws(0.55);
    const sa = Math.PI * 0.35, ea = Math.PI * 1.85;

    // Arc (anticlockwise=false → increasing angle → clockwise on screen → CCW in world)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, sa, ea, false);
    ctx.strokeStyle = '#888';
    ctx.lineWidth  = 1.5;
    ctx.stroke();

    // Arrowhead at ea — tangent for increasing-angle direction: (-sin ea, cos ea)
    const tx = -Math.sin(ea), ty = Math.cos(ea);
    const ex = cx + R * Math.cos(ea);
    const ey = cy + R * Math.sin(ea);
    const hl = 9, hw = 4;
    const px = Math.cos(ea), py = Math.sin(ea); // perpendicular to tangent

    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hl*tx + hw*px, ey - hl*ty + hw*py);
    ctx.lineTo(ex - hl*tx - hw*px, ey - hl*ty - hw*py);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.restore();
  });
  c2d.addText('ω', -0.3, 0.75, { color: '#666', size: 13, italic: true });
}

// Draw r vector from O to particle i
function drawR(c2d, p, theta, color) {
  const [x, y] = pos(p, theta);
  c2d.addArrow(0, 0, x, y, { color, width: 2 });
  // Label midpoint
  c2d.addText('rᵢ', x * 0.48, y * 0.48 + 0.18, { color, size: 11, italic: true });
}

// Draw velocity vector at particle i
function drawV(c2d, p, theta, color) {
  const [x, y]   = pos(p, theta);
  const [vx, vy] = vel(p, theta);
  c2d.addArrow(x, y, x + vx * V_SCALE, y + vy * V_SCALE, { color, width: 2 });
  c2d.addText('vᵢ', x + vx * V_SCALE + 0.15, y + vy * V_SCALE + 0.1, { color, size: 11, italic: true });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Moment of Momentum',
  subject: 'Gyrodynamics',

  initState: () => ({ theta: 0, nRings: 6, _controls: null }),

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: Velocity of a point on the body ──────────────────────────────
    {
      title: 'Velocity of Point P on the Body',
      description: 'Body axes are attached to the body with origin O. The velocity of any point P_i has two parts: v_0 — the velocity of O itself — plus ω × r_i from the rotation about O. For a fixed point O, v_0 = 0 and v_i = ω × r_i.',
      equation: '\\mathbf{v}_i = \\mathbf{v}_0 + \\boldsymbol{\\omega} \\times \\mathbf{r}_i',
      notes: 'O can be any point fixed in the body — a fixed pivot, or the moving centre of mass. The choice of O affects v_0 but not the total v_i. If O is a fixed point in space, v_0 = 0 and the velocity is purely rotational.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state, dt) {
        state.theta += OMEGA * dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#ebebeb' });

        drawBody(c2d, state.theta);
        drawOmega(c2d);

        const p  = PARTICLES[0];
        const [x, y]   = pos(p, state.theta);
        const [vx, vy] = vel(p, state.theta);

        // v₀ — translational velocity of O (shown as a fixed example vector)
        const v0x = 0.5, v0y = 0.6;
        c2d.addArrow(0, 0, v0x, v0y, { color: '#e65100', width: 2 });
        c2d.addText('v₀', v0x + 0.1, v0y + 0.1, { color: '#e65100', size: 12, italic: true });

        // r_i from O to P
        drawR(c2d, p, state.theta, '#c62828');

        // ω × r_i component — starts at P
        c2d.addArrow(x, y, x + vx * V_SCALE, y + vy * V_SCALE,
          { color: '#1565c0', width: 2 });
        c2d.addText('ω×rᵢ', x + vx * V_SCALE + 0.12, y + vy * V_SCALE + 0.1,
          { color: '#1565c0', size: 11, italic: true });

        // v_i = v₀ + ω×r_i — total velocity at P
        c2d.addArrow(x, y, x + v0x + vx * V_SCALE, y + v0y + vy * V_SCALE,
          { color: '#555', width: 2.5 });
        c2d.addText('vᵢ', x + v0x + vx * V_SCALE + 0.12, y + v0y + vy * V_SCALE,
          { color: '#333', size: 13, italic: true });

        drawParticles(c2d, state.theta, 0);

        // Labels
        c2d.addPoint(0, 0, { radius: 5, color: '#333' });
        c2d.addText('O', 0.15, -0.3, { color: '#333', size: 12 });
        c2d.addText('orange: v₀  (translation of O)', -5.5, 4.2, { color: '#e65100', size: 11 });
        c2d.addText('blue: ω × rᵢ  (rotation about O)', -5.5, 3.75, { color: '#1565c0', size: 11 });
        c2d.addText('grey: vᵢ = v₀ + ω × rᵢ  (total)', -5.5, 3.3, { color: '#333', size: 11 });
      },
    },

    // ── Step 2: Moment of momentum of one particle ───────────────────────────
    {
      title: 'Moment of Momentum — Single Particle',
      description: 'The moment of momentum of particle P_i about O is h_i = r_i × m_i v_i. Because v_i ⊥ r_i (angle = 90°), the cross product simplifies to a scalar: |h_i| = m_i r_i v_i = m_i r_i² ω. It points out of the plane.',
      equation: '\\mathbf{h}_i = \\mathbf{r}_i \\times m_i \\mathbf{v}_i \\implies |h_i| = m_i r_i^2 \\omega',
      notes: 'The r² dependence is key — a particle twice as far contributes four times as much angular momentum. Distance from the axis matters quadratically.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state, dt) {
        state.theta += OMEGA * dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#ebebeb' });

        drawBody(c2d, state.theta, 0.4);
        drawOmega(c2d);

        const p = PARTICLES[0];
        const [x, y]   = pos(p, state.theta);
        const [vx, vy] = vel(p, state.theta);

        // Shaded parallelogram r × v (area = |h_i|/m_i)
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.moveTo(cam.wx(0),  cam.wy(0));
          ctx.lineTo(cam.wx(x),  cam.wy(y));
          ctx.lineTo(cam.wx(x + vx * V_SCALE), cam.wy(y + vy * V_SCALE));
          ctx.lineTo(cam.wx(vx * V_SCALE), cam.wy(vy * V_SCALE));
          ctx.closePath();
          ctx.fillStyle = 'rgba(21,101,192,0.08)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(21,101,192,0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        drawR(c2d, p, state.theta, '#c62828');
        drawV(c2d, p, state.theta, '#1565c0');
        drawParticles(c2d, state.theta, 0);

        // h_i value label
        const hval = hi(p);
        c2d.addText(`|hᵢ| = mᵢrᵢ²ω = ${hval.toFixed(2)}`, -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText(`mᵢ = ${p.m}, rᵢ = ${p.r}, ω = ${OMEGA}`, -5.5, 3.7, { color: '#888', size: 11 });

        c2d.addPoint(0, 0, { radius: 5, color: '#333' });
        c2d.addText('O', 0.15, -0.3, { color: '#333', size: 12 });

        // ⊙ symbol — h points out of page
        c2d.addText('⊙ hᵢ', x * 0.5 + 0.3, y * 0.5 + 0.5, { color: '#1565c0', size: 12 });
      },
    },

    // ── Step 3: Sum over all particles ───────────────────────────────────────
    {
      title: 'Summing Over All Particles',
      description: 'The total moment of momentum H is the sum of each particle\'s contribution. Since ω is the same for every point on the rigid body, it factors out of the sum.',
      equation: 'H = \\sum_i \\mathbf{r}_i \\times m_i\\mathbf{v}_i = \\omega \\sum_i m_i r_i^2',
      notes: 'Every particle contributes proportionally to m_i r_i². Particles far from O dominate — which is why mass distribution matters so much in rotating systems.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state, dt) {
        state.theta += OMEGA * dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#ebebeb' });

        drawBody(c2d, state.theta);
        drawOmega(c2d);

        // Show r and v for all particles
        PARTICLES.forEach((p, i) => {
          const [x, y]   = pos(p, state.theta);
          const [vx, vy] = vel(p, state.theta);
          c2d.addArrow(0, 0, x, y, { color: p.color + 'aa', width: 1.5 });
          c2d.addArrow(x, y, x + vx * V_SCALE, y + vy * V_SCALE, { color: p.color, width: 2 });
        });

        drawParticles(c2d, state.theta, null);

        // List contributions
        let sumStr = 'H = ω × (';
        const terms = PARTICLES.map(p => `${p.m}×${p.r}²`);
        sumStr = `ω·Σmᵢrᵢ² = ${OMEGA}×${I_TOTAL.toFixed(2)} = ${(OMEGA * I_TOTAL).toFixed(2)}`;
        c2d.addText(sumStr, -5.5, 4.2, { color: '#333', size: 12 });

        PARTICLES.forEach((p, i) => {
          c2d.addText(`h${i+1} = ${hi(p).toFixed(2)}`, -5.5, 3.7 - i * 0.45, { color: p.color, size: 11 });
        });

        c2d.addPoint(0, 0, { radius: 5, color: '#333' });
        c2d.addText('O', 0.15, -0.3, { color: '#333', size: 12 });
      },
    },

    // ── Step 4: From Σ to ∫ — discrete → continuous ─────────────────────────
    {
      title: 'From Sum to Integral',
      description: 'A real rigid body is not N point masses — it is a continuous distribution of matter. As N → ∞ and each mᵢ → dm, the sum becomes an integral over the body. The two expressions are exactly equivalent in the limit.',
      equation: 'h_0 = \\sum_i m_i\\, r_i^2\\,\\omega \\;\\xrightarrow{N\\to\\infty}\\; \\int r^2\\,dm\\cdot\\omega',
      notes: 'This is the same move as going from a Riemann sum to a Riemann integral. Each dm can be written as ρ(r) dV, turning it into a volume integral over the body\'s geometry. Use the slider to see the discrete approximation converge to ½MR².',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'number of rings  N', 1, 24, 1, state.nRings,
          v => Math.round(v), v => state.nRings = Math.round(v));
      },
      update(c2d, state, dt) {
        state.theta += OMEGA * dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#ebebeb' });

        const N      = state.nRings;
        const pts    = diskParticles(N);
        const iDisc  = iDiscrete(N);
        const errPct = Math.abs((iDisc - I_EXACT) / I_EXACT * 100);

        // Draw disk outline
        c2d.raw((ctx, cam) => {
          ctx.beginPath();
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(DISK_R), 0, Math.PI * 2);
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = 'rgba(21,101,192,0.04)';
          ctx.fill();
        });

        // Draw each particle dot, coloured by r²
        pts.forEach(p => {
          const x = p.r * Math.cos(p.phi + state.theta);
          const y = p.r * Math.sin(p.phi + state.theta);
          // Colour: blue (centre) → red (edge) by r/R
          const t = p.r / DISK_R;
          const r = Math.round(21 + t * (198 - 21));
          const g = Math.round(101 + t * (40 - 101));
          const b = Math.round(192 + t * (40 - 192));
          c2d.addPoint(x, y, { radius: 3, color: `rgb(${r},${g},${b})` });
        });

        // Origin
        c2d.addPoint(0, 0, { radius: 4, color: '#333' });
        c2d.addText('O', 0.12, -0.28, { color: '#333', size: 11 });

        // Stats panel
        c2d.addText(`particles: ${pts.length}`, -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText(`I_discrete = Σ mᵢrᵢ² = ${iDisc.toFixed(3)}`, -5.5, 3.75, { color: '#1565c0', size: 12 });
        c2d.addText(`I_exact    = ½MR²    = ${I_EXACT.toFixed(3)}`, -5.5, 3.3,  { color: '#2e7d32', size: 12 });
        c2d.addText(`error: ${errPct.toFixed(1)}%`, -5.5, 2.85,
          { color: errPct < 2 ? '#2e7d32' : errPct < 10 ? '#e65100' : '#c62828', size: 12 });
      },
    },

    // ── Step 5: H = Iω — the moment of inertia ───────────────────────────────
    {
      title: 'H = Iω — The Moment of Inertia',
      description: 'The coefficient of ω in the sum is called the moment of inertia I. It captures how mass is distributed relative to the rotation axis. A larger I means more angular momentum for the same ω.',
      equation: 'H = I\\omega \\qquad I = \\sum_i m_i r_i^2 = \\int r^2 \\, dm',
      notes: 'I is a property of the body and axis — not of the motion. Changing the rotation axis changes I. For a continuous body, the sum becomes an integral over the mass distribution.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state, dt) {
        state.theta += OMEGA * dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#ebebeb' });

        drawBody(c2d, state.theta);
        drawOmega(c2d);
        drawParticles(c2d, state.theta, null);

        // Draw r_i distances as dashed circles
        PARTICLES.forEach(p => {
          c2d.raw((ctx, cam) => {
            const cx = cam.wx(0), cy = cam.wy(0);
            const R = cam.ws(p.r);
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.strokeStyle = p.color + '30';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        });

        // r_i labels at right-hand intercept of each circle
        PARTICLES.forEach(p => {
          c2d.addText(`r=${p.r}`, p.r + 0.1, 0.1, { color: p.color + 'aa', size: 10 });
        });

        // I breakdown
        c2d.addText(`I = Σ mᵢrᵢ² = ${I_TOTAL.toFixed(2)}`, -5.5, 4.2, { color: '#333', size: 13 });
        PARTICLES.forEach((p, i) => {
          c2d.addText(
            `m${i+1}r${i+1}² = ${p.m}×${p.r}² = ${(p.m * p.r * p.r).toFixed(2)}`,
            -5.5, 3.7 - i * 0.45,
            { color: p.color, size: 11 }
          );
        });
        c2d.addText(
          `H = Iω = ${I_TOTAL.toFixed(2)} × ${OMEGA} = ${(I_TOTAL * OMEGA).toFixed(2)}`,
          -5.5, 1.8,
          { color: '#1565c0', size: 13 }
        );

        c2d.addPoint(0, 0, { radius: 5, color: '#333' });
        c2d.addText('O', 0.15, -0.3, { color: '#333', size: 12 });
      },
    },

  ],
};
