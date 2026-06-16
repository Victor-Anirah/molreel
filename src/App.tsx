import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { MoleculeViewer, type MoleculeViewerHandle } from './MoleculeViewer'
import { StylePanel } from './StylePanel'
import { AnimationControls } from './AnimationControls'
import { SourceBar } from './SourceBar'
import { AiBar } from './AiBar'
import { Toasts, type Toast, type ToastKind } from './Toasts'
import { downloadBlob, type ExportFormat } from './exporter'
import {
  COLOR_SCHEMES,
  DEFAULT_SCENE,
  REPRESENTATIONS,
  type SceneConfig,
} from './scene'
import { DEFAULT_ANIMATION, type AnimationConfig } from './animation'
import { sourceBaseName, type StructureSource } from './structureSource'

const SPEED_MS: Record<string, number> = { slow: 8000, medium: 4000, fast: 2000 }
const REP_VALUES = REPRESENTATIONS.map((r) => r.value) as string[]
const COLOR_VALUES = COLOR_SCHEMES.map((c) => c.value) as string[]

/** Small molecule glyph used as the brand mark. */
function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 24 24" aria-hidden width="22" height="22">
      <g fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round">
        <line x1="6" y1="7" x2="12" y2="12" />
        <line x1="12" y1="12" x2="18" y2="7" />
        <line x1="12" y1="12" x2="12" y2="19" />
      </g>
      <g fill="var(--accent)">
        <circle cx="6" cy="7" r="2.6" />
        <circle cx="18" cy="7" r="2.6" />
        <circle cx="12" cy="19" r="2.6" />
      </g>
      <circle cx="12" cy="12" r="2" fill="var(--accent-strong)" />
    </svg>
  )
}

function App() {
  const [source, setSource] = useState<StructureSource>({ kind: 'pdb', id: '1CRN' })
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE)
  const [animation, setAnimation] = useState<AnimationConfig>(DEFAULT_ANIMATION)
  const [isPlaying, setIsPlaying] = useState(false)
  const [maxEdge, setMaxEdge] = useState(720)
  const [format, setFormat] = useState<ExportFormat>('gif')
  const [exportProgress, setExportProgress] = useState<number | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const viewerRef = useRef<MoleculeViewerHandle>(null)

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  // One-time welcome tip.
  useEffect(() => {
    notify('Tip: describe an animation above, or pick an example structure.', 'info')
  }, [notify])

  // Space toggles play/pause (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
        return
      }
      e.preventDefault()
      setIsPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleGenerate = async (override?: string) => {
    const prompt = (override ?? aiPrompt).trim()
    if (!prompt) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Request failed (${res.status}).`)
      }
      const cfg = await res.json()
      // Defensively clamp to known values so a stray field can't break rendering.
      setScene({
        representation: REP_VALUES.includes(cfg.representation)
          ? cfg.representation
          : DEFAULT_SCENE.representation,
        colorScheme: COLOR_VALUES.includes(cfg.colorScheme)
          ? cfg.colorScheme
          : DEFAULT_SCENE.colorScheme,
        solidColor:
          typeof cfg.solidColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(cfg.solidColor)
            ? cfg.solidColor
            : DEFAULT_SCENE.solidColor,
        background:
          cfg.background === 'transparent' || /^#[0-9a-fA-F]{6}$/.test(cfg.background ?? '')
            ? cfg.background
            : DEFAULT_SCENE.background,
      })
      setAnimation((a) => ({
        ...a,
        type: cfg.animationType === 'rock' ? 'rock' : 'turntable',
        durationMs: SPEED_MS[cfg.speed] ?? DEFAULT_ANIMATION.durationMs,
      }))
      setIsPlaying(true)
      notify('Applied your description ✨', 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Generation failed.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleExport = async () => {
    if (!viewerRef.current) return
    setIsPlaying(false)
    setExportProgress(0)
    try {
      const blob = await viewerRef.current.exportAnimation(format, maxEdge, setExportProgress)
      const filename = `${sourceBaseName(source)}_${animation.type}.${format}`
      downloadBlob(blob, filename)
      notify(`Exported ${filename}`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export failed.', 'error')
    } finally {
      setExportProgress(null)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <LogoMark />
          MolReel
        </div>
        <SourceBar onLoad={setSource} />
      </header>
      <AiBar
        value={aiPrompt}
        onChange={setAiPrompt}
        onGenerate={handleGenerate}
        loading={aiLoading}
      />
      <div className="body">
        <StylePanel scene={scene} onChange={setScene} />
        <MoleculeViewer
          ref={viewerRef}
          source={source}
          scene={scene}
          animation={animation}
          isPlaying={isPlaying}
          exportProgress={exportProgress}
        />
      </div>
      <AnimationControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        animation={animation}
        onChange={setAnimation}
        maxEdge={maxEdge}
        onMaxEdgeChange={setMaxEdge}
        format={format}
        onFormatChange={setFormat}
        onExport={handleExport}
        exportProgress={exportProgress}
      />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
