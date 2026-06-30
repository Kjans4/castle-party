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
export const SPAWN_VARIANCE_MS = 1000;  // ±1s randomized per batch
export const BATCH_INTERVAL_MS = 120000; // legacy ms form — superseded by BATCH_WINDOW_SECONDS below, kept for compat
export const PRE_BATCH_PAUSE_MS = 20000; // legacy ms form — superseded by PRE_BATCH_PAUSE_SECONDS below, kept for compat

// [BLOCK: Wave Batch System (Phase 5)]
// See castle-party-phase5-plan.md Section 4 + Section 10.
export const BATCH_WINDOW_SECONDS = 120;    // 2 minutes per batch window
export const PRE_BATCH_PAUSE_SECONDS = 20;  // spawning pauses this many seconds before new batch

// [BLOCK: Batch Type Weights (Phase 5)]
export const BATCH_WEIGHT_UNDEAD = 0.25;
export const BATCH_WEIGHT_HUMAN = 0.25;
export const BATCH_WEIGHT_ELEMENTAL = 0.15;
export const BATCH_WEIGHT_MONSTER = 0.25;
export const BATCH_WEIGHT_MIXED = 0.10;

// [BLOCK: Spawn Boundary (Phase 3)]
// Enemies spawn at the outer edge of the current illuminated zone. At full
// light this sits near the map edge; as Darkness Level rises the boundary
// contracts toward the beacon cluster.
export const SPAWN_BOUNDARY_RADIUS_FULL_LIGHT = 25 * TILE_SIZE; // ~25m at Darkness Level 1
export const SPAWN_BOUNDARY_SHRINK_PER_LEVEL = 2.5 * TILE_SIZE; // contracts ~2.5m per Darkness Level
export const SPAWN_BOUNDARY_MIN_RADIUS = 8 * TILE_SIZE;          // never spawns closer than this

// [BLOCK: Batch Size Scaling — by Darkness Level]
// Index 0 unused (Darkness Level is 1-indexed); values are [min, max] enemies per batch.
export const BATCH_SIZE_BY_DARKNESS_LEVEL: Record<number, [number, number]> = {
  1: [1, 2],
  2: [2, 3],
  3: [2, 3],
  4: [3, 4],
  5: [3, 4],
  6: [4, 6],
  7: [4, 6],
};

// [BLOCK: Enemy Combat (Phase 3)]
export const ENEMY_BODY_SIZE = 24;                // px — placeholder square hitbox
export const ENEMY_AGGRO_RANGE = 5 * TILE_SIZE;   // 320px (5 meters) — beyond this, enemy returns to beacon
export const ENEMY_ATTACK_RANGE = 3 * TILE_SIZE;  // 192px (3 meters) — within this, enemy attacks beacon
export const ENEMY_SPAWN_FADE_SECONDS = 0.3;      // fade-in duration when crossing into light

// [BLOCK: Hero Attack (Phase 3)]
export const HERO_MELEE_RANGE = 1.5 * TILE_SIZE;     // 96px (1.5 meters) — Fencer cone reach
export const HERO_MELEE_ANGLE = 90;                  // degrees — Fencer cone width
export const HERO_PROJECTILE_SPEED = 600;            // px/sec — Sorceress projectile
export const PRIESTESS_PROJECTILE_SPEED = 500;       // px/sec — Priestess projectile
export const COMPANION_ATTACK_RANGE = 400;           // px — range at which companions start attacking
export const PROJECTILE_RADIUS_SORCERESS = 6;        // px
export const PROJECTILE_RADIUS_PRIESTESS = 5;        // px
export const MELEE_FLASH_DURATION_MS = 100;          // ms — white arc flash fade duration

// [BLOCK: Respawn Timers]
export const RESPAWN_1_DEAD = 45;   // seconds
export const RESPAWN_2_DEAD = 30;   // seconds
export const RESPAWN_3_DEAD = 10;   // seconds (team wipe)

// [BLOCK: Boss Schedule (seconds into run)]
export const BOSS_TIMES = [240, 480, 720, 960, 1140] as const; // 4:00, 8:00, 12:00, 16:00, 19:00

// [BLOCK: Companion Behavior]
export const COMPANION_FOLLOW_DISTANCE = 80;  // px — how close companions trail the leader
export const COMPANION_OPACITY = 0.6;         // 60% opacity for AI companions

