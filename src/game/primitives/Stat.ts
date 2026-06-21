// [File: src/game/primitives/Stat.ts]
// [BLOCK: Stat Overview]
// A Stat holds a base value and a stack of Modifiers.
// getValue() computes the final value: apply all flat modifiers first, then all percent modifiers.
//
// Computation order:
//   1. Start with baseValue
//   2. Sum all flat modifiers -> intermediate value
//   3. Multiply by (1 + sum of all percent modifiers / 100)
//   4. Clamp to [min, max] if defined
//
// Example:
//   base = 100, flat +20, percent +25%
//   -> (100 + 20) * 1.25 = 150
//
// All hero stats use this class: HP, attackDamage, defense, movementSpeed,
// manaRegen, staminaRegen, attackSpeed, cooldownReduction.

import { Modifier } from './Modifier';

export interface StatOptions {
  baseValue: number;
  min?: number;       // clamp floor (default: 0)
  max?: number;       // clamp ceiling (default: Infinity)
  label?: string;     // for debugging
}

// [BLOCK: Stat Class]
export class Stat {
  private _baseValue: number;
  private readonly min: number;
  private readonly max: number;
  readonly label: string;

  private modifiers: Modifier[] = [];

  constructor(options: StatOptions) {
    this._baseValue = options.baseValue;
    this.min = options.min ?? 0;
    this.max = options.max ?? Infinity;
    this.label = options.label ?? 'stat';
  }

  // [BLOCK: Base Value]
  get baseValue(): number {
    return this._baseValue;
  }

  set baseValue(value: number) {
    this._baseValue = value;
  }

  // [BLOCK: Add Modifier]
  addModifier(modifier: Modifier): void {
    // Prevent duplicate IDs — replace if same id already exists.
    this.modifiers = this.modifiers.filter(m => m.id !== modifier.id);
    this.modifiers.push(modifier);
  }

  // [BLOCK: Remove Modifier]
  removeModifier(id: string): void {
    this.modifiers = this.modifiers.filter(m => m.id !== id);
  }

  // [BLOCK: Clear All Modifiers]
  clearModifiers(): void {
    this.modifiers = [];
  }

  // [BLOCK: Tick]
  // Advances all modifier durations and prunes expired ones.
  // Call once per game update (delta in seconds).
  tick(deltaSeconds: number): void {
    this.modifiers = this.modifiers.filter(m => m.tick(deltaSeconds));
  }

  // [BLOCK: Get Value]
  // Returns the final computed stat value with all active modifiers applied.
  // Expired modifiers are pruned on read.
  getValue(): number {
    // Prune expired modifiers.
    this.modifiers = this.modifiers.filter(m => !m.isExpired);

    let flat = 0;
    let percent = 0;

    for (const mod of this.modifiers) {
      if (mod.type === 'flat') {
        flat += mod.value;
      } else {
        percent += mod.value;
      }
    }

    const raw = (this._baseValue + flat) * (1 + percent / 100);
    return Math.min(this.max, Math.max(this.min, raw));
  }

  // [BLOCK: Active Modifiers]
  // Returns a snapshot of all currently active (non-expired) modifiers.
  getActiveModifiers(): Modifier[] {
    return this.modifiers.filter(m => !m.isExpired);
  }

  // [BLOCK: Debug]
  toString(): string {
    return `Stat(${this.label}): base=${this._baseValue} computed=${this.getValue().toFixed(2)} mods=${this.modifiers.length}`;
  }
}