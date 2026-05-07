import * as THREE from 'three';

export function createCamera({ position = [0, 6, 7], lookAt = [0, 0, 0], fov = 50 } = {}) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(...position);
  camera.lookAt(...lookAt);
  return camera;
}
