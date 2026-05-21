import * as THREE from 'three';

// Coordinate mapping: physics (x,y,z) → THREE.js (x, z, y)
// Three.js y-up = physics z-up
const p2t = (x, y, z) => [x, z, y];

const L     = 2.0;   // display bar half-length (scaled: l=2)
const AX    = 1.8;   // axis arrow length
const K     = 1 / 12; // ml²/12 with m=l=1

// ── Inertia tensor (bar in physics yz-plane at angle θ from z) ──────────────
// bar unit vector: û = (0, sinθ, cosθ)
function inertia(th) {
  const s = Math.sin(th), c = Math.cos(th);
  return {
    Ixx: K,
    Iyy: K * c * c,
    Izz: K * s * s,
    Iyz: K * s * c,
    Ixy: 0, Ixz: 0
  };
}

// Angular momentum H = [I]·ω, with ω = ω·ẑ and bar at space-frame azimuth φ
// Bar starts in yz-plane at φ=0, rotates around z:
//   û_physics = (−sinθ·sinφ,  sinθ·cosφ, cosθ)
// Products Pij = K·ui·uj:
//   Pxz = −K·sinθ·cosθ·sinφ,  Pyz = K·sinθ·cosθ·cosφ
// H = [I]·ω  (ω = ω·ẑ):
//   Hx =  K·sinθ·cosθ·sinφ·ω
//   Hy = −K·sinθ·cosθ·cosφ·ω
//   Hz =  K·sin²θ·ω  (constant)
function H_vec(th, om, phi) {
  const s = Math.sin(th), c = Math.cos(th);
  return {
    Hx:  K * s * c * Math.sin(phi) * om,
    Hy: -K * s * c * Math.cos(phi) * om,
    Hz:  K * s * s * om
  };
}

// ── Shared drawing helpers ───────────────────────────────────────────────────

function drawAxes(world) {
  world.addArrow([AX, 0, 0], [0, 0, 0], 0xe53935, { length: AX });
  world.addLabel('x', [AX + 0.18, 0, 0], '#e53935');
  // physics y → THREE z
  world.addArrow([0, 0, AX], [0, 0, 0], 0x43a047, { length: AX });
  world.addLabel('y', [0, 0, AX + 0.18], '#43a047');
  // physics z → THREE y
  world.addArrow([0, AX, 0], [0, 0, 0], 0x1e88e5, { length: AX });
  world.addLabel('z', [0, AX + 0.18, 0], '#1e88e5');
}

// Bar starts in physics yz-plane at φ=0, rotates around z by φ.
// physics endpoint: (−sinθ·sinφ,  sinθ·cosφ, cosθ) × L/2
// THREE mapping (phys x→x, phys y→z, phys z→y):
//   THREE = (−sinθ·sinφ,  cosθ,  sinθ·cosφ) × L/2
// At φ=0: THREE = (0, cosθ, sinθ) — lies in THREE yz-plane ✓
function barEndpoints(th, phi = 0) {
  const s = Math.sin(th), c = Math.cos(th);
  const bx = -(L / 2) * s * Math.sin(phi);   // THREE x
  const by =  (L / 2) * c;                    // THREE y = physics z
  const bz =  (L / 2) * s * Math.cos(phi);   // THREE z = physics y
  return {
    a: new THREE.Vector3(-bx, -by, -bz),
    b: new THREE.Vector3( bx,  by,  bz)
  };
}

function showBar(world, th, phi = 0) {
  const { a, b } = barEndpoints(th, phi);
  world.showLine([a, b], 0xf5a623);
  world.showParticle(a.toArray(), 0.07, 0x999999);
  world.showParticle(b.toArray(), 0.07, 0x999999);
}

// Ring in a plane perpendicular to a given axis, showing moment of inertia magnitude
function showMomentRing(world, r, axis, color) {
  if (r < 0.005) return;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    if (axis === 'x') pts.push(new THREE.Vector3(0,           r * Math.cos(a), r * Math.sin(a)));
    if (axis === 'y') pts.push(new THREE.Vector3(r * Math.cos(a), 0,           r * Math.sin(a)));
    if (axis === 'z') pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0          ));
  }
  world.showLine(pts, color);
}

