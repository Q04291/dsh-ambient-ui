/**
 * React binding over the shared ambient config store.
 *
 * @module dsh-ambient-ui/useAmbientConfig
 */
import { useCallback, useSyncExternalStore } from 'react';
import { getAmbientConfigSnapshot, setAmbientConfig, subscribeAmbientConfig, } from "./ambientConfigStore.js";
/** Subscribe to the shared store; every consumer converges on the same value. */
export function useAmbientConfig() {
    const snapshot = useSyncExternalStore(subscribeAmbientConfig, getAmbientConfigSnapshot);
    const set = useCallback((field, next) => setAmbientConfig(field, next), []);
    return { status: snapshot.status, value: snapshot.value, set };
}
