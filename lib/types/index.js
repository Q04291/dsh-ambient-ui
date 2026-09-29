/**
 * dsh-ambient-ui Host half: declares this plugin's Config — the schema DSH
 * derives the `ambient` settings form from — and the balance + token HTTP
 * routes. The browser half (the `./client` entry) mounts the floating widget
 * and the pixel trail and reads and writes that form through
 * `ctx.configForms`.
 *
 * Install via `dsh plugin --profile web add <path-or-git-url>`; the
 * cordis.patch.yml inserts this plugin row.
 *
 * @module dsh-ambient-ui
 */
import z from '@deepseek-ai/schemastery';
import { AMBIENT_DEFAULTS } from "./config.js";
import { AmbientService } from "./service.js";
import { makeAmbientRoutes } from "./routes.js";
export { AmbientService } from "./service.js";
export { AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE, normalizeAmbientSettings } from "./config.js";
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from "./routes.js";
/**
 * Plugin Config, and therefore the `ambient` settings form.
 *
 * DSH 0.2.0-rc.2 derives forms from the profile entry's own Config schema:
 * a `.volatile()` field is live — the Settings row writes it into the profile
 * patch and the running reference updates without a re-mount — while an
 * ordinary field stays a cordis-configuration knob. The six ambient fields are
 * volatile (the Settings row edits them); the three connection knobs are
 * ordinary, so they remain composition-layer configuration.
 */
export const Config = z.object({
    opacity: z.number().min(0.3).max(1).default(AMBIENT_DEFAULTS.opacity).volatile(),
    blur: z.number().min(0).max(30).default(AMBIENT_DEFAULTS.blur).volatile(),
    speed: z.number().min(1).max(10).default(AMBIENT_DEFAULTS.speed).volatile(),
    showBalance: z.boolean().default(AMBIENT_DEFAULTS.showBalance).volatile(),
    showTrail: z.boolean().default(AMBIENT_DEFAULTS.showTrail).volatile(),
    glass: z.boolean().default(AMBIENT_DEFAULTS.glass).volatile(),
    apiKeyEnv: z.string(),
    baseUrl: z.string(),
    refreshIntervalSeconds: z.number().min(0),
});
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export const name = 'ambient';
/** Services required before the ambient service can answer. */
export const inject = ['webServer', 'sessions'];
/** Register the ambient service, its balance/token routes, and its form policy. */
export function apply(ctx, config = {}) {
    // Only the connection knobs are read here: the six ambient fields are live
    // Config references the browser Settings form reads and writes directly, and
    // the Host side never needs their current value.
    const service = new AmbientService(ctx, {
        apiKeyEnv: config.apiKeyEnv,
        baseUrl: config.baseUrl,
        refreshIntervalSeconds: config.refreshIntervalSeconds,
    });
    const resolveSession = (id) => {
        const sessions = ctx.get('sessions');
        return sessions?.get(id);
    };
    const routes = makeAmbientRoutes(service, resolveSession);
    ctx.effect(() => {
        const disposers = routes.map((route) => ctx.webServer.register(route));
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'ambient: routes');
    // The `ambient` form is the entry's own Config, served by @deepseek-ai/dsh-settings;
    // nothing has to be registered here. This plugin renders its own Settings row
    // (the client half's `settings.general.item` seat), so the schema-generated
    // page is switched off. The policy belongs to this fiber and does not gate
    // configuration reads or writes.
    ctx.inject(['settings'], (settingsCtx) => {
        settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
    });
}
