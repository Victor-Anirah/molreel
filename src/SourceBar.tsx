import { useRef, useState } from 'react'
import type { StructureSource } from './structureSource'

const EXAMPLES: { id: string; label: string }[] = [
  { id: '1CRN', label: '1CRN · crambin' },
  { id: '4HHB', label: '4HHB · hemoglobin' },
  { id: '6LU7', label: '6LU7 · SARS-CoV-2 protease' },
  { id: '1UBQ', label: '1UBQ · ubiquitin' },
]

type SourceType = 'pdb' | 'alphafold'

interface SourceBarProps {
  onLoad: (source: StructureSource) => void
}

export function SourceBar({ onLoad }: SourceBarProps) {
  const [type, setType] = useState<SourceType>('pdb')
  const [value, setValue] = useState('1CRN')
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    onLoad(type === 'pdb' ? { kind: 'pdb', id: v } : { kind: 'alphafold', uniprot: v })
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await file.text()
    const lower = file.name.toLowerCase()
    const format = lower.endsWith('.cif') || lower.endsWith('.mmcif') ? 'cif' : 'pdb'
    onLoad({ kind: 'file', name: file.name, data, format })
    e.target.value = '' // allow re-uploading the same file
  }

  return (
    <div className="sourcebar">
      <form className="loader" onSubmit={submit}>
        <select
          className="source-type"
          value={type}
          onChange={(e) => setType(e.target.value as SourceType)}
          aria-label="Source type"
        >
          <option value="pdb">PDB ID</option>
          <option value="alphafold">AlphaFold</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'pdb' ? 'e.g. 1CRN, 4HHB' : 'UniProt e.g. P69905'}
          spellCheck={false}
          autoComplete="off"
          aria-label="Structure identifier"
        />
        <button type="submit">Load</button>
        <button
          type="button"
          className="upload-btn"
          onClick={() => fileRef.current?.click()}
        >
          Upload
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdb,.cif,.mmcif,.ent"
          onChange={onFile}
          hidden
        />
      </form>

      <div className="examples">
        <span className="examples-label">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            className="example-chip"
            onClick={() => onLoad({ kind: 'pdb', id: ex.id })}
            title={ex.label}
          >
            {ex.id}
          </button>
        ))}
      </div>
    </div>
  )
}
