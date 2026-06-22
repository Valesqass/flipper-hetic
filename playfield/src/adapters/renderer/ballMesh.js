import * as THREE from "three";
import { BALL_RADIUS } from "../../domain/constants.js";

export function createBallMesh(scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 32),
    // Effet "meth Breaking Bad" : bleu electrique emissif -> capte le bloom (glow/blur).
    new THREE.MeshStandardMaterial({
      color: 0x0a3a66,            // base bleu sombre
      emissive: 0x00b3ff,         // bleu electrique fluo
      emissiveIntensity: 2.6,     // > seuil bloom (0.75) => halo lumineux
      metalness: 0.4,
      roughness: 0.25,
    }),
  );
  scene.add(mesh);
  return mesh;
}
