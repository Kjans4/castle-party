// [File: src/game/scenes/GameScene.ts]
// [BLOCK: Game Scene]
// Main gameplay scene. Owns world, camera, heroes, beacons, and input.
// Writes to Zustand store each tick — React HUD reads from it.

import Phaser from 'phaser';
import {
  WORLD_W, WORLD_H, TILE_SIZE, CAMERA_LERP,
  HERO_SPAWN_X, HERO_SPAWN_Y,
  BEACON_LIGHT_RADIUS, BEACON_HEAL_RATE,
  DARKNESS_OVERLAY_DEPTH,
  ENEMY_BODY_SIZE, COMPANION_ATTACK_RANGE, HERO_MELEE_RANGE,
} from '@/game/config/constants';
import { HERO_ROSTER } from '@/game/config/heroes';
import { BEACON_ROSTER } from '@/game/config/beacons';
import { registerAnimations } from '@/game/animations/registry';
import { Hero, type AttackResult } from '@/game/entities/Hero';
import { Beacon } from '@/game/entities/Beacon';
import { Enemy } from '@/game/entities/Enemy';
import { Projectile } from '@/game/entities/Projectile';
import { generateBeaconPositions } from '@/game/utils/BeaconPlacement';
import { distance } from '@/game/utils/MathUtils';
import { DarknessSystem } from '@/game/systems/DarknessSystem';
import { SpawnSystem } from '@/game/systems/SpawnSystem';
import { AggroSystem } from '@/game/systems/AggroSystem';
import { ENEMY_ROSTER } from '@/game/config/enemies';
import { useGameStore } from '@/ui/store/gameStore';

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

  // [BLOCK: Projectiles]
  private projectiles: Projectile[] = [];

  // [BLOCK: Darkness]
  private darknessSystem: DarknessSystem = new DarknessSystem();
  private darknessOverlay!: Phaser.GameObjects.Rectangle;

  // [BLOCK: Run Ending — Win/Loss]
  // DEFEAT_FADE_SECONDS matches the plan's "fades to full black over 1.5s".
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
    // Generate 1×1 white placeholder texture for animations
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture('placeholder', TILE_SIZE, TILE_SIZE);
    g.destroy();
  }

  // [BLOCK: Create]
  create(): void {
    registerAnimations(this);

    // World setup
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.createWorldBackground();
    this.createGridOverlay();

    // Camera setup
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    // Input setup
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.keys1 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keys2 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keys3 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);

    // Spawn heroes
    this.spawnHeroes();

    // Spawn beacons (Phase 2)
    this.spawnBeacons();

    // Darkness overlay (Phase 2)
    this.createDarknessOverlay();

    // Start timer
    useGameStore.getState().setRunActive(true);
  }

  // [BLOCK: Spawn Heroes]
  // Heroes spawn at the left edge of the world, vertically centered.
  private spawnHeroes(): void {
    const spacing = 60;

    HERO_ROSTER.forEach((config, i) => {
      const hero = new Hero(
        this,
        HERO_SPAWN_X,
        HERO_SPAWN_Y + (i - 1) * spacing,
        config
      );
      this.heroes.push(hero);
    });

    // Set initial leader
    this.setLeader(0);
  }

  // [BLOCK: Spawn Beacons]
  // Generates randomized positions via rejection sampling, then instantiates
  // a Beacon entity per config in BEACON_ROSTER (Crown is always index 0).
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
  // Full-screen dark rectangle above the world, below heroes/beacons (depth 15).
  // Starts fully transparent — DarknessSystem lerps its alpha live each frame.
  private createDarknessOverlay(): void {
    this.darknessOverlay = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0);
    this.darknessOverlay.setDepth(DARKNESS_OVERLAY_DEPTH);
  }

  // [BLOCK: Set Leader]
  private setLeader(index: number): void {
    if (index < 0 || index >= this.heroes.length) return;

    this.leaderIndex = index;

    // Update visuals on all heroes
    this.heroes.forEach((hero, i) => hero.setAsLeader(i === index));

    // Camera follows new leader with lerp
    this.cameras.main.startFollow(
      this.heroes[index],
      true,
      CAMERA_LERP,
      CAMERA_LERP
    );

    // Sync to Zustand so HUD portrait updates
    useGameStore.getState().setActiveLeader(index);
  }

  // [BLOCK: Update Hero Attacks]
  // Leader fires on held/clicked left mouse button toward the cursor.
  // On a successful leader fire, every following (non-posted) companion
  // mirrors that same angle through its own tryAttack (own cooldown still
  // applies — may whiff if nothing's actually in range/cone). Posted
  // companions instead run independent nearest-enemy targeting.
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
  // Melee resolves immediately (cone hit-test + flash). Projectile just gets
  // tracked — its own collision check happens in updateProjectiles each frame.
  private resolveAttackResult(result: AttackResult): void {
    if (result.kind === 'melee') {
      this.applyMeleeHit(result);
      this.spawnMeleeFlash(result.source.x, result.source.y, result.angle, result.range, result.coneAngleDeg);
    } else {
      this.projectiles.push(result.projectile);
    }
  }

  // [BLOCK: Apply Melee Hit]
  // Instant hit-test — all enemies within range AND inside the cone arc
  // (angle convention matches movement code: raw atan2, no visual offset).
  private applyMeleeHit(result: Extract<AttackResult, { kind: 'melee' }>): void {
    const halfConeRad = (result.coneAngleDeg / 2) * (Math.PI / 180);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const d = distance(result.source.x, result.source.y, enemy.x, enemy.y);
      if (d > result.range) continue;

      const angleToEnemy = Math.atan2(enemy.y - result.source.y, enemy.x - result.source.x);
      let diff = angleToEnemy - result.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normalize to [-PI, PI]

      if (Math.abs(diff) <= halfConeRad) {
        enemy.takeDamage(result.damage, true, result.source);
      }
    }
  }

  // [BLOCK: Spawn Melee Flash]
  // White cone-shaped flash, fades over MELEE_FLASH_DURATION_MS then destroys.
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
  // Moves each projectile (bounds-exit check lives in Projectile.update),
  // checks first-hit-wins overlap against enemies (no piercing), then drops
  // and destroys any projectile that's no longer alive.
  private updateProjectiles(deltaSeconds: number): void {
    this.projectiles.forEach((p) => p.update(deltaSeconds));

    for (const projectile of this.projectiles) {
      if (!projectile.alive) continue;

      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;

        const hitDistance = ENEMY_BODY_SIZE / 2 + projectile.radius;
        if (distance(projectile.x, projectile.y, enemy.x, enemy.y) <= hitDistance) {
          enemy.takeDamage(projectile.damage, projectile.isPhysical, projectile.sourceHero);
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

  // [BLOCK: Apply Aggro Updates]
  // AggroSystem is stateless — it reads current enemy state and returns the
  // range-return transition; this is the only place that actually mutates
  // enemy.aggroState/aggroTarget from that computed result.
  private applyAggroUpdates(): void {
    const assignments = this.aggroSystem.update(this.enemies);
    assignments.forEach((a) => {
      a.enemy.aggroState = a.aggroState;
      a.enemy.aggroTarget = a.aggroTarget;
    });
  }

  // [BLOCK: Cleanup Dead Enemies]
  // Destroys the Phaser object for anything Unit.die() already flagged dead
  // this frame (from melee/projectile damage) and drops it from the array.
  private cleanupDeadEnemies(): void {
    const alive: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        enemy.destroy();
      } else {
        alive.push(enemy);
      }
    }
    this.enemies = alive;
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

    // Once the run has ended, only the defeat fade (if any) continues ticking.
    if (this.runEnded) {
      if (this.isDefeatFading) this.tickDefeatFade(deltaSeconds);
      return;
    }

    // Tick run timer
    useGameStore.getState().tickTimer(deltaSeconds);

    // Hero switch input
    if (Phaser.Input.Keyboard.JustDown(this.keys1)) this.setLeader(0);
    if (Phaser.Input.Keyboard.JustDown(this.keys2)) this.setLeader(1);
    if (Phaser.Input.Keyboard.JustDown(this.keys3)) this.setLeader(2);

    const leader = this.heroes[this.leaderIndex];
    const pointer = this.input.activePointer;
    const camera = this.cameras.main;

    // Update each hero
    this.heroes.forEach((hero, i) => {
      if (i === this.leaderIndex) {
        hero.updateAsLeader(
          this.input.keyboard!.createCursorKeys(),
          this.wasd,
          pointer,
          camera
        );
      } else {
        hero.updateAsCompanion(leader);
      }
      hero.update(deltaSeconds);
    });

    // Hero attacks — leader on input, companions mirror leader's angle unless
    // posted (then independent nearest-enemy AI) — Phase 3 Chunk B
    this.updateHeroAttacks(pointer, camera);
    this.updateProjectiles(deltaSeconds);

    // Beacon proximity healing + per-beacon ticking (Phase 2)
    this.updateBeaconProximityHealing(deltaSeconds);
    this.beacons.forEach((beacon) => beacon.update(deltaSeconds));
    this.syncBeaconStateToStore();

    // Darkness — live level + overlay alpha (Phase 2)
    const litCount = this.beacons.filter((b) => b.isLit).length;
    const darknessLevel = this.updateDarkness(litCount, deltaSeconds);

    // Aggro range-return check, then enemy spawning + movement AI (Phase 3)
    this.applyAggroUpdates();
    this.updateEnemySpawning(deltaSeconds, darknessLevel);
    this.enemies.forEach((enemy) => enemy.update(deltaSeconds, this.beacons));
    this.cleanupDeadEnemies();

    // Win/Loss — loss takes priority if both trigger the same frame (Phase 2)
    this.checkWinLossConditions(litCount);

    // Sync resource bars to Zustand
    this.syncResourceBars();
  }

  // [BLOCK: Check Win/Loss Conditions]
  // Loss: all 7 beacons extinguished -> defeat fade -> PostRun(victory: false)
  // Win: timer reaches 0:00 AND at least 1 beacon still lit -> PostRun(victory: true)
  // If both are true on the same frame, loss wins (checked first).
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
  // Begins the 1.5s fade-to-black sequence. The darkness overlay is driven
  // directly here instead of through DarknessSystem for this final stretch.
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
  // For each beacon, check all heroes — first hero within BEACON_LIGHT_RADIUS
  // triggers the heal. Multiple heroes in range do not stack (break on first hit).
  // Skips beacons already at full meter.
  private updateBeaconProximityHealing(deltaSeconds: number): void {
    const healAmount = BEACON_HEAL_RATE * deltaSeconds;

    for (const beacon of this.beacons) {
      if (beacon.fireMeter >= 100) continue;

      for (const hero of this.heroes) {
        if (distance(hero.x, hero.y, beacon.x, beacon.y) <= BEACON_LIGHT_RADIUS) {
          beacon.heal(healAmount);
          break; // one hero is enough, no stacking
        }
      }
    }
  }

  // [BLOCK: Sync Beacon State To Store]
  // Pushes isLit/fireMeter for every beacon to Zustand so the HUD can react.
  private syncBeaconStateToStore(): void {
    const store = useGameStore.getState();
    this.beacons.forEach((beacon, i) => {
      store.setBeaconState(i, {
        isLit: beacon.isLit,
        fireMeter: beacon.fireMeter,
      });
    });
  }

  // [BLOCK: Update Enemy Spawning]
  // Pulls spawn requests from SpawnSystem (empty most frames), instantiates
  // an Enemy per request, and adds it to the tracked array.
  private updateEnemySpawning(deltaSeconds: number, darknessLevel: number): void {
    const clusterCenter = { x: WORLD_W / 2, y: WORLD_H / 2 };
    const requests = this.spawnSystem.update(deltaSeconds, darknessLevel, clusterCenter);

    for (const request of requests) {
      const config = this.enemyConfigById.get(request.enemyId);
      if (!config) continue; // unknown id — skip rather than crash

      const enemy = new Enemy(this, request.x, request.y, config);
      this.enemies.push(enemy);
    }
  }

  // [BLOCK: Update Darkness]
  // Advances DarknessSystem's lerp using the already-computed lit count,
  // applies the resulting alpha to the overlay rectangle, syncs the level to
  // the store, and returns the level so the spawn loop can scale off it too.
  private updateDarkness(litCount: number, deltaSeconds: number): number {
    const { level, alpha } = this.darknessSystem.update(litCount, deltaSeconds);

    this.darknessOverlay.setFillStyle(0x000000, alpha);
    useGameStore.getState().setDarknessLevel(level);

    return level;
  }

  // [BLOCK: Sync Resource Bars]
  // Finds the combined mana/stamina state and pushes to store for HUD.
  private syncResourceBars(): void {
    let manaTotal = 0;
    let manaCount = 0;
    let staminaTotal = 0;
    let staminaCount = 0;

    this.heroes.forEach(hero => {
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
    if (manaCount > 0)    store.setManaPercent(manaTotal / manaCount);
    if (staminaCount > 0) store.setStaminaPercent(staminaTotal / staminaCount);
  }
}