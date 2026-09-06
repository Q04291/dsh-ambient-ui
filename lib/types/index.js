/**
 * dsh-ambient-ui Host half: registers the `ambient` settings namespace (the
 * schema the browser settings scope reads and edits through the native
 * settings transport) and the balance + token HTTP routes. The browser half
 * (the `./client` entry) mounts the floating widget and the pixel trail.
 *
 * Install via `dsh plugin --profile web add <path-or-git-url>`; the
 * cordis.patch.yml inserts this plugin row.
 *
 * @module dsh-ambient-ui
 */
import z from '@deepseek-ai/schemastery';
import { AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE } from "./config.js";
import { AmbientService } from "./service.js";
import { makeAmbientRoutes } from "./routes.js";
export { AmbientService } from "./service.js";
export { AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE, normalizeAmbientSettings } from "./config.js";
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from "./routes.js";
/** Settings section schema: what the settings scope decodes and edits. */
export const AMBIENT_SETTINGS_SCHEMA = z.object({
    opacity: z.number().min(0.3).max(1).default(AMBIENT_DEFAULTS.opacity),
    blur: z.number().min(0).max(30).default(AMBIENT_DEFAULTS.blur),
    speed: z.number().min(1).max(10).default(AMBIENT_DEFAULTS.speed),
    showBalance: z.boolean().default(AMBIENT_DEFAULTS.showBalance),
    showTrail: z.boolean().default(AMBIENT_DEFAULTS.showTrail),
    glass: z.boolean().default(AMBIENT_DEFAULTS.glass),
});
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export const name = 'ambient';
/** Services required before the ambient service can answer. */
export const inject = ['webServer', 'sessions'];
/** Register the ambient service, its balance/token routes, and its settings namespace. */
export function apply(ctx, config = {}) {
    const service = new AmbientService(ctx, config);
    // Composition `base` for the settings namespace: the resolved value layers
    // schema defaults, this base, then the user document section. The browser
    // mirror shows the namespace as soon as the provider serves it.
    const base = {
        opacity: config.opacity ?? AMBIENT_DEFAULTS.opacity,
        blur: config.blur ?? AMBIENT_DEFAULTS.blur,
        speed: config.speed ?? AMBIENT_DEFAULTS.speed,
        showBalance: config.showBalance ?? AMBIENT_DEFAULTS.showBalance,
        showTrail: config.showTrail ?? AMBIENT_DEFAULTS.showTrail,
        glass: config.glass ?? AMBIENT_DEFAULTS.glass,
    };
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
    // Register the `ambient` settings namespace through the live settings
    // service. 0.1.2-rc.1 replaced the old top-level installSettingsSection /
    // settingsNamespace helpers with the ctx.settings service API; the argument
    // order maps 1:1 (owner, ns, schema, entry=base, hooks).
    ctx.inject(['settings'], (settingsCtx) => {
        settingsCtx.settings.installSection(ctx, AMBIENT_SETTINGS_NAMESPACE, AMBIENT_SETTINGS_SCHEMA, base, {
            setSource: () => {
                // The provider resolves the section (defaults + base + user); the
                // browser scope derives from the served view, so nothing is cached here.
            },
            onChange: () => {
                console.log('[dsh-ambient-ui] ambient settings namespace registered (onChange)');
            },
        });
        console.log('[dsh-ambient-ui] installSection registered the ambient settings namespace');
    });
}
