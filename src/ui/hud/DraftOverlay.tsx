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

import { useGameStore } from '@/ui/store/gameStore';
import type { DraftCard } from '@/game/systems/DraftSystem';
import type { UpgradeRarity } from '@/game/config/upgrades';

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
    return (
      <div
        onClick={onClick}
        style={{
          width: '160px',
          minHeight: '210px',
          padding: '16px 14px',
          border: `1px solid ${SPELL_COLOR}`,
          backgroundColor: 'rgba(196,74,255,0.07)',
          boxShadow: SPELL_GLOW,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          cursor: 'pointer',
          transition: 'transform 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
      >
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: SPELL_COLOR,
        }}>
          Spell
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#ffffff',
        }}>
          {card.spell.name}
        </span>
        <span style={{
          fontSize: '11px',
          lineHeight: 1.5,
          color: 'rgba(255,255,255,0.5)',
          flex: 1,
        }}>
          {card.spell.description}
        </span>
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.25)',
        }}>
          {card.spell.subType}
        </span>
      </div>
    );
  }

  const color = RARITY_COLOR[card.upgrade.rarity];
  const glow = RARITY_GLOW[card.upgrade.rarity];

  return (
    <div
      onClick={onClick}
      style={{
        width: '160px',
        minHeight: '210px',
        padding: '16px 14px',
        border: `1px solid ${color}`,
        backgroundColor: 'rgba(255,255,255,0.03)',
        boxShadow: glow,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.12s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
    >
      {card.isLastChance && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          fontSize: '8px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#ff4444',
          backgroundColor: '#0a0a0f',
          border: '1px solid #ff4444',
          padding: '2px 5px',
        }}>
          Last Chance
        </div>
      )}

      <span style={{
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color,
      }}>
        {card.upgrade.rarity} · Tier {card.upgrade.tier}
      </span>
      <span style={{
        fontSize: '14px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#ffffff',
      }}>
        {card.upgrade.name}
      </span>
      <span style={{
        fontSize: '11px',
        lineHeight: 1.5,
        color: 'rgba(255,255,255,0.5)',
        flex: 1,
      }}>
        {card.upgrade.description}
      </span>
      <span style={{
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.25)',
      }}>
        {card.upgrade.category}
      </span>
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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 20,
      pointerEvents: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      backgroundColor: 'rgba(0,0,0,0.55)',
      fontFamily: 'sans-serif',
    }}>
      <p style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.3em',
        color: 'rgba(255,255,255,0.5)',
        margin: 0,
      }}>
        Level Up — Choose One
      </p>

      <div style={{ display: 'flex', gap: '14px' }}>
        {draftCards.map((card, i) => (
          <DraftCardView key={i} card={card} onClick={() => submitDraftPick(i)} />
        ))}
      </div>
    </div>
  );
}