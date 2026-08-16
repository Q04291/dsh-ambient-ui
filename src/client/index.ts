/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section. Configuration flows through the plugin's own Host
 * routes (GET/PUT /api/ambient/config) because the DSH wire settings API
 * only exposes a hard-coded allowlist of namespaces.
 *
 * @module dsh-ambient-ui/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock seat).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the ui-settings SlotMap merge (the settings.general.item seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
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
export const inject = ['slots', 'connection']

/** Register both widgets and the settings row. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposers = [
      // Balance chip sits in the composer tool row, level with the input box.
      ctx.slots.register({
        name: 'conversation.input.right',
        id: 'ambient-balance',
        order: 20,
      }, BalanceWidget),
      // Pixel trail sits above the composer card so the input stays at the bottom.
      ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'ambient-trail',
        order: 10,
      }, TrailAnimation),
      ctx.slots.register({
        name: 'settings.general.item',
        id: 'ambient-ui',
        order: 100,
      }, AmbientRow),
      installGlass(),
    ]
    return () => { for (const dispose of disposers) dispose() }
  }, 'dsh-ambient-ui: widget registration')
}
