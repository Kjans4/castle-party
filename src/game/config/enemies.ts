//[FILE: src/game/config/enemies.ts]
// [BLOCK: Enemy Config Types]

export type EnemyRarity = 'common' | 'uncommon' | 'rare';
export type EnemyType = 'undead' | 'human' | 'elemental' | 'monster';
export type AttackElement = 'physical' | 'fire' | 'ice' | 'electric' | 'magic';
export type ResistanceRule = 'random' | 'none' | 'physical' | 'fire' | 'ice' | 'electric' | 'magic';

export interface EnemyConfig {
  id: string;
  name: string;
  type: EnemyType;
  rarity: EnemyRarity;
  hp: number;
  attackDamage: number;
  attackElement: AttackElement;
  movementSpeed: number;        // m/s
  resistance: ResistanceRule;   // 'random' = rolls at spawn; locked = always that element
  spawnBatch: EnemyType;
  special?: string;             // description of death mechanic or unique behavior
  onDeath?: () => void;         // stub — implemented in Phase 4
}

// [BLOCK: Undead Enemies]

export const SKELETON: EnemyConfig = {
  id: 'skeleton',
  name: 'Skeleton',
  type: 'undead',
  rarity: 'common',
  hp: 30,
  attackDamage: 5,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 2.5, // TBD — placeholder
  resistance: 'random',
  spawnBatch: 'undead',
};

export const ZOMBIE: EnemyConfig = {
  id: 'zombie',
  name: 'Zombie',
  type: 'undead',
  rarity: 'common',
  hp: 50,
  attackDamage: 7,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 1.5, // TBD — slower than skeleton
  resistance: 'random',
  spawnBatch: 'undead',
};

export const GHOST: EnemyConfig = {
  id: 'ghost',
  name: 'Ghost',
  type: 'undead',
  rarity: 'uncommon',
  hp: 40,
  attackDamage: 6,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 2,   // TBD — placeholder
  resistance: 'physical', // locked — always physical resistant; only magic damages it
  spawnBatch: 'undead',
  special: 'Physical damage immunity (locked). Must be damaged by magic.',
};

// [BLOCK: Human Enemies]

export const KNIGHT: EnemyConfig = {
  id: 'knight',
  name: 'Knight',
  type: 'human',
  rarity: 'common',
  hp: 80,
  attackDamage: 10,   // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 2,   // TBD — placeholder
  resistance: 'random',
  spawnBatch: 'human',
};

export const RANGER: EnemyConfig = {
  id: 'ranger',
  name: 'Ranger',
  type: 'human',
  rarity: 'common',
  hp: 40,
  attackDamage: 8,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 2.5, // TBD — placeholder
  resistance: 'random',
  spawnBatch: 'human',
  special: 'Ranged attacks against heroes. Must still close to 3m to attack beacons.',
};

export const PRIEST: EnemyConfig = {
  id: 'priest',
  name: 'Priest',
  type: 'human',
  rarity: 'uncommon',
  hp: 30,
  attackDamage: 7,    // TBD — placeholder
  attackElement: 'magic', // actual element assigned at spawn: fire, ice, or electric
  movementSpeed: 2,   // TBD — placeholder
  resistance: 'random',
  spawnBatch: 'human',
  special: 'Elemental attack type (fire/ice/electric) assigned at spawn.',
};

// [🧱 BLOCK: Elemental Enemies]

export const FIRE_MORPH: EnemyConfig = {
  id: 'fire-morph',
  name: 'Fire Morph',
  type: 'elemental',
  rarity: 'rare',
  hp: 60,
  attackDamage: 9,    // TBD — placeholder
  attackElement: 'fire',
  movementSpeed: 3,   // TBD — placeholder
  resistance: 'fire', // locked — immune to all fire damage
  spawnBatch: 'elemental',
};

export const ICE_MORPH: EnemyConfig = {
  id: 'ice-morph',
  name: 'Ice Morph',
  type: 'elemental',
  rarity: 'rare',
  hp: 60,
  attackDamage: 9,    // TBD — placeholder
  attackElement: 'ice',
  movementSpeed: 2.5, // TBD — placeholder
  resistance: 'ice',  // locked — immune to all ice damage
  spawnBatch: 'elemental',
};

export const ELECTRIC_MORPH: EnemyConfig = {
  id: 'electric-morph',
  name: 'Electric Morph',
  type: 'elemental',
  rarity: 'rare',
  hp: 60,
  attackDamage: 9,    // TBD — placeholder
  attackElement: 'electric',
  movementSpeed: 3.5, // TBD — placeholder
  resistance: 'electric', // locked — immune to all electric damage
  spawnBatch: 'elemental',
};

// [BLOCK: Monster Enemies]

export const SPIDER: EnemyConfig = {
  id: 'spider',
  name: 'Spider',
  type: 'monster',
  rarity: 'common',
  hp: 50,
  attackDamage: 8,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 3,   // TBD — placeholder
  resistance: 'random',
  spawnBatch: 'monster',
  special: 'On death: spawns 4 Mini Spiders targeting the killing hero.',
  onDeath: () => { /* Phase 4: spawn 4 MINI_SPIDER targeting killer */ },
};

export const MINI_SPIDER: EnemyConfig = {
  id: 'mini-spider',
  name: 'Mini Spider',
  type: 'monster',
  rarity: 'common',   // spawned, not batched
  hp: 20,
  attackDamage: 4,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 4,   // TBD — faster than parent
  resistance: 'none', // locked — never has resistance
  spawnBatch: 'monster',
  special: 'Targets the killing hero only. Does not target beacons.',
};

export const SLIME: EnemyConfig = {
  id: 'slime',
  name: 'Slime',
  type: 'monster',
  rarity: 'common',
  hp: 60,
  attackDamage: 8,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 1.5, // TBD — slow but tanky
  resistance: 'random',
  spawnBatch: 'monster',
  special: 'On death: spawns 4 Mini Slimes targeting the killing hero.',
  onDeath: () => { /* Phase 4: spawn 4 MINI_SLIME targeting killer */ },
};

export const MINI_SLIME: EnemyConfig = {
  id: 'mini-slime',
  name: 'Mini Slime',
  type: 'monster',
  rarity: 'common',   // spawned, not batched
  hp: 20,
  attackDamage: 4,    // TBD — placeholder
  attackElement: 'physical',
  movementSpeed: 2.5, // TBD — placeholder
  resistance: 'none', // locked — never has resistance
  spawnBatch: 'monster',
  special: 'Targets the killing hero only. Does not target beacons.',
};

// [BLOCK: Enemy Roster]
export const ENEMY_ROSTER: EnemyConfig[] = [
  SKELETON, ZOMBIE, GHOST,
  KNIGHT, RANGER, PRIEST,
  FIRE_MORPH, ICE_MORPH, ELECTRIC_MORPH,
  SPIDER, MINI_SPIDER, SLIME, MINI_SLIME,
];