import * as THREE from 'three';

const LADDER_LENGTH = 4;

function ladderState(t) {
  const theta = Math.PI * 0.28 + 0.55 * Math.sin(t * 0.45);
  const x = LADDER_LENGTH * Math.cos(theta);
  const y = LADDER_LENGTH * Math.sin(theta);
  return {
    theta,
    A: new THREE.Vector3(x - 4, 0, 0),
    B: new THREE.Vector3(-4, y, 0)
  };
}

function update(world, state, dt) {
  state.t += dt;
  const { A, B } = ladderState(state.t);
  const { cfg } = state;

  // IC: perpendicular to v_A (vertical through A) ∩ perpendicular to v_B (horizontal through B)
  const IC = new THREE.Vector3(A.x, B.y, 0);

  world.showLine([A, B], 0x111111);
  world.showParticle([A.x, A.y, 0], 0.08, 0x1565c0);
  world.showParticle([B.x, B.y, 0], 0.08, 0x1565c0);
  world.showLabel('A', [A.x + 0.15, A.y + 0.15, 0], '#1565c0');
  world.showLabel('B', [B.x + 0.15, B.y + 0.15, 0], '#1565c0');

  world.showParticle([IC.x, IC.y, 0], 0.1, 0xc62828);
  world.showLabel('IC', [IC.x + 0.2, IC.y + 0.2, 0], '#c62828');

  if (cfg.velocities) {
    world.showArrow([1.2, 0, 0], [A.x, A.y, 0], 0x2e7d32);
    world.showArrow([0, -1.2, 0], [B.x, B.y, 0], 0x2e7d32);
    world.showLabel('v_A', [A.x + 1.4, A.y + 0.15, 0], '#2e7d32');
    world.showLabel('v_B', [B.x + 0.15, B.y - 1.4, 0], '#2e7d32');
  }

  if (cfg.construction) {
    world.showDashedLine([new THREE.Vector3(A.x, -3, 0), new THREE.Vector3(A.x, 6, 0)], 0xbbbbbb);
    world.showDashedLine([new THREE.Vector3(-6, B.y, 0), new THREE.Vector3(6, B.y, 0)], 0xbbbbbb);
  }

  if (cfg.circles) {
    const rA = A.distanceTo(IC), rB = B.distanceTo(IC);
    const ptsA = [], ptsB = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      ptsA.push(new THREE.Vector3(IC.x + rA * Math.cos(a), IC.y + rA * Math.sin(a), 0));
      ptsB.push(new THREE.Vector3(IC.x + rB * Math.cos(a), IC.y + rB * Math.sin(a), 0));
    }
    world.showLine(ptsA, 0xe0e0e0);
    world.showLine(ptsB, 0xe0e0e0);
  }

  if (cfg.trail) {
    state.icTrail.push(IC.clone());
    if (state.icTrail.length > 300) state.icTrail.shift();
    if (state.icTrail.length > 1) world.showLine(state.icTrail, 0xef9a9a);
  }
}

export default {
  title:   "Instantaneous Centre",
  subject: "Kinematics",
  camera:  { position: [0, 5, 10], lookAt: [0, 0, 0] },

  initState: () => ({
    t: 0,
    icTrail: [],
    cfg: { velocities: false, construction: false, circles: false, trail: false }
  }),

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
  },

  steps: [
    {
      title: "A Sliding Ladder",
      description: "A ladder slides down a wall while its base slides across the floor. The motion is neither pure translation nor rotation about a fixed hinge.",
      equation: "x^2 + y^2 = L^2",
      notes: "The ladder length stays constant.\n\nThe bottom endpoint moves horizontally while the top endpoint moves vertically.",
      setup(world, state) {
        state.cfg = { velocities: false, construction: false, circles: false, trail: false };
        world.addLine([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], 0xcccccc);
        world.addLine([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(-4, 5, 0)], 0xcccccc);
      },
      update
    },
    {
      title: "Endpoint Velocities",
      description: "The lower endpoint A can only move horizontally, while the upper endpoint B can only move vertically.",
      equation: "\\vec v_A \\parallel \\hat{i}, \\qquad \\vec v_B \\parallel -\\hat{j}",
      notes: "Velocity vectors reveal hidden rotational structure.\n\nNotice that the endpoint motions are constrained by the wall and floor.",
      setup(world, state) {
        state.cfg = { velocities: true, construction: false, circles: false, trail: false };
        world.addLine([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], 0xcccccc);
        world.addLine([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(-4, 5, 0)], 0xcccccc);
      },
      update
    },
    {
      title: "Constructing the Instantaneous Centre",
      description: "For rotational motion, velocities are perpendicular to the radius from the centre of rotation. So we draw perpendiculars to the endpoint velocities.",
      equation: "\\vec v \\perp \\vec r_{P/IC}",
      notes: "The dashed construction lines intersect at the instantaneous centre.\n\nAt this instant, the entire ladder behaves exactly as though it were rotating about IC.",
      setup(world, state) {
        state.cfg = { velocities: true, construction: true, circles: false, trail: false };
        world.addLine([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], 0xcccccc);
        world.addLine([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(-4, 5, 0)], 0xcccccc);
      },
      update
    },
    {
      title: "Pure Rotation Interpretation",
      description: "Once the instantaneous centre is found, the motion can be interpreted as pure rotation about that point.",
      equation: "\\vec v = \\vec\\omega \\times \\vec r",
      notes: "The endpoint velocities are tangent to circles centred at IC.\n\nThe complicated sliding motion secretly behaves like ordinary rotation.",
      setup(world, state) {
        state.cfg = { velocities: true, construction: true, circles: true, trail: false };
        world.addLine([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], 0xcccccc);
        world.addLine([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(-4, 5, 0)], 0xcccccc);
      },
      update
    },
    {
      title: "A Moving Instantaneous Centre",
      description: "The instantaneous centre is not fixed. As the ladder changes orientation, the centre moves continuously.",
      equation: "IC = IC(t)",
      notes: "The instantaneous centre is a geometric construction — not a physical hinge.\n\nIt captures the rotational character of the motion at a single instant.",
      setup(world, state) {
        state.cfg = { velocities: true, construction: true, circles: true, trail: true };
        state.icTrail = [];
        world.addLine([new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)], 0xcccccc);
        world.addLine([new THREE.Vector3(-4, 0, 0), new THREE.Vector3(-4, 5, 0)], 0xcccccc);
      },
      update
    }
  ]
};
