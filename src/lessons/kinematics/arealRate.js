import * as THREE from 'three';

const p_orb = 1.8, e_orb = 0.65, h_orb = 1.8;
const SPEED  = 0.45;
const SECTOR_T = 1.4, SECTOR_SUBSTEPS = 60;
const DT_AHEAD = 0.25;

function rOfTheta(theta)    { return p_orb / (1 + e_orb * Math.cos(theta)); }
function posOfTheta(theta)  { const r = rOfTheta(theta); return new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), 0); }
function thetaDot(theta)    { const r = rOfTheta(theta); return h_orb / (r * r); }

function computeSector(theta0) {
  const pts = []; let theta = theta0;
  const dt = SECTOR_T / SECTOR_SUBSTEPS;
  for (let i = 0; i <= SECTOR_SUBSTEPS; i++) { pts.push(posOfTheta(theta)); theta += thetaDot(theta) * dt; }
  return pts;
}

function sectorMesh(pts, color, opacity) {
  const verts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    verts.push(0, 0, 0, pts[i].x, pts[i].y, 0, pts[i+1].x, pts[i+1].y, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity }));
}

function sectorOutlinePts(pts) { return [...pts, new THREE.Vector3(0, 0, 0)]; }

function update(world, state, dt) {
  if (state.cfg.pauseAt === null) {
    state.theta += thetaDot(state.theta) * dt * SPEED;
    if (state.theta > 2 * Math.PI) { state.theta -= 2 * Math.PI; state.arcPts = []; }
  }

  const r   = rOfTheta(state.theta);
  const pos = posOfTheta(state.theta);
  const rdot    = h_orb * e_orb * Math.sin(state.theta) / p_orb;
  const rThDot  = h_orb / r;
  const er  = new THREE.Vector3(Math.cos(state.theta), Math.sin(state.theta), 0);
  const eth = new THREE.Vector3(-Math.sin(state.theta), Math.cos(state.theta), 0);
  const vel = er.clone().multiplyScalar(rdot).add(eth.clone().multiplyScalar(rThDot));

  const { cfg } = state;

  if (cfg.showP) {
    world.showParticle([pos.x, pos.y, 0], 0.1, 0x1565c0);
    world.showLabel('P', [pos.x + 0.15, pos.y + 0.15, 0], '#1565c0');
  }

  if (cfg.showR) {
    world.showArrow([pos.x, pos.y, 0], [0, 0, 0], 0x555555);
    world.showLabel('r', [pos.x * 0.5 + 0.1, pos.y * 0.5 + 0.15, 0], '#555555');
  }

  if (cfg.showV) {
    const VS = 0.55;
    world.showArrow([vel.x * VS, vel.y * VS, 0], [pos.x, pos.y, 0], 0x2e7d32);
    world.showLabel('v', [pos.x + vel.x * VS + 0.15, pos.y + vel.y * VS + 0.1, 0], '#2e7d32');
  }

  if (cfg.showTriangle) {
    let theta2 = state.theta;
    const dtSmall = DT_AHEAD / 12;
    for (let i = 0; i < 12; i++) theta2 += thetaDot(theta2) * dtSmall;
    const pos2 = posOfTheta(theta2);
    const verts = new Float32Array([0, 0, 0, pos.x, pos.y, 0, pos2.x, pos2.y, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    world.addLive(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1565c0, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })));
    world.showLine([[0,0,0],[pos.x,pos.y,0],[pos2.x,pos2.y,0],[0,0,0]], 0x1565c0);
  }

  if (cfg.showSector) {
    state.arcPts.push([pos.x, pos.y]);
    if (state.arcPts.length > 2) {
      const verts = [];
      for (let i = 0; i < state.arcPts.length - 1; i++) {
        verts.push(0, 0, 0, state.arcPts[i][0], state.arcPts[i][1], 0, state.arcPts[i+1][0], state.arcPts[i+1][1], 0);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
      world.addLive(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1565c0, side: THREE.DoubleSide, transparent: true, opacity: 0.2 })));
    }
  }

  if (cfg.showH) {
    world.showArrow([0, 0, 2], [pos.x, pos.y, 0], 0xe65100, { length: 2 });
    world.showLabel('h = r × v', [pos.x + 0.15, pos.y + 0.1, 2.2], '#e65100');
  }
}

