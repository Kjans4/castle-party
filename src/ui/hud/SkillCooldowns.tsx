'use client';

// [File: src/ui/hud/SkillCooldowns.tsx]
// [BLOCK: Skill Cooldowns HUD — Phase 6 Chunk 6B]
// Shows the active leader's Q and E skill names + cooldown progress beneath
// the hero portraits. Reads skillCooldowns (synced each frame by GameScene's
// syncSkillCooldowns()) and activeLeaderIndex/squad to resolve skill names.
// Greyed out while on cooldown, lit when ready — per
// castle-party-phase6-plan.md Section 7's "Skill Cooldown HUD" spec.

import { useGameStore } from '@/ui/store/gameStore';
import { HERO_ROSTER } from '@/game/config/heroes';

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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      border: `1px solid ${isReady ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
      backgroundColor: isReady ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.4)',
      opacity: isReady ? 1 : 0.6,
      transition: 'opacity 0.2s',
      minWidth: '130px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: isReady ? '#ffffff' : 'rgba(255,255,255,0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {label}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
        <span style={{
          fontSize: '9px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: isReady ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
        }}>
          {name}
        </span>
        <div style={{
          width: '100%',
          height: '3px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${fillPercent}%`,
            backgroundColor: isReady ? '#4a9eff' : 'rgba(74,158,255,0.4)',
            transition: 'width 0.1s',
          }} />
        </div>
      </div>

      {!isReady && (
        <span style={{
          fontSize: '9px',
          fontVariantNumeric: 'tabular-nums',
          color: 'rgba(255,255,255,0.35)',
          flexShrink: 0,
        }}>
          {remaining.toFixed(1)}s
        </span>
      )}
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
    <div style={{ display: 'flex', gap: '6px' }}>
      <SkillBox label="Q" name={qSkill.name} remaining={cooldowns.qRemaining} max={cooldowns.qMax} />
      <SkillBox label="E" name={eSkill.name} remaining={cooldowns.eRemaining} max={cooldowns.eMax} />
    </div>
  );
}