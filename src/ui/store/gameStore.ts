// [File: src/ui/store/gameStore.ts]
// [BLOCK: Store Overview]
// Zustand store — the shared state bridge between Phaser and React.
//
// Phaser writes to this store each game tick (timer, hero switches, beacon states,
// run result). React reads from this store to render the HUD overlay and to
// navigate to /results when a run ends.
//
// They never talk to each other directly — only through this store.
// See phase-1-plan.md "How Phaser + Next.js Connect" for architecture diagram.
//
// Phase 4 Chunk C adds heroHpPercents + heroDeathFlashIds, mirroring the
// existing levelUpFlashId pattern: an incrementing per-hero counter the HUD
// watches to trigger a one-shot flash, rather than a boolean GameScene would
// have to remember to clear.
//
// Phase 6 Chunk 6A adds draft state: isDraftPending, draftCards,
// ownedUpgrades, skippedCounts, activeSpells. GameScene's DraftSystem is the
// source of truth for eligibility/skip-tracking logic — this store just
// mirrors DraftSystem's state each time it changes so DraftOverlay.tsx can
// render without reaching into Phaser. The "the run does not pause enemy
// spawning during selection" rule (castle-party-phase6-plan.md Section 4) is
// satisfied simply by isDraftPending NOT being read anywhere in GameScene's
// update() loop — it's purely a HUD-overlay-visibility flag.

import { create } from 'zustand';
import type { HeroConfig } from '@/game/config/heroes';
import { HERO_ROSTER } from '@/game/config/heroes';
import { RUN_DURATION_SECONDS, BEACON_COUNT, XP_THRESHOLDS, SPELL_SHARED_COOLDOWN } from '@/game/config/constants';
import type { DraftCard } from '@/game/systems/DraftSystem';

// [BLOCK: XP Threshold Helper]
// currentLevel is the level the party is AT (about to level up to currentLevel+1).
// Levels 1-4 read the explicit table; level 5+ adds 100 per level beyond it,
// per castle-party-phase3-plan.md Section 9 "Party Level & XP Threshold".
function getXPThresholdForLevel(currentLevel: number): number {
  const idx = currentLevel - 1;
  if (idx < XP_THRESHOLDS.length) return XP_THRESHOLDS[idx];
  const extraLevels = idx - (XP_THRESHOLDS.length - 1);
  return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + 100 * extraLevels;
}

// [BLOCK: Beacon State Type]
export interface BeaconState {
  id: string;
  name: string;
  isLit: boolean;
  fireMeter: number;   // 0–100 percent of max fire meter HP
}

// [BLOCK: Run Result Type]
// null while the run is in progress. Set once by GameScene right before the
// run ends — PostRun.tsx reads this instead of hardcoding "Victory".
export type RunResult = 'victory' | 'defeat' | null;

// [BLOCK: Default Hero Arrays]
// Sized off HERO_ROSTER so they stay correct if the active roster changes.
const DEFAULT_HERO_HP_PERCENTS = HERO_ROSTER.map(() => 100);
const DEFAULT_HERO_DEATH_FLASH_IDS = HERO_ROSTER.map(() => 0);

// [BLOCK: Store Shape]
interface GameStore {
  // Squad
  squad: HeroConfig[];
  activeLeaderIndex: number;   // 0, 1, or 2

  // Run state
  runTimer: number;            // seconds remaining, counts down from RUN_DURATION_SECONDS
  isRunActive: boolean;
  runResult: RunResult;        // set once when the run ends, read by /results

  // HUD state — live in Phase 2, driven by GameScene + DarknessSystem
  beaconStates: BeaconState[];
  darknessLevel: number;       // 1–7, live starting Phase 2

  // Mana and Stamina pool percentages for HUD bars
  manaPercent: number;         // 0–100
  staminaPercent: number;      // 0–100

  // XP & Leveling (Phase 3)
  partyXP: number;             // progress within the current level
  partyLevel: number;          // starts at 1
  xpThreshold: number;         // XP needed to reach the next level
  levelUpFlashId: number;      // increments on every level-up — HUD watches this to trigger a one-shot flash

  // Hero HP (Phase 4 Chunk C) — indexed to match HERO_ROSTER order
  heroHpPercents: number[];      // 0–100 per hero, drives portrait HP bars
  heroDeathFlashIds: number[];   // increments per hero on each death — HUD watches per-index to trigger that portrait's flash

