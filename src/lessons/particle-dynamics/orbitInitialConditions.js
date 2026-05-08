// Orbit from Initial Conditions — textbook section 4.9.
// At burnout: r = r₀, v = v₀, heading angle β₀ from the normal to r.
// Derives e, θ₀, h from these three numbers.

import { renderEquation } from '../../ui/equation.js';

const K  = 1.0;
const R0 = 2.0;                          // fixed injection radius
const V_CIRC = Math.sqrt(K / R0);        // circular orbit speed at r₀
const VEL_SCALE = 1.8;                   // visual scale for velocity arrow
const EARTH_R   = 0.28;

// ── Orbital mechanics ─────────────────────────────────────────────────────────

function computeOrbit(v0, betaDeg) {
  const b  = betaDeg * Math.PI / 180;
  const chi = R0 * v0 * v0 / K;          // r₀v₀²/K  (dimensionless)
  const h   = R0 * v0 * Math.cos(b);     // angular momentum per unit mass
  const p   = h * h / K;                 // semi-latus rectum
  const eCos = chi * Math.cos(b) * Math.cos(b) - 1;   // e·cosθ₀
  const eSin = chi * Math.sin(b) * Math.cos(b);        // e·sinθ₀
  const e    = Math.sqrt(eCos*eCos + eSin*eSin);
  const theta0 = Math.atan2(eSin, eCos); // angle from perigee to injection point
  const E    = 0.5 * v0*v0 - K/R0;      // total energy per unit mass
  return { chi, h, p, e, theta0, eCos, eSin, E, b };
}

// Injection point fixed at (R0, 0). Orbit in world: r(φ) = p/(1 + e·cos(φ + θ₀))
function traceOrbit(orb, nPts = 500) {
  const { p, e, theta0 } = orb;
  const segments = [[]];
  for (let i = 0; i <= nPts; i++) {
    const phi = (i / nPts) * Math.PI * 2;
    const denom = 1 + e * Math.cos(phi + theta0);
    if (Math.abs(denom) < 0.05) { if (segments[segments.length-1].length) segments.push([]); continue; }
    const r = p / denom;
    if (r < 0 || r > 20) { if (segments[segments.length-1].length) segments.push([]); continue; }
    segments[segments.length-1].push([r * Math.cos(phi), r * Math.sin(phi)]);
  }
  return segments.filter(s => s.length > 1);
}

function orbitColor(e) {
  if (e < 0.01)  return '#2e7d32';
  if (e < 1)     return '#1565c0';
  if (e < 1.02)  return '#e65100';
  return '#7b1fa2';
}

