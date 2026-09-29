import z from "@deepseek-ai/schemastery";
import { Service } from "@deepseek-ai/cordis";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
//#region src/config.ts
/** Defaults for every ambient setting (also the settings-section composition base). */
const AMBIENT_DEFAULTS = {
	opacity: .85,
	blur: 12,
	speed: 5,
	showBalance: true,
	showTrail: true,
	glass: true
};
/** Settings namespace of the ambient capability; it doubles as the cordis.patch.yml entry id. */
const AMBIENT_SETTINGS_NAMESPACE = "ambient";
/** Clamp a finite number into [min, max]. */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}
/**
* Tolerantly normalize an unknown settings section into a valid
* AmbientSettings. Used as the client settings-scope decode so a partial or
* out-of-range persisted section can never wedge the readout in "loading".
*/
function normalizeAmbientSettings(section) {
	if (typeof section !== "object" || section === null || Array.isArray(section)) return { ...AMBIENT_DEFAULTS };
	const raw = section;
	return {
		opacity: typeof raw.opacity === "number" && Number.isFinite(raw.opacity) ? clamp(raw.opacity, .3, 1) : AMBIENT_DEFAULTS.opacity,
		blur: typeof raw.blur === "number" && Number.isFinite(raw.blur) ? Math.round(clamp(raw.blur, 0, 30)) : AMBIENT_DEFAULTS.blur,
		speed: typeof raw.speed === "number" && Number.isFinite(raw.speed) ? Math.round(clamp(raw.speed, 1, 10)) : AMBIENT_DEFAULTS.speed,
		showBalance: typeof raw.showBalance === "boolean" ? raw.showBalance : AMBIENT_DEFAULTS.showBalance,
		showTrail: typeof raw.showTrail === "boolean" ? raw.showTrail : AMBIENT_DEFAULTS.showTrail,
		glass: typeof raw.glass === "boolean" ? raw.glass : AMBIENT_DEFAULTS.glass
	};
}
/** SSRF/length guard for the base URL override. */
const MAX_BASE_URL_LENGTH = 256;
/** Provider request timeout. */
const QUERY_TIMEOUT_MS = 1e4;
/** Parse a base URL into a safe `{ origin, pathPrefix }` pair. */
function parseBaseUrl(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		throw new Error(`invalid base URL "${raw}"`);
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`unsupported base URL protocol "${url.protocol}"`);
	if (raw.length > MAX_BASE_URL_LENGTH) throw new Error("base URL too long");
	return {
		origin: url.origin,
		prefix: url.pathname.replace(/\/+$/, "")
	};
}
/** Sum one currency bucket into a number. */
function totalOf(balance) {
	const value = Number(balance.total_balance);
	return Number.isFinite(value) ? value : 0;
}
/** Format a provider error into a compact stable code. */
function errorCode(error) {
	if (error instanceof Error && error.message.length > 0) return error.message.slice(0, 120);
	return String(error).slice(0, 120);
}
/** The ambient service: balance probe + session token read. */
var AmbientService = class extends Service {
	apiKeyEnv;
	baseUrl;
	refreshIntervalMs;
	cached;
	cachedAt = 0;
	inflight;
	constructor(ctx, config = {}) {
		super(ctx, "ambient");
		this.apiKeyEnv = credentialRef(config.apiKeyEnv ?? "DEEPSEEK_API_KEY");
		this.baseUrl = parseBaseUrl(config.baseUrl ?? "https://api.deepseek.com");
		this.refreshIntervalMs = Math.max(0, (config.refreshIntervalSeconds ?? 30) * 1e3);
	}
	/** RPC: most recent balance view. A healthy cached view is reused while fresh. */
	async view() {
		const now = Date.now();
		const cached = this.cached;
		if (cached !== void 0 && cached.error === void 0 && now - this.cachedAt < this.refreshIntervalMs && this.refreshIntervalMs > 0) return cached;
		if (this.inflight !== void 0) return this.inflight;
		this.inflight = this.query().then((view) => {
			this.cached = view;
			this.cachedAt = Date.now();
			return view;
		}).finally(() => {
			this.inflight = void 0;
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
		const meter = this.ctx.get("tokenMeter");
		if (meter === void 0) return {
			ok: false,
			error: "token-meter-unavailable"
		};
		try {
			const measurement = meter.measure(session);
			return {
				ok: true,
				totalTokens: measurement.totalTokens,
				surfaceTokens: measurement.surfaceTokens
			};
		} catch (error) {
			return {
				ok: false,
				error: errorCode(error)
			};
		}
	}
	/** Query the provider, tolerating every failure into a view with an error field. */
	async query() {
		const now = Date.now();
		const credentials = this.ctx.get("credentials");
		const resolved = credentials === void 0 ? void 0 : await credentials.resolve(this.apiKeyEnv);
		if (resolved?.value === void 0 || resolved.value.length === 0) return {
			fetchedAt: now,
			available: false,
			balances: [],
			error: "missing-credential"
		};
		try {
			const response = await fetch(`${this.baseUrl.origin}${this.baseUrl.prefix}/user/balance`, {
				headers: { authorization: `Bearer ${resolved.value}` },
				signal: AbortSignal.timeout(QUERY_TIMEOUT_MS)
			});
			if (!response.ok) return {
				fetchedAt: now,
				available: false,
				balances: [],
				error: `http-${response.status}`
			};
			const body = await response.json();
			const balances = Array.isArray(body.balance_infos) ? body.balance_infos : [];
			let total;
			let currency;
			if (balances.length === 1) {
				total = totalOf(balances[0]);
				currency = balances[0].currency;
			} else if (balances.length > 1) {
				if (new Set(balances.map((b) => b.currency)).size === 1) {
					currency = balances[0].currency;
					total = balances.reduce((sum, b) => sum + totalOf(b), 0);
				}
			}
			return {
				fetchedAt: now,
				available: body.is_available !== false,
				balances,
				...total === void 0 ? {} : { total },
				...currency === void 0 ? {} : { currency }
			};
		} catch (error) {
			return {
				fetchedAt: now,
				available: false,
				balances: [],
				error: errorCode(error)
			};
		}
	}
};
//#endregion
//#region src/routes.ts
/** Browser-facing base path of the ambient API. */
const AMBIENT_API_PREFIX = "/api/ambient";
/** Write one JSON response. */
function json(res, status, body) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
	if (req.method === method) return true;
	json(res, 405, {
		ok: false,
		error: "method-not-allowed"
	});
	return false;
}
/** Wrap one async balance read as a GET JSON route. */
function getRoute(path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res, "GET")) return;
			Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
				json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** Read the `session` query parameter from the request URL. */
