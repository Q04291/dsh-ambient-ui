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
import { useEffect, useState, useSyncExternalStore } from 'react';
/** The body attribute DSH flips for the dark theme. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme';
/** Cached dark-theme answer; `useSyncExternalStore` requires a stable snapshot. */
let cachedDark = false;
/** Whether a listener has forced the observer to be connected. */
let observing = false;
/** Live subscribers to theme mutations. */
const listeners = new Set();
/**
 * Read the current dark-theme state.
 * @returns true when DSH has the dark theme active.
 */
export function isDarkTheme() {
    if (typeof document === 'undefined')
        return false;
    const body = document.body;
    if (body === null || body === undefined)
        return false;
    if (body.hasAttribute(DARK_ATTRIBUTE))
        return true;
    // Fallback for a DSH build that flips the attribute on <html> instead.
    return document.documentElement?.hasAttribute(DARK_ATTRIBUTE) === true;
}
/** Notify every subscriber after a re-read of the theme state. */
function publish() {
    cachedDark = isDarkTheme();
    for (const listener of [...listeners]) {
        try {
            listener();
        }
        catch {
            // A broken listener must not stop the others.
        }
    }
}
/** Connect the shared mutation observer (idempotent). */
function observe() {
    if (observing)
        return;
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined')
        return;
    const body = document.body;
    if (body === null || body === undefined)
        return;
    observing = true;
    const observer = new MutationObserver(publish);
    // Attribute filters stay away from `style`: the glass installer writes
    // custom properties onto body, and observing them would loop forever.
    observer.observe(body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE, 'class'] });
    const root = document.documentElement;
    if (root !== null && root !== undefined) {
        observer.observe(root, { attributes: true, attributeFilter: [DARK_ATTRIBUTE, 'class', 'data-theme'] });
    }
}
/**
 * Subscribe to DSH theme mutations (dark-theme flips and theme class swaps).
 * @param listener - called after every relevant attribute change.
 * @returns a disposer.
 */
export function subscribeTheme(listener) {
    observe();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
/**
 * Stable dark-theme snapshot for `useSyncExternalStore`.
 * @returns true when DSH has the dark theme active.
 */
export function getDarkThemeSnapshot() {
    return cachedDark;
}
/** Snapshot used when no DOM exists. */
export function getDarkThemeServerSnapshot() {
    return false;
}
/**
 * Track the DSH dark theme in a component.
 * @returns true when the dark theme is active.
 */
export function useDarkTheme() {
    // Re-read once on mount: the module cache is only as fresh as the last
    // publish, and a component can mount long after the theme last changed.
    useEffect(() => {
        cachedDark = isDarkTheme();
    }, []);
    return useSyncExternalStore(subscribeTheme, getDarkThemeSnapshot, getDarkThemeServerSnapshot);
}
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
export function readThemeToken(name, fallback) {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return fallback;
    const scope = document.body ?? document.documentElement;
    if (scope === null || scope === undefined || typeof getComputedStyle !== 'function')
        return fallback;
    const value = getComputedStyle(scope).getPropertyValue(name).trim();
    return value.length > 0 ? value : fallback;
}
/**
 * Track `prefers-reduced-motion`.
 * @returns true when the user asked for reduced motion.
 */
export function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
            return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(query.matches);
        const onChange = (event) => { setReduced(event.matches); };
        query.addEventListener('change', onChange);
        return () => { query.removeEventListener('change', onChange); };
    }, []);
    return reduced;
}
