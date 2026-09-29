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
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type AmbientRuntimeConfig } from './config.ts';
export { AmbientService } from './service.ts';
export type { BalanceInfo, BalanceView, TokenView } from './service.ts';
export { AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE, normalizeAmbientSettings } from './config.ts';
export type { AmbientConfig, AmbientSettings } from './config.ts';
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from './routes.ts';
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
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    opacity: z<number, number, "volatile-defined">;
    blur: z<number, number, "volatile-defined">;
    speed: z<number, number, "volatile-defined">;
    showBalance: z<boolean, boolean, "volatile-defined">;
    showTrail: z<boolean, boolean, "volatile-defined">;
    glass: z<boolean, boolean, "volatile-defined">;
    apiKeyEnv: z<string, string, "plain">;
    baseUrl: z<string, string, "plain">;
    refreshIntervalSeconds: z<number, number, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    opacity: z<number, number, "volatile-defined">;
    blur: z<number, number, "volatile-defined">;
    speed: z<number, number, "volatile-defined">;
    showBalance: z<boolean, boolean, "volatile-defined">;
    showTrail: z<boolean, boolean, "volatile-defined">;
    glass: z<boolean, boolean, "volatile-defined">;
    apiKeyEnv: z<string, string, "plain">;
    baseUrl: z<string, string, "plain">;
    refreshIntervalSeconds: z<number, number, "plain">;
}>>, "plain">;
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export declare const name = "ambient";
/** Services required before the ambient service can answer. */
export declare const inject: string[];
/** Register the ambient service, its balance/token routes, and its form policy. */
export declare function apply(ctx: Context, config?: AmbientRuntimeConfig): void;
//# sourceMappingURL=index.d.ts.map