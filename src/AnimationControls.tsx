import { ANIMATION_TYPES, SPEEDS, type AnimationConfig } from './animation'

interface AnimationControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  animation: AnimationConfig
  onChange: (animation: AnimationConfig) => void
}

export function AnimationControls({
  isPlaying,
  onTogglePlay,
  animation,
  onChange,
}: AnimationControlsProps) {
  return (
    <div className="controlbar">
      <button className="play-btn" onClick={onTogglePlay}>
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <div className="control-group">
        <span className="control-label">Motion</span>
        <div className="seg-inline">
          {ANIMATION_TYPES.map((a) => (
            <button
              key={a.value}
              className={`seg-btn-sm${animation.type === a.value ? ' active' : ''}`}
              onClick={() => onChange({ ...animation, type: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">Speed</span>
        <div className="seg-inline">
          {SPEEDS.map((s) => (
            <button
              key={s.label}
              className={`seg-btn-sm${animation.durationMs === s.durationMs ? ' active' : ''}`}
              onClick={() => onChange({ ...animation, durationMs: s.durationMs })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
