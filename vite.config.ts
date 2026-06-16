import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Serves /api/scene from the same handler Vercel uses, so the AI feature works
// in `npm run dev` without a separate process. Dev-only (apply: 'serve').
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'molreel-dev-api',
    apply: 'serve',
    configureServer(server) {
      if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
      }
      server.middlewares.use('/api/scene', async (req, res, next) => {
        try {
          const mod = await server.ssrLoadModule('/api/scene.ts')
          await (mod.default as (req: unknown, res: unknown) => Promise<void>)(req, res)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApi(env)],
  }
})
