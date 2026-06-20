import { BoxGeometry } from 'three';
import { PlayfieldActor } from './PlayfieldActor.js';
import { LaunchGateBody } from '../adapters/physics/index.js';
import { createLaunchGateMesh } from '../adapters/renderer/launchGateMesh.js';

export class LaunchGateActor extends PlayfieldActor {
  #gateBody;
  #ballActor;

  constructor(gateBody, mesh, ballActor) {
    super({ mesh, body: gateBody });
    this.#gateBody = gateBody;
    this.#ballActor = ballActor;
  }

  static create(physicsWorld, scene, ballActor) {
    const mesh = createLaunchGateMesh(scene);
    const body = new LaunchGateBody(physicsWorld);
    mesh.geometry.dispose();
    mesh.geometry = new BoxGeometry(body.userData.w, body.userData.h, body.userData.d);
    return new LaunchGateActor(body, mesh, ballActor);
  }

  /** State machine update: checks ball Z and triggers gate close. */
  update(_dt) {
    this.#gateBody.update(this.#ballActor.position.z);
  }

  open() { this.#gateBody.open(); }

  /** Expose userData for debug UI compatibility. */
  get userData() { return this.#gateBody.userData; }

  /** Expose rb for debug UI compatibility. */
  get rb() { return this.#gateBody.rb; }
}
