'use client';

// [File: src/ui/hud/Timer.tsx]
// [BLOCK: Timer HUD]
// Displays the run countdown in MM:SS format.
// Reads from Zustand store — updates every render tick.
// Turns orange in the final minute as a visual warning.

import { useGameStore, formatTimer } from '@/ui/store/gameStore';

export default function Timer() {
  const runTimer = useGameStore((s) => s.runTimer);
  const display  = formatTimer(runTimer);
  const isFinal  = runTimer <= 60; // final minute warning

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px',
    }}>
      <p style={{
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)',
        margin: 0,
      }}>
        Dawn In
      </p>
      <p style={{
        fontSize: '28px',
        fontWeight: 900,
        letterSpacing: '0.1em',
        fontVariantNumeric: 'tabular-nums',
        color: isFinal ? '#ff8c28' : '#ffffff',
        textShadow: isFinal ? '0 0 20px rgba(255,140,40,0.6)' : 'none',
        margin: 0,
        transition: 'color 0.5s, text-shadow 0.5s',
      }}>
        {display}
      </p>
    </div>
  );
}