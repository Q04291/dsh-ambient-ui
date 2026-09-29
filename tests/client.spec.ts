import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detachAmbientConfigScope, getAmbientConfigSnapshot,
} from '../src/client/ambientConfigStore.ts'
import type { AmbientConfigScope } from '../src/client/ambientConfigStore.ts'
import { apply, inject } from '../src/client/index.ts'
import type { Context } from '@deepseek-ai/cordis'

/** In-memory fake of the settings provider's per-entry form. */
function fakeForm(initial: Record<string, unknown> | undefined): {
  form: AmbientConfigScope
  setDoc(next: Record<string, unknown> | undefined): void
} {
  const listeners = new Set<() => void>()
  const doc: { value: Record<string, unknown> | undefined } = { value: initial }
  const notify = (): void => { for (const listener of [...listeners]) listener() }
  return {
    form: {
      getSnapshot: () => doc.value === undefined
        ? { status: 'unavailable' as const, value: undefined }
        : { status: 'ready' as const, value: doc.value as never },
      subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
      set: vi.fn(async (field: string, next: unknown) => {
        doc.value = { ...(doc.value ?? {}), [field]: next }
        notify()
        return true
      }),
    },
    setDoc: (next) => { doc.value = next; notify() },
  }
}

/** The client fiber surface `apply` touches, plus what it registered. */
function fakeCtx(form: AmbientConfigScope): {
  ctx: Context
  entryIds: string[]
  seats: string[]
  effects: (() => void)[]
} {
  const entryIds: string[] = []
  const seats: string[] = []
  const effects: (() => void)[] = []
  const ctx = {
    configForms: {
      get: vi.fn((entryId: string) => { entryIds.push(entryId); return form }),
    },
    slots: {
      inject: vi.fn((seat: string, register: () => () => void) => {
        seats.push(seat)
        return register()
      }),
      register: vi.fn(() => () => {}),
    },
    effect: vi.fn((callback: () => () => void) => {
      effects.push(callback())
      return () => {}
    }),
  }
  return { ctx: ctx as unknown as Context, entryIds, seats, effects }
}

/** The DOM the glass installer touches, which the node test environment lacks. */
function stubDom(): void {
  vi.stubGlobal('document', {
    documentElement: { style: { setProperty: vi.fn(), removeProperty: vi.fn() } },
    head: { appendChild: vi.fn() },
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => ({ id: '', textContent: '', remove: vi.fn() })),
  })
  vi.stubGlobal('getComputedStyle', vi.fn(() => ({ getPropertyValue: () => '' })))
  vi.stubGlobal('MutationObserver', class {
    observe(): void {}
    disconnect(): void {}
  })
}

beforeEach(() => {
  stubDom()
  detachAmbientConfigScope()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ambient client plugin', () => {
  it('requires the settings form service instead of the removed settings scope', () => {
    expect(inject).toContain('slots')
    expect(inject).toContain('configForms')
    expect(inject).not.toContain('settingsScope')
  })

  it('takes the ambient entry form and publishes its values', () => {
    const { form } = fakeForm({ opacity: 0.5, showTrail: false })
    const { ctx, entryIds, seats } = fakeCtx(form)

    apply(ctx)

    expect(entryIds).toEqual(['ambient'])
    expect(getAmbientConfigSnapshot().value.opacity).toBe(0.5)
    expect(getAmbientConfigSnapshot().value.showTrail).toBe(false)
    expect(getAmbientConfigSnapshot().value.blur).toBe(12) // default filled
    expect(seats).toEqual([
      'conversation.input.right',
      'conversation.input.dock',
      'settings.general.item',
    ])
  })

  it('stops publishing once the plugin effect is disposed', () => {
    const { form, setDoc } = fakeForm({ opacity: 0.5 })
    const { ctx, effects } = fakeCtx(form)

    apply(ctx)
    expect(effects).toHaveLength(1)

    effects[0]()
    setDoc({ opacity: 0.9, blur: 12, speed: 5, showBalance: true, showTrail: true, glass: true })
    expect(getAmbientConfigSnapshot().value.opacity).toBe(0.5)
  })
})
