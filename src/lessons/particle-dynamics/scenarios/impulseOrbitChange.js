// Scenario: Impulsive Orbit Change Without Rotating the Apse Line
//
// A satellite on orbit 1 (e₁) receives an impulsive Δv at a point 150° from
// the apse line. The impulse is chosen so the new orbit shares the same apse
// line direction. The velocity vector diagram reveals the tangential and normal
// components of Δv.
//
// Numbers from Thomson §4.13 Example 4.13-2:
//   e₁ = 0.5  (original orbit, for a clean demo)
//   Transfer point: θ = 150° on orbit 1
//   Target e₂ values: 0.508 and 0.30 shown in the book figure
//
// The speed at any point on a Keplerian orbit: v = √(K/p) · √(1 + 2e cosθ + e²)
// The flight-path angle γ satisfies tan γ = e sinθ / (1 + e cosθ)

// ── Orbit math ────────────────────────────────────────────────────────────────

function orbitR(p, e, theta) {
  const d = 1 + e * Math.cos(theta);
  return d < 1e-6 ? Infinity : p / d;
}

// Speed at angle theta on orbit with semi-latus rectum p, eccentricity e
// v = √(K(2/r − 1/a)) but simpler: v² = (K/p)(1 + 2e cosθ + e²)
function orbitSpeed(p, e, theta, K = 1) {
  return Math.sqrt(K / p * (1 + 2 * e * Math.cos(theta) + e * e));
}

// Flight-path angle γ from local horizontal (transverse direction)
// tan γ = e sinθ / (1 + e cosθ)
function flightPathAngle(e, theta) {
  return Math.atan2(e * Math.sin(theta), 1 + e * Math.cos(theta));
}

