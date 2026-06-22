'use client';

// [File: src/ui/menus/PostRun.tsx]
// [BLOCK: Post Run Screen]
// Pure inline styles — no Tailwind dependency.
// Reads runResult from Zustand store (Phase 2) instead of hardcoding Victory.
// Falls back to 'victory' display if runResult is null (e.g. direct nav during dev).

import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { useGameStore, formatTimer } from '@/ui/store/gameStore';
import { RUN_DURATION_SECONDS } from '@/game/config/constants';

export default function PostRun() {
  const router = useRouter();
  const runTimer   = useGameStore((s) => s.runTimer);
  const runResult  = useGameStore((s) => s.runResult);
  const resetRun   = useGameStore((s) => s.resetRun);

  const isVictory = runResult !== 'defeat'; // null or 'victory' both render as Victory

  const timeSurvivedSeconds = RUN_DURATION_SECONDS - runTimer;
  const timeSurvivedDisplay = formatTimer(timeSurvivedSeconds);

  function handlePlayAgain() {
    resetRun();
    router.push('/select');
  }

  function handleMainMenu() {
    resetRun();
    router.push('/menu');
  }

  const root: CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0a0a0f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    color: '#ffffff',
  };

  const resultGlowColor = isVictory ? 'rgba(255,220,80,0.06)' : 'rgba(255,68,68,0.06)';
  const resultTextShadow = isVictory ? '0 0 40px rgba(255,220,80,0.35)' : '0 0 40px rgba(255,68,68,0.35)';

  return (
    <main style={root}>

      {/* Background grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px',
        height: '700px',
        background: `radial-gradient(ellipse at center, ${resultGlowColor} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Result */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
      }}>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.4em',
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
        }}>
          Run Complete
        </p>
        <h1 style={{
          fontSize: '60px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: resultTextShadow,
        }}>
          {isVictory ? 'Victory' : 'Defeat'}
        </h1>
      </div>

      {/* Stats */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        marginTop: '48px',
        padding: '24px 64px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}>
        <p style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
        }}>
          Time Survived
        </p>
        <p style={{
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '0.12em',
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
        }}>
          {timeSurvivedDisplay}
        </p>
      </div>

      {/* Buttons */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        gap: '12px',
        marginTop: '40px',
      }}>
        <button
          onClick={handleMainMenu}
          style={{
            width: '160px',
            padding: '12px 0',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.4)',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
          }}
        >
          Main Menu
        </button>

        <button
          onClick={handlePlayAgain}
          style={{
            width: '160px',
            padding: '12px 0',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#ff8c28',
            backgroundColor: 'rgba(255,140,40,0.08)',
            border: '1px solid rgba(255,140,40,0.5)',
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
      </div>
    </main>
  );
}