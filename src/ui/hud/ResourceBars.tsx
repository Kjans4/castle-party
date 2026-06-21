'use client';

// [File: src/ui/hud/ResourceBars.tsx]
// [BLOCK: Resource Bars HUD]
// Displays shared mana and stamina pool bars.
// Reads from Zustand store — updated by GameScene each tick.
// Mana bar only shown if squad has mana users.
// Stamina bar only shown if squad has stamina users.

import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';

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
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      width: '160px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.35)',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.3)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {Math.round(percent)}%
        </span>
      </div>

      {/* Bar track */}
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${percent}%`,
          backgroundColor: color,
          boxShadow: percent > 10 ? `0 0 6px ${glowColor}` : 'none',
          transition: 'width 0.1s',
        }} />
      </div>
    </div>
  );
}

// [BLOCK: Resource Bars Component]
export default function ResourceBars() {
  const manaPercent    = useGameStore((s) => s.manaPercent);
  const staminaPercent = useGameStore((s) => s.staminaPercent);

  // Determine which bars to show based on squad composition
  const hasMana    = HERO_ROSTER.some((h) => h.resource === 'mana'    || h.resource === 'hybrid');
  const hasStamina = HERO_ROSTER.some((h) => h.resource === 'stamina' || h.resource === 'hybrid');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
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