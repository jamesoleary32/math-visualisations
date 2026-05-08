// Scenario: Repulsive Inverse-Square Force → Hyperbolic Orbit
//
// Show that a particle subject to a central REPULSIVE force F = +K/r²
// (same magnitude as gravity, opposite sign) moves along the branch of a
// hyperbola that does NOT enclose the force centre.
//
// Compare directly with the attractive case to see both branches of the
// same hyperbola.

const K = 1;

// ── Orbit helpers ─────────────────────────────────────────────────────────────

// Attractive hyperbola: r = p/(1 + e·cosθ),  e > 1
// Particle swings around the focus (inside the orbit).
function attractiveR(p, e, theta) {
  const d = 1 + e * Math.cos(theta);
  return Math.abs(d) < 1e-6 ? Infinity : p / d;
}

// Repulsive hyperbola: r = p/(e·cosθ − 1),  e > 1
// Defined only where e·cosθ > 1, i.e. |θ| < arccos(1/e).
// Particle is deflected away from the focus (outside the orbit).
function repulsiveR(p, e, theta) {
  const d = e * Math.cos(theta) - 1;
  return d < 1e-6 ? Infinity : p / d;
}

function drawCurve(c2d, pts, color, live, width = 2) {
  if (pts.length < 2) return;
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width });
}