  // [BLOCK: Card Draft State — Phase 6 Chunk 6A]
  isDraftPending: boolean;        // true = show draft overlay (does NOT pause GameScene's update loop)
  draftCards: DraftCard[];        // current draft's cards — empty array when no draft is showing
  ownedUpgrades: string[];        // ids of owned upgrades this run — mirrors DraftSystem.ownedUpgrades
  skippedCounts: Record<string, number>; // skip count per upgrade id — mirrors DraftSystem.getSkippedCounts()
  activeSpells: string[];         // up to 3 spell ids held this run — capacity/discard UI is Chunk 6B scope;
                                   // Chunk 6A just appends (capped at 3) and silently drops a 4th pick rather
                                   // than implementing the discard-selection prompt described in Section 6,
                                   // since spell casting itself doesn't exist yet either.

  // [BLOCK: Draft Pick Signal — Phase 6 Chunk 6A]
  // React has no direct reference to the live GameScene instance, and there
  // is no existing precedent in this codebase for React calling INTO
  // Phaser (only the reverse). Rather than thread a Phaser scene reference
  // through page.tsx, this mirrors the existing one-shot-flag pattern
  // already used for heroDeathFlashIds/consumeDiedFlag: React sets a
  // pending value, GameScene.update() polls it once per frame and clears it
  // after resolving — same shape, opposite direction.
  pendingDraftPickIndex: number | null;

  // [BLOCK: Spell Cooldown — Phase 6 Chunk 6B]
  spellCooldownRemaining: number;  // 0–SPELL_SHARED_COOLDOWN seconds, shared across all 3 slots

  // [BLOCK: Skill Cooldowns — Phase 6 Chunk 6B]
  // Active leader's Q/E cooldown state, synced each frame by GameScene for
  // SkillCooldowns.tsx. Not indexed per-hero like heroHpPercents — only the
  // current leader's skills are ever shown, since companions don't use
  // skills (by design, per castle-party-phase6-plan.md Section 7).
  skillCooldowns: { qRemaining: number; qMax: number; eRemaining: number; eMax: number };

  // Actions
  setSquad: (squad: HeroConfig[]) => void;
  setActiveLeader: (index: number) => void;
  tickTimer: (deltaSeconds: number) => void;
  setRunActive: (active: boolean) => void;
  resetRun: () => void;
  setBeaconState: (index: number, state: Partial<BeaconState>) => void;
  setDarknessLevel: (level: number) => void;
  setManaPercent: (value: number) => void;
  setStaminaPercent: (value: number) => void;
  endRun: (result: 'victory' | 'defeat') => void;
  addXP: (amount: number) => void;
  setHeroHpPercent: (index: number, percent: number) => void;
  triggerHeroDeathFlash: (index: number) => void;

  // [BLOCK: Draft Actions — Phase 6 Chunk 6A]
  openDraft: (cards: DraftCard[]) => void;
  closeDraft: () => void;
  setOwnedUpgrades: (ids: string[]) => void;
  setSkippedCounts: (counts: Record<string, number>) => void;
  addActiveSpell: (spellId: string) => void;
  submitDraftPick: (index: number) => void;
  consumeDraftPick: () => number | null;

  // [BLOCK: Spell + Skill Actions — Phase 6 Chunk 6B]
  startSpellCooldown: () => void;
  tickSpellCooldown: (deltaSeconds: number) => void;
  setSkillCooldowns: (cooldowns: { qRemaining: number; qMax: number; eRemaining: number; eMax: number }) => void;
}

// [BLOCK: Default Beacon States]
// All 7 beacons start fully lit. Names match beacons.ts roster order.
const DEFAULT_BEACON_STATES: BeaconState[] = [
  { id: 'crown-beacon',      name: 'The Crown Beacon',  isLit: true, fireMeter: 100 },
  { id: 'wardens-fire',      name: "Warden's Fire",     isLit: true, fireMeter: 100 },
  { id: 'mages-hearth',      name: "Mage's Hearth",     isLit: true, fireMeter: 100 },
  { id: 'warriors-forge',    name: "Warrior's Forge",   isLit: true, fireMeter: 100 },
  { id: 'sentinel-beacon',   name: 'Sentinel Beacon',   isLit: true, fireMeter: 100 },
  { id: 'beacon-of-haste',   name: 'Beacon of Haste',   isLit: true, fireMeter: 100 },
  { id: 'beacon-of-warding', name: 'Beacon of Warding', isLit: true, fireMeter: 100 },
];

const MAX_ACTIVE_SPELLS = 3;

