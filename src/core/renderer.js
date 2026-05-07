import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export function createRenderers(canvas, container) {
  const glRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  glRenderer.setPixelRatio(window.devicePixelRatio);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position     = 'absolute';
  labelRenderer.domElement.style.top          = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  return { glRenderer, labelRenderer };
}
