// [File: src/game/systems/RunModifiers.ts]
// [BLOCK: Run Modifiers — Phase 6 Chunk 6B]
// Holds run-scoped percentage values that don't fit the Stat + Modifier
// system because they apply to raw numeric fields rather than a Hero's own
// Stat:
//   - Skill cooldowns stay raw numbers on SkillConfig (per design decision —
//     see castle-party-phase6-plan.md discussion), so Focus's CDR can't
//     attach as a Stat Modifier the way Vitality/Sharpness/etc. do.
//   - SharedPool resource costs are computed values passed to
//     consumeExact(), not Stats either, so Clarity/Endurance need the same
//     kind of holder.
//
// Written to by Focus/Clarity/Endurance upgrade effects (upgrades.ts) and
// by Relentless's spell effect. Read by Hero.ts at skill-cooldown-reset and
// resource-cost-calculation time.
//
// Each upgrade field uses "set to tier value" semantics (not additive
// stacking) — mirrors how Stat.addModifier dedupes same-id modifiers.
// Picking Focus II after Focus I REPLACES the 10% reduction with 15%, it
// does not stack to 25%. This is enforced by upgrades.ts always calling the
// setter with the tier's absolute value, never an increment.
//
// Relentless is additive on top of Focus's CDR (it's a temporary spell
// buff layered over a permanent upgrade), capped so total reduction never
// reaches 100% (which would make cooldowns instant/free forever for the
// buff's duration — capped at 90% as a sane ceiling).

const MAX_COMBINED_CDR_PERCENT = 90;

export class RunModifiers {
  // [BLOCK: Upgrade-Sourced Percentages]
  static skillCooldownReductionPercent: number = 0;
  static manaCostReductionPercent: number = 0;
  static staminaCostReductionPercent: number = 0;

  // [BLOCK: Relentless Spell State — Phase 6 Chunk 6B]
  // While remainingSeconds > 0: all resource costs are zero and an extra
  // RELENTLESS_CDR percent is added on top of skillCooldownReductionPercent.
  static relentlessRemainingSeconds: number = 0;

  // [BLOCK: Tick]
  // Called once per frame by GameScene to count down Relentless's duration.
  static tick(deltaSeconds: number): void {
    if (RunModifiers.relentlessRemainingSeconds > 0) {
      RunModifiers.relentlessRemainingSeconds = Math.max(
        0,
        RunModifiers.relentlessRemainingSeconds - deltaSeconds
      );
    }
  }

  // [BLOCK: Activate Relentless]
  static activateRelentless(durationSeconds: number): void {
    RunModifiers.relentlessRemainingSeconds = durationSeconds;
  }

  // [BLOCK: Is Relentless Active]
  static get isRelentlessActive(): boolean {
    return RunModifiers.relentlessRemainingSeconds > 0;
  }

  // [BLOCK: Effective Cooldown Reduction Percent]
  // Combines the permanent Focus upgrade percentage with Relentless's
  // temporary bonus (if active), capped at MAX_COMBINED_CDR_PERCENT.
  static effectiveSkillCDRPercent(relentlessBonusPercent: number): number {
    const base = RunModifiers.skillCooldownReductionPercent;
    const bonus = RunModifiers.isRelentlessActive ? relentlessBonusPercent : 0;
    return Math.min(MAX_COMBINED_CDR_PERCENT, base + bonus);
  }

  // [BLOCK: Reset]
  // Called by GameScene.create() so a fresh run doesn't inherit a prior
  // run's upgrade percentages — this is a static/module-level holder, so
  // without an explicit reset it would persist across Phaser scene restarts
  // within the same browser session.
  static reset(): void {
    RunModifiers.skillCooldownReductionPercent = 0;
    RunModifiers.manaCostReductionPercent = 0;
    RunModifiers.staminaCostReductionPercent = 0;
    RunModifiers.relentlessRemainingSeconds = 0;
  }
}