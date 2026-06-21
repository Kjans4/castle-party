// [File: src/game/scenes/GameScene.ts]
// [BLOCK: Game Scene]
// Main gameplay scene. Owns world, camera, heroes, and input.
// Writes to Zustand store each tick — React HUD reads from it.

import Phaser from 'phaser';
import {
  WORLD_W, WORLD_H, TILE_SIZE, CAMERA_LERP,
} from '@/game/config/constants';
import { HERO_ROSTER } from '@/game/config/heroes';
import { registerAnimations } from '@/game/animations/registry';
import { Hero } from '@/game/entities/Hero';
import { useGameStore } from '@/ui/store/gameStore';

// [BLOCK: Game Scene Class]
export class GameScene extends Phaser.Scene {
  // [BLOCK: Heroes]
  private heroes: Hero[] = [];
  private leaderIndex: number = 0;

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

    // Start timer
    useGameStore.getState().setRunActive(true);
  }

  // [BLOCK: Spawn Heroes]
  // Heroes spawn at the left edge of the world, vertically centered.
  private spawnHeroes(): void {
    const startX = 300;
    const startY = WORLD_H / 2;
    const spacing = 60;

    HERO_ROSTER.forEach((config, i) => {
      const hero = new Hero(
        this,
        startX,
        startY + (i - 1) * spacing,
        config
      );
      this.heroes.push(hero);
    });

    // Set initial leader
    this.setLeader(0);
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

    // Sync resource bars to Zustand
    this.syncResourceBars();
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