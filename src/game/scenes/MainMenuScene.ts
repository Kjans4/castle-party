// [File: src/game/scenes/MainMenuScene.ts]
// [BLOCK: Main Menu Scene]
// Thin stub — React handles all menu UI via /menu route.
// This scene exists so Phaser's scene manager is complete.
// It is never started directly; the app navigates via Next.js router.

import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    // No-op — React owns the main menu UI.
  }
}