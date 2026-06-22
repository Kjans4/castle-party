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

import { create } from 'zustand';
import type { HeroConfig } from '@/game/config/heroes';
import { HERO_ROSTER } from '@/game/config/heroes';
import { RUN_DURATION_SECONDS, BEACON_COUNT } from '@/game/config/constants';

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

// [BLOCK: Store Definition]
export const useGameStore = create<GameStore>((set) => ({
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
}));

// [BLOCK: Timer Formatter]
// Converts remaining seconds to MM:SS display string.
// Used by the Timer HUD component.
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}