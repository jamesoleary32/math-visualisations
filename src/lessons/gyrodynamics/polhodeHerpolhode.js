import * as THREE from 'three';

function omegaBody(t) {
  return new THREE.Vector3(
    1.15 * Math.cos(t),
    0.72 * Math.sin(t),
    0.9 + 0.18 * Math.sin(2 * t)
  );
}

function omegaSpace(t) {
  const ob = omegaBody(t);
  const q  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.45 * t);
  return ob.clone().applyQuaternion(q);
}

function polhodeCurve() {
  const pts = [];
  for (let i = 0; i <= 360; i++) {
    pts.push(omegaBody((i / 360) * Math.PI * 2).multiplyScalar(1.35));
  }
  return pts;
}

function herpolhodeCurve() {
  const pts = [];
  for (let i = 0; i <= 520; i++) {
    const u = i / 65;
    const w = omegaSpace(u).multiplyScalar(1.2);
    pts.push(new THREE.Vector3(w.x, w.y, -1.15));
  }
  return pts;
}

function update(world, state, dt) {
  state.t += dt * 0.75;
  const { cfg } = state;

  // ── Planar IC demo (step 1) ──────────────────────────────────────────────
  if (cfg.instantaneousCentre) {
    const cx = -1.4, cy = 0;
    const angle = state.t;
    const p1 = new THREE.Vector3(cx + 1.3 * Math.cos(angle), cy + 1.3 * Math.sin(angle), 0);
    const p2 = new THREE.Vector3(cx + 0.8 * Math.cos(angle + 1.6), cy + 0.8 * Math.sin(angle + 1.6), 0);

    world.showLine([...Array(161)].map((_, i) => {
      const a = (i/160)*Math.PI*2;
      return new THREE.Vector3(cx + 1.3*Math.cos(a), cy + 1.3*Math.sin(a), 0);
    }), 0xbbbbbb);

    world.showParticle([cx, cy, 0], 0.12, 0xc62828);
    world.showLabel('IC', [cx + 0.18, cy + 0.18, 0], '#c62828');
    world.showParticle([p1.x, p1.y, 0], 0.1, 0x1565c0);
    world.showParticle([p2.x, p2.y, 0], 0.1, 0x1565c0);

    world.showDashedLine([new THREE.Vector3(cx, cy, 0), p1], 0x999999);
    world.showDashedLine([new THREE.Vector3(cx, cy, 0), p2], 0x999999);

    const v1 = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).multiplyScalar(0.9);
    const v2 = new THREE.Vector3(-Math.sin(angle+1.6), Math.cos(angle+1.6), 0).multiplyScalar(0.65);
    world.showArrow([v1.x, v1.y, 0], [p1.x, p1.y, 0], 0x2e7d32);
    world.showArrow([v2.x, v2.y, 0], [p2.x, p2.y, 0], 0x2e7d32);
    world.showLabel('v', [p1.x+v1.x+0.12, p1.y+v1.y+0.12, 0], '#2e7d32');
    return;
  }

  // ── 3D instantaneous axis / polhode / herpolhode ─────────────────────────
  const wb = omegaBody(state.t).multiplyScalar(1.35);
  const ws = omegaSpace(state.t).multiplyScalar(1.2);

  if (cfg.instantaneousAxis || cfg.polhode || cfg.herpolhode) {
    world.showArrow([wb.x, wb.y, wb.z], [0, 0, 0], 0xe65100);
    world.showLabel('ω', [wb.x+0.18, wb.y+0.18, wb.z+0.18], '#e65100');
    world.showParticle([wb.x, wb.y, wb.z], 0.1, 0xe65100);
    world.showDashedLine([
      new THREE.Vector3(-wb.x*1.3, -wb.y*1.3, -wb.z*1.3),
      new THREE.Vector3( wb.x*1.3,  wb.y*1.3,  wb.z*1.3)
    ], 0xe65100);
    world.showLabel('instantaneous axis', [wb.x*0.55, wb.y*0.55, wb.z*0.55+0.35], '#e65100');
  }

  if (cfg.polhode) world.showParticle([wb.x, wb.y, wb.z], 0.13, 0x1565c0);

  if (cfg.herpolhode) {
    const hp = new THREE.Vector3(ws.x, ws.y, -1.15);
    world.showParticle([hp.x, hp.y, hp.z], 0.11, 0x6a1b9a);
    world.showDashedLine([new THREE.Vector3(ws.x, ws.y, ws.z), hp], 0xaaaaaa);
    world.showArrow([ws.x, ws.y, ws.z], [0, 0, 0], 0x6a1b9a);
    world.showLabel('space ω', [ws.x+0.12, ws.y+0.12, ws.z+0.12], '#6a1b9a');
  }

  if (cfg.contactPoint) {
    const hp = new THREE.Vector3(ws.x, ws.y, -1.15);
    world.showParticle([hp.x, hp.y, hp.z], 0.14, 0xc62828);
    world.showLabel('contact point', [hp.x+0.18, hp.y+0.18, hp.z], '#c62828');
  }
}

