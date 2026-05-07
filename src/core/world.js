import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// World wraps the Three.js scene with two managed object layers:
//   persistent — added in step.setup(), cleared on every step change
//   live       — added in step.update(), cleared at the start of every frame
//
// Lessons interact with the scene through world methods rather than calling
// scene.add() directly, which keeps lesson code free of Three.js plumbing.

export class World {
  constructor(scene) {
    this.scene = scene;
    this._persistent = [];
    this._live = [];
  }

  _register(obj, live) {
    this.scene.add(obj);
    (live ? this._live : this._persistent).push(obj);
    return obj;
  }

  clearPersistent() {
    this._persistent.forEach(o => this.scene.remove(o));
    this._persistent = [];
  }

  clearLive() {
    this._live.forEach(o => this.scene.remove(o));
    this._live = [];
  }

  // ── Persistent layer (call from step.setup) ──────────────────────────────

  addArrow(dir, origin, color, opts) {
    return this._register(_mkArrow(dir, origin, color, opts), false);
  }

  addLabel(text, pos, color, small) {
    return this._register(_mkLabel(text, pos, color, small), false);
  }

  addRing(radius, color) {
    return this._register(_mkRing(radius, color), false);
  }

  addParticle(pos, radius, color) {
    return this._register(_mkSphere(pos, radius, color), false);
  }

  addLine(pts, color) {
    return this._register(_mkLine(pts, color), false);
  }

  addDashedLine(pts, color) {
    return this._register(_mkDashedLine(pts, color), false);
  }

  addArc(from, to, radius, color) {
    return this._register(_mkArc(from, to, radius, color), false);
  }

  addRotationArc(radius, color) {
    return this._register(_mkRotationArc(radius, color), false);
  }

  addQuad(pts, color, opacity) {
    this._register(_mkQuad(pts, color, opacity), false);
  }

  // Raw Three.js object → persistent (for complex lesson-specific geometry)
  add(obj) { return this._register(obj, false); }

  // ── Live layer (call from step.update — cleared each frame) ──────────────

  showArrow(dir, origin, color, opts) {
    return this._register(_mkArrow(dir, origin, color, opts), true);
  }

  showLabel(text, pos, color, small) {
    return this._register(_mkLabel(text, pos, color, small), true);
  }

  showParticle(pos, radius, color) {
    return this._register(_mkSphere(pos, radius, color), true);
  }

  showLine(pts, color) {
    return this._register(_mkLine(pts, color), true);
  }

  showDashedLine(pts, color) {
    return this._register(_mkDashedLine(pts, color), true);
  }

  showArc(from, to, radius, color) {
    return this._register(_mkArc(from, to, radius, color), true);
  }

  showQuad(pts, color, opacity) {
    return this._register(_mkQuad(pts, color, opacity), true);
  }

  // Raw Three.js object → live
  addLive(obj) { return this._register(obj, true); }
}

// ── Internal Three.js object factories ──────────────────────────────────────

function _mkArrow(dir, origin, color, opts = {}) {
  const d   = new THREE.Vector3(...dir);
  const len = opts.length ?? d.length();
  if (len < 0.001) return new THREE.Object3D(); // no-op placeholder
  const a = new THREE.ArrowHelper(
    d.clone().normalize(),
    new THREE.Vector3(...origin),
    len, color,
    opts.headLen  ?? Math.min(len * 0.2,  0.35),
    opts.headWidth ?? Math.min(len * 0.1,  0.18)
  );
  return a;
}

function _mkLabel(text, pos, color, small = false) {
  const div = document.createElement('div');
  div.className   = small ? 'vec-label sm' : 'vec-label';
  div.textContent = text;
  div.style.color = color;
  const obj = new CSS2DObject(div);
  obj.position.set(...pos);
  return obj;
}

function _mkSphere(pos, radius, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 18),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(...pos);
  return mesh;
}

function _mkLine(pts, color) {
  const geo = new THREE.BufferGeometry().setFromPoints(
    pts.map(p => p instanceof THREE.Vector3 ? p : new THREE.Vector3(...p))
  );
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
}

function _mkDashedLine(pts, color) {
  const geo = new THREE.BufferGeometry().setFromPoints(
    pts.map(p => p instanceof THREE.Vector3 ? p : new THREE.Vector3(...p))
  );
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.08 });
  const l = new THREE.Line(geo, mat);
  l.computeLineDistances();
  return l;
}

function _mkRing(radius, color) {
  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return _mkLine(pts, color);
}

function _mkArc(fromAngle, toAngle, radius, color) {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = fromAngle + (i / 48) * (toAngle - fromAngle);
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return _mkLine(pts, color);
}

function _mkRotationArc(radius, color) {
  // A 270° arc with an arrowhead at the end — used for rotation direction arrows
  const group = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 1.5 + Math.PI * 0.1;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  group.add(_mkLine(pts, color));
  const endAngle = Math.PI * 1.6;
  const tip     = new THREE.Vector3(Math.cos(endAngle) * radius, Math.sin(endAngle) * radius, 0);
  const tangent = new THREE.Vector3(-Math.sin(endAngle), Math.cos(endAngle), 0).normalize();
  const head    = new THREE.ArrowHelper(tangent, tip.clone().sub(tangent.clone().multiplyScalar(0.001)), 0.001, color, 0.25, 0.15);
  group.add(head);
  return group;
}

function _mkQuad(pts, color, opacity = 0.18) {
  // pts: [origin, a, b] where the quad is origin→a, origin→b, a→a+b, b→a+b
  const [o, a, b] = pts;
  const ab = [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  const verts = new Float32Array([...o, ...a, ...b, ...a, ...ab, ...b]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, side: THREE.DoubleSide, transparent: true, opacity
  }));
}
