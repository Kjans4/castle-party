// [File: src/game/entities/Beacon.ts]
// [BLOCK: Beacon Entity Stub]
// Full implementation in Phase 3 (beacon system).
// Stub exists so imports resolve.

import Phaser from 'phaser';
import type { BeaconConfig } from '@/game/config/beacons';

export class Beacon extends Phaser.GameObjects.Container {
  readonly config: BeaconConfig;
  isLit: boolean = true;
  fireMeter: number = 100; // 0–100

  constructor(scene: Phaser.Scene, x: number, y: number, config: BeaconConfig) {
    super(scene, x, y);
    scene.add.existing(this);
    this.config = config;

    // TODO Phase 3: fire visual, light radius, meter bar, proximity healing
  }

  update(_deltaSeconds: number): void {
    // TODO Phase 3: drain from enemy attacks, heal from hero proximity
  }
}