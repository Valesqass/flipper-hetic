import { Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  FLIPPER_LENGTH,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
  FLIPPER_OFFSET_X,
} from '../../domain/constants.js';

// Measured from flipper.glb inspection (bboxMin.x / bboxMax.x).
// The model extends in +X, with the hinge end slightly below origin.
const GLB_EXTENT_X = 1.445;   // bboxMax.x - bboxMin.x = 1.28 - (-0.165)
const GLB_PIVOT_X  = -0.165;  // bboxMin.x — the hinge end in GLB local space

const GLB_SCALE = FLIPPER_LENGTH / GLB_EXTENT_X;

function createFlipperPivot(side, glbScene) {
  const isLeft = side === 'left';
  const pivot = new Group();

  const model = glbScene.clone(true);

  // Left:  GLB extends +X → toward center ✓ — scale positive
  // Right: GLB extends +X → away from center ✗ — mirror X (scale negative)
  const sx = isLeft ? GLB_SCALE : -GLB_SCALE;
  model.scale.set(sx, GLB_SCALE, GLB_SCALE);

  // Shift the model so its hinge end (GLB_PIVOT_X) lands exactly at the pivot group origin.
  // After scale, the hinge maps to: position.x + sx * GLB_PIVOT_X = 0
  // → position.x = -sx * GLB_PIVOT_X
  model.position.x = -sx * GLB_PIVOT_X;

  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  pivot.add(model);
  return pivot;
}

export async function createFlipperMeshes(scene) {
  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) =>
    loader.load('/models/flipper.glb', resolve, undefined, reject),
  );

  const left  = createFlipperPivot('left',  gltf.scene);
  const right = createFlipperPivot('right', gltf.scene);

  // Initial positions match physics pivot — overridden each frame by sync anyway.
  left.position.set((-FLIPPER_PIVOT_X + FLIPPER_OFFSET_X), FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);
  right.position.set((FLIPPER_PIVOT_X + FLIPPER_OFFSET_X), FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z);

  scene.add(left);
  scene.add(right);

  return { left, right };
}
