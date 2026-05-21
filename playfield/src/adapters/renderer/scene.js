/**
 * Playfield — Scene Three.js, camera, lumieres, renderer.
 */
import * as THREE from "three";
import {
  MAX_RENDERER_PIXEL_RATIO,
  RENDERER_ANTIALIAS,
} from "../../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../../domain/viewConfig.js";

function effectivePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO);
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Camera (config figée dans domain/viewConfig.js)
  const camera = new THREE.PerspectiveCamera(
    PLAYFIELD_VIEW_DEFAULTS.fov,
    window.innerWidth / window.innerHeight,
    PLAYFIELD_VIEW_DEFAULTS.near,
    PLAYFIELD_VIEW_DEFAULTS.far,
  );
  applyViewConfigToPerspectiveCamera(camera);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: RENDERER_ANTIALIAS,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(effectivePixelRatio());
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // Lumieres
  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    PLAYFIELD_VIEW_DEFAULTS.ambientIntensity,
  );
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(
    0xffffff,
    PLAYFIELD_VIEW_DEFAULTS.dirLightIntensity,
  );
  dirLight.position.set(
    PLAYFIELD_VIEW_DEFAULTS.dirLightX,
    PLAYFIELD_VIEW_DEFAULTS.dirLightY,
    PLAYFIELD_VIEW_DEFAULTS.dirLightZ,
  );
  scene.add(dirLight);

  return { scene, camera, renderer, ambientLight, dirLight };
}
