// Kepler's Third Law — T² ∝ a³.
// Derives the period-radius relationship from angular momentum and ellipse geometry.

const K = 1;

// ── Orbit helpers ─────────────────────────────────────────────────────────────

function orbitR(p, e, theta) { return p / (1 + e * Math.cos(theta)); }

function drawOrbit(c2d, p, e, color, live, width = 2) {
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const t = (i / 300) * Math.PI * 2;
    pts.push([orbitR(p, e, t) * Math.cos(t), orbitR(p, e, t) * Math.sin(t)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width });
}

function period(a) { return 2 * Math.PI * Math.sqrt(a * a * a / K); }

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `kt-${label.replace(/[^a-z0-9]/gi, '')}`;
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

const ORBITS = [
  { a: 1.2, e: 0.3, color: '#1565c0' },
  { a: 2.0, e: 0.5, color: '#2e7d32' },
  { a: 3.2, e: 0.6, color: '#7b1fa2' },
];

function mkInitState() {
  return {
    e: 0.5, a: 2.0,
    thetas: [0, 0, 0],   // one per orbit in step 3
    _controls: null,
  };
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   "Kepler's Third Law",
  subject: 'Particle Dynamics',

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
      title: 'Area of an Ellipse',
      description: 'The period follows from dividing the total area of the orbit by the rate at which area is swept. The total area of an ellipse is πab, where a and b are the semi-major and semi-minor axes.',
      equation: "A_{\\text{ellipse}} = \\pi a b \\\\[8pt] b = \\frac{p}{\\sqrt{1-e^2}} = a\\sqrt{1-e^2}",
      notes: 'The key link between the ellipse geometry and the orbit parameters:\n\n  p = b²/a  (from b = a√(1−e²) and a = p/(1−e²))\n  h² = Kp   (from the orbit equation)\n\nSo  h = √(Kp) = b√(K/a)\n\nThis connects the angular momentum (which sets the areal rate) directly to the ellipse dimensions (which give the total area).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'semi-major axis  a', 0.8, 3.5, 0.05, state.a, v => state.a = v);
        addSlider(state._controls, 'eccentricity  e', 0, 0.9, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { a, e } = state;
        const p  = a * (1 - e * e);
        const b  = a * Math.sqrt(1 - e * e);
        const cx = -(a * e); // ellipse centre (focus at origin)

        drawOrbit(c2d, p, e, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 6, color: '#f57f17' });

        // Semi-major and minor axis annotations
        c2d.addLine([[cx, 0], [cx + a, 0]], { color: '#c62828', width: 2 });
        c2d.addLine([[cx, 0], [cx, b]],     { color: '#2e7d32', width: 2 });
        c2d.addText(`a = ${a.toFixed(2)}`, cx + a * 0.4, 0.2, { color: '#c62828', size: 12 });
        c2d.addText(`b = ${b.toFixed(2)}`, cx + 0.12, b * 0.5, { color: '#2e7d32', size: 12 });

        const T  = period(a);
        c2d.addText(`A = πab = ${(Math.PI * a * b).toFixed(3)}`, -4.5, 3.2, { color: '#1565c0', size: 12 });
        c2d.addText(`T = ${T.toFixed(3)}`, -4.5, 2.75, { color: '#555', size: 12 });
      },
    },

    {
      title: 'Deriving the Period',
      description: 'The period T is the total area divided by the areal rate. Substituting the relations between p, a, b, and h gives a result that depends only on a and K — not on e.',
      equation: "T = \\frac{\\pi a b}{h/2} = \\frac{2\\pi ab}{h} \\\\[8pt] = \\frac{2\\pi a \\cdot a\\sqrt{1-e^2}}{\\sqrt{Ka(1-e^2)}} = 2\\pi\\sqrt{\\frac{a^3}{K}}",
      notes: 'The eccentricity cancels! T depends only on the semi-major axis a.\n\nThis is remarkable: a highly elongated orbit (e → 1) and a nearly circular orbit (e ≈ 0) with the same a have exactly the same period. The elongated orbit makes up for its extra path length by travelling faster near periapsis.\n\nFor the solar system (K = GM_☉): T² = (4π²/GM_☉) a³.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        // Show two orbits with same a, different e — same period
        const a = 2.2;
        const p1 = a * (1 - 0.1 * 0.1), p2 = a * (1 - 0.8 * 0.8);
        drawOrbit(c2d, p1, 0.1, '#1565c0', false);
        drawOrbit(c2d, p2, 0.8, '#e65100', false);
        c2d.addPoint(0, 0, { radius: 6, color: '#f57f17' });

        const T = period(a);
        c2d.addText(`Both orbits: a = ${a}, e = 0.1 or 0.8`, -4.5, 3.2, { color: '#555', size: 11 });
        c2d.addText(`Same period T = ${T.toFixed(3)}`, -4.5, 2.8, { color: '#555', size: 12 });
        c2d.addText('(eccentricity cancels in the derivation)', -4.5, 2.4, { color: '#aaa', size: 11 });
      },
      update() {},
    },

    {
      title: 'Three Orbits — Three Periods',
      description: "Watch three satellites on different orbits. The outer orbit takes longer — and the relationship is T² ∝ a³, not T ∝ a. A planet twice as far takes not 2× but 2^(3/2) ≈ 2.83× as long to orbit.",
      equation: "T^2 = \\frac{4\\pi^2}{K}\\,a^3",
      notes: 'Kepler discovered this empirically in 1619 from Tycho Brahe\'s planetary data, but had no explanation. Newton showed in 1687 that it follows directly from an inverse-square law of gravitation.\n\nFor the solar system:\n  Mercury: T = 88 days, a = 0.387 AU\n  Earth:   T = 365 days, a = 1.000 AU\n  Mars:    T = 687 days, a = 1.524 AU\n\nAll satisfy T² / a³ = const.',
      setup(c2d, state) {
        clearControls(state);
        state.thetas = [0, 0, 0];

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        for (const orb of ORBITS) {
          const p = orb.a * (1 - orb.e * orb.e);
          drawOrbit(c2d, p, orb.e, orb.color, false, 1.5);
        }
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });
      },
      update(c2d, state, dt) {
        for (let i = 0; i < ORBITS.length; i++) {
          const { a, e, color } = ORBITS[i];
          const p = a * (1 - e * e);
          const h = Math.sqrt(K * p);
          const r = orbitR(p, e, state.thetas[i]);
          state.thetas[i] += (h / (r * r)) * dt;
          if (state.thetas[i] > Math.PI * 2) state.thetas[i] -= Math.PI * 2;
          const x = r * Math.cos(state.thetas[i]);
          const y = r * Math.sin(state.thetas[i]);
          c2d.showPoint(x, y, { radius: 6, color });
          c2d.showText(`T=${period(a).toFixed(2)}`, x + 0.12, y + 0.15, { color, size: 10 });
        }
      },
    },

    {
      title: 'T² vs a³ — A Straight Line',
      description: 'Plotting T² against a³ for any collection of Keplerian orbits gives a perfect straight line through the origin, with slope 4π²/K. The slope is the same for every satellite orbiting the same body.',
      equation: "T^2 = \\underbrace{\\frac{4\\pi^2}{K}}_{\\text{slope}}\\cdot a^3",
      notes: 'Drag the slider to add a new orbit and see its point fall on the same line.\n\nIn the solar system, plotting T² vs a³ for the planets (using years and AU) gives slope = 1, since those units are defined so that Earth satisfies T² = a³ exactly.\n\nThis is how astronomers determine the mass of a central body: measure T and a for a satellite, then K = 4π²a³/T² = GM_central.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'semi-major axis  a', 0.5, 4.0, 0.05, state.a, v => state.a = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();

        // Draw the T² vs a³ axes in world space
        // Map: a³ → x (0 to 64), T² → y (0 to 1600)
        // Scale: x_world = a³/64 * 8 - 4,  y_world = T²/1600 * 6 - 0.5
        const aMax = 4.0;
        const a3Max = aMax ** 3;             // 64
        const T2Max = period(aMax) ** 2;     // ≈ 1264

        function toWorld(a) {
          const x = (a ** 3 / a3Max) * 8 - 4;
          const y = (period(a) ** 2 / T2Max) * 6 - 0.3;
          return [x, y];
        }

        // Axes
        c2d.addLine([[-4, -0.3], [4.5, -0.3]], { color: '#ccc', width: 1 });
        c2d.addLine([[-4, -0.3], [-4, 5.8]],   { color: '#ccc', width: 1 });
        c2d.addText('a³', 4.3, -0.6, { color: '#888', size: 12 });
        c2d.addText('T²', -4.4, 5.6, { color: '#888', size: 12 });

        // Theoretical line T² = (4π²/K) a³
        const linePts = [];
        for (let ai = 0; ai <= 4.0; ai += 0.05) linePts.push(toWorld(ai));
        c2d.addLine(linePts, { color: '#1565c0', width: 2 });
        c2d.addText('T² = (4π²/K) a³', 0.5, 5.4, { color: '#1565c0', size: 12 });

        // Fixed reference points (the three sample orbits)
        for (const orb of ORBITS) {
          const [wx, wy] = toWorld(orb.a);
          c2d.addPoint(wx, wy, { radius: 5, color: orb.color });
          c2d.addText(`a=${orb.a}`, wx + 0.12, wy + 0.15, { color: orb.color, size: 10 });
        }

        // Slider point
        const { a } = state;
        const [wx, wy] = toWorld(a);
        c2d.addPoint(wx, wy, { radius: 7, color: '#c62828' });
        c2d.addText(`a=${a.toFixed(2)}, T=${period(a).toFixed(2)}`, wx + 0.12, wy + 0.18,
          { color: '#c62828', size: 11 });
      },
    },
  ],
};
