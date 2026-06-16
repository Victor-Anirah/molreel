import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import * as $3Dmol from '3dmol'
import { applyScene, type SceneConfig } from './scene'
import { angleAt, type AnimationConfig } from './animation'
import {
  createGifSink,
  createMp4Sink,
  drawToCanvas,
  loadImage,
  scaledSize,
  type ExportFormat,
} from './exporter'

type Status = 'loading' | 'ready' | 'error'

export interface MoleculeViewerHandle {
  /** Render the animation frame-by-frame and encode it to a GIF/MP4 Blob. */
  exportAnimation: (
    format: ExportFormat,
    maxEdge: number,
    onProgress: (fraction: number) => void,
  ) => Promise<Blob>
}

interface MoleculeViewerProps {
  /** 4-character RCSB PDB ID, e.g. "1CRN" or "4HHB". */
  pdbId: string
  /** How to draw the structure. */
  scene: SceneConfig
  /** Animation timeline settings. */
  animation: AnimationConfig
  /** Whether the animation is currently playing. */
  isPlaying: boolean
  /** Export progress 0–1, or null when not exporting (for the overlay). */
  exportProgress: number | null
}

/**
 * Renders a protein structure in 3D using 3Dmol.js.
 * Loading the structure (on `pdbId` change) and styling it (on `scene` change)
 * are kept separate so restyling never refetches or resets the camera.
 */
export const MoleculeViewer = forwardRef<MoleculeViewerHandle, MoleculeViewerProps>(
  function MoleculeViewer({ pdbId, scene, animation, isPlaying, exportProgress }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<$3Dmol.GLViewer | null>(null)
    const modelLoadedRef = useRef(false)
    // Latest props, readable inside callbacks/effects without re-subscribing.
    const sceneRef = useRef(scene)
    sceneRef.current = scene
    const animationRef = useRef(animation)
    animationRef.current = animation

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
    // loops seamlessly. The same angleAt() timeline powers frame export below.
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

    // Expose frame-by-frame export. Steps the SAME angleAt() timeline used for
    // playback, so the GIF matches the preview by construction.
    useImperativeHandle(ref, () => ({
      async exportAnimation(format, maxEdge, onProgress) {
        const viewer = viewerRef.current
        if (!viewer || !modelLoadedRef.current) {
          throw new Error('Load a structure before exporting.')
        }
        const anim = animationRef.current
        const background = sceneRef.current.background
        const fps = 20
        const frames = Math.min(
          120,
          Math.max(12, Math.round((anim.durationMs / 1000) * fps)),
        )
        const delayMs = Math.round(1000 / fps)

        // Render at the full target resolution during export. On-screen the
        // viewer is only CSS-pixel sized, so capturing it directly looks soft;
        // here we drive the canvas up to `maxEdge` (long edge), preserving the
        // current aspect ratio so the framing is unchanged.
        const domCanvas = viewer.getCanvas()
        const curW = domCanvas.width || domCanvas.clientWidth || 1
        const curH = domCanvas.height || domCanvas.clientHeight || 1
        const aspect = curW / curH
        const renderW = aspect >= 1 ? maxEdge : Math.round(maxEdge * aspect)
        const renderH = aspect >= 1 ? Math.round(maxEdge / aspect) : maxEdge

        viewer.setWidth(renderW)
        viewer.setHeight(renderH)
        viewer.render()

        let prevAngle = 0
        try {
          // Lock the output dimensions up front (even-sized for H.264).
          const probe = await loadImage(viewer.pngURI())
          const { width, height } = scaledSize(probe, maxEdge, format === 'mp4')

          const sink =
            format === 'mp4'
              ? await createMp4Sink(width, height, fps)
              : createGifSink(delayMs)

          for (let i = 0; i < frames; i++) {
            const t = i / frames
            const target = angleAt(anim, t)
            viewer.rotate(target - prevAngle, 'y')
            prevAngle = target
            viewer.render()

            const img = await loadImage(viewer.pngURI())
            const canvas = drawToCanvas(img, width, height, background)
            sink.addFrame(canvas, i)

            onProgress((i + 1) / frames)
            // Yield so the progress overlay can repaint between frames.
            await new Promise((r) => setTimeout(r, 0))
          }
          return await sink.finish()
        } finally {
          // Restore the original orientation and snap the canvas back to its
          // on-screen (container) size.
          viewer.rotate(-prevAngle, 'y')
          viewer.resize()
          viewer.render()
        }
      },
    }))

    return (
      <div className="viewer-wrap">
        <div ref={containerRef} className="viewer-canvas" />
        {status === 'loading' && (
          <div className="viewer-overlay">Loading {pdbId.toUpperCase()}…</div>
        )}
        {status === 'error' && (
          <div className="viewer-overlay viewer-overlay--error">{error}</div>
        )}
        {exportProgress !== null && (
          <div className="viewer-cover">
            <div className="viewer-cover__text">
              Rendering… {Math.round(exportProgress * 100)}%
            </div>
          </div>
        )}
      </div>
    )
  },
)
