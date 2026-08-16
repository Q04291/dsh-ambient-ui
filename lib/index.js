import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
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
	/** In-process settings seam shape (the wire exposure allowlist does not apply). */
	get settingsSeam() {
		return this.ctx.get("settings");
	}
	/** Current resolved ambient config from the settings seam (normalized). */
	readConfig() {
		const raw = this.settingsSeam?.get("ambient");
		return normalizeAmbientSettings(raw);
	}
	/** Apply a partial config patch through the in-process settings seam. */
	async writeConfig(patch) {
		const seam = this.settingsSeam;
		if (seam === void 0) throw new Error("settings service unavailable");
		const next = normalizeAmbientSettings({
			...this.readConfig(),
			...patch
		});
		await seam.mutate("ambient", [
			{
				op: "set",
				path: ["opacity"],
				value: next.opacity
			},
			{
				op: "set",
				path: ["blur"],
				value: next.blur
			},
			{
				op: "set",
				path: ["speed"],
				value: next.speed
			},
			{
				op: "set",
				path: ["showBalance"],
				value: next.showBalance
			},
			{
				op: "set",
				path: ["showTrail"],
				value: next.showTrail
			},
			{
				op: "set",
				path: ["glass"],
				value: next.glass
			}
		]);
		return this.readConfig();
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
/** Wrap one request-aware JSON route (e.g. the session-token read). */
function getRequestRoute(path, run) {
	return {
		kind: "exact",
		path,
		handler: (req, res) => {
			if (!requireMethod(req, res, "GET")) return;
			Promise.resolve(run(req)).then((value) => json(res, 200, value), (error) => {
				json(res, 500, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			});
		}
	};
}
/** Read a JSON request body (bounded). */
function readJsonBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 65536) {
				reject(/* @__PURE__ */ new Error("body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			if (raw.length === 0) {
				resolve(void 0);
				return;
			}
			try {
				resolve(JSON.parse(raw));
			} catch (error) {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
		req.on("error", reject);
	});
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
* Build the full ambient API route family for one service.
* @param service - the ambient service.
* @param resolveSession - resolve a session id to the session (undefined when absent).
*/
function makeAmbientRoutes(service, resolveSession, describeSettings, settingsSeamRef) {
	return [
		{
			kind: "exact",
			path: `${AMBIENT_API_PREFIX}/config`,
			handler: (req, res) => {
				if (req.method === "GET") {
					Promise.resolve(service.readConfig()).then((value) => json(res, 200, value), (error) => json(res, 500, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					}));
					return;
				}
				if (req.method === "PUT") {
					Promise.resolve(readJsonBody(req)).then(async (body) => {
						const patch = typeof body === "object" && body !== null ? body : {};
						json(res, 200, await service.writeConfig(patch));
					}, (error) => {
						json(res, 400, {
							ok: false,
							error: error instanceof Error ? error.message : String(error)
						});
					});
					return;
				}
				json(res, 405, {
					ok: false,
					error: "method-not-allowed"
				});
			}
		},
		getRoute(`${AMBIENT_API_PREFIX}/balance`, () => service.view()),
		getRoute(`${AMBIENT_API_PREFIX}/balance/refresh`, () => service.refresh()),
		...describeSettings === void 0 ? [] : [getRequestRoute(`${AMBIENT_API_PREFIX}/debug`, () => {
			const namespaces = describeSettings().map((d) => d.ns);
			const seam = settingsSeamRef === void 0 ? void 0 : settingsSeamRef();
			return {
				ok: true,
				hasSettingsService: seam !== void 0,
				settingsCtor: seam !== void 0 ? seam.constructor?.name ?? "unknown" : null,
				registrationsSize: seam !== void 0 && typeof seam.registrations === "object" ? seam.registrations.size : -1,
				writable: seam !== void 0 && typeof seam.writable === "boolean" ? seam.writable : null,
				ambientValue: seam !== void 0 && typeof seam.get === "function" ? seam.get("ambient") : null,
				namespaces,
				ambientRegistered: namespaces.includes("ambient")
			};
		})],
		getRequestRoute(`${AMBIENT_API_PREFIX}/tokens`, (req) => {
			const id = sessionParam(req);
			if (id === void 0) return {
				ok: false,
				error: "missing-session"
			};
			const session = resolveSession(id);
			if (session === void 0) return {
				ok: false,
				error: "unknown-session"
			};
			return service.tokens(session);
		})
	];
}
//#endregion
//#region src/index.ts
/** Settings namespace of the ambient capability. */
const AMBIENT_SETTINGS_NAMESPACE = "ambient";
/** Settings section schema: what the web settings surface edits. */
const AMBIENT_SETTINGS_SCHEMA = z.object({
	opacity: z.number().min(.3).max(1).default(AMBIENT_DEFAULTS.opacity),
	blur: z.number().min(0).max(30).default(AMBIENT_DEFAULTS.blur),
	speed: z.number().min(1).max(10).default(AMBIENT_DEFAULTS.speed),
	showBalance: z.boolean().default(AMBIENT_DEFAULTS.showBalance),
	showTrail: z.boolean().default(AMBIENT_DEFAULTS.showTrail),
	glass: z.boolean().default(AMBIENT_DEFAULTS.glass)
});
/** Stable cordis plugin name (matches cordis.patch.yml insert id). */
const name = "ambient";
/** Services required before the ambient service can answer. */
const inject = ["webServer", "sessions"];
/** Register the ambient service, its API routes, and its settings section. */
function apply(ctx, config = {}) {
	const service = new AmbientService(ctx, config);
	const base = {
		opacity: config.opacity ?? AMBIENT_DEFAULTS.opacity,
		blur: config.blur ?? AMBIENT_DEFAULTS.blur,
		speed: config.speed ?? AMBIENT_DEFAULTS.speed,
		showBalance: config.showBalance ?? AMBIENT_DEFAULTS.showBalance,
		showTrail: config.showTrail ?? AMBIENT_DEFAULTS.showTrail,
		glass: config.glass ?? AMBIENT_DEFAULTS.glass
	};
	const resolveSession = (id) => {
		return ctx.get("sessions")?.get(id);
	};
	const settingsSeamRef = () => ctx.get("settings");
	console.log("[dsh-ambient-ui] apply: settings service present (at apply) =", settingsSeamRef() !== void 0);
	const routes = makeAmbientRoutes(service, resolveSession, () => settingsSeamRef()?.describe?.({ redactSecrets: true }) ?? [], () => settingsSeamRef());
	ctx.effect(() => {
		const disposers = routes.map((route) => ctx.webServer.register(route));
		return () => {
			for (const dispose of disposers) dispose();
		};
	}, "ambient: routes");
	try {
		installSettingsSection(ctx, settingsNamespace(AMBIENT_SETTINGS_NAMESPACE), AMBIENT_SETTINGS_SCHEMA, base, {
			setSource: (source) => {},
			onChange: () => {
				console.log("[dsh-ambient-ui] settings section onChange fired (registration live)");
			}
		});
		console.log("[dsh-ambient-ui] installSettingsSection registered without throwing");
	} catch (error) {
		console.error("[dsh-ambient-ui] installSettingsSection FAILED:", error);
	}
}
//#endregion
export { AMBIENT_API_PREFIX, AMBIENT_DEFAULTS, AMBIENT_SETTINGS_NAMESPACE, AMBIENT_SETTINGS_SCHEMA, AmbientService, apply, inject, makeAmbientRoutes, name, normalizeAmbientSettings };
