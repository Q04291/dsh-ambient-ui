/**
 * dsh-ambient-ui Host half: registers the `ambient` settings section (the
 * Settings panel surface for opacity / blur / speed / toggles) and the
 * balance + token HTTP routes. The browser half (the `./client` entry) mounts
 * the floating widget and the pixel trail.
 *
 * Install via `dsh plugin --profile web add <path-or-git-url>`; the
 * cordis.patch.yml inserts this plugin row.
 *
 * @module dsh-ambient-ui
 */
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { AMBIENT_DEFAULTS } from "./config.js";
import { AmbientService } from "./service.js";
import { makeAmbientRoutes } from "./routes.js";
export { AmbientService } from "./service.js";
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from "./routes.js";
export { AMBIENT_DEFAULTS, normalizeAmbientSettings } from "./config.js";
/** Settings namespace of the ambient capability. */
export const AMBIENT_SETTINGS_NAMESPACE = 'ambient';
/** Settings section schema: what the web settings surface edits. */
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
/** Register the ambient service, its API routes, and its settings section. */
export function apply(ctx, config = {}) {
    const service = new AmbientService(ctx, config);
    const base = {
        opacity: config.opacity ?? AMBIENT_DEFAULTS.opacity,
        blur: config.blur ?? AMBIENT_DEFAULTS.blur,
        speed: config.speed ?? AMBIENT_DEFAULTS.speed,
        showBalance: config.showBalance ?? AMBIENT_DEFAULTS.showBalance,
        showTrail: config.showTrail ?? AMBIENT_DEFAULTS.showTrail,
        glass: config.glass ?? AMBIENT_DEFAULTS.glass,
    };
    // The settings surface edits only the schema-declared fields; the
    // browser readout consumes the namespace reactively through the client
    // settings scope, so the Host only needs to keep the source live.
    let current = () => base;
    const resolveSession = (id) => {
        const sessions = ctx.get('sessions');
        return sessions?.get(id);
    };
    // Diagnostics: confirm the settings seam is reachable and the section registers.
    const settingsSeamRef = () => ctx.get('settings');
    console.log('[dsh-ambient-ui] apply: settings service present (at apply) =', settingsSeamRef() !== undefined);
    const routes = makeAmbientRoutes(service, resolveSession, () => settingsSeamRef()?.describe?.({ redactSecrets: true }) ?? [], () => settingsSeamRef());
    ctx.effect(() => {
        const disposers = routes.map((route) => ctx.webServer.register(route));
        return () => { for (const dispose of disposers)
            dispose(); };
    }, 'ambient: routes');
    try {
        installSettingsSection(ctx, settingsNamespace(AMBIENT_SETTINGS_NAMESPACE), AMBIENT_SETTINGS_SCHEMA, base, {
            setSource: (source) => { current = source; },
            onChange: () => {
                // Fires when the inner settings inject registers the section.
                console.log('[dsh-ambient-ui] settings section onChange fired (registration live)');
                void current;
            },
        });
        console.log('[dsh-ambient-ui] installSettingsSection registered without throwing');
    }
    catch (error) {
        console.error('[dsh-ambient-ui] installSettingsSection FAILED:', error);
    }
}
