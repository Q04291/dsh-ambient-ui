/**
 * Shared configuration surface for dsh-ambient-ui.
 *
 * The browser readout and the Host settings section both speak this shape:
 * `opacity`, `blur` and `speed` drive the two UI features, and the optional
 * composition fields (apiKeyEnv / baseUrl / refreshIntervalSeconds) tune the
 * Host balance probe.
 *
 * @module dsh-ambient-ui/config
 */

/** User-facing ambient settings, edited in the Harness Settings panel. */
export interface AmbientSettings {
  /** Floating-widget opacity, 0.3 (ghost) – 1.0 (solid). */
  opacity: number
  /** Glassmorphism blur radius in px, 0 (crisp) – 30 (frosted). */
  blur: number
  /** Trail animation speed, 1 (slow) – 10 (fast). */
  speed: number
  /** Show the balance/token floating widget. */
  showBalance: boolean
  /** Show the pixel trail animation. */
  showTrail: boolean
  /** Apply glass (blur + transparency) to DSH popup surfaces. */
  glass: boolean
}

/** Defaults for every ambient setting (also the settings-section composition base). */
export const AMBIENT_DEFAULTS: AmbientSettings = {
  opacity: 0.85,
  blur: 12,
  speed: 5,
  showBalance: true,
  showTrail: true,
  glass: true,
}

/** Plugin entry configuration (optional composition-layer overrides). */
export type AmbientConfig = Partial<AmbientSettings> & {
  /** Credential reference (env-style name) holding the DeepSeek API key. */
  apiKeyEnv?: string
  /** DeepSeek API base URL (override for gateway/compat providers). */
  baseUrl?: string
  /** Minimum seconds between provider balance queries. */
  refreshIntervalSeconds?: number
}

/** Clamp a finite number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Tolerantly normalize an unknown settings section into a valid
 * AmbientSettings. Used as the client settings-scope decode so a partial or
 * out-of-range persisted section can never wedge the readout in "loading".
 */
export function normalizeAmbientSettings(section: unknown): AmbientSettings {
  if (typeof section !== 'object' || section === null || Array.isArray(section)) {
    return { ...AMBIENT_DEFAULTS }
  }
  const raw = section as Record<string, unknown>
  return {
    opacity: typeof raw.opacity === 'number' && Number.isFinite(raw.opacity)
      ? clamp(raw.opacity, 0.3, 1)
      : AMBIENT_DEFAULTS.opacity,
    blur: typeof raw.blur === 'number' && Number.isFinite(raw.blur)
      ? Math.round(clamp(raw.blur, 0, 30))
      : AMBIENT_DEFAULTS.blur,
    speed: typeof raw.speed === 'number' && Number.isFinite(raw.speed)
      ? Math.round(clamp(raw.speed, 1, 10))
      : AMBIENT_DEFAULTS.speed,
    showBalance: typeof raw.showBalance === 'boolean' ? raw.showBalance : AMBIENT_DEFAULTS.showBalance,
    showTrail: typeof raw.showTrail === 'boolean' ? raw.showTrail : AMBIENT_DEFAULTS.showTrail,
    glass: typeof raw.glass === 'boolean' ? raw.glass : AMBIENT_DEFAULTS.glass,
  }
}
