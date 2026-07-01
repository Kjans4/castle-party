'use client';

// [File: src/ui/hud/SpellBar.tsx]
// [BLOCK: Spell Bar HUD — Phase 6 Chunk 6B]
// Bottom-right strip showing up to 3 held spell slots and a shared 5s
// cooldown bar beneath them. Greys out and refills as the shared cooldown
// (gameStore.spellCooldownRemaining, ticked by GameScene each frame) counts
// down. Z key casts the first held spell — this component is read-only
// display, it does not handle input itself (input lives in GameScene).
// Styles extracted to src/styles/SpellBar.module.css — cooldown state
// applied via a data-cooldown attribute; fill width via CSS custom property.

import { CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { SPELL_ROSTER, type SpellConfig } from '@/game/config/upgrades';
import { SPELL_SHARED_COOLDOWN, SPELL_SLOT_COUNT } from '@/game/config/constants';
import styles from '@/styles/SpellBar.module.css';

const spellById = new Map(SPELL_ROSTER.map((s) => [s.id, s]));

function SpellSlot({ spell, isOnCooldown }: { spell: SpellConfig | null; isOnCooldown: boolean }) {
  if (!spell) {
    return <div className={styles.emptySlot} />;
  }

  return (
    <div title={spell.name} className={styles.slot} data-cooldown={isOnCooldown}>
      <span className={styles.slotName}>{spell.name}</span>
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

  const fillStyle = { '--fill-width': `${cooldownPercent}%` } as CSSProperties;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Spells</span>
        <span className={styles.keyHint}>Z</span>
      </div>

      <div className={styles.slots}>
        {slots.map((spell, i) => (
          <SpellSlot key={i} spell={spell} isOnCooldown={isOnCooldown} />
        ))}
      </div>

      <div className={styles.cooldownTrack} data-cooldown={isOnCooldown}>
        <div className={styles.cooldownFill} style={fillStyle} />
      </div>
    </div>
  );
}