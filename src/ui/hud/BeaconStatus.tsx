'use client';

// [File: src/ui/hud/BeaconStatus.tsx]
// [BLOCK: Beacon Status HUD]
// Displays 7 beacon fire icons showing burning/low/extinguished state, plus
// a live darkness level label. Reads from Zustand store — driven live by
// GameScene + DarknessSystem starting Phase 2.
// Styles extracted to src/styles/BeaconStatus.module.css — per-tier colors
// and computed fire-meter widths passed through as CSS custom properties.

import { CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import styles from '@/styles/BeaconStatus.module.css';

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

function darknessLabelColor(darknessLevel: number): string {
  if (darknessLevel >= 6) return 'rgba(255,80,80,0.6)';
  if (darknessLevel >= 4) return 'rgba(255,140,40,0.6)';
  return 'rgba(255,255,255,0.2)';
}

function fireMeterFillColor(fireMeter: number): string {
  if (fireMeter > 50) return '#ff8c28';
  if (fireMeter > 25) return '#ffdd4a';
  return '#ff4444';
}

export default function BeaconStatus() {
  const beaconStates  = useGameStore((s) => s.beaconStates);
  const darknessLevel = useGameStore((s) => s.darknessLevel);
  const litCount      = beaconStates.filter((b) => b.isLit).length;

  return (
    <div className={styles.container}>
      <p className={styles.label}>Beacons {litCount}/7</p>

      {/* Beacon icons row */}
      <div className={styles.row}>
        {beaconStates.map((beacon) => {
          const tier = getTier(beacon.isLit, beacon.fireMeter);
          const flameStyle = {
            '--flame-color': TIER_FLAME_COLOR[tier],
            '--flame-glow': TIER_GLOW[tier],
          } as CSSProperties;
          const postStyle = {
            '--post-color': TIER_POST_COLOR[tier],
          } as CSSProperties;

          return (
            <div key={beacon.id} title={beacon.name} className={styles.beaconIcon}>
              <div className={styles.flame} style={flameStyle} />
              <div className={styles.post} style={postStyle} />
            </div>
          );
        })}
      </div>

      {/* Fire meter bars — shown when any beacon is damaged */}
      {beaconStates.some((b) => b.fireMeter < 100) && (
        <div className={styles.meterRow}>
          {beaconStates.map((beacon) => {
            const fillStyle = {
              '--fill-width': `${beacon.fireMeter}%`,
              '--fill-color': fireMeterFillColor(beacon.fireMeter),
            } as CSSProperties;

            return (
              <div key={beacon.id} className={styles.meterTrack}>
                <div className={styles.meterFill} style={fillStyle} />
              </div>
            );
          })}
        </div>
      )}

      {/* Darkness level label — live (Phase 2) */}
      <p
        className={styles.darknessLabel}
        style={{ '--darkness-color': darknessLabelColor(darknessLevel) } as CSSProperties}
      >
        Darkness Level {darknessLevel}
      </p>
    </div>
  );
}