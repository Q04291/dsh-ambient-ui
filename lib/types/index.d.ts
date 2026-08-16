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
import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type AmbientConfig } from './config.ts';
export { AmbientService } from './service.ts';
export type { BalanceInfo, BalanceView, TokenView } from './service.ts';
export { AMBIENT_API_PREFIX, makeAmbientRoutes } from './routes.ts';
export { AMBIENT_DEFAULTS, normalizeAmbientSettings } from './config.ts';
export type { AmbientConfig, AmbientSettings } from './config.ts';
/** Settings namespace of the ambient capability. */
export declare const AMBIENT_SETTINGS_NAMESPACE = "ambient";
/** Settings section schema: what the web settings surface edits. */
export declare const AMBIENT_SETTINGS_SCHEMA: z<Schemastery.ObjectS<{
    opacity: z<number, number>;
    blur: z<number, number>;
    speed: z<number, number>;
    showBalance: z<boolean, boolean>;
    showTrail: z<boolean, boolean>;
    glass: z<boolean, boolean>;
}>, Schemastery.ObjectT<{
    opacity: z<number, number>;
    blur: z<number, number>;
    speed: z<number, number>;
    showBalance: z<boolean, boolean>;
    showTrail: z<boolean, boolean>;
    glass: z<boolean, boolean>;
}>>;
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
export declare const name = "ambient";
/** Services required before the ambient service can answer. */
export declare const inject: string[];
/** Register the ambient service, its API routes, and its settings section. */
export declare function apply(ctx: Context, config?: AmbientConfig): void;
//# sourceMappingURL=index.d.ts.map