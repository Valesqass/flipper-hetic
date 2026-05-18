/**
 * Rapier — handle minimal autour d'un RigidBody.
 *
 * Expose uniquement ce que la composition root + les use cases consomment :
 *   - body.rb           : reference au RigidBody Rapier (usage adapter interne)
 *   - body.world        : reference au monde (usage adapter interne)
 *   - body.userData     : { type, ...etat metier (ex: launched) }
 *   - body.colliders    : Collider[] (utile si on veut reset/disable)
 *   - body.position     : { x, y, z } via getters (lecture seule, utilise par
 *                         main.js pour le drain check)
 *   - body.applyImpulse(vec3) : applique une impulsion (utilise par le
 *                         callback onBumperImpulse depuis le use case)
 *
 * Pas de Proxy, pas de shim Cannon-compat (force/torque/wakeUp/...) : ces
 * acces n'ont aucun consommateur dans le code post-migration Rapier.
 */

export const bodyHandlesByRapierHandle = new Map();

export function createBodyHandle(rb, world, { userData = {}, colliders = [] } = {}) {
  const handle = {
    rb,
    world,
    colliders,
    userData,
    position: {
      get x() { return rb.translation().x; },
      get y() { return rb.translation().y; },
      get z() { return rb.translation().z; },
    },
    applyImpulse(vec3) {
      rb.applyImpulse({ x: vec3.x, y: vec3.y, z: vec3.z }, true);
    },
  };

  bodyHandlesByRapierHandle.set(rb.handle, handle);
  return handle;
}
