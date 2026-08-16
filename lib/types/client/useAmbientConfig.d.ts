/**
 * React binding over the shared ambient config store.
 *
 * @module dsh-ambient-ui/useAmbientConfig
 */
import type { AmbientSettings } from '../config.ts';
/** The live ambient config + a single-field writer (shared across components). */
export interface AmbientConfigHandle {
    status: 'loading' | 'ready';
    value: AmbientSettings;
    /** Persist one field through the Host route and publish to every consumer. */
    set: (field: keyof AmbientSettings, next: unknown) => Promise<void>;
}
/** Subscribe to the shared store; every consumer converges on the same value. */
export declare function useAmbientConfig(): AmbientConfigHandle;
//# sourceMappingURL=useAmbientConfig.d.ts.map