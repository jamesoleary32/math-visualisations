// Kepler's Second Law — a line joining a planet to the Sun sweeps equal areas in equal times.
// Equivalent to conservation of angular momentum: h = r²θ̇ = const.

const K = 1;

// ── Orbit helpers ─────────────────────────────────────────────────────────────

function orbitR(p, e, theta) {
  return p / (1 + e * Math.cos(theta));
}

function drawOrbit(c2d, p, e, color, live) {
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * Math.PI * 2;
    pts.push([orbitR(p, e, t) * Math.cos(t), orbitR(p, e, t) * Math.sin(t)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width: 2 });
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `ks-${label.replace(/[^a-z0-9]/gi, '')}`;
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

// ── Sector drawing ────────────────────────────────────────────────────────────

// Sector colours — alternating pairs so each consecutive sector stands out
const SECTOR_COLORS = [
  'rgba(21,101,192,0.25)',   // blue
  'rgba(230,81,0,0.22)',     // orange
  'rgba(46,125,50,0.22)',    // green
  'rgba(123,31,162,0.22)',   // purple
];

function drawSector(ctx, self, pts, fillColor) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.fillStyle  = fillColor;
  ctx.strokeStyle = fillColor.replace(/[\d.]+\)$/, '0.7)');
  ctx.lineWidth  = 1;
  ctx.beginPath();
  ctx.moveTo(self.wx(0), self.wy(0)); // focus
  for (const [x, y] of pts) ctx.lineTo(self.wx(x), self.wy(y));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ── State ─────────────────────────────────────────────────────────────────────

const SECTOR_INTERVAL = 1.2; // real seconds between snapshots
const MAX_SECTORS     = 4;

function mkInitState() {
  return {
    e: 0.65, p: 2.0,
    theta: 0,
    // Animation
    animSpeed: 3,
    sectorTimer: 0,
    currentSectorPts: [],
    completeSectors: [], // [{pts, color}]
    _controls: null,
  };
}

