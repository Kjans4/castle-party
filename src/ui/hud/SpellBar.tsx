'use client';

// [File: src/ui/hud/SpellBar.tsx]
// [BLOCK: Spell Bar HUD — Phase 6 Chunk 6B]
// Bottom-right strip showing up to 3 held spell slots and a shared 5s
// cooldown bar beneath them. Greys out and refills as the shared cooldown
// (gameStore.spellCooldownRemaining, ticked by GameScene each frame) counts
// down. Z key casts the first held spell — this component is read-only
// display, it does not handle input itself (input lives in GameScene).

import { useGameStore } from '@/ui/store/gameStore';
import { SPELL_ROSTER, type SpellConfig } from '@/game/config/upgrades';
import { SPELL_SHARED_COOLDOWN, SPELL_SLOT_COUNT } from '@/game/config/constants';

const spellById = new Map(SPELL_ROSTER.map((s) => [s.id, s]));

function SpellSlot({ spell, isOnCooldown }: { spell: SpellConfig | null; isOnCooldown: boolean }) {
  if (!spell) {
    return (
      <div style={{
        width: '52px',
        height: '52px',
        border: '1px dashed rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
      }} />
    );
  }

  return (
    <div
      title={spell.name}
      style={{
        width: '52px',
        height: '52px',
        border: `1px solid ${isOnCooldown ? 'rgba(196,74,255,0.25)' : 'rgba(196,74,255,0.7)'}`,
        backgroundColor: isOnCooldown ? 'rgba(196,74,255,0.04)' : 'rgba(196,74,255,0.12)',
        opacity: isOnCooldown ? 0.45 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        transition: 'opacity 0.2s',
      }}
    >
      <span style={{
        fontSize: '8px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#c44aff',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {spell.name}
      </span>
    </div>
  );
}

export default function SpellBar() {
  const activeSpells = useGameStore((s) => s.activeSpells);
  const cooldownRemaining = useGameStore((s) => s.spellCooldownRemaining);

  const isOnCooldown = cooldownRemaining > 0;
  const cooldownPercent = Math.max(0, Math.min(100, (1 - cooldownRemaining / SPELL_SHARED_COOLDOWN) * 100));

  const slots: (SpellConfig | null)[] = Array.from({ length: SPELL_SLOT_COUNT }, (_, i) =>
    activeSpells[i] ? spellById.get(activeSpells[i]) ?? null : null
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: '10px 12px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.35)',
        }}>
          Spells
        </span>
        <span style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.25)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          Z
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {slots.map((spell, i) => (
          <SpellSlot key={i} spell={spell} isOnCooldown={isOnCooldown} />
        ))}
      </div>

      {/* Shared cooldown bar */}
      <div style={{
        width: '100%',
        height: '4px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${cooldownPercent}%`,
          backgroundColor: '#c44aff',
          boxShadow: isOnCooldown ? 'none' : '0 0 6px rgba(196,74,255,0.6)',
          transition: 'width 0.1s',
        }} />
      </div>
    </div>
  );
}