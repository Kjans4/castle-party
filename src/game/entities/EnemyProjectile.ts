// [File: src/game/entities/EnemyProjectile.ts]
// [BLOCK: Enemy Projectile — Phase 4 Chunk B]
// Fired by Ranger (physical) and Priest (fire/ice/electric, assigned at
// spawn) when aggroed on a hero. Mirrors Hero's Projectile.ts structurally,
// but carries sourceEnemy instead of sourceHero and is resolved in
// GameScene.updateEnemyProjectiles against heroes, not enemies.

import Phaser from 'phaser';
import type { Enemy } from './Enemy';
import type { AttackElement } from '@/game/config/heroes';
import { WORLD_W, WORLD_H } from '@/game/config/constants';

// [BLOCK: Element Color Table]
// Ranger's shot is "small dark green circle" per castle-party-phase4-plan.md
// Section 4; Priest's matches its rolled element.
const ELEMENT_COLORS: Record<AttackElement, number> = {
  physical: 0x336633,
  fire: 0xff6600,
  ice: 0x44aaff,
  electric: 0xffff44,
  magic: 0xffdd88,
};

export interface EnemyProjectileOptions {
  damage: number;
  speed: number;
  radius: number;
  attackElement: AttackElement;
  sourceEnemy: Enemy;
}

// [BLOCK: EnemyProjectile Class]
export class EnemyProjectile extends Phaser.GameObjects.Container {
  readonly damage: number;
  readonly attackElement: AttackElement;
  readonly sourceEnemy: Enemy;
  readonly radius: number;

  private speed: number;

  // Set false on world-bounds exit or hero hit — GameScene reads this each
  // frame to know which projectiles to destroy and drop from its array.
  alive: boolean = true;

  private circle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, options: EnemyProjectileOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    this.damage = options.damage;
    this.attackElement = options.attackElement;
    this.sourceEnemy = options.sourceEnemy;
    this.radius = options.radius;
    this.speed = options.speed;

    this.circle = scene.add.circle(0, 0, this.radius, ELEMENT_COLORS[this.attackElement]);
    this.add(this.circle);

    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.radius * 2, this.radius * 2);
  }

  // [BLOCK: Launch]
  launch(angle: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  // [BLOCK: Update]
  // No piercing — GameScene calls markHit() on the first hero overlap.
  update(_deltaSeconds: number): void {
    if (!this.alive) return;
    if (this.x < 0 || this.x > WORLD_W || this.y < 0 || this.y > WORLD_H) {
      this.alive = false;
    }
  }

  // [BLOCK: Mark Hit]
  markHit(): void {
    this.alive = false;
  }
}