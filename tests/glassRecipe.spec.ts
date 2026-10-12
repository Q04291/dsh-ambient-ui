import { describe, expect, it } from 'vitest'
import {
  GLASS_OPACITY_MAX,
  GLASS_OPACITY_MIN,
  GLASS_TINT_MAX,
  GLASS_TINT_MIN,
  backdropFilterSupported,
  glassBlurFilter,
  glassPanelAlpha,
  glassTintAlpha,
  glassVars,
  withAlpha,
} from '../src/glassRecipe.ts'

describe('glass tint density', () => {
  it('spans the reference band across the opacity setting', () => {
    expect(glassTintAlpha(GLASS_OPACITY_MIN)).toBe(GLASS_TINT_MIN)
    expect(glassTintAlpha(GLASS_OPACITY_MAX)).toBe(GLASS_TINT_MAX)
    expect(glassTintAlpha(0.85)).toBeCloseTo(0.341, 3)
  })

  it('clamps out-of-range input instead of extrapolating', () => {
    expect(glassTintAlpha(-5)).toBe(GLASS_TINT_MIN)
    expect(glassTintAlpha(9)).toBe(GLASS_TINT_MAX)
  })

  it('keeps panels legible at every density', () => {
    expect(glassPanelAlpha(GLASS_OPACITY_MIN)).toBeCloseTo(0.655, 3)
    expect(glassPanelAlpha(GLASS_OPACITY_MAX)).toBeCloseTo(0.914, 3)
    expect(glassPanelAlpha(0)).toBeGreaterThanOrEqual(0.62)
    expect(glassPanelAlpha(2)).toBeLessThanOrEqual(0.92)
  })
})

describe('glass blur', () => {
  it('emits a plain blur with no saturation, matching the reference', () => {
    expect(glassBlurFilter(12)).toBe('blur(12px)')
    expect(glassBlurFilter(12)).not.toContain('saturate')
  })

  it('collapses a disabled or rounded-down radius to none', () => {
    expect(glassBlurFilter(0)).toBe('none')
    expect(glassBlurFilter(-4)).toBe('none')
    expect(glassBlurFilter(0.4)).toBe('none')
  })

  it('detects support through the injected probe', () => {
    expect(backdropFilterSupported(() => true)).toBe(true)
    expect(backdropFilterSupported(() => false)).toBe(false)
  })

  it('does not accept the -webkit- alias as support', () => {
    // The stylesheet emits the unprefixed property alone, so an alias-only
    // browser must fall back to the opaque tint rather than a blur it will not get.
    expect(backdropFilterSupported((property) => property === '-webkit-backdrop-filter')).toBe(false)
  })
})

describe('withAlpha', () => {
  it('rewrites hex colours', () => {
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(withAlpha('  #000000  ', 0.25)).toBe('rgba(0, 0, 0, 0.25)')
  })

  it('compounds with an existing hex alpha rather than discarding it', () => {
    expect(withAlpha('#ffffff2e', 1)).toBe('rgba(255, 255, 255, 0.18)')
  })

  it('rewrites rgb() and rgba()', () => {
    expect(withAlpha('rgb(10, 20, 30)', 0.5)).toBe('rgba(10, 20, 30, 0.5)')
    expect(withAlpha('rgba(10, 20, 30, 0.4)', 0.5)).toBe('rgba(10, 20, 30, 0.2)')
  })

  it('passes unsupported notations through untouched', () => {
    expect(withAlpha('color-mix(in srgb, red 50%, transparent)', 0.5))
      .toBe('color-mix(in srgb, red 50%, transparent)')
    expect(withAlpha('var(--dsw-alias-bg-layer-1)', 0.5)).toBe('var(--dsw-alias-bg-layer-1)')
  })
})

describe('glassVars', () => {
  it('produces a light-theme recipe with a bright rim', () => {
    const vars = glassVars({ dark: false, opacity: 0.85, blur: 12 })
    expect(vars['--ambient-glass-fill']).toBe('hsla(0, 0%, 100%, 0.341)')
    expect(vars['--ambient-glass-blur']).toBe('blur(12px)')
    expect(vars['--ambient-glass-rim']).toBe('rgba(255, 255, 255, 0.55)')
    expect(vars['--ambient-glass-radius']).toBe('12px')
  })

  it('produces a dark-theme recipe tinted from 35% grey', () => {
    const vars = glassVars({ dark: true, opacity: 0.85, blur: 12 })
    expect(vars['--ambient-glass-fill']).toBe('hsla(0, 0%, 35%, 0.341)')
    // The reference's 19% black shadow is invisible on DSH's dark surfaces.
    expect(vars['--ambient-glass-shadow']).toContain('rgba(14, 14, 14, 0.28)')
  })

  it('forces an almost opaque fill when backdrop-filter is unsupported', () => {
    const vars = glassVars({ dark: false, opacity: 0.5, blur: 12, supported: false })
    expect(vars['--ambient-glass-fill']).toBe('hsla(0, 0%, 100%, 0.94)')
    expect(vars['--ambient-glass-blur']).toBe('none')
  })

  it('keeps the shadow stack a single valid comma-separated list', () => {
    const vars = glassVars({ dark: false, opacity: 0.85, blur: 12 })
    const layers = vars['--ambient-glass-shadow'].split('), ')
    expect(layers.length).toBeGreaterThanOrEqual(3)
    expect(vars['--ambient-glass-shadow']).toContain('inset 0 1px 0')
  })
})
