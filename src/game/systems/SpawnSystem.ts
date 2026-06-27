// [File: src/game/systems/SpawnSystem.ts]
// [BLOCK: Spawn System — Phase 5 Chunk 5A]
// Pure logic, no Phaser dependency — GameScene calls update() each frame and
// instantiates Enemy objects from the returned requests.
//
// Phase 5 replaces the Phase 3/4 flat weighted roll entirely with the wave
// batch system from castle-party-phase5-plan.md Section 4:
//   - Every BATCH_WINDOW_SECONDS (2 min), a new batch type rolls and its
//     enemy type(s) are added to the ACCUMULATING active pool (stacking —
//     previously introduced types never leave).
//   - PRE_BATCH_PAUSE_SECONDS before each window boundary, spawning pauses
//     entirely (existing enemies keep acting — this system only gates new
//     spawn requests).
//   - The 4s±1s spawn rhythm within an active window is unchanged from
//     Phase 3/4.
//
// Within-batch weighting (Section 4's "Within-Batch Spawn Weights" table) is
// approximated with a recency-rank formula rather than a hardcoded table per
// batch count, since the table only gives illustrative examples (batch 2,
// batch 3) and says weights "normalize" by batch 5+. Rank-based weighting
// produces the same shape: dominant type(s) always rank 0 (highest weight),
// older types decay toward roughly-equal weight as more types stack in —
// matching the spec's "by batch 5+ all active types are roughly equal
// weight with the current batch slightly dominant." Flag for revisit if
// playtesting wants the exact percentages from the table instead of this
// approximation.
//
// Spawn boundary approximation (single ring around the cluster, contracting
// with Darkness Level) is unchanged from Phase 3 — see that file's original
// note, still a deliberate simplification.

import {
  WORLD_W,
  WORLD_H,
  SPAWN_INTERVAL_MS,
  SPAWN_VARIANCE_MS,
  BATCH_WINDOW_SECONDS,
  PRE_BATCH_PAUSE_SECONDS,
  BATCH_WEIGHT_UNDEAD,
  BATCH_WEIGHT_HUMAN,
  BATCH_WEIGHT_ELEMENTAL,
  BATCH_WEIGHT_MONSTER,
  BATCH_WEIGHT_MIXED,
  BATCH_SIZE_BY_DARKNESS_LEVEL,
  SPAWN_BOUNDARY_RADIUS_FULL_LIGHT,
  SPAWN_BOUNDARY_SHRINK_PER_LEVEL,
  SPAWN_BOUNDARY_MIN_RADIUS,
} from '@/game/config/constants';
import type { EnemyType } from '@/game/config/enemies';
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

// [BLOCK: Batch Roll Type]
// 'mixed' is not an EnemyType — it resolves to two co-dominant EnemyTypes
// at roll time (see rollBatchType / startNewBatch).
type BatchRoll = EnemyType | 'mixed';

const BATCH_ROLL_WEIGHTS: { type: BatchRoll; weight: number }[] = [
  { type: 'undead', weight: BATCH_WEIGHT_UNDEAD },
  { type: 'human', weight: BATCH_WEIGHT_HUMAN },
  { type: 'elemental', weight: BATCH_WEIGHT_ELEMENTAL },
  { type: 'monster', weight: BATCH_WEIGHT_MONSTER },
  { type: 'mixed', weight: BATCH_WEIGHT_MIXED },
];
const TOTAL_BATCH_ROLL_WEIGHT = BATCH_ROLL_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);

// Types eligible to be picked as the two pools combined by a 'mixed' roll.
const MIXED_CANDIDATE_TYPES: EnemyType[] = ['undead', 'human', 'elemental', 'monster'];

// [BLOCK: Elemental Morph Pool]
// One Morph is selected at random whenever Elemental becomes (co-)dominant.
// Per Section 5: "All three do not necessarily appear in the same window."
const MORPH_IDS = ['fire-morph', 'ice-morph', 'electric-morph'];

// [BLOCK: Within-Type Enemy Pools]
// Per-type spawn weights from Section 4 ("Undead — Skeleton, Zombie, Ghost
// occasional"; "Human — Knight 40% / Ranger 40% / Priest 20% per Section 8").
// Monster and Elemental pools confirmed fully in Chunks 5B/5C — Monster
// listed now since Spider/Slime configs already exist in enemies.ts.
const TYPE_ENEMY_POOLS: Record<Exclude<EnemyType, 'elemental'>, { id: string; weight: number }[]> = {
  undead: [
    { id: 'skeleton', weight: 60 },
    { id: 'zombie', weight: 30 },
    { id: 'ghost', weight: 10 }, // occasional — uncommon
  ],
  human: [
    { id: 'knight', weight: 40 },
    { id: 'ranger', weight: 40 },
    { id: 'priest', weight: 20 }, // uncommon
  ],
  monster: [
    { id: 'spider', weight: 50 },
    { id: 'slime', weight: 50 },
  ],
};

