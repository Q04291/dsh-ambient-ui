import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { makeAmbientRoutes } from '../src/routes.ts'
import type { AmbientService } from '../src/service.ts'

function fakeService(): unknown {
  return {
    view: async () => ({ fetchedAt: 0, available: true, balances: [] }),
    refresh: async () => ({ fetchedAt: 0, available: true, balances: [] }),
    tokens: () => ({ ok: false }),
    readConfig: () => ({ opacity: 0.85, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true }),
    writeConfig: async (patch: object) => ({ opacity: 0.85, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true, ...patch }),
  }
}

describe('makeAmbientRoutes', () => {
  it('registers every exact path exactly once', () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined, () => [], () => undefined)
    const exact = routes.filter((r) => r.kind === 'exact')
    const paths = exact.map((r) => r.path)
    expect(paths).toContain('/api/ambient/config')
    expect(paths).toContain('/api/ambient/balance')
    expect(paths).toContain('/api/ambient/tokens')
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('serves GET /api/ambient/config through the merged route', async () => {
    const routes = makeAmbientRoutes(fakeService() as AmbientService, () => undefined, () => [], () => undefined)
    const route = routes.find((r) => r.kind === 'exact' && r.path === '/api/ambient/config')!
    const body: unknown[] = []
    const res = { writeHead: () => {}, end: (chunk: unknown) => { body.push(chunk) } } as unknown as ServerResponse
    route.handler({ method: 'GET', url: '/api/ambient/config' } as IncomingMessage, res)
    await new Promise((r) => setTimeout(r, 10))
    expect(body.length).toBe(1)
    const parsed = JSON.parse(String(body[0]))
    expect(parsed.opacity).toBe(0.85)
  })
})