// [BLOCK: XP System (Phase 3)]
export const XP_COLLECT_RADIUS = TILE_SIZE;   // 64px (1 tile) — leader auto-collects within this range
export const XP_SHARD_SKELETON = 10;
export const XP_SHARD_ZOMBIE = 15;
export const XP_SHARD_KNIGHT = 25;
export const XP_THRESHOLDS = [100, 150, 220, 300] as const; // level 1->2, 2->3, 3->4, 4->5
export const XP_SHARD_RADIUS = 5;             // px — visual circle
export const XP_SHARD_GLOW_RADIUS = 9;        // px — subtle glow ring
export const LEVEL_UP_HEAL_FRACTION = 0.3;    // 30% max HP heal to all heroes on level up
export const XP_SHARD_GHOST = 20;             // Phase 4 — value not specified in plan; assumed between
                                               // Zombie (15) and Knight (25) to match Ghost's uncommon rarity. Flag if wrong.

// [BLOCK: XP — New Enemies (Phase 5)]
export const XP_SHARD_MORPH = 30;   // shared by all three Elemental Morphs
export const XP_SHARD_SPIDER = 20;
export const XP_SHARD_SLIME = 25;
export const XP_SHARD_RANGER = 15;  // same as Zombie — fragile but ranged threat
export const XP_SHARD_PRIEST = 20;  // uncommon — between Zombie and Knight

// [BLOCK: Resistance System (Phase 4)]
export const RESISTANCE_ROLL_NONE = 0.50;
export const RESISTANCE_ROLL_PHYSICAL = 0.10;
export const RESISTANCE_ROLL_FIRE = 0.10;
export const RESISTANCE_ROLL_ICE = 0.10;
export const RESISTANCE_ROLL_ELECTRIC = 0.10;
export const RESISTANCE_ROLL_MAGIC = 0.10;

// [BLOCK: Immunity Feedback (Phase 4)]
export const IMMUNE_FLASH_DURATION = 100;  // ms — white flash on resisted hit
export const IMMUNE_TEXT_DURATION = 800;   // ms — "IMMUNE" floating text fade

// [BLOCK: Elemental Morph Visuals (Phase 5)]
export const MORPH_FLICKER_MIN_ALPHA = 0.8;
export const MORPH_FLICKER_MAX_ALPHA = 1.0;
export const MORPH_FLICKER_SPEED = 2.0;   // radians/sec — controls flicker cycle rate

// [BLOCK: Mini Unit Behavior (Phase 5 Chunk 5B)]
export const MINI_SPAWN_COUNT = 4;    // Minis spawned per parent (Spider/Slime) death
export const MINI_SPIDER_SPEED = 4.0; // m/s — matches MINI_SPIDER.movementSpeed in enemies.ts
export const MINI_SLIME_SPEED = 2.5;  // m/s — matches MINI_SLIME.movementSpeed in enemies.ts

// [BLOCK: Ranged Enemies — Phase 4 Chunk B]
export const ENEMY_PROJECTILE_RADIUS = 5;     // px — shared by Ranger/Priest shots

export const RANGER_PROJECTILE_SPEED = 400;   // px/sec
export const RANGER_ATTACK_INTERVAL = 2.0;    // seconds between Ranger shots
export const RANGER_HERO_DAMAGE = 12;         // physical damage per shot vs hero

export const PRIEST_PROJECTILE_SPEED = 350;   // px/sec
export const PRIEST_ATTACK_INTERVAL = 2.5;    // seconds between Priest shots
export const PRIEST_HERO_DAMAGE = 10;         // magic damage per shot vs hero

// [BLOCK: Hero Death — Phase 4 Chunk C]
// Placeholder respawn: brief white flash, then instant full-HP respawn at
// current position. Real respawn timers (45s/30s/10s) are Phase 6 Chunk 6C.
export const HERO_DEATH_FLASH_DURATION_SECONDS = 0.3;

// [BLOCK: Card Draft System (Phase 6 Chunk 6A)]
// See castle-party-phase6-plan.md Section 4 + Section 10.
export const DRAFT_CARD_COUNT = 5;          // cards shown per draft
export const DRAFT_RARITY_COMMON = 0.60;    // common card draw weight
export const DRAFT_RARITY_RARE = 0.30;      // rare card draw weight
export const DRAFT_RARITY_LEGENDARY = 0.10; // legendary card draw weight
export const DRAFT_SPELL_RATE = 0.15;       // probability a slot is a spell card
export const DRAFT_SKIP_EXPIRY = 3;         // skipped this many times = removed from pool
export const DRAFT_LAST_CHANCE_THRESHOLD = 2; // skipped this many times = show "Last Chance" label

// [BLOCK: Multishot — Phase 6 Chunk 6A]
// projectileCountStat default for all heroes. Only Sorceress/Priestess fire
// extra projectiles per the Multishot effect — Fencer is melee and
// unaffected, but the Stat exists on every Hero uniformly (simpler than a
// per-hero-type field) and is just never read for Fencer's attack path.
export const PROJECTILE_COUNT_BASE = 1;

