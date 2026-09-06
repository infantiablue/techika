export const WORLD_RADIUS = 62;
export const SPAWN = { x: 0, z: 11 };
export const BAKERY = { x: -7, z: 0 };
export const LOAVES = [
  { x: 4, z: 3 }, { x: 20, z: -9 }, { x: 30, z: -26 },
  { x: -30, z: -23 }, { x: 29, z: 28 },
];
export const LANDMARKS = [
  { name: 'Bakery square', x: 0, z: 0 },
  { name: 'Olive grove', x: 30, z: -26 },
  { name: 'Temple of the sun', x: -30, z: -23 },
  { name: 'The quiet coast', x: 29, z: 28 },
];

export function movement(keys, yaw, dt) {
  let x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  let z = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
  const length = Math.hypot(x, z);
  if (!length) return { x: 0, z: 0 };
  const step = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8 : 4.5) * Math.min(Math.max(dt, 0), .05) / length;
  return { x: (x * Math.cos(yaw) + z * Math.sin(yaw)) * step, z: (z * Math.cos(yaw) - x * Math.sin(yaw)) * step };
}

export function movePlayer(position, delta, obstacles) {
  const result = { ...position };
  const blocked = (x, z) => Math.hypot(x, z) > WORLD_RADIUS || obstacles.some(o =>
    x > o.x - o.w / 2 - .38 && x < o.x + o.w / 2 + .38 && z > o.z - o.d / 2 - .38 && z < o.z + o.d / 2 + .38);
  if (!blocked(result.x + delta.x, result.z)) result.x += delta.x;
  if (!blocked(result.x, result.z + delta.z)) result.z += delta.z;
  return result;
}

export function collectNearby(position, collected) {
  return LOAVES.map((p, i) => i).filter(i => !collected.has(i) && Math.hypot(position.x - LOAVES[i].x, position.z - LOAVES[i].z) < 1.5);
}
export function canDeliver(position, collected) {
  return collected.size === LOAVES.length && Math.hypot(position.x - BAKERY.x, position.z - BAKERY.z) < 3;
}
