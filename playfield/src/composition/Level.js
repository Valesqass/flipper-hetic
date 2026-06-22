import { Mesh, BoxGeometry, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { buildEnvironment } from './buildEnvironment.js';
import { buildGLBCollisions } from './buildGLBCollisions.js';
import ModelLoader from '../adapters/renderer/modelLoader.js';
import { BallActor }        from '../actors/BallActor.js';
import { FlipperActor }     from '../actors/FlipperActor.js';
import { LaunchGateActor }  from '../actors/LaunchGateActor.js';
import { SlingshotActor }   from '../actors/SlingshotActor.js';
import {
  DRAIN_Z_THRESHOLD,
  DRAIN_OPENING_WIDTH,
  PLAYABLE_CENTER_X,
  TABLE_WIDTH,
  TABLE_DEPTH,
  WALL_HEIGHT,
} from '../domain/constants.js';

const DEG = Math.PI / 180;

export default class Level {
  #scene;
  #physicsWorld;
  #onDrainZChange;
  #drainMesh = null;
  #gateTriggerMesh = null;

  // Actors — the core game objects
  ballActor        = null;
  flipperActor     = null;
  launchGateActor  = null;
  slingshotActor   = null;

  /** Ordered list of all actors iterated by GameLoop. */
  actors = [];

  // Scene graph
  extrasGroup  = null;
  slingshotGroup = null;
  archMesh     = null;
  group        = null;

  // Debug data
  bumpers  = [];
  triggers = [];

  constructor({ scene, physicsWorld, onDrainZChange = () => {} }) {
    this.#scene = scene;
    this.#physicsWorld = physicsWorld;
    this.#onDrainZChange = onDrainZChange;
  }

  async build() {
    const { group: envGroup } = buildEnvironment(this.#physicsWorld);

    // --- GLB extra models (bumpers + obstacles) ---
    const extraScenes = await new ModelLoader().loadExtra();
    const extrasGroup = new Group();
    extrasGroup.name = 'playfield-extras';
    envGroup.add(extrasGroup);
    const slingshotNames = new Set(['Obstacle-flipper1', 'Obstacle-flipper2']);
    const slingshotGroup = new Group();
    slingshotGroup.name = 'slingshot-group';
    slingshotGroup.position.set(0.25, 0, 0);
    extrasGroup.add(slingshotGroup);

    for (const m of extraScenes) {
      if (slingshotNames.has(m.name)) {
        slingshotGroup.add(m);
      } else {
        extrasGroup.add(m);
      }
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

    // --- Actors ---
    const ballActor       = new BallActor(this.#physicsWorld, this.#scene);
    const flipperActor    = await FlipperActor.create(this.#physicsWorld, this.#scene);
    const launchGateActor = LaunchGateActor.create(this.#physicsWorld, this.#scene, ballActor);
    const slingshotActor  = new SlingshotActor(this.#physicsWorld);

    // --- Debug meshes ---
    const drainMesh = new Mesh(
      new BoxGeometry(DRAIN_OPENING_WIDTH, 0.6, 0.5),
      new MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5, side: DoubleSide, depthWrite: false }),
    );
    drainMesh.position.set(PLAYABLE_CENTER_X, 0.3, DRAIN_Z_THRESHOLD);
    drainMesh.visible = false;
    envGroup.add(drainMesh);
    this.#drainMesh = drainMesh;

    const gateUD = launchGateActor.body.userData;
    const gateTriggerMesh = new Mesh(
      new BoxGeometry(TABLE_WIDTH, 0.05, 0.05),
      new MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7, side: DoubleSide, depthWrite: false }),
    );
    gateTriggerMesh.position.set(2.45, WALL_HEIGHT / 2, gateUD.triggerZ);
    gateTriggerMesh.rotation.y = -85 * DEG;
    gateTriggerMesh.visible = false;
    envGroup.add(gateTriggerMesh);
    this.#gateTriggerMesh = gateTriggerMesh;

    // --- Level group: collect all actor meshes + environment ---
    const levelGroup = new Group();
    levelGroup.name = 'playfield-level';
    this.#scene.add(levelGroup);

    const actors = [ballActor, flipperActor, launchGateActor, slingshotActor];
    for (const actor of actors) {
      for (const mesh of actor.meshes) {
        if (mesh.parent) mesh.parent.remove(mesh);
        levelGroup.add(mesh);
      }
    }
    levelGroup.add(envGroup);

    // --- Assign public properties ---
    this.ballActor       = ballActor;
    this.flipperActor    = flipperActor;
    this.launchGateActor = launchGateActor;
    this.slingshotActor  = slingshotActor;
    this.actors          = actors;
    this.extrasGroup     = extrasGroup;
    this.slingshotGroup  = slingshotGroup;
    this.group           = levelGroup;

    // --- Debug bumpers (visual controls only) ---
    this.bumpers = extraScenes
      .filter(s => s.name.startsWith('Bumper-'))
      .map(s => {
        const baseScale = { x: s.scale.x, y: s.scale.y, z: s.scale.z };
        return {
          name: s.name,
          body: {
            rb: {
              setTranslation: ({ x, y, z }) => s.position.set(x, y, z),
              setRotation:    (q)           => s.quaternion.set(q.x, q.y, q.z, q.w),
            },
            colliders: [],
          },
          ix: s.position.x, iy: s.position.y, iz: s.position.z,
          irx: s.rotation.x / DEG, iry: s.rotation.y / DEG, irz: s.rotation.z / DEG,
          shapeControls: [
            { key: 'scale', label: 'Scale', min: 0.01, max: 5, step: 0.05, default: 1.0 },
          ],
          onShapeChange: (key, value) => {
            if (key === 'scale') s.scale.set(baseScale.x * value, baseScale.y * value, baseScale.z * value);
          },
        };
      });

    // --- Debug triggers ---
    const gateBody = launchGateActor.body;
    const gateMesh = launchGateActor.mesh;
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
        name: 'Launch Gate',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              gateBody.rb.setTranslation({ x, y, z }, true);
              gateBody.userData.closedX = x;
              gateBody.userData.closedZ = z;
              gateUD.triggerZ = z - gateUD.d / 2;
              gateTriggerMesh.position.z = gateUD.triggerZ;
            },
            setRotation: (q) => gateBody.rb.setRotation(q, true),
          },
          colliders: [{
            setHalfExtents: ({ x, y, z }) => {
              gateBody.colliders[0].setHalfExtents({ x, y, z });
              gateUD.w = x * 2; gateUD.h = y * 2; gateUD.d = z * 2;
              gateUD.triggerZ = gateUD.closedZ - gateUD.d / 2;
              gateTriggerMesh.position.z = gateUD.triggerZ;
              if (gateMesh) {
                gateMesh.geometry.dispose();
                gateMesh.geometry = new BoxGeometry(x * 2, y * 2, z * 2);
              }
            },
          }],
        },
        mesh: gateMesh,
        ix: gateUD.closedX, iy: WALL_HEIGHT / 2, iz: gateUD.closedZ,
        irx: 0, iry: gateUD.rotY, irz: 0,
        w: gateUD.w, h: gateUD.h, d: gateUD.d,
      },
      {
        name: 'Gate Trigger Zone',
        body: {
          rb: {
            setTranslation: ({ x, y, z }) => {
              gateTriggerMesh.position.set(x, y, z);
              gateUD.triggerZ = z;
            },
            setRotation: (q) => gateTriggerMesh.quaternion.set(q.x, q.y, q.z, q.w),
          },
          colliders: [],
        },
        mesh: gateTriggerMesh,
        ix: 2.45, iy: WALL_HEIGHT / 2, iz: gateUD.triggerZ,
        irx: 0, iry: -85, irz: 0,
      },
    ];

    return this;
  }

  physicsRotateY = (angleDeg) => {
    this.flipperActor.setWorldRotY(angleDeg * DEG);
  };

  setPhysicsDebugVisible = (v) => {
    this.#drainMesh.visible = v;
    this.#gateTriggerMesh.visible = v;
  };

  // --- Debug UI compatibility getters ---
  /** playfieldDebug accesses level.ballBody.rb for ball spawn teleport. */
  get ballBody() { return this.ballActor?.body ?? null; }

  /** playfieldDebug accesses level.flipperBodies.left/right/.setActive()/.setWorldRotY(). */
  get flipperBodies() { return this.flipperActor ?? null; }

  /** main.js / GameLoop backward-compat (deprecated — prefer launchGateActor directly). */
  get launchGateBody() { return this.launchGateActor ?? null; }
}
