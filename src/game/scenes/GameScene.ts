// [File: src/game/scenes/GameScene.ts]
// [BLOCK: Game Scene]
// Main gameplay scene. Owns world, camera, heroes, beacons, and input.
// Writes to Zustand store each tick — React HUD reads from it.
//
// Phase 4/5 history: see prior file headers in version control — resistance
// system, wave batches, mini-unit death spawns, ranged enemies all already
// live as of Phase 5.
//
// Phase 6 Chunk 6A: Card Draft System — draft triggers on level-up, resolves
// via store polling (consumeDraftPick), applies UpgradeConfig.effect(heroes).
//
// Phase 6 Chunk 6B: Spell System + Hero Skills.
//   - Q/E/Z key bindings added alongside existing 1/2/3 leader-switch keys.
//   - SharedPoolSystem initialized after spawnHeroes(), ticked each frame,
//     injected into each Hero via setSharedPools().
//   - resolveAttackResult / updateHeroAttacks updated for Hero.tryAttack()'s
//     new AttackResult[] | null signature (Multishot support).
//   - Skill activation (Q/E) resolves Hero.tryActivateSkill()'s returned
//     SkillResult against this scene's own Enemy[]/Hero[] arrays. Skills
//     needing a delay or duration (Barrage's slash loop, Meteor Shower's
//     impact delay, Blackhole's pull-tick) are tracked in per-frame-ticked
//     arrays, mirroring the existing projectiles/xpShards pattern.
//   - Spell casting (Z key) resolves the first held spell in activeSpells,
//     respecting the shared 5s cooldown tracked in gameStore.
//   - RunModifiers.tick() called once per frame for Relentless's duration
//     countdown; RunModifiers.reset() called in create() for run-start hygiene.

// Phase 6 Chunk 6B: Spell System + Hero Skills (Q/E/Z input, SharedPoolSystem,
// tracked skill effects). See prior header for details.
//
// Phase 6 Chunk 6C: Real Respawn System.
//   - RespawnSystem wired into update(): computes live dead-hero count each
//     frame, fires a shared respawn signal per the 45s/30s/10s table.
//   - On fire, each still-dead hero is repositioned to the nearest LIT
//     beacon to where they died (findNearestLitBeaconTo) and revived at
//     RESPAWN_HP_FRACTION (50%) via Hero.respawnAt().
//   - Team wipe (all 3 dead simultaneously): isTeamWiped freezes player
//     input (movement/attacks/skills) for the WHOLE frame loop, but enemies,
//     spawning, beacons, and the respawn countdown all keep ticking. Camera
//     naturally stays put since the (dead, frozen) leader isn't moving.
//   - Leader-switch keys (1/2/3) now skip dead heroes entirely — cannot
//     switch onto a corpse.
//   - DELIBERATE BEHAVIOR CHANGE, confirmed by explicit user instruction:
//     checkWinLossConditions() no longer treats litCount === 0 as an instant
//     loss condition (this overrides the Phase 2/3 design). Defeat is now
//     triggered ONLY when a full team-wipe's respawn timer fires and there
//     is no lit beacon left to respawn at — losing all beacons alone no
//     longer ends the run by itself. Flagging this prominently since it's a
//     real divergence from the original castle-party.md loss-condition
//     design, not a Chunk 6C plan item — "that's for now" per instruction,
//     implying this may be revisited in a future phase.

import Phaser from 'phaser';
import {
  WORLD_W, WORLD_H, TILE_SIZE, CAMERA_LERP,
  HERO_SPAWN_X, HERO_SPAWN_Y,
  BEACON_LIGHT_RADIUS, BEACON_HEAL_RATE,
  DARKNESS_OVERLAY_DEPTH,
  ENEMY_BODY_SIZE, COMPANION_ATTACK_RANGE, HERO_MELEE_RANGE, HERO_BODY_W,
  XP_COLLECT_RADIUS, XP_SHARD_SKELETON, XP_SHARD_ZOMBIE, XP_SHARD_KNIGHT, XP_SHARD_GHOST,
  XP_SHARD_MORPH, XP_SHARD_SPIDER, XP_SHARD_SLIME, XP_SHARD_RANGER, XP_SHARD_PRIEST,
  MINI_SPAWN_COUNT,
  LEVEL_UP_HEAL_FRACTION,
  METEOR_IMPACT_RADIUS,
  BLACKHOLE_PULL_SPEED,
  RESPAWN_HP_FRACTION,
} from '@/game/config/constants';
import { HERO_ROSTER } from '@/game/config/heroes';
import { BEACON_ROSTER } from '@/game/config/beacons';
import { registerAnimations } from '@/game/animations/registry';
import { Hero, type AttackResult, type SkillResult } from '@/game/entities/Hero';
import { Beacon } from '@/game/entities/Beacon';
import { Enemy } from '@/game/entities/Enemy';
import { Projectile } from '@/game/entities/Projectile';
import { EnemyProjectile } from '@/game/entities/EnemyProjectile';
import { XPShard } from '@/game/entities/XPShard';
import { generateBeaconPositions } from '@/game/utils/BeaconPlacement';
import { distance } from '@/game/utils/MathUtils';
import { applyDamage } from '@/game/utils/CombatUtils';
import { percentModifier } from '@/game/primitives/Modifier';
import { DarknessSystem } from '@/game/systems/DarknessSystem';
import { SpawnSystem } from '@/game/systems/SpawnSystem';
import { AggroSystem } from '@/game/systems/AggroSystem';
import { DraftSystem } from '@/game/systems/DraftSystem';
import { SharedPoolSystem } from '@/game/systems/SharedPoolSystem';
import { RespawnSystem } from '@/game/systems/RespawnSystem';
import { RunModifiers } from '@/game/systems/RunModifiers';
import { ENEMY_ROSTER } from '@/game/config/enemies';
import { useGameStore } from '@/ui/store/gameStore';
import type { SpellCastContext } from '@/game/config/upgrades';
import { SPELL_ROSTER } from '@/game/config/upgrades';

