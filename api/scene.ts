import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/scene
 * Body: { prompt: string }
 * Returns a strict JSON scene/animation config produced by Claude.
 *
 * Runs both as a Vercel serverless function (production) and via the Vite dev
 * middleware (local). The API key is read from process.env and never reaches
 * the browser.
 */

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    representation: {
      type: 'string',
      enum: ['cartoon', 'surface', 'stick', 'sphere', 'line'],
    },
    colorScheme: {
      type: 'string',
      enum: ['spectrum', 'chain', 'ssJmol', 'bfactor', 'solid'],
    },
    solidColor: {
      type: 'string',
      description: 'Hex color, only used when colorScheme is "solid", e.g. #4c8dd8',
    },
    background: {
      type: 'string',
      description: "Hex color, or 'transparent'. #ffffff for white, #0d1117 for dark.",
    },
    animationType: { type: 'string', enum: ['turntable', 'rock'] },
    speed: { type: 'string', enum: ['slow', 'medium', 'fast'] },
  },
  required: [
    'representation',
    'colorScheme',
    'solidColor',
    'background',
    'animationType',
    'speed',
  ],
}

const SYSTEM = `You turn a user's plain-English description of how they want a protein-structure animation to look into a strict JSON configuration for the MolReel viewer.

Field options:
- representation: "cartoon" (ribbon — the best default), "surface" (molecular surface), "stick", "sphere", "line".
- colorScheme: "spectrum" (rainbow N→C), "chain" (color by chain), "ssJmol" (by secondary structure), "bfactor" (by B-factor / AlphaFold pLDDT confidence), "solid" (a single solidColor).
- solidColor: a hex color; only meaningful when colorScheme is "solid".
- background: "#ffffff" (white), "#0d1117" (dark), "transparent", or any hex.
- animationType: "turntable" (full 360° spin) or "rock" (gentle side-to-side).
- speed: "slow", "medium", or "fast".

Map the description to sensible values. If the description is vague, prefer cartoon + spectrum + #ffffff + turntable + medium.`

async function readJsonBody(req: any): Promise<any> {
  // Vercel's Node runtime pre-parses JSON into req.body; the Vite dev
  // middleware does not, so fall back to reading the raw stream.
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    sendJson(res, 500, {
      error: 'Server is missing ANTHROPIC_API_KEY. Add it to .env.local (local) or the Vercel env vars (production).',
    })
    return
  }

  try {
    const body = await readJsonBody(req)
    const prompt = String(body?.prompt ?? '').slice(0, 500).trim()
    if (!prompt) {
      sendJson(res, 400, { error: 'Please describe the animation you want.' })
      return
    }

    const client = new Anthropic({ apiKey })
    const params: any = {
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    }
    const message: any = await client.messages.create(params)

    const textBlock = message.content?.find((b: any) => b.type === 'text')
    const config = JSON.parse(textBlock?.text ?? '{}')
    sendJson(res, 200, config)
  } catch (err: any) {
    sendJson(res, 500, { error: err?.message ?? 'Generation failed.' })
  }
}
