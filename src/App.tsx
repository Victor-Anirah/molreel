import { useState } from 'react'
import './App.css'
import { MoleculeViewer } from './MoleculeViewer'
import { StylePanel } from './StylePanel'
import { AnimationControls } from './AnimationControls'
import { DEFAULT_SCENE, type SceneConfig } from './scene'
import { DEFAULT_ANIMATION, type AnimationConfig } from './animation'

function App() {
  // The ID currently rendered, and the editable input value (kept separate so
  // typing doesn't trigger a reload on every keystroke — only on submit).
  const [pdbId, setPdbId] = useState('1CRN')
  const [inputValue, setInputValue] = useState('1CRN')
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE)
  const [animation, setAnimation] = useState<AnimationConfig>(DEFAULT_ANIMATION)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = inputValue.trim()
    if (id) setPdbId(id)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">MolReel</div>
        <form className="loader" onSubmit={handleSubmit}>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="PDB ID — e.g. 1CRN, 4HHB"
            spellCheck={false}
            autoComplete="off"
            aria-label="PDB ID"
          />
          <button type="submit">Load</button>
        </form>
      </header>
      <div className="body">
        <StylePanel scene={scene} onChange={setScene} />
        <MoleculeViewer
          pdbId={pdbId}
          scene={scene}
          animation={animation}
          isPlaying={isPlaying}
        />
      </div>
      <AnimationControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        animation={animation}
        onChange={setAnimation}
      />
    </div>
  )
}

export default App
