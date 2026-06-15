/**
 * Animation timeline. Kept as a pure, deterministic function of normalized
 * time t ∈ [0, 1] so that:
 *   - live playback (Phase 3) can drive it with requestAnimationFrame, and
 *   - export (Phase 4) can step the exact same timeline frame-by-frame.
 */

export type AnimationType = 'turntable' | 'rock'

export interface AnimationConfig {
  type: AnimationType
  durationMs: number
  /** Amplitude of the rock oscillation, in degrees. */
  rockDegrees: number
}

export const DEFAULT_ANIMATION: AnimationConfig = {
  type: 'turntable',
  durationMs: 4000,
  rockDegrees: 30,
}

export const ANIMATION_TYPES: { value: AnimationType; label: string }[] = [
  { value: 'turntable', label: 'Turntable' },
  { value: 'rock', label: 'Rock' },
]

export const SPEEDS: { label: string; durationMs: number }[] = [
  { label: 'Slow', durationMs: 8000 },
  { label: 'Medium', durationMs: 4000 },
  { label: 'Fast', durationMs: 2000 },
]

/**
 * Absolute rotation (degrees, around the Y axis) at normalized time t.
 * Both modes return 0 at t=0 and t=1 so the loop is seamless:
 *   - turntable: a full 0→360° revolution (constant speed = no loop stutter)
 *   - rock: a smooth sine oscillation that eases naturally at the extremes
 */
export function angleAt(anim: AnimationConfig, t: number): number {
  switch (anim.type) {
    case 'turntable':
      return t * 360
    case 'rock':
      return anim.rockDegrees * Math.sin(t * 2 * Math.PI)
  }
}