export default {
  title:   "Areal Rate",
  subject: "Kinematics",
  camera:  { position: [1, 9, 3], lookAt: [0.5, 0, 0] },
  controls: { target: [0.5, 0, 0] },

  initState: () => ({
    theta: 0.3,
    arcPts: [],
    cfg: { showOrbit: false, showP: true, showR: false, showV: false, showTriangle: false, showSector: false, showKepler: false, showH: false, pauseAt: null }
  }),

  init(world) {
    world.scene.add(new THREE.GridHelper(10, 10, 0xcccccc, 0xe8e8e8));
    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf9a825 })
    );
    world.scene.add(sun);
  },

  steps: [
    {
      title: "The Position Vector Sweeps Area",
      description: "As point P moves along its path, the position vector r (from the fixed origin O) sweeps out a thin triangle in each small time interval dt. The question is: how fast is that area growing?",
      equation: "dA = \\tfrac{1}{2}|\\vec{r} \\times \\vec{v}|\\,dt",
      notes: "The shaded blue triangle is the area dA swept in the next small interval.\n\nBase ≈ |v|·dt (arc length)\nHeight = perpendicular distance from O to the velocity line\n\nArea of triangle = ½ × base × height = ½|r × v| dt",
      setup(world, state) {
        state.cfg = { showOrbit: true, showP: true, showR: true, showV: true, showTriangle: true, showSector: false, showKepler: false, showH: false, pauseAt: null };
        state.arcPts = [];
        // Draw orbit path
        const pts = [];
        for (let i = 0; i <= 256; i++) pts.push(posOfTheta((i/256)*2*Math.PI));
        world.addLine(pts, 0xcccccc);
      },
      update
    },
    {
      title: "The Areal Rate Formula",
      description: "The areal rate dA/dt depends on the transverse component of velocity only — the radial part (ṙ) contributes no area because it moves along r. From the plane motion equations: v_transverse = r·θ̇, so the areal rate simplifies neatly.",
      equation: "\\frac{dA}{dt} = \\tfrac{1}{2}|\\vec{r}\\times\\vec{v}| = \\tfrac{1}{2}r^2\\dot{\\theta} = \\tfrac{1}{2}h",
      notes: "r × v = (r·êr) × (ṙ·êr + r·θ̇·êθ)\n     = r²θ̇ (êr × êθ)\n     = r²θ̇ k̂\n\nSo |r × v| = r²θ̇ = h (specific angular momentum).\n\nThe areal rate is exactly half the angular momentum per unit mass.\n\nNote: the radial velocity ṙ contributes zero area — it only changes how far P is from O.",
      setup(world, state) {
        state.cfg = { showOrbit: true, showP: true, showR: true, showV: true, showTriangle: true, showSector: false, showKepler: false, showH: false, pauseAt: null };
        state.arcPts = [];
        const pts = [];
        for (let i = 0; i <= 256; i++) pts.push(posOfTheta((i/256)*2*Math.PI));
        world.addLine(pts, 0xcccccc);
      },
      update
    },
    {
      title: "The Growing Sector",
      description: "As P orbits, the position vector r sweeps out a growing sector. Near the bottom of the orbit (periapsis) P moves fast — the thin triangle has small r but large v. Near the top (apoapsis) P moves slowly — large r, small v.",
      equation: "A(t) = \\int_0^t \\tfrac{1}{2}h\\,d\\tau = \\tfrac{1}{2}h\\,t \\quad(\\text{if }h = \\text{const})",
      notes: "Watch the blue sector grow as P orbits.\n\nIf h is constant, area grows linearly with time — equal areas in equal times.\n\nIs h actually constant here? That depends on whether there's a central force...",
      setup(world, state) {
        state.cfg = { showOrbit: true, showP: true, showR: true, showV: false, showTriangle: false, showSector: true, showKepler: false, showH: false, pauseAt: null };
        state.arcPts = [];
        const pts = [];
        for (let i = 0; i <= 256; i++) pts.push(posOfTheta((i/256)*2*Math.PI));
        world.addLine(pts, 0xcccccc);
      },
      update
    },
    {
      title: "Equal Areas in Equal Times (Kepler's 2nd Law)",
      description: "For any central force (force directed toward O — like gravity), angular momentum is conserved: h = r²θ̇ = constant. This means equal areas are swept in equal times, regardless of where in the orbit P is.",
      equation: "h = r^2\\dot{\\theta} = \\text{const} \\implies \\Delta A_1 = \\Delta A_2 \\text{ in same } \\Delta t",
      notes: "Blue sector: near periapsis. P moves FAST through a LARGE angle in time T.\nOrange sector: near apoapsis. P moves SLOW through a SMALL angle in the same time T.\n\nBoth sectors have exactly the same area = ½h·T.\n\nThis is Kepler's Second Law — derived purely from conservation of angular momentum.",
      setup(world, state) {
        state.cfg = { showOrbit: true, showP: true, showR: false, showV: false, showTriangle: false, showSector: false, showKepler: true, showH: false, pauseAt: null };
        state.arcPts = [];
        const pts = [];
        for (let i = 0; i <= 256; i++) pts.push(posOfTheta((i/256)*2*Math.PI));
        world.addLine(pts, 0xdddddd);

        const periSector = computeSector(0);
        const apoSector  = computeSector(Math.PI);

        world.add(sectorMesh(periSector, 0x1565c0, 0.3));
        world.addLine(sectorOutlinePts(periSector), 0x1565c0);
        world.add(sectorMesh(apoSector, 0xe65100, 0.3));
        world.addLine(sectorOutlinePts(apoSector), 0xe65100);

        const pMid = posOfTheta(0.25);
        world.addLabel('same area', [pMid.x * 0.35, pMid.y * 0.35 + 0.3, 0], '#1565c0');
        const aMid = posOfTheta(Math.PI + 0.05);
        world.addLabel('same area', [aMid.x * 0.7 - 0.4, aMid.y * 0.7, 0], '#e65100');
        world.addLabel('fast', [periSector[0].x * 0.85, periSector[0].y * 0.85 - 0.25, 0], '#1565c0');
        const apoEnd = apoSector[apoSector.length - 1];
        world.addLabel('slow', [apoEnd.x * 0.85 - 0.2, apoEnd.y * 0.85 + 0.2, 0], '#e65100');
      },
      update
    },
    {
      title: "Angular Momentum — the Perpendicular Vector",
      description: "h = r × v is the specific angular momentum. It points perpendicular to the orbital plane (along the z-axis here). Its magnitude is h = r²θ̇. For any central force, this vector is constant — it doesn't change in direction or magnitude.",
      equation: "\\vec{h} = \\vec{r} \\times \\vec{v} = r^2\\dot{\\theta}\\,\\hat{k} = \\text{constant}",
      notes: "The orange arrow is the angular momentum vector h = r × v.\nIt always points perpendicular to the orbital plane — upward here.\n\nThis connects everything:\n• The cross product gives perpendicular direction (like in the cross product visualization)\n• Its magnitude r²θ̇ is the areal rate × 2\n• Conservation of this vector is why orbits are planar\n• And why Kepler's 2nd law holds for any inverse-square (or other central) force",
      setup(world, state) {
        state.cfg = { showOrbit: true, showP: true, showR: true, showV: true, showTriangle: false, showSector: false, showKepler: false, showH: true, pauseAt: null };
        state.arcPts = [];
        const pts = [];
        for (let i = 0; i <= 256; i++) pts.push(posOfTheta((i/256)*2*Math.PI));
        world.addLine(pts, 0xcccccc);
      },
      update
    }
  ]
};
