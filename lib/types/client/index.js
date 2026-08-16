/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section. Configuration flows through the plugin's own Host
 * routes (GET/PUT /api/ambient/config) because the DSH wire settings API
 * only exposes a hard-coded allowlist of namespaces.
 *
 * @module dsh-ambient-ui/client
 */
import { BalanceWidget } from "../BalanceWidget.js";
import { AmbientRow } from "../AmbientRow.js";
import { TrailAnimation } from "../TrailAnimation.js";
import { installGlass } from "./glass.js";
export { BalanceWidget } from "../BalanceWidget.js";
export { AmbientRow } from "../AmbientRow.js";
export { TrailAnimation } from "../TrailAnimation.js";
/** Stable cordis plugin name. */
export const name = 'dsh-ambient-ui-client';
/** Required client services before either widget mounts. */
export const inject = ['slots', 'connection'];
/** Register both widgets and the settings row. */
export function apply(ctx) {
    ctx.effect(() => {
        const disposers = [
            // Balance chip sits in the composer tool row, level with the input box.
            ctx.slots.register({
                name: 'conversation.input.right',
                id: 'ambient-balance',
                order: 20,
            }, BalanceWidget),
            // Pixel trail sits above the composer card so the input stays at the bottom.
            ctx.slots.register({
                name: 'conversation.input.dock',
                id: 'ambient-trail',
                order: 10,
            }, TrailAnimation),
            ctx.slots.register({
                name: 'settings.general.item',
                id: 'ambient-ui',
                order: 100,
            }, AmbientRow),
            installGlass(),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'dsh-ambient-ui: widget registration');
}
