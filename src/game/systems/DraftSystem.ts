// [File: src/game/systems/DraftSystem.ts]
// [BLOCK: Draft System — Phase 6 Chunk 6A]
// Pure logic, no Phaser dependency — mirrors SpawnSystem/AggroSystem's
// pattern so it can be unit tested in isolation. GameScene calls
// generateDraft() on level-up and resolvePick()/resolveSkip() once the
// player (or draft timeout) resolves the overlay.
//
// Responsibilities (castle-party-phase6-plan.md Section 4):
//   - Track owned upgrades + skip counts for this run
//   - Build the eligible pool: owned-gated evolution tiers + all spells
//   - Draw DRAFT_CARD_COUNT cards weighted by rarity, with spells injected
//     at a flat independent rate
//   - Expire upgrades permanently after DRAFT_SKIP_EXPIRY skips (spells are
//     exempt from expiry)
//
// NOT this system's job: applying effect() (GameScene does that on pick,
// since effect() needs the live Hero[] array) or rendering the overlay
// (DraftOverlay.tsx).

import { UPGRADE_POOL, SPELL_ROSTER, type UpgradeConfig, type SpellConfig } from '@/game/config/upgrades';
import {
  DRAFT_CARD_COUNT,
  DRAFT_RARITY_COMMON,
  DRAFT_RARITY_RARE,
  DRAFT_RARITY_LEGENDARY,
  DRAFT_SPELL_RATE,
  DRAFT_SKIP_EXPIRY,
  DRAFT_LAST_CHANCE_THRESHOLD,
} from '@/game/config/constants';

// [BLOCK: Draft Card Type]
// Discriminated union so DraftOverlay can render upgrade cards and spell
// cards differently without a type guard against undefined fields.
export type DraftCard =
  | { kind: 'upgrade'; upgrade: UpgradeConfig; isLastChance: boolean }
  | { kind: 'spell'; spell: SpellConfig };

const RARITY_WEIGHTS: Record<UpgradeConfig['rarity'], number> = {
  common: DRAFT_RARITY_COMMON,
  rare: DRAFT_RARITY_RARE,
  legendary: DRAFT_RARITY_LEGENDARY,
};

// [BLOCK: DraftSystem Class]
export class DraftSystem {
  // [BLOCK: Run State]
  private ownedUpgradeIds: Set<string> = new Set();
  private skippedCounts: Map<string, number> = new Map();
  private expiredUpgradeIds: Set<string> = new Set();

  private upgradeById = new Map(UPGRADE_POOL.map((u) => [u.id, u]));

  // [BLOCK: Owned / Skip Accessors]
  // Exposed read-only so GameScene can sync into gameStore without this
  // system needing to know the store exists.
  get ownedUpgrades(): string[] {
    return [...this.ownedUpgradeIds];
  }

  getSkippedCounts(): Record<string, number> {
    return Object.fromEntries(this.skippedCounts.entries());
  }

  // [BLOCK: Is Eligible]
  // An upgrade is eligible to appear in a draft if:
  //   - it has not expired (3 skips)
  //   - it is not already owned (you don't redraft an owned card directly —
  //     evolution handles progression)
  //   - if it's a tier 2/3 card, its prerequisite (evolvesFrom) is owned
  //   - if it's tier 1, it has no prerequisite gating
  private isEligible(upgrade: UpgradeConfig): boolean {
    if (this.expiredUpgradeIds.has(upgrade.id)) return false;
    if (this.ownedUpgradeIds.has(upgrade.id)) return false;
    if (upgrade.tier === 1) return true;
    return upgrade.evolvesFrom ? this.ownedUpgradeIds.has(upgrade.evolvesFrom) : false;
  }

  // [BLOCK: Eligible Pool]
  private eligibleUpgrades(): UpgradeConfig[] {
    return UPGRADE_POOL.filter((u) => this.isEligible(u));
  }

