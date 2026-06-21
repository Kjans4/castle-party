// [File: src/game/primitives/Skill.ts]
// [BLOCK: Skill Stub]
// Full implementation deferred to Phase 2+ when combat is added.
//
// In Castle Party each hero has exactly 2 skills (Q and E).
// Skills are either External (affect enemies) or Internal (affect heroes).
// Skills consume Mana or Stamina from the SharedPool.
// Skills have individual cooldown timers displayed on the HUD.
//
// See castle-party.md Section 11 and characters.md for full skill definitions.

export type SkillSlot = 'Q' | 'E';
export type SkillCategory = 'external' | 'internal';
export type SkillSubType = 'damage' | 'cc' | 'taunt' | 'heal' | 'boost' | 'shield';
export type SkillResourceType = 'mana' | 'stamina';

export interface SkillOptions {
  id: string;
  name: string;
  slot: SkillSlot;
  category: SkillCategory;
  subType: SkillSubType;
  resourceType: SkillResourceType;
  cost: number;       // % of shared pool (already at 50% reduction)
  cooldown: number;   // seconds
  description: string;
}

// [BLOCK: Skill Class]
export class Skill {
  readonly id: string;
  readonly name: string;
  readonly slot: SkillSlot;
  readonly category: SkillCategory;
  readonly subType: SkillSubType;
  readonly resourceType: SkillResourceType;
  readonly cost: number;
  readonly cooldown: number;
  readonly description: string;

  private _cooldownRemaining: number = 0;

  constructor(options: SkillOptions) {
    this.id = options.id;
    this.name = options.name;
    this.slot = options.slot;
    this.category = options.category;
    this.subType = options.subType;
    this.resourceType = options.resourceType;
    this.cost = options.cost;
    this.cooldown = options.cooldown;
    this.description = options.description;
  }

  // [BLOCK: Cooldown State]
  get isReady(): boolean {
    return this._cooldownRemaining <= 0;
  }

  get cooldownRemaining(): number {
    return this._cooldownRemaining;
  }

  // [BLOCK: Tick]
  // Ticks down the cooldown. Call each game update with deltaSeconds.
  tick(deltaSeconds: number): void {
    if (this._cooldownRemaining > 0) {
      this._cooldownRemaining = Math.max(0, this._cooldownRemaining - deltaSeconds);
    }
  }

  // [BLOCK: Activate Stub]
  // Full activation logic implemented in Phase 2+.
  // Returns false if on cooldown or insufficient resource.
  activate(): boolean {
    if (!this.isReady) return false;
    // TODO Phase 2+: consume resource from SharedPool, trigger effect, start cooldown
    this._cooldownRemaining = this.cooldown;
    return true;
  }

  // [BLOCK: Reset]
  resetCooldown(): void {
    this._cooldownRemaining = 0;
  }
}