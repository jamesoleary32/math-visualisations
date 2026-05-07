import * as THREE from 'three';

const v = [2, 0, 0];
const w = [0, 1, 1];
const cross = [
  v[1]*w[2] - v[2]*w[1],
  v[2]*w[0] - v[0]*w[2],
  v[0]*w[1] - v[1]*w[0]
]; // (0, -2, 2)

export default {
  title:   "Cross Product",
  subject: "Linear Algebra",
  camera:  { position: [5, 4, 5], lookAt: [0, 0, 0] },

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(6, 6, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "Two Vectors in 3D",
      description: "Unlike the dot product, the cross product only makes sense in 3D. We need two vectors — and this time w has a z-component so both vectors genuinely live in 3D space.",
      equation: "\\vec{v} = (2,\\,0,\\,0) \\qquad \\vec{w} = (0,\\,1,\\,1)",
      notes: "|v| = 2\n|w| = √2 ≈ 1.41\n\nDrag to orbit — the 3D geometry is the whole point here.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
      }
    },
    {
      title: "The Formula",
      description: "The cross product is computed as a 3×3 determinant. Each component of the result mixes two components of the two input vectors.",
      equation: `\\vec{v}\\times\\vec{w} = \\begin{vmatrix}\\mathbf{i}&\\mathbf{j}&\\mathbf{k}\\\\2&0&0\\\\0&1&1\\end{vmatrix}`,
      notes: "i: (0)(1) − (0)(1) = 0\nj: −[(2)(1) − (0)(0)] = −2\nk: (2)(1) − (0)(0) = 2\n\nResult: (0, −2, 2)",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
      }
    },
    {
      title: "The Result Vector",
      description: "The cross product v × w is itself a vector — it sticks out of the plane that v and w define. Orbit the scene to see how it stands perpendicular to both.",
      equation: "\\vec{v}\\times\\vec{w} = (0,\\,-2,\\,2)",
      notes: "|v × w| = √(0 + 4 + 4) = 2√2 ≈ 2.83\n\nThe orange vector is the cross product. Notice it points away from the plane of the blue and red vectors.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
        world.addArrow(cross, [0,0,0], 0xe65100);
      }
    },
    {
      title: "Perpendicular to Both",
      description: "The cross product is always perpendicular to both input vectors. We can verify this by taking dot products — perpendicular vectors always have a dot product of zero.",
      equation: "(\\vec{v}\\times\\vec{w})\\cdot\\vec{v} = 0 \\qquad (\\vec{v}\\times\\vec{w})\\cdot\\vec{w} = 0",
      notes: "(0,−2,2)·(2,0,0) = 0+0+0 = 0 ✓\n(0,−2,2)·(0,1,1) = 0−2+2 = 0 ✓\n\nThis is not a coincidence — it follows directly from the determinant definition.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
        world.addArrow(cross, [0,0,0], 0xe65100);
      }
    },
    {
      title: "Area of the Parallelogram",
      description: "The magnitude of the cross product equals the area of the parallelogram spanned by v and w. This is the geometric heart of it — the cross product encodes both direction (perpendicular) and size (area).",
      equation: "|\\vec{v}\\times\\vec{w}| = |\\vec{v}|\\,|\\vec{w}|\\sin\\theta = \\text{Area}",
      notes: "Area = 2√2 ≈ 2.83\n\nWhen v ∥ w: sin(0°) = 0 → area = 0, cross product = 0.\nWhen v ⊥ w: sin(90°) = 1 → maximum area.\n\nThis is used in physics to compute torque and angular momentum.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
        world.addArrow(cross, [0,0,0], 0xe65100);
        // Parallelogram: v and w from origin
        const vw = [v[0]+w[0], v[1]+w[1], v[2]+w[2]];
        world.addQuad([[0,0,0], v, w], 0x5c6bc0, 0.18);
        world.addLine([[0,0,0], v, vw, w, [0,0,0]], 0x5c6bc0);
      }
    }
  ]
};