  // [BLOCK: Generate Draft]
  // Draws DRAFT_CARD_COUNT cards. Each slot independently rolls "is this a
  // spell?" at DRAFT_SPELL_RATE first (spells are a flat-rate overlay, not
  // part of the rarity-weighted draw per Section 4), then falls back to a
  // rarity-weighted upgrade pick if not a spell or if the upgrade pool is
  // exhausted. Slots never duplicate the same upgrade id within one draft;
  // spells CAN repeat within a draft since they have no expiry/ownership
  // gate (matches "Spells are exempt from expiry" / unlimited reappearance).
  generateDraft(): DraftCard[] {
    const cards: DraftCard[] = [];
    const usedUpgradeIds = new Set<string>();

    for (let i = 0; i < DRAFT_CARD_COUNT; i++) {
      const wantsSpell = Math.random() < DRAFT_SPELL_RATE;

      if (wantsSpell) {
        cards.push({ kind: 'spell', spell: this.rollSpell() });
        continue;
      }

      const upgrade = this.rollWeightedUpgrade(usedUpgradeIds);
      if (upgrade) {
        usedUpgradeIds.add(upgrade.id);
        cards.push({
          kind: 'upgrade',
          upgrade,
          isLastChance: (this.skippedCounts.get(upgrade.id) ?? 0) === DRAFT_LAST_CHANCE_THRESHOLD,
        });
      } else {
        // Upgrade pool exhausted for this slot — fall back to a spell so
        // the draft always shows DRAFT_CARD_COUNT cards.
        cards.push({ kind: 'spell', spell: this.rollSpell() });
      }
    }

    return cards;
  }

  // [BLOCK: Roll Spell]
  // Flat uniform pick across the full spell roster — no rarity weighting.
  private rollSpell(): SpellConfig {
    return SPELL_ROSTER[Math.floor(Math.random() * SPELL_ROSTER.length)];
  }

  // [BLOCK: Roll Weighted Upgrade]
  // Two-stage: first weight-pick a rarity tier, then uniform-pick an
  // eligible, not-yet-used-this-draft upgrade within that rarity. Falls
  // back to any other eligible upgrade if the chosen rarity has none left,
  // so a thin pool doesn't return null prematurely.
  private rollWeightedUpgrade(usedIds: Set<string>): UpgradeConfig | null {
    const eligible = this.eligibleUpgrades().filter((u) => !usedIds.has(u.id));
    if (eligible.length === 0) return null;

    const rarity = this.rollRarity();
    const ofRarity = eligible.filter((u) => u.rarity === rarity);
    const pool = ofRarity.length > 0 ? ofRarity : eligible;

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // [BLOCK: Roll Rarity]
  private rollRarity(): UpgradeConfig['rarity'] {
    const total = RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.legendary;
    const roll = Math.random() * total;

    let cumulative = 0;
    cumulative += RARITY_WEIGHTS.common;
    if (roll < cumulative) return 'common';
    cumulative += RARITY_WEIGHTS.rare;
    if (roll < cumulative) return 'rare';
    return 'legendary';
  }

  // [BLOCK: Resolve Pick]
  // Marks the upgrade as owned (spells are never "owned" in this system —
  // GameScene manages activeSpells/discard separately in the store). Returns
  // the upgrade's effect function for GameScene to invoke against the live
  // Hero[] roster, since this system has no Phaser/entity access.
  resolvePick(card: DraftCard): UpgradeConfig | null {
    if (card.kind === 'spell') return null;

    this.ownedUpgradeIds.add(card.upgrade.id);
    return card.upgrade;
  }

  // [BLOCK: Resolve Skip]
  // Called once per non-picked card shown in a draft (per Section 4: "Each
  // card that is NOT picked increments its skippedCount"). Spells are
  // exempt — their skip count is never tracked since they have no expiry.
  resolveSkip(card: DraftCard): void {
    if (card.kind === 'spell') return;

    const id = card.upgrade.id;
    const next = (this.skippedCounts.get(id) ?? 0) + 1;
    this.skippedCounts.set(id, next);

    if (next >= DRAFT_SKIP_EXPIRY) {
      this.expiredUpgradeIds.add(id);
    }
  }

  // [BLOCK: Resolve Full Draft Resolution]
  // Convenience wrapper for GameScene: given the full card list and which
  // one was picked, applies resolvePick to the pick and resolveSkip to
  // every other card shown. Returns the picked upgrade (or null if a spell
  // was picked) for GameScene to apply effect() against.
  resolveDraft(cards: DraftCard[], pickedIndex: number): UpgradeConfig | null {
    let pickedUpgrade: UpgradeConfig | null = null;

    cards.forEach((card, i) => {
      if (i === pickedIndex) {
        pickedUpgrade = this.resolvePick(card);
      } else {
        this.resolveSkip(card);
      }
    });

    return pickedUpgrade;
  }

  // [BLOCK: Reset]
  // Called on run reset so a fresh run doesn't inherit prior ownership/skip
  // state — mirrors SpawnSystem.reset()'s pattern.
  reset(): void {
    this.ownedUpgradeIds.clear();
    this.skippedCounts.clear();
    this.expiredUpgradeIds.clear();
  }
}