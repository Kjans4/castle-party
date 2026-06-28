// [File: src/game/entities/Enemy.ts]
// [BLOCK: Enemy Entity — Phase 3 + Phase 4 + Phase 5]
// Movement AI: targets nearest lit beacon, stops at attack range and drains it.
// Aggro fields are mutated once Hero attacks land — AggroSystem reads/writes
// aggroState + aggroTarget; this class just acts on them.
//
// Phase 4 Chunk A added: resistance roll/lock at spawn, receiveAttack() as
// the single entrypoint for incoming damage, and immunity visual feedback.
//
// Phase 4 Chunk B added: Ranger/Priest ranged behavior. When aggroed, these
// two stop moving and fire EnemyProjectiles at the hero instead of melee-
// chasing (see pursueHero). Priest's element (fire/ice/electric) is rolled
// once at spawn and used for both its projectile and body tint, per
// castle-party-phase4-plan.md Section 4.
//
// Phase 5 Chunk 5A added: Elemental Morph colors + flickering alpha visual.
//
// Phase 5 Chunk 5B adds: killer threading through die() (pendingKiller —
// stashed in takeDamage() right before calling super.takeDamage(), since
// Unit.takeDamage's internal HP<=0 check calls this.die() with no args; die()
// reads pendingKiller back if no explicit killer was passed). Also adds Mini
// Spider/Mini Slime's "ignore beacons, chase killer forever" behavior via the
// isMiniUnit bypass — Minis skip pursueBeacon/pursueHero's aggro-state check
// entirely and always chase their locked aggroTarget, retargeting to the
// nearest hero if that hero is dead (Section 7). They're also filtered out of
// AggroSystem entirely on the GameScene side, so nothing ever flips their
// aggroState back to 'beacon'.

import Phaser from 'phaser';
import { Unit } from './Unit';
import type { EnemyConfig } from '@/game/config/enemies';
import type { AttackElement } from '@/game/config/heroes';
import type { Beacon } from './Beacon';
import type { Hero } from './Hero';
import { EnemyProjectile } from './EnemyProjectile';
import { isResisted, rollResistance, type ActualResistance } from '@/game/utils/CombatUtils';
import {
  TILE_SIZE,
  ENEMY_BODY_SIZE,
  ENEMY_ATTACK_RANGE,
  ENEMY_SPAWN_FADE_SECONDS,
  BEACON_LIGHT_RADIUS,
  IMMUNE_FLASH_DURATION,
  IMMUNE_TEXT_DURATION,
  ENEMY_PROJECTILE_RADIUS,
  RANGER_PROJECTILE_SPEED,
  RANGER_ATTACK_INTERVAL,
  RANGER_HERO_DAMAGE,
  PRIEST_PROJECTILE_SPEED,
  PRIEST_ATTACK_INTERVAL,
  PRIEST_HERO_DAMAGE,
  MORPH_FLICKER_MIN_ALPHA,
  MORPH_FLICKER_MAX_ALPHA,
  MORPH_FLICKER_SPEED,
} from '@/game/config/constants';
import { distance } from '@/game/utils/MathUtils';
import { setVelocityToward, stopBody } from '@/game/utils/PhysicsUtils';

// [BLOCK: Aggro State Type]
export type AggroState = 'beacon' | 'hero';

// [BLOCK: Placeholder Color Lookup]
// Ghost (Phase 4A), Ranger (Phase 4B), and the three Elemental Morphs
// (Phase 5A) added. Priest is handled separately below since its color
// depends on a per-instance element roll, not a static per-id lookup.
const ENEMY_COLORS: Record<string, number> = {
  skeleton: 0xcccccc,
  zombie: 0x557755,
  knight: 0x885522,
  ghost: 0xffffff,
  ranger: 0x336633,
  'fire-morph': 0xff4400,
  'ice-morph': 0x44aaff,
  'electric-morph': 0xffff44,
};
const DEFAULT_ENEMY_COLOR = 0x999999;

// Ghost's fixed alpha — "semi-transparent white rectangle, alpha 0.7 at all
// times (even in light)" per castle-party-phase4-plan.md Section 4. This
// bypasses the normal 0.5 -> 1.0 light-fade-in entirely.
const GHOST_FIXED_ALPHA = 0.7;

// [BLOCK: Elemental Morph Ids — Phase 5 Chunk 5A]
const MORPH_IDS = ['fire-morph', 'ice-morph', 'electric-morph'];

// [BLOCK: Mini Unit Ids — Phase 5 Chunk 5B]
const MINI_IDS = ['mini-spider', 'mini-slime'];

