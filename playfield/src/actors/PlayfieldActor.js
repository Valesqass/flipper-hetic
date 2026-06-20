export class PlayfieldActor {
  #mesh;
  #body;

  constructor({ mesh = null, body = null } = {}) {
    this.#mesh = mesh;
    this.#body = body;
  }

  get mesh() { return this.#mesh; }
  get body() { return this.#body; }

  /** All Three.js meshes owned by this actor (override in multi-mesh actors). */
  get meshes() { return this.#mesh ? [this.#mesh] : []; }

  /** Called once per physics sub-step, before world.step(). */
  preStep() {}

  /** Called once per physics sub-step, after world.step(). */
  postStep() {}

  /** Called once per rendered frame (non-physics). */
  update(_dt) {}

  /** Copies the physics body transform to the Three.js mesh. */
  syncMesh() {
    if (!this.#mesh || !this.#body?.rb) return;
    const t = this.#body.rb.translation();
    const q = this.#body.rb.rotation();
    this.#mesh.position.set(t.x, t.y, t.z);
    this.#mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }

  dispose() {}
}
