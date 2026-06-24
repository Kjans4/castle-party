'use client';

// [File: src/ui/hud/HeroPortraits.tsx]
// [BLOCK: Hero Portraits HUD]
// Displays 3 hero portrait boxes in the top-left corner.
// Active leader is highlighted with a colored border and full opacity.
// Click a portrait to switch the active leader (calls back to GameScene via store).
// Keyboard switch (1/2/3) is handled in GameScene and syncs via store.
// Briefly glows white on every party level-up (Phase 3), keyed off levelUpFlashId.

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';

const FLASH_DURATION_MS = 600;

export default function HeroPortraits() {
  const activeIndex  = useGameStore((s) => s.activeLeaderIndex);
  const setLeaderIdx = useGameStore((s) => s.setActiveLeader);
  const levelUpFlashId = useGameStore((s) => s.levelUpFlashId);

  const [isFlashing, setIsFlashing] = useState(false);
  const lastFlashId = useRef(levelUpFlashId);

  useEffect(() => {
    if (levelUpFlashId !== lastFlashId.current) {
      lastFlashId.current = levelUpFlashId;
      setIsFlashing(true);
      const timeout = setTimeout(() => setIsFlashing(false), FLASH_DURATION_MS);
      return () => clearTimeout(timeout);
    }
  }, [levelUpFlashId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {HERO_ROSTER.map((hero, i) => {
        const isActive  = i === activeIndex;
        const color     = hero.color;
        const hexToRgb  = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `${r}, ${g}, ${b}`;
        };
        const rgb = hexToRgb(color);

        return (
          <div
            key={hero.id}
            onClick={() => setLeaderIdx(i)}
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
                  {i + 1}
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
        );
      })}
    </div>
  );
}