// [BLOCK: Priest Element Roll — Phase 4 Chunk B]
// "Element assigned at spawn" per Section 4's roll table (33/33/33 — equal
// odds, unlike the resistance roll's weighted table).
const PRIEST_ELEMENTS: AttackElement[] = ['fire', 'ice', 'electric'];
function rollPriestElement(): AttackElement {
  return PRIEST_ELEMENTS[Math.floor(Math.random() * PRIEST_ELEMENTS.length)];
}

// Tinted purple per element, per Section 4's visual spec ("red-orange for
// fire, blue for ice, yellow for electric") — kept in the purple family
// rather than pure element colors so Priest still reads as one enemy type.
const PRIEST_ELEMENT_TINTS: Record<string, number> = {
  fire: 0x99334d,
  ice: 0x4d3399,
  electric: 0x998c33,
};

// [BLOCK: Enemy Class]
export class Enemy extends Unit {
  readonly config: EnemyConfig;

  // [BLOCK: Resistance — Phase 4 Chunk A]
  readonly resistance: ActualResistance;

  // [BLOCK: Priest Element — Phase 4 Chunk B]
  // Only set for Priest; undefined for every other enemy id.
  readonly priestElement?: AttackElement;

  // [BLOCK: Aggro State — written by AggroSystem / hit reactions]
  // For Mini units this is set once at spawn time by GameScene and never
  // touched by AggroSystem again (GameScene filters Minis out of the array
  // it passes to AggroSystem.update()).
  aggroState: AggroState = 'beacon';
  aggroTarget: Hero | null = null;

  // [BLOCK: Beacon Targeting]
  private targetBeacon: Beacon | null = null;
  private isAttackingBeacon: boolean = false;
  private attackPulseElapsed: number = 0;

  // [BLOCK: Spawn Light Fade]
  private hasEnteredLight: boolean = false;
  private lightFadeElapsed: number = 0;

  // [BLOCK: Morph Flicker — Phase 5 Chunk 5A]
  private morphFlickerElapsed: number = 0;

  // [BLOCK: Ranged Attack Cooldown — Phase 4 Chunk B]
  private rangedCooldownRemaining: number = 0;

  // [BLOCK: Pending Killer — Phase 5 Chunk 5B]
  // Stashed by takeDamage() right before calling super.takeDamage(), since
  // Unit.takeDamage's internal HP<=0 branch calls this.die() with no
  // arguments. die() reads this back if it wasn't given an explicit killer.
  private pendingKiller?: Hero;

  // [BLOCK: Visuals]
  private bodyRect: Phaser.GameObjects.Rectangle;
  private aimIndicator: Phaser.GameObjects.Triangle;
  private readonly spawnColor: number;

  // [BLOCK: Immunity Feedback — Phase 4 Chunk A]
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

    // [BLOCK: Resistance Resolution — Phase 4 Chunk A]
    this.resistance = config.resistance === 'random'
      ? rollResistance()
      : (config.resistance as ActualResistance);

    // [BLOCK: Priest Element Resolution — Phase 4 Chunk B]
    this.priestElement = config.id === 'priest' ? rollPriestElement() : undefined;

    // [BLOCK: Visual Setup]
    // Priest's color depends on its rolled element; everything else uses the
    // static per-id lookup. spawnColor is cached so immune-flash restore
    // doesn't need to re-derive it.
    const color = config.id === 'priest' && this.priestElement
      ? PRIEST_ELEMENT_TINTS[this.priestElement]
      : ENEMY_COLORS[config.id] ?? DEFAULT_ENEMY_COLOR;
    this.spawnColor = color;

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

  // [BLOCK: Is Ranged Attacker — Phase 4 Chunk B]
  get isRangedAttacker(): boolean {
    return this.config.id === 'ranger' || this.config.id === 'priest';
  }

  // [BLOCK: Is Elemental Morph — Phase 5 Chunk 5A]
  get isMorph(): boolean {
    return MORPH_IDS.includes(this.config.id);
  }

  // [BLOCK: Is Mini Unit — Phase 5 Chunk 5B]
  get isMiniUnit(): boolean {
    return MINI_IDS.includes(this.config.id);
  }

  // [BLOCK: Update]
  // beacons: full roster, used to find nearest lit target and re-target if
  // the current one goes out. heroes: full roster, used only by Mini units
  // to retarget if their locked target hero has died. Returns a freshly
  // fired EnemyProjectile this frame (Ranger/Priest only), or null most
  // frames — GameScene collects these into its own tracked array.
  update(deltaSeconds: number, beacons: Beacon[], heroes: Hero[]): EnemyProjectile | null {
    if (this.isDead) return null;

    this.tickStats(deltaSeconds);
    this.updateLightFade(deltaSeconds, beacons);
    this.updateMorphFlicker(deltaSeconds);
    this.tickImmuneFeedback(deltaSeconds);

    // [BLOCK: Mini Unit Bypass — Phase 5 Chunk 5B]
    // Minis never evaluate aggroState/beacon logic at all — they always
    // chase their locked target, full stop. Per Section 7: "ignores all
    // beacons", "does NOT return to beacon — continues chasing its target
    // hero indefinitely until killed."
    if (this.isMiniUnit) {
      this.pursueMiniTarget(heroes);
      return null;
    }

    if (this.aggroState === 'hero' && this.aggroTarget) {
      return this.pursueHero(this.aggroTarget, deltaSeconds);
    }

    this.pursueBeacon(beacons, deltaSeconds);
    return null;
  }

