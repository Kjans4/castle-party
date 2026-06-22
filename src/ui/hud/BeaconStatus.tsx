'use client';

// [File: src/ui/hud/BeaconStatus.tsx]
// [BLOCK: Beacon Status HUD]
// Displays 7 beacon fire icons showing burning/low/extinguished state, plus
// a live darkness level label. Reads from Zustand store — driven live by
// GameScene + DarknessSystem starting Phase 2.

import { useGameStore } from '@/ui/store/gameStore';

// [BLOCK: Beacon Visual State Helper]
// Mirrors Beacon.ts's visualState getter — derived here from the same
// fireMeter value rather than duplicating an enum in the store.
type BeaconTier = 'burning' | 'low' | 'extinguished';

function getTier(isLit: boolean, fireMeter: number): BeaconTier {
  if (!isLit || fireMeter <= 0) return 'extinguished';
  if (fireMeter < 30) return 'low';
  return 'burning';
}

const TIER_FLAME_COLOR: Record<BeaconTier, string> = {
  burning: '#ff8c28',
  low: '#ff5522',
  extinguished: 'rgba(255,255,255,0.1)',
};

const TIER_GLOW: Record<BeaconTier, string> = {
  burning: '0 0 6px rgba(255,140,40,0.8)',
  low: '0 0 4px rgba(255,85,34,0.5)',
  extinguished: 'none',
};

const TIER_POST_COLOR: Record<BeaconTier, string> = {
  burning: 'rgba(255,140,40,0.6)',
  low: 'rgba(255,85,34,0.4)',
  extinguished: 'rgba(255,255,255,0.15)',
};

export default function BeaconStatus() {
  const beaconStates  = useGameStore((s) => s.beaconStates);
  const darknessLevel = useGameStore((s) => s.darknessLevel);
  const litCount      = beaconStates.filter((b) => b.isLit).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      <p style={{
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)',
        margin: 0,
      }}>
        Beacons {litCount}/7
      </p>

      {/* Beacon icons row */}
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        {beaconStates.map((beacon) => {
          const tier = getTier(beacon.isLit, beacon.fireMeter);

          return (
            <div
              key={beacon.id}
              title={beacon.name}
              style={{
                width: '10px',
                height: '16px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              {/* Flame */}
              <div style={{
                width: '8px',
                height: '10px',
                backgroundColor: TIER_FLAME_COLOR[tier],
                clipPath: 'polygon(50% 0%, 85% 50%, 100% 100%, 0% 100%, 15% 50%)',
                boxShadow: TIER_GLOW[tier],
                transition: 'all 0.3s',
              }} />
              {/* Post */}
              <div style={{
                width: '2px',
                height: '6px',
                backgroundColor: TIER_POST_COLOR[tier],
              }} />
            </div>
          );
        })}
      </div>

      {/* Fire meter bars — shown when any beacon is damaged */}
      {beaconStates.some((b) => b.fireMeter < 100) && (
        <div style={{ display: 'flex', gap: '5px' }}>
          {beaconStates.map((beacon) => (
            <div
              key={beacon.id}
              style={{
                width: '10px',
                height: '2px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${beacon.fireMeter}%`,
                backgroundColor: beacon.fireMeter > 50
                  ? '#ff8c28'
                  : beacon.fireMeter > 25
                  ? '#ffdd4a'
                  : '#ff4444',
                transition: 'width 0.3s',
              }} />
            </div>
          ))}
        </div>
      )}

      {/* Darkness level label — live (Phase 2) */}
      <p style={{
        fontSize: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: darknessLevel >= 6
          ? 'rgba(255,80,80,0.6)'
          : darknessLevel >= 4
          ? 'rgba(255,140,40,0.6)'
          : 'rgba(255,255,255,0.2)',
        margin: 0,
        transition: 'color 0.5s',
      }}>
        Darkness Level {darknessLevel}
      </p>
    </div>
  );
}