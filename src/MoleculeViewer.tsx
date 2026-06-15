import { useEffect, useRef, useState } from 'react'
import * as $3Dmol from '3dmol'

type Status = 'loading' | 'ready' | 'error'

interface MoleculeViewerProps {
  /** 4-character RCSB PDB ID, e.g. "1CRN" or "4HHB". */
  pdbId: string
}

/**
 * Renders a protein structure in 3D using 3Dmol.js.
 * Fetches the .pdb file from RCSB by ID and draws it as a cartoon.
 */
export function MoleculeViewer({ pdbId }: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<$3Dmol.GLViewer | null>(null)
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
      // 3Dmol appends a canvas outside React's control; remove it so a
      // StrictMode remount doesn't stack duplicate canvases.
      container.innerHTML = ''
    }
  }, [])

  // (Re)load a structure whenever the PDB ID changes.
  useEffect(() => {
    const viewer = viewerRef.current
    const id = pdbId.trim().toUpperCase()
    if (!viewer || !id) return

    let cancelled = false
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
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
        viewer.zoomTo()
        viewer.render()
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
