// [File: src/game/scenes/GameScene.ts]
// [BLOCK: Game Scene]
// Main gameplay scene. Owns world, camera, heroes, beacons, and input.
// Writes to Zustand store each tick — React HUD reads from it.
//
// Phase 4 patch: applyMeleeHit and updateProjectiles now route damage through
// CombatUtils.applyDamage() instead of calling enemy.takeDamage() directly,
// so resistance (and Ghost's physical immunity) resolves before any damage
// or aggro-flip happens. Everything else is unchanged from Phase 3.
//
// Phase 5 Chunk 5A patch: XP_VALUE_BY_ENEMY_ID extended with the three
// Elemental Morph ids.
//
// Phase 5 Chunk 5B patch: XP_VALUE_BY_ENEMY_ID extended with Spider/Slime;
// cleanupDeadEnemies() spawns 4 Mini units on Spider/Slime death targeting
// the parent's lastKiller; applyAggroUpdates() filters Mini units out of
// AggroSystem's input so their locked aggroState/aggroTarget is never
// overwritten; Enemy.update() call site passes this.heroes for Mini
// retargeting.
//
// Phase 5 Chunk 5C patch: XP_VALUE_BY_ENEMY_ID extended with Ranger/Priest —
// this completes the full Phase 5 XP set.
//
// Phase 6 Chunk 6A patch: adds the Card Draft System.
//   - collectXPShard's existing level-up branch now also calls triggerDraft()
//     alongside the existing healAllHeroes() call.
//   - triggerDraft() asks DraftSystem for a fresh 5-card draft and pushes it
//     into the store via openDraft() — this does NOT pause anything in
//     update(); per castle-party-phase6-plan.md Section 4 the world keeps
//     ticking while the overlay is up.
//   - update() polls useGameStore.getState().consumeDraftPick() each frame
//     (mirrors the existing one-shot-flag pattern used elsewhere, just in
//     the opposite data-flow direction) and resolves a pending pick via
//     resolveDraftPick().
//   - resolveDraftPick() calls DraftSystem.resolveDraft() to get back the
//     picked UpgradeConfig (or null if a spell was picked), invokes its
//     effect(this.heroes) if present, syncs DraftSystem's owned/skipped
//     state back into the store, and closes the draft overlay.
//   - Spell picks append to activeSpells via the store directly (capped at
//     3, per the store's addActiveSpell) — casting/effects are Chunk 6B.

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
} from '@/game/config/constants';
import { HERO_ROSTER } from '@/game/config/heroes';
import { BEACON_ROSTER } from '@/game/config/beacons';
import { registerAnimations } from '@/game/animations/registry';
import { Hero, type AttackResult } from '@/game/entities/Hero';
import { Beacon } from '@/game/entities/Beacon';
import { Enemy } from '@/game/entities/Enemy';
import { Projectile } from '@/game/entities/Projectile';
import { EnemyProjectile } from '@/game/entities/EnemyProjectile';
import { XPShard } from '@/game/entities/XPShard';
import { generateBeaconPositions } from '@/game/utils/BeaconPlacement';
import { distance } from '@/game/utils/MathUtils';
import { applyDamage } from '@/game/utils/CombatUtils';
import { DarknessSystem } from '@/game/systems/DarknessSystem';
import { SpawnSystem } from '@/game/systems/SpawnSystem';
import { AggroSystem } from '@/game/systems/AggroSystem';
import { DraftSystem } from '@/game/systems/DraftSystem';
import { ENEMY_ROSTER } from '@/game/config/enemies';
import { useGameStore } from '@/ui/store/gameStore';

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

  // [BLOCK: Projectiles]
  private projectiles: Projectile[] = [];

  // [BLOCK: Enemy Projectiles — Phase 4 Chunk B]
  private enemyProjectiles: EnemyProjectile[] = [];

  // [BLOCK: XP Shards]
  private xpShards: XPShard[] = [];

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

    this.spawnHeroes();
    this.spawnBeacons();
    this.createDarknessOverlay();

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

    this.leaderIndex = index;
    this.heroes.forEach((hero, i) => hero.setAsLeader(i === index));

    this.cameras.main.startFollow(this.heroes[index], true, CAMERA_LERP, CAMERA_LERP);
    useGameStore.getState().setActiveLeader(index);
  }

  // [BLOCK: Update Hero Attacks]
  private updateHeroAttacks(pointer: Phaser.Input.Pointer, camera: Phaser.Cameras.Scene2D.Camera): void {
    const leader = this.heroes[this.leaderIndex];
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    const leaderAngle = Math.atan2(worldY - leader.y, worldX - leader.x);

    if (pointer.leftButtonDown()) {
      const leaderResult = leader.tryAttack(this, leaderAngle);
      if (leaderResult) {
        this.resolveAttackResult(leaderResult);

        this.heroes.forEach((hero, i) => {
          if (i === this.leaderIndex || hero.isPosted) return;
          const result = hero.tryAttack(this, leaderAngle);
          if (result) this.resolveAttackResult(result);
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
      const result = hero.tryAttack(this, angle);
      if (result) this.resolveAttackResult(result);
    });
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
  // Phase 6 Chunk 6A: on level-up, also triggers a card draft alongside the
  // existing heal-all-heroes action — per castle-party-phase6-plan.md
  // Section 4's "Phase 6 adds a third action: set isDraftPending: true."
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
  // Generates a fresh 5-card draft from DraftSystem and pushes it to the
  // store. Deliberately does NOT set any "paused" flag — update() below
  // keeps running enemy spawning, movement, and combat exactly as before;
  // only the HUD overlay's visibility changes. If a draft is somehow
  // already pending (e.g. two level-ups landed the same frame from a big
  // XP dump), this simply overwrites it with a fresh draft — the prior
  // draft's cards are lost rather than queued, since queuing multiple
  // drafts isn't described anywhere in the plan and the existing XP-dump
  // edge case (addXP's overflow-carry while-loop) already makes
  // multi-level-up-per-shard a real possibility worth flagging here rather
  // than silently mishandling.
  private triggerDraft(): void {
    const cards = this.draftSystem.generateDraft();
    useGameStore.getState().openDraft(cards);
  }

  // [BLOCK: Resolve Draft Pick — Phase 6 Chunk 6A]
  // Called from update() once a pending pick is consumed from the store.
  // Applies the picked upgrade's effect against the live Hero[] roster (or,
  // for a spell pick, appends to activeSpells), syncs DraftSystem's owned/
  // skipped state back into the store, and closes the overlay.
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
      // Spells have no expiry/ownership tracking — still need to register
      // skips for every OTHER card in this draft so upgrade skip-counts
      // advance correctly even when the player picked a spell instead.
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

    // [BLOCK: Draft Pick Polling — Phase 6 Chunk 6A]
    // One-shot consume, same pattern as Hero.consumeDiedFlag() but in the
    // React -> Phaser direction. Runs every frame regardless of whether a
    // draft is currently pending — consumeDraftPick() is a no-op (returns
    // null) when there's nothing to resolve.
    const pendingPick = useGameStore.getState().consumeDraftPick();
    if (pendingPick !== null) {
      this.resolveDraftPick(pendingPick);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys1)) this.setLeader(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys2)) this.setLeader(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys3)) this.setLeader(2);

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

    this.updateHeroAttacks(pointer, camera);
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

    this.checkWinLossConditions(litCount);

    this.syncResourceBars();
    this.syncHeroHp();
  }

  // [BLOCK: Check Win/Loss Conditions]
  private checkWinLossConditions(litCount: number): void {
    if (this.runEnded) return;

    if (litCount === 0) {
      this.startDefeatFade();
      return;
    }

    const runTimer = useGameStore.getState().runTimer;
    if (runTimer <= 0) {
      this.runEnded = true;
      useGameStore.getState().endRun('victory');
    }
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

  // [BLOCK: Sync Resource Bars]
  private syncResourceBars(): void {
    let manaTotal = 0;
    let manaCount = 0;
    let staminaTotal = 0;
    let staminaCount = 0;

    this.heroes.forEach((hero) => {
      if (hero.manaPool) {
        manaTotal += hero.manaPool.current;
        manaCount++;
      }
      if (hero.staminaPool) {
        staminaTotal += hero.staminaPool.current;
        staminaCount++;
      }
    });

    const store = useGameStore.getState();
    if (manaCount > 0) store.setManaPercent(manaTotal / manaCount);
    if (staminaCount > 0) store.setStaminaPercent(staminaTotal / staminaCount);
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
}