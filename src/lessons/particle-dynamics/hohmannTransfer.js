// Hohmann Transfer — cotangential orbital transfer between coplanar circular orbits.
// K = 1 (μ = GM). Two impulsive burns move the spacecraft from an inner to outer
// circular orbit via the unique ellipse tangent to both.

import { renderEquation } from '../../ui/equation.js';

const K = 1;

// ── Physics ───────────────────────────────────────────────────────────────────

function getParams(r1, r2) {
  const vc1 = Math.sqrt(K / r1);
  const vc2 = Math.sqrt(K / r2);
  const at  = (r1 + r2) / 2;
  const et  = (r2 - r1) / (r2 + r1);
  const pt  = at * (1 - et * et);
  const ht  = Math.sqrt(K * pt);
  const vp  = Math.sqrt(K * (2 / r1 - 1 / at));
  const va  = Math.sqrt(K * (2 / r2 - 1 / at));
  return {
    vc1, vc2, at, et, pt, ht, vp, va,
    dv1: vp - vc1,
    dv2: vc2 - va,
    Tt:  Math.PI * Math.sqrt(at * at * at / K),
  };
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C = {
  inner:    '#1565c0',
  outer:    '#2e7d32',
  transfer: '#e65100',
  dv:       '#7b1fa2',
  body:     '#f57f17',
  craft:    '#222222',
  burn:     '#c62828',
};

// ── Drawing helpers ───────────────────────────────────────────────────────────

function circle(c2d, r, color, live, opts = {}) {
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const t = (i / 300) * Math.PI * 2;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width: opts.width ?? 2, dash: opts.dash ?? [] });
}

function transferEllipse(c2d, p, e, color, live) {
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * Math.PI * 2;
    const r = p / (1 + e * Math.cos(t));
    if (!isFinite(r) || r > 40) continue;
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  c2d[live ? 'showLine' : 'addLine'](pts, { color, width: 2 });
}

function centralBody(c2d, live) {
  c2d[live ? 'showPoint' : 'addPoint'](0, 0, { radius: 8, color: C.body });
}

function velArrow(c2d, x, y, dx, dy, color, live) {
  c2d[live ? 'showArrow' : 'addArrow'](x, y, x + dx, y + dy, { color, width: 2.5 });
}

// ── Controls ──────────────────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

