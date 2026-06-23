// [File: src/game/systems/SpawnSystem.ts]
// [BLOCK: Spawn System — Phase 3]
// Pure logic, no Phaser dependency — GameScene calls update() each frame and
// instantiates Enemy objects from the returned requests.
//
// Spawn boundary approximation: a single ring centered on the beacon cluster
// that contracts as Darkness Level rises. The real "illuminated zone" is the
// union of 7 separate beacon light circles, not a perfect ring — this is a
// deliberate Phase 3 simplification, flagged for revisit if it reads wrong
// in playtesting (e.g. enemies popping in visibly inside still-lit pockets).

import {
  WORLD_W,
  WORLD_H,
  SPAWN_INTERVAL_MS,
  SPAWN_VARIANCE_MS,
  BATCH_SIZE_BY_DARKNESS_LEVEL,
  SPAWN_BOUNDARY_RADIUS_FULL_LIGHT,
  SPAWN_BOUNDARY_SHRINK_PER_LEVEL,
  SPAWN_BOUNDARY_MIN_RADIUS,
} from '@/game/config/constants';
import { clamp, randomRange, randomInt } from '@/game/utils/MathUtils';

export interface SpawnRequest {
  enemyId: string;
  x: number;
  y: number;
}

export interface ClusterCenter {
  x: number;
  y: number;
}

// [BLOCK: Phase 3 Enemy Pool]
// Only these 3 enemies are live in Phase 3 — weighted per castle-party-phase3-plan.md.
const ENEMY_WEIGHTS: { id: string; weight: number }[] = [
  { id: 'skeleton', weight: 50 },
  { id: 'zombie', weight: 30 },
  { id: 'knight', weight: 20 },
];
const TOTAL_WEIGHT = ENEMY_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);

// [BLOCK: SpawnSystem Class]
export class SpawnSystem {
  private elapsedMs: number = 0;
  private nextIntervalMs: number = SPAWN_INTERVAL_MS;

  constructor() {
    this.rollNextInterval();
  }

  // [BLOCK: Update]
  // Advances the internal timer. Returns a batch of spawn requests once the
  // (randomized) interval elapses, otherwise an empty array most frames.
  update(deltaSeconds: number, darknessLevel: number, clusterCenter: ClusterCenter): SpawnRequest[] {
    this.elapsedMs += deltaSeconds * 1000;

    if (this.elapsedMs < this.nextIntervalMs) {
      return [];
    }

    this.elapsedMs = 0;
    this.rollNextInterval();

    return this.generateBatch(darknessLevel, clusterCenter);
  }

  // [BLOCK: Reset]
  // Called on run reset so a fresh run doesn't inherit a stale timer.
  reset(): void {
    this.elapsedMs = 0;
    this.rollNextInterval();
  }

  // [BLOCK: Roll Next Interval]
  // Base 4s ± 1s variance, re-rolled after every batch.
  private rollNextInterval(): void {
    this.nextIntervalMs = SPAWN_INTERVAL_MS + randomRange(-SPAWN_VARIANCE_MS, SPAWN_VARIANCE_MS);
  }

  // [BLOCK: Generate Batch]
  private generateBatch(darknessLevel: number, clusterCenter: ClusterCenter): SpawnRequest[] {
    const clampedLevel = clamp(darknessLevel, 1, 7);
    const [min, max] = BATCH_SIZE_BY_DARKNESS_LEVEL[clampedLevel] ?? [1, 2];
    const batchSize = randomInt(min, max);

    const requests: SpawnRequest[] = [];
    for (let i = 0; i < batchSize; i++) {
      const pos = this.rollSpawnPosition(clampedLevel, clusterCenter);
      requests.push({
        enemyId: this.rollEnemyType(),
        x: pos.x,
        y: pos.y,
      });
    }

    return requests;
  }

  // [BLOCK: Roll Enemy Type]
  // Weighted random selection from the Phase 3 pool (50/30/20).
  private rollEnemyType(): string {
    const roll = Math.random() * TOTAL_WEIGHT;
    let cumulative = 0;

    for (const entry of ENEMY_WEIGHTS) {
      cumulative += entry.weight;
      if (roll < cumulative) return entry.id;
    }

    return ENEMY_WEIGHTS[ENEMY_WEIGHTS.length - 1].id;
  }

  // [BLOCK: Roll Spawn Position]
  // Random point along the contracting boundary ring around the cluster center.
  private rollSpawnPosition(darknessLevel: number, clusterCenter: ClusterCenter): { x: number; y: number } {
    const shrink = (darknessLevel - 1) * SPAWN_BOUNDARY_SHRINK_PER_LEVEL;
    const radius = Math.max(SPAWN_BOUNDARY_MIN_RADIUS, SPAWN_BOUNDARY_RADIUS_FULL_LIGHT - shrink);
    const angle = randomRange(0, Math.PI * 2);

    const x = clamp(clusterCenter.x + Math.cos(angle) * radius, 0, WORLD_W);
    const y = clamp(clusterCenter.y + Math.sin(angle) * radius, 0, WORLD_H);

    return { x, y };
  }
}