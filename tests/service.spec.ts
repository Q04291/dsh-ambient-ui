import { describe, expect, it } from 'vitest'
import { AmbientService } from '../src/service.ts'

/** Minimal ctx with an in-memory settings seam. */
function makeCtx(initial: Record<string, unknown>) {
  const store = new Map<string, Record<string, unknown>>()
  if (initial !== undefined) store.set('ambient', initial)
  return {
    reflect: { provide() {} },
    get(name: string): unknown {
      if (name === 'settings') {
        return {
          get: (ns: string) => store.get(ns),
          mutate: async (ns: string, ops: readonly { op: 'set' | 'unset'; path: string[]; value?: unknown }[]) => {
            const cur = { ...(store.get(ns) ?? {}) }
            for (const op of ops) {
              if (op.op === 'set' && op.path.length === 1) cur[op.path[0]] = op.value
              else if (op.op === 'unset' && op.path.length === 1) delete cur[op.path[0]]
            }
            store.set(ns, cur)
          },
        }
      }
      return undefined
    },
  }
}

describe('AmbientService config', () => {
  it('readConfig normalizes the stored section', () => {
    const svc = new AmbientService(makeCtx({ opacity: 0.5, blur: 99 }) as never, {})
    const v = svc.readConfig()
    expect(v.opacity).toBe(0.5)
    expect(v.blur).toBe(30) // clamped
    expect(v.speed).toBe(5)
  })

  it('writeConfig merges a partial patch and persists', async () => {
    const svc = new AmbientService(makeCtx({ opacity: 0.85, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true }) as never, {})
    const v = await svc.writeConfig({ opacity: 0.7, showTrail: false })
    expect(v.opacity).toBe(0.7)
    expect(v.showTrail).toBe(false)
    expect(v.blur).toBe(12) // untouched field preserved
    const again = svc.readConfig()
    expect(again.opacity).toBe(0.7)
    expect(again.showTrail).toBe(false)
  })

  it('writeConfig clamps out-of-range values', async () => {
    const svc = new AmbientService(makeCtx({ opacity: 0.85, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true }) as never, {})
    const v = await svc.writeConfig({ opacity: 3, blur: -5, speed: 42 })
    expect(v.opacity).toBe(1)
    expect(v.blur).toBe(0)
    expect(v.speed).toBe(10)
  })
})
