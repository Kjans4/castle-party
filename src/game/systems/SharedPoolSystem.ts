// [File: src/game/systems/SharedPoolSystem.ts]
// [BLOCK: Shared Pool System — Phase 6 Chunk 6B]
// Full implementation, replacing the Phase 1 stub. Builds the two SharedPool
// instances (Mana, Stamina), registers each hero's individual ResourcePool
// as a contributor, computes the synergy bonus from squad composition once
// at run start, and ticks both pools each frame.
//
// Per SharedPool.ts's own doc comment and stats.md Section 7:
//   - 2 heroes sharing a resource type -> +15% regen bonus (SYNERGY_BONUS_2_USERS)
//   - 3 heroes sharing a resource type -> +25% regen bonus (SYNERGY_BONUS_3_USERS)
//   - 1 or 0 heroes of a type -> no bonus (no synergy to speak of)
//
// GameScene owns calling initialize() once after heroes are spawned, then
// calls update() once per frame and injects the resulting SharedPool
// references into each Hero via Hero.setSharedPools().

import { SharedPool } from '@/game/primitives/SharedPool';
import type { Hero } from '@/game/entities/Hero';
import { SYNERGY_BONUS_2_USERS, SYNERGY_BONUS_3_USERS } from '@/game/config/constants';

export class SharedPoolSystem {
  readonly manaPool: SharedPool = new SharedPool('mana');
  readonly staminaPool: SharedPool = new SharedPool('stamina');

  private initialized: boolean = false;

  // [BLOCK: Initialize]
  // Registers each hero's individual pool as a contributor, computes the
  // synergy bonus from squad composition, and injects the resulting shared
  // pools back into each hero so Hero.tryAttack()/tryActivateSkill() can
  // consume from them. Idempotent — clears contributors first so calling
  // this twice (e.g. on a hot-reload) doesn't double-register.
  initialize(heroes: Hero[]): void {
    this.manaPool.clearContributors();
    this.staminaPool.clearContributors();

    let manaUsers = 0;
    let staminaUsers = 0;

    heroes.forEach((hero) => {
      if (hero.manaPool) {
        this.manaPool.addContributor(hero.manaPool);
        manaUsers++;
      }
      if (hero.staminaPool) {
        this.staminaPool.addContributor(hero.staminaPool);
        staminaUsers++;
      }
    });

    this.manaPool.setSynergyBonus(this.synergyBonusFor(manaUsers));
    this.staminaPool.setSynergyBonus(this.synergyBonusFor(staminaUsers));

    heroes.forEach((hero) => {
      hero.setSharedPools(
        hero.manaPool ? this.manaPool : undefined,
        hero.staminaPool ? this.staminaPool : undefined,
      );
    });

    this.manaPool.set(100);
    this.staminaPool.set(100);

    this.initialized = true;
  }

  // [BLOCK: Synergy Bonus Lookup]
  private synergyBonusFor(userCount: number): number {
    if (userCount >= 3) return SYNERGY_BONUS_3_USERS;
    if (userCount === 2) return SYNERGY_BONUS_2_USERS;
    return 0;
  }

  // [BLOCK: Update]
  // Ticks regen on both shared pools. No-op until initialize() has run.
  update(deltaSeconds: number): void {
    if (!this.initialized) return;
    this.manaPool.tick(deltaSeconds);
    this.staminaPool.tick(deltaSeconds);
  }

  // [BLOCK: Reset]
  // Called on run reset — clears contributors and resets pools to full so a
  // fresh run doesn't inherit a prior run's depleted pools or stale synergy
  // bonus. GameScene must call initialize() again after respawning heroes.
  reset(): void {
    this.manaPool.clearContributors();
    this.staminaPool.clearContributors();
    this.manaPool.set(100);
    this.staminaPool.set(100);
    this.manaPool.setSynergyBonus(0);
    this.staminaPool.setSynergyBonus(0);
    this.initialized = false;
  }
}