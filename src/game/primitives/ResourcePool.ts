// [File: src/game/primitives/ResourcePool.ts]
// [BLOCK: ResourcePool Overview]
// A ResourcePool represents one hero's Mana or Stamina pool.
// Expressed as a percentage (0–100). Regenerates automatically via tick().
//
// In Castle Party, resource pools are always percentage-based:
//   - Heroes never have a fixed mana/stamina number shown to the player
//   - The HUD shows a bar (0–100%), not a number
//   - Skills cost a % of the pool (e.g. 15% mana)
//   - Regen rate is %/sec (e.g. 10%/sec)
//
// Individual pools are contributed to a SharedPool — see SharedPool.ts.

export type ResourceType = 'mana' | 'stamina';

export interface ResourcePoolOptions {
  type: ResourceType;
  regenPerSecond: number;   // %/sec
  // Callbacks — called when pool crosses thresholds.
  onEmpty?: () => void;     // called when pool hits 0
  onFull?: () => void;      // called when pool returns to 100
}

// [BLOCK: ResourcePool Class]
export class ResourcePool {
  readonly type: ResourceType;

  private _current: number = 100;   // always starts full
  private _regenPerSecond: number;

  private readonly onEmpty?: () => void;
  private readonly onFull?: () => void;

  private wasEmpty: boolean = false;
  private wasFull: boolean = true;

  constructor(options: ResourcePoolOptions) {
    this.type = options.type;
    this._regenPerSecond = options.regenPerSecond;
    this.onEmpty = options.onEmpty;
    this.onFull = options.onFull;
  }

  // [BLOCK: Accessors]
  get current(): number {
    return this._current;
  }

  get regenPerSecond(): number {
    return this._regenPerSecond;
  }

  set regenPerSecond(value: number) {
    this._regenPerSecond = value;
  }

  get isEmpty(): boolean {
    return this._current <= 0;
  }

  get isFull(): boolean {
    return this._current >= 100;
  }

  // [BLOCK: Consume]
  // Attempts to consume `amount` percent from the pool.
  // Returns true if successful, false if pool is empty (cannot consume).
  consume(amount: number): boolean {
    if (this._current <= 0) return false;
    this._current = Math.max(0, this._current - amount);
    if (this._current <= 0 && !this.wasEmpty) {
      this.wasEmpty = true;
      this.wasFull = false;
      this.onEmpty?.();
    }
    return true;
  }

  // [BLOCK: Restore]
  // Restores `amount` percent to the pool. Caps at 100.
  restore(amount: number): void {
    const wasEmpty = this._current <= 0;
    this._current = Math.min(100, this._current + amount);
    if (this._current >= 100 && !this.wasFull) {
      this.wasFull = true;
      this.wasEmpty = false;
      this.onFull?.();
    } else if (wasEmpty && this._current > 0) {
      this.wasEmpty = false;
    }
  }

  // [BLOCK: Set Directly]
  // Used for initialization or hard resets (e.g. respawn).
  set(value: number): void {
    this._current = Math.min(100, Math.max(0, value));
    this.wasEmpty = this._current <= 0;
    this.wasFull = this._current >= 100;
  }

  // [BLOCK: Tick]
  // Applies regen for one frame. Call with deltaSeconds each game update.
  // Regen is contributed to the SharedPool — individual pools don't self-tick
  // unless they are used standalone (e.g. enemy resource pools).
  tick(deltaSeconds: number): void {
    if (this._current < 100) {
      this.restore(this._regenPerSecond * deltaSeconds);
    }
  }

  // [BLOCK: Debug]
  toString(): string {
    return `ResourcePool(${this.type}): ${this._current.toFixed(1)}% regen=${this._regenPerSecond}%/s`;
  }
}