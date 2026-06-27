'use client';

// [File: src/ui/hud/HeroPortraits.tsx]
// [BLOCK: Hero Portraits HUD]
// Displays 3 hero portrait boxes in the top-left corner.
// Active leader is highlighted with a colored border and full opacity.
// Click a portrait to switch the active leader (calls back to GameScene via store).
// Keyboard switch (1/2/3) is handled in GameScene and syncs via store.
// Briefly glows white on every party level-up (Phase 3), keyed off levelUpFlashId.
//
// Phase 4 Chunk C adds: an HP bar below each portrait (green/yellow/red
// thresholds), and a per-portrait white death flash keyed off that hero's
// own heroDeathFlashIds[i] — separate from the existing whole-row level-up
// flash, since only one hero dies at a time. Extracted into a HeroPortraitCard
// child component because each portrait now needs its own useEffect/useState
// pair, which can't live inside a .map() in the parent.

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER, type HeroConfig } from '@/game/config/heroes';

const LEVEL_FLASH_DURATION_MS = 600;
const DEATH_FLASH_DURATION_MS = 400;

// [BLOCK: HP Bar Color Thresholds — Phase 4 Chunk C]
// 60–100% green, 30–59% yellow, 0–29% red, per castle-party-phase4-plan.md
// Section 6.
function hpBarColor(percent: number): string {
  if (percent >= 60) return '#22c55e';
  if (percent >= 30) return '#ffdd4a';
  return '#ff4444';
}

// [BLOCK: Hex To RGB]
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// [BLOCK: Hero Portrait Card — Phase 4 Chunk C]
// One portrait + its HP bar. Watches its own death-flash counter so dying
// doesn't flash every other hero's portrait.
function HeroPortraitCard({
  hero,
  index,
  isActive,
  isLevelFlashing,
  onClick,
}: {
  hero: HeroConfig;
  index: number;
  isActive: boolean;
  isLevelFlashing: boolean;
  onClick: () => void;
}) {
  const hpPercent = useGameStore((s) => s.heroHpPercents[index] ?? 100);
  const deathFlashId = useGameStore((s) => s.heroDeathFlashIds[index] ?? 0);

  const [isDeathFlashing, setIsDeathFlashing] = useState(false);
  const lastDeathFlashId = useRef(deathFlashId);

  useEffect(() => {
    if (deathFlashId !== lastDeathFlashId.current) {
      lastDeathFlashId.current = deathFlashId;
      setIsDeathFlashing(true);
      const timeout = setTimeout(() => setIsDeathFlashing(false), DEATH_FLASH_DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [deathFlashId]);

  const isFlashing = isLevelFlashing || isDeathFlashing;
  const color = hero.color;
  const rgb = hexToRgb(color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px 6px 6px',
          border: `1px solid ${isFlashing ? 'rgba(255,255,255,0.9)' : isActive ? color : 'rgba(255,255,255,0.1)'}`,
          backgroundColor: isFlashing
            ? 'rgba(255,255,255,0.18)'
            : isActive
            ? `rgba(${rgb}, 0.12)`
            : 'rgba(0,0,0,0.5)',
          boxShadow: isFlashing ? '0 0 16px rgba(255,255,255,0.7)' : 'none',
          opacity: isActive ? 1 : 0.55,
          cursor: 'pointer',
          transition: 'all 0.3s',
          pointerEvents: 'auto',
          minWidth: '140px',
        }}
      >
        {/* Color swatch */}
        <div style={{
          width: '28px',
          height: '36px',
          backgroundColor: color,
          opacity: isActive ? 1 : 0.5,
          flexShrink: 0,
        }} />

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: isActive ? color : 'rgba(255,255,255,0.6)',
            }}>
              {hero.name}
            </span>
            {/* Key hint */}
            <span style={{
              fontSize: '9px',
              color: 'rgba(255,255,255,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '0 4px',
              lineHeight: '14px',
            }}>
              {index + 1}
            </span>
          </div>
          <span style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)',
          }}>
            {hero.roles[0]}
          </span>
        </div>

        {/* Active indicator dot */}
        {isActive && (
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: color,
            marginLeft: 'auto',
            boxShadow: `0 0 6px ${color}`,
          }} />
        )}
      </div>

      {/* HP Bar — Phase 4 Chunk C */}
      <div style={{
        width: '140px',
        height: '3px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${hpPercent}%`,
          backgroundColor: hpBarColor(hpPercent),
          transition: 'width 0.15s, background-color 0.3s',
        }} />
      </div>
    </div>
  );
}

// [BLOCK: Hero Portraits Component]
export default function HeroPortraits() {
  const activeIndex  = useGameStore((s) => s.activeLeaderIndex);
  const setLeaderIdx = useGameStore((s) => s.setActiveLeader);
  const levelUpFlashId = useGameStore((s) => s.levelUpFlashId);

  const [isLevelFlashing, setIsLevelFlashing] = useState(false);
  const lastLevelFlashId = useRef(levelUpFlashId);

  useEffect(() => {
    if (levelUpFlashId !== lastLevelFlashId.current) {
      lastLevelFlashId.current = levelUpFlashId;
      setIsLevelFlashing(true);
      const timeout = setTimeout(() => setIsLevelFlashing(false), LEVEL_FLASH_DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [levelUpFlashId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {HERO_ROSTER.map((hero, i) => (
        <HeroPortraitCard
          key={hero.id}
          hero={hero}
          index={i}
          isActive={i === activeIndex}
          isLevelFlashing={isLevelFlashing}
          onClick={() => setLeaderIdx(i)}
        />
      ))}
    </div>
  );
}