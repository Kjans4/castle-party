// [File: src/game/config/constants.ts]
// [BLOCK: Tile & World Dimensions]
// 1 tile = 64px. World is 85 × 75 meters = 5440 × 4800px.

export const TILE_SIZE = 64;
export const WORLD_W = 5440;
export const WORLD_H = 4800;

// [BLOCK: Hero Sprite & Body Sizes]
// Sprite is taller than wide — portrait rectangle.
// Hitbox (body) is narrower and shorter than the sprite — isometric-cheat convention.

export const HERO_SPRITE_W = 48;
export const HERO_SPRITE_H = 64;
export const HERO_BODY_W = 20;
export const HERO_BODY_H = 32;

// [BLOCK: Movement Physics]
// Reference feel: 20 Minutes Till Dawn — slightly lighter.
// Acceleration ramp ~0.18s, coast-to-stop ~0.23s.

export const HERO_MAX_SPEED = 320;       // px/s — matches 5 m/s at 64px/tile
export const HERO_ACCELERATION = 1800;   // px/s²
export const HERO_DRAG = 1400;           // px/s²

// [BLOCK: Hero Spawn Point]
// Single source of truth for where heroes spawn — used by GameScene.spawnHeroes()
// AND BeaconPlacement (15m exclusion margin around this point).
export const HERO_SPAWN_X = 300;
export const HERO_SPAWN_Y = WORLD_H / 2;

// [BLOCK: Camera]
export const CAMERA_LERP = 0.1;

// [BLOCK: Run Timing]
export const RUN_DURATION_SECONDS = 1200; // 20 minutes

// [BLOCK: Beacon — Core]
export const BEACON_LIGHT_RADIUS = 7 * TILE_SIZE;  // 7 meters in px
export const BEACON_COUNT = 7;
export const BEACON_CLUSTER_W = 35 * TILE_SIZE;    // ~35 meter cluster width
export const BEACON_CLUSTER_H = 25 * TILE_SIZE;    // ~25 meter cluster height
export const BEACON_MIN_SPACING = 10 * TILE_SIZE;  // min 10m between beacons
export const BEACON_ATTACK_RANGE = 3 * TILE_SIZE;  // enemies attack beacon at 3m

// [BLOCK: Beacon — Healing & Drain (Phase 2)]
export const BEACON_HEAL_RATE = 8;          // % per second restored by hero proximity
export const BEACON_DRAIN_RATE = 5;         // % per second drained per attacking enemy (Phase 4)
export const BEACON_REIGNITE_FLASH = 300;   // ms duration of reignite flash

// [BLOCK: Beacon — Placement Rules (Phase 2)]
export const BEACON_CLUSTER_MARGIN = 15 * TILE_SIZE; // 960px min distance from hero spawn (15 meters)
export const BEACON_CROWN_RADIUS = 5 * TILE_SIZE;    // 320px max distance from cluster center for Crown Beacon (5 meters)

// [BLOCK: Darkness — Overlay (Phase 2)]
// Index = number of beacons currently lit (0-7).
// index 0 = 0 beacons lit (run loss, fades to full black), index 7 = full light.
export const DARKNESS_OVERLAY_ALPHA = [1.00, 0.70, 0.52, 0.38, 0.26, 0.16, 0.08, 0.00];
export const DARKNESS_LERP_SPEED = 2.0;       // alpha lerp speed multiplier (smooth ~0.5s transition)
export const DARKNESS_OVERLAY_DEPTH = 15;     // above world, below heroes and beacons

// [BLOCK: Enemy Spawn]
export const SPAWN_INTERVAL_MS = 4000;  // base spawn batch every 4s
export const BATCH_INTERVAL_MS = 120000; // new batch type every 2 minutes
export const PRE_BATCH_PAUSE_MS = 20000; // 20s pause before new batch

// [BLOCK: Respawn Timers]
export const RESPAWN_1_DEAD = 45;   // seconds
export const RESPAWN_2_DEAD = 30;   // seconds
export const RESPAWN_3_DEAD = 10;   // seconds (team wipe)

// [BLOCK: Boss Schedule (seconds into run)]
export const BOSS_TIMES = [240, 480, 720, 960, 1140] as const; // 4:00, 8:00, 12:00, 16:00, 19:00

// [BLOCK: Companion Behavior]
export const COMPANION_FOLLOW_DISTANCE = 80;  // px — how close companions trail the leader
export const COMPANION_OPACITY = 0.6;         // 60% opacity for AI companions