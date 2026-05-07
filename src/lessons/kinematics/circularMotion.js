import * as THREE from 'three';

const R           = 2.2;
const OMEGA_CONST = 1.1;
const ALPHA_AMP   = 0.5;
const ALPHA_FREQ  = 0.7;

function update(world, state, dt) {
  const { cfg } = state;
  state.simTime += dt;

  const alpha  = cfg.uniform ? 0 : ALPHA_AMP * ALPHA_FREQ * Math.cos(state.simTime * ALPHA_FREQ);
  state.omega  = cfg.uniform ? OMEGA_CONST : OMEGA_CONST + ALPHA_AMP * Math.sin(state.simTime * ALPHA_FREQ);
  state.theta += state.omega * dt;
  if (state.theta > 2 * Math.PI) state.theta -= 2 * Math.PI;

  const cosT = Math.cos(state.theta), sinT = Math.sin(state.theta);
  const er   = new THREE.Vector3(cosT, sinT, 0);
  const eth  = new THREE.Vector3(-sinT, cosT, 0);
  const pos  = er.clone().multiplyScalar(R);
  const speed = Math.abs(state.omega) * R;
  const an    = state.omega * state.omega * R;
  const at    = Math.abs(alpha) * R;

  // Point P
  world.showParticle([pos.x, pos.y, 0], 0.11, 0x1a237e);
  world.showLabel('P', [pos.x + 0.15, pos.y + 0.18, 0], '#1a237e');

  if (cfg.showR) {
    world.showArrow([pos.x, pos.y, 0], [0, 0, 0], 0x888888);
    world.showLabel('r', [pos.x * 0.48 + 0.12, pos.y * 0.48 + 0.12, 0], '#666666', true);
  }

  if (cfg.showAngle) {
    world.showArc(0, state.theta, 0.55, 0xaaaaaa);
    const midA = state.theta * 0.5;
    world.showLabel('θ', [Math.cos(midA) * 0.75, Math.sin(midA) * 0.75, 0], '#888888', true);
  }

  if (cfg.showOmega) {
    world.showArc(state.theta - 0.6, state.theta, R + 0.35, 0xe65100);
    world.showLabel('ω', [pos.x * 1.22, pos.y * 1.22, 0], '#e65100', true);
  }

  if (cfg.showV) {
    const VS = 0.65;
    const vx = eth.x * speed * VS, vy = eth.y * speed * VS;
    world.showArrow([vx, vy, 0], [pos.x, pos.y, 0], 0x2e7d32);
    world.showLabel('v', [pos.x + vx + 0.14, pos.y + vy + 0.1, 0], '#2e7d32');
  }

  if (cfg.showAN) {
    const AS = 0.55;
    const anx = -er.x * an * AS, any = -er.y * an * AS;
    world.showArrow([anx, any, 0], [pos.x, pos.y, 0], 0xc62828);
    world.showLabel('aₙ', [pos.x + anx - 0.05, pos.y + any - 0.28, 0], '#c62828');
  }

  if (cfg.showDeltaV) {
    const LOOK = 0.55, VS = 0.6;
    const th2  = state.theta + LOOK;
    const eth2 = new THREE.Vector3(-Math.sin(th2), Math.cos(th2), 0);
    const v1   = eth.clone().multiplyScalar(speed * VS);
    const v2   = eth2.clone().multiplyScalar(speed * VS);
    world.showArrow([v1.x, v1.y, 0], [pos.x, pos.y, 0], 0x43a047);
    world.showLabel('v₁', [pos.x + v1.x + 0.12, pos.y + v1.y + 0.1, 0], '#43a047', true);
    world.showArrow([v2.x, v2.y, 0], [pos.x, pos.y, 0], 0xa5d6a7);
    world.showLabel('v₂', [pos.x + v2.x + 0.12, pos.y + v2.y + 0.1, 0], '#388e3c', true);
    const dv = v2.clone().sub(v1);
    world.showArrow([dv.x, dv.y, 0], [pos.x + v1.x, pos.y + v1.y, 0], 0xc62828, { length: dv.length() });
    world.showLabel('Δv', [pos.x + v1.x + dv.x * 0.5 - 0.3, pos.y + v1.y + dv.y * 0.5, 0], '#c62828', true);
    world.showLine([[pos.x + v1.x, pos.y + v1.y, 0], [pos.x + v2.x, pos.y + v2.y, 0]], 0xdddddd);
  }

  if (cfg.showAT && Math.abs(at) > 0.05) {
    const AS   = 0.55;
    const sign = alpha >= 0 ? 1 : -1;
    const atx  = eth.x * sign * at * AS, aty = eth.y * sign * at * AS;
    world.showArrow([atx, aty, 0], [pos.x, pos.y, 0], 0x7b1fa2);
    world.showLabel('aₜ', [pos.x + atx + 0.14, pos.y + aty + 0.1, 0], '#7b1fa2');
  }

  if (cfg.showAN && cfg.showAT && Math.abs(at) > 0.05) {
    const AS   = 0.55;
    const sign = alpha >= 0 ? 1 : -1;
    const anx  = -er.x * an * AS, any = -er.y * an * AS;
    const atx  = eth.x * sign * at * AS, aty = eth.y * sign * at * AS;
    const ax = anx + atx, ay = any + aty;
    world.showLine([[pos.x + anx, pos.y + any, 0], [pos.x + ax, pos.y + ay, 0]], 0xccaacc);
    world.showLine([[pos.x + atx, pos.y + aty, 0], [pos.x + ax, pos.y + ay, 0]], 0xaaccaa);
    world.showArrow([ax, ay, 0], [pos.x, pos.y, 0], 0xe65100);
    world.showLabel('a', [pos.x + ax + 0.14, pos.y + ay + 0.1, 0], '#e65100');
  }
}

