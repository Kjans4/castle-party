'use client';

// [File: src/ui/hud/XPBar.tsx]
// [BLOCK: XP Bar HUD]
// Thin progress bar toward the next party level, with the level number and a
// brief flash pulse keyed off levelUpFlashId whenever a level-up happens.

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/ui/store/gameStore';

const FLASH_DURATION_MS = 600;

export default function XPBar() {
  const partyXP        = useGameStore((s) => s.partyXP);
  const xpThreshold     = useGameStore((s) => s.xpThreshold);
  const partyLevel      = useGameStore((s) => s.partyLevel);
  const levelUpFlashId  = useGameStore((s) => s.levelUpFlashId);

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

  const percent = xpThreshold > 0 ? Math.min(100, (partyXP / xpThreshold) * 100) : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: '8px 14px',
      border: `1px solid ${isFlashing ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.06)'}`,
      transition: 'border-color 0.3s',
      width: '280px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: isFlashing ? '#ffffff' : 'rgba(255,255,255,0.5)',
        textShadow: isFlashing ? '0 0 10px rgba(255,255,255,0.8)' : 'none',
        transition: 'color 0.3s, text-shadow 0.3s',
        flexShrink: 0,
      }}>
        LV {partyLevel}
      </span>

      <div style={{
        flex: 1,
        height: '6px',
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
          backgroundColor: '#ffaa33',
          boxShadow: isFlashing ? '0 0 12px rgba(255,170,51,0.9)' : '0 0 6px rgba(255,170,51,0.5)',
          transition: 'width 0.2s, box-shadow 0.3s',
        }} />
      </div>

      <span style={{
        fontSize: '9px',
        color: 'rgba(255,255,255,0.3)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}>
        {Math.floor(partyXP)}/{xpThreshold}
      </span>
    </div>
  );
}