/**
 * Global glass effect for DSH popup surfaces.
 *
 * Drives the mask tokens (--dsw-mask-blur / --dsw-alias-bg-mask-1) and adds
 * backdrop-filter + alpha-tuned backgrounds to the stable popup selectors
 * (settings panel / modals use role=dialog+aria-modal, menus role=menu,
 * tooltips role=tooltip). Re-applies whenever the shared config or the
 * active theme changes.
 *
 * @module dsh-ambient-ui/glass
 */

import { getAmbientConfigSnapshot, subscribeAmbientConfig } from './ambientConfigStore.ts'

const STYLE_ID = 'dsh-ambient-glass'

/** Scale a color's alpha (supports hex and rgb()/rgba() strings). */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  const trimmed = color.trim()
  const hex = /^#([0-9a-f]{3,8})$/i.exec(trimmed)
  if (hex !== null) {
    let h = hex[1]
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`
    }
    if (h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16)
      const g = parseInt(h.slice(2, 4), 16)
      const b = parseInt(h.slice(4, 6), 16)
      const base = parseInt(h.slice(6, 8), 16) / 255
      return `rgba(${r}, ${g}, ${b}, ${(base * a).toFixed(3)})`
    }
    return trimmed
  }
  const rgb = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(trimmed)
  if (rgb !== null) {
    const base = rgb[4] === undefined ? 1 : Number(rgb[4])
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${(base * a).toFixed(3)})`
  }
  return trimmed
}

/** Mask darkness: transparent panels need a stronger backdrop for contrast. */
function maskAlpha(opacity: number): number {
  return Math.max(0.08, Math.min(0.6, 0.15 + (1 - opacity) * 0.35))
}

/** Blur expression for the current setting. */
function blurValue(blur: number): string {
  return blur <= 0 ? 'none' : `blur(${blur}px) saturate(160%)`
}

/** Apply the glass styles from the current config. */
function applyGlass(): void {
  const { value } = getAmbientConfigSnapshot()
  const rootStyle = document.documentElement.style

  if (!value.glass) {
    rootStyle.removeProperty('--dsw-mask-blur')
    rootStyle.removeProperty('--dsw-alias-bg-mask-1')
    const existing = document.getElementById(STYLE_ID)
    existing?.remove()
    return
  }

  const computed = getComputedStyle(document.documentElement)
  const maskBase = computed.getPropertyValue('--dsw-alias-bg-mask-1').trim() || 'rgba(0, 0, 0, 0.24)'
  rootStyle.setProperty('--dsw-mask-blur', blurValue(value.blur))
  rootStyle.setProperty('--dsw-alias-bg-mask-1', withAlpha(maskBase, maskAlpha(value.opacity)))

  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (styleEl === null) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    document.head.appendChild(styleEl)
  }
  const panelAlpha = (value.opacity * 100).toFixed(1)
  const blur = blurValue(value.blur)
  styleEl.textContent = [
    `[role="dialog"][aria-modal="true"] {`,
    `  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) ${panelAlpha}%, transparent);`,
    `  backdrop-filter: ${blur};`,
    `  -webkit-backdrop-filter: ${blur};`,
    `}`,
    `[role="menu"] {`,
    `  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) ${panelAlpha}%, transparent);`,
    `  backdrop-filter: ${blur};`,
    `  -webkit-backdrop-filter: ${blur};`,
    `}`,
    `[role="tooltip"] {`,
    `  backdrop-filter: ${blur};`,
    `  -webkit-backdrop-filter: ${blur};`,
    `}`,
  ].join('\n')
}

/**
 * Install the glass effect: subscribe to the shared config and re-apply on
 * theme changes. Returns a disposer.
 */
export function installGlass(): () => void {
  let disposed = false
  const apply = (): void => {
    if (!disposed) applyGlass()
  }
  const off = subscribeAmbientConfig(apply)
  apply()
  const observer = new MutationObserver(apply)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  return () => {
    disposed = true
    off()
    observer.disconnect()
    document.documentElement.style.removeProperty('--dsw-mask-blur')
    document.documentElement.style.removeProperty('--dsw-alias-bg-mask-1')
    document.getElementById(STYLE_ID)?.remove()
  }
}
