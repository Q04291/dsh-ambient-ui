import { describe, expect, it } from 'vitest'
import { AmbientService } from '../src/service.ts'
import type { TokenMeasurement } from '@deepseek-ai/dsh-token-meter'

/** Minimal ctx exposing an optional token-meter service. */
function makeCtx(meter: { measure(): TokenMeasurement } | undefined) {
  return {
    reflect: { provide() {} },
    get(name: string): unknown {
      if (name === 'tokenMeter') return meter
      return undefined
    },
  }
}

/** Fake session object (the service only forwards it to the meter). */
const fakeSession = {} as never

describe('AmbientService tokens', () => {
  it('reports token-meter-unavailable when no token-meter service is mounted', () => {
    const svc = new AmbientService(makeCtx(undefined) as never, {})
    expect(svc.tokens(fakeSession)).toEqual({ ok: false, error: 'token-meter-unavailable' })
  })

  it('forwards the measurement totals', () => {
    const meter = { measure: () => ({ totalTokens: 1200, surfaceTokens: 300 }) }
    const svc = new AmbientService(makeCtx(meter) as never, {})
    expect(svc.tokens(fakeSession)).toEqual({ ok: true, totalTokens: 1200, surfaceTokens: 300 })
  })

  it('degrades a throwing meter into an error code', () => {
    const meter = { measure: () => { throw new Error('boom') } }
    const svc = new AmbientService(makeCtx(meter) as never, {})
    const view = svc.tokens(fakeSession)
    expect(view.ok).toBe(false)
    expect(view.error).toBe('boom')
  })
})
