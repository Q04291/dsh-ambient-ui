/**
 * Module-level reactive ambient config store.
 *
 * Every consumer (the settings row, the balance chip, the trail) shares ONE
 * store, so a change written by any component re-renders all of them
 * immediately instead of waiting for the next poll or a page refresh.
 *
 * @module dsh-ambient-ui/ambientConfigStore
 */
import { type AmbientSettings } from '../config.ts';
/** Shared store snapshot. */
export interface AmbientConfigSnapshot {
    status: 'loading' | 'ready';
    value: AmbientSettings;
}
/** Current snapshot (stable reference between updates). */
export declare function getAmbientConfigSnapshot(): AmbientConfigSnapshot;
/** Subscribe to snapshot replacements; starts a shared poller. */
export declare function subscribeAmbientConfig(listener: () => void): () => void;
/** Pull the latest config from the Host route. */
export declare function refreshAmbientConfig(): Promise<void>;
/** Persist one field through the Host route and publish the new value. */
export declare function setAmbientConfig(field: keyof AmbientSettings, next: unknown): Promise<void>;
//# sourceMappingURL=ambientConfigStore.d.ts.map