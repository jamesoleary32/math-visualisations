import * as THREE from 'three';

const G = 1.0;
const SPEED = 0.35;
const M1 = 3.0, M2 = 1.0, M = M1 + M2;
const TRAIL_MAX = 600;

function computeAccel(r1, r2) {
  const dx = r2[0] - r1[0], dy = r2[1] - r1[1];
  const r2sq = dx*dx + dy*dy, r = Math.sqrt(r2sq);
  const f = G * M1 * M2 / (r2sq * r);
  return [[f*dx/M1, f*dy/M1], [-f*dx/M2, -f*dy/M2]];
}

function mkInitState() {
  const a = 2.5, e = 0.4;
  const rPeri = a * (1 - e);
  const vRelPeri = Math.sqrt(G * M * (1 + e) / rPeri);
  const r1 = [-M2/M * rPeri, 0];
  const r2 = [ M1/M * rPeri, 0];
  const v1 = [0, -M2/M * vRelPeri];
  const v2 = [0,  M1/M * vRelPeri];
  const [a1, a2] = computeAccel(r1, r2);
  return {
    r1, r2, v1, v2, a1, a2,
    trail1: [[...r1]], trail2: [[...r2]], relTrail: [[r2[0]-r1[0], r2[1]-r1[1]]],
    cfg: { showForces: false, showCoM: false, showTrails: false, showRel: false }
  };
}

function stepVerlet(s, dt) {
  const dt2h = dt*dt*0.5;
  const nr1 = [s.r1[0]+s.v1[0]*dt+s.a1[0]*dt2h, s.r1[1]+s.v1[1]*dt+s.a1[1]*dt2h];
  const nr2 = [s.r2[0]+s.v2[0]*dt+s.a2[0]*dt2h, s.r2[1]+s.v2[1]*dt+s.a2[1]*dt2h];
  const [na1, na2] = computeAccel(nr1, nr2);
  return {
    r1: nr1, r2: nr2,
    v1: [s.v1[0]+(s.a1[0]+na1[0])*dt*0.5, s.v1[1]+(s.a1[1]+na1[1])*dt*0.5],
    v2: [s.v2[0]+(s.a2[0]+na2[0])*dt*0.5, s.v2[1]+(s.a2[1]+na2[1])*dt*0.5],
    a1: na1, a2: na2
  };
}

function pushTrail(arr, pt) {
  arr.push([...pt]);
  if (arr.length > TRAIL_MAX) arr.shift();
}

function update(world, state, dt) {
  const subDt = dt * SPEED / 8;
  for (let i = 0; i < 8; i++) {
    const next = stepVerlet(state, subDt);
    Object.assign(state, next);
  }

  pushTrail(state.trail1, state.r1);
  pushTrail(state.trail2, state.r2);
  pushTrail(state.relTrail, [state.r2[0]-state.r1[0], state.r2[1]-state.r1[1]]);

  const { r1, r2, cfg } = state;
  const com = [(M1*r1[0]+M2*r2[0])/M, (M1*r1[1]+M2*r2[1])/M];
  const rel = [r2[0]-r1[0], r2[1]-r1[1]];

  world.showParticle([r1[0], r1[1], 0], 0.18, 0x1565c0);
  world.showLabel('m₁', [r1[0]-0.38, r1[1]+0.05, 0], '#1565c0', true);
  world.showParticle([r2[0], r2[1], 0], 0.11, 0xe65100);
  world.showLabel('m₂', [r2[0]+0.18, r2[1]+0.05, 0], '#e65100', true);

  if (cfg.showForces) {
    const dx = rel[0], dy = rel[1];
    const r = Math.sqrt(dx*dx+dy*dy);
    const FLEN = 0.55;
    const fx = dx/r*FLEN, fy = dy/r*FLEN;
    world.showArrow([fx, fy, 0], [r1[0], r1[1], 0], 0x2e7d32);
    world.showArrow([-fx, -fy, 0], [r2[0], r2[1], 0], 0x2e7d32);
    world.showLabel('F₁₂', [r1[0]+fx*0.55, r1[1]+fy*0.55+0.2, 0], '#2e7d32', true);
    world.showLabel('F₂₁', [r2[0]-fx*0.55, r2[1]-fy*0.55-0.2, 0], '#2e7d32', true);
  }

  if (cfg.showCoM) {
    world.showParticle([com[0], com[1], 0], 0.08, 0x7b1fa2);
    world.showLabel('CoM', [com[0]+0.15, com[1]+0.18, 0], '#7b1fa2', true);
  }

  if (cfg.showTrails) {
    if (state.trail1.length > 1) world.showLine(state.trail1.map(p => [p[0],p[1],0]), 0x90caf9);
    if (state.trail2.length > 1) world.showLine(state.trail2.map(p => [p[0],p[1],0]), 0xffcc80);
  }

  if (cfg.showRel) {
    if (state.relTrail.length > 1) world.showLine(state.relTrail.map(p => [p[0],p[1],0]), 0xab47bc);
    world.showDashedLine([[r1[0],r1[1],0],[r2[0],r2[1],0]], 0xcccccc);
    world.showArrow([rel[0], rel[1], 0], [0, 0, 0], 0xab47bc);
    world.showLabel('r', [rel[0]*0.5+0.15, rel[1]*0.5, 0], '#ab47bc', true);
  }
}

