'use client';

// [File: src/ui/hud/ResourceBars.tsx]
// [BLOCK: Resource Bars HUD]
// Displays shared mana and stamina pool bars.
// Reads from Zustand store — updated by GameScene each tick.
// Mana bar only shown if squad has mana users.
// Stamina bar only shown if squad has stamina users.
// Styles extracted to src/styles/ResourceBars.module.css — per-bar color/
// glow/width passed through as CSS custom properties.

import { CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';
import styles from '@/styles/ResourceBars.module.css';

// [BLOCK: Single Bar Component]
function ResourceBar({
  label,
  percent,
  color,
  glowColor,
}: {
  label: string;
  percent: number;
  color: string;
  glowColor: string;
}) {
  const fillStyle = {
    '--fill-width': `${percent}%`,
    '--fill-color': color,
    '--fill-glow': percent > 10 ? `0 0 6px ${glowColor}` : 'none',
  } as CSSProperties;

  return (
    <div className={styles.bar}>
      <div className={styles.barHeader}>
        <span className={styles.barLabel}>{label}</span>
        <span className={styles.barPercent}>{Math.round(percent)}%</span>
      </div>

      <div className={styles.track}>
        <div className={styles.fill} style={fillStyle} />
      </div>
    </div>
  );
}

// [BLOCK: Resource Bars Component]
export default function ResourceBars() {
  const manaPercent    = useGameStore((s) => s.manaPercent);
  const staminaPercent = useGameStore((s) => s.staminaPercent);

  const hasMana    = HERO_ROSTER.some((h) => h.resource === 'mana'    || h.resource === 'hybrid');
  const hasStamina = HERO_ROSTER.some((h) => h.resource === 'stamina' || h.resource === 'hybrid');

  return (
    <div className={styles.container}>
      {hasMana && (
        <ResourceBar
          label="Mana"
          percent={manaPercent}
          color="#a855f7"
          glowColor="rgba(168,85,247,0.6)"
        />
      )}
      {hasStamina && (
        <ResourceBar
          label="Stamina"
          percent={staminaPercent}
          color="#22c55e"
          glowColor="rgba(34,197,94,0.6)"
        />
      )}
    </div>
  );
}