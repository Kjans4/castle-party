'use client';

// [File: src/ui/menus/HeroSelect.tsx]
// [BLOCK: Hero Select Screen]
// All 3 heroes always selected in Phase 1.
// Confirm -> /game. Back -> /menu.
// Styles extracted to src/styles/HeroSelect.module.css — per-hero accent
// color passed through as a CSS custom property (--hero-color / --hero-rgb),
// selected state expressed via a data-selected attribute so CSS handles the
// branching that used to live in inline style ternaries.

import { useRouter } from 'next/navigation';
import { CSSProperties } from 'react';
import { HERO_ROSTER, type HeroConfig } from '@/game/config/heroes';
import { useGameStore } from '@/ui/store/gameStore';
import styles from '@/styles/HeroSelect.module.css';

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// [BLOCK: Hero Card Component]
function HeroCard({ hero, selected }: { hero: HeroConfig; selected: boolean }) {
  const cardStyle = {
    '--hero-color': hero.color,
    '--hero-rgb': hexToRgb(hero.color),
  } as CSSProperties;

  return (
    <div className={styles.card} style={cardStyle} data-selected={selected}>
      {/* Color swatch */}
      <div className={styles.swatchWrap}>
        <div className={styles.swatch} />
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.name}>{hero.name}</h3>
        <p className={styles.roles}>{hero.roles.join(' / ')}</p>
        <p className={styles.resource}>{hero.resource}</p>
      </div>

      <p className={styles.description}>{hero.description}</p>

      {/* Selected dot */}
      {selected && <div className={styles.selectedDot} />}
    </div>
  );
}

// [BLOCK: Hero Select Component]
export default function HeroSelect() {
  const router = useRouter();
  const setSquad = useGameStore((s) => s.setSquad);
  const selectedHeroes = HERO_ROSTER;

  function handleConfirm() {
    setSquad(selectedHeroes);
    router.push('/game');
  }

  return (
    <main className={styles.root}>
      {/* Background grid */}
      <div className={styles.grid} />

      {/* Header */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>Choose Your Squad</p>
        <h2 className={styles.heading}>3 Heroes</h2>
      </div>

      {/* Hero cards */}
      <div className={styles.cardRow}>
        {HERO_ROSTER.map((hero) => (
          <HeroCard
            key={hero.id}
            hero={hero}
            selected={selectedHeroes.some((h) => h.id === hero.id)}
          />
        ))}
      </div>

      {/* Count */}
      <p className={styles.count}>{selectedHeroes.length} / 3 selected</p>

      {/* Buttons */}
      <div className={styles.buttonRow}>
        <button className={styles.backButton} onClick={() => router.push('/menu')}>
          Back
        </button>

        <button className={styles.confirmButton} onClick={handleConfirm}>
          Confirm
        </button>
      </div>
    </main>
  );
}