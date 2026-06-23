const POINTS_BY_TYPE = {
  bumper:      100,
  bumper_50:    50,
  bumper_10:    10,
  tunnel:      1500,
  'tunnel-rv':  500,
  triangle:       0,
  wall:           0,
  flipper:        0,
  drain:          0,
};

export function getPoints(type) {
  return POINTS_BY_TYPE[type] ?? null;
}

export function isValidCollisionType(type) {
  return typeof type === "string" && type in POINTS_BY_TYPE;
}
