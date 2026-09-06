/**
 * dsh-ambient-ui Host half: registers the `ambient` settings section (the
 * Settings panel surface for opacity / blur / speed / toggles) and the
 * balance + token HTTP routes. The browser half (the `./client` entry) mounts
 * the floating widget and the pixel trail.
 *
 * Install via `dsh plugin --profile web add <path-or-git-url>`; the
 * cordis.patch.yml inserts this plugin row.
 *
 * @module dsh-ambient-ui
 */

import { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the `ctx.settings` service augmentation (SettingsProvider)
// from @deepseek-ai/dsh-settings into this compilation. The section is
// registered with ctx.settings.installSection(...) once the service is live.
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import type { Session } from '@deepseek-ai/dsh-session'
import { AMBIENT_DEFAULTS, type AmbientConfig, type AmbientSettings } from './config.ts'
import { AmbientService } from './service.ts'
import { AMBIENT_API_PREFIX, makeAmbientRoutes } from './routes.ts'

export { AmbientService } from './service.ts'
export type { BalanceInfo, BalanceView, TokenView } from './service.ts'
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from './routes.ts'
export { AMBIENT_DEFAULTS, normalizeAmbientSettings } from './config.ts'
export type { AmbientConfig, AmbientSettings } from './config.ts'

/** Settings namespace of the ambient capability. */
export const AMBIENT_SETTINGS_NAMESPACE = 'ambient'

/** Settings section schema: what the web settings surface edits. */
export const AMBIENT_SETTINGS_SCHEMA = z.object({
  opacity: z.number().min(0.3).max(1).default(AMBIENT_DEFAULTS.opacity),
  blur: z.number().min(0).max(30).default(AMBIENT_DEFAULTS.blur),
  speed: z.number().min(1).max(10).default(AMBIENT_DEFAULTS.speed),
  showBalance: z.boolean().default(AMBIENT_DEFAULTS.showBalance),
  showTrail: z.boolean().default(AMBIENT_DEFAULTS.showTrail),
  glass: z.boolean().default(AMBIENT_DEFAULTS.glass),
})

/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export const name = 'ambient'

/** Services required before the ambient service can answer. */
export const inject = ['webServer', 'sessions']

/** Register the ambient service, its API routes, and its settings section. */
export function apply(ctx: Context, config: AmbientConfig = {}): void {
  const service = new AmbientService(ctx, config)

  const base: AmbientSettings = {
    opacity: config.opacity ?? AMBIENT_DEFAULTS.opacity,
    blur: config.blur ?? AMBIENT_DEFAULTS.blur,
    speed: config.speed ?? AMBIENT_DEFAULTS.speed,
    showBalance: config.showBalance ?? AMBIENT_DEFAULTS.showBalance,
    showTrail: config.showTrail ?? AMBIENT_DEFAULTS.showTrail,
    glass: config.glass ?? AMBIENT_DEFAULTS.glass,
  }

  // The settings surface edits only the schema-declared fields; the resolved
  // value layers schema defaults, the composition `base`, then the user
  // document section. `installSection` keeps the section registered for as
  // long as a settings provider is mounted and falls back to `base` when the
  // profile has none.
  const resolveSession = (id: string): Session | undefined => {
    const sessions = ctx.get('sessions') as { get(sid: string): Session | undefined } | undefined
    return sessions?.get(id)
  }

  // Diagnostics: confirm the settings seam is reachable and the section registers.
  const settingsSeamRef = (): { describe?(opts?: { redactSecrets?: boolean }): { ns: string }[] } | undefined =>
    ctx.get('settings') as { describe?(opts?: { redactSecrets?: boolean }): { ns: string }[] } | undefined
  console.log('[dsh-ambient-ui] apply: settings service present (at apply) =', settingsSeamRef() !== undefined)

  const routes = makeAmbientRoutes(service, resolveSession, () => settingsSeamRef()?.describe?.({ redactSecrets: true }) ?? [], () => settingsSeamRef())
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    return () => { for (const dispose of disposers) dispose() }
  }, 'ambient: routes')

  // Register the `ambient` settings section through the live settings
  // service. 0.1.2-rc.1 replaced the old top-level installSettingsSection /
  // settingsNamespace helpers with the ctx.settings service API; the argument
  // order maps 1:1 (owner, ns, schema, entry=base, hooks).
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, AMBIENT_SETTINGS_NAMESPACE, AMBIENT_SETTINGS_SCHEMA, base, {
      setSource: () => {
        // The provider now resolves the section (defaults + base + user); the
        // ambient readout and routes read the seam directly, so nothing is
        // cached here.
      },
      onChange: () => {
        console.log('[dsh-ambient-ui] settings section onChange fired (registration live)')
      },
    })
    console.log('[dsh-ambient-ui] installSection registered the ambient settings section')
  })
}

