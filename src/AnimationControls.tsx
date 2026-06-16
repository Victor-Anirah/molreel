import { ANIMATION_TYPES, SPEEDS, type AnimationConfig } from './animation'
import type { ExportFormat } from './exporter'

const RESOLUTIONS: { label: string; maxEdge: number }[] = [
  { label: 'SD', maxEdge: 480 },
  { label: 'HD', maxEdge: 720 },
  { label: 'Full', maxEdge: 1080 },
]

const FORMATS: ExportFormat[] = ['gif', 'mp4']

interface AnimationControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  animation: AnimationConfig
  onChange: (animation: AnimationConfig) => void
  maxEdge: number
  onMaxEdgeChange: (maxEdge: number) => void
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  onExport: () => void
  exportProgress: number | null
}

export function AnimationControls({
  isPlaying,
  onTogglePlay,
  animation,
  onChange,
  maxEdge,
  onMaxEdgeChange,
  format,
  onFormatChange,
  onExport,
  exportProgress,
}: AnimationControlsProps) {
  const exporting = exportProgress !== null

  return (
    <div className="controlbar">
      <button className="play-btn" onClick={onTogglePlay} disabled={exporting}>
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

      <div className="control-spacer" />

      <div className="control-group">
        <span className="control-label">Size</span>
        <div className="seg-inline">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.label}
              className={`seg-btn-sm${maxEdge === r.maxEdge ? ' active' : ''}`}
              onClick={() => onMaxEdgeChange(r.maxEdge)}
              disabled={exporting}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">Format</span>
        <div className="seg-inline">
          {FORMATS.map((f) => (
            <button
              key={f}
              className={`seg-btn-sm${format === f ? ' active' : ''}`}
              onClick={() => onFormatChange(f)}
              disabled={exporting}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button className="export-btn" onClick={onExport} disabled={exporting}>
        {exporting
          ? `Rendering ${Math.round((exportProgress ?? 0) * 100)}%`
          : `⬇ Export ${format.toUpperCase()}`}
      </button>
    </div>
  )
}
