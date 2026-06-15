import {
  COLOR_SCHEMES,
  PRESETS,
  REPRESENTATIONS,
  type SceneConfig,
} from './scene'

interface StylePanelProps {
  scene: SceneConfig
  onChange: (scene: SceneConfig) => void
}

const BACKGROUNDS: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#0d1117', label: 'Dark' },
  { value: 'transparent', label: 'None' },
]

export function StylePanel({ scene, onChange }: StylePanelProps) {
  const set = (patch: Partial<SceneConfig>) => onChange({ ...scene, ...patch })

  return (
    <aside className="sidebar">
      <section className="panel-group">
        <h3>Presets</h3>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              className="preset"
              onClick={() => onChange({ ...p.scene })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-group">
        <h3>Representation</h3>
        <div className="seg">
          {REPRESENTATIONS.map((r) => (
            <button
              key={r.value}
              className={`seg-btn${scene.representation === r.value ? ' active' : ''}`}
              onClick={() => set({ representation: r.value })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-group">
        <h3>Color</h3>
        <div className="seg">
          {COLOR_SCHEMES.map((c) => (
            <button
              key={c.value}
              className={`seg-btn${scene.colorScheme === c.value ? ' active' : ''}`}
              onClick={() => set({ colorScheme: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
        {scene.colorScheme === 'solid' && (
          <label className="color-row">
            <span>Pick color</span>
            <input
              type="color"
              value={scene.solidColor}
              onChange={(e) => set({ solidColor: e.target.value })}
            />
          </label>
        )}
      </section>

      <section className="panel-group">
        <h3>Background</h3>
        <div className="chip-row">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.value}
              className={`chip${scene.background === b.value ? ' active' : ''}`}
              onClick={() => set({ background: b.value })}
            >
              {b.label}
            </button>
          ))}
          <input
            type="color"
            className="chip-color"
            value={scene.background === 'transparent' ? '#ffffff' : scene.background}
            onChange={(e) => set({ background: e.target.value })}
            title="Custom background color"
          />
        </div>
      </section>
    </aside>
  )
}
