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
//
// Styles extracted to src/styles/HeroPortraits.module.css. State (dead /
// flashing / active) is expressed via data attributes so CSS handles the
// branching that used to live in inline style ternaries; per-hero color is
// passed through as CSS custom properties (--hero-color / --hero-rgb) since
// that value is genuinely per-instance data, not a static style.

import { useEffect, useRef, useState, CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER, type HeroConfig } from '@/game/config/heroes';
import styles from '@/styles/HeroPortraits.module.css';

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
  const rgb = hexToRgb(hero.color);

  const handleClick = () => {
    if (isDead) return;
    onClick();
  };

  const cardStyle = {
    '--hero-color': hero.color,
    '--hero-rgb': rgb,
  } as CSSProperties;

  const hpFillStyle = {
    '--hp-width': `${isDead ? 0 : hpPercent}%`,
    '--hp-color': isDead ? '#ff4444' : hpBarColor(hpPercent),
  } as CSSProperties;

  return (
    <div className={styles.cardWrapper}>
      <div
        onClick={handleClick}
        className={styles.card}
        style={cardStyle}
        data-dead={isDead}
        data-flashing={isFlashing}
        data-active={isActive}
      >
        <div className={styles.swatch} />

        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{hero.name}</span>
            <span className={styles.indexBadge}>{index + 1}</span>
          </div>

          {isDead ? (
            <div className={styles.deadState}>
              <span className={styles.deadLabel}>Dead</span>
              {respawnTimer > 0 && (
                <span className={styles.respawnTimer}>{formatCountdown(respawnTimer)}</span>
              )}
            </div>
          ) : (
            <span className={styles.role}>{hero.roles[0]}</span>
          )}
        </div>

        {isActive && !isDead && <div className={styles.activeDot} />}
      </div>

      {/* HP Bar — dimmed red when dead */}
      <div className={styles.hpTrack}>
        <div className={styles.hpFill} style={hpFillStyle} data-dead={isDead} />
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
    <div className={styles.list}>
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