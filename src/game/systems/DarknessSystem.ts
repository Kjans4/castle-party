// [File: src/game/systems/DarknessSystem.ts]
// [BLOCK: Darkness System — Live]
// Calculates the current darkness level and lerped overlay alpha from the
// number of beacons currently lit. Pure math — no Phaser dependency — so
// GameScene owns the actual Rectangle and just reads currentAlpha/level here.
//
// See castle-party-phase2-plan.md "Darkness System — Live" for the level table.

import {
  DARKNESS_OVERLAY_ALPHA,
  DARKNESS_LERP_SPEED,
  BEACON_COUNT,
} from '@/game/config/constants';
import { clamp, lerp } from '@/game/utils/MathUtils';

export interface DarknessState {
  level: number;   // 1-7 (7 = darkest still-alive state)
  alpha: number;   // current lerped overlay alpha, 0-1
}

// [BLOCK: DarknessSystem Class]
export class DarknessSystem {
  private currentAlpha: number = 0;
  private currentLevel: number = 1;

  // [BLOCK: Update]
  // litCount: how many of the BEACON_COUNT beacons are currently lit.
  // Returns the live level + smoothly lerped alpha for this frame.
  update(litCount: number, deltaSeconds: number): DarknessState {
    const clampedLitCount = clamp(litCount, 0, BEACON_COUNT);

    const targetAlpha = DARKNESS_OVERLAY_ALPHA[clampedLitCount];
    this.currentAlpha = lerp(this.currentAlpha, targetAlpha, DARKNESS_LERP_SPEED * deltaSeconds);

    // Level table: 7 beacons lit = level 1 (brightest), 1 beacon lit = level 7 (darkest).
    // 0 beacons lit is a loss state — clamp level at 7 since GameStore expects 1-7.
    this.currentLevel = clampedLitCount <= 0 ? 7 : BEACON_COUNT + 1 - clampedLitCount;

    return { level: this.currentLevel, alpha: this.currentAlpha };
  }

  // [BLOCK: Snapshot]
  // Read current state without advancing the lerp — useful for initial render.
  get state(): DarknessState {
    return { level: this.currentLevel, alpha: this.currentAlpha };
  }

  // [BLOCK: Reset]
  // Called on run reset so a new run starts fully lit/bright.
  reset(): void {
    this.currentAlpha = 0;
    this.currentLevel = 1;
  }
}