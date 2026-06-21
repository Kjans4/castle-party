// [File: src/game/entities/Unit.ts]
// [BLOCK: Unit Base Class]
// Base class for all game entities: Hero, Enemy, Boss.
// Extends Phaser.GameObjects.Container so each unit is a scene object
// that can hold child graphics (body rect, aim indicator, health bar, etc.).
//
// Phaser-independent stat logic lives in the primitives layer (Stat, ResourcePool).
// Unit wires those primitives to the Phaser scene lifecycle.

import Phaser from 'phaser';
import { Stat } from '@/game/primitives/Stat';
import { Modifier } from '@/game/primitives/Modifier';

export interface UnitConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  hp: number;
  defense: number;
  movementSpeed: number; // m/s — converted to px/s via TILE_SIZE in subclasses
  label?: string;
}

// [BLOCK: Unit Class]
export class Unit extends Phaser.GameObjects.Container {
  // [BLOCK: Stats]
  readonly hpStat: Stat;
  readonly defenseStat: Stat;
  readonly speedStat: Stat;

  private _currentHp: number;
  private _isDead: boolean = false;

  constructor(config: UnitConfig) {
    super(config.scene, config.x, config.y);

    // Register with the scene so it receives update calls and renders.
    config.scene.add.existing(this);

    // Initialize stats from config.
    this.hpStat      = new Stat({ baseValue: config.hp,            min: 0, label: 'hp' });
    this.defenseStat = new Stat({ baseValue: config.defense,       min: 0, label: 'defense' });
    this.speedStat   = new Stat({ baseValue: config.movementSpeed, min: 0, label: 'speed' });

    this._currentHp = config.hp;
  }

  // [BLOCK: HP Accessors]
  get currentHp(): number { return this._currentHp; }
  get maxHp(): number     { return this.hpStat.getValue(); }
  get hpPercent(): number { return this._currentHp / this.maxHp; }
  get isDead(): boolean   { return this._isDead; }

  // [BLOCK: Take Damage]
  // Applies incoming damage after defense reduction.
  // Physical damage is reduced by defense. Magic damage bypasses defense.
  // Returns actual damage dealt.
  takeDamage(amount: number, isPhysical: boolean = true): number {
    if (this._isDead) return 0;

    const defense = isPhysical ? this.defenseStat.getValue() : 0;
    const actual  = Math.max(0, amount - defense);

    this._currentHp = Math.max(0, this._currentHp - actual);

    if (this._currentHp <= 0) {
      this.die();
    }

    return actual;
  }

  // [BLOCK: Heal]
  heal(amount: number): void {
    if (this._isDead) return;
    this._currentHp = Math.min(this.maxHp, this._currentHp + amount);
  }

  // [BLOCK: Die]
  // Override in subclasses to trigger death animations, drops, etc.
  die(): void {
    if (this._isDead) return;
    this._isDead = true;
    // TODO: trigger AnimationState.setDeath(), drop XP shards, etc.
  }

  // [BLOCK: Add Modifier]
  // Convenience — applies a Modifier to a named stat.
  addModifier(statName: 'hp' | 'defense' | 'speed', modifier: Modifier): void {
    const stat = this.getStat(statName);
    stat?.addModifier(modifier);
  }

  // [BLOCK: Tick Stats]
  // Call each frame to tick modifier durations on all stats.
  tickStats(deltaSeconds: number): void {
    this.hpStat.tick(deltaSeconds);
    this.defenseStat.tick(deltaSeconds);
    this.speedStat.tick(deltaSeconds);
  }

  // [BLOCK: Get Stat]
  private getStat(name: string): Stat | null {
    switch (name) {
      case 'hp':      return this.hpStat;
      case 'defense': return this.defenseStat;
      case 'speed':   return this.speedStat;
      default:        return null;
    }
  }
}