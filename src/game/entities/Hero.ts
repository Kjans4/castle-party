// [File: src/game/entities/Hero.ts]
// [BLOCK: Hero Entity]
// Movement/aim/companion-follow from Phase 1, basic attack system added Phase 3.
// Hero decides melee-vs-projectile by its own config.id and handles its own
// attack cooldown — GameScene decides WHO fires and AT WHAT ANGLE each frame
// (leader on click, companions mirror that angle unless posted).
//
// Phase 4 Chunk C adds placeholder death/respawn: on HP hitting 0 the hero
// flashes white for HERO_DEATH_FLASH_DURATION_SECONDS, freezes (movement and
// attacks both no-op while isDead), then instantly revives at full HP in
// place. Real respawn timers are Phase 6 Chunk 6C — this is intentionally crude.
//
// Phase 6 Chunk 6A adds projectileCountStat: a Stat (default
// PROJECTILE_COUNT_BASE = 1) that the Multishot upgrade line modifies via a
// flat Modifier. NOTE: this chunk only adds the Stat so Multishot's effect()
// has something real to write to — tryAttack() does NOT yet read this value
// to fire multiple projectiles. That firing-logic change (looping +
// per-shot spread angle for Sorceress/Priestess) is Chunk 6B scope per the
// agreed plan, alongside the rest of the Q/E skill + attack-cost rewrite.

import Phaser from 'phaser';
import { Unit } from './Unit';
import { Stat } from '@/game/primitives/Stat';
import { ResourcePool } from '@/game/primitives/ResourcePool';
import { Projectile } from './Projectile';
import type { HeroConfig, AttackElement } from '@/game/config/heroes';
import {
  TILE_SIZE,
  HERO_BODY_W,
  HERO_BODY_H,
  HERO_MAX_SPEED,
  HERO_ACCELERATION,
  HERO_DRAG,
  COMPANION_FOLLOW_DISTANCE,
  HERO_MELEE_RANGE,
  HERO_MELEE_ANGLE,
  HERO_PROJECTILE_SPEED,
  PRIESTESS_PROJECTILE_SPEED,
  PROJECTILE_RADIUS_SORCERESS,
  PROJECTILE_RADIUS_PRIESTESS,
  HERO_DEATH_FLASH_DURATION_SECONDS,
  PROJECTILE_COUNT_BASE,
} from '@/game/config/constants';

// [BLOCK: Attack Result Types]
// Hero.tryAttack returns one of these (or null if on cooldown). GameScene
// resolves melee results into an instant cone hit-test + visual flash, and
// pushes projectile results into its tracked projectile array.
export interface MeleeAttackResult {
  kind: 'melee';
  angle: number;
  range: number;
  coneAngleDeg: number;
  damage: number;
  source: Hero;
}

export interface ProjectileAttackResult {
  kind: 'projectile';
  projectile: Projectile;
}

export type AttackResult = MeleeAttackResult | ProjectileAttackResult;

// [BLOCK: Sorceress Random Element]
// "Color cycles randomly" per shot, per castle-party-phase3-plan.md Section 6.
const SORCERESS_ELEMENTS: AttackElement[] = ['fire', 'ice', 'electric'];
function rollSorceressElement(): AttackElement {
  return SORCERESS_ELEMENTS[Math.floor(Math.random() * SORCERESS_ELEMENTS.length)];
}

// [BLOCK: Hero Class]
export class Hero extends Unit {
  readonly config: HeroConfig;

  // [BLOCK: Extended Stats]
  readonly attackDamageStat: Stat;
  readonly attackSpeedStat: Stat;

  // [BLOCK: Projectile Count Stat — Phase 6 Chunk 6A]
  // Default 1 for every hero (Fencer included, even though it's melee and
  // never reads this value). Multishot upgrades apply a flat Modifier here.
  // Not yet consumed by tryAttack() — see file-header note.
  readonly projectileCountStat: Stat;

  // [BLOCK: Resource Pools]
  manaPool?: ResourcePool;
  staminaPool?: ResourcePool;

  // [BLOCK: Attack Cooldown — Phase 3]
  private attackCooldownRemaining: number = 0;

