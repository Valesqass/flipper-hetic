import { PlayfieldActor } from './PlayfieldActor.js';
import { FlipperBody } from '../adapters/physics/index.js';
import { createFlipperMeshes } from '../adapters/renderer/flipperMesh.js';

export class FlipperActor extends PlayfieldActor {
  #bodies;
  #leftMesh  = null;
  #rightMesh = null;

  constructor(physicsWorld) {
    super();
    this.#bodies = new FlipperBody(physicsWorld);
  }

  static async create(physicsWorld, scene) {
    const actor  = new FlipperActor(physicsWorld);
    const meshes = await createFlipperMeshes(scene);
    actor.#leftMesh  = meshes.left;
    actor.#rightMesh = meshes.right;
    return actor;
  }

  get meshes() { return [this.#leftMesh, this.#rightMesh].filter(Boolean); }

  /** Expose left/right flipper data for debug UI compatibility. */
  get left()  { return this.#bodies.left; }
  get right() { return this.#bodies.right; }

  preStep() { this.#bodies.preStep(); }
  postStep() { this.#bodies.postStep(); }

  syncMesh() {
    for (const [mesh, flipper] of [
      [this.#leftMesh,  this.#bodies.left],
      [this.#rightMesh, this.#bodies.right],
    ]) {
      if (!mesh) continue;
      const t = flipper.body.rb.translation();
      const q = flipper.body.rb.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }

  setActive(side, active)  { this.#bodies.setActive(side, active); }
  setWorldRotY(thetaRad)   { this.#bodies.setWorldRotY(thetaRad); }
}
