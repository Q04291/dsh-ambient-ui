/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section.
 *
 * Configuration is read and written through the NATIVE settings transport:
 * the Host registers the `ambient` namespace at boot, and this entry binds it
 * with `ctx.settingsScope` — live mirror + revisioned writes — instead of a
 * bespoke config route and polling.
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
 * Register both widgets, the settings row, and the ambient config scope.
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