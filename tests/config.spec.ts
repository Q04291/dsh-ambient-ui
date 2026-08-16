import { describe, expect, it } from 'vitest'
import { AMBIENT_DEFAULTS, normalizeAmbientSettings } from '../src/config.ts'

describe('normalizeAmbientSettings', () => {
  it('returns defaults for a missing/non-object section', () => {
    expect(normalizeAmbientSettings(undefined)).toEqual(AMBIENT_DEFAULTS)
    expect(normalizeAmbientSettings(null)).toEqual(AMBIENT_DEFAULTS)
    expect(normalizeAmbientSettings('nope')).toEqual(AMBIENT_DEFAULTS)
    expect(normalizeAmbientSettings([])).toEqual(AMBIENT_DEFAULTS)
  })

  it('clamps out-of-range numbers and coerces types', () => {
    const v = normalizeAmbientSettings({ opacity: 5, blur: -3, speed: 99, showBalance: 0, showTrail: 'x', glass: 1 })
    expect(v.opacity).toBe(1)
    expect(v.blur).toBe(0)
    expect(v.speed).toBe(10)
    expect(v.showBalance).toBe(true)
    expect(v.showTrail).toBe(true)
    expect(v.glass).toBe(true)
  })

  it('fills missing fields with defaults', () => {
    const v = normalizeAmbientSettings({ opacity: 0.7 })
    expect(v.opacity).toBe(0.7)
    expect(v.blur).toBe(AMBIENT_DEFAULTS.blur)
    expect(v.speed).toBe(AMBIENT_DEFAULTS.speed)
  })
})
