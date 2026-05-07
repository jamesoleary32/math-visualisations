import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const BODY_LEN = 2.2;
const BODY_CFG = [
  { dir: new THREE.Vector3(1, 0, 0), color: 0xd32f2f, text: "x'" },
  { dir: new THREE.Vector3(0, 1, 0), color: 0x2e7d32, text: "y'" },
  { dir: new THREE.Vector3(0, 0, 1), color: 0x1565c0, text: "z'" }
];

function buildR(psi, theta, phi) {
  return new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeRotationZ(psi))
    .multiply(new THREE.Matrix4().makeRotationX(theta))
    .multiply(new THREE.Matrix4().makeRotationZ(phi));
}

function getAngles() {
  const toRad = id => parseFloat(document.getElementById(id).value) * Math.PI / 180;
  return { psi: toRad('psi'), theta: toRad('theta'), phi: toRad('phi') };
}

// The Euler angles lesson has unique slider UI injected into the panel.
// It uses lesson.init to set up the bodyGroup and slider listeners.
// step.update drives body-frame label repositioning each frame.

function update(world, state, dt) {
  // Reposition body-frame labels to follow bodyGroup rotation each frame
  world.scene.updateMatrixWorld();
  BODY_CFG.forEach(({ dir }, i) => {
    const worldPos = dir.clone()
      .multiplyScalar(BODY_LEN + 0.3)
      .applyMatrix4(state.bodyGroup.matrixWorld);
    state.bodyFrameLabels[i].position.copy(worldPos);
  });

  // Step 5 (transform): show transform arrow in the live layer so it updates with sliders
  if (state.showTransform) {
    const { psi, theta, phi } = getAngles();
    const R      = buildR(psi, theta, phi);
    const rWorld = new THREE.Vector3(1.5, 0, 0).applyMatrix4(R);
    world.showArrow([rWorld.x, rWorld.y, rWorld.z], [0, 0, 0], 0xd32f2f, { length: rWorld.length() });
    world.showLabel('r (world)', [rWorld.x + 0.15, rWorld.y + 0.15, rWorld.z], '#d32f2f');
  }
}

