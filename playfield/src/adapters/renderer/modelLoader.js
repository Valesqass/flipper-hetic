import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshStandardMaterial, DoubleSide, TextureLoader, SRGBColorSpace, Matrix4 } from 'three';

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
  'Bumper-triangle2': 'Bumper-triangle1', // gauche = meme GLB que le droit, reflechi (symetrie)
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
  // Triangle droit. Le gauche reutilise ce meme placement puis est reflechi
  // autour de l'axe central du jouable (voir boucle) -> symetrie parfaite.
  'Bumper-triangle1': { x: 0.034, y: -7.020, z: 0.751 },
};

// Le modele barril.glb a une echelle de 100 bakee dans la matrice de son noeud
// (export FBX) : geometrie brute ~3 unites -> ~293 unites une fois le noeud applique.
// Il lui faut donc une echelle ~100x plus petite que l'echelle commune des extras.
const BUMPER_SCALE = {
  'Bumper-losange2': { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-1': { x: 0.0033, y: 0.0033, z: 0.0033 },
  'Bumper-barril-2': { x: 0.0033, y: 0.0033, z: 0.0033 },
};

// Rotation propre (en degres) pour certains modeles. Le barril.glb est deja
// redresse par sa matrice de noeud -> l'EXTRA_ROT (8,-90,16) ne ferait que le
// pencher. On le laisse donc parfaitement droit.
const BUMPER_ROT = {
  'Bumper-losange2': { x: 0, y: -90, z: 0 }, // quart de tour pour redresser le logo
  'Bumper-barril-1': { x: 0, y: -90, z: 0 },
  'Bumper-barril-2': { x: 0, y: -90, z: 0 },
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

    // Losange : base blanche -> metal rouille gris clair (textures rust_*),
    // dessus noir -> jaune chantier.
    const rustAlbedo = tl.load('/textures/rust_color.jpg');
    rustAlbedo.colorSpace = SRGBColorSpace;
    const losangeBaseMat = new MeshStandardMaterial({
      color: 0xf2f2f2, // gris tres clair
      metalness: 0.60, // bas : sans envMap, metalness eleve assombrit -> on garde l'albedo clair en diffus
      roughness: 0.9,
      map:          rustAlbedo,
      metalnessMap: tl.load('/textures/rust_JPG_Metalness.jpg'),
      normalMap:    tl.load('/textures/rust_normalGL.jpg'),
      roughnessMap: tl.load('/textures/rust_roughness.jpg'),
    });
    const losangeTopMat = new MeshStandardMaterial({
      color: 0xffd633, // jaune chantier clair
      metalness: 0.3,
      roughness: 0.6,
    });

    // Triangles (slingshots) : theme meth bleu -> base metal gris clair,
    // dessus + cylindres en bleu electrique emissif (capte le bloom).
    // side: DoubleSide car le triangle gauche est reflechi (scale negatif -> normales inversees).
    const triBaseMat = new MeshStandardMaterial({ color: 0x33383d, metalness: 0.75, roughness: 0.4, side: DoubleSide });
    const triBlueMat = new MeshStandardMaterial({
      color: 0x0e7fa8, emissive: 0x22c4ff, emissiveIntensity: 1.2, metalness: 0.25, roughness: 0.3, side: DoubleSide,
    });

    for (const m of scenes) {
      const pos = BUMPER_POS[m.name];
      const sc = BUMPER_SCALE[m.name];
      const rot = BUMPER_ROT[m.name];
      m.scale.set(sc?.x ?? EXTRA_SCALE_X, sc?.y ?? EXTRA_SCALE_Y, sc?.z ?? EXTRA_SCALE_Z);
      m.rotation.set((rot?.x ?? EXTRA_ROT_X) * DEG, (rot?.y ?? EXTRA_ROT_Y) * DEG, (rot?.z ?? EXTRA_ROT_Z) * DEG);
      m.position.set(pos?.x ?? EXTRA_POS_X, pos?.y ?? EXTRA_POS_Y, pos?.z ?? EXTRA_POS_Z);

      // Triangle gauche : meme placement que le droit, puis reflexion autour de
      // l'axe central du jouable (x = -0.775) -> miroir exact.
      if (m.name === 'Bumper-triangle2') {
        const pr = BUMPER_POS['Bumper-triangle1'];
        m.position.set(pr.x, pr.y, pr.z);
        m.updateMatrix();
        const C = -0.775;
        m.applyMatrix4(new Matrix4().makeTranslation(2 * C, 0, 0).multiply(new Matrix4().makeScale(-1, 1, 1)));
      }

      if (/barril/i.test(MODEL_FILES[m.name] ?? '')) {
        m.traverse((o) => { if (o.isMesh) { o.material = barrilMat; o.frustumCulled = false; } });
      }

      // Losange : on cible chaque partie par le nom de son materiau d'origine.
      if (m.name === 'Bumper-losange1') {
        m.traverse((o) => {
          if (!o.isMesh) return;
          if (o.material?.name === 'Mat.1')  o.material = losangeBaseMat; // base blanche -> rouille grise
          if (o.material?.name === 'Mat.16') o.material = losangeTopMat;  // dessus noir -> jaune chantier
          // Mat.5 (points rouges) : inchange
        });
      }

      // Triangles : base metal gris clair, dessus + cylindres bleu meth emissif.
      // Les deux utilisent desormais le GLB du droit -> meme mapping (Mat.16 = dessus).
      if (m.name === 'Bumper-triangle1' || m.name === 'Bumper-triangle2') {
        m.traverse((o) => {
          if (!o.isMesh) return;
          const mn = o.material?.name;
          o.material = (mn === 'Mat.5' || mn === 'Mat.16') ? triBlueMat : triBaseMat;
        });
      }
    }
    return scenes;
  }
}

export default ModelLoader;
