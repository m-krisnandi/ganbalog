import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { loadEnv } from 'vite'

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function handleGeneratePlan(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>,
): Promise<void> {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  const { default: handler } = await import('../api/generate-plan.ts')
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const request = new Request('http://localhost/api/generate-plan', {
    method: req.method,
    headers,
    body: body && body.length > 0 ? new Uint8Array(body) : undefined,
  })

  const response = await handler(request)
  res.statusCode = response.status
  response.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value)
  })
  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}

function attachApiMiddleware(middlewares: Connect.Server, env: Record<string, string>) {
  middlewares.use((req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/api/generate-plan') {
      next()
      return
    }

    void handleGeneratePlan(req, res, env).catch((error: unknown) => {
      console.error('[vite-api] generate-plan failed', error)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'generate_failed' }))
      }
    })
  })
}

/** Serves `/api/generate-plan` during `vite` / `vite preview` (Vercel functions are prod-only). */
export function localGeneratePlanApi(): Plugin {
  return {
    name: 'local-generate-plan-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      attachApiMiddleware(server.middlewares, env)
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '')
      attachApiMiddleware(server.middlewares, env)
    },
  }
}