function sampleAttractive(p, e, nPts = 500) {
  const pts = [];
  for (let i = 0; i <= nPts; i++) {
    const t = (i / nPts) * Math.PI * 2;
    const r = attractiveR(p, e, t);
    if (!isFinite(r) || r > 25) { if (pts.length) return pts; continue; }
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

function sampleRepulsive(p, e, nPts = 500) {
  const half = Math.acos(1 / e) - 0.04; // angular half-width of valid range
  const pts  = [];
  for (let i = 0; i <= nPts; i++) {
    const t = -half + (i / nPts) * 2 * half;
    const r = repulsiveR(p, e, t);
    if (!isFinite(r) || r > 25) continue;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `ro-${label.replace(/[^a-z0-9]/gi, '')}`;
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

// ── Animation ─────────────────────────────────────────────────────────────────

function resetAnim(state) {
  // Start the particle at a large r near the incoming asymptote
  const e    = state.e, p = state.p;
  const half = Math.acos(1 / e);
  state.animTheta = -(half - 0.05); // just inside the valid range, incoming side
  state.animTrail = [];
}

function stepRepulsiveAnim(state, dt) {
  const { e, p, animSpeed } = state;
  const h    = Math.sqrt(K * p);
  const eff  = dt * animSpeed;
  const half = Math.acos(1 / e);

  const r = repulsiveR(p, e, state.animTheta);
  if (!isFinite(r) || r > 25) return null;

  state.animTheta += (h / (r * r)) * eff;

  // Reset when particle escapes on the other side
  if (state.animTheta >= half - 0.05) resetAnim(state);

  return { x: r * Math.cos(state.animTheta), y: r * Math.sin(state.animTheta) };
}

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return { e: 1.6, p: 1.5, animSpeed: 3, animTheta: 0, animTrail: [], _controls: null };
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Repulsive Inverse-Square Force',
  subject: 'Particle Dynamics — Scenario',

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 65;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'The Repulsive Force',
      description: 'Replace the attractive gravitational force F = −K/r² with a repulsive force of the same magnitude: F = +K/r². The particle is pushed away from the origin rather than pulled toward it. We want to find the shape of the trajectory.',
      equation: "\\text{Attractive:}\\quad F = -\\dfrac{K}{r^2} \\\\[10pt] \\text{Repulsive:}\\quad F = +\\dfrac{K}{r^2}",
      notes: 'Physical examples of repulsive inverse-square forces:\n\n• Electrostatic repulsion between like charges: F = +kq₁q₂/r² (Coulomb\'s law)\n• Rutherford scattering: alpha particle deflected by a gold nucleus\n\nAngular momentum is still conserved (force is central), so we can still use h = r²θ̇ and Binet\'s substitution. Only the sign of the forcing term changes.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        c2d.addPoint(0, 0, { radius: 8, color: '#c62828' });
        c2d.addText('repulsive centre', 0.2, -0.35, { color: '#c62828', size: 11 });

        // Show a sample force arrow pointing outward at a test point
        const rx = 2, ry = 1, rmag = Math.sqrt(rx*rx + ry*ry);
        const scale = 0.6;
        c2d.addArrow(rx, ry, rx + (rx/rmag)*scale, ry + (ry/rmag)*scale, { color: '#e65100', width: 2.5 });
        c2d.addText('F = +K/r²', rx + 0.6, ry + 0.2, { color: '#e65100', size: 12 });
        c2d.addPoint(rx, ry, { radius: 5, color: '#333' });

        const rx2 = -1.5, ry2 = 2;
        const rm2 = Math.sqrt(rx2*rx2+ry2*ry2);
        c2d.addArrow(rx2, ry2, rx2+(rx2/rm2)*scale, ry2+(ry2/rm2)*scale, { color: '#e65100', width: 2.5 });
        c2d.addPoint(rx2, ry2, { radius: 5, color: '#333' });
      },
      update() {},
    },

    {
      title: "Binet's Equation — Sign Change",
      description: "With u = 1/r, Binet's substitution gives a modified equation. The repulsive force flips the sign of the constant term, turning a pulled harmonic oscillator into a pushed one.",
      equation: "\\text{Attractive: }\\dfrac{d^2u}{d\\theta^2} + u = +\\dfrac{K}{h^2} \\\\[10pt] \\text{Repulsive: }\\dfrac{d^2u}{d\\theta^2} + u = -\\dfrac{K}{h^2}",
      notes: 'The general solution of d²u/dθ² + u = −K/h² is:\n\n  u = −K/h² + A cos(θ − θ₀)\n\nFor u > 0 (physical orbit), we need A cos(θ − θ₀) > K/h², which requires A > K/h², i.e. the eccentricity e = Ah²/K > 1.\n\nSo the repulsive orbit is always a hyperbola — there are no elliptic or parabolic solutions.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Plot u(θ) for attractive and repulsive cases with the same |A|
        const p = 1.5, e = 1.6;
        const h = Math.sqrt(K * p);
        const u0 = K / (h * h);      // = K/h² = 1/p
        const A  = e / p;             // = e · K/h²

        const ptAtt = [], ptRep = [];
        for (let i = 0; i <= 300; i++) {
          const t = (i / 300) * Math.PI * 2;
          const wx = (t / (Math.PI * 2)) * 7 - 3.5;
          const uAtt = u0 + A * Math.cos(t);
          const uRep = -u0 + A * Math.cos(t);
          if (uAtt > 0) ptAtt.push([wx, uAtt * 2.5]);
          if (uRep > 0 && uRep < 3) ptRep.push([wx, uRep * 2.5]);
        }

        c2d.addLine([[-3.5, 0], [3.8, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[-3.5, 0], [-3.5, 3.5]], { color: '#ccc', width: 1 });
        c2d.addLine(ptAtt, { color: '#1565c0', width: 2 });
        c2d.addLine(ptRep, { color: '#c62828', width: 2 });

        c2d.addLine([[-3.5, u0*2.5], [3.5, u0*2.5]],   { color: '#1565c0', width: 1, dash: [4,3] });
        c2d.addLine([[-3.5, -u0*2.5], [3.5, -u0*2.5]], { color: '#c62828', width: 1, dash: [4,3] });

        c2d.addText('attractive u(θ): oscillates above 0', -3.4, 3.0, { color: '#1565c0', size: 11 });
        c2d.addText('repulsive u(θ): spikes above 0 only near θ=0', -3.4, 2.5, { color: '#c62828', size: 11 });
        c2d.addText('θ', 3.6, -0.3, { color: '#888', size: 12 });
        c2d.addText('u = 1/r', -3.5, 3.5, { color: '#888', size: 11 });
      },
      update() {},
    },

    {
      title: 'The Orbit Equation — Repulsive Branch',
      description: 'The solution u = −K/h² + A cosθ rearranges to r = p/(e cosθ − 1). This is defined only for |θ| < arccos(1/e) — the particle never completes an orbit. It approaches, reaches closest approach, then escapes.',
      equation: "r = \\frac{p}{e\\cos\\theta - 1}, \\quad e > 1 \\\\[8pt] \\theta_{\\infty} = \\pm\\arccos\\!\\left(\\tfrac{1}{e}\\right)",
      notes: 'θ_∞ = arccos(1/e) is the asymptotic angle — the direction the particle comes from (and escapes to) as r → ∞.\n\nFor e = 1.6: θ_∞ = arccos(0.625) ≈ 51.3°. The particle is deflected through a total angle of 2·(90° − 51.3°) = 77.4° — significant deflection despite never being captured.\n\nFor e → 1⁺: θ_∞ → 0 — the particle just grazes the force centre and bounces straight back.\nFor e → ∞: θ_∞ → 90° — the particle passes almost straight through with minimal deflection.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 1.05, 3.0, 0.05, state.e, v => state.e = v);
        addSlider(state._controls, 'semi-latus rectum  p', 0.5, 3.0, 0.05, state.p, v => state.p = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e, p } = state;
        const half     = Math.acos(1 / e);

        // Repulsive branch (red)
        const repPts = sampleRepulsive(p, e);
        drawCurve(c2d, repPts, '#c62828', false, 2.5);

        // Attractive branch (blue, dashed — for reference)
        const attPts = sampleAttractive(p, e);
        drawCurve(c2d, attPts, '#1565c0', false, 1.5);
        c2d.addLine(attPts, { color: '#1565c0', width: 1.5, dash: [5, 4] });

        // Force centre
        c2d.addPoint(0, 0, { radius: 7, color: '#c62828' });

        // Closest approach — at θ = 0
        const rMin = repulsiveR(p, e, 0);
        if (isFinite(rMin) && rMin < 20) {
          c2d.addPoint(rMin, 0, { radius: 5, color: '#333' });
          c2d.addText(`r_min = ${rMin.toFixed(2)}`, rMin + 0.12, 0.2, { color: '#333', size: 11 });
        }

        // Asymptote directions
        const ax = Math.cos(half) * 6, ay = Math.sin(half) * 6;
        c2d.addLine([[0, 0], [ ax,  ay]], { color: '#888', width: 1, dash: [4, 3] });
        c2d.addLine([[0, 0], [ ax, -ay]], { color: '#888', width: 1, dash: [4, 3] });
        c2d.addText(`θ_∞ = ±${(half * 180 / Math.PI).toFixed(1)}°`, 0.2, 3.2, { color: '#888', size: 11 });

        c2d.addText('repulsive branch', -4.5, 3.3, { color: '#c62828', size: 12 });
        c2d.addText('attractive branch (dashed)', -4.5, 2.85, { color: '#1565c0', size: 11 });
        c2d.addText(`e = ${e.toFixed(2)},  deflection = ${((Math.PI/2 - half) * 2 * 180/Math.PI).toFixed(1)}°`,
          -4.5, 2.4, { color: '#555', size: 11 });
      },
    },

    {
      title: 'Animated Trajectory',
      description: 'The particle arrives from the incoming asymptote, reaches closest approach at the vertex, then escapes along the outgoing asymptote. The force centre is never enclosed — the orbit is open.',
      equation: "r_\\min = \\frac{p}{e-1}, \\qquad \\delta = 2\\arctan\\!\\left(\\frac{1}{\\sqrt{e^2-1}}\\right)",
      notes: 'δ is the deflection angle (how much the trajectory bends).\n\nIn Rutherford scattering, α-particles fired at a gold foil follow exactly this trajectory. Rutherford used the deflection angle distribution to deduce that atomic nuclei are tiny, dense, and positively charged — disproving the "plum pudding" model in 1911.\n\nThe formula for δ in terms of impact parameter b (perpendicular distance from force centre to incoming path): cot(δ/2) = bv₀²/K.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 1.05, 3.0, 0.05, state.e, v => { state.e = v; resetAnim(state); });
        addSlider(state._controls, 'speed', 1, 8, 0.5, state.animSpeed, v => state.animSpeed = v);

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        // Draw static orbit shape
        const repPts = sampleRepulsive(state.p, state.e);
        c2d.addLine(repPts, { color: '#c62828', width: 1.5, dash: [5, 4] });
        c2d.addPoint(0, 0, { radius: 7, color: '#c62828' });

        // Asymptotes
        const half = Math.acos(1 / state.e);
        const ax = Math.cos(half) * 6, ay = Math.sin(half) * 6;
        c2d.addLine([[0, 0], [ax,  ay]], { color: '#bbb', width: 1, dash: [3, 3] });
        c2d.addLine([[0, 0], [ax, -ay]], { color: '#bbb', width: 1, dash: [3, 3] });

        resetAnim(state);
      },
      update(c2d, state, dt) {
        const pos = stepRepulsiveAnim(state, dt);
        if (!pos) return;

        state.animTrail.push([pos.x, pos.y]);
        if (state.animTrail.length > 300) state.animTrail.shift();

        if (state.animTrail.length > 1) {
          c2d.showLine(state.animTrail, { color: '#c62828', width: 2.5 });
        }
        c2d.showPoint(pos.x, pos.y, { radius: 6, color: '#222' });

        const { e, p } = state;
        const half     = Math.acos(1 / e);
        const deflect  = 2 * Math.atan(1 / Math.sqrt(e * e - 1));
        c2d.showText(`deflection δ = ${(deflect * 180 / Math.PI).toFixed(1)}°`, -4.5, 3.2,
          { color: '#c62828', size: 12 });
        c2d.showText(`r_min = ${(p / (e - 1)).toFixed(2)}`, -4.5, 2.75, { color: '#555', size: 11 });
      },
    },
  ],
};
