/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section.
 *
 * The row reads and writes the plugin configuration through the Host routes
 * (GET/PUT /api/ambient/config), which persist through the in-process
 * `ctx.settings` seam to ~/.dsh/settings.yaml (`ambient:` section).
 *
 * @module dsh-ambient-ui/client
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the ctx.slots service (SlotRegistry) augmentation from the
// rc.1 renderer into this compilation.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the ui-settings SlotMap merge (the settings.general.item seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { BalanceWidget } from '../BalanceWidget.tsx'
import { AmbientRow } from '../AmbientRow.tsx'
import { TrailAnimation } from '../TrailAnimation.tsx'
import { installGlass } from './glass.ts'

export { BalanceWidget } from '../BalanceWidget.tsx'
export { AmbientRow } from '../AmbientRow.tsx'
export { TrailAnimation } from '../TrailAnimation.tsx'

/** Stable cordis plugin name. */
export const name = 'dsh-ambient-ui-client'

/** Required client services before either widget mounts. */
export const inject = ['slots']

/**
 * Register both widgets and the settings row.
 *
 * Registrations are deferred through `ctx.slots.inject(...)`: the seats are
 * declared by other client modules (conversation shell, settings General
 * section) whose activation order relative to this plugin is unconstrained,
 * and registering into an undeclared slot throws. `inject` runs the callback
 * as soon as the seat is declared and disposes the contribution when the
 * seat's declaration collapses.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => {
    const disposers = [
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
