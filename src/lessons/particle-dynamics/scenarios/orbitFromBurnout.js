// Scenario: Orbit from Burnout Conditions — Thomson Example 4.13-I
//
// A satellite is launched with:
//   r₀v₀²/K = 1.40   (dimensionless energy parameter χ)
//   β₀ = 20°          (heading angle from normal to r, i.e. from θ̂)
//   r₀/R = 2.0        (injection radius in units of Earth radius)
//
// Goal: find eccentricity e and semi-major axis a/R, and locate initial
// position θ₀ relative to perigee.
//
// References: Thomson "Introduction to Space Dynamics" §4.9, §4.13.

// ── Orbital mechanics ─────────────────────────────────────────────────────────

const K  = 1.0;
const R  = 1.0;   // Earth radius (normalised)
const R0 = 2.0 * R;

function computeOrbit(chi, betaDeg) {
  const b   = betaDeg * Math.PI / 180;
  const v0  = Math.sqrt(chi * K / R0);
  const h   = R0 * v0 * Math.cos(b);
  const p   = h * h / K;
  const eCosT = chi * Math.cos(b) * Math.cos(b) - 1;
  const eSinT = chi * Math.sin(b) * Math.cos(b);
  const e     = Math.sqrt(eCosT * eCosT + eSinT * eSinT);
  const theta0 = Math.atan2(eSinT, eCosT);
  const a  = p / (1 - e * e);        // semi-major axis (negative = hyperbola)
  const E  = 0.5 * v0 * v0 - K / R0; // specific energy
  return { chi, b, v0, h, p, e, theta0, eCosT, eSinT, a, E };
}

function orbitColor(e) {
  if (e < 0.01)  return '#2e7d32';
  if (e < 1)     return '#1565c0';
  if (e < 1.02)  return '#e65100';
  return '#7b1fa2';
}
function orbitTypeName(e) {
  if (e < 0.01) return 'Circular';
  if (e < 1)    return 'Ellipse';
  if (e < 1.02) return 'Parabola';
  return 'Hyperbola';
}