// [BLOCK: XP Value Lookup]
const XP_VALUE_BY_ENEMY_ID: Record<string, number> = {
  skeleton: XP_SHARD_SKELETON,
  zombie: XP_SHARD_ZOMBIE,
  knight: XP_SHARD_KNIGHT,
  ghost: XP_SHARD_GHOST,
  ranger: XP_SHARD_RANGER,
  priest: XP_SHARD_PRIEST,
  'fire-morph': XP_SHARD_MORPH,
  'ice-morph': XP_SHARD_MORPH,
  'electric-morph': XP_SHARD_MORPH,
  spider: XP_SHARD_SPIDER,
  slime: XP_SHARD_SLIME,
};

// [BLOCK: Death Spawn Parent -> Mini Lookup — Phase 5 Chunk 5B]
const DEATH_SPAWN_PARENT_TO_MINI: Record<string, string> = {
  spider: 'mini-spider',
  slime: 'mini-slime',
};

// [BLOCK: Spell Lookup — Phase 6 Chunk 6B]
const spellById = new Map(SPELL_ROSTER.map((s) => [s.id, s]));

// [BLOCK: Tracked Skill Effect Types — Phase 6 Chunk 6B]
// Mirror the existing projectiles/xpShards array pattern: plain data, ticked
// each frame in update(), pruned when finished. No Phaser GameObject backing
// these except transient visual flashes spawned at resolution time.
interface PendingBarrage {
  hero: Hero;
  aimAngle: number;
  damage: number;
  range: number;
  coneAngleDeg: number;
  slashesRemaining: number;
  intervalRemaining: number;
  intervalSeconds: number;
}

interface PendingMeteor {
  x: number;
  y: number;
  damage: number;
  detonateInSeconds: number;
}

interface ActiveBlackhole {
  x: number;
  y: number;
  pullRadius: number;
  damagePerSec: number;
  remainingSeconds: number;
}

interface ScheduledSpellEffect {
  tickFn: (deltaSeconds: number) => void;
  remainingSeconds: number;
}

// [BLOCK: Game Scene Class]
export class GameScene extends Phaser.Scene {
  // [BLOCK: Heroes]
  private heroes: Hero[] = [];
  private leaderIndex: number = 0;

  // [BLOCK: Beacons]
  private beacons: Beacon[] = [];

  // [BLOCK: Enemies]
  private enemies: Enemy[] = [];
  private spawnSystem: SpawnSystem = new SpawnSystem();
  private aggroSystem: AggroSystem = new AggroSystem();
  private enemyConfigById = new Map(ENEMY_ROSTER.map((cfg) => [cfg.id, cfg]));

  // [BLOCK: Draft — Phase 6 Chunk 6A]
  private draftSystem: DraftSystem = new DraftSystem();

  // [BLOCK: Shared Resource Pools — Phase 6 Chunk 6B]
  private sharedPoolSystem: SharedPoolSystem = new SharedPoolSystem();

  // [BLOCK: Respawn — Phase 6 Chunk 6C]
  private respawnSystem: RespawnSystem = new RespawnSystem();
  // Input-freeze flag: true when all 3 heroes are dead simultaneously. While
  // true the hero update/attack/skill/spell blocks are skipped entirely, but
  // enemies, spawning, beacons, and the respawn countdown keep ticking.
  private isTeamWiped: boolean = false;

