'use client';

// [File: src/game/PhaserGame.tsx]
// [BLOCK: Phaser Game Component]
// Mounts and manages the Phaser game instance inside a React component.
// Must be a Client Component — Phaser requires browser globals (window, document).
//
// Architecture:
//   - One Phaser.Game instance created on mount, destroyed on unmount.
//   - Phaser renders into #phaser-container div via the parent div ref.
//   - React HUD overlays on top via absolute positioning (handled in game/page.tsx).
//   - State is shared via Zustand — Phaser writes, React reads.

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WORLD_W, WORLD_H } from '@/game/config/constants';
import { MainMenuScene } from '@/game/scenes/MainMenuScene';
import { HeroSelectScene } from '@/game/scenes/HeroSelectScene';
import { GameScene } from '@/game/scenes/GameScene';
import { PostRunScene } from '@/game/scenes/PostRunScene';

// [BLOCK: Phaser Config]
function buildPhaserConfig(parent: HTMLDivElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0a0a0f',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [MainMenuScene, HeroSelectScene, GameScene, PostRunScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Prevent Phaser from intercepting keyboard events we want React to handle.
    input: {
      keyboard: true,
      mouse: true,
    },
    // Render settings for crisp visuals.
    render: {
      antialias: false,
      pixelArt: false,
      roundPixels: true,
    },
  };
}

// [BLOCK: PhaserGame Component]
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Guard: only create once, only in browser.
    if (gameRef.current || !containerRef.current) return;

    const config = buildPhaserConfig(containerRef.current);
    gameRef.current = new Phaser.Game(config);

    // Start directly into GameScene since React handles menu navigation.
    gameRef.current.scene.start('GameScene');

    // [BLOCK: Cleanup]
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    />
  );
}