// [BLOCK: Active Type Tracking]
interface ActiveType {
  type: EnemyType;
  introducedAtBatch: number; // batch index (0-based) this type first stacked in
}

// [BLOCK: SpawnSystem Class]
export class SpawnSystem {
  // Spawn rhythm (4s ± 1s) — unchanged mechanic from Phase 3/4.
  private spawnElapsedMs: number = 0;
  private nextSpawnIntervalMs: number = SPAWN_INTERVAL_MS;

  // Batch window state.
  private windowElapsedMs: number = 0;
  private batchIndex: number = 0;       // increments every new batch roll
  private isPaused: boolean = false;

  // Stacking active pool — never shrinks during a run.
  private activeTypes: ActiveType[] = [];
  // Current window's dominant type(s) — 1 normally, 2 for a 'mixed' roll.
  private dominantTypes: EnemyType[] = [];
  // Locked morph id for the current/most recent Elemental dominance.
  private currentMorphId: string | null = null;

  constructor() {
    this.rollNextSpawnInterval();
    this.startNewBatch(); // "Run start — Batch 1 begins immediately" (Section 4 timing table)
  }

  // [BLOCK: Update]
  // Advances both the window timer and the spawn rhythm timer. Returns a
  // batch of spawn requests once the spawn rhythm interval elapses, unless
  // currently inside the pre-batch pause window (returns [] in that case).
  update(deltaSeconds: number, darknessLevel: number, clusterCenter: ClusterCenter): SpawnRequest[] {
    this.advanceBatchWindow(deltaSeconds);

    if (this.isPaused) {
      return [];
    }

    this.spawnElapsedMs += deltaSeconds * 1000;
    if (this.spawnElapsedMs < this.nextSpawnIntervalMs) {
      return [];
    }

    this.spawnElapsedMs = 0;
    this.rollNextSpawnInterval();

    return this.generateBatch(darknessLevel, clusterCenter);
  }

  // [BLOCK: Reset]
  // Called on run reset so a fresh run doesn't inherit stale batch/window state.
  reset(): void {
    this.spawnElapsedMs = 0;
    this.windowElapsedMs = 0;
    this.batchIndex = 0;
    this.isPaused = false;
    this.activeTypes = [];
    this.dominantTypes = [];
    this.currentMorphId = null;

    this.rollNextSpawnInterval();
    this.startNewBatch();
  }

  // [BLOCK: Is Paused — exposed for potential HUD "wave incoming" cue]
  get isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  // [BLOCK: Advance Batch Window]
  // Ticks the window timer, flips the pre-batch pause flag 20s before the
  // 2-minute mark, and rolls a new batch exactly at the mark.
  private advanceBatchWindow(deltaSeconds: number): void {
    this.windowElapsedMs += deltaSeconds * 1000;

    const windowMs = BATCH_WINDOW_SECONDS * 1000;
    const pauseStartMs = windowMs - PRE_BATCH_PAUSE_SECONDS * 1000;

    if (this.windowElapsedMs >= windowMs) {
      this.windowElapsedMs = 0;
      this.startNewBatch();
      this.isPaused = false;
      return;
    }

    this.isPaused = this.windowElapsedMs >= pauseStartMs;
  }

  // [BLOCK: Start New Batch]
  // Rolls the batch type, resolves it to one or two dominant EnemyTypes,
  // stacks any newly-introduced types into activeTypes, and (re)rolls the
  // Elemental Morph if Elemental is part of this window's dominance.
  private startNewBatch(): void {
    const roll = this.rollBatchType();

    if (roll === 'mixed') {
      const shuffled = [...MIXED_CANDIDATE_TYPES].sort(() => Math.random() - 0.5);
      this.dominantTypes = shuffled.slice(0, 2);
    } else {
      this.dominantTypes = [roll];
    }

    this.dominantTypes.forEach((type) => this.introduceType(type));

    if (this.dominantTypes.includes('elemental')) {
      this.currentMorphId = MORPH_IDS[Math.floor(Math.random() * MORPH_IDS.length)];
    }

    this.batchIndex++;
  }

  // [BLOCK: Introduce Type]
  // Adds a type to the stacking active pool if not already present.
  // Per Section 4: "Types do not replace each other — they stack."
  private introduceType(type: EnemyType): void {
    if (!this.activeTypes.some((a) => a.type === type)) {
      this.activeTypes.push({ type, introducedAtBatch: this.batchIndex });
    }
  }

