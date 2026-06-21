//[FILE: src/game/config/waves.ts]
// [BLOCK: Wave Config Types]
// Batch schedule stub — full implementation in Phase 4 (enemy spawning).
// Each batch window introduces up to 3 enemy types.
// New types stack — by late game all introduced types are active simultaneously.

import type { EnemyType } from './enemies';

export type BatchRollResult = EnemyType | 'mixed';

export interface WaveBatch {
  id: string;
  startTimeSeconds: number;   // when this batch window begins
  endTimeSeconds: number;     // when the next batch window begins
  primaryType: BatchRollResult;
  enemyIds: string[];         // which enemy configs are in this batch
  notes?: string;
}

// [BLOCK: Batch Schedule Stub]
// Full enemy IDs and spawn weights are TBD — balanced in Phase 4.
// Structure matches gameplay.md Section 9.

export const WAVE_BATCHES: WaveBatch[] = [
  {
    id: 'batch-1',
    startTimeSeconds: 0,
    endTimeSeconds: 120,
    primaryType: 'undead',
    enemyIds: ['skeleton', 'zombie'], // ghost occasional
    notes: 'Opening batch — basic undead only. Low pressure.',
  },
  {
    id: 'batch-2',
    startTimeSeconds: 120,
    endTimeSeconds: 240,
    primaryType: 'human',
    enemyIds: ['skeleton', 'zombie', 'knight', 'ranger'], // priest occasional
    notes: 'Humans introduced. Undead still active.',
  },
  {
    id: 'batch-3',
    startTimeSeconds: 240,
    endTimeSeconds: 360,
    primaryType: 'monster',
    enemyIds: ['skeleton', 'zombie', 'knight', 'ranger', 'spider', 'slime'],
    notes: 'Monsters introduced. Death-spawn mechanics begin.',
  },
  {
    id: 'batch-4',
    startTimeSeconds: 360,
    endTimeSeconds: 480,
    primaryType: 'undead',
    enemyIds: ['skeleton', 'zombie', 'ghost', 'knight', 'ranger', 'spider', 'slime'],
    notes: 'Ghosts introduced. Magic requirement begins.',
  },
  // Batches 5–10 (8:00–20:00): TBD in Phase 4
  // Elemental morphs introduced at some point in mid game
  // Priests introduced in mid game
  // Dawn Surge at 19:00 — max spawn rate
];

// [BLOCK: Spawn Rhythm]
// Enemies spawn every 4 seconds (±1s variance) within an active batch.
// Batch type rolls occur at each 2-minute mark — see SpawnSystem (Phase 4).
export const SPAWN_RHYTHM_MS = 4000;
export const SPAWN_VARIANCE_MS = 1000;