//[FILE: src/game/config/upgrades.ts]
// [BLOCK: Upgrade Config Types]

export type UpgradeRarity = 'common' | 'rare' | 'legendary';
export type UpgradeCategory = 'stat' | 'resource' | 'gameplay' | 'spell';

export interface UpgradeConfig {
  id: string;
  name: string;
  category: UpgradeCategory;
  rarity: UpgradeRarity;
  description: string;
  tier: 1 | 2 | 3;
  evolvesFrom?: string;      // id of the upgrade this evolves from
  effect: () => void;        // stub — Phase 5 implementation
}

export interface SpellConfig {
  id: string;
  name: string;
  type: 'external' | 'internal';
  subType: 'damage' | 'cc' | 'heal' | 'boost' | 'shield';
  attackElement?: 'fire' | 'ice' | 'electric' | 'magic';
  description: string;
  cooldownShared: number;    // always 5 seconds (shared spell cooldown)
  effect: () => void;        // stub — Phase 5 implementation
}

// [BLOCK: Spell Roster]
// 7 party spells. Player assembles up to 3 per run through card draft.
// Spells have no rarity and no expiry — can appear any number of times in draft.
// All spells share a single 5-second cooldown.

export const SPELL_FIREBALL: SpellConfig = {
  id: 'spell-fireball',
  name: 'Fireball',
  type: 'external',
  subType: 'damage',
  attackElement: 'fire',
  description: 'Blazing ball of fire that explodes on impact. AoE fire damage.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: AoE fire damage at target location */ },
};

export const SPELL_FREEZE: SpellConfig = {
  id: 'spell-freeze',
  name: 'Freeze',
  type: 'external',
  subType: 'cc',
  attackElement: 'ice',
  description: 'Burst of frost that freezes all enemies within radius. Immobilizes briefly.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: freeze enemies in AoE radius */ },
};

export const SPELL_LIGHTNING_STRIKE: SpellConfig = {
  id: 'spell-lightning-strike',
  name: 'Lightning Strike',
  type: 'external',
  subType: 'damage',
  attackElement: 'electric',
  description: 'Calls down lightning targeting enemies in radius. Struck enemies pause for 1 second.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: electric AoE + 1sec stun around active leader */ },
};

export const SPELL_BLESSING: SpellConfig = {
  id: 'spell-blessing',
  name: 'Blessing',
  type: 'internal',
  subType: 'heal',
  description: 'Wave of holy energy. Heals all heroes gradually over 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: HoT on all heroes for 10 seconds */ },
};

export const SPELL_BERSERK: SpellConfig = {
  id: 'spell-berserk',
  name: 'Berserk',
  type: 'internal',
  subType: 'boost',
  description: 'Battle fury. Increases attack damage of all heroes for 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: +% attack damage all heroes for 10s */ },
};

export const SPELL_GUARDIAN: SpellConfig = {
  id: 'spell-guardian',
  name: 'Guardian',
  type: 'internal',
  subType: 'shield',
  description: 'Protective barrier. Increases defense of all heroes for 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: +% defense all heroes for 10s */ },
};

export const SPELL_RELENTLESS: SpellConfig = {
  id: 'spell-relentless',
  name: 'Relentless',
  type: 'internal',
  subType: 'boost',
  description: 'Removes all resource costs and reduces skill cooldowns by 30% for 15 seconds.',
  cooldownShared: 5,
  effect: () => { /* Phase 5: zero mana/stamina cost + 30% CDR for 15s */ },
};

export const SPELL_ROSTER: SpellConfig[] = [
  SPELL_FIREBALL,
  SPELL_FREEZE,
  SPELL_LIGHTNING_STRIKE,
  SPELL_BLESSING,
  SPELL_BERSERK,
  SPELL_GUARDIAN,
  SPELL_RELENTLESS,
];

// [BLOCK: Upgrade Pool — Stubs]
// Full upgrade cards with stat values and evolution tiers are TBD.
// Stubs here so the upgrade system can import from this file without errors.
// Categories: stat / resource / gameplay — see upgrades.md for full design.

