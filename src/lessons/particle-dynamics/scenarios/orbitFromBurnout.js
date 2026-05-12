// Scenario: Orbit from Burnout Conditions — Thomson Example 4.13-I
//
// Given at engine cutoff: χ = r₀v₀²/K = 1.40, β₀ = 20°, r₀/R = 2.0
// Find: eccentricity e, semi-major axis a/R, initial position θ₀ from perigee.

const K  = 1.0;
const R  = 1.0;
const R0 = 2.0 * R;

// ── Orbital mechanics ─────────────────────────────────────────────────────────

function computeOrbit(chi, betaDeg) {
  const b      = betaDeg * Math.PI / 180;
  const v0     = Math.sqrt(chi * K / R0);
  const h      = R0 * v0 * Math.cos(b);
  const p      = h * h / K;
  const eCosT  = chi * Math.cos(b) * Math.cos(b) - 1;
  const eSinT  = chi * Math.sin(b) * Math.cos(b);
  const e      = Math.sqrt(eCosT * eCosT + eSinT * eSinT);
  const theta0 = Math.atan2(eSinT, eCosT);
  const a      = e < 1 ? p / (1 - e * e) : null;
  const E      = 0.5 * v0 * v0 - K / R0;
  return { chi, b, v0, h, p, e, theta0, eCosT, eSinT, a, E };
}

function orbitColor(e) {
  if (e < 0.01) return '#2e7d32';
  if (e < 1)    return '#1565c0';
  if (e < 1.02) return '#e65100';
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
    const r = p / d;
    if (r < 0 || r > 25) { if (segs[segs.length-1].length) segs.push([]); continue; }
    segs[segs.length-1].push([r * Math.cos(phi), r * Math.sin(phi)]);
  }
  return segs.filter(s => s.length > 1);
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawEarth(c2d) {
  c2d.raw((ctx, cam) => {
    ctx.beginPath();
    ctx.arc(cam.wx(0), cam.wy(0), cam.ws(R), 0, Math.PI * 2);
    ctx.fillStyle = '#1565c0'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', cam.wx(0), cam.wy(0) + 4);
    ctx.textAlign = 'left';
  });
}

function drawOrbit(c2d, orb) {
  const color = orbitColor(orb.e);
  for (const seg of traceOrbit(orb)) {
    c2d.addLine(seg, { color, width: 2.5 });
  }
}

