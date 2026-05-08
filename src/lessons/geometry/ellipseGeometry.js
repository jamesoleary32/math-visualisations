// Ellipse Geometry — four steps from the stretched circle to the orbital bridge.

const K = 1;

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawEllipse(c2d, cx, a, b, color, live, width = 2) {
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * Math.PI * 2;
    pts.push([cx + a * Math.cos(t), b * Math.sin(t)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width });
}

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `eg-${label.replace(/[^a-z0-9]/gi, '')}`;
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
  return { a: 2.5, e: 0.6, animTheta: 0, _controls: null };
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Ellipse Geometry',
  subject: 'Geometry',

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
    // ── Step 1: Ellipse as a stretched circle ────────────────────────────────
    {
      title: 'A Stretched Circle',
      description: 'An ellipse is simply a circle scaled by different factors along the two axes. Starting from a circle of radius a, compressing the y-axis by factor b/a gives an ellipse with semi-major axis a and semi-minor axis b.',
      equation: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\qquad (b \\leq a)',
      notes: 'Parametrically: x = a cosθ,  y = b sinθ.\n\nThe parameter θ is NOT the angle from the centre — it is the eccentric anomaly, a convenient angle that sweeps the ellipse uniformly. The actual angle φ satisfies tan φ = (b/a) tan θ.\n\na is the semi-major axis (half the longest diameter).\nb is the semi-minor axis (half the shortest diameter).\n\nWhen a = b the ellipse is a circle.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'semi-major axis  a', 0.5, 3.5, 0.05, state.a, v => state.a = v);
        addSlider(state._controls, 'eccentricity  e',   0,   0.95, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { a, e } = state;
        const b = a * Math.sqrt(1 - e * e);

        // Ghost circle of radius a
        const circlePts = [];
        for (let i = 0; i <= 300; i++) {
          const t = (i / 300) * Math.PI * 2;
          circlePts.push([a * Math.cos(t), a * Math.sin(t)]);
        }
        c2d.addLine(circlePts, { color: '#ddd', width: 1.5, dash: [5, 4] });
        c2d.addText('circle  r = a', a * 0.62, a * 0.78, { color: '#bbb', size: 11 });

        // Ellipse (centred at origin for this step)
        drawEllipse(c2d, 0, a, b, '#1565c0', false);

        // Semi-axis annotations
        c2d.addArrow(0, 0, a, 0,  { color: '#c62828', width: 2 });
        c2d.addArrow(0, 0, 0, b,  { color: '#2e7d32', width: 2 });
        c2d.addText(`a = ${a.toFixed(2)}`, a * 0.45, 0.22, { color: '#c62828', size: 12 });
        c2d.addText(`b = ${b.toFixed(2)}`, 0.12, b * 0.52, { color: '#2e7d32', size: 12 });

        // Right-angle marker
        c2d.raw((ctx, self) => {
          const s = 0.15;
          ctx.save(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(self.wx(s), self.wy(0));
          ctx.lineTo(self.wx(s), self.wy(s));
          ctx.lineTo(self.wx(0), self.wy(s));
          ctx.stroke(); ctx.restore();
        });

        c2d.addText(`e = ${e.toFixed(2)},  b/a = ${(b/a).toFixed(2)}`, -4.5, 3.2,
          { color: '#1565c0', size: 12 });
      },
    },

    // ── Step 2: Area = πab ────────────────────────────────────────────────────
    {
      title: 'Area = πab',
      description: 'Because the ellipse is a circle scaled by b/a in the y-direction, its area is simply the circle area scaled by the same factor. The integration confirms this directly.',
      equation: 'A = \\pi a^2 \\cdot \\frac{b}{a} = \\pi ab \\\\[10pt] = \\int_0^{2\\pi} a\\cos\\theta \\cdot b\\cos\\theta\\, d\\theta = ab\\cdot\\pi',
      notes: 'The scaling argument is the slickest proof:\n\n  Circle area = πa²\n  Scaling y by b/a multiplies every horizontal strip height by b/a\n  → Ellipse area = πa² × (b/a) = πab\n\nFor a circle (b = a): A = πa² ✓\nAs e → 1 (b → 0): A → 0 — the ellipse degenerates to a line segment.\n\nThis formula appears directly in Kepler\'s third law: T = (πab) / (h/2).',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'semi-major axis  a', 0.5, 3.2, 0.05, state.a, v => state.a = v);
        addSlider(state._controls, 'eccentricity  e',   0,   0.95, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { a, e } = state;
        const b    = a * Math.sqrt(1 - e * e);
        const area = Math.PI * a * b;

        // Filled ellipse
        c2d.raw((ctx, self) => {
          ctx.save();
          ctx.fillStyle = 'rgba(21,101,192,0.10)';
          ctx.strokeStyle = '#1565c0';
          ctx.lineWidth   = 2;
          ctx.beginPath();
          for (let i = 0; i <= 400; i++) {
            const t = (i / 400) * Math.PI * 2;
            const x = self.wx(a * Math.cos(t));
            const y = self.wy(b * Math.sin(t));
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        });

        // Axis lines
        c2d.addLine([[-a, 0], [a, 0]], { color: '#c62828', width: 1.5, dash: [4, 3] });
        c2d.addLine([[0, -b], [0, b]], { color: '#2e7d32', width: 1.5, dash: [4, 3] });
        c2d.addText(`a = ${a.toFixed(2)}`, a * 0.45, 0.22,  { color: '#c62828', size: 12 });
        c2d.addText(`b = ${b.toFixed(2)}`, 0.12, b * 0.52,  { color: '#2e7d32', size: 12 });

        c2d.addText(`A = πab = ${area.toFixed(3)}`, -4.5, 3.2, { color: '#1565c0', size: 13 });
      },
    },

    // ── Step 3: Foci and the string definition ────────────────────────────────
    {
      title: 'The Two Foci',
      description: 'Every ellipse has two foci at distance c = ae from the centre. The defining property: for any point P on the ellipse, the sum of distances to the two foci is constant and equal to 2a.',
      equation: 'c = ae, \\quad a^2 = b^2 + c^2 \\\\[10pt] |PF_1| + |PF_2| = 2a',
      notes: 'The "string" definition: pin the two foci to a board, loop a string of length 2a around them, and trace with a pencil — you draw a perfect ellipse.\n\nAs e → 0: c → 0, both foci merge at the centre — circle.\nAs e → 1: c → a, one focus reaches the end of the ellipse.\n\nThe sum |PF₁| + |PF₂| = 2a is constant regardless of where P is. At the end of the major axis: distances are (a−c) and (a+c), sum = 2a ✓. At the end of the minor axis: both distances = √(b²+c²) = a, sum = 2a ✓.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0, 0.95, 0.01, state.e, v => state.e = v);
        state.animTheta = Math.PI / 3;
      },
      update(c2d, state, dt) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const a  = 2.5;
        const e  = state.e;
        const b  = a * Math.sqrt(1 - e * e);
        const c  = a * e;

        drawEllipse(c2d, 0, a, b, '#1565c0', false);

        // Foci
        c2d.addPoint(-c, 0, { radius: 5, color: '#c62828' });
        c2d.addPoint( c, 0, { radius: 5, color: '#c62828' });
        c2d.addText('F₁', -c - 0.4, -0.28, { color: '#c62828', size: 11 });
        c2d.addText('F₂',  c + 0.1,  -0.28, { color: '#c62828', size: 11 });

        // Centre
        c2d.addPoint(0, 0, { radius: 3, color: '#aaa' });

        // Dimension: c
        c2d.addArrow(0, 0, c, 0, { color: '#888', width: 1.5 });
        c2d.addText(`c=${c.toFixed(2)}`, c*0.4, 0.2, { color: '#888', size: 11 });

        // Animate P around the ellipse
        state.animTheta += dt * 0.6;
        const px = a * Math.cos(state.animTheta);
        const py = b * Math.sin(state.animTheta);

        const d1 = Math.sqrt((px + c) ** 2 + py ** 2);
        const d2 = Math.sqrt((px - c) ** 2 + py ** 2);

        // String lines
        c2d.showLine([[-c, 0], [px, py]], { color: '#e65100', width: 1.5 });
        c2d.showLine([[ c, 0], [px, py]], { color: '#2e7d32', width: 1.5 });
        c2d.showPoint(px, py, { radius: 6, color: '#333' });
        c2d.showText('P', px + 0.12, py + 0.15, { color: '#333', size: 11 });

        c2d.showText(`|PF₁| = ${d1.toFixed(3)}`, -4.5, 3.2, { color: '#e65100', size: 12 });
        c2d.showText(`|PF₂| = ${d2.toFixed(3)}`, -4.5, 2.75, { color: '#2e7d32', size: 12 });
        c2d.showText(`sum  = ${(d1+d2).toFixed(3)}  (= 2a = ${(2*a).toFixed(2)})`, -4.5, 2.3,
          { color: '#555', size: 12 });
        c2d.addText(`e = ${e.toFixed(2)},  c = ${c.toFixed(2)}`, -4.5, -3.2,
          { color: '#1565c0', size: 11 });
      },
    },

    // ── Step 4: Bridge to orbital mechanics ──────────────────────────────────
    {
      title: 'Bridge to Orbital Mechanics',
      description: 'In a Keplerian orbit the attracting body sits at one focus, not the centre. Three geometric relationships link the ellipse parameters to the orbital quantities p (semi-latus rectum) and h (angular momentum).',
      equation: 'p = \\frac{b^2}{a}, \\quad h = \\sqrt{Kp}, \\quad b = \\sqrt{ap} \\\\[10pt] T = \\frac{\\pi ab}{h/2} = 2\\pi\\sqrt{\\frac{a^3}{K}}',
      notes: 'p = b²/a is the semi-latus rectum — the half-chord through the focus perpendicular to the major axis. It appears in the orbit equation r = p/(1 + e cosθ).\n\nThe chain of substitutions that gives Kepler\'s third law:\n  1. b² = a²(1−e²) = ap\n  2. h² = Kp = Kb²/a\n  3. h = b√(K/a)\n  4. T = 2πab/h = 2πab / (b√(K/a)) = 2π√(a³/K)\n\nNote that b cancels — T depends only on a and K.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'semi-major axis  a', 0.8, 3.2, 0.05, state.a, v => state.a = v);
        addSlider(state._controls, 'eccentricity  e',   0.05, 0.92, 0.01, state.e, v => state.e = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        const { a, e } = state;
        const b  = a * Math.sqrt(1 - e * e);
        const c  = a * e;
        const p  = b * b / a;
        const h  = Math.sqrt(K * p);
        const T  = 2 * Math.PI * Math.sqrt(a * a * a / K);

        // Orbit with focus at origin (shift ellipse centre to -c)
        drawEllipse(c2d, -c, a, b, '#1565c0', false);

        // Focus (attracting body) at origin
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });
        c2d.addText('F', 0.14, -0.3, { color: '#f57f17', size: 11 });

        // Empty focus
        c2d.addPoint(-2*c, 0, { radius: 4, color: '#bbb' });

        // Semi-latus rectum: vertical chord through focus
        const rLatus = p; // r at θ = π/2 is p
        c2d.addLine([[0, -rLatus], [0, rLatus]], { color: '#7b1fa2', width: 2 });
        c2d.addText(`p = ${p.toFixed(2)}`, 0.12, rLatus * 0.55, { color: '#7b1fa2', size: 12 });

        // Semi-major axis arrow
        c2d.addArrow(-c, 0, -c + a, 0, { color: '#c62828', width: 2 });
        c2d.addText(`a = ${a.toFixed(2)}`, -c + a*0.35, 0.22, { color: '#c62828', size: 12 });

        // Semi-minor axis arrow
        c2d.addArrow(-c, 0, -c, b, { color: '#2e7d32', width: 2 });
        c2d.addText(`b = ${b.toFixed(2)}`, -c + 0.12, b*0.5, { color: '#2e7d32', size: 12 });

        // Key values
        c2d.addText(`p = b²/a = ${p.toFixed(3)}`, -4.5,  3.2, { color: '#7b1fa2', size: 12 });
        c2d.addText(`h = √(Kp) = ${h.toFixed(3)}`, -4.5,  2.75, { color: '#555',   size: 12 });
        c2d.addText(`T = 2π√(a³/K) = ${T.toFixed(3)}`, -4.5, 2.3, { color: '#1565c0', size: 12 });
      },
    },
  ],
};
