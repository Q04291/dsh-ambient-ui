/**
 * dsh-ambient-ui Host service: the `ambient` RPC domain.
 *
 * Resolves the DeepSeek API key through the DSH credentials seam
 * (`ctx.credentials`, ref `DEEPSEEK_API_KEY`) and queries the official
 * Get User Balance endpoint, caching the result so the browser readout can
 * poll without spamming the provider. Session token pressure is read from
 * the token-meter service (`ctx.tokenMeter`) and degrades to zeros when the
 * service is absent from the profile.
 *
 * @module dsh-ambient-ui/service
 */
import { Context, Service } from '@deepseek-ai/cordis';
import { type AmbientSettings } from './config.ts';
import type { Session } from '@deepseek-ai/dsh-session';
import type { AmbientConfig } from './config.ts';
/** DeepSeek API base URL. */
export declare const DEFAULT_BASE_URL = "https://api.deepseek.com";
/** Default credential reference for the DeepSeek API key. */
export declare const DEFAULT_API_KEY_ENV = "DEEPSEEK_API_KEY";
/** Default provider query pacing. */
export declare const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
/** One currency bucket reported by Get User Balance. */
export interface BalanceInfo {
    currency: string;
    total_balance: string;
    granted_balance: string;
    topped_up_balance: string;
}
/** The full Get User Balance response body. */
export interface BalanceResponse {
    is_available: boolean;
    balance_infos: BalanceInfo[];
}
/** Cleaned view served to the browser readout. */
export interface BalanceView {
    /** Query snapshot time (epoch ms). */
    fetchedAt: number;
    /** Whether the account can currently be billed. */
    available: boolean;
    /** Per-currency buckets. */
    balances: BalanceInfo[];
    /** The single summed total across all currencies (when exactly one currency). */
    total?: number;
    /** ISO currency of {@link total}. */
    currency?: string;
    /** Human-readable error when the provider query failed. */
    error?: string;
}
/** Session token pressure served to the browser readout. */
export interface TokenView {
    ok: boolean;
    /** Current request-and-response pressure in tokens. */
    totalTokens?: number;
    /** Heuristic tokens across the current session surface. */
    surfaceTokens?: number;
    error?: string;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        ambient: AmbientService;
    }
}
/** The ambient service: balance probe + session token read. */
export declare class AmbientService extends Service {
    private readonly apiKeyEnv;
    private readonly baseUrl;
    private readonly refreshIntervalMs;
    private cached;
    private cachedAt;
    private inflight;
    constructor(ctx: Context, config?: AmbientConfig);
    /** RPC: most recent balance view. A healthy cached view is reused while fresh. */
    view(): Promise<BalanceView>;
    /** RPC: force a fresh provider query (bypasses the cache window). */
    refresh(): Promise<BalanceView>;
    /** RPC: current session token pressure via the token-meter service. */
    tokens(session: Session): TokenView;
    /** Query the provider, tolerating every failure into a view with an error field. */
    private query;
    /** In-process settings seam shape (the wire exposure allowlist does not apply). */
    private get settingsSeam();
    /** Current resolved ambient config from the settings seam (normalized). */
    readConfig(): AmbientSettings;
    /** Apply a partial config patch through the in-process settings seam. */
    writeConfig(patch: Partial<AmbientSettings>): Promise<AmbientSettings>;
}
//# sourceMappingURL=service.d.ts.map