// [File: src/game/scenes/PostRunScene.ts]
// [BLOCK: Post Run Scene]
// Thin stub — React handles post-run UI via /results route.

import Phaser from 'phaser';

export class PostRunScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PostRunScene' });
  }

  create(): void {
    // No-op — React owns the post-run UI.
  }
}