/**
 * Runtime vue playfield — caméra, resize, application de viewConfig.
 */
import * as THREE from "three";
import { MAX_RENDERER_PIXEL_RATIO } from "../domain/constants.js";
import {
  PLAYFIELD_VIEW_DEFAULTS,
  applyViewConfigToPerspectiveCamera,
} from "../domain/viewConfig.js";
import { applyPhysicsGravity } from "../adapters/physics/rapier/world.js";

const DEG = Math.PI / 180;

// Rectangle de cadrage "cible" en unites monde (demi-extents), utilise par le
// cadrage "contain" de la camera ortho.
//  - largeur : calee sur l'element le plus large du plateau, l'arche
//    (ARCH_HALF_WIDTH = 6.05), + une petite marge anti-clipping. C'est ce qui
//    fixe le moment ou le plateau commence a retrecir : tant que la fenetre est
//    plus large que ce rectangle, le plateau garde une taille CONSTANTE.
//  - hauteur : valeur calee a l'oeil sur le rendu paysage historique.
const ORTHO_TARGET_HALF_WIDTH = 6.5;
const ORTHO_TARGET_HALF_HEIGHT = 10;

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

  function updateOrthoBounds() {
    const aspect = window.innerWidth / window.innerHeight;
    // Demi-extents "cibles" du cadrage (orthoZoom* = zoom global reglable).
    const halfW = ORTHO_TARGET_HALF_WIDTH / params.orthoZoomX;
    const halfH = ORTHO_TARGET_HALF_HEIGHT / params.orthoZoomY;
    // Cadrage "contain" : le rectangle cible (halfW x halfH) reste TOUJOURS
    // entierement visible. Le plateau garde une taille CONSTANTE tant que la
    // fenetre est assez large pour le contenir (axe vertical limitant) ; il ne
    // retrecit que lorsque la fenetre devient plus etroite que le plateau
    // (aspect < halfW/halfH ~= 0.65), soit juste avant que ses bords soient
    // coupes — y compris sur le 9:16 portrait du cabinet (aspect 0.5625).
    let w = halfW;
    let h = halfH;
    if (aspect >= halfW / halfH) {
      w = halfH * aspect;
    } else {
      h = halfW / aspect;
    }
    orthoCamera.left = -w;
    orthoCamera.right = w;
    orthoCamera.top = h;
    orthoCamera.bottom = -h;
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
    if (params.cameraMode === "orthographic") {
      activeCamera = orthoCamera;
      updateOrthoBounds();
      applyCameraTransform(orthoCamera);
    } else {
      activeCamera = camera;
      applyViewConfigToPerspectiveCamera(camera, params);
    }

    if (levelGroup) {
      levelGroup.position.set(params.levelPosX, params.levelPosY, params.levelPosZ);
      levelGroup.rotation.set(
        params.levelRotX * DEG,
        params.levelRotY * DEG,
        params.levelRotZ * DEG,
      );
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
