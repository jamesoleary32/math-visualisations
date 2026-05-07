import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createControls(camera, domElement, { target } = {}) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  if (target) controls.target.set(...target);
  return controls;
}
