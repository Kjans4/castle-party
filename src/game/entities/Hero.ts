// [File: src/game/entities/Hero.ts]
// [BLOCK: Hero Entity]
// Phase 1: movement, aim, companion follow.
// Phase 3: attack cooldown, melee/projectile dispatch.
// Phase 4 Chunk C: placeholder death/respawn flash.
// Phase 6 Chunk 6A: projectileCountStat for Multishot upgrade.
// Phase 6 Chunk 6B:
//   - tryAttack() now returns AttackResult[] | null (multishot, resource cost).
//   - tryActivateSkill() activates Q/E per-hero with cooldown + resource cost.
//   - War Cry buff applied directly to own stats; all other skills return a
//     SkillResult descriptor for GameScene to resolve (they need enemies or
//     the full hero roster, which Hero.ts doesn't own).
//   - SharedPool references injected by GameScene via setSharedPools() after
//     SharedPoolSystem builds them; resource consumption routes through those.
//   - RunModifiers read at cost-compute and cooldown-reset time for
//     Focus/Clarity/Endurance upgrades and Relentless spell.
// Phase 6 Chunk 6C:
//   - REMOVES the Phase 4 Chunk C placeholder's instant auto-revive. Death
//     is now permanent (frozen, dimmed) until GameScene's RespawnSystem
//     fires and calls the new public respawnAt(x, y, hpFraction) method.
//   - die() still triggers a brief white flash for visual feedback, but
//     afterward settles into a dimmed "awaiting respawn" tint rather than
//     reviving on its own — tickDeathFlashAndRespawn() is replaced with
//     tickDeathVisual(), which only manages the cosmetic transition.

import Phaser from 'phaser';
import { Unit } from './Unit';
import { Stat } from '@/game/primitives/Stat';
import { ResourcePool } from '@/game/primitives/ResourcePool';
import { SharedPool } from '@/game/primitives/SharedPool';
import { Projectile } from './Projectile';
import { percentModifier } from '@/game/primitives/Modifier';
import type { HeroConfig, AttackElement } from '@/game/config/heroes';
import { RunModifiers } from '@/game/systems/RunModifiers';
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
  MULTISHOT_SPREAD_DEGREES,
  SORCERESS_ATTACK_MANA,
  PRIESTESS_ATTACK_MANA,
  BARRAGE_SLASH_COUNT,
  BARRAGE_DAMAGE_PERCENT,
  BARRAGE_INTERVAL_SECONDS,
  WAR_CRY_BUFF,
  WAR_CRY_DURATION,
  METEOR_DAMAGE,
  METEOR_COUNT,
  METEOR_DELAY,
  BLACKHOLE_PULL_RADIUS,
  BLACKHOLE_DAMAGE_PER_SEC,
  BLACKHOLE_DURATION,
  SACRED_PULSE_HEAL,
  SACRED_PULSE_DRAIN,
  SACRED_PULSE_RADIUS,
  DIVINE_SURGE_BUFF,
  DIVINE_SURGE_BUFF_DUR,
  DIVINE_SURGE_DEBUFF,
  DIVINE_SURGE_DEBUFF_DUR,
  DIVINE_SURGE_RADIUS,
  RELENTLESS_CDR,
} from '@/game/config/constants';

// [BLOCK: Attack Result Types]
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

// [BLOCK: Skill Activation Context]
// Passed in by GameScene at the moment Q/E is pressed.
export interface SkillActivationContext {
  aimAngle: number;   // radians — for Barrage cone direction
  cursorX: number;    // world px — for Blackhole spawn position
  cursorY: number;
}

// [BLOCK: Skill Result Types]
// War Cry is the only self-contained skill — all others return descriptors
// for GameScene to execute against its enemy/hero arrays, keeping Hero.ts
// free of any Enemy import (would create a circular dependency).
export type SkillResult =
  | { kind: 'war_cry_applied' }
  | { kind: 'barrage'; aimAngle: number; damage: number; range: number; coneAngleDeg: number; slashCount: number; intervalSeconds: number }
  | { kind: 'meteor_shower'; damage: number; meteorCount: number; delaySeconds: number; sourceX: number; sourceY: number }
  | { kind: 'blackhole'; x: number; y: number; pullRadius: number; damagePerSec: number; durationSeconds: number }
  | { kind: 'sacred_pulse'; healFraction: number; drainFraction: number; radius: number; sourceX: number; sourceY: number }
  | { kind: 'divine_surge'; buffPercent: number; buffDuration: number; debuffPercent: number; debuffDuration: number; radius: number; sourceX: number; sourceY: number };