function addSlider(container, label, min, max, step, value, onChange) {
  const id   = `hs-${label.replace(/[^a-z0-9]/gi, '')}`;
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
  const input = wrap.querySelector('input');
  const valEl = wrap.querySelector(`#${id}-v`);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(2);
    onChange(v);
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

function mkInitState() {
  return {
    r1: 1.5,
    r2: 3.5,
    // animation
    animPhase: 0,    // 0=inner circle, 1=transfer, 2=outer circle
    animTheta: 0,    // current angle / true anomaly
    animSpeed: 4,
    animTrail: [],   // [{x,y,phase}]
    flashTimer: 0,   // non-zero during burn flash
    _controls: null,
  };
}

function resetAnim(state) {
  state.animPhase = 0;
  state.animTheta = 0;
  state.animTrail = [];
  state.flashTimer = 0;
}

// ── Animation stepper ─────────────────────────────────────────────────────────

function stepAnim(state, dt) {
  const { r1, r2, animSpeed } = state;
  const eff  = dt * animSpeed;
  const p    = getParams(r1, r2);

  if (state.animPhase === 0) {
    const omega = Math.sqrt(K / (r1 * r1 * r1));
    state.animTheta += omega * eff;
    const x = r1 * Math.cos(state.animTheta);
    const y = r1 * Math.sin(state.animTheta);
    if (state.animTheta >= 2 * Math.PI * 0.75) {
      // align to burn point
      state.animTheta  = 0;
      state.animPhase  = 1;
      state.flashTimer = 0.4;
      state.animTrail  = [];
    }
    return { x, y, phase: 0 };
  }

  if (state.animPhase === 1) {
    const r = p.pt / (1 + p.et * Math.cos(state.animTheta));
    state.animTheta += (p.ht / (r * r)) * eff;
    const x = r * Math.cos(state.animTheta);
    const y = r * Math.sin(state.animTheta);
    if (state.animTheta >= Math.PI) {
      state.animTheta  = Math.PI;
      state.animPhase  = 2;
      state.flashTimer = 0.4;
      state.animTrail  = [];
    }
    return { x, y, phase: 1 };
  }

  // phase 2 — outer circle
  const omega = Math.sqrt(K / (r2 * r2 * r2));
  state.animTheta += omega * eff;
  const x = r2 * Math.cos(state.animTheta);
  const y = r2 * Math.sin(state.animTheta);
  if (state.animTheta >= Math.PI + 2 * Math.PI * 0.75) {
    state.animTheta = 0;
    state.animPhase = 0;
    state.animTrail = [];
  }
  return { x, y, phase: 2 };
}

const TRAIL_COLORS = [C.inner, C.transfer, C.outer];
const TRAIL_MAX    = 250;

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   'Hohmann Transfer',
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
    // ── Step 1: Two circular orbits ──────────────────────────────────────────
    {
      title: 'Two Circular Orbits',
      description: 'A spacecraft orbits on an inner circular orbit of radius r₁. We want to reach an outer circular orbit of radius r₂. In a circular orbit gravity exactly provides the centripetal force, fixing the speed.',
      equation: 'v_c = \\sqrt{\\dfrac{K}{r}}',
      notes: 'Larger orbits are slower — doubling the radius reduces speed by √2.\n\nThe arrows show the velocity direction (always tangential) and relative magnitude. The central body (orange) sits at the focus of both orbits.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'inner radius  r₁', 0.8, 2.4, 0.05, state.r1, v => state.r1 = v);
        addSlider(state._controls, 'outer radius  r₂', 2.6, 5.0, 0.05, state.r2, v => state.r2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const p  = getParams(state.r1, state.r2);
        const sc = 1.4; // velocity arrow scale

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        circle(c2d, state.r1, C.inner,  false);
        circle(c2d, state.r2, C.outer,  false);
        centralBody(c2d, false);

        // Velocity arrows at top of each orbit
        velArrow(c2d,  state.r1, 0, 0,  p.vc1 * sc, C.inner, false);
        velArrow(c2d, -state.r1, 0, 0, -p.vc1 * sc, C.inner, false);
        velArrow(c2d,  state.r2, 0, 0,  p.vc2 * sc, C.outer, false);
        velArrow(c2d, -state.r2, 0, 0, -p.vc2 * sc, C.outer, false);

        c2d.addText(`r₁ = ${state.r1.toFixed(2)},  v₁ = ${p.vc1.toFixed(3)}`, -4.5, 3.2,
          { color: C.inner, size: 12 });
        c2d.addText(`r₂ = ${state.r2.toFixed(2)},  v₂ = ${p.vc2.toFixed(3)}`, -4.5, 2.8,
          { color: C.outer, size: 12 });
      },
    },

    // ── Step 2: Transfer ellipse ─────────────────────────────────────────────
    {
      title: 'The Cotangential Transfer Ellipse',
      description: 'There is a unique ellipse that is simultaneously tangent to both circular orbits — tangent at periapsis to the inner orbit, and at apoapsis to the outer orbit. This is the Hohmann transfer ellipse.',
      equation: 'a_t = \\dfrac{r_1 + r_2}{2}, \\qquad e_t = \\dfrac{r_2 - r_1}{r_2 + r_1}',
      notes: 'Cotangential means the transfer orbit shares the same tangent line as each circular orbit at the two burn points — so both burns are purely tangential (no radial component).\n\nThis makes the Hohmann transfer the most fuel-efficient two-burn transfer between coplanar circular orbits.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'inner radius  r₁', 0.8, 2.4, 0.05, state.r1, v => state.r1 = v);
        addSlider(state._controls, 'outer radius  r₂', 2.6, 5.0, 0.05, state.r2, v => state.r2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const p = getParams(state.r1, state.r2);

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        circle(c2d, state.r1, C.inner, false, { dash: [6, 4] });
        circle(c2d, state.r2, C.outer, false, { dash: [6, 4] });
        transferEllipse(c2d, p.pt, p.et, C.transfer, false);
        centralBody(c2d, false);

        // Periapsis and apoapsis markers
        const r_peri = state.r1;
        const r_apo  = state.r2;
        c2d.addPoint( r_peri, 0, { radius: 6, color: C.burn,  label: 'P  (Δv₁)' });
        c2d.addPoint(-r_apo,  0, { radius: 6, color: C.outer, label: 'A  (Δv₂)' });

        // Semi-major axis line
        c2d.addLine([[ r_peri, 0], [-r_apo, 0]], { color: '#bbb', width: 1, dash: [4, 3] });

        c2d.addText(`aₜ = ${p.at.toFixed(3)}`, -1.5, 0.2, { color: '#888', size: 11 });
        c2d.addText(`eₜ = ${p.et.toFixed(3)}`, -1.5, -0.3, { color: '#888', size: 11 });
        c2d.addText(`aₜ = (r₁ + r₂)/2`, -4.5, 3.2, { color: C.transfer, size: 12 });
      },
    },

    // ── Step 3: First burn Δv₁ ───────────────────────────────────────────────
    {
      title: 'First Burn — Δv₁ at Periapsis',
      description: 'At point P the spacecraft speeds up from the circular velocity v_c1 to the transfer ellipse periapsis velocity v_p. Because the orbits are cotangential, this burn is purely tangential — no steering required.',
      equation: '\\Delta v_1 = v_p - v_{c1} = \\sqrt{K\\!\\left(\\tfrac{2}{r_1} - \\tfrac{1}{a_t}\\right)} - \\sqrt{\\tfrac{K}{r_1}}',
      notes: 'v_p > v_c1 because the spacecraft must gain energy to climb to the higher orbit.\n\nThe vis-viva equation v² = K(2/r − 1/a) gives the speed at any point on a Keplerian orbit, given only r and the semi-major axis a.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'inner radius  r₁', 0.8, 2.4, 0.05, state.r1, v => state.r1 = v);
        addSlider(state._controls, 'outer radius  r₂', 2.6, 5.0, 0.05, state.r2, v => state.r2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const p  = getParams(state.r1, state.r2);
        const sc = 1.8;

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        circle(c2d, state.r1, C.inner,    false, { dash: [6, 4] });
        circle(c2d, state.r2, C.outer,    false, { dash: [6, 4] });
        transferEllipse(c2d, p.pt, p.et, C.transfer, false);
        centralBody(c2d, false);

        // Burn point P at (r1, 0)
        const bx = state.r1;
        c2d.addPoint(bx, 0, { radius: 6, color: C.burn });

        // v_c1 arrow (blue, shorter)
        c2d.addArrow(bx, 0, bx, p.vc1 * sc, { color: C.inner, width: 2.5 });
        c2d.addText(`v_c₁ = ${p.vc1.toFixed(3)}`, bx + 0.12, p.vc1 * sc * 0.5, { color: C.inner, size: 11 });

        // v_p arrow (orange, longer)
        c2d.addArrow(bx, 0, bx, p.vp * sc, { color: C.transfer, width: 2.5 });
        c2d.addText(`v_p = ${p.vp.toFixed(3)}`, bx + 0.12, p.vp * sc * 0.85, { color: C.transfer, size: 11 });

        // Δv₁ bracket (purple, the extension)
        c2d.addArrow(bx, p.vc1 * sc, bx, p.vp * sc, { color: C.dv, width: 2 });
        c2d.addText(`Δv₁ = ${p.dv1.toFixed(3)}`, bx + 0.12, (p.vc1 + p.vp) * sc * 0.5, { color: C.dv, size: 12 });

        c2d.addText(`Δv₁ = ${p.dv1.toFixed(3)}`, -4.5, 3.2, { color: C.dv, size: 13 });
      },
    },

    // ── Step 4: Second burn Δv₂ ──────────────────────────────────────────────
    {
      title: 'Second Burn — Δv₂ at Apoapsis',
      description: 'Half an orbit later, the spacecraft arrives at apoapsis A with speed v_a. A second tangential burn accelerates it up to the outer circular velocity v_c2, inserting it into the target orbit.',
      equation: '\\Delta v_2 = v_{c2} - v_a = \\sqrt{\\tfrac{K}{r_2}} - \\sqrt{K\\!\\left(\\tfrac{2}{r_2} - \\tfrac{1}{a_t}\\right)}',
      notes: 'If the second burn is skipped, the spacecraft remains on the transfer ellipse and falls back to periapsis.\n\nTotal mission Δv = Δv₁ + Δv₂. The Hohmann transfer minimises this sum for transfers between coplanar circular orbits when r₂/r₁ ≲ 11.9.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'inner radius  r₁', 0.8, 2.4, 0.05, state.r1, v => state.r1 = v);
        addSlider(state._controls, 'outer radius  r₂', 2.6, 5.0, 0.05, state.r2, v => state.r2 = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        const p  = getParams(state.r1, state.r2);
        const sc = 1.8;

        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        circle(c2d, state.r1, C.inner,    false, { dash: [6, 4] });
        circle(c2d, state.r2, C.outer,    false, { dash: [6, 4] });
        transferEllipse(c2d, p.pt, p.et, C.transfer, false);
        centralBody(c2d, false);

        // Burn point A at (-r2, 0) — apoapsis
        const bx = -state.r2;
        c2d.addPoint(bx, 0, { radius: 6, color: C.outer });

        // At apoapsis, counterclockwise velocity is downward (0, -1) direction
        // v_a arrow (orange, shorter)
        c2d.addArrow(bx, 0, bx, -p.va * sc,  { color: C.transfer, width: 2.5 });
        c2d.addText(`v_a = ${p.va.toFixed(3)}`, bx - 1.3, -p.va * sc * 0.6, { color: C.transfer, size: 11 });

        // v_c2 arrow (green, longer)
        c2d.addArrow(bx, 0, bx, -p.vc2 * sc, { color: C.outer, width: 2.5 });
        c2d.addText(`v_c₂ = ${p.vc2.toFixed(3)}`, bx - 1.5, -p.vc2 * sc * 0.85, { color: C.outer, size: 11 });

        // Δv₂ bracket (purple)
        c2d.addArrow(bx, -p.va * sc, bx, -p.vc2 * sc, { color: C.dv, width: 2 });
        c2d.addText(`Δv₂ = ${p.dv2.toFixed(3)}`, bx - 1.5, -(p.va + p.vc2) * sc * 0.5, { color: C.dv, size: 12 });

        c2d.addText(`Δv₁ + Δv₂ = ${(p.dv1 + p.dv2).toFixed(3)}`, -4.5, 3.2, { color: C.dv, size: 13 });
      },
    },

    // ── Step 5: Animated transfer ─────────────────────────────────────────────
    {
      title: 'Full Transfer Animation',
      description: 'The spacecraft completes a partial inner orbit, fires Δv₁ at P to enter the transfer ellipse, coasts half an orbit, then fires Δv₂ at A to circularise on the outer orbit.',
      equation: 'T_{\\text{transfer}} = \\pi\\sqrt{\\dfrac{a_t^3}{K}}, \\qquad \\Delta v_{\\text{total}} = \\Delta v_1 + \\Delta v_2',
      notes: 'Watch the trail colour: blue on the inner orbit, orange on the transfer ellipse, green on the outer orbit.\n\nThe flash at each burn point marks the impulsive manoeuvre. In reality these burns take tens of seconds to minutes, but are short enough relative to the orbital period to be modelled as instantaneous impulses.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'inner radius  r₁', 0.8, 2.4, 0.05, state.r1, v => {
          state.r1 = v; resetAnim(state);
        });
        addSlider(state._controls, 'outer radius  r₂', 2.6, 5.0, 0.05, state.r2, v => {
          state.r2 = v; resetAnim(state);
        });
        addSlider(state._controls, 'speed', 1, 10, 0.5, state.animSpeed, v => state.animSpeed = v);
        resetAnim(state);
      },
      update(c2d, state, dt) {
        const p = getParams(state.r1, state.r2);

        // Advance animation
        const pos = stepAnim(state, dt);

        // Burn flash timer
        if (state.flashTimer > 0) state.flashTimer -= dt;

        // Append to trail
        state.animTrail.push({ x: pos.x, y: pos.y, phase: pos.phase });
        if (state.animTrail.length > TRAIL_MAX) state.animTrail.shift();

        // ── Draw ────────────────────────────────────────────────────────────

        // Background orbits (faint)
        circle(c2d, state.r1, C.inner,    true, { width: 1, dash: [6, 4] });
        circle(c2d, state.r2, C.outer,    true, { width: 1, dash: [6, 4] });
        transferEllipse(c2d, p.pt, p.et, C.transfer, true);
        centralBody(c2d, true);

        // Burn points
        c2d.showPoint( state.r1, 0, { radius: 5, color: C.burn  });
        c2d.showPoint(-state.r2, 0, { radius: 5, color: C.outer });
        c2d.showText('P', state.r1 + 0.15, -0.3, { color: C.burn,  size: 11 });
        c2d.showText('A', -state.r2 + 0.15, -0.3, { color: C.outer, size: 11 });

        // Colour-coded trail by phase
        let seg = [];
        let lastPhase = state.animTrail[0]?.phase;
        for (const pt of state.animTrail) {
          if (pt.phase !== lastPhase && seg.length > 1) {
            c2d.showLine(seg, { color: TRAIL_COLORS[lastPhase], width: 2 });
            seg = [];
          }
          seg.push([pt.x, pt.y]);
          lastPhase = pt.phase;
        }
        if (seg.length > 1) c2d.showLine(seg, { color: TRAIL_COLORS[lastPhase], width: 2 });

        // Spacecraft
        c2d.showPoint(pos.x, pos.y, { radius: 6, color: C.craft });

        // Burn flash
        if (state.flashTimer > 0) {
          const alpha = state.flashTimer / 0.4;
          const fx    = state.animPhase === 2 ? -state.r2 : state.r1;
          const fy    = 0;
          c2d.showRaw((ctx, self) => {
            const sx = self.wx(fx);
            const sy = self.wy(fy);
            const rad = self.ws(0.4 * alpha);
            const g   = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
            g.addColorStop(0,   `rgba(255,160,0,${0.9 * alpha})`);
            g.addColorStop(1,   `rgba(255,100,0,0)`);
            ctx.save();
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(sx, sy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
        }

        // HUD
        const phaseLabel = ['Inner orbit', 'Transfer ellipse', 'Outer orbit'][state.animPhase];
        const phaseColor = [C.inner, C.transfer, C.outer][state.animPhase];
        c2d.showText(phaseLabel, -4.5, 3.2, { color: phaseColor, size: 13 });
        c2d.showText(`Δv₁ = ${p.dv1.toFixed(3)}   Δv₂ = ${p.dv2.toFixed(3)}   Tₜ = ${p.Tt.toFixed(2)}`, -4.5, 2.8,
          { color: '#888', size: 11 });
      },
    },
  ],
};
