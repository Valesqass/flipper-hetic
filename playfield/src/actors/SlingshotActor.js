import { PlayfieldActor } from './PlayfieldActor.js';

export class SlingshotActor extends PlayfieldActor {
  constructor(_physicsWorld) {
    super();
    // Slingshot physics walls are positioned via the debug slider (slingshotGroup).
    // Physical Rapier bodies will be added once visual alignment is confirmed.
  }
}
