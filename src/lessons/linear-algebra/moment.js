import * as THREE from 'three';

const r     = [2, 0, 0];
const F     = [0, 2, 0];
const rTip  = r;
const M     = [r[1]*F[2]-r[2]*F[1], r[2]*F[0]-r[0]*F[2], r[0]*F[1]-r[1]*F[0]]; // (0,0,4)
const F_ang = [Math.SQRT2, Math.SQRT2, 0];
const M_ang = [r[1]*F_ang[2]-r[2]*F_ang[1], r[2]*F_ang[0]-r[0]*F_ang[2], r[0]*F_ang[1]-r[1]*F_ang[0]]; // (0,0,2√2)

function baseScene(world) {
  world.addParticle([0,0,0], 0.1, 0x333333);
  world.addParticle(rTip, 0.08, 0x1565c0);
  world.addArrow(r, [0,0,0], 0x1565c0);
  world.addArrow(F, rTip, 0xc62828);
  world.addLabel('O', [-0.25, 0.2, 0], '#333333');
  world.addLabel('r', [1, 0.25, 0], '#1565c0');
  world.addLabel('F', [2.2, 1, 0], '#c62828');
}

export default {
  title:   "Moment of a Force",
  subject: "Linear Algebra → Application",
  camera:  { position: [3, 4, 6], lookAt: [1, 0, 0] },
  controls: { target: [1, 0, 0] },

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(8, 8, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "The Setup",
      description: "Think of a wrench. The pivot O is where it's fixed. The vector r runs from the pivot to the point where you apply the force. F is the force itself.",
      equation: "\\vec{M} = \\vec{r} \\times \\vec{F}",
      notes: "r = (2, 0, 0)  — the arm along the x-axis\nF = (0, 2, 0)  — force pushing upward\n\nThe force F is applied at the tip of r, not at the pivot. That's what gives it turning power.",
      setup(world) { baseScene(world); }
    },
    {
      title: "Computing the Moment",
      description: "The moment is the cross product of r and F. Expand the determinant — the result is a vector, not a scalar.",
      equation: `\\vec{M} = \\vec{r}\\times\\vec{F} = \\begin{vmatrix}\\mathbf{i}&\\mathbf{j}&\\mathbf{k}\\\\2&0&0\\\\0&2&0\\end{vmatrix}`,
      notes: "i: (0)(0) − (0)(2) = 0\nj: −[(2)(0) − (0)(0)] = 0\nk: (2)(2) − (0)(0) = 4\n\nM = (0, 0, 4)",
      setup(world) { baseScene(world); }
    },
    {
      title: "The Moment Vector",
      description: "The moment M = (0, 0, 4) points along the z-axis. Its direction is the axis of rotation — counterclockwise when viewed from above. Its magnitude is the turning strength.",
      equation: "\\vec{M} = (0,\\,0,\\,4) \\qquad |\\vec{M}| = 4 \\text{ N·m}",
      notes: "M is perpendicular to both r and F — exactly like the cross product.\n\nRight-hand rule: curl fingers from r toward F → thumb points in the direction of M (+z).\n\nOrbit and look down the z-axis to see the rotation.",
      setup(world) {
        baseScene(world);
        world.addArrow(M, [0,0,0], 0xe65100);
        world.addLabel('M', [0.25, 0.25, 4.3], '#e65100');
      }
    },
    {
      title: "Perpendicular Force = Maximum Moment",
      description: "The moment magnitude depends on the angle between r and F. A force perpendicular to the arm gives the most turning power. A force along the arm gives none.",
      equation: "|\\vec{M}| = |\\vec{r}|\\,|\\vec{F}|\\sin\\theta",
      notes: "F ⊥ r (θ=90°):   |M| = 2×2×1 = 4     ← maximum\nF at 45° (θ=45°): |M| = 2×2×0.71 ≈ 2.83\nF ∥ r (θ=0°):    |M| = 2×2×0 = 0     ← no rotation\n\nThis is why you push a door handle perpendicular to the door.",
      setup(world) {
        baseScene(world);
        world.addArrow(M,     [0,0,0], 0xe65100);
        world.addArrow(F_ang, rTip,    0xf48fb1);
        world.addArrow(M_ang, [0,0,0], 0xffcc80);
        // Perpendicular drop guide
        const s = 0.12;
        const to = [rTip[0], 0, 0];
        world.addLine([[rTip[0], F[1], 0], to], 0xaaaaaa);
        world.addLine([to, [to[0], s, 0]], 0xaaaaaa);
        world.addLine([[to[0], s, 0], [to[0]-s, s, 0]], 0xaaaaaa);
        world.addLabel('M',  [0.25, 0.25, 4.3], '#e65100');
        world.addLabel("F'", [2.2, 1.6, 0], '#e91e63');
        world.addLabel("M'", [0.25, 0.25, 3.0], '#f57c00');
      }
    },
    {
      title: "The Parallelogram Connection",
      description: "The magnitude of the moment equals the area of the parallelogram formed by r and F — this is exactly what the cross product magnitude measures. The bigger the parallelogram, the stronger the moment.",
      equation: "|\\vec{M}| = |\\vec{r}\\times\\vec{F}| = \\text{Area of parallelogram} = 4",
      notes: "r sweeps out the arm length.\nF sweeps out the force magnitude.\nThe area captures both.\n\n|r| = 2, |F| = 2, θ = 90°\nArea = 2 × 2 × sin(90°) = 4 ✓",
      setup(world) {
        baseScene(world);
        world.addArrow(M, [0,0,0], 0xe65100);
        const rF = [r[0]+F[0], r[1]+F[1], r[2]+F[2]];
        world.addQuad([[0,0,0], r, F], 0x5c6bc0, 0.18);
        world.addLine([[0,0,0], r, rF, F, [0,0,0]], 0x5c6bc0);
        world.addLabel('M', [0.25, 0.25, 4.3], '#e65100');
      }
    }
  ]
};
