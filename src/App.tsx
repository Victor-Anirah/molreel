import { useRef, useState } from 'react'
import './App.css'
import { MoleculeViewer, type MoleculeViewerHandle } from './MoleculeViewer'
import { StylePanel } from './StylePanel'
import { AnimationControls } from './AnimationControls'
import { SourceBar } from './SourceBar'
import { downloadBlob, type ExportFormat } from './exporter'
import { DEFAULT_SCENE, type SceneConfig } from './scene'
import { DEFAULT_ANIMATION, type AnimationConfig } from './animation'
import { sourceBaseName, type StructureSource } from './structureSource'

function App() {
  const [source, setSource] = useState<StructureSource>({ kind: 'pdb', id: '1CRN' })
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE)
  const [animation, setAnimation] = useState<AnimationConfig>(DEFAULT_ANIMATION)
  const [isPlaying, setIsPlaying] = useState(false)
  const [maxEdge, setMaxEdge] = useState(720)
  const [format, setFormat] = useState<ExportFormat>('gif')
  const [exportProgress, setExportProgress] = useState<number | null>(null)

  const viewerRef = useRef<MoleculeViewerHandle>(null)

  const handleExport = async () => {
    if (!viewerRef.current) return
    setIsPlaying(false)
    setExportProgress(0)
    try {
      const blob = await viewerRef.current.exportAnimation(format, maxEdge, setExportProgress)
      downloadBlob(blob, `${sourceBaseName(source)}_${animation.type}.${format}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setExportProgress(null)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">MolReel</div>
        <SourceBar onLoad={setSource} />
      </header>
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
    </div>
  )
}

export default App
