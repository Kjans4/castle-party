//[FILE: src/game/config/upgrades.ts]
// [BLOCK: Upgrade Config Types]
//
// Phase 6 Chunk 6A: `effect` stubs replaced with real modifier-applying
// functions. Every upgrade effect receives the full hero roster and applies
// a permanent (duration: undefined) Modifier to the relevant Stat via the
// existing Stat + Modifier system — see castle-party-phase6-plan.md Section 5.
//
// Tier values follow the plan's "Confirmed Upgrade Values" table exactly.
// Modifier ids are unique per upgrade LINE (not per tier) so re-picking a
// higher tier of the same line cleanly replaces the prior modifier (Stat.
// addModifier already dedupes by id) rather than stacking redundantly.

import type { Hero } from '@/game/entities/Hero';
import { flatModifier, percentModifier } from '@/game/primitives/Modifier';

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
  effect: (heroes: Hero[]) => void;
}

export interface SpellConfig {
  id: string;
  name: string;
  type: 'external' | 'internal';
  subType: 'damage' | 'cc' | 'heal' | 'boost' | 'shield';
  attackElement?: 'fire' | 'ice' | 'electric' | 'magic';
  description: string;
  cooldownShared: number;    // always 5 seconds (shared spell cooldown)
  effect: () => void;        // stub — Phase 6 Chunk 6B implementation
}

// [BLOCK: Spell Roster]
// 7 party spells. Player assembles up to 3 per run through card draft.
// Spells have no rarity and no expiry — can appear any number of times in draft.
// All spells share a single 5-second cooldown.
// NOTE: effect remains a stub in Chunk 6A — spell cards are draftable and
// land in activeSpells, but casting (Z key) and the actual spell behaviors
// are Chunk 6B scope per the agreed plan.

export const SPELL_FIREBALL: SpellConfig = {
  id: 'spell-fireball',
  name: 'Fireball',
  type: 'external',
  subType: 'damage',
  attackElement: 'fire',
  description: 'Blazing ball of fire that explodes on impact. AoE fire damage.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: AoE fire damage at target location */ },
};

export const SPELL_FREEZE: SpellConfig = {
  id: 'spell-freeze',
  name: 'Freeze',
  type: 'external',
  subType: 'cc',
  attackElement: 'ice',
  description: 'Burst of frost that freezes all enemies within radius. Immobilizes briefly.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: freeze enemies in AoE radius */ },
};

export const SPELL_LIGHTNING_STRIKE: SpellConfig = {
  id: 'spell-lightning-strike',
  name: 'Lightning Strike',
  type: 'external',
  subType: 'damage',
  attackElement: 'electric',
  description: 'Calls down lightning targeting enemies in radius. Struck enemies pause for 1 second.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: electric AoE + 1sec stun around active leader */ },
};

export const SPELL_BLESSING: SpellConfig = {
  id: 'spell-blessing',
  name: 'Blessing',
  type: 'internal',
  subType: 'heal',
  description: 'Wave of holy energy. Heals all heroes gradually over 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: HoT on all heroes for 10 seconds */ },
};

export const SPELL_BERSERK: SpellConfig = {
  id: 'spell-berserk',
  name: 'Berserk',
  type: 'internal',
  subType: 'boost',
  description: 'Battle fury. Increases attack damage of all heroes for 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: +% attack damage all heroes for 10s */ },
};

export const SPELL_GUARDIAN: SpellConfig = {
  id: 'spell-guardian',
  name: 'Guardian',
  type: 'internal',
  subType: 'shield',
  description: 'Protective barrier. Increases defense of all heroes for 10 seconds.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: +% defense all heroes for 10s */ },
};

