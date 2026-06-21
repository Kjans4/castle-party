// [File: src/game/primitives/Modifier.ts]
// [BLOCK: Modifier Types]
// A Modifier adjusts a Stat's base value either by a flat amount or a percentage.
// Modifiers are stacked on a Stat and pruned when they expire.
//
// Sources of modifiers in Castle Party:
//   - Card draft upgrades (permanent for the run, no duration)
//   - Active skill buffs/debuffs (temporary, duration-based)
//   - Beacon passives (permanent while beacon is lit)
//   - Darkness/Chaos scaling (applied to enemies only)

export type ModifierType = 'flat' | 'percent';

export interface ModifierOptions {
  id: string;
  type: ModifierType;
  value: number;
  // Duration in seconds. Omit or pass undefined for permanent modifiers.
  duration?: number;
  // Optional label for debugging / UI display.
  source?: string;
}

// [BLOCK: Modifier Class]
export class Modifier {
  readonly id: string;
  readonly type: ModifierType;
  readonly value: number;
  readonly duration: number | undefined;
  readonly source: string;

  private elapsed: number = 0;

  constructor(options: ModifierOptions) {
    this.id = options.id;
    this.type = options.type;
    this.value = options.value;
    this.duration = options.duration;
    this.source = options.source ?? 'unknown';
  }

  // [BLOCK: Tick]
  // Advances the modifier's elapsed time. Called each game update.
  // Returns true if the modifier is still active, false if it has expired.
  tick(deltaSeconds: number): boolean {
    if (this.duration === undefined) return true; // permanent
    this.elapsed += deltaSeconds;
    return this.elapsed < this.duration;
  }

  // [BLOCK: Expiry Check]
  get isExpired(): boolean {
    if (this.duration === undefined) return false;
    return this.elapsed >= this.duration;
  }

  // [BLOCK: Remaining Time]
  get remainingSeconds(): number {
    if (this.duration === undefined) return Infinity;
    return Math.max(0, this.duration - this.elapsed);
  }
}

// [BLOCK: Modifier Factory Helpers]
// Convenience functions for the most common modifier patterns.

export function flatModifier(id: string, value: number, source?: string, duration?: number): Modifier {
  return new Modifier({ id, type: 'flat', value, source, duration });
}

export function percentModifier(id: string, value: number, source?: string, duration?: number): Modifier {
  return new Modifier({ id, type: 'percent', value, source, duration });
}