// Build the cone that H traces as φ sweeps 0→2π
function hConePoints(th, om, N = 128) {
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const phi = (i / N) * Math.PI * 2;
    const { Hx, Hy, Hz } = H_vec(th, om, phi);
    // THREE coords: (Hx, Hz, Hy)
    pts.push(new THREE.Vector3(Hx * 12, Hz * 12, Hy * 12));
  }
  return pts;
}

// ── Panel helpers ────────────────────────────────────────────────────────────

function updateTensorDisplay(state) {
  const el = document.getElementById('tensor-display');
  if (!el) return;
  const { Ixx, Iyy, Izz, Iyz } = inertia(state.theta);
  const f = v => (v >= 0 ? ' ' : '') + v.toFixed(4);
  const g = v => v.toFixed(4);

  let html = `
    <div class="td-head">Inertia tensor (m = l = 1)</div>
    <div class="td-grid">
      <span style="color:#e53935">${g(Ixx)}</span>
      <span class="td-zero">0</span>
      <span class="td-zero">0</span>
      <span class="td-zero">0</span>
      <span style="color:#43a047">${g(Iyy)}</span>
      <span style="color:#9e9e9e">${f(-Iyz)}</span>
      <span class="td-zero">0</span>
      <span style="color:#9e9e9e">${f(-Iyz)}</span>
      <span style="color:#1e88e5">${g(Izz)}</span>
    </div>`;

  const om = state.omega;
  if (om !== undefined) {
    const { Hx, Hy, Hz } = H_vec(state.theta, om, state.phi || 0);
    const scale = 12; // same as cone scale
    html += `
      <div class="td-head" style="margin-top:12px;border-top:1px solid #e8e8e8;padding-top:10px;">
        Angular momentum  H = [I]·ω  (×12)
      </div>
      <div style="line-height:2; font-size:12px;">
        <div>Hₓ = <span style="color:#d32f2f">${(Hx*scale).toFixed(4)}</span></div>
        <div>H<sub>y</sub> = <span style="color:#d32f2f">${(Hy*scale).toFixed(4)}</span></div>
        <div>H<sub>z</sub> = <span style="color:#1e88e5">${(Hz*scale).toFixed(4)}</span></div>
      </div>`;
  }

  el.innerHTML = html;
}

// ── Lesson definition ────────────────────────────────────────────────────────