function traceOrbit(orb) {
  const { p, e, theta0 } = orb;
  const segs = [[]];
  for (let i = 0; i <= 600; i++) {
    const phi = (i / 600) * Math.PI * 2;
    const d   = 1 + e * Math.cos(phi + theta0);
    if (Math.abs(d) < 0.05) { if (segs[segs.length-1].length) segs.push([]); continue; }
    const r   = p / d;
    if (r < 0 || r > 25) { if (segs[segs.length-1].length) segs.push([]); continue; }
    segs[segs.length-1].push([r * Math.cos(phi), r * Math.sin(phi)]);
  }
  return segs.filter(s => s.length > 1);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawEarth(c2d) {
  c2d.raw((ctx, cam) => {
    ctx.beginPath();
    ctx.arc(cam.wx(0), cam.wy(0), cam.ws(R), 0, Math.PI*2);
    ctx.fillStyle = '#1565c0'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', cam.wx(0), cam.wy(0) + 4);
    ctx.textAlign = 'left';
  });
}

function drawOrbit(c2d, orb, live) {
  const color = orbitColor(orb.e);
  for (const seg of traceOrbit(orb)) {
    if (live) c2d.showLine(seg, { color, width: 2.5 });
    else      c2d.addLine(seg, { color, width: 2.5 });
  }
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `ob-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#1565c0">
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
  title:   'Orbit from Burnout Conditions (Ex. 4.13-I)',
  subject: 'Particle Dynamics — Scenario',

  initState: () => ({
    chi: 1.40,       // r₀v₀²/K
    betaDeg: 20,     // heading angle
    _controls: null,
  }),

  init(c2d, state, panelEl) {
    c2d.scale = 65;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: Setting up the problem ───────────────────────────────────────
    {
      title: 'Burnout Conditions',
      description: 'At rocket engine cutoff, three numbers characterise the satellite\'s state completely: the injection radius r₀, the speed v₀, and the heading angle β₀ measured from the local transverse direction θ̂. From these three scalars we can determine the entire orbit.',
      equation: "\\chi = \\frac{r_0 v_0^2}{K} = 1.40 \\qquad \\beta_0 = 20^\\circ \\qquad \\frac{r_0}{R} = 2.0",
      notes: 'χ = r₀v₀²/K is the dimensionless "energy parameter". It tells you the orbit type at a glance:\n  χ < 1: subcircular — always an ellipse for β₀ = 0\n  χ = 1: circular orbit (when β₀ = 0)\n  χ = 2: escape orbit (parabola) for β₀ = 0\n  χ > 2: hyperbola\n\nHere χ = 1.40 with β₀ = 20° — the satellite is in a bound elliptical orbit but not circular.\n\nThe injection point is fixed at (r₀, 0), i.e. directly to the right of the focus. r₀ = 2R = 2 Earth radii altitude (above centre).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'χ = r₀v₀²/K', 0.5, 3.0, 0.05, state.chi,
          v => v.toFixed(2), v => state.chi = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);

        // Show injection point
        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });
        c2d.addLine([[0, 0], [R0, 0]], { color: '#888', width: 1, dash: [3, 2] });
        c2d.addText('r₀ = 2R', R0 * 0.42, 0.2, { color: '#888', size: 11, italic: true });
        c2d.addText('burnout', R0 + 0.12, 0.25, { color: '#e65100', size: 11 });

        // Show β₀ meaning: angle from θ̂ (vertical at injection)
        c2d.addLine([[R0, -0.8], [R0, 0.8]], { color: '#ccc', width: 1, dash: [3, 2] });
        c2d.addText('θ̂ (normal to r)', R0 + 0.1, 0.85, { color: '#bbb', size: 10, italic: true });
      },
      update(c2d, state) {
        const orb = computeOrbit(state.chi, state.betaDeg);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
        drawOrbit(c2d, orb, false);

        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });
        c2d.addLine([[0, 0], [R0, 0]], { color: '#888', width: 1, dash: [3, 2] });
        c2d.addLine([[R0, -0.8], [R0, 0.8]], { color: '#ccc', width: 1, dash: [3, 2] });
        c2d.addText('θ̂', R0 + 0.1, 0.85, { color: '#bbb', size: 11, italic: true });

        // Velocity vector
        const VS = 2.2;
        const b  = orb.b;
        const vx = orb.v0 * Math.sin(b) * VS;
        const vy = orb.v0 * Math.cos(b) * VS;
        c2d.showArrow(R0, 0, R0 + vx, vy, { color: '#7b1fa2', width: 2.5 });
        c2d.showText('v₀', R0 + vx + 0.1, vy + 0.1, { color: '#7b1fa2', size: 13, italic: true });

        // β₀ arc
        c2d.showRaw((ctx, cam) => {
          if (Math.abs(state.betaDeg) < 1) return;
          const sx = cam.wx(R0), sy = cam.wy(0);
          const arcR = cam.ws(0.5);
          const startA = -Math.PI / 2;
          const endA   = -Math.PI / 2 + b;
          ctx.beginPath();
          ctx.arc(sx, sy, arcR, startA, endA, b < 0);
          ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 1.5; ctx.stroke();
          const midA = (startA + endA) / 2;
          ctx.fillStyle = '#7b1fa2'; ctx.font = 'italic 12px Georgia,serif';
          ctx.fillText('β₀', sx + Math.cos(midA) * (arcR + 12), sy + Math.sin(midA) * (arcR + 10));
        });

        const color = orbitColor(orb.e);
        c2d.showText(`${orbitTypeName(orb.e)}   e = ${orb.e.toFixed(3)}`, -4.5, 3.5, { color, size: 13 });
        c2d.showText(`χ = ${state.chi.toFixed(2)},  β₀ = ${state.betaDeg}°`, -4.5, 3.0, { color: '#888', size: 11 });
      },
    },

    // ── Step 2: Angular momentum and semi-latus rectum ───────────────────────
    {
      title: 'Angular Momentum h and Semi-Latus Rectum p',
      description: 'Only the transverse component of v₀ contributes to angular momentum h = r₀v₀ cos β₀. The semi-latus rectum p = h²/K then gives the orbit scale. The radial component v₀ sin β₀ tells us how fast r is changing at injection — it only shifts where on the orbit injection occurs.',
      equation: "h = r_0 v_0 \\cos\\beta_0 \\qquad p = \\frac{h^2}{K}",
      notes: 'Numerically (with K = 1, r₀ = 2, χ = 1.40, β₀ = 20°):\n  v₀ = √(χK/r₀) = √(1.40/2) = 0.8367\n  h  = r₀v₀ cosβ₀ = 2 × 0.8367 × cos20° = 1.573\n  p  = h²/K = 2.474\n\nA pure radial launch (β₀ = ±90°) gives h = 0, so the satellite falls straight back. In that degenerate case there is no orbit — use the green arrow to see how the orbit shrinks as β₀ → ±90°.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'χ = r₀v₀²/K', 0.5, 3.0, 0.05, state.chi,
          v => v.toFixed(2), v => state.chi = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);

        const VS = 2.2;
        const b = orb.b;
        const vTrans = orb.v0 * Math.cos(b);
        const vRad   = orb.v0 * Math.sin(b);

        c2d.addPoint(R0, 0, { radius: 6, color: '#e65100' });
        c2d.addLine([[0, 0], [R0, 0]], { color: '#888', width: 1, dash: [3, 2] });

        // Transverse component (green, upward)
        c2d.showArrow(R0, 0, R0, vTrans * VS, { color: '#2e7d32', width: 2.5 });
        c2d.showText(`v₀cosβ₀ = ${vTrans.toFixed(3)}`, R0 + 0.12, vTrans * VS * 0.5, { color: '#2e7d32', size: 11 });

        // Radial component (red, horizontal)
        if (Math.abs(vRad) > 0.01) {
          c2d.showArrow(R0, 0, R0 + vRad * VS, 0, { color: '#c62828', width: 2 });
          c2d.showText('v₀sinβ₀', R0 + vRad * VS * 0.4, -0.3, { color: '#c62828', size: 11 });
        }

        // Total velocity
        c2d.showArrow(R0, 0, R0 + vRad * VS, vTrans * VS, { color: '#7b1fa2', width: 2 });
        c2d.showText('v₀', R0 + vRad * VS + 0.1, vTrans * VS + 0.1, { color: '#7b1fa2', size: 13, italic: true });

        c2d.showText(`h = ${orb.h.toFixed(3)}`, -4.5, 3.5, { color: '#2e7d32', size: 13 });
        c2d.showText(`p = h²/K = ${orb.p.toFixed(3)}`, -4.5, 3.0, { color: '#555', size: 12 });
      },
    },

    // ── Step 3: Eccentricity and initial angle θ₀ ────────────────────────────
    {
      title: 'Eccentricity e and Initial Angle θ₀',
      description: 'Substituting the velocity components into the orbit equation and its time derivative at the injection point gives e cos θ₀ and e sin θ₀ separately. These two scalars fix both e and where on the orbit injection occurred.',
      equation: "e\\cos\\theta_0 = \\chi\\cos^2\\!\\beta_0 - 1 \\qquad e\\sin\\theta_0 = \\chi\\sin\\beta_0\\cos\\beta_0",
      notes: 'For χ = 1.40, β₀ = 20°:\n  e cosθ₀ = 1.40 × cos²20° − 1 = 1.40 × 0.883 − 1 = 0.236\n  e sinθ₀ = 1.40 × sin20° × cos20° = 1.40 × 0.321 = 0.450\n\n  e   = √(0.236² + 0.450²) = 0.509\n  θ₀  = arctan(0.450/0.236) = 62.3°\n\nSo at injection, the satellite is at 62.3° ahead of perigee.\n\nThe perigee direction is shown as the red dashed line — it\'s rotated 62.3° clockwise from the injection point.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'χ = r₀v₀²/K', 0.5, 3.0, 0.05, state.chi,
          v => v.toFixed(2), v => state.chi = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);

        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });
        c2d.addLine([[0, 0], [R0, 0]], { color: '#888', width: 1, dash: [3, 2] });

        // Perigee direction (opposite of theta0 in world coords)
        const thetaP = -orb.theta0;
        const rp = orb.p / (1 + orb.e);
        if (orb.e > 0.05 && isFinite(rp) && rp < 20) {
          const px = rp * Math.cos(thetaP), py = rp * Math.sin(thetaP);
          c2d.addLine([[0, 0], [px, py]], { color: '#c62828', width: 1.5, dash: [4, 3] });
          c2d.addPoint(px, py, { radius: 5, color: '#c62828' });
          c2d.addText('perigee', px + 0.1, py - 0.3, { color: '#c62828', size: 11 });
        }

        // Apse line (horizontal)
        c2d.addLine([[0, 0], [8, 0]], { color: '#ddd', width: 1, dash: [5, 4] });

        // θ₀ arc at injection point
        c2d.showRaw((ctx, cam) => {
          const t0 = orb.theta0;
          if (Math.abs(t0) < 0.01) return;
          const sx = cam.wx(0), sy = cam.wy(0);
          const arcR = cam.ws(1.2);
          ctx.beginPath();
          ctx.arc(sx, sy, arcR, 0, -t0, t0 < 0);
          ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.5; ctx.stroke();
          const midA = -t0 / 2;
          ctx.fillStyle = '#e65100'; ctx.font = 'italic 12px Georgia,serif';
          ctx.fillText('θ₀', sx + Math.cos(midA) * (arcR + 16), sy + Math.sin(midA) * (arcR + 12));
        });

        const color = orbitColor(orb.e);
        c2d.showText(`e cosθ₀ = ${orb.eCosT.toFixed(3)}`, -4.5, 3.5, { color: '#555', size: 12 });
        c2d.showText(`e sinθ₀ = ${orb.eSinT.toFixed(3)}`, -4.5, 3.1, { color: '#555', size: 12 });
        c2d.showText(`e = ${orb.e.toFixed(3)}   θ₀ = ${(orb.theta0*180/Math.PI).toFixed(1)}°`, -4.5, 2.7, { color, size: 13 });
      },
    },

    // ── Step 4: Semi-major axis a/R ──────────────────────────────────────────
    {
      title: 'Semi-Major Axis a and Orbit Energy',
      description: 'Once e and p are known, the semi-major axis follows from p = a(1 − e²). The ratio a/R places the orbit in physical scale relative to Earth\'s radius. The specific energy E = −K/(2a) confirms the orbit type.',
      equation: "a = \\frac{p}{1-e^2} \\qquad \\frac{a}{R} = \\frac{a}{R} \\qquad E = -\\frac{K}{2a}",
      notes: 'For the example (χ = 1.40, β₀ = 20°, r₀ = 2R):\n  e = 0.509,  p = 2.474\n  a = 2.474/(1 − 0.509²) = 2.474/0.741 = 3.34\n  a/R = 3.34 (three Earth-radii semi-major axis)\n\nSpecific energy: E = ½v₀² − K/r₀ = ½(χK/r₀) − K/r₀ = K(χ/2 − 1)/r₀\n  Er₀/K = χ/2 − 1 = 1.40/2 − 1 = −0.30 < 0 → bound ellipse ✓\n\nAlternatively: E = −K/(2a) → a = −K/(2E). Both routes agree.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'χ = r₀v₀²/K', 0.5, 3.0, 0.05, state.chi,
          v => v.toFixed(2), v => state.chi = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);

        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });

        const thetaP = -orb.theta0;
        const rp = orb.p / (1 + orb.e);
        const ra = orb.e < 1 ? orb.p / (1 - orb.e) : null;

        if (orb.e > 0.02 && isFinite(rp) && rp < 20) {
          const px = rp * Math.cos(thetaP), py = rp * Math.sin(thetaP);
          c2d.addPoint(px, py, { radius: 5, color: '#c62828' });
          c2d.addText(`rₚ = ${rp.toFixed(2)}R`, px + 0.1, py - 0.3, { color: '#c62828', size: 11 });
        }

        if (ra && ra < 20) {
          const ax = ra * Math.cos(thetaP + Math.PI), ay = ra * Math.sin(thetaP + Math.PI);
          c2d.addPoint(ax, ay, { radius: 5, color: '#2e7d32' });
          c2d.addText(`rₐ = ${ra.toFixed(2)}R`, ax + 0.1, ay + 0.2, { color: '#2e7d32', size: 11 });
        }

        // Semi-major axis visual: line from perigee to apogee through focus
        if (ra && ra < 20 && rp < 20) {
          const px = rp * Math.cos(thetaP), py = rp * Math.sin(thetaP);
          const ax = ra * Math.cos(thetaP + Math.PI), ay = ra * Math.sin(thetaP + Math.PI);
          c2d.addLine([[px, py], [ax, ay]], { color: '#888', width: 1, dash: [4, 3] });
        }

        const color = orbitColor(orb.e);
        const Enorm = 0.5 * state.chi - 1;
        const aVal  = orb.e < 1 ? orb.p / (1 - orb.e * orb.e) : null;
        c2d.showText(`e = ${orb.e.toFixed(3)}   ${orbitTypeName(orb.e)}`, -4.5, 3.5, { color, size: 13 });
        if (aVal && isFinite(aVal)) {
          c2d.showText(`a/R = ${(aVal / R).toFixed(3)}`, -4.5, 3.0, { color: '#555', size: 12 });
        }
        c2d.showText(`Er₀/K = ${Enorm.toFixed(3)}  (${Enorm < -0.001 ? 'bound' : Enorm > 0.001 ? 'escape' : 'parabolic'})`,
          -4.5, 2.5, { color: '#888', size: 11 });
        c2d.showText(`θ₀ = ${(orb.theta0 * 180/Math.PI).toFixed(1)}° ahead of perigee`, -4.5, 2.1, { color: '#e65100', size: 11 });
      },
    },

  ],
};
