import { Vector3 } from 'three';
import { getRapier, createBodyHandle } from '../adapters/physics/index.js';
import { BUMPER_CONFIG } from '../domain/bumperConfig.js';

export function buildGLBCollisions(physicsWorld, gltfScene) {
  const RAPIER = getRapier();
  const world = physicsWorld.world;
  gltfScene.updateMatrixWorld(true);

  const isBumper = gltfScene.name?.startsWith('Bumper-') ?? false;
  const config = BUMPER_CONFIG[gltfScene.name];
  const bumperType = config?.serverType ?? 'bumper_10';
  const center = isBumper ? { x: gltfScene.position.x, y: 0, z: gltfScene.position.z } : null;

  const tmp = new Vector3();

  gltfScene.traverse((obj) => {
    if (!obj.isMesh) return;
    const geo = obj.geometry;
    if (!geo?.index) return;

    const posAttr = geo.attributes.position;
    const verts = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      tmp.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
      verts[i * 3]     = tmp.x;
      verts[i * 3 + 1] = tmp.y;
      verts[i * 3 + 2] = tmp.z;
    }

    const indices = new Uint32Array(geo.index.array);
    const rb = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const col = world.createCollider(
      RAPIER.ColliderDesc.trimesh(verts, indices)
        .setFriction(isBumper ? 0.1 : 0.15)
        .setRestitution(isBumper ? 0.9 : 0.35)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      rb,
    );
    const userData = isBumper
      ? { type: bumperType, center }
      : { type: 'table' };
    createBodyHandle(rb, { userData, colliders: [col] });
  });
}