  // [BLOCK: Roll Batch Type]
  // Weighted roll across the 5 batch types per Section 4's roll pool table.
  private rollBatchType(): BatchRoll {
    const roll = Math.random() * TOTAL_BATCH_ROLL_WEIGHT;
    let cumulative = 0;

    for (const entry of BATCH_ROLL_WEIGHTS) {
      cumulative += entry.weight;
      if (roll < cumulative) return entry.type;
    }

    return BATCH_ROLL_WEIGHTS[BATCH_ROLL_WEIGHTS.length - 1].type;
  }

  // [BLOCK: Generate Batch]
  // Unchanged sizing logic from Phase 3/4 — batch size still keys off
  // Darkness Level via BATCH_SIZE_BY_DARKNESS_LEVEL.
  private generateBatch(darknessLevel: number, clusterCenter: ClusterCenter): SpawnRequest[] {
    const clampedLevel = clamp(darknessLevel, 1, 7);
    const [min, max] = BATCH_SIZE_BY_DARKNESS_LEVEL[clampedLevel] ?? [1, 2];
    const batchSize = randomInt(min, max);

    const requests: SpawnRequest[] = [];
    for (let i = 0; i < batchSize; i++) {
      const enemyId = this.rollEnemyId();
      if (!enemyId) continue;

      const pos = this.rollSpawnPosition(clampedLevel, clusterCenter);
      requests.push({ enemyId, x: pos.x, y: pos.y });
    }

    return requests;
  }

  // [BLOCK: Roll Enemy Id]
  // Two-stage roll: first pick an active EnemyType weighted by recency rank
  // (dominant type(s) = rank 0 = highest weight; older types decay toward
  // equal weight as the pool grows — see file-header note on the
  // within-batch-weight approximation), then pick a concrete enemy id
  // within that type's pool.
  private rollEnemyId(): string | null {
    if (this.activeTypes.length === 0) return null;

    const n = this.activeTypes.length;
    const weighted = this.activeTypes.map((entry) => {
      const isDominant = this.dominantTypes.includes(entry.type);
      const age = this.batchIndex - 1 - entry.introducedAtBatch; // 0 = introduced this very batch
      const rank = isDominant ? 0 : age + 1;
      const weight = Math.max(1, n - rank);
      return { type: entry.type, weight };
    });

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;

    let chosenType: EnemyType = weighted[0].type;
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) {
        chosenType = w.type;
        break;
      }
    }

    return this.rollEnemyWithinType(chosenType);
  }

  // [BLOCK: Roll Enemy Within Type]
  private rollEnemyWithinType(type: EnemyType): string | null {
    if (type === 'elemental') {
      // Elemental batches spawn only the currently-rolled Morph — this can
      // be null if Elemental somehow got picked before ever being rolled as
      // dominant, which rollEnemyId's weighting makes structurally
      // impossible (a type only enters activeTypes via introduceType,
      // which only runs for dominant types), but guarded defensively.
      return this.currentMorphId;
    }

    const pool = TYPE_ENEMY_POOLS[type];
    if (!pool || pool.length === 0) return null;

    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    const roll = Math.random() * total;
    let cumulative = 0;

    for (const entry of pool) {
      cumulative += entry.weight;
      if (roll < cumulative) return entry.id;
    }

    return pool[pool.length - 1].id;
  }

  // [BLOCK: Roll Spawn Position]
  // Unchanged from Phase 3 — random point along the contracting boundary
  // ring around the cluster center.
  private rollSpawnPosition(darknessLevel: number, clusterCenter: ClusterCenter): { x: number; y: number } {
    const shrink = (darknessLevel - 1) * SPAWN_BOUNDARY_SHRINK_PER_LEVEL;
    const radius = Math.max(SPAWN_BOUNDARY_MIN_RADIUS, SPAWN_BOUNDARY_RADIUS_FULL_LIGHT - shrink);
    const angle = randomRange(0, Math.PI * 2);

    const x = clamp(clusterCenter.x + Math.cos(angle) * radius, 0, WORLD_W);
    const y = clamp(clusterCenter.y + Math.sin(angle) * radius, 0, WORLD_H);

    return { x, y };
  }

  // [BLOCK: Roll Next Spawn Interval]
  // Base 4s ± 1s variance, re-rolled after every spawn batch — unchanged.
  private rollNextSpawnInterval(): void {
    this.nextSpawnIntervalMs = SPAWN_INTERVAL_MS + randomRange(-SPAWN_VARIANCE_MS, SPAWN_VARIANCE_MS);
  }
}