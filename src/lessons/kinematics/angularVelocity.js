import * as THREE from 'three';

const RADIUS = 2;
const OMEGA  = 0.8; // rad/s

// Shared per-frame update: reads state.cfg to decide what to draw
function update(world, state, dt) {
  state.angle += OMEGA * dt;

  const px = RADIUS * Math.cos(state.angle);
  const py = RADIUS * Math.sin(state.angle);
  const vx = -OMEGA * py;
  const vy =  OMEGA * px;
  const VS = 0.8; // velocity scale

  const { cfg } = state;

  if (cfg.point) {
    world.showParticle([px, py, 0], 0.12, 0x1565c0);
    world.showLabel('P', [px + 0.2, py + 0.2, 0], '#1565c0');
  }

  if (cfg.r) {
    world.showArrow([px, py, 0], [0, 0, 0], 0x888888);
    world.showLabel('r', [px * 0.5 + 0.15, py * 0.5 + 0.15, 0], '#888888');
  }

  if (cfg.v) {
    world.showArrow([vx * VS, vy * VS, 0], [px, py, 0], 0x2e7d32);
    world.showLabel('v', [px + vx * VS + 0.15, py + vy * VS + 0.15, 0], '#2e7d32');
  }

  if (cfg.omega) {
    world.showArrow([0, 0, 2], [0, 0, 0], 0xe65100);
    world.showLabel('ω', [0.25, 0.25, 2.3], '#e65100');
  }
}

export default {
  title:   "Angular Velocity",
  subject: "Kinematics",
  camera:  { position: [0, 6, 7], lookAt: [0, 0, 0] },

  initState: () => ({
    angle: Math.PI / 6,
    cfg: { point: true, r: false, v: false, omega: false }
  }),

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(8, 8, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "Rotation in a Plane",
      description: "A point P moves in a circle in the xy-plane. It has a position, a speed, and a direction of spin. The question is: how do we describe all of that with a single vector?",
      equation: "P(t) = r(\\cos\\omega t,\\; \\sin\\omega t,\\; 0)",
      notes: "Radius = 2 units\nAngular speed = 0.8 rad/s\n\nDrag to orbit. Notice the rotation is entirely in the xy-plane.",
      setup(world, state) {
        state.cfg = { point: true, r: false, v: false, omega: false };
        world.addRing(RADIUS, 0xbbbbbb);
      },
      update
    },
    {
      title: "The Angular Velocity Vector ω",
      description: "We define ω as a vector pointing along the axis of rotation — perpendicular to the plane of spin. Its magnitude is the angular speed in rad/s. Its direction encodes clockwise vs. counterclockwise via the right-hand rule.",
      equation: "\\vec{\\omega} = \\omega\\,\\hat{k} = (0,\\; 0,\\; 0.8) \\text{ rad/s}",
      notes: "ω points up the z-axis because rotation is in the xy-plane.\n\n|ω| = 0.8 rad/s — the rate of spin.\n\nOrbit so you're looking down the z-axis — you'll see the circle face-on.",
      setup(world, state) {
        state.cfg = { point: true, r: false, v: false, omega: true };
        world.addRing(RADIUS, 0xbbbbbb);
      },
      update
    },
    {
      title: "The Right-Hand Rule",
      description: "The direction of ω follows the right-hand rule: curl the fingers of your right hand in the direction of rotation — your thumb points in the direction of ω. Counterclockwise rotation (viewed from above) → ω points upward.",
      equation: "\\text{CCW from above} \\implies \\vec{\\omega} = +\\hat{k}",
      notes: "Try it: hold your right hand over the screen, curl your fingers counterclockwise — thumb points toward you (out of the screen = +z).\n\nIf the rotation reversed to clockwise, ω would flip to (0, 0, −0.8).",
      setup(world, state) {
        state.cfg = { point: true, r: false, v: false, omega: true };
        world.addRing(RADIUS, 0xbbbbbb);
        world.addRotationArc(RADIUS * 0.55, 0xaaaaaa);
      },
      update
    },
    {
      title: "Linear Velocity: v = ω × r",
      description: "Every point on a rotating body has a linear velocity. We get it from the cross product of ω and r. The result v is always tangent to the circle — perpendicular to r, in the plane of rotation.",
      equation: "\\vec{v} = \\vec{\\omega} \\times \\vec{r}",
      notes: "Watch v (green) as P orbits. It's always tangent to the circle.\n\nω = (0,0,0.8), r = (px, py, 0)\nω × r = (−0.8·py, 0.8·px, 0)\n\nThis is exactly the velocity of circular motion.",
      setup(world, state) {
        state.cfg = { point: true, r: true, v: true, omega: true };
        world.addRing(RADIUS, 0xbbbbbb);
      },
      update
    },
    {
      title: "Why Must ω Be Orthogonal?",
      description: "If ω were in the xy-plane instead — say ω = (1, 0, 0) — then ω × r would point out of the xy-plane. That can't be a velocity for something rotating in that plane. Only when ω is perpendicular to the plane of rotation does ω × r produce a valid in-plane velocity.",
      equation: "\\underbrace{(1,0,0)}_{\\text{wrong }\\omega} \\times (0,2,0) = (0,0,2) \\quad\\leftarrow \\text{out of plane!}",
      notes: "Wrong ω → velocity leaves the plane → physically impossible for circular motion.\n\nCorrect ω = (0,0,1):\n(0,0,1) × (0,2,0) = (−2, 0, 0) ← tangent, stays in plane ✓\n\nThe orthogonal representation isn't arbitrary — it's the only one that makes v = ω × r work.",
      setup(world, state) {
        state.cfg = { point: true, r: true, v: true, omega: true };
        world.addRing(RADIUS, 0xbbbbbb);
        world.addArrow([1.5, 0, 0], [0, 0, 0], 0xf48fb1);
        world.addLabel("ω?", [1.7, 0.25, 0], '#c62828');
        world.addArrow([0, 0, 2], [0, 2, 0], 0xf48fb1);
        world.addLabel("v?", [0.2, 2.2, 2.2], '#c62828');
      },
      update
    }
  ]
};
