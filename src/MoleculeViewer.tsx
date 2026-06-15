import { useEffect, useRef, useState } from 'react'
import * as $3Dmol from '3dmol'
import { applyScene, type SceneConfig } from './scene'
import { angleAt, type AnimationConfig } from './animation'

type Status = 'loading' | 'ready' | 'error'

interface MoleculeViewerProps {
  /** 4-character RCSB PDB ID, e.g. "1CRN" or "4HHB". */
  pdbId: string
  /** How to draw the structure. */
  scene: SceneConfig
  /** Animation timeline settings. */
  animation: AnimationConfig
  /** Whether the animation is currently playing. */
  isPlaying: boolean
}

/**
 * Renders a protein structure in 3D using 3Dmol.js.
 * Loading the structure (on `pdbId` change) and styling it (on `scene` change)
 * are kept separate so restyling never refetches or resets the camera.
 */
export function MoleculeViewer({
  pdbId,
  scene,
  animation,
  isPlaying,
}: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<$3Dmol.GLViewer | null>(null)
  const modelLoadedRef = useRef(false)
  // Latest scene, readable inside the load effect without making it a dependency.
  const sceneRef = useRef(scene)
  sceneRef.current = scene

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  // Create the WebGL viewer once, attached to the container div.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = $3Dmol.createViewer(container, { backgroundColor: 'white' })
    viewerRef.current = viewer

    const handleResize = () => viewer.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      viewer.clear()
      viewerRef.current = null
      modelLoadedRef.current = false
      // 3Dmol appends a canvas outside React's control; remove it so a
      // StrictMode remount doesn't stack duplicate canvases.
      container.innerHTML = ''
    }
  }, [])

  // Load a structure whenever the PDB ID changes.
  useEffect(() => {
    const viewer = viewerRef.current
    const id = pdbId.trim().toUpperCase()
    if (!viewer || !id) return

    let cancelled = false
    modelLoadedRef.current = false
    setStatus('loading')
    setError('')

    fetch(`https://files.rcsb.org/download/${id}.pdb`)
      .then((res) => {
        if (!res.ok) throw new Error(`No structure found for "${id}".`)
        return res.text()
      })
      .then((pdbData) => {
        if (cancelled) return
        viewer.clear()
        viewer.addModel(pdbData, 'pdb')
        applyScene(viewer, sceneRef.current)
        viewer.zoomTo()
        viewer.render()
        modelLoadedRef.current = true
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load structure.')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [pdbId])

  // Re-apply styling when the scene changes (no refetch, no camera reset).
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !modelLoadedRef.current) return
    applyScene(viewer, scene)
  }, [scene])

  // Drive playback. We apply incremental Y-rotation deltas (target − previous),
  // so the spin continues smoothly from wherever the model currently sits and
  // loops seamlessly. The same angleAt() timeline powers frame export later.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !isPlaying) return

    let raf = 0
    let startTime = 0
    let prevAngle = 0

    const loop = (now: number) => {
      if (startTime === 0) startTime = now
      const elapsed = (now - startTime) % animation.durationMs
      const t = elapsed / animation.durationMs
      const target = angleAt(animation, t)
      viewer.rotate(target - prevAngle, 'y')
      prevAngle = target
      viewer.render()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, animation])

  return (
    <div className="viewer-wrap">
      <div ref={containerRef} className="viewer-canvas" />
      {status === 'loading' && (
        <div className="viewer-overlay">Loading {pdbId.toUpperCase()}…</div>
      )}
      {status === 'error' && (
        <div className="viewer-overlay viewer-overlay--error">{error}</div>
      )}
    </div>
  )
}
