//[File: src/game/config/heroes.ts]
// [BLOCK: Hero Config Types]

export type ResourceType = 'mana' | 'stamina' | 'hybrid';
export type HeroRole = 'Fighter' | 'Mage' | 'Marksman' | 'Tank' | 'Support';
export type AttackElement = 'physical' | 'fire' | 'ice' | 'electric' | 'magic';

export interface SkillConfig {
  key: 'Q' | 'E';
  name: string;
  description: string;
  resourceType: 'mana' | 'stamina';
  cost: number;        // % of pool (already at 50% shared-pool reduction)
  cooldown: number;    // seconds
}

export interface HeroConfig {
  id: string;
  name: string;
  roles: HeroRole[];
  resource: ResourceType;
  color: string;       // placeholder rectangle color
  description: string;

  // Base stats — from characters.md
  hp: number;
  attackDamage: number;
  attackSpeed: number;   // hits/sec for melee, seconds between shots for ranged
  defense: number;
  movementSpeed: number; // m/s (multiply by TILE_SIZE for px/s)
  mana?: number;         // % pool (always 100 if applicable)
  manaRegen?: number;    // %/sec
  stamina?: number;      // % pool (always 100 if applicable)
  staminaRegen?: number; // %/sec

  skills: [SkillConfig, SkillConfig];
}

// [BLOCK: Fencer Config]
// Role: Fighter | Resource: Stamina
// Aggressive melee brawler with wide attack cone and short defensive buff.

export const FENCER: HeroConfig = {
  id: 'fencer',
  name: 'Fencer',
  roles: ['Fighter'],
  resource: 'stamina',
  color: '#4a9eff',
  description: 'Aggressive melee brawler. High damage in a wide cone. Built for frontline combat.',

  hp: 150,
  attackDamage: 40,
  attackSpeed: 1.2,     // 1.2 hits/sec
  defense: 6,
  movementSpeed: 5,     // m/s
  stamina: 100,
  staminaRegen: 10,     // 10%/sec

  skills: [
    {
      key: 'Q',
      name: 'Barrage',
      description: '7 rapid slashes in 1.5 seconds. 12 damage each (84 total if all connect).',
      resourceType: 'stamina',
      cost: 15,         // 15% stamina (50% reduced from base 30%)
      cooldown: 4,
    },
    {
      key: 'E',
      name: 'War Cry',
      description: '+25% Attack Speed, +25% Attack Damage, +25% Defense for 5 seconds.',
      resourceType: 'stamina',
      cost: 10,         // 10% stamina (50% reduced from base 20%)
      cooldown: 3,
    },
  ],
};

// [BLOCK: Sorceress Config]
// Role: Mage | Resource: Mana
// High-damage ranged spellcaster. Random elemental shots. AoE skills.

export const SORCERESS: HeroConfig = {
  id: 'sorceress',
  name: 'Sorceress',
  roles: ['Mage'],
  resource: 'mana',
  color: '#c44aff',
  description: 'High-damage ranged spellcaster. Fires random elemental projectiles. AoE crowd control.',

  hp: 100,
  attackDamage: 50,
  attackSpeed: 1 / 1.5,  // 1 shot per 1.5 sec ≈ 0.667 hits/sec
  defense: 4,
  movementSpeed: 4,       // m/s
  mana: 100,
  manaRegen: 10,          // 10%/sec

  skills: [
    {
      key: 'Q',
      name: 'Meteor Shower',
      description: '7 meteors targeting 7 nearest enemies. 80 damage each. 3 second delay before impact.',
      resourceType: 'mana',
      cost: 15,         // 15% mana (50% reduced from base 30%)
      cooldown: 4,
    },
    {
      key: 'E',
      name: 'Blackhole',
      description: 'Gravitational vortex that pulls enemies within 2m. 25 damage/sec for 2.5 seconds.',
      resourceType: 'mana',
      cost: 15,         // 15% mana (50% reduced from base 30%)
      cooldown: 3,
    },
  ],
};

// [BLOCK: Priestess Config]
// Role: Support | Resource: Mana
// Squad sustainer and force multiplier. Dual-purpose skills help allies and punish enemies.

export const PRIESTESS: HeroConfig = {
  id: 'priestess',
  name: 'Priestess',
  roles: ['Support'],
  resource: 'mana',
  color: '#ffdd4a',
  description: 'Squad sustainer. Low damage but keeps the team alive and amplifies their output.',

  hp: 80,
  attackDamage: 30,
  attackSpeed: 1 / 2,  // 1 shot per 2 sec = 0.5 hits/sec
  defense: 4,
  movementSpeed: 4,    // m/s
  mana: 100,
  manaRegen: 15,       // 15%/sec (higher than other mana users)

  skills: [
    {
      key: 'Q',
      name: 'Sacred Pulse',
      description: 'Heals all heroes 50% max HP. Drains nearby enemies (within 3m) for 30% current HP.',
      resourceType: 'mana',
      cost: 15,         // 15% mana (50% reduced from base 30%)
      cooldown: 4,
    },
    {
      key: 'E',
      name: 'Divine Surge',
      description: '+30% all stats for all heroes for 5 sec. -15% all stats for enemies within 3m for 2 sec.',
      resourceType: 'mana',
      cost: 12.5,       // 12.5% mana (50% reduced from base 25%)
      cooldown: 3,
    },
  ],
};

// [BLOCK: Hero Roster — Upcoming (Stubs)]
// Not yet designed. Entries exist so config imports don't fail.

export const NECROMANCER: Partial<HeroConfig> = {
  id: 'necromancer',
  name: 'Necromancer',
  roles: ['Mage', 'Support'],
  resource: 'mana',
  color: '#44ff88',
  description: 'TBD — Summons undead and reanimates fallen enemies.',
};

export const BATTLE_MAGE: Partial<HeroConfig> = {
  id: 'battle-mage',
  name: 'Battle Mage',
  roles: ['Tank', 'Support'],
  resource: 'hybrid',
  color: '#ff8844',
  description: 'TBD — Mana shield for all heroes. Battle Cry stuns nearby enemies.',
};

export const DRAW: Partial<HeroConfig> = {
  id: 'draw',
  name: 'Draw',
  roles: ['Marksman'],
  resource: 'stamina',
  color: '#88ddff',
  description: 'TBD — Skills not yet designed.',
};

export const JUGGERNAUT: Partial<HeroConfig> = {
  id: 'juggernaut',
  name: 'Juggernaut',
  roles: ['Fighter', 'Tank'],
  resource: 'stamina',
  color: '#ff4444',
  description: 'TBD — Skills not yet designed.',
};

// [BLOCK: Active Prototype Roster]
// Only these 3 are selectable in Phase 1.

export const HERO_ROSTER: HeroConfig[] = [FENCER, SORCERESS, PRIESTESS];