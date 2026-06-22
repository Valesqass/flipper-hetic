import * as THREE from 'three';
import { BALL_RADIUS } from '../../domain/constants.js';

// Traînée "meth" derrière la bille : chaîne de fantômes bleus en blending additif
// -> ils sont volontairement lumineux pour capter le bloom (halo/blur).
const SEGMENTS = 18;
const MIN_MOVE = 0.02;   // seuil de mouvement avant d'ajouter un point
const TRAIL_COLOR = 0x33ccff;

export function createBallTrail(scene) {
  const group = new THREE.Group();
  group.name = 'ball-trail';
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 16, 16);
  const spheres = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: TRAIL_COLOR,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    m.frustumCulled = false;
    group.add(m);
    spheres.push(m);
  }
  scene.add(group);

  const history = []; // positions recentes, [0] = la plus proche de la bille

  function render() {
    for (let i = 0; i < SEGMENTS; i++) {
      const s = spheres[i];
      const h = history[i];
      if (!h) { s.visible = false; continue; }
      const t = 1 - i / SEGMENTS;       // 1 pres de la bille -> 0 en queue
      s.visible = true;
      s.position.set(h.x, h.y, h.z);
      s.scale.setScalar(0.2 + 0.65 * t); // s'amincit vers la queue
      s.material.opacity = 0.8 * t;      // s'estompe vers la queue
    }
  }

  return {
    group,
    push(pos) {
      const head = history[0];
      const moved = !head || Math.hypot(pos.x - head.x, pos.y - head.y, pos.z - head.z) > MIN_MOVE;
      if (moved) {
        history.unshift({ x: pos.x, y: pos.y, z: pos.z });
        if (history.length > SEGMENTS) history.pop();
      } else if (history.length > 0) {
        history.pop(); // bille immobile -> la traînee se resorbe
      }
      render();
    },
    reset() {
      history.length = 0;
      for (const s of spheres) s.visible = false;
    },
  };
}
