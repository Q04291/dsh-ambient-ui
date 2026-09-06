import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { makeAmbientRoutes } from '../src/routes.ts'
import type { AmbientService } from '../src/service.ts'

function fakeService(): unknown {
  return {
    view: async () => ({ fetchedAt: 0, available: true, balances: [] }),
    refresh: async () => ({ fetchedAt: 0, available: true, balances: [] }),
    tokens: () => ({ ok: false }),
  }
}

/** Capture the single JSON body a handler writes. */
async function handle(route: { handler(req: IncomingMessage, res: ServerResponse): void }, req: Partial<IncomingMessage>): Promise<unknown> {
  const body: unknown[] = []
  const res = { writeHead: () => {}, end: (chunk: unknown) => { body.push(chunk) } } as unknown as ServerResponse
  route.handler({ method: 'GET', url: '/api/ambient/x', ...req } as IncomingMessage, res)
  await new Promise((r) => setTimeout(r, 10))
  return body.length === 0 ? undefined : JSON.parse(String(body[0]))
}

describe('makeAmbientRoutes', () => {
  it('registers only the balance and token exact routes', () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined)
    const paths = routes.filter((r) => r.kind === 'exact').map((r) => r.path)
    expect(paths).toEqual([
      '/api/ambient/balance',
      '/api/ambient/balance/refresh',
      '/api/ambient/tokens',
    ])
  })

  it('answers 405 for a non-GET method on /api/ambient/balance', async () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined)
    const route = routes.find((r) => r.kind === 'exact' && r.path === '/api/ambient/balance')!
    let status = 0
    const body: unknown[] = []
    const res = { writeHead: (s: number) => { status = s }, end: (chunk: unknown) => { body.push(chunk) } } as unknown as ServerResponse
    route.handler({ method: 'PUT', url: '/api/ambient/balance' } as IncomingMessage, res)
    await new Promise((r) => setTimeout(r, 5))
    expect(status).toBe(405)
    expect(JSON.parse(String(body[0]))).toEqual({ ok: false, error: 'method-not-allowed' })
  })

  it('answers /api/ambient/tokens without a session with missing-session', async () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined)
    const route = routes.find((r) => r.kind === 'exact' && r.path === '/api/ambient/tokens')!
    const value = await handle(route, { url: '/api/ambient/tokens' })
    expect(value).toEqual({ ok: false, error: 'missing-session' })
  })

  it('answers /api/ambient/tokens with an unknown session with unknown-session', async () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined)
    const route = routes.find((r) => r.kind === 'exact' && r.path === '/api/ambient/tokens')!
    const value = await handle(route, { url: '/api/ambient/tokens?session=nope' })
    expect(value).toEqual({ ok: false, error: 'unknown-session' })
  })
})