// Perigee + apogee dots + apse line. faint=true → lighter styling for bg use.
function drawApseLine(c2d, orb, faint = false) {
  if (orb.e < 0.05) return;
  const thetaP = -orb.theta0;
  const rp = orb.p / (1 + orb.e);
  const ra = orb.e < 1 ? orb.p / (1 - orb.e) : null;
  const ppx = rp * Math.cos(thetaP), ppy = rp * Math.sin(thetaP);

  if (ra && ra < 18 && rp < 18) {
    const apx = ra * Math.cos(thetaP + Math.PI), apy = ra * Math.sin(thetaP + Math.PI);
    c2d.addLine([[ppx, ppy], [apx, apy]], { color: faint ? '#ebebeb' : '#ddd', width: 1, dash: [5, 4] });
    c2d.addPoint(apx, apy, { radius: faint ? 3 : 5, color: faint ? '#a5d6a7' : '#2e7d32' });
    if (!faint) c2d.addText('apogee', apx + 0.12, apy + 0.24, { color: '#2e7d32', size: 10 });
  }
  if (rp < 18) {
    c2d.addPoint(ppx, ppy, { radius: faint ? 3 : 5, color: faint ? '#ef9a9a' : '#c62828' });
    if (!faint) c2d.addText('perigee', ppx + 0.12, ppy - 0.28, { color: '#c62828', size: 10 });
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
      <span>${label}</span>
      <span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
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

function addSliders(controls, state) {
  addSlider(controls, 'χ = r₀v₀²/K', 0.5, 3.0, 0.05, state.chi,
    v => v.toFixed(2), v => state.chi = v);
  addSlider(controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
    v => v.toFixed(0) + '°', v => state.betaDeg = v);
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Orbit from Burnout Conditions (Ex. 4.13-I)',
  subject: 'Particle Dynamics — Scenario',

  initState: () => ({ chi: 1.40, betaDeg: 20, _controls: null }),

  init(c2d, state, panelEl) {
    c2d.scale = 65;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: The 3 inputs ─────────────────────────────────────────────────
    // Message: three numbers at cutoff → one orbit. Show what you choose (β₀)
    // and the orbit that results. Nothing else.
    {
      title: 'The Three Inputs at Engine Cutoff',
      description: 'The moment the engine stops, three numbers fix the orbit completely: r₀ (how high), v₀ (how fast), and β₀ (which direction). Change the sliders to see how the resulting orbit changes. The orbit type and size are the consequence — you choose the inputs.',
      equation: "\\chi = \\frac{r_0 v_0^2}{K} = 1.40 \\qquad \\beta_0 = 20^\\circ \\qquad \\frac{r_0}{R} = 2.0",
      notes: 'β₀ is the angle between the velocity vector v₀ and the local transverse direction θ̂ (the direction along the orbit, perpendicular to r).\n\nβ₀ = 0° → purely sideways burn — most efficient, gives the largest orbit for a given speed.\nβ₀ = 90° → purely radial burn → h = 0 → no orbit at all, falls straight back.\n\nNote: there are TWO angles in this problem. β₀ is your input — you choose it. θ₀ (which part of the orbit the injection landed on) is the output — it comes out of the calculation in step 3.',
      setup(c2d, state) {
        clearControls(state);
        addSliders(state._controls, state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb);
        drawEarth(c2d);

        // Injection point
        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });
        c2d.addText('engine cutoff', R0 + 0.12, -0.3, { color: '#e65100', size: 10 });

        // v₀ arrow
        const VS = 2.2, b = orb.b;
        c2d.showArrow(R0, 0, R0 + orb.v0 * Math.sin(b) * VS, orb.v0 * Math.cos(b) * VS,
          { color: '#7b1fa2', width: 2.5 });
        c2d.showText('v₀', R0 + orb.v0 * Math.sin(b) * VS + 0.12,
          orb.v0 * Math.cos(b) * VS + 0.1, { color: '#7b1fa2', size: 13, italic: true });

        // θ̂ guide (short, faint — just enough to show what β₀ is measured from)
        c2d.showLine([[R0, -0.5], [R0, 0.5]], { color: '#ddd', width: 1, dash: [3, 3] });
        c2d.showText('θ̂', R0 + 0.08, 0.56, { color: '#ccc', size: 10, italic: true });

        // β₀ arc
        c2d.showRaw((ctx, cam) => {
          if (Math.abs(state.betaDeg) < 1) return;
          const sx = cam.wx(R0), sy = cam.wy(0), arcR = cam.ws(0.44);
          ctx.beginPath();
          ctx.arc(sx, sy, arcR, -Math.PI / 2, -Math.PI / 2 + b, b < 0);
          ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 2; ctx.stroke();
          const midA = -Math.PI / 2 + b / 2;
          ctx.fillStyle = '#7b1fa2'; ctx.font = 'bold italic 14px Georgia,serif';
          ctx.fillText('β₀', sx + Math.cos(midA) * (arcR + 14), sy + Math.sin(midA) * (arcR + 10));
        });

        const color = orbitColor(orb.e);
        c2d.showText(`${orbitTypeName(orb.e)}   e = ${orb.e.toFixed(3)}`, -4.5, 3.5, { color, size: 13 });
        c2d.showText(`β₀ = ${state.betaDeg}° (input)     χ = ${state.chi.toFixed(2)}`, -4.5, 3.0, { color: '#7b1fa2', size: 11 });
      },
    },

    // ── Step 2: β₀ sets angular momentum ────────────────────────────────────
    // Message: only the transverse part of v₀ matters for h (and therefore
    // for orbit scale p). The radial part just shifts where on the orbit
    // injection occurs — it contributes nothing to h.
    {
      title: 'β₀ Controls Angular Momentum h',
      description: 'Decompose v₀ into its transverse component (along θ̂, green) and radial component (along r̂, red). Only the transverse part creates angular momentum h = r₀v₀ cos β₀. The radial part simply means the satellite is already moving outward at cutoff — it shifts where on the orbit injection occurs, but does not change the orbit scale.',
      equation: "h = r_0 v_0 \\cos\\beta_0 \\qquad p = \\frac{h^2}{K}",
      notes: 'This is why β₀ = 0 is the most efficient injection: all of v₀ goes into angular momentum.\n\nNumerically: v₀ = √(1.40/2) = 0.837\n  h = 2 × 0.837 × cos 20° = 1.573\n  p = h²/K = 2.474\n\nTry dragging β₀ toward ±90°: the green transverse arrow shrinks to zero, the orbit collapses, and eventually h = 0 means a purely radial trajectory — no orbit at all.',
      setup(c2d, state) {
        clearControls(state);
        addSliders(state._controls, state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb);
        drawApseLine(c2d, orb, true);   // faint perigee/apogee — context only
        drawEarth(c2d);

        const VS = 2.2, b = orb.b;
        const vTrans = orb.v0 * Math.cos(b);
        const vRad   = orb.v0 * Math.sin(b);

        c2d.addPoint(R0, 0, { radius: 6, color: '#e65100' });

        // Transverse component — creates h
        c2d.showArrow(R0, 0, R0, vTrans * VS, { color: '#2e7d32', width: 2.5 });
        c2d.showText(`v₀ cos β₀ = ${vTrans.toFixed(3)}`, R0 + 0.12, vTrans * VS * 0.48, { color: '#2e7d32', size: 11 });
        c2d.showText('→ creates h', R0 + 0.12, vTrans * VS * 0.48 - 0.3, { color: '#2e7d32', size: 10 });

        // Radial component — contributes nothing to h
        if (Math.abs(vRad) > 0.01) {
          c2d.showArrow(R0, 0, R0 + vRad * VS, 0, { color: '#c62828', width: 2 });
          c2d.showText('v₀ sin β₀', R0 + vRad * VS * 0.3, -0.28, { color: '#c62828', size: 11 });
          c2d.showText('→ no h', R0 + vRad * VS * 0.3, -0.58, { color: '#c62828', size: 10 });
        }

        // Total v₀ arrow
        c2d.showArrow(R0, 0, R0 + vRad * VS, vTrans * VS, { color: '#7b1fa2', width: 2 });
        c2d.showText('v₀', R0 + vRad * VS + 0.1, vTrans * VS + 0.1, { color: '#7b1fa2', size: 13, italic: true });

        c2d.showText(`h = r₀v₀cosβ₀ = ${orb.h.toFixed(3)}`, -4.5, 3.5, { color: '#2e7d32', size: 13 });
        c2d.showText(`p = h²/K = ${orb.p.toFixed(3)}`, -4.5, 3.0, { color: '#555', size: 12 });
      },
    },

    // ── Step 3: β₀ vs θ₀ ─────────────────────────────────────────────────────
    // Message: β₀ (input, at injection point) produces θ₀ (output, at focus).
    // Two different angles, two different locations.
    {
      title: 'Two Angles — Two Different Places',
      description: 'The calculation produces e cosθ₀ and e sinθ₀, which together give both e and θ₀. Notice where each angle lives on the diagram: β₀ is at the injection point (your input), θ₀ is at the focus (the output).',
      equation: "e\\cos\\theta_0 = \\chi\\cos^2\\!\\beta_0 - 1 \\qquad e\\sin\\theta_0 = \\chi\\sin\\beta_0\\cos\\beta_0",
      notes: 'For χ = 1.40, β₀ = 20°:\n  e cosθ₀ = 1.40 × cos²20° − 1 = 0.236\n  e sinθ₀ = 1.40 × sin20° × cos20° = 0.450\n  e = √(0.236² + 0.450²) = 0.509\n  θ₀ = arctan(0.450 / 0.236) = 62.3°\n\nSo injection happened 62.3° past perigee on this ellipse.\n\nβ₀ is the angle you controlled — the direction you fired the engine.\nθ₀ is what fell out of the maths — it tells you where on the resulting orbit the satellite was when the engine stopped.',
      setup(c2d, state) {
        clearControls(state);
        addSliders(state._controls, state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb);
        drawApseLine(c2d, orb, false);  // apse line prominent here — θ₀ is measured from it
        drawEarth(c2d);

        const b = orb.b;
        c2d.addPoint(R0, 0, { radius: 7, color: '#e65100' });

        // ── β₀ zone: at the injection point (right side) ──────────────────
        // Small v₀ arrow + arc + label "β₀ (input) — angle of burn"
        const VS = 1.5;
        const vx = orb.v0 * Math.sin(b) * VS, vy = orb.v0 * Math.cos(b) * VS;
        c2d.addArrow(R0, 0, R0 + vx, vy, { color: '#7b1fa2', width: 2 });
        c2d.addLine([[R0, -0.5], [R0, 0.5]], { color: '#ddd', width: 1, dash: [3, 3] });

        c2d.showRaw((ctx, cam) => {
          if (Math.abs(state.betaDeg) < 1) return;
          const sx = cam.wx(R0), sy = cam.wy(0), arcR = cam.ws(0.38);
          ctx.beginPath();
          ctx.arc(sx, sy, arcR, -Math.PI / 2, -Math.PI / 2 + b, b < 0);
          ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 2; ctx.stroke();
          const midA = -Math.PI / 2 + b / 2;
          ctx.fillStyle = '#7b1fa2'; ctx.font = 'bold italic 13px Georgia,serif';
          ctx.fillText('β₀', sx + Math.cos(midA) * (arcR + 13), sy + Math.sin(midA) * (arcR + 9));

          // Callout box near injection
          const bx = sx + cam.ws(0.65), by = sy - cam.ws(0.6);
          ctx.fillStyle = 'rgba(123,31,162,0.06)';
          ctx.beginPath(); ctx.rect(bx, by, cam.ws(2.1), cam.ws(0.55)); ctx.fill();
          ctx.strokeStyle = 'rgba(123,31,162,0.2)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#7b1fa2'; ctx.font = 'bold 11px system-ui';
          ctx.fillText('β₀ — input', bx + 8, by + 16);
          ctx.font = '10px system-ui'; ctx.fillStyle = '#9c4dcc';
          ctx.fillText('aim of burn · at injection point', bx + 8, by + 30);
        });

        // ── θ₀ zone: at the focus (centre) ───────────────────────────────
        // Large arc + label "θ₀ (output) — where on orbit"
        c2d.showRaw((ctx, cam) => {
          const t0 = orb.theta0;
          if (Math.abs(t0) < 0.01) return;
          const sx = cam.wx(0), sy = cam.wy(0), arcR = cam.ws(1.35);
          ctx.beginPath();
          ctx.arc(sx, sy, arcR, 0, -t0, t0 < 0);
          ctx.strokeStyle = '#e65100'; ctx.lineWidth = 3; ctx.stroke();
          const midA = -t0 / 2;
          ctx.fillStyle = '#e65100'; ctx.font = 'bold italic 15px Georgia,serif';
          ctx.fillText('θ₀', sx + Math.cos(midA) * (arcR + 20), sy + Math.sin(midA) * (arcR + 14));

          // Callout box near focus, below Earth
          const bx = sx - cam.ws(0.4), by = sy + cam.ws(1.25);
          ctx.fillStyle = 'rgba(230,81,0,0.06)';
          ctx.beginPath(); ctx.rect(bx, by, cam.ws(2.4), cam.ws(0.55)); ctx.fill();
          ctx.strokeStyle = 'rgba(230,81,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#e65100'; ctx.font = 'bold 11px system-ui';
          ctx.fillText('θ₀ — output', bx + 8, by + 16);
          ctx.font = '10px system-ui'; ctx.fillStyle = '#f4511e';
          ctx.fillText('position on orbit · at focus', bx + 8, by + 30);
        });

        const color = orbitColor(orb.e);
        c2d.showText(`e = ${orb.e.toFixed(3)}`, -4.5, 3.5, { color, size: 13 });
        c2d.showText(`β₀ = ${state.betaDeg}° (input)`, -4.5, 3.0, { color: '#7b1fa2', size: 11 });
        c2d.showText(`θ₀ = ${(orb.theta0 * 180 / Math.PI).toFixed(1)}° past perigee (output)`, -4.5, 2.6, { color: '#e65100', size: 11 });
      },
    },

    // ── Step 4: Orbit size ───────────────────────────────────────────────────
    // Message: once e and p are known, a = p/(1-e²) gives the physical scale.
    {
      title: 'Semi-Major Axis and Orbit Size',
      description: 'With e and p now known, the semi-major axis a = p/(1 − e²) gives the full physical scale of the orbit. The injection point sits between perigee and apogee at θ₀ = 62.3° — confirming the geometry from step 3.',
      equation: "a = \\frac{p}{1-e^2} \\qquad r_p = \\frac{p}{1+e} \\qquad r_a = \\frac{p}{1-e}",
      notes: 'For χ = 1.40, β₀ = 20°:\n  e = 0.509,  p = 2.474\n  a = 2.474 / (1 − 0.509²) = 3.34  →  a/R = 3.34\n  rₚ = 2.474 / 1.509 = 1.64R  (perigee: inside Earth? No — 1.64R means 0.64R above surface)\n  rₐ = 2.474 / 0.491 = 5.04R  (apogee: 4R above surface)\n\nSpecific energy: Er₀/K = χ/2 − 1 = −0.30 < 0 → bound ellipse ✓\nThis also gives: a = −K/(2E) = r₀/(2 − χ) = 2/0.6 = 3.33R ✓',
      setup(c2d, state) {
        clearControls(state);
        addSliders(state._controls, state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        const orb = computeOrbit(state.chi, state.betaDeg);
        drawOrbit(c2d, orb);
        drawEarth(c2d);

        const thetaP = -orb.theta0;
        const rp = orb.p / (1 + orb.e);
        const ra = orb.e < 1 ? orb.p / (1 - orb.e) : null;
        const ppx = rp * Math.cos(thetaP), ppy = rp * Math.sin(thetaP);

        // Apse line (major axis) — this is the a measurement
        if (ra && ra < 18 && rp < 18) {
          const apx = ra * Math.cos(thetaP + Math.PI), apy = ra * Math.sin(thetaP + Math.PI);

          // Full apse line
          c2d.addLine([[ppx, ppy], [apx, apy]], { color: '#bbb', width: 1.5, dash: [5, 4] });

          // Perigee
          c2d.addPoint(ppx, ppy, { radius: 5, color: '#c62828' });
          c2d.addText(`rₚ = ${rp.toFixed(2)}R`, ppx + 0.12, ppy - 0.3, { color: '#c62828', size: 11 });

          // Apogee
          c2d.addPoint(apx, apy, { radius: 5, color: '#2e7d32' });
          c2d.addText(`rₐ = ${ra.toFixed(2)}R`, apx + 0.12, apy + 0.28, { color: '#2e7d32', size: 11 });

          // a label on the apse line — from centre of ellipse to perigee
          const ecx = (ppx + apx) / 2, ecy = (ppy + apy) / 2; // ellipse centre
          c2d.addPoint(ecx, ecy, { radius: 3, color: '#888' });
          c2d.addLine([[ecx, ecy], [ppx, ppy]], { color: '#888', width: 2 });
          c2d.addText('a', (ecx + ppx) / 2 + 0.1, (ecy + ppy) / 2 + 0.2, { color: '#888', size: 12, italic: true });
        }

        // Injection point — show it sits on the orbit
        c2d.addPoint(R0, 0, { radius: 6, color: '#e65100' });
        c2d.addText(`injection  θ₀ = ${(orb.theta0 * 180 / Math.PI).toFixed(1)}°`, R0 + 0.12, 0.28, { color: '#e65100', size: 10 });

        const color = orbitColor(orb.e);
        const Enorm = 0.5 * state.chi - 1;
        c2d.showText(`e = ${orb.e.toFixed(3)}   ${orbitTypeName(orb.e)}`, -4.5, 3.5, { color, size: 13 });
        if (orb.a) c2d.showText(`a/R = ${orb.a.toFixed(3)}`, -4.5, 3.0, { color: '#555', size: 12 });
        c2d.showText(`Er₀/K = ${Enorm.toFixed(3)}  (${Enorm < -0.001 ? 'bound' : Enorm > 0.001 ? 'escape' : 'parabolic'})`,
          -4.5, 2.5, { color: '#888', size: 11 });
      },
    },

  ],
};
