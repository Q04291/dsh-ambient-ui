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
import { type AmbientSettings } from '../config.ts';
/** Shared store snapshot. */
export interface AmbientConfigSnapshot {
    status: 'loading' | 'ready';
    value: AmbientSettings;
}
/** The settings-scope face the store consumes (structural subset of SettingsScope). */
export interface AmbientConfigScope {
    getSnapshot(): {
        status: 'loading' | 'ready' | 'unavailable';
        value: AmbientSettings | undefined;
    };
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<void>;
}
/**
 * Attach the native settings scope for the `ambient` namespace.
 * @param next - the bound scope from `ctx.settingsScope.bind(...)`.
 * @returns a disposer detaching this store from the scope.
 */
export declare function attachAmbientConfigScope(next: AmbientConfigScope): () => void;
/** Detach the attached scope (idempotent). */
export declare function detachAmbientConfigScope(): void;
/** Current snapshot (stable reference between updates). */
export declare function getAmbientConfigSnapshot(): AmbientConfigSnapshot;
/** Subscribe to snapshot replacements. */
export declare function subscribeAmbientConfig(listener: () => void): () => void;
/** Whether writes currently reach the Host (scope attached). */
export declare function isAmbientConfigWritable(): boolean;
/** Persist one field through the native settings scope and republish. */
export declare function setAmbientConfig(field: keyof AmbientSettings, next: unknown): Promise<void>;
//# sourceMappingURL=ambientConfigStore.d.ts.map