function sampleOrbit(p, e, nPts = 600) {
  const pts = [];
  for (let i = 0; i <= nPts; i++) {
    const t = (i / nPts) * Math.PI * 2;
    const r = orbitR(p, e, t);
    if (!isFinite(r) || r > 30) continue;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  return pts;
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `io-${Math.random().toString(36).slice(2)}`;
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
  title:   'Impulsive Orbit Change — Apse Line Preserved',
  subject: 'Particle Dynamics — Scenario',

  initState: () => ({
    e1: 0.50,
    e2: 0.30,
    thetaDeg: 150,
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

    // ── Step 1: Two orbits sharing an apse line ──────────────────────────────
    {
      title: 'Two Orbits — Same Apse Line',
      description: 'Two Keplerian orbits share the same focus and the same apse line (perigee direction). A satellite on orbit 1 can transfer to orbit 2 via a single impulsive Δv applied at their common point — provided that point lies on the apse line, or we choose it carefully.',
      equation: "r = \\frac{p}{1 + e\\cos\\theta}, \\quad p = \\frac{h^2}{K}",
      notes: 'For two orbits to share the same apse line, both orbit equations use the same θ = 0 reference direction.\n\nThe key constraint: after the impulse, r and θ are continuous (position doesn\'t jump), but v changes by Δv instantaneously.\n\nAt any intersection point θ*, orbit 1 has speed v₁ and flight-path angle γ₁; orbit 2 has speed v₂ at angle γ₂. The vector Δv = v₂ − v₁ must be computed in the local tangential/normal frame.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'orbit 1 eccentricity  e₁', 0.05, 0.95, 0.01, state.e1,
          v => v.toFixed(2), v => state.e1 = v);
        addSlider(state._controls, 'orbit 2 eccentricity  e₂', 0.05, 0.95, 0.01, state.e2,
          v => v.toFixed(2), v => state.e2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e1, e2 } = state;
        // Fix p so r₁ at perigee = 1 for orbit 1; orbit 2 shares same perigee
        const rp = 1.0;
        const p1 = rp * (1 + e1);
        const p2 = rp * (1 + e2);

        c2d.addLine(sampleOrbit(p1, e1), { color: '#1565c0', width: 2.5 });
        c2d.addLine(sampleOrbit(p2, e2), { color: '#c62828', width: 2 });

        // Focus
        c2d.addPoint(0, 0, { radius: 7, color: '#333' });
        c2d.addText('F', 0.12, -0.35, { color: '#333', size: 12 });

        // Perigee (shared)
        c2d.addPoint(rp, 0, { radius: 4, color: '#555' });
        c2d.addText('perigee', rp + 0.1, -0.25, { color: '#555', size: 11 });
        c2d.addLine([[0, 0], [8, 0]], { color: '#ccc', width: 1, dash: [5, 4] });
        c2d.addText('apse line', 6.5, 0.18, { color: '#ccc', size: 10 });

        c2d.addText(`orbit 1   e₁ = ${e1.toFixed(2)}`, -6.5, 3.5, { color: '#1565c0', size: 12 });
        c2d.addText(`orbit 2   e₂ = ${e2.toFixed(2)}`, -6.5, 3.0, { color: '#c62828', size: 12 });
      },
    },

    // ── Step 2: Transfer point at θ* from apse line ─────────────────────────
    {
      title: 'Transfer Point at θ* = 150°',
      description: 'Apply the impulse at θ* = 150° on orbit 1 — the same angular position on orbit 2 must give the same r. This condition links e₁, e₂ and θ* and is satisfied automatically when both orbits share perigee r_p.',
      equation: "r^* = \\frac{p_1}{1+e_1\\cos\\theta^*} = \\frac{p_2}{1+e_2\\cos\\theta^*}",
      notes: 'For two orbits to share the same perigee distance rₚ AND pass through the same point at angle θ*, their semi-latus recta must satisfy:\n\n  p₂/p₁ = (1 + e₁ cosθ*)/(1 + e₂ cosθ*)\n\nIn the book example (Fig 4.13-6), θ* = 150°, e₁ = 0.5, e₂ = 0.30:\n  cos 150° = −0.866\n  1 + e₁ cos 150° = 0.567\n  1 + e₂ cos 150° = 0.740\n  p₂/p₁ = 0.767 → the two orbits intersect at 150°.\n\nThe orange dot marks the transfer point.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'orbit 1 eccentricity  e₁', 0.05, 0.95, 0.01, state.e1,
          v => v.toFixed(2), v => state.e1 = v);
        addSlider(state._controls, 'orbit 2 eccentricity  e₂', 0.05, 0.95, 0.01, state.e2,
          v => v.toFixed(2), v => state.e2 = v);
        addSlider(state._controls, 'transfer angle  θ*  (deg)', 90, 270, 1, state.thetaDeg,
          v => v.toFixed(0) + '°', v => state.thetaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e1, e2, thetaDeg } = state;
        const theta = thetaDeg * Math.PI / 180;
        const rp = 1.0;
        const p1 = rp * (1 + e1);
        // p2 chosen so both orbits pass through the same r at θ*
        const denom1 = 1 + e1 * Math.cos(theta);
        const denom2 = 1 + e2 * Math.cos(theta);
        const p2 = p1 * (Math.abs(denom1) < 0.01 ? 1 : denom2 / denom1);

        c2d.addLine(sampleOrbit(p1, e1), { color: '#1565c0', width: 2.5 });
        c2d.addLine(sampleOrbit(p2, e2), { color: '#c62828', width: 2 });
        c2d.addPoint(0, 0, { radius: 7, color: '#333' });
        c2d.addLine([[0, 0], [8, 0]], { color: '#ddd', width: 1, dash: [5, 4] });
        c2d.addText('apse line', 6.5, 0.18, { color: '#ccc', size: 10 });

        // Transfer point
        const rStar = orbitR(p1, e1, theta);
        if (isFinite(rStar)) {
          const tx = rStar * Math.cos(theta), ty = rStar * Math.sin(theta);
          c2d.addPoint(tx, ty, { radius: 7, color: '#e65100' });
          c2d.addLine([[0, 0], [tx, ty]], { color: '#e65100', width: 1, dash: [4, 3] });
          c2d.addText(`r* = ${rStar.toFixed(2)}`, tx + 0.15, ty + 0.2, { color: '#e65100', size: 11 });
        }

        // θ* arc annotation
        c2d.showRaw((ctx, cam) => {
          ctx.beginPath();
          ctx.arc(cam.wx(0), cam.wy(0), cam.ws(0.8), 0, -theta, theta < 0);
          ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.5; ctx.stroke();
          const midA = -theta / 2;
          ctx.fillStyle = '#e65100'; ctx.font = 'italic 12px Georgia,serif';
          ctx.fillText('θ*', cam.wx(0) + Math.cos(midA) * (cam.ws(0.8) + 14),
                           cam.wy(0) + Math.sin(midA) * (cam.ws(0.8) + 10));
        });

        c2d.addText(`θ* = ${thetaDeg}°`, -6.5, 3.5, { color: '#e65100', size: 12 });
        c2d.addText(`orbit 1  e₁ = ${e1.toFixed(2)}`, -6.5, 3.0, { color: '#1565c0', size: 12 });
        c2d.addText(`orbit 2  e₂ = ${e2.toFixed(2)}`, -6.5, 2.5, { color: '#c62828', size: 12 });
      },
    },

    // ── Step 3: Velocity vectors at the transfer point ───────────────────────
    {
      title: 'Velocity Vectors at the Transfer Point',
      description: 'At the transfer point, orbit 1 has velocity v₁ and orbit 2 has velocity v₂. Both are along the local velocity direction, at flight-path angle γ from the transverse. The required impulse is the vector difference Δv = v₂ − v₁.',
      equation: "v = \\sqrt{\\frac{K}{p}}\\sqrt{1 + 2e\\cos\\theta + e^2} \\qquad \\tan\\gamma = \\frac{e\\sin\\theta}{1+e\\cos\\theta}",
      notes: 'The flight-path angle γ is measured from the local transverse direction θ̂ toward r̂.\n\nAt θ = 150°:\n• A higher-eccentricity orbit is faster AND tilted at a larger γ — so Δv has both tangential and normal components.\n• Δvₜ is along θ̂ (tangential), Δvₙ is along r̂ (radial/normal).\n\nThe angle between v₁ and v₂ at the transfer point is γ₂ − γ₁. Since neither orbit is circular, even a "same-speed" transfer would need a normal component to change direction.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'orbit 1 eccentricity  e₁', 0.05, 0.95, 0.01, state.e1,
          v => v.toFixed(2), v => state.e1 = v);
        addSlider(state._controls, 'orbit 2 eccentricity  e₂', 0.05, 0.95, 0.01, state.e2,
          v => v.toFixed(2), v => state.e2 = v);
        addSlider(state._controls, 'transfer angle  θ*  (deg)', 90, 270, 1, state.thetaDeg,
          v => v.toFixed(0) + '°', v => state.thetaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e1, e2, thetaDeg } = state;
        const theta = thetaDeg * Math.PI / 180;
        const rp = 1.0;
        const p1 = rp * (1 + e1);
        const denom1 = 1 + e1 * Math.cos(theta);
        const denom2 = 1 + e2 * Math.cos(theta);
        const p2 = p1 * (Math.abs(denom1) < 0.01 ? 1 : denom2 / denom1);

        c2d.addLine(sampleOrbit(p1, e1), { color: '#1565c0', width: 2 });
        c2d.addLine(sampleOrbit(p2, e2), { color: '#c62828', width: 2 });
        c2d.addPoint(0, 0, { radius: 6, color: '#333' });
        c2d.addLine([[0, 0], [8, 0]], { color: '#ddd', width: 1, dash: [5, 4] });

        const rStar = orbitR(p1, e1, theta);
        if (!isFinite(rStar) || rStar > 20) return;
        const tx = rStar * Math.cos(theta), ty = rStar * Math.sin(theta);
        c2d.addPoint(tx, ty, { radius: 6, color: '#e65100' });

        // Speed and flight-path angles
        const v1 = orbitSpeed(p1, e1, theta);
        const v2 = orbitSpeed(p2, e2, theta);
        const g1 = flightPathAngle(e1, theta);
        const g2 = flightPathAngle(e2, theta);

        // Velocity direction at theta: local transverse = (-sin θ, cos θ), radial = (cos θ, sin θ)
        // v = v * [cos γ · θ̂ + sin γ · r̂]  where θ̂=(-sinθ, cosθ), r̂=(cosθ, sinθ)
        const VS = 1.8;
        const th_x = -Math.sin(theta), th_y = Math.cos(theta);
        const r_x  =  Math.cos(theta), r_y  = Math.sin(theta);

        const v1x = v1 * (Math.cos(g1) * th_x + Math.sin(g1) * r_x) * VS;
        const v1y = v1 * (Math.cos(g1) * th_y + Math.sin(g1) * r_y) * VS;
        const v2x = v2 * (Math.cos(g2) * th_x + Math.sin(g2) * r_x) * VS;
        const v2y = v2 * (Math.cos(g2) * th_y + Math.sin(g2) * r_y) * VS;

        // v1 arrow
        c2d.addArrow(tx, ty, tx + v1x, ty + v1y, { color: '#1565c0', width: 2.5 });
        c2d.addText(`v₁`, tx + v1x + 0.12, ty + v1y, { color: '#1565c0', size: 13, italic: true });

        // v2 arrow
        c2d.addArrow(tx, ty, tx + v2x, ty + v2y, { color: '#c62828', width: 2.5 });
        c2d.addText(`v₂`, tx + v2x + 0.12, ty + v2y, { color: '#c62828', size: 13, italic: true });

        // Δv arrow (v2 − v1)
        const dvx = v2x - v1x, dvy = v2y - v1y;
        c2d.addArrow(tx + v1x, ty + v1y, tx + v2x, ty + v2y, { color: '#e65100', width: 2 });
        c2d.addText('Δv', tx + v1x + dvx * 0.5 + 0.1, ty + v1y + dvy * 0.5, { color: '#e65100', size: 12 });

        const dvMag = Math.sqrt(dvx * dvx + dvy * dvy) / VS;
        c2d.addText(`|Δv| = ${dvMag.toFixed(3)} √(K/r*)`, -6.5, 3.5, { color: '#e65100', size: 12 });
        c2d.addText(`γ₁ = ${(g1*180/Math.PI).toFixed(1)}°,  v₁ = ${v1.toFixed(3)}`, -6.5, 3.0, { color: '#1565c0', size: 11 });
        c2d.addText(`γ₂ = ${(g2*180/Math.PI).toFixed(1)}°,  v₂ = ${v2.toFixed(3)}`, -6.5, 2.5, { color: '#c62828', size: 11 });
      },
    },

    // ── Step 4: Tangential and Normal components of Δv ──────────────────────
    {
      title: 'Tangential and Normal Components of Δv',
      description: 'Resolving Δv into the local tangential (θ̂) and normal (r̂) directions gives Δvₜ and Δvₙ. These are the two independent controls available from a single burn: Δvₜ changes the orbit energy, Δvₙ rotates the velocity vector without (directly) changing speed.',
      equation: "\\Delta v_t = v_2\\cos\\gamma_2 - v_1\\cos\\gamma_1 \\\\[8pt] \\Delta v_n = v_2\\sin\\gamma_2 - v_1\\sin\\gamma_1",
      notes: 'In the book\'s Example 4.13-2 (θ* = 150°):\n  e₁ = 0.5,  v₁ = 0.823√(K/r*),  γ₁ = −13°\n  e₂ = 0.30, v₂ = 0.882√(K/r*),  γ₂ = −(13°−13°) ≈ 0°  [approximately]\n\n  Δvₜ = 0.882 cos(−0°) − 0.823 cos(−13°) = 0.036√(K/r*)\n  Δvₙ = 0.882 sin(0°)  − 0.823 sin(−13°) = 0.198√(K/r*)\n  |Δv| = 0.202√(K/r*) = 0.202 times circular velocity at r*\n\nThe dominant component is normal — the speed change is small, but the direction must rotate to place perigee correctly.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'orbit 1 eccentricity  e₁', 0.05, 0.95, 0.01, state.e1,
          v => v.toFixed(2), v => state.e1 = v);
        addSlider(state._controls, 'orbit 2 eccentricity  e₂', 0.05, 0.95, 0.01, state.e2,
          v => v.toFixed(2), v => state.e2 = v);
        addSlider(state._controls, 'transfer angle  θ*  (deg)', 90, 270, 1, state.thetaDeg,
          v => v.toFixed(0) + '°', v => state.thetaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e1, e2, thetaDeg } = state;
        const theta = thetaDeg * Math.PI / 180;
        const rp = 1.0;
        const p1 = rp * (1 + e1);
        const denom1 = 1 + e1 * Math.cos(theta);
        const denom2 = 1 + e2 * Math.cos(theta);
        const p2 = p1 * (Math.abs(denom1) < 0.01 ? 1 : denom2 / denom1);

        c2d.addLine(sampleOrbit(p1, e1), { color: '#1565c0', width: 2 });
        c2d.addLine(sampleOrbit(p2, e2), { color: '#c62828', width: 2 });
        c2d.addPoint(0, 0, { radius: 6, color: '#333' });
        c2d.addLine([[0, 0], [8, 0]], { color: '#ddd', width: 1, dash: [5, 4] });

        const rStar = orbitR(p1, e1, theta);
        if (!isFinite(rStar) || rStar > 20) return;
        const tx = rStar * Math.cos(theta), ty = rStar * Math.sin(theta);
        c2d.addPoint(tx, ty, { radius: 6, color: '#e65100' });

        const v1 = orbitSpeed(p1, e1, theta);
        const v2 = orbitSpeed(p2, e2, theta);
        const g1 = flightPathAngle(e1, theta);
        const g2 = flightPathAngle(e2, theta);

        const th_x = -Math.sin(theta), th_y = Math.cos(theta);
        const r_x  =  Math.cos(theta), r_y  = Math.sin(theta);
        const VS = 1.8;

        const v1x = v1 * (Math.cos(g1) * th_x + Math.sin(g1) * r_x) * VS;
        const v1y = v1 * (Math.cos(g1) * th_y + Math.sin(g1) * r_y) * VS;
        const v2x = v2 * (Math.cos(g2) * th_x + Math.sin(g2) * r_x) * VS;
        const v2y = v2 * (Math.cos(g2) * th_y + Math.sin(g2) * r_y) * VS;

        const dvx = v2x - v1x, dvy = v2y - v1y;
        const dvt = (v2 * Math.cos(g2) - v1 * Math.cos(g1));  // tangential component
        const dvn = (v2 * Math.sin(g2) - v1 * Math.sin(g1));  // normal component

        // v1 (from transfer point)
        c2d.addArrow(tx, ty, tx + v1x, ty + v1y, { color: '#1565c0', width: 2 });
        c2d.addText('v₁', tx + v1x + 0.1, ty + v1y + 0.1, { color: '#1565c0', size: 12, italic: true });

        // v2 (from transfer point)
        c2d.addArrow(tx, ty, tx + v2x, ty + v2y, { color: '#c62828', width: 2 });
        c2d.addText('v₂', tx + v2x + 0.1, ty + v2y + 0.1, { color: '#c62828', size: 12, italic: true });

        // Δv tangential component (along θ̂)
        const dvtx = dvt * th_x * VS, dvty = dvt * th_y * VS;
        c2d.addArrow(tx + v1x, ty + v1y, tx + v1x + dvtx, ty + v1y + dvty, { color: '#2e7d32', width: 2 });
        c2d.addText('Δvₜ', tx + v1x + dvtx * 0.5 + 0.08, ty + v1y + dvty * 0.5 - 0.2, { color: '#2e7d32', size: 11 });

        // Δv normal component (along r̂)
        const dvnx = dvn * r_x * VS, dvny = dvn * r_y * VS;
        c2d.addArrow(tx + v1x + dvtx, ty + v1y + dvty,
                     tx + v1x + dvtx + dvnx, ty + v1y + dvty + dvny, { color: '#7b1fa2', width: 2 });
        c2d.addText('Δvₙ', tx + v1x + dvtx + dvnx * 0.5 + 0.08, ty + v1y + dvty + dvny * 0.5, { color: '#7b1fa2', size: 11 });

        const dvMag = Math.sqrt(dvt * dvt + dvn * dvn);
        c2d.addText(`Δvₜ = ${dvt.toFixed(3)}√(K/r*)`, -6.5, 3.5, { color: '#2e7d32', size: 12 });
        c2d.addText(`Δvₙ = ${dvn.toFixed(3)}√(K/r*)`, -6.5, 3.0, { color: '#7b1fa2', size: 12 });
        c2d.addText(`|Δv| = ${dvMag.toFixed(3)}√(K/r*)`, -6.5, 2.5, { color: '#e65100', size: 12 });
        c2d.addText(`θ* = ${thetaDeg}°`, -6.5, 2.0, { color: '#888', size: 11 });
      },
    },

  ],
};
