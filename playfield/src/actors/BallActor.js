import { PlayfieldActor } from './PlayfieldActor.js';
import { BallBody } from '../adapters/physics/index.js';
import { createBallMesh } from '../adapters/renderer/ballMesh.js';
import { createBallTrail } from '../adapters/renderer/ballTrail.js';

export class BallActor extends PlayfieldActor {
  #ballBody;
  #trail;

  constructor(physicsWorld, scene) {
    const mesh = createBallMesh(scene);
    mesh.castShadow = true;
    const body = new BallBody(physicsWorld);
    super({ mesh, body });
    this.#ballBody = body;
    this.#trail = createBallTrail(scene);
  }

  /** Mesh de la bille + groupe de la trainee (rapatries dans le levelGroup). */
  get meshes() { return [this.mesh, this.#trail.group]; }

  /** Current Rapier translation (x, y, z). */
  get position() { return this.#ballBody.rb.translation(); }

  /** Rapier colliders — needed by wireCollisions to detect ball handle. */
  get colliders() { return this.#ballBody.colliders; }

  postStep() {
    this.#ballBody.clamp();
  }

  /** Une fois par frame : alimente la trainee avec la position courante. */
  update() {
    this.#trail.push(this.#ballBody.rb.translation());
  }

  launch()             { return this.#ballBody.launch(); }
  reset()              { this.#ballBody.reset(); this.#trail.reset(); }
  applyImpulse(vec3)   { this.#ballBody.applyImpulse(vec3); }
}
