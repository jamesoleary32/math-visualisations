// Kepler's First Law — orbits are conic sections.
// Derives the orbit equation from Newton's inverse-square law via Binet's substitution.

import { renderEquation } from '../../ui/equation.js';

const K = 1;

// ── Orbit helpers ─────────────────────────────────────────────────────────────

function orbitR(p, e, theta) {
  const d = 1 + e * Math.cos(theta);
  return Math.abs(d) < 1e-9 ? Infinity : p / d;
}

function drawOrbit(c2d, p, e, color, live, width = 2) {
  const pts = [];
  for (let i = 0; i <= 500; i++) {
    const t = (i / 500) * Math.PI * 2;
    const r = orbitR(p, e, t);
    if (!isFinite(r) || r > 25) { if (pts.length > 1) { c2d[live ? 'showLine' : 'addLine'](pts.splice(0), { color, width }); } continue; }
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  if (pts.length > 1) c2d[live ? 'showLine' : 'addLine'](pts, { color, width });
}

function conicName(e) {
  if (e < 0.01) return 'Circle';
  if (e < 1)    return 'Ellipse';
  if (e < 1.01) return 'Parabola';
  return 'Hyperbola';
}

function conicColor(e) {
  if (e < 0.01) return '#2e7d32';
  if (e < 1)    return '#1565c0';
  if (e < 1.01) return '#e65100';
  return '#7b1fa2';
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `kf-${label.replace(/[^a-z0-9]/gi, '')}`;
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

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return { e: 0.6, p: 2.0, theta: 0, _controls: null };
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   "Kepler's First Law",
  subject: 'Particle Dynamics',

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
    {
      title: 'Equations of Motion in Polar Coordinates',
      description: "Newton's second law F = ma applied to a particle attracted to a fixed centre by an inverse-square force gives two scalar equations in polar coordinates.",
      equation: "\\underbrace{\\ddot{r} - r\\dot{\\theta}^2}_{\\text{radial}} = -\\dfrac{K}{r^2} \\\\[10pt] \\underbrace{\\dfrac{1}{r}\\dfrac{d}{dt}(r^2\\dot{\\theta})}_{\\text{transverse}} = 0",
      notes: 'The transverse equation integrates immediately: r²θ̇ = h = const. This is conservation of angular momentum — no transverse force means no angular acceleration.\n\nThe radial equation is nonlinear in r and looks hard to solve. Binet\'s substitution (next step) transforms it into a simple linear ODE.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        // Draw a reference ellipse
        drawOrbit(c2d, state.p, 0.6, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        // Annotate r and theta on orbit
        const theta = Math.PI / 4;
        const r = orbitR(state.p, 0.6, theta);
        const px = r * Math.cos(theta), py = r * Math.sin(theta);
        c2d.addLine([[0, 0], [px, py]], { color: '#c62828', width: 1.5, dash: [4, 3] });
        c2d.addPoint(px, py, { radius: 5, color: '#333' });
        c2d.addText('r', px * 0.48 - 0.1, py * 0.48 + 0.1, { color: '#c62828', size: 13 });

        // theta arc
        c2d.raw((ctx, self) => {
          ctx.save();
          ctx.strokeStyle = '#888'; ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(self.wx(0), self.wy(0), self.ws(0.6), 0, -theta, true);
          ctx.stroke();
          ctx.restore();
        });
        c2d.addText('θ', 0.65, 0.12, { color: '#888', size: 13 });

        // r-hat and theta-hat vectors
        const scale = 0.7;
        const rx = Math.cos(theta), ry = Math.sin(theta);
        const tx = -Math.sin(theta), ty = Math.cos(theta);
        c2d.addArrow(px, py, px + rx * scale, py + ry * scale, { color: '#c62828', width: 2 });
        c2d.addArrow(px, py, px + tx * scale, py + ty * scale, { color: '#2e7d32', width: 2 });
        c2d.addText('r̂', px + rx * scale + 0.1, py + ry * scale, { color: '#c62828', size: 12 });
        c2d.addText('θ̂', px + tx * scale - 0.1, py + ty * scale + 0.15, { color: '#2e7d32', size: 12 });
      },
      update() {},
    },

    {
      title: "Binet's Substitution",
      description: "Let u = 1/r. Expressing the radial equation in terms of u and θ (eliminating time using h = r²θ̇) transforms a nonlinear ODE in t into a simple linear ODE in θ.",
      equation: "u = \\frac{1}{r}, \\quad \\dot{r} = -h\\frac{du}{d\\theta} \\\\[8pt] \\frac{d^2u}{d\\theta^2} + u = \\frac{K}{h^2}",
      notes: 'The substitution works because h = r²θ̇ lets us replace d/dt with (h u²) d/dθ:\n\n  ṙ = dr/dt = (dr/dθ)·θ̇ = −(1/u²)(du/dθ)·hu² = −h du/dθ\n\nApplying this twice to get r̈ and substituting into the radial equation gives the Binet equation — a simple harmonic oscillator with a constant forcing term K/h².',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Show u = 1/r graphically: plot u vs theta for the reference orbit
        const p = state.p, e = 0.6;
        const pts = [];
        for (let i = 0; i <= 300; i++) {
          const t = (i / 300) * Math.PI * 2;
          const r = orbitR(p, e, t);
          if (!isFinite(r)) continue;
          // Map theta → x, u → y in world space (scaled for display)
          const wx = (t / (Math.PI * 2)) * 7 - 3.5;
          const wy = (1 / r) * 3;
          pts.push([wx, wy]);
        }
        c2d.addLine(pts, { color: '#1565c0', width: 2 });

        // Axes labels
        c2d.addText('θ', 3.7, -0.3, { color: '#888', size: 12 });
        c2d.addText('u = 1/r', -3.5, 2.5, { color: '#1565c0', size: 12 });
        c2d.addLine([[-3.5, 0], [3.7, 0]], { color: '#ccc', width: 1 });
        c2d.addLine([[-3.5, 0], [-3.5, 3]], { color: '#ccc', width: 1 });

        // Mark K/h² (mean value of u for this orbit)
        const h  = Math.sqrt(K * p);
        const u0 = K / (h * h);
        const y0 = u0 * 3;
        c2d.addLine([[-3.5, y0], [3.5, y0]], { color: '#e65100', width: 1, dash: [5, 4] });
        c2d.addText('K/h²', 2.8, y0 + 0.15, { color: '#e65100', size: 11 });
        c2d.addText('u oscillates about K/h² — exactly like a harmonic oscillator', -3.4, -0.6, { color: '#555', size: 11 });
      },
      update() {},
    },

    {
      title: 'General Solution — Orbit Equation',
      description: "The Binet equation d²u/dθ² + u = K/h² is a forced harmonic oscillator. Its general solution gives the orbit as a conic section in polar form.",
      equation: "u = \\frac{K}{h^2} + A\\cos\\theta \\\\[8pt] \\Longrightarrow \\quad r = \\frac{p}{1 + e\\cos\\theta}, \\quad p = \\frac{h^2}{K}",
      notes: 'p = h²/K is the semi-latus rectum — it sets the size of the orbit.\n\ne = A h²/K is the eccentricity — it is set by the initial conditions (speed and direction at injection):\n\n  e² = 1 + (2Eh²/K²)\n\nwhere E is the total specific energy. If E < 0 then e < 1 and the orbit is an ellipse. If E = 0, e = 1 (parabola). If E > 0, e > 1 (hyperbola).',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        // Draw all four conic types at once
        const P = 2.0;
        drawOrbit(c2d, P, 0.0,  '#2e7d32', false); c2d.addText('e = 0  circle',    2.1,  2.0, { color: '#2e7d32', size: 11 });
        drawOrbit(c2d, P, 0.65, '#1565c0', false); c2d.addText('e = 0.65  ellipse', 2.3,  1.2, { color: '#1565c0', size: 11 });
        drawOrbit(c2d, P, 1.0,  '#e65100', false); c2d.addText('e = 1  parabola',   2.5,  0.1, { color: '#e65100', size: 11 });
        drawOrbit(c2d, P, 1.6,  '#7b1fa2', false); c2d.addText('e = 1.6  hyperbola',2.5, -0.7, { color: '#7b1fa2', size: 11 });
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });
        c2d.addText('same p, different e', -4.5, 3.2, { color: '#555', size: 12 });
      },
      update() {},
    },

    {
      title: 'Eccentricity and Energy',
      description: 'The eccentricity is determined entirely by the total orbital energy E. Drag the slider to morph through the complete family of Keplerian orbits — they all arise from the same inverse-square law.',
      equation: "e = \\sqrt{1 + \\frac{2Eh^2}{K^2}}, \\quad E = -\\frac{K}{2a} \\;(\\text{ellipse})",
      notes: 'E < 0: bound orbit (ellipse). The particle never escapes — it is gravitationally captured.\nE = 0: marginal escape (parabola). Exactly enough energy to reach infinity with zero speed.\nE > 0: unbound orbit (hyperbola). The particle escapes and retains kinetic energy at infinity.\n\nFor an ellipse, E = −K/2a depends only on a — the period and energy are set by the semi-major axis alone, regardless of eccentricity.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 1.8, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { e, p } = state;
        const color = conicColor(e);
        drawOrbit(c2d, p, e, color, false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        // Energy label
        let Estr;
        if (e < 1) {
          const a = p / (1 - e * e);
          Estr = `E = ${(-K / (2 * a)).toFixed(3)}  (bound)`;
        } else if (e < 1.01) {
          Estr = 'E = 0  (marginal)';
        } else {
          const a = p / (e * e - 1);
          Estr = `E = +${(K / (2 * a)).toFixed(3)}  (unbound)`;
        }

        c2d.addText(`${conicName(e)}   e = ${e.toFixed(2)}`, -4.5, 3.2, { color, size: 13 });
        c2d.addText(Estr, -4.5, 2.75, { color: '#888', size: 11 });
      },
    },
  ],
};