function resetAnim(state) {
  state.theta = 0;
  state.sectorTimer = 0;
  state.currentSectorPts = [];
  state.completeSectors = [];
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   "Kepler's Second Law",
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
      title: 'Angular Momentum is Conserved',
      description: "The transverse equation of motion gives d(r²θ̇)/dt = 0, so h = r²θ̇ is constant throughout the orbit. This is conservation of angular momentum — a consequence of the force being purely radial (central).",
      equation: "h = r^2\\dot{\\theta} = \\text{const} \\\\[8pt] \\mathbf{h} = \\mathbf{r} \\times \\mathbf{v} = \\text{const}",
      notes: 'Any central force — not just inverse-square — conserves angular momentum. The proof is simply that a central force has no moment about the origin.\n\nFor an orbit in a plane, h is the magnitude of the specific angular momentum vector, which points perpendicular to the orbital plane.\n\nAt periapsis: r is minimum, so θ̇ is maximum.\nAt apoapsis: r is maximum, so θ̇ is minimum.\n\nThe spacecraft always adjusts speed to keep r²θ̇ fixed.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawOrbit(c2d, state.p, state.e, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        // Mark periapsis and apoapsis
        const rPeri = orbitR(state.p, state.e, 0);
        const rApo  = orbitR(state.p, state.e, Math.PI);
        c2d.addPoint(rPeri, 0, { radius: 5, color: '#c62828' });
        c2d.addPoint(-rApo, 0, { radius: 5, color: '#2e7d32' });
        c2d.addText('P  (r min, θ̇ max)', rPeri + 0.12, 0.25, { color: '#c62828', size: 11 });
        c2d.addText('A  (r max, θ̇ min)', -rApo + 0.12, -0.35, { color: '#2e7d32', size: 11 });

        const h = Math.sqrt(K * state.p);
        c2d.addText(`h = ${h.toFixed(3)}  (constant)`, -4.5, 3.2, { color: '#555', size: 12 });
      },
      update() {},
    },

    {
      title: 'Areal Velocity — dA/dt = h/2',
      description: 'In a short time dt the position vector sweeps a thin triangle of area dA ≈ ½r²dθ = ½ h dt. So the rate of area swept is constant — equal to h/2 — independent of where on the orbit the particle is.',
      equation: "dA = \\tfrac{1}{2}r^2\\,d\\theta \\\\[6pt] \\frac{dA}{dt} = \\tfrac{1}{2}r^2\\dot{\\theta} = \\frac{h}{2} = \\text{const}",
      notes: 'This is the areal velocity — the area swept per unit time.\n\nBecause dA/dt = h/2 = const, equal time intervals → equal areas, regardless of where on the orbit.\n\nNear periapsis: r is small but θ̇ is large — narrow, long sector.\nNear apoapsis: r is large but θ̇ is small — wide, short sector.\nBoth sectors have the same area.',
      setup(c2d, state) {
        clearControls(state);
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawOrbit(c2d, state.p, state.e, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        // Draw two illustrative sectors of equal area — one near periapsis, one near apoapsis
        // Near periapsis: θ from 0 to ~0.6 rad
        // Near apoapsis: θ from π - 0.6*factor to π + 0.6*factor (wider angle, same area)
        const { p, e } = state;
        const h = Math.sqrt(K * p);
        const T = 2 * Math.PI * Math.sqrt((p / (1 - e * e)) ** 3 / K);
        const dt = T * 0.12; // 12% of period
        const dA = h / 2 * dt;

        // Sector near periapsis
        const ptsPeri = [[orbitR(p, e, 0) * Math.cos(0), 0]];
        let th = 0, area = 0;
        while (area < dA && th < Math.PI) {
          const dth = 0.02;
          const r   = orbitR(p, e, th);
          area += 0.5 * r * r * dth;
          th   += dth;
          ptsPeri.push([r * Math.cos(th), r * Math.sin(th)]);
        }

        // Sector near apoapsis
        const thStart = Math.PI - th / 2;
        const ptsApo  = [];
        let th2 = thStart;
        while (th2 < thStart + th * 3 && th2 < 2 * Math.PI) {
          const r = orbitR(p, e, th2);
          ptsApo.push([r * Math.cos(th2), r * Math.sin(th2)]);
          th2 += 0.02;
        }

        c2d.raw((ctx, self) => {
          drawSector(ctx, self, ptsPeri, 'rgba(198,40,40,0.25)');
          drawSector(ctx, self, ptsApo, 'rgba(46,125,50,0.25)');
        });

        c2d.addText('same area, different shape', -4.5, 3.2, { color: '#555', size: 12 });
        c2d.addText(`dA/dt = h/2 = ${(h / 2).toFixed(3)}`, -4.5, 2.75, { color: '#555', size: 11 });
      },
      update() {},
    },

    {
      title: 'Equal Areas in Equal Times — Animation',
      description: 'Watch the position vector sweep the orbit. Each coloured sector represents the same time interval. They all have the same area even though their shapes are very different.',
      equation: "\\Delta A_1 = \\Delta A_2 = \\cdots = \\frac{h}{2}\\,\\Delta t",
      notes: 'The satellite visibly slows near apoapsis and speeds up near periapsis.\n\nThis is purely a consequence of angular momentum conservation — not a special property of inverse-square forces. Any central force produces equal areas in equal times.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0.1, 0.9, 0.01, state.e, v => { state.e = v; resetAnim(state); });
        addSlider(state._controls, 'speed', 1, 8, 0.5, state.animSpeed, v => state.animSpeed = v);
        resetAnim(state);
      },
      update(c2d, state, dt) {
        const { p, e } = state;
        const h     = Math.sqrt(K * p);
        const eff   = dt * state.animSpeed;

        // Advance orbit
        const r      = orbitR(p, e, state.theta);
        state.theta += (h / (r * r)) * eff;
        if (state.theta > Math.PI * 2) state.theta -= Math.PI * 2;

        const x = r * Math.cos(state.theta), y = r * Math.sin(state.theta);

        // Collect sector points
        state.currentSectorPts.push([x, y]);
        state.sectorTimer += eff;

        if (state.sectorTimer >= SECTOR_INTERVAL) {
          const color = SECTOR_COLORS[state.completeSectors.length % SECTOR_COLORS.length];
          state.completeSectors.push({ pts: [...state.currentSectorPts], color });
          if (state.completeSectors.length > MAX_SECTORS) state.completeSectors.shift();
          state.currentSectorPts = [[x, y]];
          state.sectorTimer = 0;
        }

        // Draw
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawOrbit(c2d, p, e, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        // Completed sectors
        c2d.raw((ctx, self) => {
          for (const s of state.completeSectors) drawSector(ctx, self, s.pts, s.color);
        });

        // Current partial sector (faint)
        c2d.showRaw((ctx, self) => {
          drawSector(ctx, self, state.currentSectorPts, 'rgba(180,180,180,0.18)');
        });

        // Spoke from focus to satellite
        c2d.showLine([[0, 0], [x, y]], { color: '#aaa', width: 1 });

        // Satellite
        c2d.showPoint(x, y, { radius: 6, color: '#222' });

        // Speed label
        const speed = h / r;
        c2d.showText(`speed = ${speed.toFixed(3)}`, -4.5, 3.2, { color: '#555', size: 12 });
      },
    },

    {
      title: 'Fast at Periapsis, Slow at Apoapsis',
      description: 'Kepler\'s second law directly predicts the speed ratio between periapsis and apoapsis. Because the radial distances are different but h = r²θ̇ is the same, the speeds are inversely proportional to radius.',
      equation: "\\frac{v_P}{v_A} = \\frac{r_A}{r_P} = \\frac{1+e}{1-e}",
      notes: 'At periapsis and apoapsis the velocity is purely tangential (ṙ = 0), so v = rθ̇ = h/r.\n\nFor e = 0.65: r_A/r_P = 1.65/0.35 = 4.7 — the planet moves almost 5 times faster at periapsis than apoapsis.\n\nFor Earth\'s orbit (e ≈ 0.017): v_P/v_A ≈ 1.034 — only 3.4% faster in January than July.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'eccentricity  e', 0.05, 0.9, 0.01, state.e, v => { state.e = v; resetAnim(state); });
        resetAnim(state);
      },
      update(c2d, state, dt) {
        const { p, e } = state;
        const h    = Math.sqrt(K * p);
        const eff  = dt * state.animSpeed;
        const r    = orbitR(p, e, state.theta);
        state.theta += (h / (r * r)) * eff;
        if (state.theta > Math.PI * 2) state.theta -= Math.PI * 2;

        const x = r * Math.cos(state.theta), y = r * Math.sin(state.theta);
        const speed = h / r;

        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        drawOrbit(c2d, p, e, '#1565c0', false);
        c2d.addPoint(0, 0, { radius: 7, color: '#f57f17' });

        const rP = orbitR(p, e, 0), rA = orbitR(p, e, Math.PI);
        const vP = h / rP, vA = h / rA;

        // Velocity arrow (tangential) — scaled
        const tx = -Math.sin(state.theta), ty = Math.cos(state.theta);
        const vsc = 1.2;
        c2d.showArrow(x, y, x + tx * speed * vsc, y + ty * speed * vsc, { color: '#c62828', width: 2.5 });

        c2d.showPoint(x, y, { radius: 6, color: '#222' });

        c2d.addText(`rP = ${rP.toFixed(2)}   vP = ${vP.toFixed(3)}`, -4.5, 3.2, { color: '#c62828', size: 11 });
        c2d.addText(`rA = ${rA.toFixed(2)}   vA = ${vA.toFixed(3)}`, -4.5, 2.8, { color: '#2e7d32', size: 11 });
        c2d.addText(`ratio = ${(vP / vA).toFixed(2)}×`, -4.5, 2.35, { color: '#555', size: 12 });
      },
    },
  ],
};
