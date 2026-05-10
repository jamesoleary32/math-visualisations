// Pendulum — from Newton's law to SHM, phase portrait, and nonlinear corrections.
// Normalised units: g/L = 1, so ω₀ = 1 and T_SHM = 2π.

// ── Physics ───────────────────────────────────────────────────────────────────

const G_OVER_L = 1; // normalised

// RK4 step for the pendulum system:  dθ/dt = ω,  dω/dt = −sin(θ)
function rk4(theta, omega, dt) {
  const f = (th, om) => ({ dth: om, dom: -G_OVER_L * Math.sin(th) });
  const k1 = f(theta,               omega);
  const k2 = f(theta + dt*k1.dth/2, omega + dt*k1.dom/2);
  const k3 = f(theta + dt*k2.dth/2, omega + dt*k2.dom/2);
  const k4 = f(theta + dt*k3.dth,   omega + dt*k3.dom);
  return {
    theta: theta + dt*(k1.dth + 2*k2.dth + 2*k3.dth + k4.dth)/6,
    omega: omega + dt*(k1.dom + 2*k2.dom + 2*k3.dom + k4.dom)/6,
  };
}

// Energy: E = ½ω² + (1 − cosθ).  Separatrix at E = 2.
function energy(theta, omega) { return 0.5*omega*omega + (1 - Math.cos(theta)); }

