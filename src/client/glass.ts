/**
 * Global glass effect for DSH's own popup surfaces.
 *
 * Two mechanisms, deliberately different:
 *
 * 1. **Token steering.** DSH declares `--dsw-mask-blur` (modal scrims) and
 *    `--dsw-menu-backdrop-filter` (menus) on `body`, and its stylesheets consume
 *    them. Overriding those tokens on `body` upgrades every DSH surface at once
 *    instead of fighting it with a weaker `[role="menu"]` override — the previous
 *    revision replaced DSH's built-in `blur(40px)` menu frost with `blur(12px)`
 *    while leaving the panel 85% opaque, which is strictly worse on both counts.
 *
 * 2. **One injected stylesheet** for the surfaces DSH has no token for
 *    (`[role="dialog"][aria-modal="true"]`, `[data-menu-material]`,
 *    `[role="tooltip"]`). DSH paints those with hashed module classes and has no
 *    rule of its own for the role selectors, so these rules are the *only* ones
 *    and win on specificity.
 *
 * Everything is set on `document.body`: DSH re-declares the tokens it owns on
 * `body`, so anything written to `documentElement` is overridden and reads back
 * as an empty string. The previous revision did exactly that, which is why none
 * of its overrides ever took effect.
 *
 * @module dsh-ambient-ui/glass
 */

import { backdropFilterSupported, glassBlurFilter, glassPanelAlpha, glassVars, withAlpha } from '../glassRecipe.ts'
import { getAmbientConfigSnapshot, subscribeAmbientConfig } from './ambientConfigStore.ts'
import { isDarkTheme, subscribeTheme } from './theme.ts'

/** Id of the injected stylesheet. */
const STYLE_ID = 'dsh-ambient-glass'

/** Body custom properties this installer owns; every one is removed on dispose. */
const OWNED_VARS = [
  '--dsw-mask-blur',
  '--dsw-menu-backdrop-filter',
  '--dsw-alias-bg-mask-1',
  '--ambient-glass-panel',
  '--ambient-glass-rim',
  '--ambient-glass-shadow',
  '--ambient-glass-blur',
  '--ambient-glass-radius',
] as const

/**
 * The injected rules.
 *
 * `@supports` rather than a JS check: with no `backdrop-filter` the block simply
 * does not apply and every DSH surface keeps the appearance DSH gave it, which
 * is the correct fallback — a 34%-tinted dialog with no blur is unreadable.
 *
 * DSH's own `--dsw-elevation-panel` is preserved by composing it with our rim
 * rather than replacing it, so the half-pixel elevation stroke DSH draws on
 * dark menus survives.
 */
const STYLE_TEXT = `@supports ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px))) {
  [role="dialog"][aria-modal="true"] {
    background: var(--ambient-glass-panel);
    backdrop-filter: var(--ambient-glass-blur);
    -webkit-backdrop-filter: var(--ambient-glass-blur);
    box-shadow: 0 0 0 1px var(--ambient-glass-rim), var(--dsw-elevation-panel);
  }
  [data-menu-material] {
    background: color-mix(in srgb, var(--dsw-specific-menu) 82%, transparent);
    backdrop-filter: var(--dsw-menu-backdrop-filter);
    -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter);
    box-shadow: 0 0 0 1px var(--ambient-glass-rim), var(--dsw-elevation-panel);
  }
  [role="menu"] {
    backdrop-filter: var(--dsw-menu-backdrop-filter);
    -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter);
  }
  [role="tooltip"] {
    backdrop-filter: var(--ambient-glass-blur);
    -webkit-backdrop-filter: var(--ambient-glass-blur);
  }
}`

/** Scrim darkness: the more transparent the panels, the more scrim they need. */
function maskAlpha(opacity: number): number {
  return Math.max(0.08, Math.min(0.6, 0.15 + (1 - opacity) * 0.35))
}

/**
 * Read a body token's *theme* value, ignoring this installer's own override.
 *
 * `color-mix`/alpha maths on an already-overridden token compounds every time
 * the config changes (0.5 → 0.25 → 0.125 …). Dropping the inline value first
 * makes the read idempotent; the caller re-sets it immediately after.
 * @param body - the token scope.
 * @param name - the custom property to read.
 * @param fallback - used when the theme does not declare it.
 * @returns the underlying theme value.
 */
function readBaseVar(body: HTMLElement, name: string, fallback: string): string {
  if (body.style.getPropertyValue(name) !== '') body.style.removeProperty(name)
  const value = getComputedStyle(body).getPropertyValue(name).trim()
  return value.length > 0 ? value : fallback
}

/** Apply the glass styles from the current config. */
function applyGlass(): void {
  const body = document.body as HTMLElement | null | undefined
  if (body === null || body === undefined) return

  const { value } = getAmbientConfigSnapshot()
  const style = body.style

  if (value.glass !== true) {
    for (const name of OWNED_VARS) style.removeProperty(name)
    document.getElementById(STYLE_ID)?.remove()
    return
  }

  const dark = isDarkTheme()
  const supported = backdropFilterSupported()
  const vars = glassVars({ dark, opacity: value.opacity, blur: value.blur, supported })
  const blur = glassBlurFilter(value.blur)
  // Read before writing: the base value depends on the active theme.
  const maskBase = readBaseVar(
    body,
    '--dsw-alias-bg-mask-1',
    dark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.24)',
  )

  style.setProperty('--ambient-glass-panel', `hsla(0, 0%, ${dark ? 35 : 100}%, ${glassPanelAlpha(value.opacity)})`)
  style.setProperty('--ambient-glass-rim', vars['--ambient-glass-rim'])
  style.setProperty('--ambient-glass-shadow', vars['--ambient-glass-shadow'])
  style.setProperty('--ambient-glass-blur', vars['--ambient-glass-blur'])
  style.setProperty('--ambient-glass-radius', vars['--ambient-glass-radius'])
  style.setProperty('--dsw-mask-blur', blur)
  style.setProperty('--dsw-menu-backdrop-filter', blur)
  style.setProperty('--dsw-alias-bg-mask-1', withAlpha(maskBase, maskAlpha(value.opacity)))

  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (styleEl === null) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    styleEl.setAttribute('data-plugin', 'dsh-ambient-ui')
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = STYLE_TEXT
}

/**
 * Install the glass effect: subscribe to the shared config and to DSH theme
 * changes, and re-apply on either.
 * @returns a disposer that restores DSH's own surfaces.
 */
export function installGlass(): () => void {
  let disposed = false
  const apply = (): void => {
    if (!disposed) applyGlass()
  }
  const offConfig = subscribeAmbientConfig(apply)
  apply()
  const offTheme = subscribeTheme(apply)
  return () => {
    disposed = true
    offConfig()
    offTheme()
    const body = document.body as HTMLElement | null | undefined
    if (body !== null && body !== undefined) {
      for (const name of OWNED_VARS) body.style.removeProperty(name)
    }
    document.getElementById(STYLE_ID)?.remove()
  }
}
