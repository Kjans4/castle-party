// [File: src/game/entities/Boss.ts]
// [BLOCK: Boss Entity Stub]
// Full implementation in Phase 7 (boss encounters).
// Stub exists so imports resolve.

import Phaser from 'phaser';
import { Unit } from './Unit';
import type { BossConfig } from '@/game/config/bosses';

export class Boss extends Unit {
  readonly config: BossConfig;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig) {
    super({
      scene,
      x,
      y,
      hp: config.hp,
      defense: 0,
      movementSpeed: config.movementSpeed,
      label: config.name,
    });

    this.config = config;

    // TODO Phase 7: large hitbox, boss-specific visuals, HP bar
  }

  update(_deltaSeconds: number): void {
    // TODO Phase 7: move toward nearest beacon, attack patterns
    this.tickStats(_deltaSeconds);
  }
}