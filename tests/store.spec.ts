import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachAmbientConfigScope, detachAmbientConfigScope, getAmbientConfigSnapshot,
  setAmbientConfig, subscribeAmbientConfig,
} from '../src/client/ambientConfigStore.ts'
import type { AmbientConfigScope } from '../src/client/ambientConfigStore.ts'

/** In-memory fake settings scope around one section document. */
function fakeScope(initial: Record<string, unknown> | undefined): {
  scope: AmbientConfigScope
  setDoc(next: Record<string, unknown> | undefined): void
} {
  const listeners = new Set<() => void>()
  const doc: { value: Record<string, unknown> | undefined } = { value: initial }
  const notify = (): void => { for (const listener of [...listeners]) listener() }
  const scope: AmbientConfigScope = {
    getSnapshot: () => doc.value === undefined
      ? { status: 'unavailable' as const, value: undefined }
      : { status: 'ready' as const, value: doc.value as never },
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: vi.fn(async (field: string, next: unknown) => {
      doc.value = { ...(doc.value ?? {}), [field]: next }
      notify()
    }),
  }
  return { scope, setDoc: (next) => { doc.value = next; notify() } }
}

beforeEach(() => {
  detachAmbientConfigScope()
})

describe('ambientConfigStore', () => {
  it('starts loading until a scope is attached', () => {
    const snapshot = getAmbientConfigSnapshot()
    expect(snapshot.status).toBe('loading')
  })

  it('publishes the normalized resolved section once the scope is ready', () => {
    const { scope } = fakeScope({ opacity: 0.9, blur: 99, showTrail: false })
    attachAmbientConfigScope(scope)
    const snapshot = getAmbientConfigSnapshot()
    expect(snapshot.status).toBe('ready')
    expect(snapshot.value.opacity).toBe(0.9)
    expect(snapshot.value.blur).toBe(30) // clamped by the store decode
    expect(snapshot.value.showTrail).toBe(false)
    expect(snapshot.value.speed).toBe(5) // default filled
  })

  it('falls back to defaults when the namespace is unavailable', () => {
    const { scope } = fakeScope(undefined)
    attachAmbientConfigScope(scope)
    const snapshot = getAmbientConfigSnapshot()
    expect(snapshot.status).toBe('ready')
    expect(snapshot.value).toEqual({ opacity: 0.85, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true })
  })

  it('re-publishes when the scope notifies a committed change', () => {
    const { scope, setDoc } = fakeScope({ opacity: 0.5 })
    attachAmbientConfigScope(scope)
    const snapshot = getAmbientConfigSnapshot()
    expect(snapshot.value.opacity).toBe(0.5)
    setDoc({ opacity: 0.75, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true })
    expect(getAmbientConfigSnapshot().value.opacity).toBe(0.75)
  })

  it('routes setAmbientConfig to the attached scope and republishes', async () => {
    const { scope } = fakeScope({ opacity: 0.5 })
    attachAmbientConfigScope(scope)
    await setAmbientConfig('opacity', 0.66)
    expect((scope as { set: ReturnType<typeof vi.fn> }).set).toHaveBeenCalledWith('opacity', 0.66)
    expect(getAmbientConfigSnapshot().value.opacity).toBe(0.66)
  })

  it('no-ops writes and warns when no scope is attached', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await setAmbientConfig('opacity', 0.1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('detach stops publishing subsequent scope changes', () => {
    const { scope, setDoc } = fakeScope({ opacity: 0.5 })
    attachAmbientConfigScope(scope)
    detachAmbientConfigScope()
    setDoc({ opacity: 0.9 })
    expect(getAmbientConfigSnapshot().value.opacity).toBe(0.5)
  })
})
