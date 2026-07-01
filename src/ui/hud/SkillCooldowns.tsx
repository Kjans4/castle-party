'use client';

// [File: src/ui/hud/SkillCooldowns.tsx]
// [BLOCK: Skill Cooldowns HUD — Phase 6 Chunk 6B]
// Shows the active leader's Q and E skill names + cooldown progress beneath
// the hero portraits. Reads skillCooldowns (synced each frame by GameScene's
// syncSkillCooldowns()) and activeLeaderIndex/squad to resolve skill names.
// Greyed out while on cooldown, lit when ready — per
// castle-party-phase6-plan.md Section 7's "Skill Cooldown HUD" spec.
// Styles extracted to src/styles/SkillCooldowns.module.css — ready/cooldown
// variants applied via a data-ready attribute rather than inline branching.

import { CSSProperties } from 'react';
import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';
import styles from '@/styles/SkillCooldowns.module.css';

function SkillBox({
  label,
  name,
  remaining,
  max,
}: {
  label: 'Q' | 'E';
  name: string;
  remaining: number;
  max: number;
}) {
  const isReady = remaining <= 0;
  const fillPercent = max > 0 ? Math.max(0, Math.min(100, (1 - remaining / max) * 100)) : 100;
  const fillStyle = { '--fill-width': `${fillPercent}%` } as CSSProperties;

  return (
    <div className={styles.box} data-ready={isReady}>
      <span className={styles.key}>{label}</span>

      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <div className={styles.track}>
          <div className={styles.fill} style={fillStyle} />
        </div>
      </div>

      {!isReady && <span className={styles.time}>{remaining.toFixed(1)}s</span>}
    </div>
  );
}

export default function SkillCooldowns() {
  const activeLeaderIndex = useGameStore((s) => s.activeLeaderIndex);
  const cooldowns = useGameStore((s) => s.skillCooldowns);

  const leaderConfig = HERO_ROSTER[activeLeaderIndex];
  if (!leaderConfig) return null;

  const [qSkill, eSkill] = leaderConfig.skills;

  return (
    <div className={styles.container}>
      <SkillBox label="Q" name={qSkill.name} remaining={cooldowns.qRemaining} max={cooldowns.qMax} />
      <SkillBox label="E" name={eSkill.name} remaining={cooldowns.eRemaining} max={cooldowns.eMax} />
    </div>
  );
}