  // [BLOCK: Projectiles]
  private projectiles: Projectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];

  // [BLOCK: XP Shards]
  private xpShards: XPShard[] = [];

  // [BLOCK: Tracked Skill/Spell Effects — Phase 6 Chunk 6B]
  private pendingBarrages: PendingBarrage[] = [];
  private pendingMeteors: PendingMeteor[] = [];
  private activeBlackholes: ActiveBlackhole[] = [];
  private scheduledSpellEffects: ScheduledSpellEffect[] = [];

  // [BLOCK: Darkness]
  private darknessSystem: DarknessSystem = new DarknessSystem();
  private darknessOverlay!: Phaser.GameObjects.Rectangle;

  // [BLOCK: Run Ending — Win/Loss]
  private static readonly DEFEAT_FADE_SECONDS = 1.5;
  private runEnded: boolean = false;
  private defeatFadeElapsed: number = 0;
  private isDefeatFading: boolean = false;

  // [BLOCK: Input]
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private keys1!: Phaser.Input.Keyboard.Key;
  private keys2!: Phaser.Input.Keyboard.Key;
  private keys3!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyZ!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene' });
  }

  // [BLOCK: Preload]
  preload(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture('placeholder', TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  // [BLOCK: Create]
  create(): void {
    registerAnimations(this);

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.createWorldBackground();
    this.createGridOverlay();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keys1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keys2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keys3 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyQ  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyZ  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    RunModifiers.reset();

    this.spawnHeroes();
    this.spawnBeacons();
    this.createDarknessOverlay();

    this.sharedPoolSystem.initialize(this.heroes);

    useGameStore.getState().setRunActive(true);
  }

  // [BLOCK: Spawn Heroes]
  private spawnHeroes(): void {
    const spacing = 60;

    HERO_ROSTER.forEach((config, i) => {
      const hero = new Hero(this, HERO_SPAWN_X, HERO_SPAWN_Y + (i - 1) * spacing, config);
      this.heroes.push(hero);
    });

    this.setLeader(0);
  }

  // [BLOCK: Spawn Beacons]
  private spawnBeacons(): void {
    const positions = generateBeaconPositions({ x: HERO_SPAWN_X, y: HERO_SPAWN_Y });

    BEACON_ROSTER.forEach((config, i) => {
      const pos = positions[i];
      const beacon = new Beacon(this, pos.x, pos.y, config);
      this.beacons.push(beacon);
    });

    this.syncBeaconStateToStore();
  }

  // [BLOCK: Create Darkness Overlay]
  private createDarknessOverlay(): void {
    this.darknessOverlay = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0);
    this.darknessOverlay.setDepth(DARKNESS_OVERLAY_DEPTH);
  }

  // [BLOCK: Set Leader]
  private setLeader(index: number): void {
    if (index < 0 || index >= this.heroes.length) return;
    // Cannot switch to a dead hero — per castle-party-phase6-plan.md Section 9.
    // Call sites (1/2/3 keys, executeRespawn) already guard this, but
    // checking here too makes setLeader safe to call unconditionally.
    if (this.heroes[index].isDead) return;

    this.leaderIndex = index;
    this.heroes.forEach((hero, i) => hero.setAsLeader(i === index));

    this.cameras.main.startFollow(this.heroes[index], true, CAMERA_LERP, CAMERA_LERP);
    useGameStore.getState().setActiveLeader(index);
  }

  // [BLOCK: Update Hero Attacks]
  // Hero.tryAttack now returns AttackResult[] | null (Multishot support).
  private updateHeroAttacks(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera): void {
    const leader = this.heroes[this.leaderIndex];
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const leaderAngle = Math.atan2(worldY - leader.y, worldX - leader.x);

    if (pointer.leftButtonDown()) {
      const leaderResults = leader.tryAttack(this, leaderAngle);
      if (leaderResults) {
        leaderResults.forEach((r) => this.resolveAttackResult(r));

        this.heroes.forEach((hero, i) => {
          if (i === this.leaderIndex || hero.isPosted) return;
          const results = hero.tryAttack(this, leaderAngle);
          results?.forEach((r) => this.resolveAttackResult(r));
        });
      }
    }

    // Posted companions — independent AI, nearest enemy, own cooldown.
    this.heroes.forEach((hero, i) => {
      if (i === this.leaderIndex || !hero.isPosted) return;

      const nearest = this.findNearestEnemyTo(hero.x, hero.y);
      if (!nearest) return;

      const range = hero.isMeleeAttacker ? HERO_MELEE_RANGE : COMPANION_ATTACK_RANGE;
      if (distance(hero.x, hero.y, nearest.x, nearest.y) > range) return;

      const angle = Math.atan2(nearest.y - hero.y, nearest.x - hero.x);
      const results = hero.tryAttack(this, angle);
      results?.forEach((r) => this.resolveAttackResult(r));
    });
  }

  // [BLOCK: Update Hero Skills — Phase 6 Chunk 6B]
  // Q/E activate the active LEADER's skills only — companions do not use
  // skills (by design, per castle-party-phase6-plan.md Section 7).
  private updateHeroSkills(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera): void {
    const leader = this.heroes[this.leaderIndex];
    if (leader.isDead) return;

    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const aimAngle = Math.atan2(worldY - leader.y, worldX - leader.x);

    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      const result = leader.tryActivateSkill('Q', { aimAngle, cursorX: worldX, cursorY: worldY });
      if (result) this.resolveSkillResult(result);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      const result = leader.tryActivateSkill('E', { aimAngle, cursorX: worldX, cursorY: worldY });
      if (result) this.resolveSkillResult(result);
    }
  }

  // [BLOCK: Resolve Skill Result — Phase 6 Chunk 6B]
  // Dispatches each SkillResult kind to its execution path. Barrage/Meteor
  // Shower/Blackhole register into tracked arrays (resolved over subsequent
  // frames in updatePendingSkillEffects); Sacred Pulse/Divine Surge resolve
  // instantly since they don't need a delay or duration tick.
  private resolveSkillResult(result: SkillResult): void {
    switch (result.kind) {
      case 'war_cry_applied':
        // Already applied directly to the hero's stats inside Hero.ts —
        // nothing left for GameScene to do.
        return;

      case 'barrage':
        this.pendingBarrages.push({
          hero: this.heroes[this.leaderIndex],
          aimAngle: result.aimAngle,
          damage: result.damage,
          range: result.range,
          coneAngleDeg: result.coneAngleDeg,
          slashesRemaining: result.slashCount,
          intervalRemaining: 0, // fire first slash immediately
          intervalSeconds: result.intervalSeconds,
        });
        return;

      case 'meteor_shower':
        this.spawnMeteorShower(result);
        return;

      case 'blackhole':
        this.activeBlackholes.push({
          x: result.x,
          y: result.y,
          pullRadius: result.pullRadius,
          damagePerSec: result.damagePerSec,
          remainingSeconds: result.durationSeconds,
        });
        return;

      case 'sacred_pulse':
        this.resolveSacredPulse(result);
        return;

      case 'divine_surge':
        this.resolveDivineSurge(result);
        return;
    }
  }

  // [BLOCK: Spawn Meteor Shower — Phase 6 Chunk 6B]
  // Targets up to meteorCount nearest living enemies (no duplicates),
  // placing one PendingMeteor per target at its CURRENT position — per the
  // plan, meteors detonate where the enemy was when targeted, not where it
  // ends up, since "enemies can dodge" during the delay.
  private spawnMeteorShower(result: Extract<SkillResult, { kind: 'meteor_shower' }>): void {
    const targets = [...this.enemies]
      .filter((e) => !e.isDead)
      .sort((a, b) =>
        distance(result.sourceX, result.sourceY, a.x, a.y) -
        distance(result.sourceX, result.sourceY, b.x, b.y)
      )
      .slice(0, result.meteorCount);

    targets.forEach((enemy) => {
      this.pendingMeteors.push({
        x: enemy.x,
        y: enemy.y,
        damage: result.damage,
        detonateInSeconds: result.delaySeconds,
      });

      // Ground circle indicator — visible during the delay window.
      const indicator = this.add.circle(enemy.x, enemy.y, METEOR_IMPACT_RADIUS, 0xff6600, 0.18);
      indicator.setStrokeStyle(1, 0xff6600, 0.6);
      this.tweens.add({
        targets: indicator,
        alpha: 0,
        duration: result.delaySeconds * 1000,
        onComplete: () => indicator.destroy(),
      });
    });
  }

  // [BLOCK: Resolve Sacred Pulse — Phase 6 Chunk 6B]
  // Instant dual effect: heal all heroes, drain nearby enemies.
  private resolveSacredPulse(result: Extract<SkillResult, { kind: 'sacred_pulse' }>): void {
    this.heroes.forEach((hero) => {
      if (hero.isDead) return;
      hero.heal(hero.maxHp * result.healFraction);
    });

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      if (distance(result.sourceX, result.sourceY, enemy.x, enemy.y) <= result.radius) {
        const drainAmount = enemy.currentHp * result.drainFraction;
        applyDamage(enemy, drainAmount, 'magic');
      }
    });
  }

  // [BLOCK: Resolve Divine Surge — Phase 6 Chunk 6B]
  // Instant dual effect: party-wide buff (5s) on all stats, nearby-enemy
  // debuff (2s) on all stats. "All stats" is interpreted as hp/defense/speed
  // (the Stat-backed fields on Unit) plus attackDamage/attackSpeed for
  // heroes specifically, since enemies don't have those Stats.
  private resolveDivineSurge(result: Extract<SkillResult, { kind: 'divine_surge' }>): void {
    this.heroes.forEach((hero) => {
      if (hero.isDead) return;
      hero.hpStat.addModifier(percentModifier('divine-surge-hp', result.buffPercent, 'skill', result.buffDuration));
      hero.defenseStat.addModifier(percentModifier('divine-surge-def', result.buffPercent, 'skill', result.buffDuration));
      hero.speedStat.addModifier(percentModifier('divine-surge-spd', result.buffPercent, 'skill', result.buffDuration));
      hero.attackDamageStat.addModifier(percentModifier('divine-surge-atk', result.buffPercent, 'skill', result.buffDuration));
      hero.attackSpeedStat.addModifier(percentModifier('divine-surge-aspd', result.buffPercent, 'skill', result.buffDuration));
    });

    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      if (distance(result.sourceX, result.sourceY, enemy.x, enemy.y) <= result.radius) {
        enemy.defenseStat.addModifier(percentModifier('divine-surge-debuff-def', -result.debuffPercent, 'skill', result.debuffDuration));
        enemy.speedStat.addModifier(percentModifier('divine-surge-debuff-spd', -result.debuffPercent, 'skill', result.debuffDuration));
      }
    });
  }

  // [BLOCK: Update Pending Skill Effects — Phase 6 Chunk 6B]
  // Ticks Barrage's slash loop, Meteor Shower's delayed detonation, and
  // Blackhole's per-frame pull + damage tick. Mirrors the existing
  // projectiles/xpShards prune-by-filter pattern.
  private updatePendingSkillEffects(deltaSeconds: number): void {
    this.updatePendingBarrages(deltaSeconds);
    this.updatePendingMeteors(deltaSeconds);
    this.updateActiveBlackholes(deltaSeconds);
    this.updateScheduledSpellEffects(deltaSeconds);
  }

  // [BLOCK: Update Pending Barrages]
  private updatePendingBarrages(deltaSeconds: number): void {
    for (const barrage of this.pendingBarrages) {
      barrage.intervalRemaining -= deltaSeconds;
      if (barrage.intervalRemaining > 0) continue;

      this.applyMeleeHit({
        kind: 'melee',
        angle: barrage.aimAngle,
        range: barrage.range,
        coneAngleDeg: barrage.coneAngleDeg,
        damage: barrage.damage,
        source: barrage.hero,
      });
      this.spawnMeleeFlash(barrage.hero.x, barrage.hero.y, barrage.aimAngle, barrage.range, barrage.coneAngleDeg);

      barrage.slashesRemaining -= 1;
      barrage.intervalRemaining = barrage.intervalSeconds;
    }

    this.pendingBarrages = this.pendingBarrages.filter((b) => b.slashesRemaining > 0);
  }

  // [BLOCK: Update Pending Meteors]
  private updatePendingMeteors(deltaSeconds: number): void {
    for (const meteor of this.pendingMeteors) {
      meteor.detonateInSeconds -= deltaSeconds;
      if (meteor.detonateInSeconds > 0) continue;

      this.enemies.forEach((enemy) => {
        if (enemy.isDead) return;
        if (distance(meteor.x, meteor.y, enemy.x, enemy.y) <= METEOR_IMPACT_RADIUS) {
          applyDamage(enemy, meteor.damage, 'magic');
        }
      });

      const blast = this.add.circle(meteor.x, meteor.y, METEOR_IMPACT_RADIUS, 0xff6600, 0.5);
      this.tweens.add({ targets: blast, alpha: 0, scale: 1.4, duration: 200, onComplete: () => blast.destroy() });
    }

    this.pendingMeteors = this.pendingMeteors.filter((m) => m.detonateInSeconds > 0);
  }

  // [BLOCK: Update Active Blackholes]
  // Pulls enemies within pullRadius toward the blackhole's center via a
  // direct velocity offset each frame (does not stop normal movement
  // resolution, per the plan — applied as a position nudge here rather than
  // routing through the physics body, since Enemy's own moveToward() would
  // otherwise immediately overwrite any velocity set on its body this frame).
  private updateActiveBlackholes(deltaSeconds: number): void {
    for (const hole of this.activeBlackholes) {
      hole.remainingSeconds -= deltaSeconds;

      this.enemies.forEach((enemy) => {
        if (enemy.isDead) return;
        const d = distance(hole.x, hole.y, enemy.x, enemy.y);
        if (d > hole.pullRadius || d <= 1) return;

        const pullStep = BLACKHOLE_PULL_SPEED * deltaSeconds;
        const t = Math.min(1, pullStep / d);
        enemy.x += (hole.x - enemy.x) * t;
        enemy.y += (hole.y - enemy.y) * t;

        applyDamage(enemy, hole.damagePerSec * deltaSeconds, 'magic');
      });
    }

    this.activeBlackholes = this.activeBlackholes.filter((h) => h.remainingSeconds > 0);
  }

  // [BLOCK: Update Scheduled Spell Effects — Phase 6 Chunk 6B]
  // Drives Blessing's heal-over-time (and any future spell using
  // scheduleEffect) by calling tickFn each frame until duration elapses.
  private updateScheduledSpellEffects(deltaSeconds: number): void {
    for (const effect of this.scheduledSpellEffects) {
      effect.tickFn(deltaSeconds);
      effect.remainingSeconds -= deltaSeconds;
    }
    this.scheduledSpellEffects = this.scheduledSpellEffects.filter((e) => e.remainingSeconds > 0);
  }

  // [BLOCK: Update Spell Cast — Phase 6 Chunk 6B]
  // Z key casts the FIRST held spell in activeSpells (per plan: "cast active
  // spell (first available spell in slots)"). Respects the shared 5s
  // cooldown tracked in gameStore.spellCooldownRemaining, ticked in update().
  private updateSpellCast(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!Phaser.Input.Keyboard.JustDown(this.keyZ)) return;

    const store = useGameStore.getState();
    if (store.spellCooldownRemaining > 0) return;
    if (store.activeSpells.length === 0) return;

    const spell = spellById.get(store.activeSpells[0]);
    if (!spell) return;

    const leader = this.heroes[this.leaderIndex];
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;

    const ctx: SpellCastContext = {
      heroes: this.heroes,
      enemies: this.enemies,
      leaderX: leader.x,
      leaderY: leader.y,
      cursorX: worldX,
      cursorY: worldY,
      scheduleEffect: (tickFn, durationSeconds) => {
        this.scheduledSpellEffects.push({ tickFn, remainingSeconds: durationSeconds });
      },
    };

    spell.effect(ctx);
    store.startSpellCooldown();
  }

  // [BLOCK: Find Nearest Enemy]
  private findNearestEnemyTo(x: number, y: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const d = distance(x, y, enemy.x, enemy.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = enemy;
      }
    }

    return nearest;
  }

  // [BLOCK: Resolve Attack Result]
  private resolveAttackResult(result: AttackResult): void {
    if (result.kind === 'melee') {
      this.applyMeleeHit(result);
      this.spawnMeleeFlash(result.source.x, result.source.y, result.angle, result.range, result.coneAngleDeg);
    } else {
      this.projectiles.push(result.projectile);
    }
  }

  // [BLOCK: Apply Melee Hit]
  private applyMeleeHit(result: Extract<AttackResult, { kind: 'melee' }>): void {
    const halfConeRad = (result.coneAngleDeg / 2) * (Math.PI / 180);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const d = distance(result.source.x, result.source.y, enemy.x, enemy.y);
      if (d > result.range) continue;

      const angleToEnemy = Math.atan2(enemy.y - result.source.y, enemy.x - result.source.x);
      let diff = angleToEnemy - result.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));

      if (Math.abs(diff) <= halfConeRad) {
        applyDamage(enemy, result.damage, 'physical', result.source);
      }
    }
  }

  // [BLOCK: Spawn Melee Flash]
  private spawnMeleeFlash(x: number, y: number, angle: number, range: number, coneAngleDeg: number): void {
    const halfConeRad = (coneAngleDeg / 2) * (Math.PI / 180);

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.6);
    g.slice(x, y, range, angle - halfConeRad, angle + halfConeRad, false);
    g.fillPath();

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 100,
      onComplete: () => g.destroy(),
    });
  }

  // [BLOCK: Update Projectiles]
  private updateProjectiles(deltaSeconds: number): void {
    this.projectiles.forEach((p) => p.update(deltaSeconds));

    for (const projectile of this.projectiles) {
      if (!projectile.alive) continue;

      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;

        const hitDistance = ENEMY_BODY_SIZE / 2 + projectile.radius;
        if (distance(projectile.x, projectile.y, enemy.x, enemy.y) <= hitDistance) {
          applyDamage(enemy, projectile.damage, projectile.attackElement, projectile.sourceHero);
          projectile.markHit();
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      if (!p.alive) {
        p.destroy();
        return false;
      }
      return true;
    });
  }

  // [BLOCK: Update Enemy Projectiles — Phase 4 Chunk B]
  private updateEnemyProjectiles(deltaSeconds: number): void {
    this.enemyProjectiles.forEach((p) => p.update(deltaSeconds));

    for (const projectile of this.enemyProjectiles) {
      if (!projectile.alive) continue;

      for (const hero of this.heroes) {
        if (hero.isDead) continue;

        const hitDistance = HERO_BODY_W / 2 + projectile.radius;
        if (distance(projectile.x, projectile.y, hero.x, hero.y) <= hitDistance) {
          hero.takeDamage(projectile.damage, projectile.attackElement === 'physical');
          projectile.markHit();
          break;
        }
      }
    }

    this.enemyProjectiles = this.enemyProjectiles.filter((p) => {
      if (!p.alive) {
        p.destroy();
        return false;
      }
      return true;
    });
  }

  // [BLOCK: Apply Aggro Updates — Phase 5 Chunk 5B patch]
  private applyAggroUpdates(): void {
    const aggroEligible = this.enemies.filter((e) => !e.isMiniUnit);
    const assignments = this.aggroSystem.update(aggroEligible);
    assignments.forEach((a) => {
      a.enemy.aggroState = a.aggroState;
      a.enemy.aggroTarget = a.aggroTarget;
    });
  }

  // [BLOCK: Cleanup Dead Enemies — Phase 5 Chunk 5B patch]
  private cleanupDeadEnemies(): void {
    const alive: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        this.spawnXPShard(enemy.x, enemy.y, enemy.config.id);
        this.spawnMiniUnitsIfApplicable(enemy);
        enemy.destroy();
      } else {
        alive.push(enemy);
      }
    }
    this.enemies = alive;
  }

  // [BLOCK: Spawn Mini Units If Applicable — Phase 5 Chunk 5B]
  private spawnMiniUnitsIfApplicable(parent: Enemy): void {
    const miniId = DEATH_SPAWN_PARENT_TO_MINI[parent.config.id];
    if (!miniId) return;

    const miniConfig = this.enemyConfigById.get(miniId);
    if (!miniConfig) return;

    const killer = parent.lastKiller ?? this.heroes[this.leaderIndex];

    for (let i = 0; i < MINI_SPAWN_COUNT; i++) {
      const mini = new Enemy(this, parent.x, parent.y, miniConfig);
      mini.aggroState = 'hero';
      mini.aggroTarget = killer;
      this.enemies.push(mini);
    }
  }

  // [BLOCK: Spawn XP Shard]
  private spawnXPShard(x: number, y: number, enemyId: string): void {
    const value = XP_VALUE_BY_ENEMY_ID[enemyId];
    if (!value) return;

    this.xpShards.push(new XPShard(this, x, y, value));
  }

  // [BLOCK: Update XP Shards]
  private updateXPShards(deltaSeconds: number): void {
    this.xpShards.forEach((shard) => shard.update(deltaSeconds));

    const leader = this.heroes[this.leaderIndex];
    const remaining: XPShard[] = [];

    for (const shard of this.xpShards) {
      if (distance(leader.x, leader.y, shard.x, shard.y) <= XP_COLLECT_RADIUS) {
        this.collectXPShard(shard);
      } else {
        remaining.push(shard);
      }
    }

    this.xpShards = remaining;
  }

  // [BLOCK: Collect XP Shard]
  private collectXPShard(shard: XPShard): void {
    const store = useGameStore.getState();
    const levelBefore = store.partyLevel;

    store.addXP(shard.value);

    if (useGameStore.getState().partyLevel > levelBefore) {
      this.healAllHeroes(LEVEL_UP_HEAL_FRACTION);
      this.triggerDraft();
    }

    shard.destroy();
  }

  // [BLOCK: Heal All Heroes]
  private healAllHeroes(fraction: number): void {
    this.heroes.forEach((hero) => hero.heal(hero.maxHp * fraction));
  }

  // [BLOCK: Trigger Draft — Phase 6 Chunk 6A]
  private triggerDraft(): void {
    const cards = this.draftSystem.generateDraft();
    useGameStore.getState().openDraft(cards);
  }

  // [BLOCK: Resolve Draft Pick — Phase 6 Chunk 6A]
  private resolveDraftPick(pickedIndex: number): void {
    const store = useGameStore.getState();
    const cards = store.draftCards;

    if (pickedIndex < 0 || pickedIndex >= cards.length) {
      store.closeDraft();
      return;
    }

    const pickedCard = cards[pickedIndex];

    if (pickedCard.kind === 'spell') {
      store.addActiveSpell(pickedCard.spell.id);
      cards.forEach((card, i) => {
        if (i !== pickedIndex) this.draftSystem.resolveSkip(card);
      });
    } else {
      const pickedUpgrade = this.draftSystem.resolveDraft(cards, pickedIndex);
      if (pickedUpgrade) {
        pickedUpgrade.effect(this.heroes);
      }
    }

    useGameStore.getState().setOwnedUpgrades(this.draftSystem.ownedUpgrades);
    useGameStore.getState().setSkippedCounts(this.draftSystem.getSkippedCounts());
    useGameStore.getState().closeDraft();
  }

  // [BLOCK: World Background]
  private createWorldBackground(): void {
    const bg = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0a0a0f);
    bg.setDepth(-10);
  }

  // [BLOCK: Grid Overlay]
  private createGridOverlay(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.04);

    for (let x = 0; x <= WORLD_W; x += TILE_SIZE) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += TILE_SIZE) {
      graphics.moveTo(0, y);
      graphics.lineTo(WORLD_W, y);
    }

    graphics.strokePath();
    graphics.setDepth(-9);
  }

  // [BLOCK: Update]
  update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    if (this.runEnded) {
      if (this.isDefeatFading) this.tickDefeatFade(deltaSeconds);
      return;
    }

    useGameStore.getState().tickTimer(deltaSeconds);
    RunModifiers.tick(deltaSeconds);

    // [BLOCK: Draft Pick Polling — Phase 6 Chunk 6A]
    const pendingPick = useGameStore.getState().consumeDraftPick();
    if (pendingPick !== null) {
      this.resolveDraftPick(pendingPick);
    }

    // [BLOCK: Leader-Switch Keys (1/2/3) — skip dead heroes (Phase 6 Chunk 6C)]
    // Dead heroes are displayed with a respawn timer on their portrait;
    // switching to one is explicitly disabled per the plan.
    if (Phaser.Input.Keyboard.JustDown(this.keys1) && !this.heroes[0]?.isDead) this.setLeader(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys2) && !this.heroes[1]?.isDead) this.setLeader(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys3) && !this.heroes[2]?.isDead) this.setLeader(2);

    const leader = this.heroes[this.leaderIndex];
    const pointer = this.input.activePointer;
    const camera = this.cameras.main;

    this.heroes.forEach((hero, i) => {
      if (i === this.leaderIndex) {
        hero.updateAsLeader(this.input.keyboard!.createCursorKeys(), this.wasd, pointer, camera);
      } else {
        hero.updateAsCompanion(leader);
      }
      hero.update(deltaSeconds);
    });

    // [BLOCK: Input Freeze During Team Wipe — Phase 6 Chunk 6C]
    // When all heroes are dead, skip attacks/skills/spells — camera stays
    // on the last-known leader position naturally (no follow to update).
    if (!this.isTeamWiped) {
      this.updateHeroAttacks(pointer, camera);
      this.updateHeroSkills(pointer, camera);
      this.updateSpellCast(pointer, camera);
    }
    this.updatePendingSkillEffects(deltaSeconds);

    this.updateProjectiles(deltaSeconds);

    this.updateBeaconProximityHealing(deltaSeconds);
    this.beacons.forEach((beacon) => beacon.update(deltaSeconds));
    this.syncBeaconStateToStore();

    const litCount = this.beacons.filter((b) => b.isLit).length;
    const darknessLevel = this.updateDarkness(litCount, deltaSeconds);

    this.applyAggroUpdates();
    this.updateEnemySpawning(deltaSeconds, darknessLevel);
    for (const enemy of this.enemies) {
      const fired = enemy.update(deltaSeconds, this.beacons, this.heroes);
      if (fired) this.enemyProjectiles.push(fired);
    }
    this.updateEnemyProjectiles(deltaSeconds);
    this.cleanupDeadEnemies();

    this.updateXPShards(deltaSeconds);

    this.checkWinLossConditions();

    this.sharedPoolSystem.update(deltaSeconds);
    this.syncResourceBars();
    this.syncHeroHp();
    this.syncSkillCooldowns();
    useGameStore.getState().tickSpellCooldown(deltaSeconds);
    this.updateRespawnSystem(deltaSeconds);
  }

  // [BLOCK: Check Win/Loss Conditions — Phase 6 Chunk 6C]
  // DELIBERATE CHANGE: litCount === 0 no longer triggers instant defeat
  // (confirmed by explicit user instruction, Phase 6 Chunk 6C). Defeat now
  // fires only when a team-wipe respawn would fire but there is no lit
  // beacon to respawn at. Victory condition unchanged: runTimer reaches 0.
  private checkWinLossConditions(): void {
    if (this.runEnded) return;

    const runTimer = useGameStore.getState().runTimer;
    if (runTimer <= 0) {
      this.runEnded = true;
      useGameStore.getState().endRun('victory');
    }
  }

  // [BLOCK: Update Respawn System — Phase 6 Chunk 6C]
  // Computes the live dead-hero count, hands it to RespawnSystem.update(),
  // fires respawns (or defeat) when the countdown reaches zero, and syncs
  // state into the store for HUD display.
  private updateRespawnSystem(deltaSeconds: number): void {
    const deadIndices = this.heroes
      .map((h, i) => h.isDead ? i : -1)
      .filter((i) => i >= 0);

    const deadCount = deadIndices.length;
    this.isTeamWiped = deadCount >= this.heroes.length;

    const shouldRespawn = this.respawnSystem.update(deltaSeconds, deadCount);

    if (shouldRespawn) {
      this.executeRespawn(deadIndices);
    }

    // After potential respawn, update team-wipe flag again (heroes may have
    // just revived, clearing the flag for next frame's input gate).
    const nowDeadIndices = this.heroes
      .map((h, i) => h.isDead ? i : -1)
      .filter((i) => i >= 0);
    this.isTeamWiped = nowDeadIndices.length >= this.heroes.length;

    useGameStore.getState().setRespawnState(
      nowDeadIndices,
      this.respawnSystem.currentRemainingSeconds,
      this.isTeamWiped,
    );
  }

  // [BLOCK: Execute Respawn — Phase 6 Chunk 6C]
  // Called once on the frame RespawnSystem fires. Each dead hero is moved to
  // the nearest lit beacon to where it currently stands (the hero's x/y
  // hasn't changed since death — physics body is zeroed but position remains
  // the death position, which is exactly what the plan specifies: "nearest
  // lit beacon to where they died"). If no lit beacon exists at respawn time,
  // the run ends in defeat — this is now the ONLY defeat condition.
  private executeRespawn(deadIndices: number[]): void {
    if (this.runEnded) return;

    const litBeacons = this.beacons.filter((b) => b.isLit);

    if (litBeacons.length === 0) {
      // No lit beacon to respawn at — this is the new loss condition.
      this.startDefeatFade();
      return;
    }

    deadIndices.forEach((heroIdx) => {
      const hero = this.heroes[heroIdx];
      if (!hero.isDead) return; // already revived somehow — skip

      const beacon = this.findNearestLitBeaconTo(hero.x, hero.y);
      if (!beacon) return;

      hero.respawnAt(beacon.x, beacon.y, RESPAWN_HP_FRACTION);
    });

    // If the dead hero was the current leader (only possible during a
    // team wipe), make sure the leader is still a living hero after respawn.
    if (this.heroes[this.leaderIndex].isDead) {
      const firstAlive = this.heroes.findIndex((h) => !h.isDead);
      if (firstAlive >= 0) this.setLeader(firstAlive);
    }
  }

  // [BLOCK: Find Nearest Lit Beacon To — Phase 6 Chunk 6C]
  // Scene-level helper mirroring Enemy.ts's private findNearestLitBeacon()
  // but accessible to GameScene for respawn positioning.
  private findNearestLitBeaconTo(x: number, y: number): Beacon | null {
    let nearest: Beacon | null = null;
    let nearestDist = Infinity;

    for (const beacon of this.beacons) {
      if (!beacon.isLit) continue;
      const d = distance(x, y, beacon.x, beacon.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = beacon;
      }
    }

    return nearest;
  }

  // [BLOCK: Start Defeat Fade]
  private startDefeatFade(): void {
    if (this.runEnded) return;
    this.runEnded = true;
    this.isDefeatFading = true;
    this.defeatFadeElapsed = 0;
  }

  // [BLOCK: Tick Defeat Fade]
  private tickDefeatFade(deltaSeconds: number): void {
    this.defeatFadeElapsed += deltaSeconds;
    const t = Math.min(1, this.defeatFadeElapsed / GameScene.DEFEAT_FADE_SECONDS);

    this.darknessOverlay.setFillStyle(0x000000, t);

    if (t >= 1) {
      this.isDefeatFading = false;
      useGameStore.getState().endRun('defeat');
    }
  }

  // [BLOCK: Beacon Proximity Healing]
  private updateBeaconProximityHealing(deltaSeconds: number): void {
    const healAmount = BEACON_HEAL_RATE * deltaSeconds;

    for (const beacon of this.beacons) {
      if (beacon.fireMeter >= 100) continue;

      for (const hero of this.heroes) {
        if (distance(hero.x, hero.y, beacon.x, beacon.y) <= BEACON_LIGHT_RADIUS) {
          beacon.heal(healAmount);
          break;
        }
      }
    }
  }

  // [BLOCK: Sync Beacon State To Store]
  private syncBeaconStateToStore(): void {
    const store = useGameStore.getState();
    this.beacons.forEach((beacon, i) => {
      store.setBeaconState(i, { isLit: beacon.isLit, fireMeter: beacon.fireMeter });
    });
  }

  // [BLOCK: Update Enemy Spawning]
  private updateEnemySpawning(deltaSeconds: number, darknessLevel: number): void {
    const clusterCenter = { x: WORLD_W / 2, y: WORLD_H / 2 };
    const requests = this.spawnSystem.update(deltaSeconds, darknessLevel, clusterCenter);

    for (const request of requests) {
      const config = this.enemyConfigById.get(request.enemyId);
      if (!config) continue;

      const enemy = new Enemy(this, request.x, request.y, config);
      this.enemies.push(enemy);
    }
  }

  // [BLOCK: Update Darkness]
  private updateDarkness(litCount: number, deltaSeconds: number): number {
    const { level, alpha } = this.darknessSystem.update(litCount, deltaSeconds);

    this.darknessOverlay.setFillStyle(0x000000, alpha);
    useGameStore.getState().setDarknessLevel(level);

    return level;
  }

  // [BLOCK: Sync Resource Bars — Phase 6 Chunk 6B]
  // Now reads directly from SharedPoolSystem's two SharedPool instances
  // instead of averaging individual hero pools — the shared pool IS the
  // single source of truth as of this chunk (Hero.tryAttack/tryActivateSkill
  // consume from it directly).
  private syncResourceBars(): void {
    const store = useGameStore.getState();
    store.setManaPercent(this.sharedPoolSystem.manaPool.current);
    store.setStaminaPercent(this.sharedPoolSystem.staminaPool.current);
  }

  // [BLOCK: Sync Hero HP — Phase 4 Chunk C]
  private syncHeroHp(): void {
    const store = useGameStore.getState();

    this.heroes.forEach((hero, i) => {
      store.setHeroHpPercent(i, hero.hpPercent * 100);
      if (hero.consumeDiedFlag()) {
        store.triggerHeroDeathFlash(i);
      }
    });
  }

  // [BLOCK: Sync Skill Cooldowns — Phase 6 Chunk 6B]
  // Pushes the active leader's Q/E cooldown state into the store each frame
  // for SkillCooldowns.tsx to render. Only the leader's cooldowns are synced
  // — companions don't use skills, so there's nothing to show for them.
  private syncSkillCooldowns(): void {
    const leader = this.heroes[this.leaderIndex];
    useGameStore.getState().setSkillCooldowns({
      qRemaining: leader.qCooldownRemaining,
      qMax: leader.qCooldownMax,
      eRemaining: leader.eCooldownRemaining,
      eMax: leader.eCooldownMax,
    });
  }
}