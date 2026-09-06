/**
 * Module-level reactive ambient config store, fed by the native settings scope.
 *
 * The client entry binds the `ambient` namespace through `ctx.settingsScope`
 * (the mirror of every namespace the Host registered) and attaches the scope
 * here. Every consumer — the settings row, the balance chip, the glass
 * effect — shares ONE store, so a change written through the scope re-renders
 * all of them immediately instead of waiting for a poll or a page refresh.
 *
 * No polling: the scope publishes every committed change (its mirror refreshes
 * on `settings/document-updated`), and writes carry the latest namespace
 * revision through the Host settings controller.
 *
 * @module dsh-ambient-ui/ambientConfigStore
 */
import { AMBIENT_DEFAULTS, normalizeAmbientSettings } from "../config.js";
let state = { status: 'loading', value: { ...AMBIENT_DEFAULTS } };
let scope;
let unsubscribe;
const listeners = new Set();
function emit() {
    for (const listener of [...listeners]) {
        try {
            listener();
        }
        catch { /* keep other listeners alive */ }
    }
}
/** Re-derive the store snapshot from the attached scope. */
function pull() {
    const current = scope;
    if (current === undefined)
        return;
    const snapshot = current.getSnapshot();
    if (snapshot.status === 'ready' && snapshot.value !== undefined) {
        state = { status: 'ready', value: normalizeAmbientSettings(snapshot.value) };
    }
    else if (snapshot.status === 'unavailable') {
        // Namespace not exposed (no settings provider / memory mode): keep the
        // composition defaults so the UI still renders; writes are refused by the
        // scope and surfaced as console warnings by the caller.
        state = { status: 'ready', value: { ...AMBIENT_DEFAULTS } };
    }
    // 'loading' keeps the last accepted snapshot (initial 'loading').
    emit();
}
/**
 * Attach the native settings scope for the `ambient` namespace.
 * @param next - the bound scope from `ctx.settingsScope.bind(...)`.
 * @returns a disposer detaching this store from the scope.
 */
export function attachAmbientConfigScope(next) {
    detachAmbientConfigScope();
    scope = next;
    unsubscribe = next.subscribe(() => { pull(); });
    pull();
    return detachAmbientConfigScope;
}
/** Detach the attached scope (idempotent). */
export function detachAmbientConfigScope() {
    unsubscribe?.();
    unsubscribe = undefined;
    scope = undefined;
}
/** Current snapshot (stable reference between updates). */
export function getAmbientConfigSnapshot() {
    return state;
}
/** Subscribe to snapshot replacements. */
export function subscribeAmbientConfig(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
/** Whether writes currently reach the Host (scope attached). */
export function isAmbientConfigWritable() {
    return scope !== undefined;
}
/** Persist one field through the native settings scope and republish. */
export async function setAmbientConfig(field, next) {
    const current = scope;
    if (current === undefined) {
        console.warn('[dsh-ambient-ui] settings scope not attached; ignoring write', field, next);
        return;
    }
    await current.set(field, next);
    pull();
}