export default {
  title:   "Euler Angles",
  subject: "Kinematics",
  camera:  { position: [5, 4, 5], lookAt: [0, 0, 0] },

  initState: () => ({
    bodyGroup:        null,
    bodyFrameLabels:  [],
    showTransform:    false,
    current:          0     // tracked internally for slider onChange
  }),

  init(world, state, panelEl) {
    // Fixed world geometry
    world.scene.add(new THREE.GridHelper(6, 6, 0xbbbbbb, 0xdddddd));
    world.scene.add(new THREE.AxesHelper(2.5));

    // World-frame text labels (fixed CSS2D objects, never removed)
    [['x', [2.7, 0, 0], '#cc3333'], ['y', [0, 2.7, 0], '#338833'], ['z', [0, 0, 2.7], '#3366cc']].forEach(([t, p, c]) => {
      const div = document.createElement('div');
      div.className = 'vec-label'; div.textContent = t; div.style.color = c;
      div.style.fontWeight = 'normal'; div.style.fontSize = '13px';
      const obj = new CSS2DObject(div);
      obj.position.set(...p);
      world.scene.add(obj);
    });

    // Body-frame group (arrows)
    const bodyGroup = new THREE.Group();
    world.scene.add(bodyGroup);
    BODY_CFG.forEach(({ dir, color }) => {
      bodyGroup.add(new THREE.ArrowHelper(dir.clone(), new THREE.Vector3(0, 0, 0), BODY_LEN, color, 0.3, 0.15));
    });
    state.bodyGroup = bodyGroup;

    // Body-frame labels (repositioned every frame by update())
    state.bodyFrameLabels = BODY_CFG.map(({ text, color }) => {
      const div = document.createElement('div');
      div.className = 'vec-label'; div.textContent = text;
      div.style.color = '#' + color.toString(16).padStart(6, '0');
      const obj = new CSS2DObject(div);
      world.scene.add(obj);
      return obj;
    });

    // Origin sphere
    world.scene.add(Object.assign(
      new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshBasicMaterial({ color: 0x333333 }))
    ));

    // ── Inject slider UI into panel ──────────────────────────────────────────
    const slidersDiv = document.createElement('div');
    slidersDiv.id = 'sliders';
    slidersDiv.innerHTML = `
      <style>
        #sliders { border:1px solid #e0e0e0; border-radius:8px; padding:14px 16px; background:#fafafa; display:flex; flex-direction:column; gap:10px; }
        .slider-title { font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#aaa; }
        .slider-row { display:flex; align-items:center; gap:10px; opacity:0.2; transition:opacity 0.25s; }
        .slider-row.active { opacity:1; }
        .slider-sym { font-family:Georgia,serif; font-style:italic; font-size:17px; font-weight:bold; width:18px; }
        .slider-row input[type=range] { flex:1; cursor:pointer; }
        .slider-val { font-size:12px; color:#555; width:38px; text-align:right; font-family:monospace; }
        #row-psi .slider-sym   { color:#e65100; } #row-psi input   { accent-color:#e65100; }
        #row-theta .slider-sym { color:#7b1fa2; } #row-theta input { accent-color:#7b1fa2; }
        #row-phi .slider-sym   { color:#00695c; } #row-phi input   { accent-color:#00695c; }
      </style>
      <div class="slider-title">Euler Angles (ZXZ convention)</div>
      <div class="slider-row" id="row-psi">
        <span class="slider-sym">ψ</span>
        <input type="range" id="psi"   min="-180" max="180" value="0" step="1">
        <span class="slider-val" id="psi-val">0°</span>
      </div>
      <div class="slider-row" id="row-theta">
        <span class="slider-sym">θ</span>
        <input type="range" id="theta" min="0"    max="180" value="0" step="1">
        <span class="slider-val" id="theta-val">0°</span>
      </div>
      <div class="slider-row" id="row-phi">
        <span class="slider-sym">φ</span>
        <input type="range" id="phi"   min="-180" max="180" value="0" step="1">
        <span class="slider-val" id="phi-val">0°</span>
      </div>
    `;
    const nav = document.getElementById('nav');
    panelEl.insertBefore(slidersDiv, nav);

    function updateBodyFrame() {
      const { psi, theta, phi } = getAngles();
      state.bodyGroup.setRotationFromMatrix(buildR(psi, theta, phi));
      document.getElementById('psi-val').textContent   = document.getElementById('psi').value   + '°';
      document.getElementById('theta-val').textContent = document.getElementById('theta').value + '°';
      document.getElementById('phi-val').textContent   = document.getElementById('phi').value   + '°';
    }

    ['psi', 'theta', 'phi'].forEach(id =>
      document.getElementById(id).addEventListener('input', updateBodyFrame)
    );
  },

  steps: [
    {
      title: "Two Reference Frames",
      description: "A rigid body carries its own reference frame (x', y', z') with it — the body frame. The world frame (x, y, z) is fixed in space. Euler angles describe the complete rotation from one to the other.",
      equation: "\\text{body frame} \\xrightarrow{\\,R(\\psi,\\theta,\\phi)\\,} \\text{world frame}",
      notes: "Thin axes: world frame (x, y, z)\nBold axes: body frame (x', y', z')\n\nDrag any slider to rotate the body frame. Drag the scene to orbit.",
      setup(world, state) {
        state.showTransform = false;
        setActive();
        setSliders(0, 0, 0, state);
      },
      update
    },
    {
      title: "First Rotation: Precession ψ (about Z)",
      description: "ψ rotates the body frame about the world Z-axis. The x' and y' axes sweep the horizontal plane. The z' axis stays vertical — this rotation is a pure yaw. The new x' direction is called the line of nodes.",
      equation: "R_1 = R_Z(\\psi)",
      notes: "Drag ψ — watch x' and y' sweep around the vertical axis.\n\nz' is unchanged by this rotation.\n\nThe line of nodes (the new x') will be the axis for the next rotation.",
      setup(world, state) {
        state.showTransform = false;
        setActive('row-psi');
        setSliders(45, 0, 0, state);
      },
      update
    },
    {
      title: "Second Rotation: Nutation θ (about line of nodes)",
      description: "θ tilts the body frame around the line of nodes — the x' axis produced by ψ. This tips z' away from the world Z. θ is the angle between the world Z and the body z'.",
      equation: "R_2 = R_{x'}(\\theta) \\qquad \\theta \\in [0°,180°]",
      notes: "Drag θ — watch z' tilt away from vertical.\n\nθ = 0°: z' parallel to world z (no tilt)\nθ = 90°: z' lies in the horizontal plane\nθ = 180°: z' points straight down\n\nThis is why θ is called the nutation (nodding) angle.",
      setup(world, state) {
        state.showTransform = false;
        setActive('row-psi', 'row-theta');
        setSliders(45, 40, 0, state);
      },
      update
    },
    {
      title: "Third Rotation: Spin φ (about body z')",
      description: "φ spins the body around its own z'-axis. After ψ and θ have placed z' in the right direction, φ sets the final orientation of x' and y'. Any possible 3D orientation can be reached with some (ψ, θ, φ).",
      equation: "R = R_Z(\\psi)\\cdot R_{x'}(\\theta)\\cdot R_{z'}(\\phi)",
      notes: "Drag φ — watch x' and y' spin around the (tilted) z'-axis.\n\nAll three sliders together → any orientation in 3D space.\n\nOrder matters: ZXZ means the axes rotate in that sequence. A different order gives a different result.",
      setup(world, state) {
        state.showTransform = false;
        setActive('row-psi', 'row-theta', 'row-phi');
        setSliders(45, 40, 30, state);
      },
      update
    },
    {
      title: "Transformation of Displacements",
      description: "To express a displacement r' measured in the body frame as a vector r in the world frame, multiply by the rotation matrix R. Drag the sliders — the same body-fixed displacement looks different in the world frame for each orientation.",
      equation: "\\vec{r}_{\\text{world}} = \\mathbf{R}(\\psi,\\theta,\\phi)\\;\\vec{r}_{\\text{body}}",
      notes: "The red arrow is the body x'-axis — a fixed displacement in body coordinates.\n\nAs you rotate the body, R changes and the same physical displacement has different world-frame components.\n\nR is orthogonal: Rᵀ = R⁻¹\nTo go the other way: r_body = Rᵀ r_world",
      setup(world, state) {
        state.showTransform = true;
        setActive('row-psi', 'row-theta', 'row-phi');
        setSliders(45, 40, 30, state);
      },
      update
    }
  ]
};

// ── Slider UI helpers ────────────────────────────────────────────────────────

function setActive(...ids) {
  ['row-psi', 'row-theta', 'row-phi'].forEach(id =>
    document.getElementById(id)?.classList.toggle('active', ids.includes(id))
  );
}

function setSliders(psi, theta, phi, state) {
  document.getElementById('psi').value   = psi;
  document.getElementById('theta').value = theta;
  document.getElementById('phi').value   = phi;
  document.getElementById('psi-val').textContent   = psi   + '°';
  document.getElementById('theta-val').textContent = theta + '°';
  document.getElementById('phi-val').textContent   = phi   + '°';
  if (state?.bodyGroup) {
    state.bodyGroup.setRotationFromMatrix(buildR(
      psi * Math.PI / 180, theta * Math.PI / 180, phi * Math.PI / 180
    ));
  }
}