function sessionParam(req) {
	const raw = req.url ?? "";
	const q = raw.indexOf("?");
	if (q < 0) return void 0;
	const value = new URLSearchParams(raw.slice(q + 1)).get("session");
	return value === null || value === "" ? void 0 : value;
}
/**
* Build the ambient balance/token route family for one service.
* @param service - the ambient service.
* @param resolveSession - resolve a session id to the session (undefined when absent).
*/
function makeAmbientRoutes(service, resolveSession) {
	return [
		getRoute(`${AMBIENT_API_PREFIX}/balance`, () => service.view()),
		getRoute(`${AMBIENT_API_PREFIX}/balance/refresh`, () => service.refresh()),
		{
			kind: "exact",
			path: `${AMBIENT_API_PREFIX}/tokens`,
			handler: (req, res) => {
				if (!requireMethod(req, res, "GET")) return;
				let value;
				const id = sessionParam(req);
				if (id === void 0) value = {
					ok: false,
					error: "missing-session"
				};
				else {
					const session = resolveSession(id);
					value = session === void 0 ? {
						ok: false,
						error: "unknown-session"
					} : service.tokens(session);
				}
				json(res, 200, value);
			}
		}
	];
}
//#endregion
//#region src/index.ts
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
const Config = z.object({
	opacity: z.number().min(.3).max(1).default(AMBIENT_DEFAULTS.opacity).volatile(),
	blur: z.number().min(0).max(30).default(AMBIENT_DEFAULTS.blur).volatile(),
	speed: z.number().min(1).max(10).default(AMBIENT_DEFAULTS.speed).volatile(),
	showBalance: z.boolean().default(AMBIENT_DEFAULTS.showBalance).volatile(),
	showTrail: z.boolean().default(AMBIENT_DEFAULTS.showTrail).volatile(),
	glass: z.boolean().default(AMBIENT_DEFAULTS.glass).volatile(),
	apiKeyEnv: z.string(),
	baseUrl: z.string(),
	refreshIntervalSeconds: z.number().min(0)
});
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
const name = "ambient";
/** Services required before the ambient service can answer. */
const inject = ["webServer", "sessions"];
/** Register the ambient service, its balance/token routes, and its form policy. */
function apply(ctx, config = {}) {
	const service = new AmbientService(ctx, {
		apiKeyEnv: config.apiKeyEnv,
		baseUrl: config.baseUrl,
		refreshIntervalSeconds: config.refreshIntervalSeconds
	});
	const resolveSession = (id) => {
		return ctx.get("sessions")?.get(id);
	};
	const routes = makeAmbientRoutes(service, resolveSession);
	ctx.effect(() => {
		const disposers = routes.map((route) => ctx.webServer.register(route));
		return () => {
			for (const dispose of disposers) dispose();
		};
	}, "ambient: routes");
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber));
	});
}
//#endregion
export { AMBIENT_API_PREFIX, AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE, AmbientService, Config, apply, inject, makeAmbientRoutes, name, normalizeAmbientSettings };
