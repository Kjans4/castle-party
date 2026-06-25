// [File: src/game/entities/Enemy.ts]
// [BLOCK: Enemy Entity — Phase 3 + Phase 4]
// Movement AI: targets nearest lit beacon, stops at attack range and drains it.
// Aggro fields exist here but are only mutated once Hero attacks land (Chunk B) —
// AggroSystem reads/writes aggroState + aggroTarget; this class just acts on them.
//
// Phase 4 adds: resistance roll/lock at spawn, receiveAttack() as the single
// entrypoint for incoming damage (resolves resistance before delegating to
// takeDamage — see castle-party-phase4-plan.md Section 3), and immunity
// visual feedback (white flash + floating "IMMUNE" text) on resisted hits.

import Phaser from 'phaser';
import { Unit } from './Unit';
import type { EnemyConfig } from '@/game/config/enemies';
import type { AttackElement } from '@/game/config/heroes';
import type { Beacon } from './Beacon';
import type { Hero } from './Hero';
import { isResisted, rollResistance, type ActualResistance } from '@/game/utils/CombatUtils';
import {
  TILE_SIZE,
  ENEMY_BODY_SIZE,
  ENEMY_ATTACK_RANGE,
  ENEMY_SPAWN_FADE_SECONDS,
  BEACON_LIGHT_RADIUS,
  IMMUNE_FLASH_DURATION,
  IMMUNE_TEXT_DURATION,
} from '@/game/config/constants';
import { distance } from '@/game/utils/MathUtils';
import { setVelocityToward, stopBody } from '@/game/utils/PhysicsUtils';

// [BLOCK: Aggro State Type]
export type AggroState = 'beacon' | 'hero';

// [BLOCK: Placeholder Color Lookup]
// Ghost added for Phase 4 — semi-transparent white per horde.md visual spec.
const ENEMY_COLORS: Record<string, number> = {
  skeleton: 0xcccccc,
  zombie: 0x557755,
  knight: 0x885522,
  ghost: 0xffffff,
};
const DEFAULT_ENEMY_COLOR = 0x999999;

// Ghost's fixed alpha — "semi-transparent white rectangle, alpha 0.7 at all
// times (even in light)" per castle-party-phase4-plan.md Section 4. This
// bypasses the normal 0.5 -> 1.0 light-fade-in entirely.
const GHOST_FIXED_ALPHA = 0.7;

// [BLOCK: Enemy Class]
export class Enemy extends Unit {
  readonly config: EnemyConfig;

  // [BLOCK: Resistance — Phase 4]
  readonly resistance: ActualResistance;

  // [BLOCK: Aggro State — written by AggroSystem / hit reactions (Chunk B)]
  aggroState: AggroState = 'beacon';
  aggroTarget: Hero | null = null;

  // [BLOCK: Beacon Targeting]
  private targetBeacon: Beacon | null = null;
  private isAttackingBeacon: boolean = false;
  private attackPulseElapsed: number = 0;

  // [BLOCK: Spawn Light Fade]
  private hasEnteredLight: boolean = false;
  private lightFadeElapsed: number = 0;

  // [BLOCK: Visuals]
  private bodyRect: Phaser.GameObjects.Rectangle;
  private aimIndicator: Phaser.GameObjects.Triangle;

  // [BLOCK: Immunity Feedback — Phase 4]
  private flashRemainingMs: number = 0;
  private immuneText?: Phaser.GameObjects.Text;
  private immuneTextElapsedMs: number = IMMUNE_TEXT_DURATION; // starts "expired" (hidden)

  constructor(scene: Phaser.Scene, x: number, y: number, config: EnemyConfig) {
    super({
      scene,
      x,
      y,
      hp: config.hp,
      defense: 0,
      movementSpeed: config.movementSpeed,
      label: config.name,
    });

    this.config = config;

    // [BLOCK: Resistance Resolution — Phase 4]
    // 'random' configs roll now; locked configs (e.g. Ghost's 'physical')
    // pass straight through — no roll, no override possible.
    this.resistance = config.resistance === 'random'
      ? rollResistance()
      : (config.resistance as ActualResistance);

    // [BLOCK: Visual Setup]
    const color = ENEMY_COLORS[config.id] ?? DEFAULT_ENEMY_COLOR;

    this.bodyRect = scene.add.rectangle(0, 0, ENEMY_BODY_SIZE, ENEMY_BODY_SIZE, color);

    this.aimIndicator = scene.add.triangle(
      0, -(ENEMY_BODY_SIZE / 2 + 8),
      0, -5,
      -4, 4,
      4, 4,
      0xffffff, 0.8
    );

    this.add([this.bodyRect, this.aimIndicator]);

    // Spawns semi-transparent in darkness until it crosses into a light radius
    // — except Ghost, which stays fixed at GHOST_FIXED_ALPHA regardless.
    this.setAlpha(config.id === 'ghost' ? GHOST_FIXED_ALPHA : 0.5);

    // [BLOCK: Physics Body]
    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(ENEMY_BODY_SIZE, ENEMY_BODY_SIZE);
  }

