import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const GLB_SCALE_X = 1;
export const GLB_SCALE_Y = 1;
export const GLB_SCALE_Z = 1;
export const GLB_ROTATION_X = 0;
export const GLB_ROTATION_Y = 0;
export const GLB_ROTATION_Z = 0;
export const GLB_POSITION_X = 0;
export const GLB_POSITION_Y = 0;
export const GLB_POSITION_Z = 0;

const EXTRA_MODELS = [
  'Bumper-barril-1',
  'Bumper-barril-2',
  'Bumper-losange1',
  'Bumper-losange2',
  'Bumper-triangle1',
  'Bumper-triangle2',
  'Obstacle-arch',
  'Obstacle-flipper1',
  'Obstacle-flipper2',
  'Obstacle-start-tunnel',
  'Obstacle-triangle',
  'Obstacle-tunnel1',
  'Obstacle-tunnel2',
];

const MODEL_FILES = {
  'Bumper-barril-1': 'Bumper-barril',
  'Bumper-barril-2': 'Bumper-barril',
};

const EXTRA_SCALE_X = 6.372;
const EXTRA_SCALE_Y = 3.078;
const EXTRA_SCALE_Z = 3.51;
const EXTRA_ROT_X   = 8;
const EXTRA_ROT_Y   = -90;
const EXTRA_ROT_Z   = 16;
const EXTRA_POS_X   = -0.37;
const EXTRA_POS_Y   = -7.02;
const EXTRA_POS_Z   = 0.758;
const DEG = Math.PI / 180;

const BUMPER_POS = {
  'Bumper-losange2':  { x: -0.8, y: EXTRA_POS_Y, z: 4 },
  'Bumper-barril-1':  { x: 0,    y: EXTRA_POS_Y, z: 0.758 },
  'Bumper-barril-2':  { x: -3,   y: EXTRA_POS_Y, z: 0.758 },
};

class ModelLoader {
  async loadExtra() {
    const loader = new GLTFLoader();
    const scenes = await Promise.all(
      EXTRA_MODELS.map(name => new Promise((resolve, reject) =>
        loader.load(`/models/${MODEL_FILES[name] ?? name}.glb`, (gltf) => { gltf.scene.name = name; resolve(gltf.scene); }, undefined, reject),
      )),
    );
    for (const m of scenes) {
      const pos = BUMPER_POS[m.name];
      m.scale.set(EXTRA_SCALE_X, EXTRA_SCALE_Y, EXTRA_SCALE_Z);
      m.rotation.set(EXTRA_ROT_X * DEG, EXTRA_ROT_Y * DEG, EXTRA_ROT_Z * DEG);
      m.position.set(pos?.x ?? EXTRA_POS_X, pos?.y ?? EXTRA_POS_Y, pos?.z ?? EXTRA_POS_Z);
    }
    return scenes;
  }
}

export default ModelLoader;
