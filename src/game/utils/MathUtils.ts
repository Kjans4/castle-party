// [File: src/game/utils/MathUtils.ts]
// [BLOCK: Math Utilities]
// Shared math helpers used across entities, systems, and scenes.

// [BLOCK: Clamp]
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// [BLOCK: Distance]
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// [BLOCK: Angle]
// Returns the angle in radians from point A to point B.
export function angleTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// [BLOCK: Angle Degrees]
export function angleToDegrees(x1: number, y1: number, x2: number, y2: number): number {
  return Phaser.Math.RadToDeg(angleTo(x1, y1, x2, y2));
}

// [BLOCK: Lerp]
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// [BLOCK: Random Range]
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// [BLOCK: Random Int]
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

// [BLOCK: Normalize Vector]
export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

// [BLOCK: Point In Circle]
export function pointInCircle(
  px: number, py: number,
  cx: number, cy: number,
  radius: number
): boolean {
  return distance(px, py, cx, cy) <= radius;
}