// [BLOCK: Store Definition]
export const useGameStore = create<GameStore>((set, get) => ({
  // Squad defaults to the full prototype roster (all 3 heroes).
  squad: HERO_ROSTER,
  activeLeaderIndex: 0,

  // Run state
  runTimer: RUN_DURATION_SECONDS,
  isRunActive: false,
  runResult: null,

  // HUD state
  beaconStates: DEFAULT_BEACON_STATES.slice(0, BEACON_COUNT),
  darknessLevel: 1,
  manaPercent: 100,
  staminaPercent: 100,

  // XP & Leveling
  partyXP: 0,
  partyLevel: 1,
  xpThreshold: getXPThresholdForLevel(1),
  levelUpFlashId: 0,

  // Hero HP
  heroHpPercents: [...DEFAULT_HERO_HP_PERCENTS],
  heroDeathFlashIds: [...DEFAULT_HERO_DEATH_FLASH_IDS],

  isDraftPending: false,
  draftCards: [],
  ownedUpgrades: [],
  skippedCounts: {},
  activeSpells: [],
  pendingDraftPickIndex: null,
  spellCooldownRemaining: 0,
  skillCooldowns: { qRemaining: 0, qMax: 0, eRemaining: 0, eMax: 0 },

  // [BLOCK: Actions]
  setSquad: (squad) => set({ squad }),

  setActiveLeader: (index) => set({ activeLeaderIndex: index }),

  tickTimer: (deltaSeconds) =>
    set((state) => ({
      runTimer: Math.max(0, state.runTimer - deltaSeconds),
    })),

  setRunActive: (active) => set({ isRunActive: active }),

  resetRun: () =>
    set({
      runTimer: RUN_DURATION_SECONDS,
      isRunActive: false,
      runResult: null,
      activeLeaderIndex: 0,
      darknessLevel: 1,
      manaPercent: 100,
      staminaPercent: 100,
      beaconStates: DEFAULT_BEACON_STATES.slice(0, BEACON_COUNT),
      partyXP: 0,
      partyLevel: 1,
      xpThreshold: getXPThresholdForLevel(1),
      levelUpFlashId: 0,
      heroHpPercents: [...DEFAULT_HERO_HP_PERCENTS],
      heroDeathFlashIds: [...DEFAULT_HERO_DEATH_FLASH_IDS],
      isDraftPending: false,
      draftCards: [],
      ownedUpgrades: [],
      skippedCounts: {},
      activeSpells: [],
      pendingDraftPickIndex: null,
      spellCooldownRemaining: 0,
      skillCooldowns: { qRemaining: 0, qMax: 0, eRemaining: 0, eMax: 0 },
    }),

  setBeaconState: (index, partial) =>
    set((state) => {
      const updated = [...state.beaconStates];
      updated[index] = { ...updated[index], ...partial };
      return { beaconStates: updated };
    }),

  setDarknessLevel: (level) => set({ darknessLevel: level }),

  setManaPercent: (value) => set({ manaPercent: Math.min(100, Math.max(0, value)) }),
  setStaminaPercent: (value) => set({ staminaPercent: Math.min(100, Math.max(0, value)) }),

  // [BLOCK: End Run]
  // Called once by GameScene when the run ends — sets the result flag and
  // marks the run inactive. game/page.tsx watches runResult and navigates
  // to /results when it changes from null.
  endRun: (result) => set({ isRunActive: false, runResult: result }),

  // [BLOCK: Add XP]
  // Carries overflow across multiple level-ups if a single gain clears more
  // than one threshold (e.g. a big XP dump). levelUpFlashId increments once
  // per call where at least one level-up happened, not once per level — the
  // HUD just needs a changed value to trigger its flash, not an exact count.
  addXP: (amount) =>
    set((state) => {
      let xp = state.partyXP + amount;
      let level = state.partyLevel;
      let threshold = state.xpThreshold;
      let leveledUp = false;

      while (xp >= threshold) {
        xp -= threshold;
        level += 1;
        threshold = getXPThresholdForLevel(level);
        leveledUp = true;
      }

      return {
        partyXP: xp,
        partyLevel: level,
        xpThreshold: threshold,
        levelUpFlashId: leveledUp ? state.levelUpFlashId + 1 : state.levelUpFlashId,
      };
    }),

  // [BLOCK: Set Hero HP Percent — Phase 4 Chunk C]
  setHeroHpPercent: (index, percent) =>
    set((state) => {
      const updated = [...state.heroHpPercents];
      updated[index] = Math.min(100, Math.max(0, percent));
      return { heroHpPercents: updated };
    }),

  // [BLOCK: Trigger Hero Death Flash — Phase 4 Chunk C]
  // Bumps just that hero's counter — HeroPortraits watches its own index so
  // only the dying hero's portrait flashes, not the whole row.
  triggerHeroDeathFlash: (index) =>
    set((state) => {
      const updated = [...state.heroDeathFlashIds];
      updated[index] = (updated[index] ?? 0) + 1;
      return { heroDeathFlashIds: updated };
    }),

  // [BLOCK: Open Draft — Phase 6 Chunk 6A]
  // GameScene calls this on level-up with DraftSystem.generateDraft()'s
  // output. Does not touch isRunActive/timer — the run keeps ticking.
  openDraft: (cards) => set({ isDraftPending: true, draftCards: cards }),

  // [BLOCK: Close Draft — Phase 6 Chunk 6A]
  // Called after GameScene resolves the pick (or a draft timeout, if ever
  // added) — clears the overlay and the card list.
  closeDraft: () => set({ isDraftPending: false, draftCards: [] }),

  // [BLOCK: Set Owned Upgrades — Phase 6 Chunk 6A]
  // Mirrors DraftSystem.ownedUpgrades after every pick so DraftOverlay can
  // show ownership-derived UI (e.g. evolution tier badges) without reaching
  // into Phaser directly.
  setOwnedUpgrades: (ids) => set({ ownedUpgrades: ids }),

  // [BLOCK: Set Skipped Counts — Phase 6 Chunk 6A]
  setSkippedCounts: (counts) => set({ skippedCounts: counts }),

  // [BLOCK: Add Active Spell — Phase 6 Chunk 6A]
  // Caps at MAX_ACTIVE_SPELLS by silently ignoring a 4th pick — the discard-
  // selection prompt described in castle-party-phase6-plan.md Section 6 is
  // explicitly deferred to Chunk 6B (alongside spell casting itself, which
  // has no consumer for activeSpells yet in this chunk).
  addActiveSpell: (spellId) =>
    set((state) => {
      if (state.activeSpells.length >= MAX_ACTIVE_SPELLS) return state;
      return { activeSpells: [...state.activeSpells, spellId] };
    }),

  // [BLOCK: Submit Draft Pick — Phase 6 Chunk 6A]
  // Called by DraftOverlay.tsx on card click. GameScene.update() polls
  // pendingDraftPickIndex each frame and resolves it via consumeDraftPick().
  submitDraftPick: (index) => set({ pendingDraftPickIndex: index }),

  // [BLOCK: Consume Draft Pick — Phase 6 Chunk 6A]
  // One-shot read-and-clear, same shape as Hero.consumeDiedFlag() but for
  // the opposite data-flow direction (React -> Phaser instead of Phaser ->
  // React). Returns null if nothing is pending.
  //
  // Uses zustand's get()/set() (passed into the create() initializer) rather
  // than referencing useGameStore by name — referencing the store's own
  // exported const from inside its own initializer creates a circular type
  // inference ("useGameStore implicitly has type 'any' because it does not
  // have a type annotation and is referenced... in its own initializer"),
  // which then cascades into implicit-any errors everywhere draftCards/
  // DraftCard[] gets consumed downstream (DraftOverlay.tsx, GameScene.ts).
  // get()/set() are already correctly typed against GameStore via the
  // create<GameStore>() generic, so this avoids the self-reference entirely.
  consumeDraftPick: (): number | null => {
    const value = get().pendingDraftPickIndex;
    if (value !== null) {
      set({ pendingDraftPickIndex: null });
    }
    return value;
  },

  // [BLOCK: Start Spell Cooldown — Phase 6 Chunk 6B]
  // Called by GameScene right after a spell's effect() fires. Shared across
  // all 3 spell slots — casting ANY spell starts the cooldown for all, per
  // castle-party-phase6-plan.md Section 6.
  startSpellCooldown: () => set({ spellCooldownRemaining: SPELL_SHARED_COOLDOWN }),

  // [BLOCK: Tick Spell Cooldown — Phase 6 Chunk 6B]
  tickSpellCooldown: (deltaSeconds) =>
    set((state) => ({
      spellCooldownRemaining: Math.max(0, state.spellCooldownRemaining - deltaSeconds),
    })),

  // [BLOCK: Set Skill Cooldowns — Phase 6 Chunk 6B]
  // Overwrites the whole object each frame — simpler than four separate
  // setters for what's always read/written together by SkillCooldowns.tsx.
  setSkillCooldowns: (cooldowns) => set({ skillCooldowns: cooldowns }),
}));

// [BLOCK: Timer Formatter]
// Converts remaining seconds to MM:SS display string.
// Used by the Timer HUD component.
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}