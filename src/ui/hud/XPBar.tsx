'use client';

// [File: src/ui/hud/XPBar.tsx]
// [BLOCK: XP Bar HUD]
// Thin progress bar toward the next party level, with the level number and a
// brief flash pulse keyed off levelUpFlashId whenever a level-up happens.
// Styles extracted to src/styles/XPBar.module.css — flash state applied via
// a data-flashing attribute; fill width via CSS custom property.

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import styles from '@/styles/XPBar.module.css';

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
  const fillStyle = { '--fill-width': `${percent}%` } as CSSProperties;

  return (
    <div className={styles.container} data-flashing={isFlashing}>
      <span className={styles.level}>LV {partyLevel}</span>

      <div className={styles.track}>
        <div className={styles.fill} style={fillStyle} />
      </div>

      <span className={styles.count}>{Math.floor(partyXP)}/{xpThreshold}</span>
    </div>
  );
}