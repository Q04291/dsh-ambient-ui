/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section.
 *
 * The row reads and writes the plugin configuration through the Host routes
 * (GET/PUT /api/ambient/config), which persist through the in-process
 * `ctx.settings` seam to ~/.dsh/settings.yaml (`ambient:` section).
 *
 * @module dsh-ambient-ui/client
 */
import type { Context } from '@deepseek-ai/cordis';
export { BalanceWidget } from '../BalanceWidget.tsx';
export { AmbientRow } from '../AmbientRow.tsx';
export { TrailAnimation } from '../TrailAnimation.tsx';
/** Stable cordis plugin name. */
export declare const name = "dsh-ambient-ui-client";
/** Required client services before either widget mounts. */
export declare const inject: string[];
/**
 * Register both widgets and the settings row.
 *
 * Registrations are deferred through `ctx.slots.inject(...)`: the seats are
 * declared by other client modules (conversation shell, settings General
 * section) whose activation order relative to this plugin is unconstrained,
 * and registering into an undeclared slot throws. `inject` runs the callback
 * as soon as the seat is declared and disposes the contribution when the
 * seat's declaration collapses.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map