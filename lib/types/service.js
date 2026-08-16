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
import { Service } from '@deepseek-ai/cordis';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { normalizeAmbientSettings } from "./config.js";
/** DeepSeek API base URL. */
export const DEFAULT_BASE_URL = 'https://api.deepseek.com';
/** Default credential reference for the DeepSeek API key. */
export const DEFAULT_API_KEY_ENV = 'DEEPSEEK_API_KEY';
/** Default provider query pacing. */
export const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
/** SSRF/length guard for the base URL override. */
const MAX_BASE_URL_LENGTH = 256;
/** Provider request timeout. */
const QUERY_TIMEOUT_MS = 10_000;
/** Parse a base URL into a safe `{ origin, pathPrefix }` pair. */
function parseBaseUrl(raw) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        throw new Error(`invalid base URL "${raw}"`);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error(`unsupported base URL protocol "${url.protocol}"`);
    }
    if (raw.length > MAX_BASE_URL_LENGTH)
        throw new Error('base URL too long');
    return { origin: url.origin, prefix: url.pathname.replace(/\/+$/, '') };
}
/** Sum one currency bucket into a number. */
function totalOf(balance) {
    const value = Number(balance.total_balance);
    return Number.isFinite(value) ? value : 0;
}
/** Format a provider error into a compact stable code. */
function errorCode(error) {
    if (error instanceof Error && error.message.length > 0)
        return error.message.slice(0, 120);
    return String(error).slice(0, 120);
}
/** The ambient service: balance probe + session token read. */
export class AmbientService extends Service {
    apiKeyEnv;
    baseUrl;
    refreshIntervalMs;
    cached;
    cachedAt = 0;
    inflight;
    constructor(ctx, config = {}) {
        super(ctx, 'ambient');
        this.apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV);
        this.baseUrl = parseBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL);
        this.refreshIntervalMs = Math.max(0, (config.refreshIntervalSeconds ?? DEFAULT_REFRESH_INTERVAL_SECONDS) * 1_000);
    }
    /** RPC: most recent balance view. A healthy cached view is reused while fresh. */
    async view() {
        const now = Date.now();
        const cached = this.cached;
        if (cached !== undefined && cached.error === undefined && now - this.cachedAt < this.refreshIntervalMs && this.refreshIntervalMs > 0) {
            return cached;
        }
        if (this.inflight !== undefined)
            return this.inflight;
        this.inflight = this.query().then((view) => {
            this.cached = view;
            this.cachedAt = Date.now();
            return view;
        }).finally(() => {
            this.inflight = undefined;
        });
        return this.inflight;
    }
    /** RPC: force a fresh provider query (bypasses the cache window). */
    async refresh() {
        const view = await this.query();
        this.cached = view;
        this.cachedAt = Date.now();
        return view;
    }
    /** RPC: current session token pressure via the token-meter service. */
    tokens(session) {
        const meter = this.ctx.get('tokenMeter');
        if (meter === undefined)
            return { ok: false, error: 'token-meter-unavailable' };
        try {
            const measurement = meter.measure(session);
            return {
                ok: true,
                totalTokens: measurement.totalTokens,
                surfaceTokens: measurement.surfaceTokens,
            };
        }
        catch (error) {
            return { ok: false, error: errorCode(error) };
        }
    }
    /** Query the provider, tolerating every failure into a view with an error field. */
    async query() {
        const now = Date.now();
        const credentials = this.ctx.get('credentials');
        const resolved = credentials === undefined ? undefined : await credentials.resolve(this.apiKeyEnv);
        if (resolved?.value === undefined || resolved.value.length === 0) {
            return { fetchedAt: now, available: false, balances: [], error: 'missing-credential' };
        }
        try {
            const response = await fetch(`${this.baseUrl.origin}${this.baseUrl.prefix}/user/balance`, {
                headers: { authorization: `Bearer ${resolved.value}` },
                signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
            });
            if (!response.ok) {
                return { fetchedAt: now, available: false, balances: [], error: `http-${response.status}` };
            }
            const body = (await response.json());
            const balances = Array.isArray(body.balance_infos) ? body.balance_infos : [];
            let total;
            let currency;
            if (balances.length === 1) {
                total = totalOf(balances[0]);
                currency = balances[0].currency;
            }
            else if (balances.length > 1) {
                const distinct = new Set(balances.map((b) => b.currency));
                if (distinct.size === 1) {
                    currency = balances[0].currency;
                    total = balances.reduce((sum, b) => sum + totalOf(b), 0);
                }
            }
            return {
                fetchedAt: now,
                available: body.is_available !== false,
                balances,
                ...(total === undefined ? {} : { total }),
                ...(currency === undefined ? {} : { currency }),
            };
        }
        catch (error) {
            return { fetchedAt: now, available: false, balances: [], error: errorCode(error) };
        }
    }
    /** In-process settings seam shape (the wire exposure allowlist does not apply). */
    get settingsSeam() {
        return this.ctx.get('settings');
    }
    /** Current resolved ambient config from the settings seam (normalized). */
    readConfig() {
        const raw = this.settingsSeam?.get('ambient');
        return normalizeAmbientSettings(raw);
    }
    /** Apply a partial config patch through the in-process settings seam. */
    async writeConfig(patch) {
        const seam = this.settingsSeam;
        if (seam === undefined)
            throw new Error('settings service unavailable');
        const next = normalizeAmbientSettings({ ...this.readConfig(), ...patch });
        await seam.mutate('ambient', [
            { op: 'set', path: ['opacity'], value: next.opacity },
            { op: 'set', path: ['blur'], value: next.blur },
            { op: 'set', path: ['speed'], value: next.speed },
            { op: 'set', path: ['showBalance'], value: next.showBalance },
            { op: 'set', path: ['showTrail'], value: next.showTrail },
            { op: 'set', path: ['glass'], value: next.glass },
        ]);
        return this.readConfig();
    }
}
