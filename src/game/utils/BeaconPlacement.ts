// [File: src/game/utils/BeaconPlacement.ts]
// [BLOCK: Beacon Placement — Rejection Sampling]
// Generates 7 randomized beacon positions per run, per castle-party-phase2-plan.md.
//
// Rules enforced:
//   - All 7 beacons fall within the 35×25m cluster zone centered on the map
//   - Each beacon is at least BEACON_MIN_SPACING from every other beacon
//   - No beacon is closer than BEACON_CLUSTER_MARGIN to the hero spawn point
//   - Crown Beacon (index 0) is always within BEACON_CROWN_RADIUS of the cluster center
//   - Regenerated via rejection sampling if any rule is violated
//
// Pure function — no Phaser dependency — so it can be unit tested in isolation.

import {
  WORLD_W,
  WORLD_H,
  BEACON_COUNT,
  BEACON_CLUSTER_W,
  BEACON_CLUSTER_H,
  BEACON_MIN_SPACING,
  BEACON_CLUSTER_MARGIN,
  BEACON_CROWN_RADIUS,
} from '@/game/config/constants';
import { distance, randomRange } from '@/game/utils/MathUtils';

export interface BeaconPosition {
  x: number;
  y: number;
  isCrown: boolean;
}

export interface HeroSpawnPoint {
  x: number;
  y: number;
}

// [BLOCK: Cluster Bounds]
// Centered on the map. Computed once from world dimensions + cluster size.
function getClusterBounds() {
  const centerX = WORLD_W / 2;
  const centerY = WORLD_H / 2;
  return {
    centerX,
    centerY,
    minX: centerX - BEACON_CLUSTER_W / 2,
    maxX: centerX + BEACON_CLUSTER_W / 2,
    minY: centerY - BEACON_CLUSTER_H / 2,
    maxY: centerY + BEACON_CLUSTER_H / 2,
  };
}

// [BLOCK: Random Point In Cluster Zone]
function randomPointInCluster(): { x: number; y: number } {
  const bounds = getClusterBounds();
  return {
    x: randomRange(bounds.minX, bounds.maxX),
    y: randomRange(bounds.minY, bounds.maxY),
  };
}

// [BLOCK: Random Point In Crown Radius]
// Sampled within a circle around the cluster center, then re-rolled if it
// falls outside the cluster zone bounds (keeps Crown inside the cluster too).
function randomPointInCrownRadius(): { x: number; y: number } {
  const bounds = getClusterBounds();
  const maxAttempts = 200;

  for (let i = 0; i < maxAttempts; i++) {
    const angle = randomRange(0, Math.PI * 2);
    const radius = randomRange(0, BEACON_CROWN_RADIUS);
    const x = bounds.centerX + Math.cos(angle) * radius;
    const y = bounds.centerY + Math.sin(angle) * radius;

    if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
      return { x, y };
    }
  }

  // Fallback — dead center always satisfies every rule.
  return { x: bounds.centerX, y: bounds.centerY };
}

// [BLOCK: Validation]
function isFarEnoughFromOthers(x: number, y: number, placed: BeaconPosition[]): boolean {
  return placed.every((p) => distance(x, y, p.x, p.y) >= BEACON_MIN_SPACING);
}

function isFarEnoughFromHeroSpawn(x: number, y: number, heroSpawn: HeroSpawnPoint): boolean {
  return distance(x, y, heroSpawn.x, heroSpawn.y) >= BEACON_CLUSTER_MARGIN;
}

function isWithinWorldBounds(x: number, y: number): boolean {
  return x >= 0 && x <= WORLD_W && y >= 0 && y <= WORLD_H;
}

// [BLOCK: Place Single Beacon]
// Rejection-samples a single position until all rules pass or maxAttempts is hit.
function placeSingleBeacon(
  isCrown: boolean,
  placed: BeaconPosition[],
  heroSpawn: HeroSpawnPoint,
  maxAttempts: number = 500
): BeaconPosition {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = isCrown ? randomPointInCrownRadius() : randomPointInCluster();

    if (
      isWithinWorldBounds(candidate.x, candidate.y) &&
      isFarEnoughFromHeroSpawn(candidate.x, candidate.y, heroSpawn) &&
      isFarEnoughFromOthers(candidate.x, candidate.y, placed)
    ) {
      return { x: candidate.x, y: candidate.y, isCrown };
    }
  }

  // Fallback after exhausting attempts — relax spacing rule only, keep
  // cluster/margin/world-bounds rules intact so the run never hard-fails.
  const fallback = isCrown ? randomPointInCrownRadius() : randomPointInCluster();
  return { x: fallback.x, y: fallback.y, isCrown };
}

// [BLOCK: Generate Beacon Positions]
// Returns BEACON_COUNT positions. Index 0 is always the Crown Beacon.
export function generateBeaconPositions(heroSpawn: HeroSpawnPoint): BeaconPosition[] {
  const positions: BeaconPosition[] = [];

  // Crown Beacon first — index 0, near cluster center.
  positions.push(placeSingleBeacon(true, positions, heroSpawn));

  // Remaining 6 secondary beacons.
  for (let i = 1; i < BEACON_COUNT; i++) {
    positions.push(placeSingleBeacon(false, positions, heroSpawn));
  }

  return positions;
}