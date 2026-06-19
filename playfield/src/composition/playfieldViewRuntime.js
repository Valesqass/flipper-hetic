/**
 * Runtime vue playfield — caméra, resize, application de viewConfig.
 */
import * as THREE from "three";
import {
  MAX_RENDERER_PIXEL_RATIO,
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_THICKNESS,
  WALL_HEIGHT,
} from "../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../domain/viewConfig.js";
import { applyPhysicsGravity } from "../adapters/physics/rapier/world.js";

const DEG = Math.PI / 180;

// Marge verticale du cadrage auto (1.0 = plateau bord a bord en hauteur).
const ORTHO_FRAME_MARGIN = 1.0;

// Coins de la boite englobante du plateau (murs inclus), en repere local du
// levelGroup. Recalcules une fois ; projetes a chaque updateOrthoBounds.
const TABLE_CORNERS = (() => {
  const hw = TABLE_WIDTH / 2 + WALL_THICKNESS;
  const hd = TABLE_DEPTH / 2 + WALL_THICKNESS;
  const corners = [];
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      for (const sz of [-1, 1])
        corners.push(new THREE.Vector3(sx * hw, sy * WALL_HEIGHT, sz * hd));
  return corners;
})();

/**
 * @param {object} deps
 * @param {import("three").PerspectiveCamera} deps.camera
 * @param {import("three").WebGLRenderer} deps.renderer
 * @param {import("three").Scene} [deps.scene]
 * @param {import("three").Group} [deps.levelGroup]
 * @param {object} [deps.world]
 * @param {import("three").DirectionalLight} [deps.dirLight]
 * @param {typeof PLAYFIELD_VIEW_DEFAULTS} [params]
 */
export function createPlayfieldViewRuntime(deps, params = PLAYFIELD_VIEW_DEFAULTS) {
  const { camera, renderer, scene, levelGroup, world, dirLight } = deps;

  let activeCamera = camera;
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, params.near, params.far);

  // Cadrage automatique : on projette la boite englobante reelle du plateau
  // dans l'espace camera et on regle les bornes ortho pour qu'elle remplisse
  // l'ecran. Robuste a l'angle de vue, la profondeur et l'ecrasement de la
  // projection (pas de nombre magique a recaler a la main).
  const _v = new THREE.Vector3();
  const _toView = new THREE.Matrix4();
  function updateOrthoBounds() {
    orthoCamera.updateMatrixWorld(true);
    const camInv = new THREE.Matrix4().copy(orthoCamera.matrixWorld).invert();
    const levelMatrix = levelGroup
      ? (levelGroup.updateMatrixWorld(true), levelGroup.matrixWorld)
      : new THREE.Matrix4();
    _toView.multiplyMatrices(camInv, levelMatrix);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of TABLE_CORNERS) {
      _v.copy(c).applyMatrix4(_toView);
      if (_v.x < minX) minX = _v.x;
      if (_v.x > maxX) maxX = _v.x;
      if (_v.y < minY) minY = _v.y;
      if (_v.y > maxY) maxY = _v.y;
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Cadrage "ajuste a la hauteur" : la profondeur du plateau remplit TOUJOURS
    // toute la hauteur de l'ecran ; la largeur se deduit de l'aspect (marge sur
    // les cotes si la fenetre est plus large que le plateau). Comme le plateau
    // est en 9:16, sur un ecran 9:16 la largeur se cale aussi pile.
    const aspect = window.innerWidth / window.innerHeight;
    const halfH = ((maxY - minY) / 2) * ORTHO_FRAME_MARGIN / params.orthoZoomY;
    const halfW = halfH * aspect;

    orthoCamera.left = cx - halfW;
    orthoCamera.right = cx + halfW;
    orthoCamera.top = cy + halfH;
    orthoCamera.bottom = cy - halfH;
    orthoCamera.near = params.near;
    orthoCamera.far = params.far;
    orthoCamera.updateProjectionMatrix();
  }

  function applyCameraTransform(target) {
    target.position.set(params.cameraPosX, params.cameraPosY, params.cameraPosZ);
    target.up.set(params.cameraUpX, params.cameraUpY, params.cameraUpZ).normalize();
    target.lookAt(params.lookAtX, params.lookAtY, params.lookAtZ);
    target.near = params.near;
    target.far = params.far;
  }

  function apply() {
    // Le levelGroup doit etre positionne AVANT le calcul des bornes ortho
    // (qui projette la boite du plateau via levelGroup.matrixWorld).
    if (levelGroup) {
      levelGroup.position.set(params.levelPosX, params.levelPosY, params.levelPosZ);
      levelGroup.rotation.set(
        params.levelRotX * DEG,
        params.levelRotY * DEG,
        params.levelRotZ * DEG,
      );
      levelGroup.updateMatrixWorld(true);
    }

    if (params.cameraMode === "orthographic") {
      activeCamera = orthoCamera;
      applyCameraTransform(orthoCamera);
      updateOrthoBounds();
    } else {
      activeCamera = camera;
      applyViewConfigToPerspectiveCamera(camera, params);
    }

    if (world) applyPhysicsGravity(world, params.gravityTiltDeg, params.gravityMagnitude);

    if (dirLight) {
      dirLight.position.set(params.dirLightX, params.dirLightY, params.dirLightZ);
      dirLight.intensity = params.dirLightIntensity;
    }

    if (scene) {
      const ambient = scene.children.find((c) => c.isAmbientLight);
      if (ambient) ambient.intensity = params.ambientIntensity;
    }
  }

  function onResize() {
    if (params.cameraMode === "perspective") {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    } else {
      updateOrthoBounds();
    }
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, MAX_RENDERER_PIXEL_RATIO),
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  apply();

  return {
    params,
    getCamera: () => activeCamera,
    orthoCamera,
    apply,
    onResize,
  };
}
