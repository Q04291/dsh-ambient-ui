/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section.
 *
 * Configuration is read and written through the NATIVE settings transport:
 * the Host registers the `ambient` namespace at boot, and this entry binds it
 * with `ctx.settingsScope` — live mirror + revisioned writes — instead of a
 * bespoke config route and polling.
 *
 * @module dsh-ambient-ui/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.slots service (SlotRegistry) augmentation from the
// rc.1 renderer into this compilation.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the ui-settings SlotMap merge (the settings.general.item
// seat) and the ctx.settingsScope service augmentation.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { AmbientSettings } from '../config.ts'
import { AMBIENT_SETTINGS_NAMESPACE } from '../config.ts'
import { BalanceWidget } from '../BalanceWidget.tsx'
import { AmbientRow } from '../AmbientRow.tsx'
import { TrailAnimation } from '../TrailAnimation.tsx'
import { installGlass } from './glass.ts'
import { attachAmbientConfigScope } from './ambientConfigStore.ts'

export { BalanceWidget } from '../BalanceWidget.tsx'
export { AmbientRow } from '../AmbientRow.tsx'
export { TrailAnimation } from '../TrailAnimation.tsx'

/** Stable cordis plugin name. */
export const name = 'dsh-ambient-ui-client'

/** Required client services before either widget mounts. */
export const inject = ['slots', 'settingsScope']

/**
 * Register both widgets, the settings row, and the ambient config scope.
 *
 * Registrations are deferred through `ctx.slots.inject(...)`: the seats are
 * declared by other client modules (conversation shell, settings General
 * section) whose activation order relative to this plugin is unconstrained,
 * and registering into an undeclared slot throws. `inject` runs the callback
 * as soon as the seat is declared and disposes the contribution when the
 * seat's declaration collapses.
 */
export function apply(ctx: Context): void {
  // Bind the ambient namespace once on this plugin's fiber; the scope's
  // snapshot derives from the shared describe mirror, and every write goes
  // through the Host settings controller with the latest namespace revision.
  const scope = ctx.settingsScope.bind<AmbientSettings>({ namespace: AMBIENT_SETTINGS_NAMESPACE })
  const detachScope = attachAmbientConfigScope(scope)

  ctx.effect(() => {
    const disposers = [
      detachScope,
      // Balance chip sits in the composer tool row, level with the input box.
      ctx.slots.inject('conversation.input.right', () =>
        ctx.slots.register({
          name: 'conversation.input.right',
          id: 'ambient-balance',
          order: 20,
        }, BalanceWidget)),
      // Pixel trail sits above the composer card so the input stays at the bottom.
      ctx.slots.inject('conversation.input.dock', () =>
        ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'ambient-trail',
          order: 10,
        }, TrailAnimation)),
      // Ambient UI row at the bottom of the Settings panel's General section.
      ctx.slots.inject('settings.general.item', () =>
        ctx.slots.register({
          name: 'settings.general.item',
          id: 'ambient-ui',
          order: 100,
        }, AmbientRow)),
      installGlass(),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'dsh-ambient-ui: widget registration')
}
