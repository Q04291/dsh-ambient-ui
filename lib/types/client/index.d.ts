/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section. Configuration flows through the plugin's own Host
 * routes (GET/PUT /api/ambient/config) because the DSH wire settings API
 * only exposes a hard-coded allowlist of namespaces.
 *
 * @module dsh-ambient-ui/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export { BalanceWidget } from '../BalanceWidget.tsx';
export { AmbientRow } from '../AmbientRow.tsx';
export { TrailAnimation } from '../TrailAnimation.tsx';
/** Stable cordis plugin name. */
export declare const name = "dsh-ambient-ui-client";
/** Required client services before either widget mounts. */
export declare const inject: string[];
/** Register both widgets and the settings row. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map