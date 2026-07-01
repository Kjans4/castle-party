// [File: src/game/systems/RespawnSystem.ts]
// [BLOCK: Respawn System — Phase 6 Chunk 6C]
// Full implementation, replacing the Phase 1 stub. Pure logic, no Phaser
// dependency — mirrors SpawnSystem/AggroSystem/DraftSystem's pattern.
//
// Per castle-party-phase6-plan.md Section 9: "The timer is the same for all
// dead heroes in that category — if 2 are dead, both respawn simultaneously
// at 30 seconds." This system tracks a SINGLE shared countdown (not one per
// hero) that represents "time until all currently-dead heroes respawn
// together." Whenever the dead count changes — a new hero dies, escalating
// 1->2 or 2->3 — the countdown is fully RESET to the new category's timer
// value, not continued. This is the only reading of "both respawn
// simultaneously" that's internally consistent: per-hero independent timers
// would have heroes respawning at staggered times within the same dead
// count, which the plan's wording rules out.
//
// GameScene owns:
//   - Counting how many heroes are currently dead each frame (heroes.filter)
//   - Calling update(deltaSeconds, deadCount) once per frame
//   - When update() returns true, finding the nearest LIT beacon to each
//     still-dead hero's position and calling Hero.respawnAt() — this system
//     has no beacon or Hero references, by design (keeps it Phaser-free).

import { RESPAWN_1_DEAD, RESPAWN_2_DEAD, RESPAWN_3_DEAD } from '@/game/config/constants';

export class RespawnSystem {
  private remainingSeconds: number = 0;
  private lastDeadCount: number = 0;

  // [BLOCK: Remaining Seconds Accessor]
  // Read by GameScene each frame to sync into the store for HUD display
  // (dead-hero portrait countdown + team-wipe overlay countdown both read
  // this same value, per the plan's "timer is the same for all dead heroes
  // in that category").
  get currentRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  // [BLOCK: Timer For Count]
  private timerForCount(deadCount: number): number {
    if (deadCount >= 3) return RESPAWN_3_DEAD;
    if (deadCount === 2) return RESPAWN_2_DEAD;
    if (deadCount === 1) return RESPAWN_1_DEAD;
    return 0;
  }

  // [BLOCK: Update]
  // deadCount: how many heroes are currently dead, computed by GameScene
  // each frame from the live Hero[] roster (this system holds no hero
  // references of its own).
  //
  // Returns true exactly on the frame the countdown reaches zero — GameScene
  // should respawn ALL currently-dead heroes that same frame. Returns false
  // every other frame, including the frame a new death changes the count
  // (the countdown resets but does not fire that same frame).
  update(deltaSeconds: number, deadCount: number): boolean {
    if (deadCount === 0) {
      this.remainingSeconds = 0;
      this.lastDeadCount = 0;
      return false;
    }

    if (deadCount !== this.lastDeadCount) {
      // Dead count just changed (escalated, most likely) — reset the shared
      // countdown to the new category's full timer. Does not fire this frame.
      this.lastDeadCount = deadCount;
      this.remainingSeconds = this.timerForCount(deadCount);
      return false;
    }

    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);

    if (this.remainingSeconds <= 0) {
      // Fires once — reset lastDeadCount to 0 so that if GameScene fails to
      // actually revive everyone this frame (e.g. no lit beacon -> defeat
      // path taken instead), the next frame's still-nonzero deadCount is
      // treated as a fresh escalation rather than re-firing every frame.
      this.lastDeadCount = 0;
      return true;
    }

    return false;
  }

  // [BLOCK: Reset]
  // Called on run reset — mirrors SpawnSystem.reset()'s pattern.
  reset(): void {
    this.remainingSeconds = 0;
    this.lastDeadCount = 0;
  }
}