// [BLOCK: Sorceress Random Element]
const SORCERESS_ELEMENTS: AttackElement[] = ['fire', 'ice', 'electric'];
function rollSorceressElement(): AttackElement {
  return SORCERESS_ELEMENTS[Math.floor(Math.random() * SORCERESS_ELEMENTS.length)];
}

// [BLOCK: Dead Visual Constants — Phase 6 Chunk 6C]
// Cosmetic-only — applied after the initial white death flash settles, for
// the (now potentially much longer, up to 45s) window a hero waits for real
// respawn. No constants.ts entry since these are pure visual tuning, not
// gameplay values; kept local to this file like ENEMY_COLORS in Enemy.ts.
const DEAD_TINT_COLOR = 0x333333;
const DEAD_ALPHA = 0.35;

// [BLOCK: Hero Class]
export class Hero extends Unit {
  readonly config: HeroConfig;

  // [BLOCK: Extended Stats]
  readonly attackDamageStat: Stat;
  readonly attackSpeedStat: Stat;
  readonly projectileCountStat: Stat;

  // [BLOCK: Resource Pools]
  manaPool?: ResourcePool;
  staminaPool?: ResourcePool;

  // [BLOCK: Shared Pools — Phase 6 Chunk 6B]
  // Injected by GameScene after SharedPoolSystem.initialize().
  private sharedManaPool?: SharedPool;
  private sharedStaminaPool?: SharedPool;

  // [BLOCK: Attack Cooldown]
  private attackCooldownRemaining: number = 0;

  // [BLOCK: Skill Cooldowns — Phase 6 Chunk 6B]
  private _qCooldownRemaining: number = 0;
  private _eCooldownRemaining: number = 0;
  private _qCooldownMax: number = 0;
  private _eCooldownMax: number = 0;

