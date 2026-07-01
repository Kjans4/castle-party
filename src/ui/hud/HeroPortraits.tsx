'use client';

// [File: src/ui/hud/HeroPortraits.tsx]
// [BLOCK: Hero Portraits HUD]
// Displays 3 hero portrait boxes in the top-left corner.
// Active leader is highlighted with a colored border and full opacity.
// Click a portrait to switch the active leader (calls back to GameScene via store).
// Keyboard switch (1/2/3) is handled in GameScene and syncs via store.
//
// Phase 3: Briefly glows white on party level-up (levelUpFlashId).
// Phase 4 Chunk C: HP bar below each portrait; per-portrait death flash
//   (heroDeathFlashIds[i]).
// Phase 6 Chunk 6C: Dead hero indicator — portrait shows red "DEAD" overlay,
//   respawn countdown timer, and click/switch is disabled while the hero is
//   dead. Dead heroes get a dimmed appearance matching Hero.ts's DEAD_ALPHA
//   visual state. Reads deadHeroIndices + respawnTimerSeconds from the store.

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER, type HeroConfig } from '@/game/config/heroes';

const LEVEL_FLASH_DURATION_MS = 600;
const DEATH_FLASH_DURATION_MS = 400;

function hpBarColor(percent: number): string {
  if (percent >= 60) return '#22c55e';
  if (percent >= 30) return '#ffdd4a';
  return '#ff4444';
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// [BLOCK: Respawn Countdown Format]
function formatCountdown(seconds: number): string {
  return `${Math.ceil(seconds)}s`;
}

// [BLOCK: Hero Portrait Card — Phase 4 Chunk C + Phase 6 Chunk 6C]
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
  const hpPercent          = useGameStore((s) => s.heroHpPercents[index] ?? 100);
  const deathFlashId       = useGameStore((s) => s.heroDeathFlashIds[index] ?? 0);
  const deadHeroIndices    = useGameStore((s) => s.deadHeroIndices);
  const respawnTimer       = useGameStore((s) => s.respawnTimerSeconds);

  const isDead = deadHeroIndices.includes(index);

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

  // Dead heroes: dimmed, no click, no active highlight.
  const handleClick = () => {
    if (isDead) return;
    onClick();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px 6px 6px',
          border: `1px solid ${
            isDead        ? 'rgba(255,68,68,0.3)' :
            isFlashing    ? 'rgba(255,255,255,0.9)' :
            isActive      ? color :
                            'rgba(255,255,255,0.1)'
          }`,
          backgroundColor: isDead
            ? 'rgba(255,0,0,0.05)'
            : isFlashing
            ? 'rgba(255,255,255,0.18)'
            : isActive
            ? `rgba(${rgb}, 0.12)`
            : 'rgba(0,0,0,0.5)',
          boxShadow: isFlashing ? '0 0 16px rgba(255,255,255,0.7)' : 'none',
          opacity: isDead ? 0.45 : isActive ? 1 : 0.55,
          cursor: isDead ? 'default' : 'pointer',
          transition: 'all 0.3s',
          pointerEvents: 'auto',
          minWidth: '140px',
          position: 'relative',
        }}
      >
        {/* Color swatch */}
        <div style={{
          width: '28px',
          height: '36px',
          backgroundColor: isDead ? '#333333' : color,
          opacity: isDead ? 0.5 : isActive ? 1 : 0.5,
          flexShrink: 0,
        }} />

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: isDead ? 'rgba(255,80,80,0.7)' : isActive ? color : 'rgba(255,255,255,0.6)',
            }}>
              {hero.name}
            </span>
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

          {isDead ? (
            // [BLOCK: Dead State — Phase 6 Chunk 6C]
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{
                fontSize: '8px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255,68,68,0.8)',
              }}>
                Dead
              </span>
              {respawnTimer > 0 && (
                <span style={{
                  fontSize: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'rgba(255,200,200,0.7)',
                  fontWeight: 600,
                }}>
                  {formatCountdown(respawnTimer)}
                </span>
              )}
            </div>
          ) : (
            <span style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)',
            }}>
              {hero.roles[0]}
            </span>
          )}
        </div>

        {/* Active indicator dot — hidden when dead */}
        {isActive && !isDead && (
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: color,
            marginLeft: 'auto',
            boxShadow: `0 0 6px ${color}`,
            flexShrink: 0,
          }} />
        )}
      </div>

      {/* HP Bar — dimmed red when dead */}
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
          width: `${isDead ? 0 : hpPercent}%`,
          backgroundColor: isDead ? '#ff4444' : hpBarColor(hpPercent),
          opacity: isDead ? 0.3 : 1,
          transition: 'width 0.15s, background-color 0.3s',
        }} />
      </div>
    </div>
  );
}

// [BLOCK: Hero Portraits Component]
export default function HeroPortraits() {
  const activeIndex    = useGameStore((s) => s.activeLeaderIndex);
  const setLeaderIdx   = useGameStore((s) => s.setActiveLeader);
  const levelUpFlashId = useGameStore((s) => s.levelUpFlashId);
  const deadHeroIndices = useGameStore((s) => s.deadHeroIndices);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {HERO_ROSTER.map((hero, i) => (
        <HeroPortraitCard
          key={hero.id}
          hero={hero}
          index={i}
          isActive={i === activeIndex}
          isLevelFlashing={isLevelFlashing}
          onClick={() => {
            if (!deadHeroIndices.includes(i)) setLeaderIdx(i);
          }}
        />
      ))}
    </div>
  );
}