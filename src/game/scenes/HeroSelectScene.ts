// [File: src/game/scenes/HeroSelectScene.ts]
// [BLOCK: Hero Select Scene]
// Thin stub — React handles hero selection UI via /select route.

import Phaser from 'phaser';

export class HeroSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HeroSelectScene' });
  }

  create(): void {
    // No-op — React owns the hero select UI.
  }
}