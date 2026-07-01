'use client';

// [File: src/ui/hud/Timer.tsx]
// [BLOCK: Timer HUD]
// Displays the run countdown in MM:SS format.
// Reads from Zustand store — updates every render tick.

import { CSSProperties } from 'react';
import { useGameStore, formatTimer } from '@/ui/store/gameStore';
import styles from '@/styles/Timer.module.css';

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

  const valueStyle = {
    '--timer-color': color,
    '--timer-glow': glow,
  } as CSSProperties;

  return (
    <div className={styles.container}>
      <p className={styles.label}>Dawn In</p>
      <p className={styles.value} style={valueStyle}>{display}</p>
    </div>
  );
}