  // [BLOCK: Light Fade]
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

  // [BLOCK: Morph Flicker — Phase 5 Chunk 5A]
  // Ambient alpha oscillation between MORPH_FLICKER_MIN_ALPHA and
  // MORPH_FLICKER_MAX_ALPHA, active only once the Morph has crossed into
  // light (hasEnteredLight). Note: this intentionally takes over alpha from
  // updateLightFade the same frame light is entered — Morphs skip the
  // ordinary 0.5->1.0 fade-in ramp and go straight to flickering.
  private updateMorphFlicker(deltaSeconds: number): void {
    if (!this.isMorph || !this.hasEnteredLight) return;

    this.morphFlickerElapsed += deltaSeconds;
    const t = 0.5 * (1 + Math.sin(this.morphFlickerElapsed * MORPH_FLICKER_SPEED));
    const alpha = MORPH_FLICKER_MIN_ALPHA + (MORPH_FLICKER_MAX_ALPHA - MORPH_FLICKER_MIN_ALPHA) * t;
    this.setAlpha(alpha);
  }

  // [BLOCK: Pursue Mini Target — Phase 5 Chunk 5B]
  // Always chases aggroTarget (locked at spawn by GameScene to the hero who
  // killed this Mini's parent). If that hero is dead, retargets the nearest
  // living hero per Section 7. Never touches a beacon, never times out.
  // Note: no contact-damage application happens here — see the file-level
  // flag below on melee-vs-hero contact damage not existing anywhere yet in
  // the codebase (this is a pre-existing gap that predates Phase 5, not
  // something introduced by Minis; flagging rather than silently inventing
  // a new combat mechanic outside this chunk's scope).
  private pursueMiniTarget(heroes: Hero[]): void {
    if (!this.aggroTarget || this.aggroTarget.isDead) {
      this.aggroTarget = this.findNearestHero(heroes);
    }

    if (!this.aggroTarget) {
      stopBody(this.body as Phaser.Physics.Arcade.Body);
      return;
    }

    this.moveToward(this.aggroTarget.x, this.aggroTarget.y);
  }

  // [BLOCK: Find Nearest Hero — Phase 5 Chunk 5B]
  private findNearestHero(heroes: Hero[]): Hero | null {
    let nearest: Hero | null = null;
    let nearestDist = Infinity;

    for (const hero of heroes) {
      if (hero.isDead) continue;
      const d = distance(this.x, this.y, hero.x, hero.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = hero;
      }
    }

    return nearest;
  }

  // [BLOCK: Pursue Beacon]
  private pursueBeacon(beacons: Beacon[], deltaSeconds: number): void {
    if (!this.targetBeacon || !this.targetBeacon.isLit) {
      this.targetBeacon = this.findNearestLitBeacon(beacons);
    }

    if (!this.targetBeacon) {
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
        this.targetBeacon = null;
        this.setIsAttacking(false);
      }
      return;
    }

