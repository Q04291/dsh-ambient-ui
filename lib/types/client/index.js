/**
 * dsh-ambient-ui browser half: mounts the balance/token chip and the pixel
 * trail into the composer dock band, plus the Ambient UI row in the Settings
 * panel's General section.
 *
 * Configuration is read and written through the NATIVE settings transport:
 * the Host declares the `ambient` profile entry's Config, and this entry takes
 * that entry's form with `ctx.configForms.get(...)` — accepted values plus the
 * revisioned write queue — instead of a bespoke config route and polling.
 *
 * @module dsh-ambient-ui/client
 */
import { AMBIENT_SETTINGS_NAMESPACE } from "../config.js";
import { BalanceWidget } from "../BalanceWidget.js";
import { AmbientRow } from "../AmbientRow.js";
import { TrailAnimation } from "../TrailAnimation.js";
import { installGlass } from "./glass.js";
import { attachAmbientConfigScope } from "./ambientConfigStore.js";
export { BalanceWidget } from "../BalanceWidget.js";
export { AmbientRow } from "../AmbientRow.js";
export { TrailAnimation } from "../TrailAnimation.js";
/** Stable cordis plugin name. */
export const name = 'dsh-ambient-ui-client';
/** Required client services before either widget mounts. */
export const inject = ['slots', 'configForms'];
/**
 * Register both widgets, the settings row, and the ambient config form.
 *
 * Registrations are deferred through `ctx.slots.inject(...)`: the seats are
 * declared by other client modules (conversation shell, settings General
 * section) whose activation order relative to this plugin is unconstrained,
 * and registering into an undeclared slot throws. `inject` runs the callback
 * as soon as the seat is declared and disposes the contribution when the
 * seat's declaration collapses.
 */
export function apply(ctx) {
    // Take the `ambient` entry's form from the settings provider: one controller
    // per Host entry, shared by every editor, holding the accepted values and the
    // revisioned write queue. The entry id is the cordis.patch.yml insert id,
    // which is what the Host's Config schema is keyed by.
    const form = ctx.configForms.get(AMBIENT_SETTINGS_NAMESPACE);
    const detachScope = attachAmbientConfigScope(form);
    ctx.effect(() => {
        const disposers = [
            detachScope,
            // Balance chip sits in the composer tool row, level with the input box.
            ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
                name: 'conversation.input.right',
                id: 'ambient-balance',
                order: 20,
            }, BalanceWidget)),
            // Pixel trail sits above the composer card so the input stays at the bottom.
            ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
                name: 'conversation.input.dock',
                id: 'ambient-trail',
                order: 10,
            }, TrailAnimation)),
            // Ambient UI row at the bottom of the Settings panel's General section.
            ctx.slots.inject('settings.general.item', () => ctx.slots.register({
                name: 'settings.general.item',
                id: 'ambient-ui',
                order: 100,
            }, AmbientRow)),
            installGlass(),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'dsh-ambient-ui: widget registration');
}
