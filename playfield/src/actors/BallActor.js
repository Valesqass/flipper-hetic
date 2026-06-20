import { PlayfieldActor } from './PlayfieldActor.js';
import { BallBody } from '../adapters/physics/index.js';
import { createBallMesh } from '../adapters/renderer/ballMesh.js';

export class BallActor extends PlayfieldActor {
  #ballBody;

  constructor(physicsWorld, scene) {
    const mesh = createBallMesh(scene);
    mesh.castShadow = true;
    const body = new BallBody(physicsWorld);
    super({ mesh, body });
    this.#ballBody = body;
  }

  /** Current Rapier translation (x, y, z). */
  get position() { return this.#ballBody.rb.translation(); }

  /** Rapier colliders — needed by wireCollisions to detect ball handle. */
  get colliders() { return this.#ballBody.colliders; }

  postStep() {
    this.#ballBody.clamp();
  }

  launch()             { return this.#ballBody.launch(); }
  reset()              { this.#ballBody.reset(); }
  applyImpulse(vec3)   { this.#ballBody.applyImpulse(vec3); }
}
