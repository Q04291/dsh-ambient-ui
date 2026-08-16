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
    opacity: number;
    /** Glassmorphism blur radius in px, 0 (crisp) – 30 (frosted). */
    blur: number;
    /** Trail animation speed, 1 (slow) – 10 (fast). */
    speed: number;
    /** Show the balance/token floating widget. */
    showBalance: boolean;
    /** Show the pixel trail animation. */
    showTrail: boolean;
    /** Apply glass (blur + transparency) to DSH popup surfaces. */
    glass: boolean;
}
/** Defaults for every ambient setting (also the settings-section composition base). */
export declare const AMBIENT_DEFAULTS: AmbientSettings;
/** Plugin entry configuration (optional composition-layer overrides). */
export type AmbientConfig = Partial<AmbientSettings> & {
    /** Credential reference (env-style name) holding the DeepSeek API key. */
    apiKeyEnv?: string;
    /** DeepSeek API base URL (override for gateway/compat providers). */
    baseUrl?: string;
    /** Minimum seconds between provider balance queries. */
    refreshIntervalSeconds?: number;
};
/**
 * Tolerantly normalize an unknown settings section into a valid
 * AmbientSettings. Used as the client settings-scope decode so a partial or
 * out-of-range persisted section can never wedge the readout in "loading".
 */
export declare function normalizeAmbientSettings(section: unknown): AmbientSettings;
//# sourceMappingURL=config.d.ts.map