function orbitTypeName(e) {
  if (e < 0.01)  return 'Circle';
  if (e < 1)     return 'Ellipse';
  if (e < 1.02)  return 'Parabola';
  return 'Hyperbola';
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

function drawEarth(c2d) {
  c2d.raw((ctx, c) => {
    ctx.beginPath();
    ctx.arc(c.wx(0), c.wy(0), c.ws(EARTH_R), 0, Math.PI*2);
    ctx.fillStyle = '#1565c0'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', c.wx(0), c.wy(0) + 4);
    ctx.textAlign = 'left';
  });
}

function drawGrid(c2d) {
  c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
  c2d.addAxes({ color: '#e8e8e8' });
}

function drawOrbit(c2d, orb, live) {
  const color = orbitColor(orb.e);
  for (const seg of traceOrbit(orb)) {
    if (live) c2d.showLine(seg, { color, width: 2 });
    else      c2d.addLine(seg, { color, width: 2 });
  }
}

// Draw injection geometry at (R0, 0): r₀ line, velocity arrow, β₀ arc, labels
function drawInjectionGeometry(c2d, v0, betaDeg, orb) {
  const b = orb.b;
  const VS = VEL_SCALE;

  // r₀ dashed line from Earth to injection
  c2d.showLine([[0,0],[R0,0]], { color: '#888', width: 1, dash: [3,2] });
  c2d.showText('r₀', R0*0.5+0.05, 0.18, { color: '#888', size: 12, italic: true });

  // Injection point
  c2d.showPoint(R0, 0, { radius: 6, color: '#e65100' });
  c2d.showText('burnout', R0+0.12, 0.22, { color: '#e65100', size: 11 });

  // Normal to r (θ̂ direction) — dashed guide
  c2d.showLine([[R0, -0.7],[R0, 0.7]], { color: '#ccc', width: 1, dash: [3,2] });
  c2d.showText('θ̂', R0+0.08, 0.75, { color: '#bbb', size: 11, italic: true });

  // Velocity vector: v = (v0 sinβ, v0 cosβ) since r̂=(1,0), θ̂=(0,1) at injection
  const vx = v0 * Math.sin(b) * VS, vy = v0 * Math.cos(b) * VS;
  c2d.showArrow(R0, 0, R0+vx, vy, { color: '#7b1fa2', width: 2.5 });
  c2d.showText('v₀', R0+vx+0.1, vy+0.05, { color: '#7b1fa2', size: 13, italic: true });

  // β₀ angle arc
  c2d.showRaw((ctx, c) => {
    if (Math.abs(betaDeg) < 1) return;
    const sx = c.wx(R0), sy = c.wy(0);
    const arcR = c.ws(0.45);
    // Angle from +y (transverse) toward +x (radial), in screen coords y is flipped
    const startAngle = -Math.PI/2;           // pointing up = θ̂
    const endAngle   = -Math.PI/2 + b;       // rotated by β₀ (note: canvas y-down)
    ctx.beginPath();
    ctx.arc(sx, sy, arcR, startAngle, endAngle, b < 0);
    ctx.strokeStyle = '#7b1fa2'; ctx.lineWidth = 1.5; ctx.stroke();
    // β₀ label
    const midAngle = (startAngle + endAngle) / 2;
    ctx.fillStyle = '#7b1fa2'; ctx.font = 'italic 12px Georgia, serif';
    ctx.fillText('β₀', sx + Math.cos(midAngle)*(arcR+10), sy + Math.sin(midAngle)*(arcR+10));
  });

  // Perigee direction
  const thetaP = -orb.theta0; // world angle of perigee (injection at φ=0, perigee at φ=-θ₀)
  if (orb.e > 0.05) {
    const rp = orb.p / (1 + orb.e);
    const px = rp * Math.cos(thetaP), py = rp * Math.sin(thetaP);
    c2d.showLine([[0,0],[px,py]], { color: '#c62828', width: 1, dash: [4,3] });
    c2d.showPoint(px, py, { radius: 4, color: '#c62828' });
    c2d.showText('perigee', px+0.1, py-0.25, { color: '#c62828', size: 11 });
  }
}

// Draw velocity decomposition at injection
function drawVelocityDecomp(c2d, v0, orb) {
  const b = orb.b;
  const VS = VEL_SCALE;
  const vTrans = v0 * Math.cos(b);  // transverse = v₀ cos β₀
  const vRad   = v0 * Math.sin(b);  // radial = v₀ sin β₀

  // Transverse component (upward at injection)
  c2d.showArrow(R0, 0, R0, vTrans*VS, { color: '#2e7d32', width: 2 });
  c2d.showText(`v₀cosβ₀ = ${vTrans.toFixed(3)}`, R0+0.12, vTrans*VS*0.5, { color: '#2e7d32', size: 11 });

  // Radial component
  if (Math.abs(vRad) > 0.01) {
    c2d.showArrow(R0, 0, R0+vRad*VS, 0, { color: '#c62828', width: 2 });
    c2d.showText(`v₀sinβ₀`, R0+vRad*VS*0.4, -0.25, { color: '#c62828', size: 11 });
  }

  // Total velocity
  c2d.showArrow(R0, 0, R0+vRad*VS, vTrans*VS, { color: '#7b1fa2', width: 2 });
  c2d.showText('v₀', R0+vRad*VS+0.1, vTrans*VS+0.1, { color: '#7b1fa2', size: 13, italic: true });

  c2d.showText(`h = r₀v₀cosβ₀ = ${orb.h.toFixed(3)}`, -3.8, 3.1, { color: '#555', size: 12 });
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `sl-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`[id="${id}-v"]`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = fmt(v);
    onChange(v);
  });
}

// ── e vs χ chart (Fig 4.9-2) ─────────────────────────────────────────────────

function drawEChiChart(c2d, currentChi, currentE, currentBeta) {
  c2d.showRaw((ctx, c) => {
    const bx = 30, by = 30, bw = c.width - 60, bh = c.height - 60;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    const chiMin = 0, chiMax = 4;
    const eMin = -1.2, eMax = 3.2;
    const toSX = chi => bx + ((chi - chiMin) / (chiMax - chiMin)) * bw;
    const toSY = e   => by + bh - ((e - eMin) / (eMax - eMin)) * bh;

    // Grid lines
    ctx.strokeStyle = '#eeeeee'; ctx.lineWidth = 1;
    for (let x = 0; x <= 4; x++) {
      ctx.beginPath(); ctx.moveTo(toSX(x), by); ctx.lineTo(toSX(x), by+bh); ctx.stroke();
    }
    for (let y = -1; y <= 3; y++) {
      ctx.beginPath(); ctx.moveTo(bx, toSY(y)); ctx.lineTo(bx+bw, toSY(y)); ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    for (let x = 0; x <= 4; x++) ctx.fillText(x, toSX(x), by+bh+16);
    ctx.textAlign = 'right';
    for (let y = -1; y <= 3; y++) ctx.fillText(y, bx-6, toSY(y)+4);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888'; ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('r₀v₀²/K', bx + bw/2, by+bh+32);
    ctx.save(); ctx.translate(bx-28, by+bh/2); ctx.rotate(-Math.PI/2);
    ctx.fillText('e', 0, 0); ctx.restore();

    // e = 1 escape line
    ctx.beginPath(); ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
    ctx.moveTo(bx, toSY(1)); ctx.lineTo(bx+bw, toSY(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e65100'; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('escape (e=1)', bx+4, toSY(1)-4);

    // e = 0 circular line
    ctx.beginPath(); ctx.strokeStyle = '#c8e6c9'; ctx.lineWidth = 1.5; ctx.setLineDash([5,4]);
    ctx.moveTo(bx, toSY(0)); ctx.lineTo(bx+bw, toSY(0)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#2e7d32'; ctx.font = '11px system-ui';
    ctx.fillText('circular (e=0)', bx+4, toSY(0)-4);

    // β₀ curves
    const betas = [-40, -20, 0, 20, 40];
    const betaColors = ['#7b1fa2','#1565c0','#333','#1565c0','#7b1fa2'];
    betas.forEach((bdeg, i) => {
      const b = bdeg * Math.PI / 180;
      ctx.beginPath(); ctx.strokeStyle = betaColors[i]; ctx.lineWidth = bdeg === 0 ? 2 : 1.5;
      for (let j = 0; j <= 200; j++) {
        const chi = chiMin + (j/200)*(chiMax-chiMin);
        const eCos = chi*Math.cos(b)*Math.cos(b) - 1;
        const eSin = chi*Math.sin(b)*Math.cos(b);
        const eVal = Math.sqrt(eCos*eCos + eSin*eSin) * (eCos < 0 && bdeg !== 0 ? (bdeg < 0 ? -1 : 1) : 1);
        // Use signed convention: negative e when β₀<0 and eCos<0 (heading inward subcircular)
        const eSigned = bdeg < 0 ? -Math.sqrt(eCos*eCos + eSin*eSin) * (chi < 1/Math.cos(b)/Math.cos(b) ? -1 : 1) : Math.sqrt(eCos*eCos + eSin*eSin);
        const ePlot = Math.sqrt(eCos*eCos + eSin*eSin) * (bdeg < 0 && chi < 1/(Math.cos(b)*Math.cos(b)) ? -1 : 1);
        const sy = toSY(ePlot);
        j === 0 ? ctx.moveTo(toSX(chi), sy) : ctx.lineTo(toSX(chi), sy);
      }
      ctx.stroke();
      // Label at right edge
      const chi_label = 3.8;
      const b2 = bdeg * Math.PI / 180;
      const eC = chi_label*Math.cos(b2)*Math.cos(b2) - 1;
      const eS = chi_label*Math.sin(b2)*Math.cos(b2);
      const eL = Math.sqrt(eC*eC+eS*eS) * (bdeg < 0 && chi_label < 1/(Math.cos(b2)*Math.cos(b2)) ? -1 : 1);
      if (eL > eMin && eL < eMax) {
        ctx.fillStyle = betaColors[i]; ctx.font = '11px Georgia, serif'; ctx.textAlign = 'left';
        ctx.fillText(`β₀=${bdeg}°`, toSX(chi_label)+4, toSY(eL)+4);
      }
    });

    // Current point
    if (currentChi >= chiMin && currentChi <= chiMax) {
      const sy = toSY(Math.min(Math.max(currentE, eMin), eMax));
      ctx.beginPath();
      ctx.arc(toSX(currentChi), sy, 7, 0, Math.PI*2);
      ctx.fillStyle = '#e65100'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

      // Crosshairs
      ctx.beginPath(); ctx.strokeStyle = 'rgba(230,81,0,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.moveTo(toSX(currentChi), by); ctx.lineTo(toSX(currentChi), by+bh);
      ctx.moveTo(bx, sy); ctx.lineTo(bx+bw, sy);
      ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = '#e65100'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`χ=${currentChi.toFixed(2)},  e=${currentE.toFixed(3)}`, toSX(currentChi)+10, sy-8);
    }
  });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

function mkInitState() {
  return { v0: V_CIRC * 1.15, betaDeg: 20, _controls: null };
}

export default {
  title:   "Orbit from Initial Conditions",
  subject: "Particle Dynamics",

  initState: mkInitState,

  init(c2d, state, panelEl) {
    c2d.scale = 75;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: "Injection Conditions",
      description: "At rocket burnout three numbers fix everything: r₀ (altitude), v₀ (speed), and β₀ (heading angle from the normal to r). From these alone we can determine the complete orbit.",
      equation: "r = r_0, \\quad v = v_0, \\quad \\beta = \\beta_0",
      notes: "β₀ is measured from the normal to r (i.e. from the transverse direction θ̂).\n\nβ₀ = 0: velocity is purely transverse — the most efficient injection.\nβ₀ > 0: velocity tilts outward (radially away from Earth).\nβ₀ < 0: velocity tilts inward.\n\nThe purple arrow is v₀. The dashed vertical line is θ̂ (the normal to r₀).\n\nDrag the sliders to see how the orbit changes immediately at burnout.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'speed  v₀  (circular = 0.71)', 0.3, 1.4, 0.01, state.v0,
          v => v.toFixed(3), v => state.v0 = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        drawGrid(c2d);
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawGrid(c2d);
        const orb = computeOrbit(state.v0, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);
        drawInjectionGeometry(c2d, state.v0, state.betaDeg, orb);
        const color = orbitColor(orb.e);
        c2d.showText(`${orbitTypeName(orb.e)}   e = ${orb.e.toFixed(3)}`, -3.8, 3.1, { color, size: 13 });
      }
    },
    {
      title: "Angular Momentum from Heading",
      description: "Only the transverse component of the launch velocity contributes to angular momentum. The radial component contributes nothing — it only changes how fast r is growing at injection.",
      equation: "h = r_0 v_0 \\cos\\beta_0 \\quad (\\text{from } v_{\\theta} = r_0\\dot{\\theta} = h/r_0)",
      notes: "Decompose v₀ at burnout:\n  Transverse: v₀ cos β₀ = r₀θ̇₀ = h/r₀   → gives h\n  Radial:     v₀ sin β₀ = ṙ₀             → gives du/dθ at injection\n\nGreen arrow = transverse component (determines h).\nRed arrow = radial component (determines where on the orbit injection occurs).\n\nThe semi-latus rectum p = h²/K depends only on the transverse velocity:\n  p = r₀²v₀²cos²β₀/K\n\nA pure radial launch (β₀ = ±90°) gives h = 0 — the satellite falls straight back.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'speed  v₀', 0.3, 1.4, 0.01, state.v0,
          v => v.toFixed(3), v => state.v0 = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        drawGrid(c2d);
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawGrid(c2d);
        const orb = computeOrbit(state.v0, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);
        c2d.showLine([[0,0],[R0,0]], { color: '#888', width: 1, dash: [3,2] });
        c2d.showPoint(R0, 0, { radius: 6, color: '#e65100' });
        drawVelocityDecomp(c2d, state.v0, orb);
        c2d.showText(`p = h²/K = ${orb.p.toFixed(3)}`, -3.8, 2.7, { color: '#555', size: 12 });
      }
    },
    {
      title: "Finding e and θ₀",
      description: "Substituting the velocity components into the orbit equation at the injection point gives e cos θ₀ and e sin θ₀ separately. Together they fix both the eccentricity and where on the orbit injection occurred.",
      equation: "e\\cos\\theta_0 = \\frac{r_0 v_0^2\\cos^2\\!\\beta_0}{K} - 1 \\qquad e\\sin\\theta_0 = \\frac{r_0 v_0^2 \\sin\\beta_0\\cos\\beta_0}{K}",
      notes: "From the orbit equation at θ = θ₀:\n  1/r₀ = (K/h²)(1 + e cos θ₀)  →  e cos θ₀ = r₀v₀²cos²β₀/K − 1\n\nFrom the radial velocity ṙ₀ = v₀ sin β₀:\n  ṙ = −h(du/dθ) = Ke sinθ / h  →  e sin θ₀ = r₀v₀² sin β₀ cos β₀/K\n\nThe perigee direction (red dashed line) is at angle −θ₀ from the injection point.\n\nNote: e cos θ₀ = 0 when r₀v₀²cos²β₀/K = 1, i.e. the injection is 90° from perigee.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'speed  v₀', 0.3, 1.4, 0.01, state.v0,
          v => v.toFixed(3), v => state.v0 = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        drawGrid(c2d);
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawGrid(c2d);
        const orb = computeOrbit(state.v0, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);
        drawInjectionGeometry(c2d, state.v0, state.betaDeg, orb);
        const color = orbitColor(orb.e);
        c2d.showText(`e cos θ₀ = ${orb.eCos.toFixed(3)}`, -3.8, 3.1, { color: '#555', size: 12 });
        c2d.showText(`e sin θ₀ = ${orb.eSin.toFixed(3)}`, -3.8, 2.7, { color: '#555', size: 12 });
        c2d.showText(`e = ${orb.e.toFixed(3)},   θ₀ = ${(orb.theta0*180/Math.PI).toFixed(1)}°`, -3.8, 2.3, { color, size: 12 });
      }
    },
    {
      title: "Eccentricity Formula",
      description: "Adding the squares of e cos θ₀ and e sin θ₀ eliminates θ₀ entirely, giving e directly from the burnout conditions. The dimensionless parameter χ = r₀v₀²/K determines the orbit size; β₀ determines its shape.",
      equation: "e^2 = \\left(\\frac{r_0 v_0^2}{K} - 1\\right)^2\\!\\cos^2\\!\\beta_0 + \\sin^2\\!\\beta_0",
      notes: "Define χ = r₀v₀²/K (dimensionless speed parameter):\n  e² = (χ−1)²cos²β₀ + sin²β₀\n\nKey results:\n• β₀ = 0 (transverse launch): e = |χ−1|. Circular orbit when χ = 1 (v₀ = v_circular).\n• β₀ ≠ 0: e ≥ |sin β₀| — can never reach e = 0. A non-transverse launch can never give a circular orbit.\n• e = 1 (escape) when: (χ−1)²cos²β₀ + sin²β₀ = 1\n\nEnergy at burnout (Eq. 4.9-9):\n  Er₀/K = ½χ − 1\n\nE < 0 (χ < 2): bound orbit.  E = 0 (χ = 2): escape.  E > 0 (χ > 2): hyperbolic.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'speed  v₀', 0.3, 1.4, 0.01, state.v0,
          v => v.toFixed(3), v => state.v0 = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
        drawGrid(c2d);
        drawEarth(c2d);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        drawGrid(c2d);
        const orb = computeOrbit(state.v0, state.betaDeg);
        drawOrbit(c2d, orb, false);
        drawEarth(c2d);
        drawInjectionGeometry(c2d, state.v0, state.betaDeg, orb);
        const color = orbitColor(orb.e);
        c2d.showText(`χ = r₀v₀²/K = ${orb.chi.toFixed(3)}`, -3.8, 3.1, { color: '#555', size: 12 });
        c2d.showText(`e = ${orb.e.toFixed(3)}   ${orbitTypeName(orb.e)}`, -3.8, 2.7, { color, size: 13 });
        const Enorm = 0.5*orb.chi - 1;
        c2d.showText(`Er₀/K = ${Enorm.toFixed(3)}  (${Enorm < 0 ? 'bound' : Enorm > 0.01 ? 'escape' : 'parabolic'})`, -3.8, 2.3, { color: '#888', size: 11 });
      }
    },
    {
      title: "e vs χ Chart (Fig. 4.9-2)",
      description: "Plotting e against χ = r₀v₀²/K for different heading angles β₀ shows the complete map of orbit types. Any combination of launch speed and heading maps to a single point on this chart.",
      equation: "e = \\sqrt{\\left(\\chi-1\\right)^2\\cos^2\\!\\beta_0 + \\sin^2\\!\\beta_0}, \\quad \\chi = \\frac{r_0 v_0^2}{K}",
      notes: "Reading the chart:\n• χ < 1: subcircular speed — always an ellipse for β₀ = 0, but other angles can give suborbital trajectories.\n• χ = 1, β₀ = 0: the single point where a circular orbit is possible.\n• χ = 2: escape speed for any β₀ = 0 (v = √(2K/r₀) = escape velocity).\n• For β₀ ≠ 0, escape requires higher χ than β₀ = 0.\n\nThe orange dot marks your current (χ, e) from the sliders. Cross the e = 1 dashed line to escape.",
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'speed  v₀', 0.3, 1.4, 0.01, state.v0,
          v => v.toFixed(3), v => state.v0 = v);
        addSlider(state._controls, 'heading  β₀  (degrees)', -60, 60, 1, state.betaDeg,
          v => v.toFixed(0) + '°', v => state.betaDeg = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.clearLive();
        const orb = computeOrbit(state.v0, state.betaDeg);
        drawEChiChart(c2d, orb.chi, orb.e, state.betaDeg);
      }
    }
  ]
};
