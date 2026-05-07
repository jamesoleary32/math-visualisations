import * as THREE from 'three';

const R0     = 1.6;
const R_AMP  = 0.6;
const TH_DOT = 0.9;

function simState(t) {
  const r     = R0 + R_AMP * Math.cos(t);
  const rdot  = -R_AMP * Math.sin(t);
  const theta = TH_DOT * t;
  const cosT  = Math.cos(theta), sinT = Math.sin(theta);
  const er    = [cosT, sinT, 0];
  const eth   = [-sinT, cosT, 0];
  const px = r * cosT, py = r * sinT;
  const vr_mag  = rdot;
  const vth_mag = r * TH_DOT;
  return { r, rdot, theta, er, eth, px, py, vr_mag, vth_mag };
}

function buildPath() {
  const PATH_T = (2 * Math.PI / TH_DOT) * 2;
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const s = simState((i / 300) * PATH_T);
    pts.push(new THREE.Vector3(s.px, s.py, 0));
  }
  return pts;
}

function update(world, state, dt) {
  state.t += dt * 0.55;
  const s = simState(state.t);
  const { cfg } = state;
  const FRAME_LEN = 0.9;

  world.showParticle([s.px, s.py, 0], 0.13, 0x1a237e);
  world.showLabel('P', [s.px + 0.15, s.py + 0.2, 0], '#1a237e');

  if (cfg.r_vec) {
    world.showLine([[0, 0, 0], [s.px, s.py, 0]], 0x999999);
    world.showLabel('r', [s.px * 0.45 + 0.15, s.py * 0.45 + 0.15, 0], '#555', true);
  }

  if (cfg.er) {
    const tip = [s.px + s.er[0] * FRAME_LEN, s.py + s.er[1] * FRAME_LEN, 0];
    world.showArrow(s.er, [s.px, s.py, 0], 0x1565c0, { length: FRAME_LEN });
    world.showLabel('êᵣ', [tip[0] + 0.1, tip[1] + 0.1, 0], '#1565c0', true);
  }

  if (cfg.eth) {
    const tip = [s.px + s.eth[0] * FRAME_LEN, s.py + s.eth[1] * FRAME_LEN, 0];
    world.showArrow(s.eth, [s.px, s.py, 0], 0x2e7d32, { length: FRAME_LEN });
    world.showLabel('êθ', [tip[0] + 0.1, tip[1] + 0.1, 0], '#2e7d32', true);
  }

  if (cfg.vr && Math.abs(s.vr_mag) > 0.05) {
    const vr  = s.er.map(c => c * s.vr_mag);
    const tip = [s.px + vr[0], s.py + vr[1], 0];
    world.showArrow(vr, [s.px, s.py, 0], 0x1565c0);
    world.showLabel('ṙêᵣ', [tip[0] + 0.1, tip[1] + 0.1, 0], '#1565c0', true);
  }

  if (cfg.vth) {
    const vth = s.eth.map(c => c * s.vth_mag);
    const tip = [s.px + vth[0], s.py + vth[1], 0];
    world.showArrow(vth, [s.px, s.py, 0], 0x2e7d32);
    world.showLabel('rθ̇êθ', [tip[0] + 0.1, tip[1] + 0.1, 0], '#2e7d32', true);
  }

  if (cfg.v_total) {
    const vr   = s.er.map(c  => c * s.vr_mag);
    const vth  = s.eth.map(c => c * s.vth_mag);
    const vtot = [vr[0] + vth[0], vr[1] + vth[1], 0];
    const tip  = [s.px + vtot[0], s.py + vtot[1], 0];
    world.showArrow(vtot, [s.px, s.py, 0], 0xe65100);
    world.showLabel('v', [tip[0] + 0.1, tip[1] + 0.15, 0], '#e65100');
    const vr_end  = [s.px + vr[0],  s.py + vr[1],  0];
    const vth_end = [s.px + vth[0], s.py + vth[1], 0];
    world.showLine([[s.px, s.py, 0], vr_end],  0xaaaaee);
    world.showLine([[s.px, s.py, 0], vth_end], 0xaaeebb);
    world.showLine([vr_end,  [s.px + vtot[0], s.py + vtot[1], 0]], 0xaaeebb);
    world.showLine([vth_end, [s.px + vtot[0], s.py + vtot[1], 0]], 0xaaaaee);
  }
}