export default {
  title:   'Slender Bar – Inertia & Angular Momentum',
  subject: 'Gyrodynamics',

  camera:   { position: [4, 3, 5], fov: 50 },
  controls: { target: [0, 0.3, 0] },

  initState: () => ({ theta: Math.PI / 4, omega: 4, phi: 0 }),

  init(world, state, panelEl) {
    // Inject slider controls + live tensor display above #nav
    const nav = panelEl.querySelector('#nav');
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <style>
        .ctrl-label { font-size:13px; color:#555; display:flex; justify-content:space-between; margin-bottom:5px; }
        input[type=range] { width:100%; accent-color:#1e88e5; }
        #omega-ctrl { display:none; }
        #tensor-display { margin-top:12px; font-family:monospace; font-size:12px;
          background:#f5f5f5; border:1px solid #e0e0e0; border-radius:8px; padding:12px; }
        .td-head { font-size:10px; text-transform:uppercase; letter-spacing:1px;
          color:#aaa; margin-bottom:6px; }
        .td-grid { display:grid; grid-template-columns:repeat(3,1fr);
          gap:3px 6px; text-align:right; }
        .td-zero { color:#ccc; }
      </style>

      <div style="border-top:1px solid #eee; padding-top:14px; display:flex; flex-direction:column; gap:10px;">
        <div>
          <div class="ctrl-label">
            <span>Angle θ from z-axis</span>
            <strong id="theta-val">45°</strong>
          </div>
          <input type="range" id="theta-slider" min="1" max="89" value="45" step="1">
        </div>
        <div id="omega-ctrl">
          <div class="ctrl-label">
            <span>Angular velocity ω</span>
            <strong id="omega-val">4</strong>
          </div>
          <input type="range" id="omega-slider" min="1" max="10" value="4" step="0.5"
            style="accent-color:#7b1fa2;">
        </div>
        <div id="tensor-display"></div>
      </div>`;
    panelEl.insertBefore(wrap, nav);

    document.getElementById('theta-slider').addEventListener('input', e => {
      state.theta = (+e.target.value) * Math.PI / 180;
      document.getElementById('theta-val').textContent = e.target.value + '°';
      updateTensorDisplay(state);
    });
    document.getElementById('omega-slider').addEventListener('input', e => {
      state.omega = +e.target.value;
      document.getElementById('omega-val').textContent = e.target.value;
    });

    updateTensorDisplay(state);
  },

  steps: [
    // ── Step 1: Geometry ──────────────────────────────────────────────────────
    {
      title: 'Bar Orientation',
      description:
        'A uniform slender bar (length l, mass m) is centred at the origin and lies in the yz-plane ' +
        'at angle θ from the z-axis. Use the slider to change θ.\n\n' +
        'θ = 0°  → bar along z (spin axis)\n' +
        'θ = 90° → bar along y (perpendicular)',
      equation: '\\hat{u} = \\sin\\theta\\,\\hat{y} + \\cos\\theta\\,\\hat{z}',
      notes: 'Axes: x (red)  y (green)  z (blue)',

      setup(world, state) {
        drawAxes(world);
        document.getElementById('omega-ctrl').style.display = 'none';
      },

      update(world, state) {
        const th = state.theta;
        showBar(world, th, 0);

        // Angle arc in THREE yz-plane (physics xz-equivalent)
        const R = 0.55;
        const arcPts = [];
        for (let i = 0; i <= 32; i++) {
          const a = (i / 32) * th;
          // Arc sweeps from THREE y-axis toward THREE z-axis (physics z→y)
          arcPts.push(new THREE.Vector3(0, R * Math.cos(a), R * Math.sin(a)));
        }
        if (arcPts.length > 1) world.showLine(arcPts, 0xffa726);
        const mid = th / 2;
        world.showLabel('θ', [0.08, R * Math.cos(mid) + 0.12, R * Math.sin(mid) + 0.08], '#f5a623');

        // Dashed projection of bar onto xy-plane (z=0, i.e. THREE y=0)
        const { b } = barEndpoints(th, 0);
        world.showDashedLine([b, new THREE.Vector3(b.x, 0, b.z)], 0xcccccc);
        world.showDashedLine([new THREE.Vector3(b.x, 0, b.z), new THREE.Vector3(0, 0, b.z)], 0xcccccc);

        updateTensorDisplay(state);
      }
    },

    // ── Step 2: Inertia tensor ────────────────────────────────────────────────
    {
      title: 'Inertia Tensor (Prob. 1)',
      description:
        'All mass lies along û, so the moment of inertia about û itself is zero. ' +
        'About any perpendicular axis it is ml²/12. The tensor follows from:\n\n' +
        '      I_ij = (ml²/12)(δ_ij − uᵢuⱼ)\n\n' +
        'The coloured rings show moment of inertia about each coordinate axis — ' +
        'ring radius ∝ I. Drag θ and watch the rings resize.',
      equation:
        '[I]=\\frac{ml^2}{12}\\!\\begin{bmatrix}1&0&0\\\\0&\\cos^2\\!\\theta&' +
        '{-}\\sin\\theta\\cos\\theta\\\\0&{-}\\sin\\theta\\cos\\theta&\\sin^2\\!\\theta\\end{bmatrix}',
      notes:
        'Ixx = ml²/12  (constant — bar has no x component)\n' +
        'Iyy + Izz = ml²/12  (always, by constraint)\n' +
        'Products Ixy = Ixz = 0;  Iyz ≠ 0 in general',

      setup(world, state) {
        drawAxes(world);
        document.getElementById('omega-ctrl').style.display = 'none';
      },

      update(world, state) {
        const th = state.theta;
        showBar(world, th, 0);

        const { Ixx, Iyy, Izz } = inertia(th);
        const SC = 4.5; // scale rings for visibility
        // Ring about x-axis: in THREE yz-plane (axis = THREE x)
        showMomentRing(world, Ixx * SC, 'x', 0xe53935);
        // Ring about y-axis (physics y = THREE z): in THREE xz-plane (axis = THREE z... wait)
        // "ring about physics y-axis" means it lies in physics xz-plane = THREE xz-plane (axis = THREE z? no)
        // Actually ring about an axis: circle perpendicular to that axis
        // physics y-axis = THREE z-axis  → ring in THREE xy-plane (z=0)
        showMomentRing(world, Iyy * SC, 'z', 0x43a047);
        // Ring about physics z-axis = THREE y-axis → ring in THREE xz-plane (y=0)
        showMomentRing(world, Izz * SC, 'y', 0x1e88e5);

        // Ring labels
        const r = x => x * SC + 0.06;
        // Labels placed on each ring: Ixx in yz-plane, Iyy in xy-plane, Izz in xz-plane
        if (Ixx * SC > 0.05) world.showLabel(`Ixx=${Ixx.toFixed(3)}`, [0,           r(Ixx)*0.7, r(Ixx)*0.7], '#e53935', true);
        if (Iyy * SC > 0.05) world.showLabel(`Iyy=${Iyy.toFixed(3)}`, [r(Iyy)*0.7, r(Iyy)*0.7, 0          ], '#43a047', true);
        if (Izz * SC > 0.05) world.showLabel(`Izz=${Izz.toFixed(3)}`, [r(Izz)*0.7, 0,           r(Izz)*0.7], '#1e88e5', true);

        updateTensorDisplay(state);
      }
    },

    // ── Step 3: Angular momentum ──────────────────────────────────────────────
    {
      title: 'Angular Momentum (Prob. 2)',
      description:
        'The bar spins about z with angular velocity ω = ωẑ. ' +
        'Because Iyz ≠ 0, the angular momentum H = [I]·ω is NOT aligned with ω.\n\n' +
        'As the bar rotates, H sweeps out a cone around z. ' +
        'The mismatch (H ∦ ω) is the source of the gyroscopic reaction torque that must ' +
        'be applied to maintain steady spin.',
      equation:
        '\\mathbf{H}=\\begin{pmatrix}H_x\\\\H_y\\\\H_z\\end{pmatrix}=' +
        '\\frac{ml^2\\omega}{12}\\begin{pmatrix}\\sin\\theta\\cos\\theta\\sin\\varphi\\\\' +
        '{-}\\sin\\theta\\cos\\theta\\cos\\varphi\\\\\\sin^2\\!\\theta\\end{pmatrix}',
      notes:
        'H ∥ ω only at θ = 0° (bar along z) or θ = 90° (bar ⊥ z).\n' +
        '|H| is constant; only direction precesses.\n' +
        'Hz = ml²ω sin²θ / 12  is constant (no z-torque needed).',

      setup(world, state) {
        drawAxes(world);
        state.phi = 0;
        document.getElementById('omega-ctrl').style.display = '';
      },

      update(world, state, dt) {
        state.phi = (state.phi || 0) + dt * state.omega * 0.5;
        const { phi, theta: th, omega: om } = state;

        // Spinning bar
        showBar(world, th, phi);

        // ω arrow (physics z = THREE y)
        const omDisplay = Math.min(om * 0.15, 1.0);
        world.showArrow([0, omDisplay, 0], [0, 0, 0], 0x7b1fa2);
        world.showLabel('ω', [0.12, omDisplay + 0.18, 0], '#7b1fa2');

        // H vector — THREE coords: physics(Hx, Hy, Hz) → THREE(Hx, Hz, Hy)
        const { Hx, Hy, Hz } = H_vec(th, om, phi);
        const SC = 12;
        const hx3 = Hx * SC, hy3 = Hz * SC, hz3 = Hy * SC;
        const hLen = Math.sqrt(hx3 * hx3 + hy3 * hy3 + hz3 * hz3);

        if (hLen > 0.02) {
          world.showArrow([hx3, hy3, hz3], [0, 0, 0], 0xd32f2f);
          world.showLabel('H', [hx3 + 0.12, hy3 + 0.12, hz3 + 0.12], '#d32f2f');
        }

        // Cone traced by H
        world.showLine(hConePoints(th, om), 0xffcdd2);

        // Dashed line from tip of H down to z-axis (shows Hz component)
        world.showDashedLine(
          [new THREE.Vector3(hx3, hy3, hz3), new THREE.Vector3(0, hy3, 0)],
          0xbbbbbb
        );

        updateTensorDisplay(state);
      }
    }
  ]
};
