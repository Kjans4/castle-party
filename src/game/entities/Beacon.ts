// [File: src/game/entities/Beacon.ts]
// [BLOCK: Beacon Entity — Phase 2]
// Fire meter, visual states (burning/low/extinguished/reigniting), proximity healing,
// and a drain() stub ready for Phase 4 enemies to call.
// Placeholder shapes only — no real sprites yet (see castle-party-phase2-plan.md Visual Spec).

import Phaser from 'phaser';
import type { BeaconConfig } from '@/game/config/beacons';
import {
  BEACON_LIGHT_RADIUS,
  BEACON_REIGNITE_FLASH,
} from '@/game/config/constants';
import { clamp } from '@/game/utils/MathUtils';

// [BLOCK: Visual State Type]
export type BeaconVisualState = 'burning' | 'low' | 'extinguished';

// [BLOCK: State Color Table]
const STATE_COLORS: Record<BeaconVisualState, { flame: number; glowAlpha: number }> = {
  burning:      { flame: 0xff9900, glowAlpha: 0.06 },
  low:          { flame: 0xff4400, glowAlpha: 0.03 },
  extinguished: { flame: 0x333333, glowAlpha: 0.00 },
};

const FLASH_COLOR = 0xffffff;

// [BLOCK: Beacon Class]
export class Beacon extends Phaser.GameObjects.Container {
  readonly config: BeaconConfig;

  isLit: boolean = true;
  fireMeter: number = 100; // 0–100

  // [BLOCK: Reignite Flash State]
  private reigniteFlashRemainingMs: number = 0;

  // [BLOCK: Visual Children]
  private flame: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private meterBg: Phaser.GameObjects.Rectangle;
  private meterFill: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  private static readonly FLAME_RADIUS = 14;
  private static readonly METER_WIDTH = 32;
  private static readonly METER_HEIGHT = 4;
  private static readonly METER_OFFSET_Y = 22; // below flame

  constructor(scene: Phaser.Scene, x: number, y: number, config: BeaconConfig) {
    super(scene, x, y);
    scene.add.existing(this);
    this.config = config;

    // [BLOCK: Light Glow]
    this.glow = scene.add.circle(0, 0, BEACON_LIGHT_RADIUS, 0xffffff, STATE_COLORS.burning.glowAlpha);

    // [BLOCK: Flame Circle]
    this.flame = scene.add.circle(0, 0, Beacon.FLAME_RADIUS, STATE_COLORS.burning.flame);

    // [BLOCK: Fire Meter Bar]
    this.meterBg = scene.add.rectangle(
      0, Beacon.METER_OFFSET_Y,
      Beacon.METER_WIDTH, Beacon.METER_HEIGHT,
      0x000000, 0.5
    );
    this.meterFill = scene.add.rectangle(
      -Beacon.METER_WIDTH / 2, Beacon.METER_OFFSET_Y,
      Beacon.METER_WIDTH, Beacon.METER_HEIGHT,
      0xff9900
    );
    this.meterFill.setOrigin(0, 0.5);

    // [BLOCK: Label — first word of beacon name]
    const firstWord = config.name.split(' ')[0];
    this.label = scene.add.text(0, -Beacon.FLAME_RADIUS - 12, firstWord, {
      fontSize: '9px',
      color: '#ffffff',
    });
    this.label.setOrigin(0.5, 1);
    this.label.setAlpha(0.7);

    this.add([this.glow, this.flame, this.meterBg, this.meterFill, this.label]);

    this.refreshVisuals();
  }

  // [BLOCK: Derive Visual State From Fire Meter]
  get visualState(): BeaconVisualState {
    if (this.fireMeter <= 0) return 'extinguished';
    if (this.fireMeter < 30) return 'low';
    return 'burning';
  }

  get isReigniteFlashing(): boolean {
    return this.reigniteFlashRemainingMs > 0;
  }

  // [BLOCK: Heal]
  // Called by GameScene's proximity healing loop with an already-computed amount
  // (BEACON_HEAL_RATE × delta). Handles reignite flash on 0 → >0 crossing.
  heal(amount: number): void {
    if (amount <= 0) return;
    const wasExtinguished = this.fireMeter <= 0;

    this.fireMeter = clamp(this.fireMeter + amount, 0, 100);
    this.isLit = this.fireMeter > 0;

    if (wasExtinguished && this.fireMeter > 0) {
      this.reigniteFlashRemainingMs = BEACON_REIGNITE_FLASH;
    }

    this.refreshVisuals();
  }

  // [BLOCK: Drain — Phase 4 Stub]
  // Exists now so the tug-of-war formula works the moment Phase 4 wires enemies in.
  // No call site exists in Phase 2 — calling this has no effect on gameplay yet
  // because nothing invokes it.
  drain(amount: number): void {
    if (amount <= 0) return;

    this.fireMeter = clamp(this.fireMeter - amount, 0, 100);
    this.isLit = this.fireMeter > 0;

    this.refreshVisuals();
  }

  // [BLOCK: Update]
  // Ticks the reignite flash timer down; everything else is event-driven (heal/drain).
  update(deltaSeconds: number): void {
    if (this.reigniteFlashRemainingMs > 0) {
      this.reigniteFlashRemainingMs = Math.max(0, this.reigniteFlashRemainingMs - deltaSeconds * 1000);
      this.refreshVisuals();
    }
  }

  // [BLOCK: Refresh Visuals]
  // Applies flame color, glow alpha, and meter fill based on current state.
  // Reignite flash briefly overrides flame color with white.
  private refreshVisuals(): void {
    const state = this.visualState;
    const colors = STATE_COLORS[state];

    this.flame.setFillStyle(this.isReigniteFlashing ? FLASH_COLOR : colors.flame);
    this.glow.setFillStyle(0xffffff, colors.glowAlpha);

    const fillRatio = this.fireMeter / 100;
    this.meterFill.width = Beacon.METER_WIDTH * fillRatio;

    const fillColor = this.fireMeter > 50 ? 0xff9900 : this.fireMeter > 25 ? 0xffdd4a : 0xff4444;
    this.meterFill.setFillStyle(fillColor);
  }
}