  // [BLOCK: Death/Respawn — Phase 4 Chunk C]
  private deathFlashRemaining: number = 0;
  private spawnColorHex: number;
  // One-shot flag, set true the instant die() fires this frame. GameScene
  // reads and clears it via consumeDiedFlag() to drive the HUD death-flash —
  // kept here rather than on Unit since only Hero needs it.
  private diedThisFrame: boolean = false;

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
    this.projectileCountStat = new Stat({ baseValue: PROJECTILE_COUNT_BASE, min: 1, label: 'projectileCount' });

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
    this.spawnColorHex = color;

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
  // No-ops entirely while dead — frozen during the death flash window.
  updateAsLeader(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key },
    pointer: Phaser.Input.Pointer,
    camera: Phaser.Cameras.Scene2D.Camera
  ): void {
    if (this.isDead) return;

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
  // No-ops entirely while dead — frozen during the death flash window.
  updateAsCompanion(leader: Hero): void {
    if (this.isPosted || this.isDead) return;

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

  // [BLOCK: Is Melee Attacker]
  // Only Fencer is melee in Phase 3 — discriminator kept simple by id rather
  // than adding an attackType field to HeroConfig for just 3 heroes.
  get isMeleeAttacker(): boolean {
    return this.config.id === 'fencer';
  }

  // [BLOCK: Can Attack]
  get canAttack(): boolean {
    return !this.isDead && this.attackCooldownRemaining <= 0;
  }

  // [BLOCK: Tick Attack Cooldown]
  private tickAttackCooldown(deltaSeconds: number): void {
    if (this.attackCooldownRemaining > 0) {
      this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - deltaSeconds);
    }
  }

  // [BLOCK: Reset Attack Cooldown]
  // attackSpeedStat is hits/sec for every current hero — cooldown is its reciprocal.
  private resetAttackCooldown(): void {
    const hitsPerSecond = this.attackSpeedStat.getValue();
    this.attackCooldownRemaining = hitsPerSecond > 0 ? 1 / hitsPerSecond : 0;
  }

  // [BLOCK: Try Attack]
  // Returns null if on cooldown or dead. Otherwise resets cooldown and
  // returns either a melee descriptor (Fencer) or a launched Projectile
  // (Sorceress/Priestess) for GameScene to resolve. aimAngle is in radians,
  // same convention as the movement/aim code above (raw atan2, no visual offset).
  //
  // NOTE (Phase 6 Chunk 6A): still fires exactly one projectile regardless
  // of projectileCountStat's value — Multishot's actual firing behavior
  // (looping + spread angles) is Chunk 6B scope. The Stat is real and
  // upgradeable now; this method just doesn't read it yet.
  tryAttack(scene: Phaser.Scene, aimAngle: number): AttackResult | null {
    if (!this.canAttack) return null;
    this.resetAttackCooldown();

    if (this.isMeleeAttacker) {
      return {
        kind: 'melee',
        angle: aimAngle,
        range: HERO_MELEE_RANGE,
        coneAngleDeg: HERO_MELEE_ANGLE,
        damage: this.attackDamageStat.getValue(),
        source: this,
      };
    }

    const isPriestess = this.config.id === 'priestess';
    const speed = isPriestess ? PRIESTESS_PROJECTILE_SPEED : HERO_PROJECTILE_SPEED;
    const radius = isPriestess ? PROJECTILE_RADIUS_PRIESTESS : PROJECTILE_RADIUS_SORCERESS;
    const attackElement: AttackElement = isPriestess ? 'magic' : rollSorceressElement();

    const projectile = new Projectile(scene, this.x, this.y, {
      damage: this.attackDamageStat.getValue(),
      speed,
      radius,
      attackElement,
      isPhysical: false,
      sourceHero: this,
    });
    projectile.launch(aimAngle);

    return { kind: 'projectile', projectile };
  }

  // [BLOCK: Die — Phase 4 Chunk C]
  // Overrides Unit.die() to add the placeholder death flash. Velocity/
  // acceleration are zeroed immediately so a dying hero doesn't keep
  // coasting during the frozen flash window.
  die(): void {
    super.die();

    this.diedThisFrame = true;
    this.deathFlashRemaining = HERO_DEATH_FLASH_DURATION_SECONDS;
    this.bodyRect.setFillStyle(0xffffff);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
  }

  // [BLOCK: Consume Died Flag — Phase 4 Chunk C]
  // One-shot read: returns true only on the frame death happened, then
  // clears itself. GameScene calls this each frame to drive the HUD's
  // per-portrait death flash without needing its own edge-detection state.
  consumeDiedFlag(): boolean {
    const value = this.diedThisFrame;
    this.diedThisFrame = false;
    return value;
  }

  // [BLOCK: Tick Death Flash And Respawn — Phase 4 Chunk C]
  // Counts down the flash window, then instantly revives at full HP in
  // place and restores the hero's normal body color.
  private tickDeathFlashAndRespawn(deltaSeconds: number): void {
    this.deathFlashRemaining -= deltaSeconds;
    if (this.deathFlashRemaining <= 0) {
      this.revive(this.maxHp);
      this.bodyRect.setFillStyle(this.spawnColorHex);
    }
  }

  // [BLOCK: Update]
  // While dead, only the death flash/respawn timer ticks — stats, resource
  // regen, and attack cooldown are all frozen until revive() fires.
  update(deltaSeconds: number, _leader?: Hero): void {
    if (this.isDead) {
      this.tickDeathFlashAndRespawn(deltaSeconds);
      return;
    }

    this.tickStats(deltaSeconds);
    this.projectileCountStat.tick(deltaSeconds);
    this.tickAttackCooldown(deltaSeconds);

    // Resource regen
    this.manaPool?.tick(deltaSeconds);
    this.staminaPool?.tick(deltaSeconds);
  }
}