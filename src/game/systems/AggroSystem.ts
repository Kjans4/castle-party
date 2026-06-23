// [File: src/game/systems/AggroSystem.ts]
// [BLOCK: Aggro System — Phase 3]
// Stateless: reads each enemy's own persisted aggroState/aggroTarget fields,
// computes the "return to beacon" transition when the aggroed hero has moved
// out of range, and returns assignments for GameScene to apply.
//
// The "switch to hero on hit" reaction is NOT handled here — it's an
// immediate event reaction, already implemented in Enemy.takeDamage's
// override (Chunk A). This system only resolves the per-frame range check.

import type { Enemy, AggroState } from '@/game/entities/Enemy';
import type { Hero } from '@/game/entities/Hero';
import { ENEMY_AGGRO_RANGE } from '@/game/config/constants';
import { distance } from '@/game/utils/MathUtils';

export interface AggroAssignment {
  enemy: Enemy;
  aggroState: AggroState;
  aggroTarget: Hero | null;
}

// [BLOCK: AggroSystem Class]
export class AggroSystem {
  // [BLOCK: Update]
  // Pure — does not mutate the enemies. GameScene applies the returned
  // assignments to each enemy's aggroState/aggroTarget fields.
  update(enemies: Enemy[]): AggroAssignment[] {
    return enemies.map((enemy) => this.resolve(enemy));
  }

  // [BLOCK: Resolve Single Enemy]
  private resolve(enemy: Enemy): AggroAssignment {
    if (enemy.aggroState === 'hero' && enemy.aggroTarget) {
      const d = distance(enemy.x, enemy.y, enemy.aggroTarget.x, enemy.aggroTarget.y);

      if (d > ENEMY_AGGRO_RANGE) {
        return { enemy, aggroState: 'beacon', aggroTarget: null };
      }

      return { enemy, aggroState: 'hero', aggroTarget: enemy.aggroTarget };
    }

    // Already in 'beacon' state (or 'hero' state with a null target,
    // which shouldn't happen but falls back safely) — no change needed.
    return { enemy, aggroState: 'beacon', aggroTarget: null };
  }
}