    this.setIsAttacking(false);
    this.moveToward(this.targetBeacon.x, this.targetBeacon.y);
  }

  // [BLOCK: Pursue Hero]
  // Melee-type enemies (Skeleton, Zombie, Knight, Ghost, Morphs) chase and
  // close distance. Ranged enemies (Ranger, Priest) stop where they are and
  // fire instead — see standAndFire. Per castle-party-phase4-plan.md
  // Section 4: "If hero moves out of aggro range: resumes toward beacon" is
  // handled by AggroSystem flipping aggroState back to 'beacon', not here.
  // (Mini units never reach this method — they're intercepted in update().)
  private pursueHero(hero: Hero, deltaSeconds: number): EnemyProjectile | null {
    this.setIsAttacking(false);

    if (this.isRangedAttacker) {
      return this.standAndFire(hero, deltaSeconds);
    }

    this.moveToward(hero.x, hero.y);
    return null;
  }

  // [BLOCK: Stand And Fire — Phase 4 Chunk B]
  // Stops moving, faces the hero, ticks its own ranged cooldown, and fires
  // an EnemyProjectile once the cooldown elapses.
  private standAndFire(hero: Hero, deltaSeconds: number): EnemyProjectile | null {
    stopBody(this.body as Phaser.Physics.Arcade.Body);

    const angle = Math.atan2(hero.y - this.y, hero.x - this.x);
    this.aimIndicator.setRotation(angle + Math.PI / 2);

    this.tickRangedCooldown(deltaSeconds);
    if (this.rangedCooldownRemaining > 0) return null;

    this.resetRangedCooldown();
    return this.fireProjectileAt(hero, angle);
  }

  // [BLOCK: Tick / Reset Ranged Cooldown]
  private tickRangedCooldown(deltaSeconds: number): void {
    if (this.rangedCooldownRemaining > 0) {
      this.rangedCooldownRemaining = Math.max(0, this.rangedCooldownRemaining - deltaSeconds);
    }
  }

  private resetRangedCooldown(): void {
    this.rangedCooldownRemaining = this.config.id === 'priest' ? PRIEST_ATTACK_INTERVAL : RANGER_ATTACK_INTERVAL;
  }

  // [BLOCK: Fire Projectile At Hero — Phase 4 Chunk B]
  // Ranger always fires physical; Priest fires whichever element it rolled
  // at spawn (fire/ice/electric — never the generic 'magic' from its config,
  // since that field only exists to mark "this enemy uses magic damage").
  private fireProjectileAt(hero: Hero, angle: number): EnemyProjectile {
    const isPriest = this.config.id === 'priest';

    const damage = isPriest ? PRIEST_HERO_DAMAGE : RANGER_HERO_DAMAGE;
    const speed = isPriest ? PRIEST_PROJECTILE_SPEED : RANGER_PROJECTILE_SPEED;
    const attackElement: AttackElement = isPriest ? (this.priestElement ?? 'magic') : 'physical';

    const projectile = new EnemyProjectile(this.scene, this.x, this.y, {
      damage,
      speed,
      radius: ENEMY_PROJECTILE_RADIUS,
      attackElement,
      sourceEnemy: this,
    });
    projectile.launch(angle);

    return projectile;
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

  // [BLOCK: Receive Attack — Phase 4 Chunk A]
  receiveAttack(amount: number, element: AttackElement, attacker?: Hero): number {
    if (this.isDead) return 0;

    if (isResisted(this.resistance, element)) {
      this.playImmuneFeedback();
      return 0;
    }

    return this.takeDamage(amount, element === 'physical', attacker);
  }

  // [BLOCK: Play Immune Feedback — Phase 4 Chunk A]
  // Restores to spawnColor (cached at construction) rather than re-deriving
  // from ENEMY_COLORS, since Priest's color isn't in that static lookup.
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

  // [BLOCK: Tick Immune Feedback — Phase 4 Chunk A]
  private tickImmuneFeedback(deltaSeconds: number): void {
    if (this.flashRemainingMs > 0) {
      this.flashRemainingMs = Math.max(0, this.flashRemainingMs - deltaSeconds * 1000);
      if (this.flashRemainingMs <= 0) {
        this.bodyRect.setFillStyle(this.spawnColor);
      }
    }

    if (this.immuneText && this.immuneTextElapsedMs < IMMUNE_TEXT_DURATION) {
      this.immuneTextElapsedMs += deltaSeconds * 1000;
      const t = Math.min(1, this.immuneTextElapsedMs / IMMUNE_TEXT_DURATION);
      this.immuneText.setPosition(this.x, this.y - 20 - t * 16);
      this.immuneText.setAlpha(1 - t);
    }
  }

  // [BLOCK: Take Damage — Phase 5 Chunk 5B patch]
  // Stashes attacker into pendingKiller BEFORE calling super.takeDamage(),
  // since Unit.takeDamage's internal HP<=0 branch calls this.die() with no
  // arguments — die() (below) reads pendingKiller back at that point. The
  // stash is cleared again right after, regardless of whether death
  // actually occurred this call.
  takeDamage(amount: number, isPhysical: boolean = true, attacker?: Hero): number {
    this.pendingKiller = attacker;
    const dealt = super.takeDamage(amount, isPhysical);
    this.pendingKiller = undefined;

    if (attacker && !this.isDead) {
      this.aggroState = 'hero';
      this.aggroTarget = attacker;
    }

    return dealt;
  }

  // [BLOCK: Die — Phase 5 Chunk 5B patch]
  // killer falls back to pendingKiller when called with no args (i.e. from
  // Unit.takeDamage's internal death check). GameScene reads lastKiller
  // (inherited from Unit) in cleanupDeadEnemies() to target Mini units at
  // whoever landed the kill — see castle-party-phase5-plan.md Section 7.
  die(killer?: Hero): void {
    super.die(killer ?? this.pendingKiller);
    stopBody(this.body as Phaser.Physics.Arcade.Body);
    this.setIsAttacking(false);
  }

  // [BLOCK: Destroy — Phase 4 Chunk A]
  destroy(fromScene?: boolean): void {
    this.immuneText?.destroy();
    super.destroy(fromScene);
  }
}