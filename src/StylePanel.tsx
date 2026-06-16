import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
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

/** Collapsible sidebar section (native <details>, no extra state). */
function PanelGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details className="panel-group" open={defaultOpen}>
      <summary className="panel-head">
        <span>{title}</span>
        <ChevronDown className="panel-chevron" size={15} />
      </summary>
      <div className="panel-body">{children}</div>
    </details>
  )
}

const BG_SWATCHES: { value: string; label: string }[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#f4f6f5', label: 'Off-white' },
  { value: '#0d1117', label: 'Dark' },
  { value: '#000000', label: 'Black' },
]

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function StylePanel({ scene, onChange }: StylePanelProps) {
  const set = (patch: Partial<SceneConfig>) => onChange({ ...scene, ...patch })

  const isPresetBg = BG_SWATCHES.some((s) => s.value === scene.background)
  const isCustomBg = scene.background !== 'transparent' && !isPresetBg

  // Free-typing hex field that only applies once it's a valid #RRGGBB.
  const [hexText, setHexText] = useState(scene.background)
  useEffect(() => {
    if (scene.background !== 'transparent') setHexText(scene.background)
  }, [scene.background])

  const onHexChange = (v: string) => {
    setHexText(v)
    if (HEX_RE.test(v)) set({ background: v })
  }

  return (
    <aside className="sidebar">
      <PanelGroup title="Presets">
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
      </PanelGroup>

      <PanelGroup title="Representation">
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
      </PanelGroup>

      <PanelGroup title="Color">
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
        {scene.colorScheme === 'bfactor' && (
          <div className="legend">
            <div className="legend-bar" />
            <div className="legend-labels">
              <span>Low</span>
              <span>confidence (pLDDT) / B-factor</span>
              <span>High</span>
            </div>
          </div>
        )}
      </PanelGroup>

      <PanelGroup title="Background">
        <div className="swatch-row">
          {BG_SWATCHES.map((b) => (
            <button
              key={b.value}
              type="button"
              className={`swatch${scene.background === b.value ? ' active' : ''}`}
              style={{ background: b.value }}
              onClick={() => set({ background: b.value })}
              title={b.label}
              aria-label={b.label}
            />
          ))}
          <button
            type="button"
            className={`swatch swatch--transparent${
              scene.background === 'transparent' ? ' active' : ''
            }`}
            onClick={() => set({ background: 'transparent' })}
            title="Transparent"
            aria-label="Transparent"
          />
          <label
            className={`swatch swatch--custom${isCustomBg ? ' active' : ''}`}
            title="Custom color"
            style={isCustomBg ? { background: scene.background } : undefined}
          >
            <input
              type="color"
              value={isCustomBg ? scene.background : '#3aa6a0'}
              onChange={(e) => set({ background: e.target.value })}
              aria-label="Custom background color"
            />
          </label>
        </div>
        <input
          className="hex-input"
          type="text"
          spellCheck={false}
          value={scene.background === 'transparent' ? '' : hexText}
          placeholder={scene.background === 'transparent' ? 'transparent' : '#RRGGBB'}
          onChange={(e) => onHexChange(e.target.value)}
          aria-label="Background hex color"
        />
      </PanelGroup>
    </aside>
  )
}
