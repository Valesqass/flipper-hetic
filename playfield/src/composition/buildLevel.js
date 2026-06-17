import { createTableMeshes } from "../adapters/renderer/tableMesh.js";
import { setFlippersWorldRotY } from "../adapters/physics/index.js";
import { loadPlayfieldModel } from "../adapters/renderer/modelLoader.js";
import { buildWalls } from "./buildWalls.js";
import { buildBumpers } from "./buildBumpers.js";
import { buildSensors } from "./buildSensors.js";
import { buildActors } from "./buildActors.js";
import { ARCH_OFFSET_X, ARCH_OFFSET_Z } from '../domain/constants.js';

export async function buildLevel({ scene, world }) {
  const { scaleGroup, innerModel } = await loadPlayfieldModel();

  const tableMeshes = createTableMeshes(scene);
  for (const m of tableMeshes) m.visible = false;

  const { wallDefs, syncPairs: wallPairs }       = buildWalls(world, tableMeshes);
  const { archBody, syncPairs: bumperPairs, bumperDefs }     = buildBumpers(world, tableMeshes);
  const { ballBody, flipperBodies, launchGateBody, syncPairs: actorPairs } = buildActors(world, scene);
  const { syncPairs: sensorPairs, sensorDefs }  = buildSensors(world, tableMeshes, ballBody, launchGateBody);

  const syncPairs = [...wallPairs, ...bumperPairs, ...actorPairs, ...sensorPairs];

  const WALL_NAMES = {
    table: 'Table', wallLeft: 'Mur Gauche', wallRight: 'Mur Droit',
    wallTop: 'Mur Haut', bottomLeft: 'Bas Gauche', bottomRight: 'Bas Droit',
    tunnel: 'Tunnel', glass: 'Verre',
    dropBorderLeft: 'Rampe G', dropBorderRight: 'Rampe D',
    slingshotLeftVert: 'Sling G Vert', slingshotRightVert: 'Sling D Vert',
    slingshotLeftDiag: 'Sling G Diag', slingshotRightDiag: 'Sling D Diag',
    bustGuideLeft: 'Guide Buste G', bustGuide2: 'Guide Buste 2',
  };
  const obstacles = Object.entries(wallDefs).map(([key, def]) => ({
    name: WALL_NAMES[key] || key,
    body: def.body,
    mesh: def._pair?.mesh ?? null,
    ix: def.x, iy: def.y, iz: def.z,
    irx: 0, iry: def.ry || 0,
    w: def.w, h: def.h, d: def.d,
  }));

  function physicsRotateY(angleDeg) {
    const theta = angleDeg * Math.PI / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const qy = { x: 0, y: Math.sin(theta / 2), z: 0, w: Math.cos(theta / 2) };
    for (const def of Object.values(wallDefs)) {
      def.body.rb.setTranslation({ x: def.x * cos - def.z * sin, y: def.y, z: def.x * sin + def.z * cos }, true);
      def.body.rb.setRotation(qy, true);
    }
    archBody.rb.setTranslation({
      x: ARCH_OFFSET_X * cos - ARCH_OFFSET_Z * sin,
      y: 0,
      z: ARCH_OFFSET_X * sin + ARCH_OFFSET_Z * cos,
    }, true);
    archBody.rb.setRotation(qy, true);
    setFlippersWorldRotY(flipperBodies, theta);
  }

  function setPhysicsDebugVisible(v) {
    for (const m of tableMeshes) m.visible = v;
  }

  return {
    syncPairs,
    archMesh: tableMeshes[7],
    ballBody,
    flipperBodies,
    launchGateBody,
    gltfModel: scaleGroup,
    gltfInner: innerModel,
    physicsRotateY,
    setPhysicsDebugVisible,
    obstacles,
    bumpers: bumperDefs,
    triggers: sensorDefs,
  };
}