// [BLOCK: Spell System — Phase 6 Chunk 6B]
export const SPELL_SHARED_COOLDOWN = 5;     // seconds — all spells share this cooldown
export const SPELL_SLOT_COUNT = 3;          // max spells held simultaneously
export const FIREBALL_DAMAGE = 80;
export const FIREBALL_RADIUS = 128;         // px
export const FREEZE_DURATION = 2.0;         // seconds
export const FREEZE_RADIUS = 192;           // px
export const LIGHTNING_DAMAGE = 60;
export const LIGHTNING_RADIUS = 256;        // px
export const LIGHTNING_STUN = 1.0;          // seconds
export const BLESSING_HEAL_PER_SEC = 5;     // % max HP per second
export const BLESSING_DURATION = 10;        // seconds
export const BERSERK_DAMAGE_BONUS = 40;     // %
export const BERSERK_DURATION = 10;         // seconds
export const GUARDIAN_DEFENSE_BONUS = 8;    // flat
export const GUARDIAN_DURATION = 10;        // seconds
export const RELENTLESS_CDR = 30;           // % cooldown reduction during Relentless
export const RELENTLESS_DURATION = 15;      // seconds

// [BLOCK: Skill System — Phase 6 Chunk 6B]
export const BARRAGE_SLASH_COUNT = 7;
export const BARRAGE_DURATION = 1.5;        // seconds total
export const BARRAGE_DAMAGE_PERCENT = 0.30; // 30% of attackDamage per slash
export const BARRAGE_INTERVAL_SECONDS = 0.21; // seconds between slashes — per plan's exact figure
                                               // (note: 7 * 0.21 = 1.47s, slightly under the stated
                                               // 1.5s total — both figures are given explicitly in
                                               // the plan and don't perfectly reconcile; interval is
                                               // authoritative since it drives the actual tick loop)
export const WAR_CRY_BUFF = 25;              // % bonus to attack speed, damage, defense
export const WAR_CRY_DURATION = 5;           // seconds
export const METEOR_DAMAGE = 80;
export const METEOR_COUNT = 7;
export const METEOR_DELAY = 3.0;             // seconds before impact
export const METEOR_IMPACT_RADIUS = 48;      // px — TBD/assumed: plan gives no detonation radius for
                                              // Meteor Shower, only damage/count/delay. Chosen as a
                                              // tight blast roughly 1 enemy-body-width wide so "enemies
                                              // can dodge" (per plan's own framing) is meaningful. Flag
                                              // for playtesting/revision.
export const BLACKHOLE_PULL_RADIUS = 128;    // px (2 meters)
export const BLACKHOLE_PULL_SPEED = 150;     // px/sec — TBD/assumed: plan describes the pull qualitatively
                                              // ("via velocity offset") but gives no speed value. Flagged.
export const BLACKHOLE_DAMAGE_PER_SEC = 25;
export const BLACKHOLE_DURATION = 2.5;       // seconds
export const SACRED_PULSE_HEAL = 0.50;       // 50% max HP
export const SACRED_PULSE_DRAIN = 0.30;      // 30% current HP from nearby enemies
export const SACRED_PULSE_RADIUS = 192;      // px (3 meters)
export const DIVINE_SURGE_BUFF = 30;         // % all stats party
export const DIVINE_SURGE_DEBUFF = 15;       // % all stats enemies
export const DIVINE_SURGE_BUFF_DUR = 5;      // seconds
export const DIVINE_SURGE_DEBUFF_DUR = 2;    // seconds
export const DIVINE_SURGE_RADIUS = 192;      // px (3 meters)

// [BLOCK: Resource Costs — Phase 6 Chunk 6B]
export const SORCERESS_ATTACK_MANA = 4.5;    // % mana per normal shot (50% reduction already applied)
export const PRIESTESS_ATTACK_MANA = 3.0;    // % mana per normal shot (50% reduction already applied)

// [BLOCK: Shared Pool Synergy — Phase 6 Chunk 6B]
// Per stats.md Section 7 / SharedPool.ts's own doc-comment example.
export const SYNERGY_BONUS_2_USERS = 15;     // % regen bonus when 2 heroes share a resource type
export const SYNERGY_BONUS_3_USERS = 25;     // % regen bonus when all 3 heroes share a resource type

// [BLOCK: Multishot Firing — Phase 6 Chunk 6B]
export const MULTISHOT_SPREAD_DEGREES = 6;   // degrees between each extra projectile's aim angle