  // [BLOCK: Update]
  // beacons: full roster, used to find nearest lit target and re-target if
  // the current one goes out. Hero-chase branch exists for Chunk B but is
  // unreachable until something sets aggroState = 'hero'.
  update(deltaSeconds: number, beacons: Beacon[]): void {
    if (this.isDead) return;

    this.tickStats(deltaSeconds);
    this.updateLightFade(deltaSeconds, beacons);
    this.tickImmuneFeedback(deltaSeconds);

    if (this.aggroState === 'hero' && this.aggroTarget) {
      this.pursueHero(this.aggroTarget, deltaSeconds);
    } else {
      this.pursueBeacon(beacons, deltaSeconds);
    }
  }

  // [BLOCK: Light Fade]
  // One-way crossing fade: once the enemy enters any lit beacon's light radius,
  // it fades from 0.5 to 1.0 alpha over ENEMY_SPAWN_FADE_SECONDS and stays there.
  // Ghost is exempt entirely — it never leaves GHOST_FIXED_ALPHA.
  private updateLightFade(deltaSeconds: number, beacons: Beacon[]): void {
    if (this.config.id === 'ghost') return;

    if (this.hasEnteredLight) {
      if (this.lightFadeElapsed < ENEMY_SPAWN_FADE_SECONDS) {
        this.lightFadeElapsed += deltaSeconds;
        const t = Math.min(1, this.lightFadeElapsed / ENEMY_SPAWN_FADE_SECONDS);
        this.setAlpha(0.5 + 0.5 * t);
      }
      return;
    }

    const inLight = beacons.some(
      (b) => b.isLit && distance(this.x, this.y, b.x, b.y) <= BEACON_LIGHT_RADIUS
    );

    if (inLight) {
      this.hasEnteredLight = true;
      this.lightFadeElapsed = 0;
    }
  }

  // [BLOCK: Pursue Beacon]
  private pursueBeacon(beacons: Beacon[], deltaSeconds: number): void {
    if (!this.targetBeacon || !this.targetBeacon.isLit) {
      this.targetBeacon = this.findNearestLitBeacon(beacons);
    }

    if (!this.targetBeacon) {
      // No lit beacons left — should only happen for one frame before the
      // loss condition fires in GameScene. Just stop moving.
      stopBody(this.body as Phaser.Physics.Arcade.Body);
      this.setIsAttacking(false);
      return;
    }

    const d = distance(this.x, this.y, this.targetBeacon.x, this.targetBeacon.y);

    if (d <= ENEMY_ATTACK_RANGE) {
      stopBody(this.body as Phaser.Physics.Arcade.Body);
      this.setIsAttacking(true);
      this.tickAttackPulse(deltaSeconds);
      this.targetBeacon.drain(this.config.attackDamage * deltaSeconds);

      if (!this.targetBeacon.isLit) {
        // Extinguished mid-attack — force a re-target next frame.
        this.targetBeacon = null;
        this.setIsAttacking(false);
      }
      return;
    }

    this.setIsAttacking(false);
    this.moveToward(this.targetBeacon.x, this.targetBeacon.y);
  }

  // [BLOCK: Pursue Hero — Chunk B]
  private pursueHero(hero: Hero, _deltaSeconds: number): void {
    this.setIsAttacking(false);
    this.moveToward(hero.x, hero.y);
  }

  // [BLOCK: Move Toward Point]
  private moveToward(targetX: number, targetY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const speed = this.speedStat.getValue() * TILE_SIZE;

    setVelocityToward(body, this.x, this.y, targetX, targetY, speed);

    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    this.aimIndicator.setRotation(angle + Math.PI / 2);
  }

  // [BLOCK: Find Nearest Lit Beacon]
  private findNearestLitBeacon(beacons: Beacon[]): Beacon | null {
    let nearest: Beacon | null = null;
    let nearestDist = Infinity;

    for (const beacon of beacons) {
      if (!beacon.isLit) continue;
      const d = distance(this.x, this.y, beacon.x, beacon.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = beacon;
      }
    }

    return nearest;
  }