export default {
  title:   "Circular Motion",
  subject: "Kinematics",
  camera:  { position: [0, 8, 3], lookAt: [0, 0, 0] },

  initState: () => ({
    theta: 0.4, simTime: 0, omega: OMEGA_CONST,
    cfg: { showR: true, showAngle: true, showOmega: true, showV: false, showAN: false, showDeltaV: false, showAT: false, uniform: true }
  }),

  init(world) {
    world.scene.add(new THREE.GridHelper(8, 8, 0xcccccc, 0xe8e8e8));
    // Centre dot — fixed for the whole lesson
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    world.scene.add(dot);
    // Orbit ring — fixed for the whole lesson
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), 0));
    }
    const geo  = new THREE.BufferGeometry().setFromPoints(pts);
    const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xbbbbbb }));
    world.scene.add(ring);
  },

  steps: [
    {
      title: "Position and Angular Velocity",
      description: "Point P moves around a circle of radius r. Its position is fully described by the angle θ — measured from the x-axis. The rate at which θ grows is the angular velocity ω. If ω is constant, the motion is uniform.",
      equation: "P = (r\\cos\\theta,\\; r\\sin\\theta) \\qquad \\omega = \\dot{\\theta} = \\frac{d\\theta}{dt}",
      notes: "r = 2.2 m (fixed radius)\nω ≈ 1.1 rad/s (constant here)\n\nω is measured in radians per second.\n1 full revolution = 2π radians.\n\nPeriod: T = 2π/ω ≈ 5.7 s",
      setup(world, state) {
        state.cfg = { showR: true, showAngle: true, showOmega: true, showV: false, showAN: false, showDeltaV: false, showAT: false, uniform: true };
      },
      update
    },
    {
      title: "Velocity: v = rω",
      description: "The velocity of P is always tangent to the circle — perpendicular to the radius r. Its magnitude is v = rω. The direction is along êθ = (−sinθ, cosθ), the unit vector 90° ahead of êr.",
      equation: "\\vec{v} = r\\dot{\\theta}\\,\\hat{e}_\\theta = r\\omega\\,\\hat{e}_\\theta \\qquad |v| = r\\omega",
      notes: "v = 2.2 × 1.1 ≈ 2.4 m/s\n\nv is always perpendicular to r — so the dot product r · v = 0 always.\n\nThis is exactly the transverse component rθ̇êθ from the plane-motion visualization — with no radial component since r is fixed (ṙ = 0).",
      setup(world, state) {
        state.cfg = { showR: true, showAngle: false, showOmega: false, showV: true, showAN: false, showDeltaV: false, showAT: false, uniform: true };
      },
      update
    },
    {
      title: "Centripetal Acceleration: aₙ = rω²",
      description: "Even at constant speed, P accelerates — because the direction of v is always changing. The green vectors v₁ and v₂ show the velocity at two moments. Their difference Δv points toward the centre. So the acceleration points inward.",
      equation: "\\vec{a}_n = -r\\omega^2\\,\\hat{e}_r = -\\frac{v^2}{r}\\,\\hat{e}_r \\qquad |a_n| = r\\omega^2 = \\frac{v^2}{r}",
      notes: "aₙ = 2.2 × 1.1² ≈ 2.7 m/s²\n\nThe red arrow is aₙ — it always points toward the centre O, opposite to r.\n\nThis is NOT caused by speeding up or slowing down — it exists purely because the direction of v keeps rotating. This is why circular motion requires a centripetal force (gravity, tension, etc.).",
      setup(world, state) {
        state.cfg = { showR: true, showAngle: false, showOmega: false, showV: false, showAN: true, showDeltaV: true, showAT: false, uniform: true };
      },
      update
    },
    {
      title: "Tangential Acceleration: aₜ = rα",
      description: "When ω is not constant, there is also a tangential acceleration along the direction of motion. α = dω/dt is the angular acceleration. aₜ acts along êθ — the same direction as v — speeding up or slowing down the motion.",
      equation: "\\vec{a}_t = r\\alpha\\,\\hat{e}_\\theta \\qquad \\alpha = \\dot{\\omega} = \\ddot{\\theta}",
      notes: "The purple arrow is aₜ — it flips direction when α changes sign (P alternately speeds up and slows down).\n\nKey contrast:\n  aₙ (red) = always toward centre, exists even at constant speed\n  aₜ (purple) = along tangent, zero when speed is constant\n\nWatch aₜ shrink to zero when ω momentarily stops changing.",
      setup(world, state) {
        state.cfg = { showR: false, showAngle: false, showOmega: false, showV: true, showAN: true, showDeltaV: false, showAT: true, uniform: false };
      },
      update
    },
    {
      title: "Total Acceleration",
      description: "The two components aₙ and aₜ are always perpendicular to each other — aₙ points inward, aₜ points along the tangent. The total acceleration is their vector sum, shown as the orange arrow.",
      equation: "|\\vec{a}| = \\sqrt{a_n^2 + a_t^2} = \\sqrt{(r\\omega^2)^2 + (r\\alpha)^2} = r\\sqrt{\\omega^4 + \\alpha^2}",
      notes: "The dashed lines form a rectangle — aₙ and aₜ are its sides, total a is its diagonal.\n\nFor uniform circular motion (α = 0): a = aₙ only, always pointing inward.\nFor non-uniform (α ≠ 0): the total a tilts away from the centre.\n\nThe angle of a relative to the inward direction: tan⁻¹(aₜ/aₙ) = tan⁻¹(α/ω²)",
      setup(world, state) {
        state.cfg = { showR: false, showAngle: false, showOmega: false, showV: true, showAN: true, showDeltaV: false, showAT: true, uniform: false };
      },
      update
    }
  ]
};
