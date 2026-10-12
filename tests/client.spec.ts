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
function stubDom(): {
  bodyStyle: { getPropertyValue: ReturnType<typeof vi.fn>; setProperty: ReturnType<typeof vi.fn>; removeProperty: ReturnType<typeof vi.fn> }
  rootStyle: { setProperty: ReturnType<typeof vi.fn>; removeProperty: ReturnType<typeof vi.fn> }
  created: { id: string; textContent: string; setAttribute: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }[]
} {
  const bodyStyle = {
    getPropertyValue: vi.fn(() => ''),
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  }
  const rootStyle = { setProperty: vi.fn(), removeProperty: vi.fn() }
  const created: { id: string; textContent: string; setAttribute: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }[] = []
  // DSH declares every --dsw-* token on `body` and flips the dark theme with
  // `body[data-ds-dark-theme]`, so the stub has to model body, not just root.
  vi.stubGlobal('document', {
    body: { style: bodyStyle, hasAttribute: vi.fn(() => false) },
    documentElement: { style: rootStyle, hasAttribute: vi.fn(() => false) },
    head: { appendChild: vi.fn() },
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => {
      const element = { id: '', textContent: '', setAttribute: vi.fn(), remove: vi.fn() }
      created.push(element)
      return element
    }),
  })
  vi.stubGlobal('getComputedStyle', vi.fn(() => ({ getPropertyValue: () => '' })))
  vi.stubGlobal('CSS', { supports: () => true })
  vi.stubGlobal('MutationObserver', class {
    observe(): void {}
    disconnect(): void {}
  })
  return { bodyStyle, rootStyle, created }
}

/** The DOM stub installed by the current test. */
let dom: ReturnType<typeof stubDom>

beforeEach(() => {
  dom = stubDom()
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

  it('writes the glass tokens onto body, where DSH declares them', () => {
    const { form } = fakeForm({ opacity: 0.5, blur: 16, glass: true })
    const { ctx } = fakeCtx(form)

    apply(ctx)

    const written = dom.bodyStyle.setProperty.mock.calls.map((call) => call[0])
    expect(written).toContain('--dsw-mask-blur')
    expect(written).toContain('--ambient-glass-fill')
    expect(dom.bodyStyle.setProperty).toHaveBeenCalledWith('--dsw-mask-blur', 'blur(16px)')
    // Writing to documentElement is the bug this test pins: DSH re-declares the
    // tokens it owns on body, so a root-level override is always overridden.
    expect(dom.rootStyle.setProperty).not.toHaveBeenCalled()
    expect(dom.created[0]?.textContent).toContain('[role="dialog"][aria-modal="true"]')
    // DSH's own menu fill is already translucent; re-mixing it made menus *more*
    // opaque than DSH ships them, so the injected sheet must not touch it.
    expect(dom.created[0]?.textContent).not.toContain('--dsw-specific-menu')
  })
})
