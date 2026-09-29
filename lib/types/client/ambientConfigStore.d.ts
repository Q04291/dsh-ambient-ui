/**
 * Module-level reactive ambient config store, fed by the native settings form.
 *
 * The client entry takes the `ambient` profile entry's form from
 * `ctx.configForms` (the settings provider's per-entry controller: accepted
 * values plus a revisioned write queue) and attaches it here. Every consumer —
 * the settings row, the balance chip, the glass effect — shares ONE store, so a
 * change written through the form re-renders all of them immediately instead of
 * waiting for a poll or a page refresh.
 *
 * No polling: the provider folds every Host document update into the shared
 * describe mirror, and each write carries the latest entry revision.
 *
 * @module dsh-ambient-ui/ambientConfigStore
 */
import { type AmbientSettings } from '../config.ts';
/** Shared store snapshot. */
export interface AmbientConfigSnapshot {
    status: 'loading' | 'ready';
    value: AmbientSettings;
}
/** The settings-form face the store consumes (structural subset of ConfigForm). */
export interface AmbientConfigScope {
    getSnapshot(): {
        status: 'loading' | 'ready' | 'unavailable';
        value: AmbientSettings | undefined;
    };
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<unknown>;
}
/**
 * Attach the native settings form for the `ambient` profile entry.
 * @param next - the form from `ctx.configForms.get(...)`.
 * @returns a disposer detaching this store from the form.
 */
export declare function attachAmbientConfigScope(next: AmbientConfigScope): () => void;
/** Detach the attached scope (idempotent). */
export declare function detachAmbientConfigScope(): void;
/** Current snapshot (stable reference between updates). */
export declare function getAmbientConfigSnapshot(): AmbientConfigSnapshot;
/** Subscribe to snapshot replacements. */
export declare function subscribeAmbientConfig(listener: () => void): () => void;
/** Whether writes currently reach the Host (form attached). */
export declare function isAmbientConfigWritable(): boolean;
/** Persist one field through the native settings form and republish. */
export declare function setAmbientConfig(field: keyof AmbientSettings, next: unknown): Promise<void>;
//# sourceMappingURL=ambientConfigStore.d.ts.map