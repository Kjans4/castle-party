// [File: src/game/primitives/SharedPool.ts]
// [BLOCK: SharedPool Overview]
// A SharedPool aggregates multiple hero ResourcePools into one squad-wide bar.
// This is what the HUD displays — one Mana bar and one Stamina bar for the whole party.
//
// Rules (from stats.md Section 5):
//   - All Mana heroes draw from one shared Mana pool
//   - All Stamina heroes draw from one shared Stamina pool
//   - All skill and attack costs are reduced by 50% due to the shared pool
//   - Regen = sum of all contributors' regenPerSecond rates
//   - If the pool reaches 0%, no hero of that type can use skills until it regenerates
//
// Example — 2 Mana heroes with 10%/sec regen each:
//   SharedPool regen = 20%/sec total
//   A skill costing 30% base costs 15% from the shared pool (50% reduction)

import { ResourcePool, type ResourceType } from './ResourcePool';

// [BLOCK: SharedPool Class]
export class SharedPool {
  readonly type: ResourceType;

  private _current: number = 100;
  private contributors: ResourcePool[] = [];

  // Synergy bonus added on top of contributor regen (from stats.md Section 7).
  private synergyRegenBonus: number = 0;

  constructor(type: ResourceType) {
    this.type = type;
  }

  // [BLOCK: Contributors]
  addContributor(pool: ResourcePool): void {
    if (pool.type !== this.type) {
      console.warn(`SharedPool(${this.type}): cannot add contributor of type ${pool.type}`);
      return;
    }
    this.contributors.push(pool);
  }

  removeContributor(pool: ResourcePool): void {
    this.contributors = this.contributors.filter(c => c !== pool);
  }

  clearContributors(): void {
    this.contributors = [];
  }

  get contributorCount(): number {
    return this.contributors.length;
  }

  // [BLOCK: Synergy Bonus]
  // Set by the synergy system based on squad composition (stats.md Section 7).
  // Example: 2 Mana users = +15% regen bonus; 3 Mana users = +25% regen bonus.
  setSynergyBonus(bonusPercentPerSecond: number): void {
    this.synergyRegenBonus = bonusPercentPerSecond;
  }

  // [BLOCK: Regen Rate]
  // Total regen = sum of all contributors + synergy bonus.
  get totalRegenPerSecond(): number {
    const base = this.contributors.reduce((sum, c) => sum + c.regenPerSecond, 0);
    return base + this.synergyRegenBonus;
  }

  // [BLOCK: Accessors]
  get current(): number {
    return this._current;
  }

  get isEmpty(): boolean {
    return this._current <= 0;
  }

  get isFull(): boolean {
    return this._current >= 100;
  }

  // [BLOCK: Consume]
  // Applies the 50% shared-pool cost reduction automatically.
  // Returns false if the pool is empty (skill cannot be used).
  consume(baseCost: number): boolean {
    if (this._current <= 0) return false;
    const reducedCost = baseCost * 0.5;
    this._current = Math.max(0, this._current - reducedCost);
    return true;
  }

  // [BLOCK: Consume Exact]
  // Consumes an exact amount without the 50% reduction.
  // Used for normal attack costs which already have the reduction baked in.
  consumeExact(amount: number): boolean {
    if (this._current <= 0) return false;
    this._current = Math.max(0, this._current - amount);
    return true;
  }

  // [BLOCK: Restore]
  restore(amount: number): void {
    this._current = Math.min(100, this._current + amount);
  }

  // [BLOCK: Set]
  set(value: number): void {
    this._current = Math.min(100, Math.max(0, value));
  }

  // [BLOCK: Tick]
  // Applies combined regen from all contributors + synergy bonus.
  // Called once per game update from SharedPoolSystem (Phase 2+).
  tick(deltaSeconds: number): void {
    if (this._current < 100) {
      this._current = Math.min(100, this._current + this.totalRegenPerSecond * deltaSeconds);
    }
  }

  // [BLOCK: Debug]
  toString(): string {
    return `SharedPool(${this.type}): ${this._current.toFixed(1)}% regen=${this.totalRegenPerSecond.toFixed(1)}%/s contributors=${this.contributors.length}`;
  }
}