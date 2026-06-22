import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshStandardMaterial, DoubleSide, TextureLoader, SRGBColorSpace } from 'three';

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
  'Bumper-losange2': 'barril', // bumper le plus haut : losange remplace par un baril
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
  'Bumper-losange2':  { x: 0.775, y: 0.6, z: -8.24 }, // baril a l'emplacement de l'ancien losange du haut
  // Deux barils supplementaires, symetriques autour de PLAYABLE_CENTER_X (-0.775),
  // en milieu-haut du plateau. Geometrie barril centree ~origine -> pos ~= monde.
  'Bumper-barril-1':  { x: 1.425,  y: 0.6, z: -5 },
  'Bumper-barril-2':  { x: -2.975, y: 0.6, z: -5 },
  // Triangles symetriques autour de l'axe central du jouable (PLAYABLE_CENTER_X = -0.775) :
  // X miroir (+/-2.70), Z et Y conserves (deja alignes, monde z=3.28 y=0.53).
  'Bumper-triangle1': { x: 0.034, y: -7.020, z: 0.751 },
  'Bumper-triangle2': { x: 0.034, y: -7.020, z: 0.765 },
};

// Le modele barril.glb a une echelle de 100 bakee dans la matrice de son noeud
// (export FBX) : geometrie brute ~3 unites -> ~293 unites une fois le noeud applique.
// Il lui faut donc une echelle ~100x plus petite que l'echelle commune des extras.
const BUMPER_SCALE = {
  'Bumper-losange2': { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-1': { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-2': { x: 0.0033, y: 0.0033, z: 0.0033 },
};

class ModelLoader {
  async loadExtra() {
    const loader = new GLTFLoader();
    const scenes = await Promise.all(
      EXTRA_MODELS.map(name => new Promise((resolve, reject) =>
        loader.load(`/models/${MODEL_FILES[name] ?? name}.glb`, (gltf) => { gltf.scene.name = name; resolve(gltf.scene); }, undefined, reject),
      )),
    );
    // barril.glb est exporte sans texture : on lui applique les textures bumper_*.
    // Materiau partage par toutes les instances baril. Double-face (normales non garanties).
    const tl = new TextureLoader();
    // bumper_transparency.png = texture de COULEUR (albedo) du baril, malgre son nom.
    const colorMap = tl.load('/textures/bumper_transparency.png');
    colorMap.colorSpace = SRGBColorSpace;
    const barrilMat = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.5,
      roughness: 1,
      side: DoubleSide,
      map:          colorMap,
      normalMap:    tl.load('/textures/bumper_normal.png'),
      roughnessMap: tl.load('/textures/bumper_smoothness.png'),
    });

    for (const m of scenes) {
      const pos = BUMPER_POS[m.name];
      const sc = BUMPER_SCALE[m.name];
      m.scale.set(sc?.x ?? EXTRA_SCALE_X, sc?.y ?? EXTRA_SCALE_Y, sc?.z ?? EXTRA_SCALE_Z);
      m.rotation.set(EXTRA_ROT_X * DEG, EXTRA_ROT_Y * DEG, EXTRA_ROT_Z * DEG);
      m.position.set(pos?.x ?? EXTRA_POS_X, pos?.y ?? EXTRA_POS_Y, pos?.z ?? EXTRA_POS_Z);

      if (/barril/i.test(MODEL_FILES[m.name] ?? '')) {
        m.traverse((o) => { if (o.isMesh) { o.material = barrilMat; o.frustumCulled = false; } });
      }
    }
    return scenes;
  }
}

export default ModelLoader;
