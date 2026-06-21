// [File: src/game/animations/registry.ts]
// [BLOCK: Animation Registry]
// Registers all placeholder animation keys with Phaser's animation manager.
// In Phase 1 each "animation" is a single frame — no real spritesheet yet.
// When hand-drawn art is ready, replace these stubs with real frameRate + frames configs.
//
// Called once from GameScene.create() before any entities are spawned.

import type { Scene } from 'phaser';

// [BLOCK: Hero Prefixes]
// Must match the prefix passed to AnimationState for each hero.
const HERO_PREFIXES = ['fencer', 'sorceress', 'priestess'];

// [BLOCK: Enemy Prefixes]
const ENEMY_PREFIXES = [
  'skeleton', 'zombie', 'ghost',
  'knight', 'ranger', 'priest',
  'fire-morph', 'ice-morph', 'electric-morph',
  'spider', 'mini-spider', 'slime', 'mini-slime',
];

// [BLOCK: Boss Prefixes]
const BOSS_PREFIXES = ['boss-1', 'boss-2', 'boss-3', 'boss-4', 'boss-5'];

// [BLOCK: Animation States]
const STATES = ['idle', 'walk', 'attack', 'hurt', 'death'] as const;

// [BLOCK: Register All Animations]
// Creates a single-frame animation for every prefix + state combination.
// Uses the placeholder texture key 'placeholder' created in GameScene.preload().
export function registerAnimations(scene: Scene): void {
  const allPrefixes = [...HERO_PREFIXES, ...ENEMY_PREFIXES, ...BOSS_PREFIXES];

  for (const prefix of allPrefixes) {
    for (const state of STATES) {
      const key = `${prefix}-${state}`;

      // Skip if already registered (scene restart safety).
      if (scene.anims.exists(key)) continue;

      scene.anims.create({
        key,
        frames: [{ key: 'placeholder', frame: 0 }],
        frameRate: 1,
        repeat: state === 'idle' || state === 'walk' ? -1 : 0,
      });
    }
  }
}