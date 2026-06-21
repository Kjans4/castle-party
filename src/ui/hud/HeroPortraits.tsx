'use client';

// [File: src/ui/hud/HeroPortraits.tsx]
// [BLOCK: Hero Portraits HUD]
// Displays 3 hero portrait boxes in the top-left corner.
// Active leader is highlighted with a colored border and full opacity.
// Click a portrait to switch the active leader (calls back to GameScene via store).
// Keyboard switch (1/2/3) is handled in GameScene and syncs via store.

import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';

export default function HeroPortraits() {
  const activeIndex  = useGameStore((s) => s.activeLeaderIndex);
  const setLeaderIdx = useGameStore((s) => s.setActiveLeader);

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
              border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.1)'}`,
              backgroundColor: isActive
                ? `rgba(${rgb}, 0.12)`
                : 'rgba(0,0,0,0.5)',
              opacity: isActive ? 1 : 0.55,
              cursor: 'pointer',
              transition: 'all 0.15s',
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