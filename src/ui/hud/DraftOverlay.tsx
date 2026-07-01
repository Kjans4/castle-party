'use client';

// [File: src/ui/hud/DraftOverlay.tsx]
// [BLOCK: Draft Overlay HUD — Phase 6 Chunk 6A]
// Renders the 5-card draft shown on every party level-up. Does NOT pause the
// Phaser world — per castle-party-phase6-plan.md Section 4 ("the run does
// not pause enemy spawning during selection"), this is purely a visual
// overlay on top of a still-running GameScene. pointerEvents is scoped to
// just this component's root so the rest of the HUD (and the game canvas
// underneath) stays interactive.
//
// Reads isDraftPending + draftCards from the store. Clicking a card calls
// useGameStore.getState().submitDraftPick(index) directly — there is no
// React reference to the live GameScene instance (and no existing
// precedent in this codebase for threading one through page.tsx), so this
// mirrors the store's existing one-shot-flag pattern in reverse:
// GameScene.update() polls pendingDraftPickIndex each frame via
// consumeDraftPick() and resolves it there, exactly like HeroPortraits
// reads heroDeathFlashIds in the other direction.
//
// Styles extracted to src/styles/DraftOverlay.module.css — rarity/spell
// color+glow passed through as CSS custom properties (genuinely per-card
// data), hover lift moved to CSS :hover (was inline onMouseEnter/Leave),
// card kind and last-chance flag exposed via data attributes.

import { CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import type { DraftCard } from '@/game/systems/DraftSystem';
import type { UpgradeRarity } from '@/game/config/upgrades';
import styles from '@/styles/DraftOverlay.module.css';

const RARITY_COLOR: Record<UpgradeRarity, string> = {
  common: '#9ca3af',
  rare: '#4a9eff',
  legendary: '#ffaa33',
};

const RARITY_GLOW: Record<UpgradeRarity, string> = {
  common: 'none',
  rare: '0 0 14px rgba(74,158,255,0.35)',
  legendary: '0 0 18px rgba(255,170,51,0.45)',
};

const SPELL_COLOR = '#c44aff';
const SPELL_GLOW = '0 0 14px rgba(196,74,255,0.35)';

// [BLOCK: Single Card]
function DraftCardView({ card, onClick }: { card: DraftCard; onClick: () => void }) {
  if (card.kind === 'spell') {
    const cardStyle = {
      '--card-color': SPELL_COLOR,
      '--card-glow': SPELL_GLOW,
      '--card-bg': 'rgba(196,74,255,0.07)',
    } as CSSProperties;

    return (
      <div onClick={onClick} className={styles.card} style={cardStyle} data-kind="spell">
        <span className={styles.tag}>Spell</span>
        <span className={styles.title}>{card.spell.name}</span>
        <span className={styles.description}>{card.spell.description}</span>
        <span className={styles.footer}>{card.spell.subType}</span>
      </div>
    );
  }

  const cardStyle = {
    '--card-color': RARITY_COLOR[card.upgrade.rarity],
    '--card-glow': RARITY_GLOW[card.upgrade.rarity],
    '--card-bg': 'rgba(255,255,255,0.03)',
  } as CSSProperties;

  return (
    <div
      onClick={onClick}
      className={styles.card}
      style={cardStyle}
      data-kind="upgrade"
      data-last-chance={card.isLastChance}
    >
      {card.isLastChance && <div className={styles.lastChanceBadge}>Last Chance</div>}

      <span className={styles.tag}>
        {card.upgrade.rarity} · Tier {card.upgrade.tier}
      </span>
      <span className={styles.title}>{card.upgrade.name}</span>
      <span className={styles.description}>{card.upgrade.description}</span>
      <span className={styles.footer}>{card.upgrade.category}</span>
    </div>
  );
}

// [BLOCK: Draft Overlay Component]
export default function DraftOverlay() {
  const isDraftPending = useGameStore((s) => s.isDraftPending);
  const draftCards = useGameStore((s) => s.draftCards);
  const submitDraftPick = useGameStore((s) => s.submitDraftPick);

  if (!isDraftPending || draftCards.length === 0) return null;

  return (
    <div className={styles.overlay}>
      <p className={styles.heading}>Level Up — Choose One</p>

      <div className={styles.cardRow}>
        {draftCards.map((card, i) => (
          <DraftCardView key={i} card={card} onClick={() => submitDraftPick(i)} />
        ))}
      </div>
    </div>
  );
}