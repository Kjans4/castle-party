// [File: src/game/animations/AnimationState.ts]
// [BLOCK: Animation State Machine]
// Manages animation state transitions for all units (heroes, enemies, bosses).
// Uses placeholder single-frame keys in Phase 1.
// Real spritesheet animations are wired in when hand-drawn art is ready.
//
// States: idle -> walk -> attack -> hurt -> death
// Transitions are one-way for death (cannot leave death state).
// hurt interrupts any state but returns to idle/walk after duration.

export type AnimState = 'idle' | 'walk' | 'attack' | 'hurt' | 'death';

interface AnimStateOptions {
  // The Phaser sprite or image this state machine drives.
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  // Prefix for animation keys, e.g. 'fencer' -> 'fencer-idle', 'fencer-walk', etc.
  prefix: string;
}

// [BLOCK: AnimationState Class]
export class AnimationState {
  private sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private prefix: string;
  private _current: AnimState = 'idle';
  private hurtTimer: number = 0;
  private readonly HURT_DURATION = 0.2; // seconds hurt state lasts

  constructor(options: AnimStateOptions) {
    this.sprite = options.sprite;
    this.prefix = options.prefix;
  }

  // [BLOCK: Current State]
  get current(): AnimState {
    return this._current;
  }

  // [BLOCK: Transition]
  // Attempts to transition to a new state.
  // Returns true if the transition was accepted.
  transitionTo(next: AnimState): boolean {
    // Cannot leave death state.
    if (this._current === 'death') return false;

    // Cannot interrupt hurt until timer expires (except death).
    if (this._current === 'hurt' && next !== 'death' && this.hurtTimer > 0) return false;

    // No-op if already in this state (except attack — allow re-triggering).
    if (this._current === next && next !== 'attack') return false;

    this._current = next;

    if (next === 'hurt') {
      this.hurtTimer = this.HURT_DURATION;
    }

    this.playAnimation(next);
    return true;
  }

  // [BLOCK: Tick]
  // Must be called each frame with deltaSeconds to handle timed transitions.
  tick(deltaSeconds: number): void {
    if (this._current === 'hurt') {
      this.hurtTimer -= deltaSeconds;
      if (this.hurtTimer <= 0) {
        this.hurtTimer = 0;
        this._current = 'idle';
        this.playAnimation('idle');
      }
    }
  }

  // [BLOCK: Convenience Setters]
  setIdle(): void   { this.transitionTo('idle'); }
  setWalk(): void   { this.transitionTo('walk'); }
  setAttack(): void { this.transitionTo('attack'); }
  setHurt(): void   { this.transitionTo('hurt'); }
  setDeath(): void  { this.transitionTo('death'); }

  get isDead(): boolean { return this._current === 'death'; }

  // [BLOCK: Play Animation]
  // Plays the Phaser animation for the given state.
  // In Phase 1 these are single-frame placeholder keys from registry.ts.
  private playAnimation(state: AnimState): void {
    const key = `${this.prefix}-${state}`;
    if (this.sprite instanceof Phaser.GameObjects.Sprite) {
      // Only play if the animation key exists.
      if (this.sprite.scene?.anims?.exists(key)) {
        this.sprite.play(key, true);
      }
    }
    // For Image objects, no animation — just a static frame.
    // Phase 1 uses rectangles, so this is fine.
  }
}