  // [BLOCK: Attack Pulse Visual]
  // Scale oscillates 1.0–1.05 while actively draining a beacon.
  private setIsAttacking(value: boolean): void {
    if (this.isAttackingBeacon === value) return;
    this.isAttackingBeacon = value;
    if (!value) {
      this.attackPulseElapsed = 0;
      this.setScale(1);
    }
  }

  private tickAttackPulse(deltaSeconds: number): void {
    this.attackPulseElapsed += deltaSeconds;
    const pulse = 1 + 0.05 * Math.sin(this.attackPulseElapsed * 10);
    this.setScale(pulse);
  }

  // [BLOCK: Receive Attack — Phase 4]
  // Single entrypoint for all incoming damage (melee cone + projectile hits
  // both route through CombatUtils.applyDamage -> here). Resolves resistance
  // first; on resist, plays immunity feedback, deals zero damage, and — by
  // simply returning before calling takeDamage — never flips aggro. That's
  // exactly the Ghost design intent: physical hits are shrugged off entirely,
  // magic hits both damage AND flip aggro via takeDamage's existing hook.
  receiveAttack(amount: number, element: AttackElement, attacker?: Hero): number {
    if (this.isDead) return 0;

    if (isResisted(this.resistance, element)) {
      this.playImmuneFeedback();
      return 0;
    }

    return this.takeDamage(amount, element === 'physical', attacker);
  }

  // [BLOCK: Play Immune Feedback — Phase 4]
  // White flash on the body rect + floating "IMMUNE" text in grey, per
  // castle-party-phase4-plan.md Section 7. Reuses a single Text object across
  // repeated immune hits rather than spawning a new one each time.
  private playImmuneFeedback(): void {
    this.flashRemainingMs = IMMUNE_FLASH_DURATION;
    this.bodyRect.setFillStyle(0xffffff);

    if (!this.immuneText) {
      this.immuneText = this.scene.add.text(this.x, this.y - 20, 'IMMUNE', {
        fontSize: '10px',
        color: 'rgba(255,255,255,0.5)',
      });
      this.immuneText.setOrigin(0.5, 1);
    }

    this.immuneText.setPosition(this.x, this.y - 20);
    this.immuneText.setAlpha(1);
    this.immuneTextElapsedMs = 0;
  }

  // [BLOCK: Tick Immune Feedback — Phase 4]
  private tickImmuneFeedback(deltaSeconds: number): void {
    if (this.flashRemainingMs > 0) {
      this.flashRemainingMs = Math.max(0, this.flashRemainingMs - deltaSeconds * 1000);
      if (this.flashRemainingMs <= 0) {
        const color = ENEMY_COLORS[this.config.id] ?? DEFAULT_ENEMY_COLOR;
        this.bodyRect.setFillStyle(color);
      }
    }

    if (this.immuneText && this.immuneTextElapsedMs < IMMUNE_TEXT_DURATION) {
      this.immuneTextElapsedMs += deltaSeconds * 1000;
      const t = Math.min(1, this.immuneTextElapsedMs / IMMUNE_TEXT_DURATION);
      this.immuneText.setPosition(this.x, this.y - 20 - t * 16);
      this.immuneText.setAlpha(1 - t);
    }
  }

  // [BLOCK: Take Damage — Chunk B hook]
  // Overridden so a hit can also flip aggro to the attacking hero.
  // Only reached via receiveAttack() once resistance has already been
  // cleared — direct callers bypassing receiveAttack get the same behavior
  // as before Phase 4 (no resistance check), so existing call sites outside
  // combat (if any) are unaffected.
  takeDamage(amount: number, isPhysical: boolean = true, attacker?: Hero): number {
    const dealt = super.takeDamage(amount, isPhysical);

    if (attacker && !this.isDead) {
      this.aggroState = 'hero';
      this.aggroTarget = attacker;
    }

    return dealt;
  }

  // [BLOCK: Die]
  die(): void {
    super.die();
    stopBody(this.body as Phaser.Physics.Arcade.Body);
    this.setIsAttacking(false);
    // TODO Chunk B/C: XP shard spawn + Phaser object destroy handled by GameScene,
    // since shard creation needs scene-level access this entity doesn't have.
  }

  // [BLOCK: Destroy — Phase 4]
  // Cleans up the floating immune-text object, which isn't a child of this
  // Container (it's added directly to the scene so it can survive position
  // updates independent of container transforms).
  destroy(fromScene?: boolean): void {
    this.immuneText?.destroy();
    super.destroy(fromScene);
  }
}