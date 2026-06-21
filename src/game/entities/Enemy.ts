// [File: src/game/entities/Enemy.ts]
// [BLOCK: Enemy Entity Stub]
// Full implementation in Phase 4 (enemy spawning + AI).
// Stub exists so imports resolve.

import Phaser from 'phaser';
import { Unit } from './Unit';
import type { EnemyConfig } from '@/game/config/enemies';

export class Enemy extends Unit {
  readonly config: EnemyConfig;

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
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

    // TODO Phase 4: placeholder rect, physics body, aggro state
  }

  update(_deltaSeconds: number): void {
    // TODO Phase 4: move toward nearest beacon, aggro switch on hit
    this.tickStats(_deltaSeconds);
  }
}