export default {
  title:   "Plane Motion",
  subject: "Kinematics",
  camera:  { position: [0, 7, 4], lookAt: [0, 0, 0] },

  initState: () => ({
    t: 0.4,
    cfg: { er: false, eth: false, r_vec: true, vr: false, vth: false, v_total: false }
  }),

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(8, 8, 0xcccccc, 0xe8e8e8));

    // Pre-computed path — fixed for the whole lesson
    const geo  = new THREE.BufferGeometry().setFromPoints(buildPath());
    const path = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xdddddd }));
    world.scene.add(path);

    // Origin dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    world.scene.add(dot);
  },

  steps: [
    {
      title: "A Moving Point in a Plane",
      description: "Point P moves along a curved path. Unlike circular motion, it both rotates around O and changes its distance from O. Cartesian (x, y) coordinates can describe it — but polar coordinates (r, θ) are often more natural.",
      equation: "\\text{position} = (r,\\,\\theta) \\quad\\text{instead of}\\quad (x,\\,y)",
      notes: "r = distance from O to P\nθ = angle from the x-axis\n\nNotice r is not constant — P drifts inward and outward as it sweeps around.\n\nDrag to orbit. The motion is in the xy-plane.",
      setup(world, state) {
        state.cfg = { er: false, eth: false, r_vec: true, vr: false, vth: false, v_total: false };
      },
      update
    },
    {
      title: "The Rotating Frame: êᵣ and êθ",
      description: "In polar coordinates we attach two unit vectors directly to P. êᵣ always points radially outward from O. êθ always points 90° counterclockwise from êᵣ — in the direction of increasing θ. Unlike î and ĵ, these vectors rotate as P moves.",
      equation: "\\hat{e}_r = (\\cos\\theta,\\sin\\theta) \\qquad \\hat{e}_\\theta = (-\\sin\\theta,\\cos\\theta)",
      notes: "Watch êᵣ (blue) and êθ (green) rotate as P orbits.\n\nKey difference from Cartesian: î and ĵ are fixed in space. êᵣ and êθ are fixed to the point — they change direction continuously.\n\nThis is what makes the velocity expression richer.",
      setup(world, state) {
        state.cfg = { er: true, eth: true, r_vec: true, vr: false, vth: false, v_total: false };
      },
      update
    },
    {
      title: "Radial Velocity: ṙ êᵣ",
      description: "The radial component of velocity describes how fast P is moving toward or away from O. ṙ (r-dot) is the rate of change of r. When positive, P is moving outward along êᵣ. When negative, P is moving inward.",
      equation: "\\vec{v}_{\\text{radial}} = \\dot{r}\\,\\hat{e}_r",
      notes: "Watch the blue arrow — it flips direction as P moves inward vs outward.\n\nFor circular motion, r = constant so ṙ = 0 and this component vanishes entirely.\n\nThis is the component the dot product saw: v · êᵣ = ṙ.",
      setup(world, state) {
        state.cfg = { er: true, eth: false, r_vec: true, vr: true, vth: false, v_total: false };
      },
      update
    },
    {
      title: "Transverse Velocity: rθ̇ êθ",
      description: "The transverse component describes how fast P sweeps around O. θ̇ (theta-dot) is the angular velocity from before. The r factor matters: a point further from O covers more arc length for the same angular speed.",
      equation: "\\vec{v}_{\\text{transverse}} = r\\dot{\\theta}\\,\\hat{e}_\\theta",
      notes: "This is exactly v = ω × r from the previous visualization — expressed in the rotating frame.\n\nWatch how the green arrow grows longer when P is far from O (large r) and shorter when P is close (small r).\n\nFor circular motion, this is the only component: v = rω.",
      setup(world, state) {
        state.cfg = { er: false, eth: true, r_vec: true, vr: false, vth: true, v_total: false };
      },
      update
    },
    {
      title: "Total Velocity: Both Components",
      description: "The full velocity is the vector sum of the two components. The orange arrow is the actual velocity of P. The parallelogram shows how the blue (radial) and green (transverse) components add up to give it.",
      equation: "\\vec{v} = \\dot{r}\\,\\hat{e}_r + r\\dot{\\theta}\\,\\hat{e}_\\theta",
      notes: "This is the polar form of velocity — the fundamental result of plane kinematics.\n\nThe radial component ṙêᵣ comes from changing distance.\nThe transverse component rθ̇êθ comes from rotating around O.\n\nBoth come from differentiating r = r·êᵣ once, accounting for the fact that êᵣ itself is rotating.",
      setup(world, state) {
        state.cfg = { er: true, eth: true, r_vec: true, vr: true, vth: true, v_total: true };
      },
      update
    }
  ]
};