export default {
  title:   "Two-Body Problem",
  subject: "Particle Dynamics",
  camera:  { position: [0, 8, 4], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },

  initState: mkInitState,

  init(world) {
    world.scene.add(new THREE.GridHelper(10, 10, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "Two Bodies, Mutual Gravity",
      description: "Two masses m₁ and m₂ attract each other by gravity. Newton's third law guarantees the forces are equal in magnitude, opposite in direction — so neither body is the 'fixed' center. Both bodies move.",
      equation: "\\vec{F}_{12} = -\\vec{F}_{21} = \\frac{Gm_1 m_2}{r^2}\\hat{e}_r",
      notes: "The green arrows show the gravitational force on each body.\n\nm₁ = 3, m₂ = 1 here — comparable masses so both bodies visibly move.\n\nAt large r (apoapsis) the force is weaker, so the bodies slow down. At small r (periapsis) the force is stronger and they speed up.",
      setup(world, state) {
        Object.assign(state, mkInitState());
        state.cfg = { showForces: true, showCoM: false, showTrails: false, showRel: false };
      },
      update
    },
    {
      title: "Center of Mass Stays Fixed",
      description: "With no external forces, the center of mass R = (m₁r₁ + m₂r₂)/M moves at constant velocity. If total momentum is zero (as here), the CoM is stationary — a fixed point both bodies orbit around.",
      equation: "M\\ddot{\\vec{R}} = \\vec{F}_{\\text{ext}} = 0 \\implies \\vec{R} = \\text{const}",
      notes: "The purple dot is the CoM. Watch it stay perfectly fixed as both bodies orbit.\n\nThis is the first key step: split the problem into\n  1. CoM motion (trivial — constant velocity)\n  2. Relative motion (the interesting part)\n\nBy working in the CoM frame we can set R = 0.",
      setup(world, state) {
        Object.assign(state, mkInitState());
        state.cfg = { showForces: false, showCoM: true, showTrails: false, showRel: false };
      },
      update
    },
    {
      title: "Both Bodies Orbit the CoM",
      description: "In the CoM frame, the two bodies always sit on opposite sides of the CoM. Their distances scale inversely with mass: the heavier body stays close, the lighter body swings wide.",
      equation: "\\frac{|\\vec{r}_1|}{|\\vec{r}_2|} = \\frac{m_2}{m_1}",
      notes: "Blue trail = m₁ (mass 3), orange trail = m₂ (mass 1).\n\nm₁ traces a small ellipse (1/4 the size).\nm₂ traces a large ellipse (3/4 the size).\n\nBoth orbits have the same period and same shape — they are geometrically similar, just scaled.\n\nEarth–Moon analogy: the Moon doesn't orbit a fixed Earth — both orbit their common CoM (which sits inside the Earth but is offset from its center).",
      setup(world, state) {
        Object.assign(state, mkInitState());
        state.cfg = { showForces: false, showCoM: true, showTrails: true, showRel: false };
      },
      update
    },
    {
      title: "The Relative Coordinate",
      description: "Define r = r₂ − r₁, the vector from m₁ to m₂. Its equation of motion looks exactly like a one-body problem: a particle orbiting a fixed center of total mass M = m₁ + m₂.",
      equation: "\\ddot{\\vec{r}} = -\\frac{GM}{r^3}\\vec{r}, \\quad M = m_1 + m_2",
      notes: "The purple arrow and dashed trail show the relative position r = r₂ − r₁.\n\nThe trail is an ellipse — same shape as the individual orbits, but larger (full separation, not half).\n\nCrucially: this equation has no masses on the left side. It only depends on M = m₁ + m₂. The individual masses only appear through M.",
      setup(world, state) {
        Object.assign(state, mkInitState());
        state.cfg = { showForces: false, showCoM: false, showTrails: false, showRel: true };
      },
      update
    },
    {
      title: "Reduced Mass — The Full Reduction",
      description: "Writing the relative equation as μr̈ = F(r) introduces the reduced mass μ. This is exactly a one-body problem: a particle of mass μ orbiting a fixed mass M. Once r(t) is solved, individual positions follow immediately.",
      equation: "\\mu = \\frac{m_1 m_2}{m_1+m_2}, \\quad \\vec{r}_1 = -\\frac{m_2}{M}\\vec{r}, \\quad \\vec{r}_2 = \\frac{m_1}{M}\\vec{r}",
      notes: `μ = m₁m₂/M = 3·1/4 = 0.75 here.\n\nFor m₁ >> m₂ (e.g. Sun–Earth): μ ≈ m₂, and the relative orbit is approximately the orbit of m₂ around a fixed m₁. This is why the textbook one-body approximation works well.\n\nThe two-body reduction is exact — no approximation. It works for any central force, not just gravity.\n\nSummary:\n  r(t) → solve as one-body with total mass M\n  r₁(t) = −(m₂/M)·r(t)\n  r₂(t) =  (m₁/M)·r(t)`,
      setup(world, state) {
        Object.assign(state, mkInitState());
        state.cfg = { showForces: false, showCoM: true, showTrails: true, showRel: true };
      },
      update
    }
  ]
};
