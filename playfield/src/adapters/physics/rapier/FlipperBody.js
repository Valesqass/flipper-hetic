import {
  FLIPPER_LENGTH,
  FLIPPER_WIDTH,
  FLIPPER_HEIGHT,
  FLIPPER_REST_ANGLE,
  FLIPPER_PIVOT_X,
  FLIPPER_PIVOT_Z,
  FLIPPER_PIVOT_Y,
  FLIPPER_OFFSET_X,
  FLIPPER_ROT_X,
  FLIPPER_ROT_Z,
  FLIPPER_SPEED,
} from "../../../domain/constants.js";
import { getRapier } from "./init.js";
import { MATERIALS, createBodyHandle } from "./PhysicsWorld.js";
import { mulQuat, composeRot, qTiltFrom } from "../../../domain/quaternionMath.js";

function createOneFlipper(physicsWorld, side) {
  const RAPIER = getRapier();
  const world = physicsWorld.world;
  const isLeft = side === "left";
  const pivotX = (isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X) + FLIPPER_OFFSET_X;
  const shapeOffsetX = isLeft ? FLIPPER_LENGTH / 2 : -FLIPPER_LENGTH / 2;

  const bodyDesc = RAPIER.RigidBodyDesc.kinematicVelocityBased()
    .setTranslation(pivotX, FLIPPER_PIVOT_Y, FLIPPER_PIVOT_Z)
    .setAdditionalMassProperties(
      1,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 0, z: 0, w: 1 },
    );

  const rb = world.createRigidBody(bodyDesc);
  rb.enableCcd(true);

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(FLIPPER_LENGTH / 2, FLIPPER_HEIGHT / 2, FLIPPER_WIDTH / 2)
      .setTranslation(shapeOffsetX, 0, 0)
      .setDensity(0)
      .setFriction(MATERIALS.flipper.friction)
      .setRestitution(MATERIALS.flipper.restitution)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    rb,
  );

  const handle = createBodyHandle(rb, { userData: { type: "flipper" } });

  const restAngle   = isLeft ? -FLIPPER_REST_ANGLE :  FLIPPER_REST_ANGLE;
  const activeAngle = isLeft ?  FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;

  rb.setRotation(composeRot(restAngle, FLIPPER_ROT_X, FLIPPER_ROT_Z), true);

  const qTilt = qTiltFrom(FLIPPER_ROT_X, FLIPPER_ROT_Z);
  return { body: handle, restAngle, activeAngle, currentAngle: restAngle, active: false, rotX: FLIPPER_ROT_X, rotZ: FLIPPER_ROT_Z, qTilt };
}

class FlipperBody {
  #left;
  #right;

  constructor(physicsWorld) {
    this.#left  = createOneFlipper(physicsWorld, "left");
    this.#right = createOneFlipper(physicsWorld, "right");
  }

  get left()  { return this.#left; }
  get right() { return this.#right; }
  get all()   { return [this.#left, this.#right]; }

  setActive(side, active) {
    this.#get(side).active = active;
  }

  preStep() {
    this.#stepFlipper(this.#left);
    this.#stepFlipper(this.#right);
  }

  postStep() {
    this.#clampFlipper(this.#left);
    this.#clampFlipper(this.#right);
  }

  setWorldRotY(thetaRad) {
    const cos = Math.cos(thetaRad);
    const sin = Math.sin(thetaRad);
    for (const [side, flipper] of [["left", this.#left], ["right", this.#right]]) {
      const isLeft = side === "left";
      const origX = (isLeft ? -FLIPPER_PIVOT_X : FLIPPER_PIVOT_X) + FLIPPER_OFFSET_X;
      flipper.body.rb.setTranslation({
        x: origX * cos - FLIPPER_PIVOT_Z * sin,
        y: FLIPPER_PIVOT_Y,
        z: origX * sin + FLIPPER_PIVOT_Z * cos,
      }, true);
      const origRest   = isLeft ? -FLIPPER_REST_ANGLE :  FLIPPER_REST_ANGLE;
      const origActive = isLeft ?  FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE;
      flipper.restAngle    = origRest   + thetaRad;
      flipper.activeAngle  = origActive + thetaRad;
      flipper.currentAngle = flipper.restAngle;
      flipper.body.rb.setRotation(composeRot(flipper.restAngle, flipper.rotX, flipper.rotZ), true);
      flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  #get(side) {
    return side === "left" ? this.#left : this.#right;
  }

  #stepFlipper(flipper) {
    const target = flipper.active ? flipper.activeAngle : flipper.restAngle;
    const diff = target - flipper.currentAngle;
    if (Math.abs(diff) < 0.001) {
      flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    flipper.body.rb.setAngvel({ x: 0, y: Math.sign(diff) * FLIPPER_SPEED, z: 0 }, true);
  }

  #clampFlipper(flipper) {
    const q = flipper.body.rb.rotation();
    const qtInv = { x: -flipper.qTilt.x, y: -flipper.qTilt.y, z: -flipper.qTilt.z, w: flipper.qTilt.w };
    const qYaw = mulQuat(q, qtInv);
    const angle = 2 * Math.atan2(qYaw.y, qYaw.w);
    const minAngle = Math.min(flipper.restAngle, flipper.activeAngle);
    const maxAngle = Math.max(flipper.restAngle, flipper.activeAngle);
    const clamped = Math.max(minAngle, Math.min(maxAngle, angle));
    flipper.body.rb.setRotation(composeRot(clamped, flipper.rotX, flipper.rotZ), true);
    if (clamped !== angle) {
      flipper.body.rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    flipper.currentAngle = clamped;
  }
}

export default FlipperBody;