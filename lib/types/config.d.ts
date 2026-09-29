/**
 * Shared configuration surface for dsh-ambient-ui.
 *
 * The Host form schema and the browser readout both speak this shape:
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
/** Settings namespace of the ambient capability; it doubles as the cordis.patch.yml entry id. */
export declare const AMBIENT_SETTINGS_NAMESPACE = "ambient";
/** A live Config field reference, the shape schemastery's `.volatile()` resolves to. */
export interface LiveSetting<T> {
    /** Current resolved value of the live field. */
    get(): T | undefined;
}
/**
 * Config as the Loader hands it to `apply()`.
 *
 * The six ambient fields are volatile references — the Settings form writes
 * them through the profile patch and the running reference follows — so the
 * Host side never has to read them. The three connection knobs are ordinary
 * composition-layer values.
 */
export interface AmbientRuntimeConfig {
    /** Live floating-widget opacity. */
    opacity?: LiveSetting<number>;
    /** Live glassmorphism blur radius. */
    blur?: LiveSetting<number>;
    /** Live trail animation speed. */
    speed?: LiveSetting<number>;
    /** Live balance-widget visibility. */
    showBalance?: LiveSetting<boolean>;
    /** Live trail visibility. */
    showTrail?: LiveSetting<boolean>;
    /** Live glass-surface switch. */
    glass?: LiveSetting<boolean>;
    /** Credential reference (env-style name) holding the DeepSeek API key. */
    apiKeyEnv?: string;
    /** DeepSeek API base URL (override for gateway/compat providers). */
    baseUrl?: string;
    /** Minimum seconds between provider balance queries. */
    refreshIntervalSeconds?: number;
}
/** Plugin entry configuration consumed by the host balance service. */
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