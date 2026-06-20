import { FIXED_TIME_STEP } from '../adapters/physics/index.js';

const TARGET_FPS      = 60;
const FRAME_BUDGET_MS = 1000 / TARGET_FPS; // 16.667 ms

export default class GameLoop {
  #rafId = null;
  #lastTime = 0;
  #accumulator = 0;
  #physicsWorld;
  #actors;
  #collisionHandler;
  #ballActor;
  #onDrain;
  #gameState;
  #renderFn;

  constructor({ physicsWorld, actors, collisionHandler, ballActor, onDrain, gameState, renderFn }) {
    this.#physicsWorld     = physicsWorld;
    this.#actors           = actors;
    this.#collisionHandler = collisionHandler;
    this.#ballActor        = ballActor;
    this.#onDrain          = onDrain;
    this.#gameState        = gameState;
    this.#renderFn         = renderFn;
  }

  start() {
    this.#lastTime    = performance.now();
    this.#accumulator = 0;
    this.#tick();
  }

  stop() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  #tick = () => {
    this.#rafId = requestAnimationFrame(this.#tick);

    const now   = performance.now();
    const elapsed = now - this.#lastTime;

    // Skip frame if we're ahead of the 60 Hz budget
    if (elapsed < FRAME_BUDGET_MS) return;

    // Clamp delta to avoid spiral-of-death after tab focus loss
    const delta = Math.min(elapsed / 1000, 0.1);
    this.#lastTime = now - (elapsed % FRAME_BUDGET_MS);

    // Fixed-timestep physics loop
    this.#accumulator += delta;
    while (this.#accumulator >= FIXED_TIME_STEP) {
      for (const actor of this.#actors) actor.preStep();
      this.#physicsWorld.step();
      for (const actor of this.#actors) actor.postStep();
      this.#accumulator -= FIXED_TIME_STEP;
    }

    // Per-frame actor updates (non-physics: gate trigger, etc.)
    for (const actor of this.#actors) actor.update(delta);

    // Drain detection
    if (this.#collisionHandler.checkDrain(this.#ballActor.position.z, this.#gameState.status)) {
      this.#onDrain();
      this.#collisionHandler.resetDrainFlag();
    }

    // Sync Three.js meshes with physics bodies
    for (const actor of this.#actors) actor.syncMesh();

    this.#renderFn();
  };
}
