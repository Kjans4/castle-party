// [File: src/game/entities/Hero.ts]
// [BLOCK: Hero Entity]
// Full implementation for Phase 1.
// Handles WASD movement, mouse aim, companion follow behavior.
// Hero switching is managed by GameScene — Hero only knows its own state.

import Phaser from 'phaser';
import { Unit } from './Unit';
import { Stat } from '@/game/primitives/Stat';
import { ResourcePool } from '@/game/primitives/ResourcePool';
import type { HeroConfig } from '@/game/config/heroes';
import {
  TILE_SIZE,
  HERO_BODY_W,
  HERO_BODY_H,
  HERO_MAX_SPEED,
  HERO_ACCELERATION,
  HERO_DRAG,
  COMPANION_FOLLOW_DISTANCE,
} from '@/game/config/constants';

// [BLOCK: Hero Class]
export class Hero extends Unit {
  readonly config: HeroConfig;

  // [BLOCK: Extended Stats]
  readonly attackDamageStat: Stat;
  readonly attackSpeedStat: Stat;

  // [BLOCK: Resource Pools]
  manaPool?: ResourcePool;
  staminaPool?: ResourcePool;

  // [BLOCK: Visuals]
  private bodyRect: Phaser.GameObjects.Rectangle;
  private aimIndicator: Phaser.GameObjects.Triangle;
  private outlineRect: Phaser.GameObjects.Rectangle;

  // [BLOCK: State Flags]
  isLeader: boolean = false;
  isPosted: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, config: HeroConfig) {
    super({
      scene,
      x,
      y,
      hp: config.hp,
      defense: config.defense,
      movementSpeed: config.movementSpeed,
      label: config.name,
    });

    this.config = config;

    this.attackDamageStat = new Stat({ baseValue: config.attackDamage, min: 0, label: 'attackDamage' });
    this.attackSpeedStat  = new Stat({ baseValue: config.attackSpeed,  min: 0, label: 'attackSpeed' });

    // [BLOCK: Resource Pool Init]
    if (config.resource === 'mana' || config.resource === 'hybrid') {
      this.manaPool = new ResourcePool({
        type: 'mana',
        regenPerSecond: config.manaRegen ?? 10,
      });
    }
    if (config.resource === 'stamina' || config.resource === 'hybrid') {
      this.staminaPool = new ResourcePool({
        type: 'stamina',
        regenPerSecond: config.staminaRegen ?? 10,
      });
    }

    // [BLOCK: Visual Setup]
    const color = parseInt(config.color.replace('#', ''), 16);

    // Outline rect — slightly larger, white, only visible on leader
    this.outlineRect = scene.add.rectangle(0, 0, HERO_BODY_W + 4, HERO_BODY_H + 4);
    this.outlineRect.setStrokeStyle(2, 0xffffff, 1);
    this.outlineRect.setFillStyle(0x000000, 0);
    this.outlineRect.setVisible(false);

    // Body rect — hero color
    this.bodyRect = scene.add.rectangle(0, 0, HERO_BODY_W, HERO_BODY_H, color);

    // Aim triangle — points upward, rotated to face mouse
    this.aimIndicator = scene.add.triangle(
      0, -(HERO_BODY_H / 2 + 10),
      0, -7,
      -5, 5,
      5, 5,
      0xffffff, 0.9
    );

    this.add([this.outlineRect, this.bodyRect, this.aimIndicator]);

    // [BLOCK: Physics Body]
    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(HERO_BODY_W, HERO_BODY_H);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(HERO_MAX_SPEED, HERO_MAX_SPEED);
    body.setDragX(HERO_DRAG);
    body.setDragY(HERO_DRAG);
  }

  // [BLOCK: Set As Leader]
  setAsLeader(isLeader: boolean): void {
    this.isLeader = isLeader;
    this.outlineRect.setVisible(isLeader);
    this.setAlpha(isLeader ? 1 : 0.6);

    if (!isLeader) {
      // Stop acceleration when demoted to companion
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setAcceleration(0, 0);
    }
  }

  // [BLOCK: Update Leader — WASD + Aim]
  updateAsLeader(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key },
    pointer: Phaser.Input.Pointer,
    camera: Phaser.Cameras.Scene2D.Camera
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // [BLOCK: WASD Movement]
    const left  = wasd.left.isDown;
    const right = wasd.right.isDown;
    const up    = wasd.up.isDown;
    const down  = wasd.down.isDown;

    if (left)       body.setAccelerationX(-HERO_ACCELERATION);
    else if (right) body.setAccelerationX(HERO_ACCELERATION);
    else            body.setAccelerationX(0);

    if (up)         body.setAccelerationY(-HERO_ACCELERATION);
    else if (down)  body.setAccelerationY(HERO_ACCELERATION);
    else            body.setAccelerationY(0);

    // Normalize diagonal movement so speed is consistent in all directions
    if ((left || right) && (up || down)) {
      const diagScale = 1 / Math.SQRT2;
      body.setAcceleration(
        body.acceleration.x * diagScale,
        body.acceleration.y * diagScale
      );
    }

    // [BLOCK: Mouse Aim]
    // Convert screen pointer to world coordinates accounting for camera scroll
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const angle  = Math.atan2(worldY - this.y, worldX - this.x);

    // Rotate the aim triangle to face the mouse
    // Triangle points up by default, so offset by -PI/2
    this.aimIndicator.setRotation(angle + Math.PI / 2);
  }

  // [BLOCK: Update Companion — Follow Leader]
  updateAsCompanion(leader: Hero): void {
    if (this.isPosted) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx   = leader.x - this.x;
    const dy   = leader.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= COMPANION_FOLLOW_DISTANCE) {
      // Close enough — stop moving
      body.setAcceleration(0, 0);
      body.setVelocity(0, 0);
      return;
    }

    // Move toward leader at leader's current speed stat value (px/s)
    const leaderSpeed = leader.speedStat.getValue() * TILE_SIZE;
    const scale       = leaderSpeed / dist;

    body.setAcceleration(0, 0);
    body.setVelocity(dx * scale, dy * scale);

    // Aim triangle faces movement direction
    const angle = Math.atan2(dy, dx);
    this.aimIndicator.setRotation(angle + Math.PI / 2);
  }

  // [BLOCK: Update]
  update(deltaSeconds: number, _leader?: Hero): void {
    this.tickStats(deltaSeconds);

    // Resource regen
    this.manaPool?.tick(deltaSeconds);
    this.staminaPool?.tick(deltaSeconds);
  }
}