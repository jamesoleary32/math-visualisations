import * as THREE from 'three';

const v = [2, 1, 0];
const w = [1, 2, 0];
const vLen = Math.hypot(...v);
const wLen = Math.hypot(...w);
const dot  = v[0]*w[0] + v[1]*w[1] + v[2]*w[2];
const projScale = dot / (wLen * wLen);
const proj = w.map(c => c * projScale);
const angleV = Math.atan2(v[1], v[0]);
const angleW = Math.atan2(w[1], w[0]);

// No animation — steps use setup only, no update()
export default {
  title:   "Dot Product",
  subject: "Linear Algebra",
  camera:  { position: [3, 3, 5], lookAt: [0, 0, 0] },

  init(world) {
    world.scene.add(new THREE.AxesHelper(3));
    world.scene.add(new THREE.GridHelper(6, 6, 0xcccccc, 0xe8e8e8));
  },

  steps: [
    {
      title: "Two Vectors",
      description: "We start with two vectors, v and w, sitting in the xy-plane. Each has a direction and a magnitude.",
      equation: "\\vec{v} = (2,\\,1,\\,0) \\qquad \\vec{w} = (1,\\,2,\\,0)",
      notes: "|v| = √(4+1) = √5 ≈ 2.24\n|w| = √(1+4) = √5 ≈ 2.24\n\nDrag to orbit the scene.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
      }
    },
    {
      title: "The Dot Product",
      description: "Multiply corresponding components and sum them. The result is a scalar — a single number, not a vector.",
      equation: "\\vec{v}\\cdot\\vec{w} = v_x w_x + v_y w_y + v_z w_z",
      notes: "= (2)(1) + (1)(2) + (0)(0)\n= 2 + 2 + 0\n= 4",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
      }
    },
    {
      title: "The Angle Between Them",
      description: "The dot product equals the product of the two magnitudes times the cosine of the angle between them. This connects algebra to geometry.",
      equation: "\\vec{v}\\cdot\\vec{w} = |\\vec{v}|\\,|\\vec{w}|\\cos\\theta \\implies \\cos\\theta = \\frac{4}{\\sqrt{5}\\cdot\\sqrt{5}} = \\frac{4}{5}",
      notes: "θ = arccos(4/5) ≈ 36.87°\n\nKey insight: if two vectors are perpendicular, cos(90°) = 0, so their dot product is always 0.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
        world.addArc(angleV, angleW, 0.7, 0xe65100);
      }
    },
    {
      title: "Projection",
      description: "The dot product tells us how much of v lies along w — the shadow v casts onto w. The grey line is perpendicular from the tip of v down to the line of w.",
      equation: "\\text{proj}_{\\vec{w}}\\vec{v} = \\frac{\\vec{v}\\cdot\\vec{w}}{|\\vec{w}|^2}\\,\\vec{w} = \\frac{4}{5}(1,2,0) = (0.8,\\,1.6,\\,0)",
      notes: "The orange vector is the projection.\nThe grey line is perpendicular to w.\n\nThis is the foundation of: least squares, orthogonality, reflection, and more.",
      setup(world) {
        world.addArrow(v, [0,0,0], 0x1565c0);
        world.addArrow(w, [0,0,0], 0xc62828);
        world.addArrow(proj, [0,0,0], 0xe65100);
        world.addLine([v, proj], 0xaaaaaa);
      }
    }
  ]
};
