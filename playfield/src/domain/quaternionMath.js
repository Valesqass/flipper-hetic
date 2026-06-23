export function quatFromYaw(angle) {
  const half = angle / 2;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

export function quatFromAxis(ax, ay, az, angle) {
  const h = angle / 2, s = Math.sin(h);
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) };
}

export function mulQuat(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function composeRot(yaw, rx, rz) {
  return mulQuat(mulQuat(quatFromYaw(yaw), quatFromAxis(1, 0, 0, rx)), quatFromAxis(0, 0, 1, rz));
}

export function qTiltFrom(rx, rz) {
  return mulQuat(quatFromAxis(1, 0, 0, rx), quatFromAxis(0, 0, 1, rz));
}
