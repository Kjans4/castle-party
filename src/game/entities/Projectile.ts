// [File: src/game/entities/Projectile.ts]
// [BLOCK: Projectile Entity — Phase 3]
// Used by Sorceress (random elemental color cycling) and Priestess (fixed holy
// bolt color). Fencer's melee attack is a separate instant cone hit-test done
// directly in GameScene — it never creates a Projectile.
//
// attackElement is carried for the color visual and as forward-compat for
// Phase 4's resistance system. Phase 3 has no resistance rolls, so it does not
// affect damage calculation yet — see castle-party-phase3-plan.md Section 2.

import Phaser from 'phaser';
import type { Hero } from './Hero';
import type { AttackElement } from '@/game/config/heroes';
import { WORLD_W, WORLD_H } from '@/game/config/constants';

// [BLOCK: Element Color Table]
const ELEMENT_COLORS: Record<AttackElement, number> = {
  physical: 0xffffff,
  fire: 0xff6600,
  ice: 0x44aaff,
  electric: 0xffff44,
  magic: 0xffdd88,
};

export interface ProjectileOptions {
  damage: number;
  speed: number;
  radius: number;
  attackElement: AttackElement;
  isPhysical: boolean;
  sourceHero: Hero;
}

// [BLOCK: Projectile Class]
export class Projectile extends Phaser.GameObjects.Container {
  readonly damage: number;
  readonly isPhysical: boolean;
  readonly attackElement: AttackElement;
  readonly sourceHero: Hero;
  readonly radius: number;

  private speed: number;

  // Set false on world-bounds exit or enemy hit — GameScene reads this each
  // frame to know which projectiles to destroy and drop from its array.
  alive: boolean = true;

  private circle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ProjectileOptions) {
    super(scene, x, y);
    scene.add.existing(this);

    this.damage = options.damage;
    this.isPhysical = options.isPhysical;
    this.attackElement = options.attackElement;
    this.sourceHero = options.sourceHero;
    this.radius = options.radius;
    this.speed = options.speed;

    this.circle = scene.add.circle(0, 0, this.radius, ELEMENT_COLORS[this.attackElement]);
    this.add(this.circle);

    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.radius * 2, this.radius * 2);
  }

  // [BLOCK: Launch]
  // Sets velocity toward the given angle (radians). Called once right after
  // construction by whatever created this projectile (Hero.tryAttack).
  launch(angle: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  // [BLOCK: Update]
  // No piercing — GameScene calls markHit() on the first enemy overlap.
  // This just checks world-bounds exit since that's purely positional.
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