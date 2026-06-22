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
} from '@/game/config/constants';
import { HERO_ROSTER } from '@/game/config/heroes';
import { BEACON_ROSTER } from '@/game/config/beacons';
import { registerAnimations } from '@/game/animations/registry';
import { Hero } from '@/game/entities/Hero';
import { Beacon } from '@/game/entities/Beacon';
import { generateBeaconPositions } from '@/game/utils/BeaconPlacement';
import { distance } from '@/game/utils/MathUtils';
import { DarknessSystem } from '@/game/systems/DarknessSystem';
import { useGameStore } from '@/ui/store/gameStore';

// [BLOCK: Game Scene Class]
export class GameScene extends Phaser.Scene {
  // [BLOCK: Heroes]
  private heroes: Hero[] = [];
  private leaderIndex: number = 0;

  // [BLOCK: Beacons]
  private beacons: Beacon[] = [];

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

    // Beacon proximity healing + per-beacon ticking (Phase 2)
    this.updateBeaconProximityHealing(deltaSeconds);
    this.beacons.forEach((beacon) => beacon.update(deltaSeconds));
    this.syncBeaconStateToStore();

    // Darkness — live level + overlay alpha (Phase 2)
    const litCount = this.beacons.filter((b) => b.isLit).length;
    this.updateDarkness(litCount, deltaSeconds);

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

  // [BLOCK: Update Darkness]
  // Advances DarknessSystem's lerp using the already-computed lit count,
  // applies the resulting alpha to the overlay rectangle, and syncs the
  // level to the store.
  private updateDarkness(litCount: number, deltaSeconds: number): void {
    const { level, alpha } = this.darknessSystem.update(litCount, deltaSeconds);

    this.darknessOverlay.setFillStyle(0x000000, alpha);
    useGameStore.getState().setDarknessLevel(level);
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