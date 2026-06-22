'use client';

// [File: src/app/game/page.tsx]
// [BLOCK: Game Page]
// Mounts Phaser canvas + React HUD overlay.
// Phaser renders at z-index 0 (fixed, full viewport).
// HUD overlays at z-index 10 (pointer-events-none except portraits).
// PhaserGame loaded via dynamic import with ssr:false — Phaser needs browser globals.
// Watches gameStore.runResult (Phase 2) and navigates to /results once GameScene
// sets it — this is the only bridge from Phaser's win/loss logic to Next.js routing.

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Timer from '@/ui/hud/Timer';
import HeroPortraits from '@/ui/hud/HeroPortraits';
import BeaconStatus from '@/ui/hud/BeaconStatus';
import ResourceBars from '@/ui/hud/ResourceBars';
import { useGameStore } from '@/ui/store/gameStore';

// [BLOCK: Dynamic Import — SSR Disabled]
const PhaserGame = dynamic(() => import('../game/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.25)',
        fontFamily: 'sans-serif',
      }}>
        Loading...
      </p>
    </div>
  ),
});

// [BLOCK: Game Page Component]
export default function GamePage() {
  const router = useRouter();
  const runResult = useGameStore((s) => s.runResult);

  // [BLOCK: Watch Run Result — Navigate To Results]
  // GameScene sets runResult once (via endRun) when the run ends.
  // This effect is the only place that reacts to it and routes accordingly.
  useEffect(() => {
    if (runResult !== null) {
      router.push('/results');
    }
  }, [runResult, router]);

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#0a0a0f',
    }}>

      {/* Phaser canvas — z-index 0 */}
      <PhaserGame />

      {/* HUD overlay — z-index 10, pointer-events-none by default */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: 'sans-serif',
        color: '#ffffff',
      }}>

        {/* [BLOCK: Top-Left — Hero Portraits] */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          pointerEvents: 'auto',  // portraits are clickable
        }}>
          <HeroPortraits />
        </div>

        {/* [BLOCK: Top-Center — Timer + Beacon Status] */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'rgba(0,0,0,0.4)',
          padding: '10px 20px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Timer />
          <BeaconStatus />
        </div>

        {/* [BLOCK: Bottom-Left — Resource Bars] */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '16px',
        }}>
          <ResourceBars />
        </div>

        {/* [BLOCK: Phase Label] */}
        <p style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.1)',
          margin: 0,
        }}>
          Phase 2 — Beacons &amp; Darkness
        </p>

      </div>
    </div>
  );
}