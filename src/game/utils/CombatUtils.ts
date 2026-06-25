// [File: src/game/utils/CombatUtils.ts]
// [BLOCK: Combat Utilities — Phase 4]
// Resistance rolls, resistance checks, and the shared damage-application
// entrypoint GameScene uses for both melee cone hits and projectile hits.
// See castle-party-phase4-plan.md Section 3.

import type { AttackElement } from '@/game/config/heroes';
import type { Enemy } from '@/game/entities/Enemy';
import type { Hero } from '@/game/entities/Hero';
import {
  RESISTANCE_ROLL_NONE,
  RESISTANCE_ROLL_PHYSICAL,
  RESISTANCE_ROLL_FIRE,
  RESISTANCE_ROLL_ICE,
  RESISTANCE_ROLL_ELECTRIC,
} from '@/game/config/constants';

// [BLOCK: Actual Resistance Type]
// Narrower than EnemyConfig's ResistanceRule — 'random' only exists as a
// config-time instruction to roll; a live enemy instance always resolves to
// one of these concrete values.
export type ActualResistance = 'none' | 'physical' | 'fire' | 'ice' | 'electric' | 'magic';

// [BLOCK: Roll Resistance]
// Weighted roll per castle-party-phase4-plan.md Section 3 resistance table.
// Magic is the implicit remainder (50/10/10/10/10/10 sums to 100%).
export function rollResistance(): ActualResistance {
  const r = Math.random();
  let acc = 0;

  acc += RESISTANCE_ROLL_NONE;     if (r < acc) return 'none';
  acc += RESISTANCE_ROLL_PHYSICAL; if (r < acc) return 'physical';
  acc += RESISTANCE_ROLL_FIRE;     if (r < acc) return 'fire';
  acc += RESISTANCE_ROLL_ICE;      if (r < acc) return 'ice';
  acc += RESISTANCE_ROLL_ELECTRIC; if (r < acc) return 'electric';
  return 'magic';
}

// [BLOCK: Is Resisted]
// Magic resistance blocks fire/ice/electric/magic simultaneously (Section 3:
// "immune to all magic subtypes simultaneously"). Any other resistance only
// blocks its exact matching element. 'none' never blocks anything.
export function isResisted(resistance: ActualResistance, element: AttackElement): boolean {
  if (resistance === 'none') return false;
  if (resistance === 'magic') {
    return element === 'fire' || element === 'ice' || element === 'electric' || element === 'magic';
  }
  return resistance === element;
}

// [BLOCK: Apply Damage]
// Shared entrypoint for melee cone hits and projectile hits. `attacker` is
// passed through to Enemy.receiveAttack -> Unit.takeDamage's existing
// aggro-flip hook (Chunk B), but only on a successful (non-resisted) hit —
// a resisted hit never flips aggro, which is exactly the Ghost design intent
// ("ignores Fencer hits entirely, continues toward beacon unfazed").
export function applyDamage(target: Enemy, amount: number, element: AttackElement, attacker?: Hero): number {
  return target.receiveAttack(amount, element, attacker);
}