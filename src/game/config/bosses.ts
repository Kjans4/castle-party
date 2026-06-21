//[FILE: src/game/config/bosses.ts]
// [BLOCK: Boss Config Types]

export interface BossConfig {
  id: string;
  name: string;
  spawnTimeSeconds: number;  // when in the run this boss appears
  hp: number;                // TBD — scales with Chaos + Darkness
  attackDamage: number;      // TBD
  movementSpeed: number;     // TBD
  isFinalBoss: boolean;      // true only for Boss 5 (Dawn Breaker)
  unlockReward?: string;     // TBD — Chronicle page / hero / weapon / charm
}

// [BLOCK: Boss 1–4 Stubs]
// Basic tank behavior in prototype — large hitbox, high HP, moves toward nearest beacon.
// Horde continues spawning alongside Bosses 1–4.

export const BOSS_1: BossConfig = {
  id: 'boss-1',
  name: 'TBD',
  spawnTimeSeconds: 240,   // 4:00
  hp: 500,                 // TBD — placeholder
  attackDamage: 20,        // TBD — placeholder
  movementSpeed: 1.5,      // TBD — placeholder
  isFinalBoss: false,
  unlockReward: 'TBD',
};

export const BOSS_2: BossConfig = {
  id: 'boss-2',
  name: 'TBD',
  spawnTimeSeconds: 480,   // 8:00
  hp: 750,                 // TBD — placeholder
  attackDamage: 25,        // TBD — placeholder
  movementSpeed: 1.5,      // TBD — placeholder
  isFinalBoss: false,
  unlockReward: 'TBD',
};

export const BOSS_3: BossConfig = {
  id: 'boss-3',
  name: 'TBD',
  spawnTimeSeconds: 720,   // 12:00
  hp: 1000,                // TBD — placeholder
  attackDamage: 30,        // TBD — placeholder
  movementSpeed: 1.5,      // TBD — placeholder
  isFinalBoss: false,
  unlockReward: 'TBD',
};

export const BOSS_4: BossConfig = {
  id: 'boss-4',
  name: 'TBD',
  spawnTimeSeconds: 960,   // 16:00
  hp: 1250,                // TBD — placeholder
  attackDamage: 35,        // TBD — placeholder
  movementSpeed: 1.5,      // TBD — placeholder
  isFinalBoss: false,
  unlockReward: 'TBD',
};

// [BLOCK: Boss 5 — The Dawn Breaker]
// Final boss. Varies per run. Horde clears when it spawns.
// HP scales with beacon state at 19:00 — more beacons lit = reduced power.

export const BOSS_5_DAWN_BREAKER: BossConfig = {
  id: 'boss-5-dawn-breaker',
  name: 'The Dawn Breaker',
  spawnTimeSeconds: 1140,  // ~19:00
  hp: 2000,                // TBD — scales with beacon state at spawn
  attackDamage: 50,        // TBD — placeholder
  movementSpeed: 2,        // TBD — placeholder
  isFinalBoss: true,
  unlockReward: 'TBD',
};

// [BLOCK: Boss Roster]
export const BOSS_ROSTER: BossConfig[] = [
  BOSS_1, BOSS_2, BOSS_3, BOSS_4, BOSS_5_DAWN_BREAKER,
];