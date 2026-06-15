import * as $3Dmol from '3dmol'

/**
 * The single source of truth for how a structure is drawn.
 * Phases 3 (animation), 4 (export) and 6 (AI) all read/write this object,
 * so keep it serializable and self-contained.
 */
export interface SceneConfig {
  representation: Representation
  colorScheme: ColorScheme
  solidColor: string // used when colorScheme === 'solid' (hex)
  background: string // hex string, or the literal 'transparent'
}

export type Representation = 'cartoon' | 'surface' | 'stick' | 'sphere' | 'line'
export type ColorScheme = 'spectrum' | 'chain' | 'ssJmol' | 'bfactor' | 'solid'

export const DEFAULT_SCENE: SceneConfig = {
  representation: 'cartoon',
  colorScheme: 'spectrum',
  solidColor: '#4c8dd8',
  background: '#ffffff',
}

export const REPRESENTATIONS: { value: Representation; label: string }[] = [
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'surface', label: 'Surface' },
  { value: 'stick', label: 'Sticks' },
  { value: 'sphere', label: 'Spheres' },
  { value: 'line', label: 'Lines' },
]

export const COLOR_SCHEMES: { value: ColorScheme; label: string }[] = [
  { value: 'spectrum', label: 'Rainbow (N→C)' },
  { value: 'chain', label: 'By chain' },
  { value: 'ssJmol', label: 'Secondary structure' },
  { value: 'bfactor', label: 'B-factor / pLDDT' },
  { value: 'solid', label: 'Solid color' },
]

export interface Preset {
  name: string
  scene: SceneConfig
}

export const PRESETS: Preset[] = [
  {
    name: 'Publication',
    scene: { representation: 'cartoon', colorScheme: 'spectrum', solidColor: '#4c8dd8', background: '#ffffff' },
  },
  {
    name: 'By chain',
    scene: { representation: 'cartoon', colorScheme: 'chain', solidColor: '#4c8dd8', background: '#ffffff' },
  },
  {
    name: 'Dark',
    scene: { representation: 'cartoon', colorScheme: 'ssJmol', solidColor: '#4c8dd8', background: '#0d1117' },
  },
  {
    name: 'Surface',
    scene: { representation: 'surface', colorScheme: 'solid', solidColor: '#9aa7b3', background: '#0d1117' },
  },
]

type ColorPart =
  | { color: string }
  | { colorscheme: string | { prop: string; gradient: string } }

/** Translate the chosen color scheme into a 3Dmol color spec fragment. */
function colorPart(config: SceneConfig): ColorPart {
  switch (config.colorScheme) {
    case 'spectrum':
      return { color: 'spectrum' }
    case 'solid':
      return { color: config.solidColor }
    case 'chain':
      return { colorscheme: 'chain' }
    case 'ssJmol':
      return { colorscheme: 'ssJmol' }
    case 'bfactor':
      return { colorscheme: { prop: 'b', gradient: 'roygb' } }
  }
}

/**
 * Apply a SceneConfig to an existing, already-loaded viewer.
 * Does NOT reset the camera — restyling shouldn't yank the view around.
 */
export function applyScene(viewer: $3Dmol.GLViewer, config: SceneConfig): void {
  viewer.removeAllSurfaces()
  const color = colorPart(config)

  if (config.representation === 'surface') {
    viewer.setStyle({}, {})
    viewer.addSurface('MS', { opacity: 1, ...color })
  } else {
    const c = { ...color }
    const style =
      config.representation === 'cartoon'
        ? { cartoon: c }
        : config.representation === 'stick'
          ? { stick: c }
          : config.representation === 'sphere'
            ? { sphere: c }
            : { line: c }
    viewer.setStyle({}, style)
  }

  if (config.background === 'transparent') {
    viewer.setBackgroundColor(0xffffff, 0)
  } else {
    viewer.setBackgroundColor(config.background, 1)
  }

  viewer.render()
}
