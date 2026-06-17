# MolReel

**Protein structure animations, without the PyMOL pain.**

Load a protein structure in your browser, style it, and export a clean GIF or MP4 animation — or just *describe* the animation in plain English (type or speak) and let AI build the scene.

🔗 **Live:** [molreel.vercel.app](https://molreel.vercel.app)

---

## What it does

- **Load any structure** — by PDB ID, by AlphaFold UniProt ID, or upload your own `.pdb` / `.cif` file.
- **Style it** — representations (cartoon, surface, sticks, spheres, lines), color schemes (rainbow, by chain, secondary structure, B-factor / pLDDT confidence, solid), backgrounds, and tasteful presets.
- **Animate** — smooth turntable spin or gentle rock, with speed control.
- **Export** — a looping **GIF** or **MP4**, rendered at full resolution. This is the part PyMOL makes painful.
- **Describe it with AI** ✨ — type or **speak** a sentence ("color by chain, dark background, slow spin") and it builds the scene for you.

## Tech

- **Vite + React + TypeScript**
- **[3Dmol.js](https://3dmol.csb.pitt.edu/)** for WebGL molecular rendering
- **gifenc** (GIF) + **WebCodecs / mp4-muxer** (MP4) for in-browser export
- **Web Speech API** for voice input
- **Claude** (`claude-opus-4-8`, structured outputs) via a serverless function for the describe-to-scene feature
- Deployed on **Vercel**

## Run locally

```bash
npm install
npm run dev
```

The AI feature needs an Anthropic API key. Copy `.env.example` to `.env.local` and add yours:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

(Without a key, everything except the ✨ AI feature works.)

## Build

```bash
npm run build   # type-check + production build
```

---

Built in public. Structures from the [RCSB PDB](https://www.rcsb.org/) and [AlphaFold DB](https://alphafold.ebi.ac.uk/).