// Static geometry added when a step is set up (polhodes, ellipsoid, plane, etc.)
function addStatics(world, cfg) {
  if (cfg.ellipsoid) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xe3f2fd, transparent: true, opacity: 0.28, wireframe: true })
    );
    mesh.scale.set(2.2, 1.45, 1.05);
    world.add(mesh);
    world.addLabel('inertia ellipsoid', [1.7, -1.25, 1.05], '#1565c0');
  }

  if (cfg.polhode) {
    world.addLine(polhodeCurve(), 0x1565c0);
    world.addLabel('polhode', [1.75, 0.25, 1.2], '#1565c0');
  }

  if (cfg.invariablePlane || cfg.herpolhode || cfg.contactPoint) {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({ color: 0xf3e5f5, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
    );
    p.position.z = -1.15;
    world.add(p);
    world.addLabel('invariable plane', [-2.35, -2.1, -1.1], '#6a1b9a');
  }

  if (cfg.herpolhode) {
    world.addLine(herpolhodeCurve(), 0x6a1b9a);
    world.addLabel('herpolhode', [1.6, -1.4, -1.1], '#6a1b9a');
  }

  if (cfg.instantaneousAxis || cfg.polhode || cfg.herpolhode) {
    world.addArrow([0, 0, 2.2], [0, 0, -1.2], 0x555555);
    world.addLabel('fixed L', [0.2, 0.2, 1.25], '#555555');
  }
}

export default {
  title:   "Polhode & Herpolhode",
  subject: "Gyrodynamics",
  camera:  { position: [5, 5, 7], lookAt: [0, 0, 0] },

  initState: () => ({
    t: 0,
    cfg: { instantaneousCentre: false, instantaneousAxis: false, polhode: false, herpolhode: false, ellipsoid: false, invariablePlane: false, contactPoint: false }
  }),

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(8, 8, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "Instantaneous Centre in Plane Motion",
      description: "In planar rigid-body motion, at any instant the body can be treated as rotating about one special point: the instantaneous centre. That point has zero velocity at that instant.",
      equation: "\\vec{v}_P = \\vec{\\omega} \\times \\vec{r}_{P/IC}",
      notes: "The red point is the instantaneous centre. The blue points move as if they are rotating around it. Their velocities are perpendicular to the lines from the instantaneous centre.",
      setup(world, state) {
        Object.assign(state.cfg, { instantaneousCentre: true, instantaneousAxis: false, polhode: false, herpolhode: false, ellipsoid: false, invariablePlane: false, contactPoint: false });
      },
      update
    },
    {
      title: "From Instantaneous Centre to Instantaneous Axis",
      description: "In three dimensions, the analogous idea is the instantaneous axis of rotation. The angular velocity vector ω points along this axis.",
      equation: "\\text{instantaneous axis} \\parallel \\vec{\\omega}",
      notes: "The orange vector is angular velocity. The dashed orange line shows the instantaneous axis: the line about which the body is currently rotating.",
      setup(world, state) {
        Object.assign(state.cfg, { instantaneousCentre: false, instantaneousAxis: true, polhode: false, herpolhode: false, ellipsoid: false, invariablePlane: false, contactPoint: false });
        addStatics(world, state.cfg);
      },
      update
    },
    {
      title: "The Polhode: Body-Frame Path of ω",
      description: "For a freely rotating rigid body, the instantaneous axis usually does not stay fixed inside the body. The path traced by the tip of ω in the body frame is called the polhode.",
      equation: "I_1\\omega_1^2 + I_2\\omega_2^2 + I_3\\omega_3^2 = 2T",
      notes: "The blue curve lives on the inertia ellipsoid. It shows how the instantaneous axis moves relative to the rotating body.",
      setup(world, state) {
        Object.assign(state.cfg, { instantaneousCentre: false, instantaneousAxis: true, polhode: true, herpolhode: false, ellipsoid: true, invariablePlane: false, contactPoint: false });
        addStatics(world, state.cfg);
      },
      update
    },
    {
      title: "The Herpolhode: Space-Frame Path of ω",
      description: "The same angular velocity vector also traces a path in space. When projected onto the fixed invariable plane, that path is called the herpolhode.",
      equation: "\\vec{L}=\\text{constant}, \\qquad \\vec{L}\\perp \\text{invariable plane}",
      notes: "The purple curve is the herpolhode. It is the space-fixed companion to the body-fixed polhode.",
      setup(world, state) {
        Object.assign(state.cfg, { instantaneousCentre: false, instantaneousAxis: true, polhode: true, herpolhode: true, ellipsoid: true, invariablePlane: true, contactPoint: false });
        addStatics(world, state.cfg);
      },
      update
    },
    {
      title: "Poinsot's Picture: Rolling Without Slipping",
      description: "Poinsot's construction imagines the inertia ellipsoid rolling on the fixed invariable plane. The curve on the ellipsoid is the polhode; the curve on the plane is the herpolhode.",
      equation: "\\text{polhode on ellipsoid} \\quad \\leftrightarrow \\quad \\text{herpolhode on plane}",
      notes: "This is the deep connection to the instantaneous centre: just as planar motion has an instantaneous centre, free 3D rotation has an instantaneous axis whose motion is traced by these curves.",
      setup(world, state) {
        Object.assign(state.cfg, { instantaneousCentre: false, instantaneousAxis: true, polhode: true, herpolhode: true, ellipsoid: true, invariablePlane: true, contactPoint: true });
        addStatics(world, state.cfg);
      },
      update
    }
  ]
};