export const UPGRADE_POOL: UpgradeConfig[] = [
  // Stat upgrades
  { id: 'hp-t1', name: 'Vitality I', category: 'stat', rarity: 'common', description: '+Max HP for all heroes.', tier: 1, effect: () => {} },
  { id: 'hp-t2', name: 'Vitality II', category: 'stat', rarity: 'common', description: '+Max HP for all heroes (stronger).', tier: 2, evolvesFrom: 'hp-t1', effect: () => {} },
  { id: 'hp-t3', name: 'Vitality III', category: 'stat', rarity: 'common', description: '+Max HP for all heroes (strongest) + bonus effect.', tier: 3, evolvesFrom: 'hp-t2', effect: () => {} },

  { id: 'atk-t1', name: 'Sharpness I', category: 'stat', rarity: 'common', description: '+% Attack Damage all heroes.', tier: 1, effect: () => {} },
  { id: 'atk-t2', name: 'Sharpness II', category: 'stat', rarity: 'common', description: '+% Attack Damage all heroes (stronger).', tier: 2, evolvesFrom: 'atk-t1', effect: () => {} },
  { id: 'atk-t3', name: 'Sharpness III', category: 'stat', rarity: 'common', description: '+% Attack Damage all heroes (strongest) + bonus.', tier: 3, evolvesFrom: 'atk-t2', effect: () => {} },

  { id: 'spd-t1', name: 'Swiftness I', category: 'stat', rarity: 'common', description: '+Movement Speed all heroes.', tier: 1, effect: () => {} },
  { id: 'spd-t2', name: 'Swiftness II', category: 'stat', rarity: 'common', description: '+Movement Speed all heroes (stronger).', tier: 2, evolvesFrom: 'spd-t1', effect: () => {} },
  { id: 'spd-t3', name: 'Swiftness III', category: 'stat', rarity: 'common', description: '+Movement Speed all heroes (strongest) + bonus.', tier: 3, evolvesFrom: 'spd-t2', effect: () => {} },

  // Resource upgrades
  { id: 'cdr-t1', name: 'Focus I', category: 'resource', rarity: 'rare', description: '-% Cooldown on all hero skills.', tier: 1, effect: () => {} },
  { id: 'cdr-t2', name: 'Focus II', category: 'resource', rarity: 'rare', description: '-% Cooldown on all hero skills (stronger).', tier: 2, evolvesFrom: 'cdr-t1', effect: () => {} },
  { id: 'cdr-t3', name: 'Focus III', category: 'resource', rarity: 'rare', description: '-% Cooldown on all hero skills (strongest) + bonus.', tier: 3, evolvesFrom: 'cdr-t2', effect: () => {} },

  // Gameplay modifiers
  { id: 'projectile-t1', name: 'Multishot I', category: 'gameplay', rarity: 'rare', description: '+1 Projectile to all ranged heroes.', tier: 1, effect: () => {} },
  { id: 'projectile-t2', name: 'Multishot II', category: 'gameplay', rarity: 'rare', description: '+1 Projectile to all ranged heroes (total +2).', tier: 2, evolvesFrom: 'projectile-t1', effect: () => {} },
  { id: 'projectile-t3', name: 'Multishot III', category: 'gameplay', rarity: 'legendary', description: '+1 Projectile to all ranged heroes (total +3) + bonus.', tier: 3, evolvesFrom: 'projectile-t2', effect: () => {} },

  { id: 'beacon-hp-t1', name: 'Fortification I', category: 'gameplay', rarity: 'common', description: '+Beacon max HP.', tier: 1, effect: () => {} },
  { id: 'beacon-hp-t2', name: 'Fortification II', category: 'gameplay', rarity: 'common', description: '+Beacon max HP (stronger).', tier: 2, evolvesFrom: 'beacon-hp-t1', effect: () => {} },
  { id: 'beacon-hp-t3', name: 'Fortification III', category: 'gameplay', rarity: 'rare', description: '+Beacon max HP (strongest) + faster beacon heal rate.', tier: 3, evolvesFrom: 'beacon-hp-t2', effect: () => {} },
];