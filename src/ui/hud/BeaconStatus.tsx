'use client';

// [File: src/ui/hud/BeaconStatus.tsx]
// [BLOCK: Beacon Status HUD]
// Displays 7 beacon fire icons showing lit/unlit state.
// Reads from Zustand store beaconStates array.
// Static in Phase 1 — all 7 lit. Driven by BeaconSystem in Phase 3.

import { useGameStore } from '@/ui/store/gameStore';

export default function BeaconStatus() {
  const beaconStates = useGameStore((s) => s.beaconStates);
  const litCount     = beaconStates.filter((b) => b.isLit).length;

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
        {beaconStates.map((beacon) => (
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
              backgroundColor: beacon.isLit ? '#ff8c28' : 'rgba(255,255,255,0.1)',
              clipPath: 'polygon(50% 0%, 85% 50%, 100% 100%, 0% 100%, 15% 50%)',
              boxShadow: beacon.isLit ? '0 0 6px rgba(255,140,40,0.8)' : 'none',
              transition: 'all 0.3s',
            }} />
            {/* Post */}
            <div style={{
              width: '2px',
              height: '6px',
              backgroundColor: beacon.isLit
                ? 'rgba(255,140,40,0.6)'
                : 'rgba(255,255,255,0.15)',
            }} />
          </div>
        ))}
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
    </div>
  );
}