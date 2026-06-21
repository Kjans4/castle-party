// [File: src/game/utils/PhysicsUtils.ts]
// [BLOCK: Physics Utilities]
// Helpers for Arcade Physics bodies used across entities.

// [BLOCK: Set Velocity Toward Point]
// Sets an arcade physics body's velocity to move toward a target point at a given speed.
export function setVelocityToward(
  body: Phaser.Physics.Arcade.Body,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  speed: number
): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
}

// [BLOCK: Stop Body]
export function stopBody(body: Phaser.Physics.Arcade.Body): void {
  body.setVelocity(0, 0);
}

// [BLOCK: Cap Velocity]
// Clamps a body's velocity magnitude to maxSpeed without changing direction.
export function capVelocity(
  body: Phaser.Physics.Arcade.Body,
  maxSpeed: number
): void {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    body.setVelocity(vx * scale, vy * scale);
  }
}

// [File: src/game/utils/PhysicsUtils.ts]
// [BLOCK: Bodies Overlapping]
// Returns true if two arcade physics bodies are overlapping.
export function bodiesOverlapping(
  a: Phaser.Physics.Arcade.Body,
  b: Phaser.Physics.Arcade.Body
): boolean {
  return Phaser.Geom.Intersects.RectangleToRectangle(
    new Phaser.Geom.Rectangle(a.x, a.y, a.width, a.height),
    new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height)
  );
}