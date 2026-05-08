// Satellite Orbits — follows textbook section 4.7 exactly.
// K = GM = gR² throughout (textbook notation).
// Orbit: r = (h²/K) / (1 + e·cosθ),  h = r²θ̇ = const.

import { renderEquation } from '../../ui/equation.js';

const K = 1.0;       // GM (normalised)
const SPEED = 0.35;
const TRAIL_MAX = 500;
const EARTH_R = 0.28;

// ── Orbit helpers ─────────────────────────────────────────────────────────────

function orbitR(p, e, theta) {
  const d = 1 + e * Math.cos(theta);
  return Math.abs(d) < 1e-9 ? Infinity : p / d;
}

function traceOrbit(p, e, nPts = 400) {
  const pts = [];
  for (let i = 0; i <= nPts; i++) {
    const theta = (i / nPts) * Math.PI * 2;
    const r = orbitR(p, e, theta);
    if (!isFinite(r) || r > 25) { if (pts.length) pts.push(null); continue; }
    pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  // Split on nulls into segments
  const segs = [[]];
  for (const pt of pts) {
    if (pt === null) { if (segs[segs.length-1].length) segs.push([]); }
    else segs[segs.length-1].push(pt);
  }
  return segs.filter(s => s.length > 1);
}

function mkInitState() {
  const p = 2.5, e = 0.55;
  const h = Math.sqrt(K * p);
  return { p, e, h, theta: 0, trail: [], animT: 0, _controls: null };
}

function stepTheta(state, dt) {
  const r = orbitR(state.p, state.e, state.theta);
  if (!isFinite(r) || r > 25) { state.theta = 0; state.trail = []; return; }
  state.theta += (state.h / (r * r)) * dt * SPEED;
  if (state.theta > Math.PI * 2) state.theta -= Math.PI * 2;
}

function satPos(state) {
  const r = orbitR(state.p, state.e, state.theta);
  return [r * Math.cos(state.theta), r * Math.sin(state.theta), r];
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawEarth(c2d) {
  c2d.addPoint(0, 0, { radius: EARTH_R * c2d.scale / c2d.scale, color: '#1565c0' });
  c2d.raw((ctx, c) => {
    ctx.beginPath();
    ctx.arc(c.wx(0), c.wy(0), c.ws(EARTH_R), 0, Math.PI * 2);
    ctx.fillStyle = '#1565c0';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', c.wx(0), c.wy(0) + 4);
    ctx.textAlign = 'left';
  });
}

function drawOrbitCurve(c2d, p, e, color) {
  for (const seg of traceOrbit(p, e)) c2d.addLine(seg, { color, width: 1.5, dash: [4,3] });
}

function drawSatellite(c2d, x, y) {
  c2d.showPoint(x, y, { radius: 7, color: '#e65100', label: 'm' });
}

function drawTrail(c2d, trail) {
  if (trail.length > 1) c2d.showLine(trail.map(p => [p[0], p[1], 0]), { color: '#e65100', width: 1 });
}

function drawRadialTransverse(c2d, x, y, theta) {
  const ALEN = 0.7;
  // r̂ (radial outward)
  const rx = Math.cos(theta) * ALEN, ry = Math.sin(theta) * ALEN;
  c2d.showArrow(x, y, x + rx, y + ry, { color: '#c62828', width: 2 });
  c2d.showText('r̂', x + rx + 0.1, y + ry + 0.1, { color: '#c62828', size: 12, italic: true });
  // θ̂ (transverse)
  const tx = -Math.sin(theta) * ALEN, ty = Math.cos(theta) * ALEN;
  c2d.showArrow(x, y, x + tx, y + ty, { color: '#2e7d32', width: 2 });
  c2d.showText('θ̂', x + tx + 0.1, y + ty, { color: '#2e7d32', size: 12, italic: true });
}

function drawForceArrow(c2d, x, y, theta) {
  const FLEN = 0.65;
  const fx = -Math.cos(theta) * FLEN, fy = -Math.sin(theta) * FLEN;
  c2d.showArrow(x, y, x + fx, y + fy, { color: '#7b1fa2', width: 2.5 });
  c2d.showText('F', x + fx * 0.5 - 0.25, y + fy * 0.5, { color: '#7b1fa2', size: 13, italic: true });
}

function drawRVector(c2d, x, y) {
  c2d.showLine([[0, 0], [x, y]], { color: '#888', width: 1, dash: [3, 2] });
  c2d.showText('r', x * 0.5 + 0.1, y * 0.5 + 0.15, { color: '#888', size: 12, italic: true });
}

// Inset plot: u = 1/r vs θ (a cosine — Binet's result)
function drawUInset(c2d, p, e, theta) {
  c2d.showRaw((ctx, c) => {
    const u0 = 1 / p;           // K/h² = 1/p (since K=1, h²=Kp=p)
    const C  = e / p;           // amplitude

    const bx = c.width - 210, by = 20, bw = 190, bh = 120;
    ctx.fillStyle = 'rgba(250,250,250,0.97)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#999';
    ctx.font = '11px system-ui';
    ctx.fillText('u = 1/r  vs  θ', bx + 8, by + 15);

    const px0 = bx + 22, py0 = by + bh - 18;
    const pw  = bw - 32,  ph  = bh - 36;

    const uMin = u0 - C * 1.4, uMax = u0 + C * 1.4;
    const toSX = t => px0 + (t / (Math.PI * 2)) * pw;
    const toSY = u => py0 - ((u - uMin) / (uMax - uMin)) * ph;

    // Axes
    ctx.beginPath(); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
    ctx.moveTo(px0, py0); ctx.lineTo(px0 + pw, py0);
    ctx.moveTo(px0, py0); ctx.lineTo(px0, py0 - ph);
    ctx.stroke();

    // K/h² = u0 dashed
    const su0 = toSY(u0);
    ctx.beginPath(); ctx.setLineDash([3,3]); ctx.strokeStyle = '#bbb';
    ctx.moveTo(px0, su0); ctx.lineTo(px0 + pw, su0); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#bbb'; ctx.font = '10px Georgia, serif';
    ctx.fillText('K/h²', px0 + pw + 2, su0 + 3);

    // u(θ) curve
    ctx.beginPath(); ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      const u = u0 + C * Math.cos(t);
      i === 0 ? ctx.moveTo(toSX(t), toSY(u)) : ctx.lineTo(toSX(t), toSY(u));
    }
    ctx.stroke();

    // Moving dot
    const tNow = ((theta % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
    const uNow = u0 + C * Math.cos(tNow);
    ctx.beginPath(); ctx.arc(toSX(tNow), toSY(uNow), 5, 0, Math.PI*2);
    ctx.fillStyle = '#e65100'; ctx.fill();

    // Axis labels
    ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui';
    ctx.fillText('0', px0 - 2, py0 + 12);
    ctx.fillText('2π', px0 + pw - 8, py0 + 12);
    ctx.fillText('θ', px0 + pw + 2, py0 + 4);
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id = `sl-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${value.toFixed(2)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`[id="${id}-v"]`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(2);
    onChange(v);
  });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   "Satellite Orbits",
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
      title: "Gravitational Force",
      description: "A satellite of mass m orbits Earth (mass M) at distance r. The gravitational attraction is an inverse-square central force — always directed toward Earth's centre, with magnitude proportional to 1/r².",
      equation: "F = -\\frac{GMm}{r^2} = -\\frac{Km}{r^2}, \\quad K = GM = gR^2",
      notes: "K = gR² connects the constant to something measurable: g is the surface gravitational acceleration (9.81 m/s²) and R is Earth's radius.\n\nThe force is purely radial — there is no transverse component. This is what makes it a central force.\n\nThe purple arrow shows the gravitational force on the satellite, always pointing toward Earth's centre regardless of the satellite's position.",
      setup(c2d, state) {
        Object.assign(state, mkInitState());
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
        drawOrbitCurve(c2d, state.p, state.e, '#dddddd');
      },
      update(c2d, state, dt) {
        stepTheta(state, dt);
        const [x, y, r] = satPos(state);
        state.trail.push([x, y]);
        if (state.trail.length > TRAIL_MAX) state.trail.shift();

        drawTrail(c2d, state.trail);
        drawRVector(c2d, x, y);
        drawForceArrow(c2d, x, y, state.theta);
        drawSatellite(c2d, x, y);
        c2d.showText(`r = ${r.toFixed(2)}`, x + 0.15, y - 0.25, { color: '#888', size: 11 });
      }
    },
    {
      title: "Equations of Motion in Polar Coordinates",
      description: "Applying Newton's second law in polar coordinates splits the motion into radial and transverse components. The transverse equation immediately yields a conservation law.",
      equation: "\\underbrace{\\ddot{r} - r\\dot{\\theta}^2}_{\\text{radial}} = -\\dfrac{K}{r^2} \\\\[10pt] \\underbrace{r\\ddot{\\theta} + 2\\dot{r}\\dot{\\theta}}_{\\text{transverse}} = \\dfrac{1}{r}\\dfrac{d}{dt}(r^2\\dot{\\theta}) = 0",
      notes: "These equations come from differentiating r = r·r̂ twice. Because r̂ and θ̂ rotate with the particle (ṙ̂ = θ̇·θ̂, θ̂̇ = −θ̇·r̂), the product rule generates extra terms:\n\nVelocity:  v = ṙ·r̂ + rθ̇·θ̂\n  vᵣ = ṙ        (radial — how fast r stretches)\n  v_θ = rθ̇      (transverse — how fast the direction rotates)\n\nAcceleration:  a = (r̈ − rθ̇²)·r̂ + (rθ̈ + 2ṙθ̇)·θ̂\n  aᵣ = r̈ − rθ̇²      (radial acceleration)\n  a_θ = rθ̈ + 2ṙθ̇   (transverse acceleration)\n\nThe extra terms (rθ̇², 2ṙθ̇) are geometry, not physics — they appear purely because the coordinate directions are rotating.\n\nSetting F = ma with F = (−K/r², 0) gives both equations directly.\n\nGreen arrow = θ̂ (transverse).  Red arrow = r̂ (radial outward).",
      setup(c2d, state) {
        Object.assign(state, mkInitState());
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
        drawOrbitCurve(c2d, state.p, state.e, '#dddddd');
      },
      update(c2d, state, dt) {
        stepTheta(state, dt);
        const [x, y, r] = satPos(state);
        drawRVector(c2d, x, y);
        drawRadialTransverse(c2d, x, y, state.theta);
        drawSatellite(c2d, x, y);
        const thetaDot = state.h / (r * r);
        c2d.showText(`θ̇ = ${thetaDot.toFixed(3)}`, -3.8, -2.8, { color: '#2e7d32', size: 12 });
        c2d.showText(`ṙ² = ${(r).toFixed(3)}`, -3.8, -3.2, { color: '#c62828', size: 12 });
      }
    },
    {
      title: "Conservation of Angular Momentum & Binet's Equation",
      description: "The transverse equation gives h = r²θ̇ = constant — angular momentum per unit mass is conserved. Substituting u = 1/r transforms the radial equation into a simple harmonic oscillator in u.",
      equation: "r^2\\dot{\\theta} = h = \\text{const} \\qquad \\Rightarrow \\qquad \\frac{d^2u}{d\\theta^2} + u = \\frac{K}{h^2}",
      notes: "Conservation: h = r²θ̇. Watch the inset plot — u = 1/r traces a perfect cosine against θ.\n\nBinet's substitution (u = 1/r):\n  ṙ = −h·du/dθ\n  r̈ = −h²u²·d²u/dθ²\n\nSubstituting into the radial equation and simplifying:\n  d²u/dθ² + u = K/h²  (Eq. 4.7-4)\n\nThis is a simple harmonic oscillator with a constant forcing term K/h². The solution is immediate.",
      setup(c2d, state) {
        Object.assign(state, mkInitState());
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
        drawOrbitCurve(c2d, state.p, state.e, '#dddddd');
      },
      update(c2d, state, dt) {
        stepTheta(state, dt);
        const [x, y, r] = satPos(state);
        state.trail.push([x, y]);
        if (state.trail.length > TRAIL_MAX) state.trail.shift();

        drawTrail(c2d, state.trail);
        drawRVector(c2d, x, y);
        drawSatellite(c2d, x, y);

        const h = state.h / (r * r) * r * r; // = state.h
        c2d.showText(`h = r²θ̇ = ${state.h.toFixed(3)}  (constant)`, -3.8, 3.1, { color: '#555', size: 12 });
        c2d.showText(`u = 1/r = ${(1/r).toFixed(3)}`, -3.8, 2.7, { color: '#1565c0', size: 12 });

        drawUInset(c2d, state.p, state.e, state.theta);
      }
    },
    {
      title: "The Orbit Equation",
      description: "The general solution of d²u/dθ² + u = K/h² is u = K/h² + C·cos θ (measuring θ from perigee so θ₀ = 0). Converting back to r gives the orbit as a conic section.",
      equation: "r = \\frac{h^2/K}{1 + e\\cos\\theta}, \\quad e = \\frac{Ch^2}{K}, \\quad p = \\frac{h^2}{K}",
      notes: "The general solution (Eq. 4.7-5):\n  u = K/h² + C·cos θ\n\nConverting: r = 1/u = (h²/K) / (1 + Ch²/K · cosθ)\n\nDefine eccentricity e = Ch²/K and semi-latus rectum p = h²/K:\n  r = p / (1 + e·cosθ)\n\nThis is exactly the polar equation of a conic section — the same family from the Geometry lesson. The orbit MUST be a conic. The shape is entirely determined by e.\n\nDrag e to see the orbit change. The constant h (angular momentum) is preserved — only the shape changes.",
      setup(c2d, state) {
        state.e = 0.55;
        state.theta = 0;
        state.trail = [];
        state.h = Math.sqrt(K * state.p);
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 0.95, 0.01, state.e, v => {
          state.e = v;
          state.theta = 0;
          state.trail = [];
        });
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
      },
      update(c2d, state, dt) {
        stepTheta(state, dt);
        const [x, y, r] = satPos(state);
        state.trail.push([x, y]);
        if (state.trail.length > TRAIL_MAX) state.trail.shift();

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
        drawOrbitCurve(c2d, state.p, state.e, '#bbbbbb');

        // Perigee and apogee markers
        const rPeri = state.p / (1 + state.e);
        const rApo  = state.p / (1 - state.e);
        c2d.addPoint(rPeri, 0, { radius: 4, color: '#c62828' });
        c2d.addText('perigee', rPeri + 0.1, -0.28, { color: '#c62828', size: 11 });
        if (rApo < 12) {
          c2d.addPoint(-rApo, 0, { radius: 4, color: '#1565c0' });
          c2d.addText('apogee', -rApo - 1.1, -0.28, { color: '#1565c0', size: 11 });
        }

        drawTrail(c2d, state.trail);
        drawSatellite(c2d, x, y);
        c2d.showText(`e = ${state.e.toFixed(2)},  p = ${state.p.toFixed(2)},  h = ${state.h.toFixed(3)}`, -3.8, 3.1, { color: '#555', size: 12 });
      }
    },
    {
      title: "Energy & Orbit Type",
      description: "The constant C is determined by the initial energy. Total energy per unit mass E = v²/2 − K/r fixes the eccentricity. The sign of E determines whether the orbit is bound or an escape trajectory.",
      equation: "e = \\sqrt{1 + \\frac{2Eh^2}{K^2}} \\qquad \\begin{cases} E < 0 & \\text{ellipse (bound)} \\\\ E = 0 & \\text{parabola (escape)} \\\\ E > 0 & \\text{hyperbola} \\end{cases}",
      notes: "From the energy equation (Eqs. 4.7-9 to 4.7-11):\n  e = √(1 + 2Eh²/K²)\n\nE < 0: e < 1 → ellipse. The satellite is gravitationally bound — it returns.\n\nE = 0: e = 1 → parabola. Minimum energy needed to escape to infinity — escape velocity.\n\nE > 0: e > 1 → hyperbola. Satellite escapes with surplus kinetic energy.\n\nFor a circular orbit: E = −K/(2r), e = 0.\n\nDrag e to cross the thresholds and watch the orbit open up.",
      setup(c2d, state) {
        state.e   = 0.55;
        state.theta = 0;
        state.trail = [];
        state.h = Math.sqrt(K * state.p);
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 1.8, 0.01, state.e, v => {
          state.e = v;
          state.theta = 0;
          state.trail = [];
          state.h = Math.sqrt(K * state.p);
          renderEquation(`e = \\sqrt{1 + \\frac{2Eh^2}{K^2}} \\qquad \\begin{cases} E < 0 & \\text{ellipse (bound)} \\\\ E = 0 & \\text{parabola (escape)} \\\\ E > 0 & \\text{hyperbola} \\end{cases}`);
        });
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);
      },
      update(c2d, state, dt) {
        const { p, e, h } = state;

        // For open orbits cap theta near the asymptote
        const r = orbitR(p, e, state.theta);
        if (isFinite(r) && r < 25) {
          state.theta += (h / (r * r)) * dt * SPEED;
          if (e < 1 && state.theta > Math.PI * 2) state.theta -= Math.PI * 2;
        } else {
          state.theta = 0.01;
          state.trail = [];
        }

        const rNow = orbitR(p, e, state.theta);
        const x = rNow * Math.cos(state.theta), y = rNow * Math.sin(state.theta);

        state.trail.push([x, y]);
        if (state.trail.length > TRAIL_MAX) state.trail.shift();

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#e8e8e8' });
        drawEarth(c2d);

        // Orbit curve colour by type
        const color = e < 0.01 ? '#2e7d32' : e < 1 ? '#1565c0' : e < 1.01 ? '#e65100' : '#7b1fa2';
        for (const seg of traceOrbit(p, e)) c2d.addLine(seg, { color, width: 2 });

        // Energy and type labels
        const E = (h*h * (e*e - 1)) / (2 * p * p / (1)); // E = (K/p)(e²-1)/2 with K=1
        const Eval = (e*e - 1) / (2 * state.p);
        const typeName = e < 0.01 ? 'Circle' : e < 1 ? 'Ellipse  (E < 0, bound)' : e < 1.01 ? 'Parabola  (E = 0, escape)' : 'Hyperbola  (E > 0)';
        c2d.addText(typeName, -3.8, 3.1, { color, size: 13 });
        c2d.addText(`E = ${Eval.toFixed(3)},   e = ${e.toFixed(2)}`, -3.8, 2.7, { color: '#888', size: 11 });

        if (isFinite(rNow) && rNow < 25) {
          drawTrail(c2d, state.trail);
          drawSatellite(c2d, x, y);
        }
      }
    }
  ]
};
