// [File: src/game/entities/XPShard.ts]
// [BLOCK: XP Shard Entity — Phase 3]
// Dropped at an enemy's death position. Persists until the leader walks
// within XP_COLLECT_RADIUS — GameScene owns the collection check and
// destroys this once collected (mirrors Projectile.ts's lightweight pattern).

import Phaser from 'phaser';
import { XP_SHARD_RADIUS, XP_SHARD_GLOW_RADIUS } from '@/game/config/constants';

const SHARD_COLOR = 0xffaa33;
const GLOW_ALPHA = 0.25;

// [BLOCK: XPShard Class]
export class XPShard extends Phaser.GameObjects.Container {
  readonly value: number;

  private glow: Phaser.GameObjects.Arc;
  private core: Phaser.GameObjects.Arc;
  private pulseElapsed: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.value = value;

    this.glow = scene.add.circle(0, 0, XP_SHARD_GLOW_RADIUS, SHARD_COLOR, GLOW_ALPHA);
    this.core = scene.add.circle(0, 0, XP_SHARD_RADIUS, SHARD_COLOR);

    this.add([this.glow, this.core]);
  }

  // [BLOCK: Update]
  // Subtle pulse on the glow ring so shards read as "alive" on the ground.
  update(deltaSeconds: number): void {
    this.pulseElapsed += deltaSeconds;
    this.glow.setAlpha(GLOW_ALPHA + 0.1 * Math.sin(this.pulseElapsed * 4));
  }
}