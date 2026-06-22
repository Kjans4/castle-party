'use client';

// [File: src/ui/hud/Timer.tsx]
// [BLOCK: Timer HUD]
// Displays the run countdown in MM:SS format.
// Reads from Zustand store — updates every render tick.
// Color reacts to live darkness level (Phase 2): white -> orange (Level 4+)
// -> red (Level 6+), per castle-party-phase2-plan.md Darkness Level table.

import { useGameStore, formatTimer } from '@/ui/store/gameStore';

function colorForDarknessLevel(level: number): { color: string; glow: string } {
  if (level >= 6) {
    return { color: '#ff4444', glow: '0 0 20px rgba(255,68,68,0.6)' };
  }
  if (level >= 4) {
    return { color: '#ff8c28', glow: '0 0 20px rgba(255,140,40,0.6)' };
  }
  return { color: '#ffffff', glow: 'none' };
}

export default function Timer() {
  const runTimer      = useGameStore((s) => s.runTimer);
  const darknessLevel = useGameStore((s) => s.darknessLevel);
  const display        = formatTimer(runTimer);
  const { color, glow } = colorForDarknessLevel(darknessLevel);

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
        color,
        textShadow: glow,
        margin: 0,
        transition: 'color 0.5s, text-shadow 0.5s',
      }}>
        {display}
      </p>
    </div>
  );
}