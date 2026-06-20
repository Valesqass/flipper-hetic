import { Mesh, BoxGeometry, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { buildEnvironment } from './buildEnvironment.js';
import { buildGLBCollisions } from './buildGLBCollisions.js';
import { buildActors } from './buildActors.js';
import ModelLoader from '../adapters/renderer/modelLoader.js';
import {
  DRAIN_Z_THRESHOLD,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  TABLE_WIDTH,
  TABLE_DEPTH,
} from '../domain/constants.js';

const DEG = Math.PI / 180;

export default class Level {
  #scene;
  #physicsWorld;
  #onDrainZChange;
  #drainMesh = null;
  #triggerVizMesh = null;

  ballBody = null;
  flipperBodies = null;
  launchGateBody = null;
  syncPairs = [];
  gltfModel = null;
  gltfInner = null;
  gltfExtras = [];
  extrasGroup = null;
  archMesh = null;
  triggers = [];
  bumpers = [];
  group = null;

  constructor({ scene, physicsWorld, onDrainZChange = () => {} }) {
    this.#scene = scene;
    this.#physicsWorld = physicsWorld;
    this.#onDrainZChange = onDrainZChange;
  }

  async build() {
    const { group: envGroup } = buildEnvironment(this.#physicsWorld);

    const extraScenes = await new ModelLoader().loadExtra();
    const extrasGroup = new Group();
    extrasGroup.name = 'playfield-extras';
    envGroup.add(extrasGroup);
    for (const m of extraScenes) {
      extrasGroup.add(m);
      m.updateMatrixWorld(true);
      buildGLBCollisions(this.#physicsWorld, m);
    }

    this.#physicsWorld.createStaticBox({
      width: TABLE_WIDTH + 2,
      height: 0.1,
      depth: TABLE_DEPTH + 2,
      position: { x: 0, y: 0.95, z: 0 },
      type: 'table',
    });

    const { ballBody, flipperBodies, launchGateBody, launchGateMesh, syncPairs: actorPairs } =
      await buildActors(this.#physicsWorld, this.#scene);

    const drainMesh = new Mesh(
      new BoxGeometry(DRAIN_OPENING_WIDTH, 0.6, 0.5),
      new MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
    );
    drainMesh.position.set(PLAYABLE_CENTER_X, 0.3, DRAIN_Z_THRESHOLD);
    drainMesh.visible = false;
    envGroup.add(drainMesh);
    this.#drainMesh = drainMesh;

    const triggerViz = new Mesh(
      new BoxGeometry(launchGateBody.userData.triggerW, 0.08, 0.08),
      new MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    triggerViz.position.set(launchGateBody.userData.triggerX, 0.3, launchGateBody.userData.triggerZ);
    triggerViz.rotation.y = launchGateBody.userData.triggerRotY * DEG;
    triggerViz.visible = false;
    envGroup.add(triggerViz);
    this.#triggerVizMesh = triggerViz;

    const levelGroup = new Group();
    levelGroup.name = 'playfield-level';
    this.#scene.add(levelGroup);
    const seen = new Set();
    for (const { mesh } of actorPairs) {
      if (seen.has(mesh)) continue;
      seen.add(mesh);
      if (mesh.parent) mesh.parent.remove(mesh);
      levelGroup.add(mesh);
    }
    levelGroup.add(envGroup);

    this.ballBody = ballBody;
    this.flipperBodies = flipperBodies;
    this.launchGateBody = launchGateBody;
    this.launchGateMesh = launchGateMesh;
    this.syncPairs = [...actorPairs];
    this.gltfModel = envGroup;
    this.gltfInner = envGroup;
    this.gltfExtras = extraScenes;
    this.extrasGroup = extrasGroup;
    this.bumpers = extraScenes
      .filter(s => s.name.startsWith('Bumper-'))
      .map(s => {
        const baseScale = { x: s.scale.x, y: s.scale.y, z: s.scale.z };
        return {
          name: s.name,
          body: {
            rb: {
              setTranslation: ({ x, y, z }) => s.position.set(x, y, z),
              setRotation: (q) => s.quaternion.set(q.x, q.y, q.z, q.w),
            },
            colliders: [],
          },
          ix: s.position.x,
          iy: s.position.y,
          iz: s.position.z,
          irx: s.rotation.x / DEG,
          iry: s.rotation.y / DEG,
          irz: s.rotation.z / DEG,
          shapeControls: [
            { key: 'scale', label: 'Scale', min: 0.01, max: 5, step: 0.05, default: 1.0 },
          ],
          onShapeChange: (key, value) => {
            if (key === 'scale') s.scale.set(baseScale.x * value, baseScale.y * value, baseScale.z * value);
          },
        };
      });
    this.group = levelGroup;
    this.triggers = [
      {
        name: 'Drain Zone',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => { drainMesh.position.set(x, y, z); this.#onDrainZChange(z); },
            setRotation() {},
          },
          colliders: [{
            setHalfExtents({ x, y, z }) {
              drainMesh.geometry.dispose();
              drainMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
            },
          }],
        },
        mesh: drainMesh,
        ix: PLAYABLE_CENTER_X, iy: 0.3, iz: DRAIN_Z_THRESHOLD, iry: 0,
        w: DRAIN_OPENING_WIDTH, h: 0.6, d: 0.5,
      },
      {
        name: 'Gate (porte)',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              launchGateBody.userData.closedX = x;
              launchGateBody.userData.closedY = y;
              launchGateBody.userData.closedZ = z;
              launchGateBody.rb.setTranslation({ x, y, z }, true);
            },
            setRotation: (q) => launchGateBody.rb.setRotation(q, true),
          },
          colliders: [{
            setHalfExtents: ({ x, y, z }) => {
              launchGateBody.userData.w = x * 2;
              launchGateBody.userData.h = y * 2;
              launchGateBody.userData.d = z * 2;
              launchGateBody.colliders[0].setHalfExtents({ x, y, z });
            },
          }],
        },
        mesh: launchGateMesh,
        ix: launchGateBody.userData.closedX,
        iy: launchGateBody.userData.closedY,
        iz: launchGateBody.userData.closedZ,
        iry: launchGateBody.userData.rotY,
        w: launchGateBody.userData.w,
        h: launchGateBody.userData.h,
        d: launchGateBody.userData.d,
      },
      {
        name: 'Gate (trigger)',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              triggerViz.position.set(x, y, z);
              launchGateBody.userData.triggerX = x;
              launchGateBody.userData.triggerZ = z;
            },
            setRotation: (q) => triggerViz.quaternion.set(q.x, q.y, q.z, q.w),
          },
          colliders: [{ setHalfExtents: () => {} }],
        },
        mesh: triggerViz,
        ix: launchGateBody.userData.triggerX,
        iy: 0.3,
        iz: launchGateBody.userData.triggerZ,
        iry: launchGateBody.userData.triggerRotY,
        w: launchGateBody.userData.triggerW,
        h: 0.08,
        d: 0.08,
      },
    ];

    return this;
  }

  physicsRotateY = (angleDeg) => {
    this.flipperBodies.setWorldRotY(angleDeg * DEG);
  };

  setPhysicsDebugVisible = (v) => {
    this.#drainMesh.visible = v;
    if (this.#triggerVizMesh) this.#triggerVizMesh.visible = v;
  };
}
