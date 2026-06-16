/**
 * Where a structure comes from. The viewer resolves any of these to raw
 * PDB/CIF text before handing it to 3Dmol.
 */
export type StructureSource =
  | { kind: 'pdb'; id: string }
  | { kind: 'alphafold'; uniprot: string }
  | { kind: 'file'; name: string; data: string; format: 'pdb' | 'cif' }

/** Stable string key for React effect dependencies. */
export function sourceKey(s: StructureSource): string {
  switch (s.kind) {
    case 'pdb':
      return `pdb:${s.id.toUpperCase()}`
    case 'alphafold':
      return `af:${s.uniprot.toUpperCase()}`
    case 'file':
      return `file:${s.name}:${s.data.length}`
  }
}

/** Human label for loading/status text. */
export function sourceLabel(s: StructureSource): string {
  switch (s.kind) {
    case 'pdb':
      return s.id.toUpperCase()
    case 'alphafold':
      return `AlphaFold ${s.uniprot.toUpperCase()}`
    case 'file':
      return s.name
  }
}

/** Base filename (no extension) for exported files. */
export function sourceBaseName(s: StructureSource): string {
  switch (s.kind) {
    case 'pdb':
      return s.id.toLowerCase()
    case 'alphafold':
      return s.uniprot.toLowerCase()
    case 'file':
      return s.name.replace(/\.[^.]+$/, '').toLowerCase()
  }
}

/** Fetch/parse a source into model text + the 3Dmol format string. */
export async function resolveStructure(
  s: StructureSource,
): Promise<{ data: string; format: 'pdb' | 'cif' }> {
  switch (s.kind) {
    case 'pdb': {
      const id = s.id.trim().toUpperCase()
      const res = await fetch(`https://files.rcsb.org/download/${id}.pdb`)
      if (!res.ok) throw new Error(`No PDB structure found for "${id}".`)
      return { data: await res.text(), format: 'pdb' }
    }
    case 'alphafold': {
      const up = s.uniprot.trim().toUpperCase()
      // Ask the API for the current file URL — the model version (v4, v6, …)
      // changes over time, so we never hardcode it.
      const apiRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${up}`)
      if (!apiRes.ok) {
        throw new Error(`No AlphaFold model found for UniProt "${up}".`)
      }
      const entries: Array<{ pdbUrl?: string }> = await apiRes.json()
      const pdbUrl = entries[0]?.pdbUrl
      if (!pdbUrl) {
        throw new Error(`No AlphaFold model found for UniProt "${up}".`)
      }
      const res = await fetch(pdbUrl)
      if (!res.ok) {
        throw new Error(`Could not download the AlphaFold model for "${up}".`)
      }
      return { data: await res.text(), format: 'pdb' }
    }
    case 'file':
      return { data: s.data, format: s.format }
  }
}