  // [BLOCK: Death/Respawn — Phase 4 Chunk C, Phase 6 Chunk 6C]
  private deathFlashRemaining: number = 0;
  private hasSettledDeadVisual: boolean = false;
  private spawnColorHex: number;
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
      scene, x, y,
      hp: config.hp,
      defense: config.defense,
      movementSpeed: config.movementSpeed,
      label: config.name,
    });

    this.config = config;

    this.attackDamageStat    = new Stat({ baseValue: config.attackDamage, min: 0, label: 'attackDamage' });
    this.attackSpeedStat     = new Stat({ baseValue: config.attackSpeed,  min: 0, label: 'attackSpeed' });
    this.projectileCountStat = new Stat({ baseValue: PROJECTILE_COUNT_BASE, min: 1, label: 'projectileCount' });

    if (config.resource === 'mana' || config.resource === 'hybrid') {
      this.manaPool = new ResourcePool({ type: 'mana', regenPerSecond: config.manaRegen ?? 10 });
    }
    if (config.resource === 'stamina' || config.resource === 'hybrid') {
      this.staminaPool = new ResourcePool({ type: 'stamina', regenPerSecond: config.staminaRegen ?? 10 });
    }

    const color = parseInt(config.color.replace('#', ''), 16);
    this.spawnColorHex = color;

    this.outlineRect = scene.add.rectangle(0, 0, HERO_BODY_W + 4, HERO_BODY_H + 4);
    this.outlineRect.setStrokeStyle(2, 0xffffff, 1);
    this.outlineRect.setFillStyle(0x000000, 0);
    this.outlineRect.setVisible(false);

    this.bodyRect = scene.add.rectangle(0, 0, HERO_BODY_W, HERO_BODY_H, color);

    this.aimIndicator = scene.add.triangle(
      0, -(HERO_BODY_H / 2 + 10),
      0, -7, -5, 5, 5, 5,
      0xffffff, 0.9
    );

    this.add([this.outlineRect, this.bodyRect, this.aimIndicator]);

    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(HERO_BODY_W, HERO_BODY_H);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(HERO_MAX_SPEED, HERO_MAX_SPEED);
    body.setDragX(HERO_DRAG);
    body.setDragY(HERO_DRAG);
  }

  // [BLOCK: Shared Pool Injection — Phase 6 Chunk 6B]
  setSharedPools(mana?: SharedPool, stamina?: SharedPool): void {
    this.sharedManaPool    = mana;
    this.sharedStaminaPool = stamina;
  }

  // [BLOCK: Skill Cooldown Accessors — Phase 6 Chunk 6B]
  get qCooldownRemaining(): number { return this._qCooldownRemaining; }
  get qCooldownMax(): number       { return this._qCooldownMax; }
  get eCooldownRemaining(): number { return this._eCooldownRemaining; }
  get eCooldownMax(): number       { return this._eCooldownMax; }

  // [BLOCK: Set As Leader]
  setAsLeader(isLeader: boolean): void {
    this.isLeader = isLeader;
    this.outlineRect.setVisible(isLeader);
    this.setAlpha(isLeader ? 1 : 0.6);
    if (!isLeader) {
      (this.body as Phaser.Physics.Arcade.Body).setAcceleration(0, 0);
    }
  }

  // [BLOCK: Update Leader — WASD + Aim]
  updateAsLeader(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key },
    pointer: Phaser.Input.Pointer,
    camera: Phaser.Cameras.Scene2D.Camera
  ): void {
    if (this.isDead) return;

    const body  = this.body as Phaser.Physics.Arcade.Body;
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

    if ((left || right) && (up || down)) {
      const d = 1 / Math.SQRT2;
      body.setAcceleration(body.acceleration.x * d, body.acceleration.y * d);
    }

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    this.aimIndicator.setRotation(Math.atan2(worldY - this.y, worldX - this.x) + Math.PI / 2);
  }

  // [BLOCK: Update Companion — Follow Leader]
  updateAsCompanion(leader: Hero): void {
    if (this.isPosted || this.isDead) return;

    const body  = this.body as Phaser.Physics.Arcade.Body;
    const dx    = leader.x - this.x;
    const dy    = leader.y - this.y;
    const dist  = Math.sqrt(dx * dx + dy * dy);

    if (dist <= COMPANION_FOLLOW_DISTANCE) {
      body.setAcceleration(0, 0);
      body.setVelocity(0, 0);
      return;
    }

    const speed = leader.speedStat.getValue() * TILE_SIZE;
    body.setAcceleration(0, 0);
    body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    this.aimIndicator.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
  }

  // [BLOCK: Identifiers]
  get isMeleeAttacker(): boolean { return this.config.id === 'fencer'; }
  get canAttack(): boolean       { return !this.isDead && this.attackCooldownRemaining <= 0; }

  // [BLOCK: Cost Helpers — Phase 6 Chunk 6B]
  private computeCost(baseCost: number, resourceType: 'mana' | 'stamina'): number {
    if (RunModifiers.isRelentlessActive) return 0;
    const reduction = resourceType === 'mana'
      ? RunModifiers.manaCostReductionPercent
      : RunModifiers.staminaCostReductionPercent;
    return baseCost * (1 - reduction / 100);
  }

  private computeAttackCost(): number {
    if (this.isMeleeAttacker) return 0;
    return this.computeCost(
      this.config.id === 'priestess' ? PRIESTESS_ATTACK_MANA : SORCERESS_ATTACK_MANA,
      'mana'
    );
  }

  private computeSkillCost(slot: 'Q' | 'E'): number {
    const skill = this.config.skills[slot === 'Q' ? 0 : 1];
    return this.computeCost(skill.cost, skill.resourceType);
  }

  private tryConsumeResource(amount: number, resourceType: 'mana' | 'stamina'): boolean {
    if (amount <= 0) return true;
    const pool = resourceType === 'mana' ? this.sharedManaPool : this.sharedStaminaPool;
    if (!pool) return true;  // no pool injected yet — allow
    return pool.consumeExact(amount);
  }

  // [BLOCK: Cooldown Helpers]
  private tickAttackCooldown(deltaSeconds: number): void {
    if (this.attackCooldownRemaining > 0)
      this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - deltaSeconds);
  }

  private resetAttackCooldown(): void {
    const hps = this.attackSpeedStat.getValue();
    this.attackCooldownRemaining = hps > 0 ? 1 / hps : 0;
  }

  private tickSkillCooldowns(deltaSeconds: number): void {
    if (this._qCooldownRemaining > 0) this._qCooldownRemaining = Math.max(0, this._qCooldownRemaining - deltaSeconds);
    if (this._eCooldownRemaining > 0) this._eCooldownRemaining = Math.max(0, this._eCooldownRemaining - deltaSeconds);
  }

  private resetSkillCooldown(slot: 'Q' | 'E'): void {
    const skill   = this.config.skills[slot === 'Q' ? 0 : 1];
    const cdr     = RunModifiers.effectiveSkillCDRPercent(RELENTLESS_CDR);
    const actual  = skill.cooldown * (1 - cdr / 100);
    if (slot === 'Q') { this._qCooldownMax = actual; this._qCooldownRemaining = actual; }
    else              { this._eCooldownMax = actual; this._eCooldownRemaining = actual; }
  }

  // [BLOCK: Try Attack — Phase 6 Chunk 6B]
  // Returns AttackResult[] | null. null = blocked (cooldown or resource).
  // Array has 1 entry for melee/single-projectile, N for Multishot.
  tryAttack(scene: Phaser.Scene, aimAngle: number): AttackResult[] | null {
    if (!this.canAttack) return null;

    const resourceType = this.isMeleeAttacker ? 'stamina' : 'mana';
    if (!this.tryConsumeResource(this.computeAttackCost(), resourceType)) return null;

    this.resetAttackCooldown();

    if (this.isMeleeAttacker) {
      return [{
        kind: 'melee',
        angle: aimAngle,
        range: HERO_MELEE_RANGE,
        coneAngleDeg: HERO_MELEE_ANGLE,
        damage: this.attackDamageStat.getValue(),
        source: this,
      }];
    }

    const count      = Math.max(1, Math.round(this.projectileCountStat.getValue()));
    const isPriestess = this.config.id === 'priestess';
    const speed      = isPriestess ? PRIESTESS_PROJECTILE_SPEED : HERO_PROJECTILE_SPEED;
    const radius     = isPriestess ? PROJECTILE_RADIUS_PRIESTESS : PROJECTILE_RADIUS_SORCERESS;
    const spreadRad  = MULTISHOT_SPREAD_DEGREES * (Math.PI / 180);

    return Array.from({ length: count }, (_, i) => {
      const offset  = (i - (count - 1) / 2) * spreadRad;
      const element: AttackElement = isPriestess ? 'magic' : rollSorceressElement();
      const p = new Projectile(scene, this.x, this.y, {
        damage: this.attackDamageStat.getValue(),
        speed, radius, attackElement: element, isPhysical: false, sourceHero: this,
      });
      p.launch(aimAngle + offset);
      return { kind: 'projectile' as const, projectile: p };
    });
  }

  // [BLOCK: Try Activate Skill — Phase 6 Chunk 6B]
  tryActivateSkill(slot: 'Q' | 'E', context: SkillActivationContext): SkillResult | null {
    if (this.isDead) return null;
    const remaining = slot === 'Q' ? this._qCooldownRemaining : this._eCooldownRemaining;
    if (remaining > 0) return null;

    const skill = this.config.skills[slot === 'Q' ? 0 : 1];
    if (!this.tryConsumeResource(this.computeSkillCost(slot), skill.resourceType)) return null;

    this.resetSkillCooldown(slot);
    return this.buildSkillResult(slot, context);
  }

  // [BLOCK: Build Skill Result]
  private buildSkillResult(slot: 'Q' | 'E', ctx: SkillActivationContext): SkillResult {
    const id = this.config.id;

    if (id === 'fencer' && slot === 'Q') {
      return {
        kind: 'barrage',
        aimAngle: ctx.aimAngle,
        damage: this.attackDamageStat.getValue() * BARRAGE_DAMAGE_PERCENT,
        range: HERO_MELEE_RANGE,
        coneAngleDeg: HERO_MELEE_ANGLE,
        slashCount: BARRAGE_SLASH_COUNT,
        intervalSeconds: BARRAGE_INTERVAL_SECONDS,
      };
    }

    if (id === 'fencer' && slot === 'E') {
      // War Cry — applies to Fencer (this) only, fully self-contained.
      this.attackSpeedStat.addModifier(percentModifier('war-cry-aspd', WAR_CRY_BUFF, 'skill', WAR_CRY_DURATION));
      this.attackDamageStat.addModifier(percentModifier('war-cry-atk',  WAR_CRY_BUFF, 'skill', WAR_CRY_DURATION));
      this.defenseStat.addModifier(     percentModifier('war-cry-def',  WAR_CRY_BUFF, 'skill', WAR_CRY_DURATION));
      return { kind: 'war_cry_applied' };
    }

    if (id === 'sorceress' && slot === 'Q') {
      return {
        kind: 'meteor_shower',
        damage: METEOR_DAMAGE,
        meteorCount: METEOR_COUNT,
        delaySeconds: METEOR_DELAY,
        sourceX: this.x,
        sourceY: this.y,
      };
    }

    if (id === 'sorceress' && slot === 'E') {
      return {
        kind: 'blackhole',
        x: ctx.cursorX,
        y: ctx.cursorY,
        pullRadius: BLACKHOLE_PULL_RADIUS,
        damagePerSec: BLACKHOLE_DAMAGE_PER_SEC,
        durationSeconds: BLACKHOLE_DURATION,
      };
    }

    if (id === 'priestess' && slot === 'Q') {
      return {
        kind: 'sacred_pulse',
        healFraction: SACRED_PULSE_HEAL,
        drainFraction: SACRED_PULSE_DRAIN,
        radius: SACRED_PULSE_RADIUS,
        sourceX: this.x,
        sourceY: this.y,
      };
    }

    if (id === 'priestess' && slot === 'E') {
      return {
        kind: 'divine_surge',
        buffPercent: DIVINE_SURGE_BUFF,
        buffDuration: DIVINE_SURGE_BUFF_DUR,
        debuffPercent: DIVINE_SURGE_DEBUFF,
        debuffDuration: DIVINE_SURGE_DEBUFF_DUR,
        radius: DIVINE_SURGE_RADIUS,
        sourceX: this.x,
        sourceY: this.y,
      };
    }

    // Unreachable with the current 3-hero roster.
    return { kind: 'war_cry_applied' };
  }

  // [BLOCK: Die — Phase 4 Chunk C, Phase 6 Chunk 6C patch]
  // Still flashes white briefly on death (cosmetic), but no longer schedules
  // an auto-revive — death is now permanent until GameScene's RespawnSystem
  // calls respawnAt() (see file-header note).
  die(): void {
    super.die();
    this.diedThisFrame = true;
    this.deathFlashRemaining = HERO_DEATH_FLASH_DURATION_SECONDS;
    this.hasSettledDeadVisual = false;
    this.bodyRect.setFillStyle(0xffffff);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
  }

  // [BLOCK: Consume Died Flag — Phase 4 Chunk C]
  consumeDiedFlag(): boolean {
    const v = this.diedThisFrame;
    this.diedThisFrame = false;
    return v;
  }

  // [BLOCK: Tick Death Visual — Phase 6 Chunk 6C]
  // Replaces the old tickDeathFlashAndRespawn — purely cosmetic now. Counts
  // down the initial white flash, then settles into a dimmed gray tint +
  // reduced alpha to read clearly as "dead, awaiting respawn" for however
  // long the real timer (45s/30s/10s) takes. Does NOT revive — that only
  // happens via respawnAt(), called externally by GameScene.
  private tickDeathVisual(deltaSeconds: number): void {
    if (this.hasSettledDeadVisual) return;

    this.deathFlashRemaining -= deltaSeconds;
    if (this.deathFlashRemaining <= 0) {
      this.bodyRect.setFillStyle(DEAD_TINT_COLOR);
      this.setAlpha(DEAD_ALPHA);
      this.hasSettledDeadVisual = true;
    }
  }

  // [BLOCK: Respawn At — Phase 6 Chunk 6C]
  // Called externally by GameScene once RespawnSystem's shared countdown
  // fires and a nearest-lit-beacon position has been resolved. Repositions
  // the physics body directly (body.reset zeroes velocity too, avoiding any
  // residual drift from the moment of death), revives at hpFraction of max
  // HP (50% per RESPAWN_HP_FRACTION), and restores normal visuals.
  respawnAt(x: number, y: number, hpFraction: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);

    this.revive(this.maxHp * hpFraction);
    this.bodyRect.setFillStyle(this.spawnColorHex);
    this.setAlpha(this.isLeader ? 1 : 0.6);
    this.hasSettledDeadVisual = false;
  }

  // [BLOCK: Update]
  update(deltaSeconds: number, _leader?: Hero): void {
    if (this.isDead) {
      this.tickDeathVisual(deltaSeconds);
      return;
    }

    this.tickStats(deltaSeconds);
    this.projectileCountStat.tick(deltaSeconds);
    this.tickAttackCooldown(deltaSeconds);
    this.tickSkillCooldowns(deltaSeconds);

    // Only self-tick individual pools if SharedPoolSystem hasn't injected a
    // shared pool yet — once injected, SharedPool.tick() handles regen.
    if (!this.sharedManaPool)    this.manaPool?.tick(deltaSeconds);
    if (!this.sharedStaminaPool) this.staminaPool?.tick(deltaSeconds);
  }
}