// Nonlinear period (numerical, for comparison)
function nonlinearPeriod(theta0) {
  // Integrate one full period starting from (theta0, 0)
  let th = theta0, om = 0;
  const dt = 0.005;
  let t = 0, crossed = false;
  for (let i = 0; i < 20000; i++) {
    const prev_th = th;
    ({ theta: th, omega: om } = rk4(th, om, dt));
    t += dt;
    // Wait for it to cross zero again with negative θ rate (descending through 0)
    if (i > 50 && prev_th > 0 && th <= 0) { t *= 2; break; } // half-period × 2
  }
  return t;
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `pd-${label.replace(/[^a-z0-9]/gi, '')}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span>
      <span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(2)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const vel = wrap.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); vel.textContent = v.toFixed(2); onChange(v); });
}

// ── Drawing ───────────────────────────────────────────────────────────────────

// Draw the physical pendulum given current angle theta.
// Pivot at (0, pivY) in world coords, visual arm length L_vis.
function drawPendulum(c2d, theta, pivY, L_vis, live) {
  const bx = L_vis * Math.sin(theta);
  const by = pivY  - L_vis * Math.cos(theta);
  const fn = live ? 'show' : 'add';

  // Arm
  c2d[fn + 'Line']([[0, pivY], [bx, by]], { color: '#555', width: 2 });
  // Pivot
  c2d[fn + 'Point'](0, pivY, { radius: 5, color: '#888' });
  // Bob
  c2d[fn + 'Point'](bx, by, { radius: 12, color: '#1565c0' });
}

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return {
    amp:    0.4,       // initial angle (rad) for SHM step
    theta:  0.4,
    omega:  0,
    time:   0,
    speed:  1.5,
    trail:  [],        // bob trail for pendulum animation
    _controls: null,
  };
}

function resetPendulum(state) {
  state.theta = state.amp;
  state.omega = 0;
  state.time  = 0;
  state.trail = [];
}

// ── Lesson ────────────────────────────────────────────────────────────────────

const PIV_Y  = 2.8;  // pivot y in world coords
const L_VIS  = 2.3;  // visual arm length

export default {
  title:   'The Pendulum',
  subject: 'Differential Equations',

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 70;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    // ── Step 1: The ODE ───────────────────────────────────────────────────────
    {
      title: 'The Pendulum ODE',
      description: 'Newton\'s second law for rotation gives a second-order ODE in the angle θ. For small angles sin θ ≈ θ, reducing it to the simple harmonic oscillator — one of the most important equations in physics.',
      equation: "\\underbrace{\\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0}_{\\text{exact}} \\\\[12pt] \\underbrace{\\ddot{\\theta} + \\omega_0^2\\,\\theta = 0}_{\\text{small angle, }\\omega_0 = \\sqrt{g/L}}",
      notes: 'Derivation: torque τ = −mgL sinθ, angular momentum L = mL²θ̇, so τ = d/dt(L) gives mL²θ̈ = −mgL sinθ → θ̈ + (g/L)sinθ = 0.\n\nThe small-angle approximation sinθ ≈ θ (error < 1% for θ < 14°) linearises the equation, making it exactly solvable.\n\nThis is a 2nd-order ODE — it can be written as two coupled 1st-order ODEs:\n  dθ/dt = ω\n  dω/dt = −(g/L) sinθ\n\nThis "state vector" form (θ, ω) is how computers integrate it.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Static diagram: pendulum at an angle
        const theta0 = 0.55;
        drawPendulum(c2d, theta0, PIV_Y, L_VIS, false);

        // Angle arc
        c2d.raw((ctx, self) => {
          ctx.save();
          ctx.strokeStyle = '#c62828'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(self.wx(0), self.wy(PIV_Y), self.ws(0.7), -Math.PI/2, -Math.PI/2 + theta0, false);
          ctx.stroke();
          ctx.restore();
        });
        const ax = 0.55 * Math.sin(theta0 / 2), ay = PIV_Y - 0.55 * Math.cos(theta0 / 2);
        c2d.addText('θ', ax + 0.08, ay, { color: '#c62828', size: 14 });

        // Force arrows on bob
        const bx = L_VIS * Math.sin(theta0), by = PIV_Y - L_VIS * Math.cos(theta0);
        c2d.addArrow(bx, by, bx,           by - 0.8, { color: '#2e7d32', width: 2 }); // mg
        c2d.addArrow(bx, by, bx - 0.8*Math.sin(theta0)*Math.cos(theta0)*0,
                              by, { color: '#e65100', width: 1.5 });
        c2d.addText('mg', bx + 0.12, by - 0.4, { color: '#2e7d32', size: 12 });

        // Vertical reference
        c2d.addLine([[0, PIV_Y], [0, PIV_Y - L_VIS - 0.3]], { color: '#ddd', width: 1, dash: [4,3] });
      },
      update() {},
    },

    // ── Step 2: SHM solution and animation ────────────────────────────────────
    {
      title: 'Simple Harmonic Motion',
      description: 'The linearised equation θ̈ + ω₀²θ = 0 has the exact solution θ(t) = A cos(ω₀t + φ). The period depends on length but not on amplitude — a key feature of SHM.',
      equation: "\\theta(t) = A\\cos(\\omega_0 t + \\varphi) \\\\[8pt] T = \\frac{2\\pi}{\\omega_0} = 2\\pi\\sqrt{\\frac{L}{g}}",
      notes: 'The period T = 2π√(L/g) is independent of amplitude A — this is why pendulum clocks work. A larger swing takes exactly as long as a small one (in the small-angle limit).\n\nThe angular frequency ω₀ = √(g/L) sets how fast the pendulum oscillates. Doubling the length multiplies the period by √2 ≈ 1.41.\n\nThis approximation breaks down for large amplitudes — the true nonlinear pendulum has a longer period (explored in step 4).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'amplitude  A (rad)', 0.05, 0.8, 0.01, state.amp, v => {
          state.amp = v; resetPendulum(state);
        });
        addSlider(state._controls, 'speed', 0.5, 4, 0.1, state.speed, v => state.speed = v);
        resetPendulum(state);
      },
      update(c2d, state, dt) {
        const eff = dt * state.speed;

        // SHM: use exact solution (no numerical error)
        const omega0 = Math.sqrt(G_OVER_L);
        state.time  += eff;
        state.theta  = state.amp * Math.cos(omega0 * state.time);
        state.omega  = -state.amp * omega0 * Math.sin(omega0 * state.time);

        const bx = L_VIS * Math.sin(state.theta);
        const by = PIV_Y - L_VIS * Math.cos(state.theta);

        state.trail.push([bx, by]);
        if (state.trail.length > 180) state.trail.shift();

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Equilibrium reference
        c2d.addLine([[0, PIV_Y], [0, PIV_Y - L_VIS - 0.2]], { color: '#eee', width: 1, dash: [4,3] });

        // Bob trail
        if (state.trail.length > 1) c2d.showLine(state.trail, { color: 'rgba(21,101,192,0.3)', width: 1.5 });

        drawPendulum(c2d, state.theta, PIV_Y, L_VIS, true);

        const T = 2 * Math.PI / omega0;
        c2d.showText(`θ = ${state.theta.toFixed(3)} rad`, -4.5, -2.5, { color: '#1565c0', size: 12 });
        c2d.showText(`T = 2π/ω₀ = ${T.toFixed(3)}`, -4.5, -3.0, { color: '#555', size: 11 });
      },
    },

    // ── Step 3: Phase portrait ────────────────────────────────────────────────
    {
      title: 'The Phase Portrait',
      description: 'Plotting dθ/dt against θ (the "phase plane") gives a complete picture of all possible motions. Each trajectory is a curve of constant energy. The separatrix divides bounded oscillations from full rotations.',
      equation: "E = \\tfrac{1}{2}\\dot{\\theta}^2 + (1 - \\cos\\theta) = \\text{const} \\\\[8pt] \\text{separatrix at } E = 2 \\;(\\theta = \\pm\\pi,\\; \\dot\\theta = 0)",
      notes: 'Closed curves (ellipses near origin): bounded oscillation — the pendulum swings back and forth.\n\nOpen curves above/below: full rotation — the pendulum goes over the top continuously.\n\nThe separatrix (red) passes through the saddle points at (±π, 0) — the unstable upright equilibrium. Exactly on the separatrix, the pendulum takes infinite time to reach the top.\n\nNear the origin, the curves are true ellipses (SHM approximation). Further out they bulge — a signature of the nonlinear sin term.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Axis labels
        c2d.addLine([[-4.5, 0], [4.5, 0]], { color: '#ddd', width: 1 });
        c2d.addLine([[0, -3.5], [0, 3.5]], { color: '#ddd', width: 1 });
        c2d.addText('θ', 4.3, -0.3, { color: '#888', size: 12 });
        c2d.addText('dθ/dt', 0.15, 3.4, { color: '#888', size: 12 });

        // Scale: world x = θ (rad), world y = ω (rad/s)
        // π ≈ 3.14 fits nicely in the world range ±4.5

        // Mark ±π on x-axis
        c2d.addPoint( Math.PI, 0, { radius: 4, color: '#888' });
        c2d.addPoint(-Math.PI, 0, { radius: 4, color: '#888' });
        c2d.addText('+π', Math.PI + 0.1, -0.3, { color: '#888', size: 11 });
        c2d.addText('−π', -Math.PI - 0.6, -0.3, { color: '#888', size: 11 });

        // Stable equilibrium
        c2d.addPoint(0, 0, { radius: 6, color: '#2e7d32' });

        const DT = 0.015;

        // Closed orbits (E < 2)
        const closedEnergies = [0.1, 0.4, 0.9, 1.5, 1.9];
        for (const E of closedEnergies) {
          const om0 = Math.sqrt(2 * E);  // ω at θ = 0
          let th = 0, om = om0;
          const pts = [[th, om]];
          for (let i = 0; i < 6000; i++) {
            ({ theta: th, omega: om } = rk4(th, om, DT));
            pts.push([th, om]);
            if (i > 100 && Math.abs(th) < 0.05 && om > 0) break; // back to start
          }
          // Mirror to get full closed orbit
          const mirrored = pts.slice().reverse().map(([t, o]) => [t, -o]);
          c2d.addLine([...pts, ...mirrored, pts[0]], { color: '#1565c0', width: 1.5 });
        }

        // Separatrix (E = 2): ω = ±2cos(θ/2)
        const sepPts1 = [], sepPts2 = [];
        for (let th = -Math.PI + 0.01; th <= Math.PI - 0.01; th += 0.02) {
          const om = 2 * Math.abs(Math.cos(th / 2));
          sepPts1.push([th,  om]);
          sepPts2.push([th, -om]);
        }
        c2d.addLine(sepPts1, { color: '#c62828', width: 2 });
        c2d.addLine(sepPts2, { color: '#c62828', width: 2 });
        c2d.addText('separatrix  E = 2', 0.2, 2.2, { color: '#c62828', size: 11 });

        // Rotating orbits (E > 2) — extend beyond ±π
        for (const E of [2.2, 2.8, 4.0]) {
          const om0 = Math.sqrt(2 * E);
          const pts1 = [], pts2 = [];
          for (let th = -4; th <= 4; th += 0.05) {
            const om = Math.sqrt(Math.max(0, 2*(E - (1 - Math.cos(th)))));
            if (isFinite(om)) { pts1.push([th, om]); pts2.push([th, -om]); }
          }
          c2d.addLine(pts1, { color: '#2e7d32', width: 1.5 });
          c2d.addLine(pts2, { color: '#2e7d32', width: 1.5 });
        }
        c2d.addText('rotation (E > 2)', 1.0, 3.2, { color: '#2e7d32', size: 11 });
        c2d.addText('oscillation (E < 2)', -4.3, 0.8, { color: '#1565c0', size: 11 });
      },
      update(c2d, state, dt) {
        // Animate a moving dot on the phase portrait
        const eff = dt * state.speed;
        ({ theta: state.theta, omega: state.omega } = rk4(state.theta, state.omega, eff));

        // Keep theta in [-π, π] for display (don't wrap ω)
        const E = energy(state.theta, state.omega);

        c2d.showPoint(state.theta, state.omega, { radius: 7, color: '#e65100' });
        c2d.showText(`E = ${E.toFixed(3)}`, -4.5, -3.0, { color: '#e65100', size: 12 });
        c2d.showText(`θ = ${state.theta.toFixed(3)}  ω = ${state.omega.toFixed(3)}`, -4.5, -3.5,
          { color: '#888', size: 11 });
      },
    },

    // ── Step 4: Nonlinear period ──────────────────────────────────────────────
    {
      title: 'Nonlinear Corrections — Period vs Amplitude',
      description: 'For large amplitudes the small-angle approximation fails. The true period is always longer than 2π — the pendulum swings more slowly because sin θ < θ (the restoring force is weaker than SHM predicts).',
      equation: "T(A) = 2\\pi\\sqrt{\\frac{L}{g}}\\left(1 + \\frac{A^2}{16} + \\frac{11A^4}{3072} + \\cdots\\right)",
      notes: 'At A = 30° (0.52 rad): T ≈ 1.017 × T_SHM — only 1.7% longer.\nAt A = 90° (π/2 rad): T ≈ 1.18 × T_SHM — 18% longer.\nAt A = 170° (close to top): T → ∞ — the pendulum barely makes it over.\n\nThe series expansion T = T_SHM(1 + A²/16 + ...) comes from the exact elliptic integral formula for the period. The leading correction grows as A².\n\nThis is why large grandfather clocks must be carefully levelled — a small tilt changes the effective g and shifts the period.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'amplitude  A (rad)', 0.05, 3.0, 0.02, state.amp, v => {
          state.amp = v; resetPendulum(state);
        });
        addSlider(state._controls, 'speed', 0.5, 4, 0.1, state.speed, v => state.speed = v);

        // Pre-compute T(A) curve
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addLine([[-4.5, 0], [4.5, 0]], { color: '#ddd', width: 1 });
        c2d.addLine([[-4.5, -2.5], [-4.5, 3.5]], { color: '#ddd', width: 1 });

        // T_SHM = 2π ≈ 6.28, normalised to 1 on y-axis
        // x-axis: A from 0 to π, mapped to world -4.5 to 3.5
        const aSamples = [], tSamples = [];
        for (let a = 0.05; a < Math.PI - 0.05; a += 0.05) {
          const T    = nonlinearPeriod(a);
          const Tshm = 2 * Math.PI;
          aSamples.push(a);
          tSamples.push(T / Tshm);
        }

        // Plot T/T_SHM vs A
        const toWorld = (a, tRatio) => [
          -4.5 + (a / Math.PI) * 8,
          -2.5 + (tRatio - 1) * 12,
        ];

        // SHM reference line (T/T_SHM = 1)
        c2d.addLine([[-4.5, -2.5], [3.5, -2.5]], { color: '#bbb', width: 1, dash: [4,3] });
        c2d.addText('T_SHM = 2π', 2.2, -2.2, { color: '#bbb', size: 11 });

        // Nonlinear curve
        const curvePts = aSamples.map((a, i) => toWorld(a, tSamples[i]));
        c2d.addLine(curvePts, { color: '#c62828', width: 2.5 });
        c2d.addText('T (nonlinear)', -3.5, 2.5, { color: '#c62828', size: 12 });

        // Axis labels
        c2d.addText('A (rad)', 3.3, -2.8, { color: '#888', size: 11 });
        c2d.addText('T/T_SHM', -4.5, 3.5, { color: '#888', size: 11 });

        // π label on x-axis
        c2d.addText('π', 3.5, -2.8, { color: '#888', size: 11 });

        resetPendulum(state);
      },
      update(c2d, state, dt) {
        const eff = dt * state.speed;
        // Integrate full nonlinear pendulum
        ({ theta: state.theta, omega: state.omega } = rk4(state.theta, state.omega, eff));
        state.time += eff;

        const T_shm = 2 * Math.PI;
        const T_nl  = nonlinearPeriod(state.amp);
        const ratio = T_nl / T_shm;

        // Mark current amplitude on the chart
        const toWorld = (a, r) => [-4.5 + (a / Math.PI)*8, -2.5 + (r - 1)*12];
        const [mx, my] = toWorld(state.amp, ratio);
        c2d.showPoint(mx, my, { radius: 6, color: '#e65100' });

        // Also draw the live pendulum (small, bottom-right)
        const px = 3.5 + L_VIS * 0.6 * Math.sin(state.theta);
        const py = 1.5 - L_VIS * 0.6 * Math.cos(state.theta);
        c2d.showLine([[3.5, 1.5], [px, py]], { color: '#555', width: 1.5 });
        c2d.showPoint(3.5, 1.5, { radius: 3, color: '#888' });
        c2d.showPoint(px,  py,  { radius: 7, color: '#1565c0' });

        c2d.showText(`A = ${state.amp.toFixed(2)} rad`, -4.5, 3.2, { color: '#555', size: 12 });
        c2d.showText(`T/T_SHM = ${ratio.toFixed(3)}`, -4.5, 2.7, { color: '#c62828', size: 12 });
      },
    },
  ],
};