export const SPELL_RELENTLESS: SpellConfig = {
  id: 'spell-relentless',
  name: 'Relentless',
  type: 'internal',
  subType: 'boost',
  description: 'Removes all resource costs and reduces skill cooldowns by 30% for 15 seconds.',
  cooldownShared: 5,
  effect: () => { /* Chunk 6B: zero mana/stamina cost + 30% CDR for 15s */ },
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

// [BLOCK: Apply To All Heroes Helper]
// Shared application loop — every stat upgrade in this file follows the
// same "apply one modifier to one stat on every hero" shape. Typed loosely
// against Stat's addModifier signature since both flatModifier and
// percentModifier return the same Modifier class.
function applyToAllHeroes(
  heroes: Hero[],
  statPicker: (hero: Hero) => { addModifier: (m: ReturnType<typeof percentModifier>) => void },
  modifier: ReturnType<typeof percentModifier> | ReturnType<typeof flatModifier>
): void {
  heroes.forEach((hero) => {
    statPicker(hero).addModifier(modifier as ReturnType<typeof percentModifier>);
  });
}

// [BLOCK: Upgrade Pool]
// Full upgrade cards with real effects. Categories: stat / resource / gameplay
// — see castle-party-phase6-plan.md Section 5 for the confirmed value table.

export const UPGRADE_POOL: UpgradeConfig[] = [
  // [BLOCK: Vitality Line — +Max HP]
  {
    id: 'hp-t1', name: 'Vitality I', category: 'stat', rarity: 'common',
    description: '+15% Max HP for all heroes.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.hpStat, percentModifier('vitality-line', 15, 'upgrade')),
  },
  {
    id: 'hp-t2', name: 'Vitality II', category: 'stat', rarity: 'common',
    description: '+20% Max HP for all heroes.', tier: 2, evolvesFrom: 'hp-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.hpStat, percentModifier('vitality-line', 20, 'upgrade')),
  },
  {
    id: 'hp-t3', name: 'Vitality III', category: 'stat', rarity: 'common',
    description: '+25% Max HP for all heroes.', tier: 3, evolvesFrom: 'hp-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.hpStat, percentModifier('vitality-line', 25, 'upgrade')),
  },

  // [BLOCK: Sharpness Line — +Attack Damage]
  {
    id: 'atk-t1', name: 'Sharpness I', category: 'stat', rarity: 'common',
    description: '+10% Attack Damage all heroes.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackDamageStat, percentModifier('sharpness-line', 10, 'upgrade')),
  },
  {
    id: 'atk-t2', name: 'Sharpness II', category: 'stat', rarity: 'common',
    description: '+15% Attack Damage all heroes.', tier: 2, evolvesFrom: 'atk-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackDamageStat, percentModifier('sharpness-line', 15, 'upgrade')),
  },
  {
    id: 'atk-t3', name: 'Sharpness III', category: 'stat', rarity: 'common',
    description: '+20% Attack Damage all heroes.', tier: 3, evolvesFrom: 'atk-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackDamageStat, percentModifier('sharpness-line', 20, 'upgrade')),
  },

  // [BLOCK: Swiftness Line — +Movement Speed]
  {
    id: 'spd-t1', name: 'Swiftness I', category: 'stat', rarity: 'common',
    description: '+10% Movement Speed all heroes.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.speedStat, percentModifier('swiftness-line', 10, 'upgrade')),
  },
  {
    id: 'spd-t2', name: 'Swiftness II', category: 'stat', rarity: 'common',
    description: '+15% Movement Speed all heroes.', tier: 2, evolvesFrom: 'spd-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.speedStat, percentModifier('swiftness-line', 15, 'upgrade')),
  },
  {
    id: 'spd-t3', name: 'Swiftness III', category: 'stat', rarity: 'common',
    description: '+20% Movement Speed all heroes.', tier: 3, evolvesFrom: 'spd-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.speedStat, percentModifier('swiftness-line', 20, 'upgrade')),
  },

  // [BLOCK: Iron Skin Line — +Flat Defense]
  {
    id: 'def-t1', name: 'Iron Skin I', category: 'stat', rarity: 'common',
    description: '+3 flat Defense all heroes.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.defenseStat, flatModifier('ironskin-line', 3, 'upgrade')),
  },
  {
    id: 'def-t2', name: 'Iron Skin II', category: 'stat', rarity: 'common',
    description: '+4 flat Defense all heroes.', tier: 2, evolvesFrom: 'def-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.defenseStat, flatModifier('ironskin-line', 4, 'upgrade')),
  },
  {
    id: 'def-t3', name: 'Iron Skin III', category: 'stat', rarity: 'common',
    description: '+5 flat Defense all heroes.', tier: 3, evolvesFrom: 'def-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.defenseStat, flatModifier('ironskin-line', 5, 'upgrade')),
  },

  // [BLOCK: Attack Speed Line]
  {
    id: 'aspd-t1', name: 'Attack Speed I', category: 'stat', rarity: 'common',
    description: '+10% Attack Speed all heroes.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackSpeedStat, percentModifier('aspd-line', 10, 'upgrade')),
  },
  {
    id: 'aspd-t2', name: 'Attack Speed II', category: 'stat', rarity: 'common',
    description: '+15% Attack Speed all heroes.', tier: 2, evolvesFrom: 'aspd-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackSpeedStat, percentModifier('aspd-line', 15, 'upgrade')),
  },
  {
    id: 'aspd-t3', name: 'Attack Speed III', category: 'stat', rarity: 'common',
    description: '+20% Attack Speed all heroes.', tier: 3, evolvesFrom: 'aspd-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.attackSpeedStat, percentModifier('aspd-line', 20, 'upgrade')),
  },

  // [BLOCK: Focus Line — Cooldown Reduction]
  // GAP, flagged per decision #3 (skill cooldowns stay raw numbers, not
  // Stats): there is currently no call site that reads a CDR percent when
  // resetting a skill's cooldown — that logic doesn't exist until Chunk 6B
  // adds Q/E activation to Hero.ts. This effect is a documented no-op so the
  // upgrade is real and draftable now, but inert until 6B reads its owned
  // status (via ownedUpgrades in the store) and applies the percent at
  // cooldown-reset time.
  {
    id: 'cdr-t1', name: 'Focus I', category: 'resource', rarity: 'rare',
    description: '-10% Cooldown on all hero skills. (Applied in Chunk 6B skill cooldown reset logic.)', tier: 1,
    effect: () => { /* Chunk 6B: read as a raw percent at skill cooldown reset, not via Stat */ },
  },
  {
    id: 'cdr-t2', name: 'Focus II', category: 'resource', rarity: 'rare',
    description: '-15% Cooldown on all hero skills. (Applied in Chunk 6B skill cooldown reset logic.)', tier: 2, evolvesFrom: 'cdr-t1',
    effect: () => { /* Chunk 6B */ },
  },
  {
    id: 'cdr-t3', name: 'Focus III', category: 'resource', rarity: 'rare',
    description: '-20% Cooldown on all hero skills. (Applied in Chunk 6B skill cooldown reset logic.)', tier: 3, evolvesFrom: 'cdr-t2',
    effect: () => { /* Chunk 6B */ },
  },

  // [BLOCK: Clarity Line — Mana Cost Reduction]
  // Same deferral — needs the SharedPool.consumeExact() call site that
  // Chunk 6B adds for Mana/Stamina costs. No-op placeholder for now.
  {
    id: 'clarity-t1', name: 'Clarity I', category: 'resource', rarity: 'rare',
    description: '-10% Mana cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 1,
    effect: () => { /* Chunk 6B */ },
  },
  {
    id: 'clarity-t2', name: 'Clarity II', category: 'resource', rarity: 'rare',
    description: '-15% Mana cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 2, evolvesFrom: 'clarity-t1',
    effect: () => { /* Chunk 6B */ },
  },
  {
    id: 'clarity-t3', name: 'Clarity III', category: 'resource', rarity: 'rare',
    description: '-20% Mana cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 3, evolvesFrom: 'clarity-t2',
    effect: () => { /* Chunk 6B */ },
  },

  // [BLOCK: Endurance Line — Stamina Cost Reduction]
  {
    id: 'endurance-t1', name: 'Endurance I', category: 'resource', rarity: 'rare',
    description: '-10% Stamina cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 1,
    effect: () => { /* Chunk 6B */ },
  },
  {
    id: 'endurance-t2', name: 'Endurance II', category: 'resource', rarity: 'rare',
    description: '-15% Stamina cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 2, evolvesFrom: 'endurance-t1',
    effect: () => { /* Chunk 6B */ },
  },
  {
    id: 'endurance-t3', name: 'Endurance III', category: 'resource', rarity: 'rare',
    description: '-20% Stamina cost reduction. (Applied in Chunk 6B resource cost logic.)', tier: 3, evolvesFrom: 'endurance-t2',
    effect: () => { /* Chunk 6B */ },
  },

  // [BLOCK: Multishot Line — +Projectiles]
  // Applies a flat modifier to the new projectileCountStat (added to
  // Hero.ts this chunk). Firing logic that actually reads this stat to
  // launch extra projectiles is Chunk 6B (Hero.tryAttack rewrite) — the
  // Stat and its modifier are real and inspectable now, just not consumed
  // by the attack path yet.
  {
    id: 'projectile-t1', name: 'Multishot I', category: 'gameplay', rarity: 'rare',
    description: '+1 Projectile to Sorceress and Priestess per attack.', tier: 1,
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.projectileCountStat, flatModifier('multishot-line', 1, 'upgrade')),
  },
  {
    id: 'projectile-t2', name: 'Multishot II', category: 'gameplay', rarity: 'rare',
    description: '+2 Projectiles total to Sorceress and Priestess per attack.', tier: 2, evolvesFrom: 'projectile-t1',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.projectileCountStat, flatModifier('multishot-line', 2, 'upgrade')),
  },
  {
    id: 'projectile-t3', name: 'Multishot III', category: 'gameplay', rarity: 'legendary',
    description: '+3 Projectiles total to Sorceress and Priestess per attack.', tier: 3, evolvesFrom: 'projectile-t2',
    effect: (heroes) => applyToAllHeroes(heroes, (h) => h.projectileCountStat, flatModifier('multishot-line', 3, 'upgrade')),
  },

  // [BLOCK: Fortification Line — +Beacon Max HP]
  // GAP: Beacon.ts's fireMeter is a hardcoded 0–100 percent, not a
  // Stat-backed max HP value — there is nothing for this effect to modify
  // without changing Beacon.ts, which is outside this chunk's file list
  // (DraftSystem/upgrades/gameStore/DraftOverlay/GameScene/page.tsx only).
  // Documented no-op rather than silently expanding scope into Beacon.ts.
  {
    id: 'beacon-hp-t1', name: 'Fortification I', category: 'gameplay', rarity: 'common',
    description: '+20% Beacon max HP. (Blocked — Beacon.ts has no Stat-backed max HP; needs a follow-up chunk.)', tier: 1,
    effect: () => { /* Blocked: see file-level note above Fortification line */ },
  },
  {
    id: 'beacon-hp-t2', name: 'Fortification II', category: 'gameplay', rarity: 'common',
    description: '+30% Beacon max HP. (Blocked — Beacon.ts has no Stat-backed max HP; needs a follow-up chunk.)', tier: 2, evolvesFrom: 'beacon-hp-t1',
    effect: () => { /* Blocked: see Fortification I note */ },
  },
  {
    id: 'beacon-hp-t3', name: 'Fortification III', category: 'gameplay', rarity: 'rare',
    description: '+40% Beacon max HP + faster beacon heal rate. (Blocked — Beacon.ts has no Stat-backed max HP; needs a follow-up chunk.)', tier: 3, evolvesFrom: 'beacon-hp-t2',
    effect: () => { /* Blocked: see Fortification I note */ },
  },

  // [BLOCK: Beacon Mend Line — +Beacon Heal Rate]
  // Same gap — BEACON_HEAL_RATE is a flat module constant, not a Stat.
  {
    id: 'beacon-mend-t1', name: 'Beacon Mend I', category: 'gameplay', rarity: 'common',
    description: '+20% Beacon heal rate. (Blocked — BEACON_HEAL_RATE is a flat constant, not a Stat; needs a follow-up chunk.)', tier: 1,
    effect: () => { /* Blocked: see file-level note above Beacon Mend line */ },
  },
  {
    id: 'beacon-mend-t2', name: 'Beacon Mend II', category: 'gameplay', rarity: 'common',
    description: '+30% Beacon heal rate. (Blocked — BEACON_HEAL_RATE is a flat constant, not a Stat; needs a follow-up chunk.)', tier: 2, evolvesFrom: 'beacon-mend-t1',
    effect: () => { /* Blocked: see Beacon Mend I note */ },
  },
  {
    id: 'beacon-mend-t3', name: 'Beacon Mend III', category: 'gameplay', rarity: 'rare',
    description: '+40% Beacon heal rate. (Blocked — BEACON_HEAL_RATE is a flat constant, not a Stat; needs a follow-up chunk.)', tier: 3, evolvesFrom: 'beacon-mend-t2',
    effect: () => { /* Blocked: see Beacon Mend I note */ },
  },

  // [BLOCK: Scholar Line — +XP Gain]
  // GAP: no XP-multiplier hook exists in gameStore.addXP or
  // GameScene.collectXPShard today — XP values are fixed per-enemy
  // constants applied directly. Adding a multiplier field to gameStore is
  // outside this chunk's scope (gameStore changes here are limited to draft
  // state per the agreed file list). Documented no-op.
  {
    id: 'scholar-t1', name: 'Scholar I', category: 'gameplay', rarity: 'rare',
    description: '+15% XP gain from all sources. (Blocked — no XP-multiplier hook in gameStore yet; needs a follow-up chunk.)', tier: 1,
    effect: () => { /* Blocked: see file-level note above Scholar line */ },
  },
  {
    id: 'scholar-t2', name: 'Scholar II', category: 'gameplay', rarity: 'rare',
    description: '+20% XP gain from all sources. (Blocked — no XP-multiplier hook in gameStore yet; needs a follow-up chunk.)', tier: 2, evolvesFrom: 'scholar-t1',
    effect: () => { /* Blocked: see Scholar I note */ },
  },
  {
    id: 'scholar-t3', name: 'Scholar III', category: 'gameplay', rarity: 'legendary',
    description: '+25% XP gain from all sources. (Blocked — no XP-multiplier hook in gameStore yet; needs a follow-up chunk.)', tier: 3, evolvesFrom: 'scholar-t2',
    effect: () => { /* Blocked: see Scholar I note */ },
  },
];