/**
 * DSH theme and platform signals shared by the ambient widgets.
 *
 * DSH marks the dark theme with `body[data-ds-dark-theme]` — not
 * `prefers-color-scheme` and not an attribute on `documentElement` — and
 * declares every `--dsw-*` token on `body`. Both facts are load-bearing:
 * reading the tokens from `documentElement` returns empty strings, and writing
 * an override there is overridden by the `body` rule.
 *
 * @module dsh-ambient-ui/client/theme
 */
/**
 * Read the current dark-theme state.
 * @returns true when DSH has the dark theme active.
 */
export declare function isDarkTheme(): boolean;
/**
 * Subscribe to DSH theme mutations (dark-theme flips and theme class swaps).
 * @param listener - called after every relevant attribute change.
 * @returns a disposer.
 */
export declare function subscribeTheme(listener: () => void): () => void;
/**
 * Stable dark-theme snapshot for `useSyncExternalStore`.
 * @returns true when DSH has the dark theme active.
 */
export declare function getDarkThemeSnapshot(): boolean;
/** Snapshot used when no DOM exists. */
export declare function getDarkThemeServerSnapshot(): boolean;
/**
 * Track the DSH dark theme in a component.
 * @returns true when the dark theme is active.
 */
export declare function useDarkTheme(): boolean;
/**
 * Resolve one DSH token to a concrete colour.
 *
 * Canvas cannot read CSS variables, so the trail resolves its palette through
 * here. The global observer is disconnected during the read so writing the
 * value back can never feed a mutation loop.
 * @param name - the `--dsw-*` custom property.
 * @param fallback - value used when the token is absent (older or stripped theme).
 * @returns the computed colour, or the fallback.
 */
export declare function readThemeToken(name: string, fallback: string): string;
/**
 * Track `prefers-reduced-motion`.
 * @returns true when the user asked for reduced motion.
 */
export declare function usePrefersReducedMotion(): boolean;
//# sourceMappingURL=theme.d.ts.map