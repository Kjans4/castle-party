//[FILE: src/game/config/beacons.ts]
// [BLOCK: Beacon Config Types]
// Each beacon has a unique passive that is active only while the beacon is lit.
// passiveEffect is a stub — implemented in Phase 3 (beacon system).

export interface BeaconConfig {
  id: string;
  name: string;
  passiveDescription: string;
  strategicRole: string;
  isCrown: boolean;          // Crown Beacon always placed near cluster center
  passiveEffect: () => void; // stub — Phase 3 implementation
}

// [BLOCK: Crown Beacon]
// Central beacon. If extinguished, Darkness penalty is doubled.
// Must never be abandoned — permanent anchor point.

export const CROWN_BEACON: BeaconConfig = {
  id: 'crown-beacon',
  name: 'The Crown Beacon',
  passiveDescription: 'Central beacon — if extinguished, the Darkness penalty is doubled.',
  strategicRole: 'Must never be abandoned — permanent anchor point.',
  isCrown: true,
  passiveEffect: () => { /* Phase 3: double darkness penalty when extinguished */ },
};

// [BLOCK: Secondary Beacons]

export const WARDENS_FIRE: BeaconConfig = {
  id: 'wardens-fire',
  name: "Warden's Fire",
  passiveDescription: 'Reduces nearby enemy spawn rate.',
  strategicRole: 'Priority protect to ease local pressure.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: reduce spawn rate near this beacon */ },
};

export const MAGES_HEARTH: BeaconConfig = {
  id: 'mages-hearth',
  name: "Mage's Hearth",
  passiveDescription: 'Increases Mana regen speed for nearby heroes.',
  strategicRole: 'Essential for Mage-heavy squads.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: boost mana regen for nearby heroes */ },
};

export const WARRIORS_FORGE: BeaconConfig = {
  id: 'warriors-forge',
  name: "Warrior's Forge",
  passiveDescription: 'Reduces Stamina cost for nearby heroes.',
  strategicRole: 'Lets Stamina users spam abilities.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: reduce stamina costs for nearby heroes */ },
};

export const SENTINEL_BEACON: BeaconConfig = {
  id: 'sentinel-beacon',
  name: 'Sentinel Beacon',
  passiveDescription: 'Boosts AI companion damage and detection range.',
  strategicRole: 'Best beacon to post a hero at.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: buff AI companion damage + detection near this beacon */ },
};

export const BEACON_OF_HASTE: BeaconConfig = {
  id: 'beacon-of-haste',
  name: 'Beacon of Haste',
  passiveDescription: 'Slightly accelerates the dawn countdown.',
  strategicRole: 'Risk/reward — advances the clock faster.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: tick run timer slightly faster */ },
};

export const BEACON_OF_WARDING: BeaconConfig = {
  id: 'beacon-of-warding',
  name: 'Beacon of Warding',
  passiveDescription: 'Periodically pulses a small damage ring around itself.',
  strategicRole: 'Naturally helps defend itself.',
  isCrown: false,
  passiveEffect: () => { /* Phase 3: periodic AoE damage pulse around beacon */ },
};

// [BLOCK: Beacon Roster]
// Order matches strategic priority. Crown is always index 0.
export const BEACON_ROSTER: BeaconConfig[] = [
  CROWN_BEACON,
  WARDENS_FIRE,
  MAGES_HEARTH,
  WARRIORS_FORGE,
  SENTINEL_BEACON,
  BEACON_OF_HASTE,
  BEACON_OF_WARDING,
];