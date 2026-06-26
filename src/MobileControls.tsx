import type { ReactNode } from 'react'
import { Download, Pause, Play, SlidersHorizontal, X } from 'lucide-react'

interface MobileControlsProps {
  isPlaying: boolean
  onTogglePlay: () => void
  onExport: () => void
  exporting: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** Sheet contents — the styling + animation controls. */
  children: ReactNode
}

/**
 * Mobile-only: a floating action bar (Play / Style / Export) plus a slide-up
 * bottom sheet that holds the styling + animation controls, so the protein can
 * stay full-bleed and immersive.
 */
export function MobileControls({
  isPlaying,
  onTogglePlay,
  onExport,
  exporting,
  open,
  onOpen,
  onClose,
  children,
}: MobileControlsProps) {
  return (
    <>
      {open && (
        <>
          <div className="m-backdrop" onClick={onClose} />
          <div className="m-sheet" role="dialog" aria-label="Style & animation controls">
            <div className="m-sheet-head">
              <div className="m-handle" />
              <button className="m-sheet-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="m-sheet-body">{children}</div>
          </div>
        </>
      )}

      <div className="m-toolbar">
        <button
          className="m-tool m-tool--primary"
          onClick={onTogglePlay}
          disabled={exporting}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button className="m-tool" onClick={onOpen} aria-label="Style and animation">
          <SlidersHorizontal size={18} />
          Style
        </button>
        <button
          className="m-tool"
          onClick={onExport}
          disabled={exporting}
          aria-label="Export"
        >
          <Download size={18} />
          {exporting ? 'Rendering…' : 'Export'}
        </button>
      </div>
    </>
  )
}
