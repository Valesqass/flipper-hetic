export function wireCollisions(physicsWorld, level, collisionHandler) {
  const ballHandle = level.ballActor.colliders[0].handle;

  physicsWorld.addCollisionListener((h1, h2, rawWorld) => {
    const otherHandle = h1 === ballHandle ? h2 : h2 === ballHandle ? h1 : null;
    if (otherHandle === null) return;

    const collider = rawWorld.getCollider(otherHandle);
    if (!collider) return;
    const otherRb = collider.parent();
    if (!otherRb) return;
    const otherBody = physicsWorld.getBodyByHandle(otherRb);
    if (!otherBody) return;

    collisionHandler.handleCollision(otherBody.userData?.type, performance.now(), {
      ballPos:  level.ballActor.position,
      otherPos: otherBody.userData?.center ?? otherRb.translation(),
    });
  });
}
