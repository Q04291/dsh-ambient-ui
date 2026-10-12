window.__ModuleLoader__.load({
	id: "dsh-ambient-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		function clamp$2(value, min, max) {
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
				opacity: typeof raw.opacity === "number" && Number.isFinite(raw.opacity) ? clamp$2(raw.opacity, .3, 1) : AMBIENT_DEFAULTS.opacity,
				blur: typeof raw.blur === "number" && Number.isFinite(raw.blur) ? Math.round(clamp$2(raw.blur, 0, 30)) : AMBIENT_DEFAULTS.blur,
				speed: typeof raw.speed === "number" && Number.isFinite(raw.speed) ? Math.round(clamp$2(raw.speed, 1, 10)) : AMBIENT_DEFAULTS.speed,
				showBalance: typeof raw.showBalance === "boolean" ? raw.showBalance : AMBIENT_DEFAULTS.showBalance,
				showTrail: typeof raw.showTrail === "boolean" ? raw.showTrail : AMBIENT_DEFAULTS.showTrail,
				glass: typeof raw.glass === "boolean" ? raw.glass : AMBIENT_DEFAULTS.glass
			};
		}
		//#endregion
		//#region src/client/ambientConfigStore.ts
		/**
		* Module-level reactive ambient config store, fed by the native settings form.
		*
		* The client entry takes the `ambient` profile entry's form from
		* `ctx.configForms` (the settings provider's per-entry controller: accepted
		* values plus a revisioned write queue) and attaches it here. Every consumer —
		* the settings row, the balance chip, the glass effect — shares ONE store, so a
		* change written through the form re-renders all of them immediately instead of
		* waiting for a poll or a page refresh.
		*
		* No polling: the provider folds every Host document update into the shared
		* describe mirror, and each write carries the latest entry revision.
		*
		* @module dsh-ambient-ui/ambientConfigStore
		*/
		let state = {
			status: "loading",
			value: { ...AMBIENT_DEFAULTS }
		};
		let scope;
		let unsubscribe;
		const listeners$1 = /* @__PURE__ */ new Set();
		function emit() {
			for (const listener of [...listeners$1]) try {
				listener();
			} catch {}
		}
		/** Re-derive the store snapshot from the attached scope. */
		function pull() {
			const current = scope;
			if (current === void 0) return;
			const snapshot = current.getSnapshot();
			if (snapshot.status === "ready" && snapshot.value !== void 0) state = {
				status: "ready",
				value: normalizeAmbientSettings(snapshot.value)
			};
			else if (snapshot.status === "unavailable") state = {
				status: "ready",
				value: { ...AMBIENT_DEFAULTS }
			};
			emit();
		}
		/**
		* Attach the native settings form for the `ambient` profile entry.
		* @param next - the form from `ctx.configForms.get(...)`.
		* @returns a disposer detaching this store from the form.
		*/
		function attachAmbientConfigScope(next) {
			detachAmbientConfigScope();
			scope = next;
			unsubscribe = next.subscribe(() => {
				pull();
			});
			pull();
			return detachAmbientConfigScope;
		}
		/** Detach the attached scope (idempotent). */
		function detachAmbientConfigScope() {
			unsubscribe?.();
			unsubscribe = void 0;
			scope = void 0;
		}
		/** Current snapshot (stable reference between updates). */
		function getAmbientConfigSnapshot() {
			return state;
		}
		/** Subscribe to snapshot replacements. */
		function subscribeAmbientConfig(listener) {
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
			};
		}
		/** Persist one field through the native settings form and republish. */
		async function setAmbientConfig(field, next) {
			const current = scope;
			if (current === void 0) {
				console.warn("[dsh-ambient-ui] settings form not attached; ignoring write", field, next);
				return;
			}
			await current.set(field, next);
			pull();
		}
		//#endregion
		//#region src/client/useAmbientConfig.ts
		/**
		* React binding over the shared ambient config store.
		*
		* @module dsh-ambient-ui/useAmbientConfig
		*/
		/** Subscribe to the shared store; every consumer converges on the same value. */
		function useAmbientConfig() {
			const snapshot = (0, react.useSyncExternalStore)(subscribeAmbientConfig, getAmbientConfigSnapshot);
			const set = (0, react.useCallback)((field, next) => setAmbientConfig(field, next), []);
			return {
				status: snapshot.status,
				value: snapshot.value,
				set
			};
		}
		//#endregion
		//#region src/client/theme.ts
		/**
		* DSH theme and platform signals shared by the ambient widgets.
		*
		* DSH marks the dark theme with `body[data-ds-dark-theme]` — not
		* `prefers-color-scheme` and not an attribute on `documentElement` — and
		* declares every `--dsw-*` token on `body`. Both facts are load-bearing:
		* reading the tokens from `documentElement` returns empty strings, and writing
		* an override there is overridden by the `body` rule.
		*
		* @module dsh-ambient-ui/client/theme
		*/
		/** The body attribute DSH flips for the dark theme. */
		const DARK_ATTRIBUTE = "data-ds-dark-theme";
		/** Cached dark-theme answer; `useSyncExternalStore` requires a stable snapshot. */
		let cachedDark = false;
		/** Whether a listener has forced the observer to be connected. */
		let observing = false;
		/** Live subscribers to theme mutations. */
		const listeners = /* @__PURE__ */ new Set();
		/**
		* Read the current dark-theme state.
		* @returns true when DSH has the dark theme active.
		*/
		function isDarkTheme() {
			if (typeof document === "undefined") return false;
			const body = document.body;
			if (body === null || body === void 0) return false;
			if (body.hasAttribute(DARK_ATTRIBUTE)) return true;
			return document.documentElement?.hasAttribute(DARK_ATTRIBUTE) === true;
		}
		/** Notify every subscriber after a re-read of the theme state. */
		function publish() {
			cachedDark = isDarkTheme();
			for (const listener of [...listeners]) try {
				listener();
			} catch {}
		}
		/** Connect the shared mutation observer (idempotent). */
		function observe() {
			if (observing) return;
			if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
			const body = document.body;
			if (body === null || body === void 0) return;
			observing = true;
			const observer = new MutationObserver(publish);
			observer.observe(body, {
				attributes: true,
				attributeFilter: [DARK_ATTRIBUTE, "class"]
			});
			const root = document.documentElement;
			if (root !== null && root !== void 0) observer.observe(root, {
				attributes: true,
				attributeFilter: [
					DARK_ATTRIBUTE,
					"class",
					"data-theme"
				]
			});
		}
		/**
		* Subscribe to DSH theme mutations (dark-theme flips and theme class swaps).
		* @param listener - called after every relevant attribute change.
		* @returns a disposer.
		*/
		function subscribeTheme(listener) {
			observe();
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/**
		* Stable dark-theme snapshot for `useSyncExternalStore`.
		* @returns true when DSH has the dark theme active.
		*/
		function getDarkThemeSnapshot() {
			return cachedDark;
		}
		/** Snapshot used when no DOM exists. */
		function getDarkThemeServerSnapshot() {
			return false;
		}
		/**
		* Track the DSH dark theme in a component.
		* @returns true when the dark theme is active.
		*/
		function useDarkTheme() {
			(0, react.useEffect)(() => {
				cachedDark = isDarkTheme();
			}, []);
			return (0, react.useSyncExternalStore)(subscribeTheme, getDarkThemeSnapshot, getDarkThemeServerSnapshot);
		}
		/**
		* Resolve one DSH token to a concrete colour.
		*
		* Canvas cannot read CSS variables, so the trail resolves its palette through
		* here. The global observer is disconnected during the read so writing the
		* value back can never feed a mutation loop.
		* @param name - the `--dsw-*` custom property.
		* @param fallback - value used when the token is absent (older or stripped theme).
		* @returns the computed colour, or the fallback.
		*/
		function readThemeToken(name, fallback) {
			if (typeof window === "undefined" || typeof document === "undefined") return fallback;
			const scope = document.body ?? document.documentElement;
			if (scope === null || scope === void 0 || typeof getComputedStyle !== "function") return fallback;
			const value = getComputedStyle(scope).getPropertyValue(name).trim();
			return value.length > 0 ? value : fallback;
		}
		/**
		* Track `prefers-reduced-motion`.
		* @returns true when the user asked for reduced motion.
		*/
		function usePrefersReducedMotion() {
			const [reduced, setReduced] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
				const query = window.matchMedia("(prefers-reduced-motion: reduce)");
				setReduced(query.matches);
				const onChange = (event) => {
					setReduced(event.matches);
				};
				query.addEventListener("change", onChange);
				return () => {
					query.removeEventListener("change", onChange);
				};
			}, []);
			return reduced;
		}
		//#endregion
		//#region src/glassRecipe.ts
		/**
		* The glassmorphism recipe: one source of truth for the balance card, the
		* pixel-trail chrome, and the global DSH popup glass.
		*
		* Ported from the reference generator at
		* https://www.toolg.cn/toolbox/css_mao.html, whose entire surface is
		*
		* ```css
		* .glass       { backdrop-filter: blur(var(--blur));
		*                border: var(--border) solid #ffffff2e }
		* .glass-light { background: hsla(0, 0%, 100%, var(--opacity));
		*                box-shadow: 0 6px 15px 0 #8e8e8e30 }
		* .glass-dark  { background: hsla(0, 0%, 35%, var(--opacity));
		*                box-shadow: 0 6px 15px 0 #0e0e0e30 }
		* ```
		*
		* with `--opacity` a LOW tint alpha (the reference default is 0.25), a bright
		* translucent white rim, a tight soft shadow rather than a heavy drop shadow,
		* and a plain `blur()` with no `saturate()`.
		*
		* Two deliberate departures, each required by DSH's own surfaces:
		*
		* 1. The reference demo sits on a saturated gradient, where a 25% tint already
		*    reads as glass. DSH's composer sits on a near-white or near-black neutral,
		*    so each surface adds a 1px translucent white rim plus a half-pixel inset
		*    hairline — without them the card edge disappears into the backdrop.
		* 2. When the browser has no `backdrop-filter` the tint is forced near-opaque,
		*    so the widget stays legible instead of becoming a transparent smear.
		*
		* ## The `opacity` setting
		*
		* `opacity` no longer means CSS `opacity` (which faded the widget's text along
		* with its chrome). It is the tint *density* knob, mapping linearly onto the
		* reference's `--opacity` band `[GLASS_TINT_MIN, GLASS_TINT_MAX]` = [0.05,
		* 0.42]. At the default 0.85 the card is 34% tinted; at 0.3 it is 5% tinted
		* (nearly clear glass); at 1.0 it is 42% tinted (still clearly translucent).
		* 0.68 reproduces the reference generator's own default of 25%.
		*
		* ## One tint, three surfaces
		*
		* The balance card, its detail popover and DSH's own modal dialogs all read
		* {@link glassTintAlpha}. A denser "panel band" for the dialogs was tried and
		* removed: DSH paints `.dialog` with the *opaque* `--dsw-alias-bg-layer-2` and
		* leaves its scrim at `--dsw-mask-blur: none`, so the plugin is the only source
		* of glass there, and a second band only put the popups out of step with the
		* card — at the default it left the dialogs 62%–92% opaque, i.e. visually solid.
		*
		* DSH's menus are deliberately NOT re-coloured. `--dsw-menu-surface-fill` is
		* already `#f8f9fa94` (light) / `#43454a73` (dark) under `blur(40px)`, which is
		* the reference recipe with a stronger blur; mixing it again only risked making
		* the menus *more* opaque than DSH ships them.
		*
		* @module dsh-ambient-ui/glassRecipe
		*/
		/** Tint alpha at the bottom of the `opacity` range: nearly clear glass. */
		const GLASS_TINT_MIN = .05;
		/** Lowest `opacity` setting; mirrors the Config schema and the settings slider. */
		const GLASS_OPACITY_MIN = .3;
		/** Clamp a finite number into [min, max]. */
		function clamp$1(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}
		/** Round to three decimals so emitted CSS stays short and comparable. */
		function round3$1(value) {
			return Math.round(value * 1e3) / 1e3;
		}
		/**
		* Map the `opacity` setting onto a tint alpha in the reference band.
		* @param opacity - the `opacity` setting, 0.3 (clear) – 1.0 (dense).
		* @returns the tint alpha to hand to `hsla()`, within [0.05, 0.42].
		*/
		function glassTintAlpha(opacity) {
			const position = (clamp$1(opacity, GLASS_OPACITY_MIN, 1) - GLASS_OPACITY_MIN) / .7;
			return round3$1(GLASS_TINT_MIN + position * .37);
		}
		/**
		* The `backdrop-filter` value for a blur radius.
		* @param blur - blur radius in px; 0 or less means no blurring.
		* @returns `none`, or `blur(<n>px)`.
		*/
		function glassBlurFilter(blur) {
			const radius = Math.max(0, Math.round(blur));
			return radius <= 0 ? "none" : `blur(${radius}px)`;
		}
		/**
		* Feature-detect the `backdrop-filter` spelling this plugin actually emits.
		*
		* Deliberately NOT tolerant of the `-webkit-` alias: the stylesheet declares the
		* unprefixed property only (`shared/tsdown.client.ts` hands lightningcss no
		* browser targets, so a prefixed/unprefixed pair collapses to the alias alone),
		* and this answer decides whether the tint stays sheer or is forced near-opaque.
		* A browser that only understands the alias must therefore answer `false`, so it
		* gets the legible fallback instead of a translucent panel with no blur.
		* @param probe - injectable `CSS.supports` stand-in (for tests); defaults to the platform.
		* @returns whether the browser can actually blur the backdrop of our rule.
		*/
		function backdropFilterSupported(probe) {
			return (probe ?? ((property, value) => typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports(property, value)))("backdrop-filter", "blur(4px)");
		}
		/**
		* Resolve the reference recipe into the custom properties a glass surface reads.
		*
		* The consuming CSS owns the layout (`border-width`, `backdrop-filter`,
		* `box-shadow` composition); this function owns only the tunable colours and
		* the blur expression, so the dynamic settings never rebuild a stylesheet.
		* @param options - theme, density, blur radius, and backdrop-filter support.
		* @returns the `--ambient-glass-*` declarations for a style attribute.
		*/
		function glassVars(options) {
			const dark = options.dark;
			const supported = options.supported ?? true;
			const tint = glassTintAlpha(options.opacity);
			const fillAlpha = supported ? tint : .94;
			const rim = dark ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.55)";
			const hairline = dark ? "0 0 0 0.5px rgba(0, 0, 0, 0.3)" : "0 0 0 0.5px rgba(15, 17, 21, 0.06)";
			const highlight = dark ? "inset 0 1px 0 rgba(255, 255, 255, 0.06)" : "inset 0 1px 0 rgba(255, 255, 255, 0.7)";
			const drop = dark ? "0 6px 15px 0 rgba(14, 14, 14, 0.28)" : "0 6px 15px 0 rgba(142, 142, 142, 0.19)";
			return {
				"--ambient-glass-fill": `hsla(0, 0%, ${dark ? 35 : 100}%, ${fillAlpha})`,
				"--ambient-glass-rim": rim,
				"--ambient-glass-shadow": `${highlight}, ${hairline}, ${drop}`,
				"--ambient-glass-blur": supported ? glassBlurFilter(options.blur) : "none",
				"--ambient-glass-radius": `12px`
			};
		}
		//#endregion
		//#region \0dsh-css:D:\DeepSeekHarnessDemo\dsh-ambient-ui\src\styles.module.css.mjs
		const css = ".t9XvgW_balanceWidget{color:var(--dsw-alias-label-primary);--ambient-glass-fill:#ffffff57;--ambient-glass-rim:#ffffff8c;--ambient-glass-shadow:inset 0 1px 0 #ffffffb3, 0 0 0 .5px #0f11150f, 0 6px 15px 0 #8e8e8e30;--ambient-glass-blur:blur(12px);--ambient-glass-radius:12px;flex-direction:column;align-items:flex-end;gap:4px;font-family:inherit;font-size:12px;line-height:1.4;display:flex;position:relative}.t9XvgW_balanceCard,.t9XvgW_balanceDetails{background:var(--ambient-glass-fill);border:1px solid var(--ambient-glass-rim);border-radius:var(--ambient-glass-radius);box-shadow:var(--ambient-glass-shadow);backdrop-filter:var(--ambient-glass-blur)}.t9XvgW_balanceCard{white-space:nowrap;max-width:100%;font:inherit;color:inherit;cursor:pointer;align-items:center;gap:6px;padding:6px 10px;transition:box-shadow .12s,border-color .12s;display:inline-flex}.t9XvgW_balanceCard:hover{border-color:var(--dsw-alias-border-l2)}.t9XvgW_balanceCard:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.t9XvgW_balanceText{font-variant-numeric:tabular-nums;font-weight:600}.t9XvgW_tokenText{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}.t9XvgW_sep{color:var(--dsw-alias-border-l3)}.t9XvgW_dim{color:var(--dsw-alias-label-tertiary)}.t9XvgW_dot{background:var(--dsw-alias-state-warn-primary);border-radius:50%;flex:none;width:6px;height:6px}.t9XvgW_dotOk{background:var(--dsw-alias-state-success-primary)}.t9XvgW_dotError{background:var(--dsw-alias-state-error-primary)}.t9XvgW_balanceDetails{z-index:40;flex-direction:column;gap:4px;min-width:200px;padding:8px 10px;animation:.12s ease-out t9XvgW_ambientRise;display:flex;position:absolute;bottom:calc(100% + 6px);right:0}.t9XvgW_detailRow{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.t9XvgW_rowRight{font-variant-numeric:tabular-nums}.t9XvgW_srOnly{clip-path:inset(50%);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}@keyframes t9XvgW_ambientRise{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}.t9XvgW_trail{pointer-events:none;justify-content:center;width:100%;padding:4px 0 2px;display:flex}.t9XvgW_trailCanvas{display:block}.t9XvgW_settingsRow{flex-direction:column;gap:12px;padding:4px 0;display:flex}.t9XvgW_settingsHeader{flex-direction:column;gap:2px;display:flex}.t9XvgW_settingsTitle{color:var(--dsw-alias-label-primary);font-weight:600}.t9XvgW_settingsDesc{color:var(--dsw-alias-label-tertiary);font-size:12px}.t9XvgW_settingsFields{flex-direction:column;gap:10px;display:flex}.t9XvgW_field{justify-content:space-between;align-items:center;gap:12px;display:flex}.t9XvgW_fieldLabel{color:var(--dsw-alias-label-secondary)}.t9XvgW_fieldValue{text-align:right;font-variant-numeric:tabular-nums;min-width:48px;color:var(--dsw-alias-label-tertiary)}.t9XvgW_slider{max-width:200px;accent-color:var(--dsw-alias-state-business-primary);flex:1}.t9XvgW_toggle{accent-color:var(--dsw-alias-state-business-primary)}.t9XvgW_settingsPending{color:var(--dsw-alias-label-tertiary)}.t9XvgW_settingsWarn{color:var(--dsw-alias-state-error-primary)}@media (prefers-reduced-motion:reduce){.t9XvgW_balanceCard{transition:none}.t9XvgW_balanceDetails{animation:none}}";
		const tagId = "dsh-ambient-ui/styles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ambient-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var styles_module_css_default = {
			"ambientRise": "t9XvgW_ambientRise",
			"balanceCard": "t9XvgW_balanceCard",
			"balanceDetails": "t9XvgW_balanceDetails",
			"balanceText": "t9XvgW_balanceText",
			"balanceWidget": "t9XvgW_balanceWidget",
			"detailRow": "t9XvgW_detailRow",
			"dim": "t9XvgW_dim",
			"dot": "t9XvgW_dot",
			"dotError": "t9XvgW_dotError",
			"dotOk": "t9XvgW_dotOk",
			"field": "t9XvgW_field",
			"fieldLabel": "t9XvgW_fieldLabel",
			"fieldValue": "t9XvgW_fieldValue",
			"rowRight": "t9XvgW_rowRight",
			"sep": "t9XvgW_sep",
			"settingsDesc": "t9XvgW_settingsDesc",
			"settingsFields": "t9XvgW_settingsFields",
			"settingsHeader": "t9XvgW_settingsHeader",
			"settingsPending": "t9XvgW_settingsPending",
			"settingsRow": "t9XvgW_settingsRow",
			"settingsTitle": "t9XvgW_settingsTitle",
			"settingsWarn": "t9XvgW_settingsWarn",
			"slider": "t9XvgW_slider",
			"srOnly": "t9XvgW_srOnly",
			"toggle": "t9XvgW_toggle",
			"tokenText": "t9XvgW_tokenText",
			"trail": "t9XvgW_trail",
			"trailCanvas": "t9XvgW_trailCanvas"
		};
		//#endregion
		//#region src/BalanceWidget.tsx
		/**
		* The balance / token chip.
		*
		* Sits on the composer's right seat (`conversation.input.right`) and shows the
		* DeepSeek account balance plus the session's token usage; clicking it expands a
		* per-currency breakdown.
		*
		* Glassmorphism here follows the reference recipe in `src/glassRecipe.ts`: a
		* LOW-alpha `hsla()` tint, a bright translucent white rim and a tight soft
		* shadow, with the real `backdrop-filter` left to work on the backdrop. The
		* previous revision painted an OPAQUE `--dsw-alias-bg-overlay` background, so
		* its `backdrop-filter` had nothing to blur, and it spent the `opacity` setting
		* on container CSS `opacity`, which faded the text along with the chrome.
		*
		* @module dsh-ambient-ui/BalanceWidget
		*/
		/** Poll interval for the Host snapshots. */
		const POLL_MS = 3e4;
		/** Same-origin JSON fetch helper. */
		async function fetchJson(path) {
			const response = await fetch(path);
			if (!response.ok) throw new Error(`ambient ${path} failed: ${response.status}`);
			return await response.json();
		}
		/** Format a number with up to two decimals. */
		function formatAmount(value) {
			if (value === void 0 || Number.isNaN(value)) return "--";
			return value.toLocaleString(void 0, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		}
		/** Format a token count with thousands separators. */
		function formatTokens(value) {
			if (value === void 0 || Number.isNaN(value)) return "--";
			return value.toLocaleString();
		}
		/**
		* The balance/token chip.
		* @param props - the composed composer-seat props.
		*/
		function BalanceWidget(props) {
			const { value } = useAmbientConfig();
			const sessionId = props.sessionId;
			const [balance, setBalance] = (0, react.useState)(null);
			const [tokens, setTokens] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const dark = useDarkTheme();
			const enabled = value.showBalance !== false;
			const refreshBalance = (0, react.useCallback)(() => {
				let live = true;
				fetchJson("/api/ambient/balance").then((snapshot) => {
					if (live) setBalance(snapshot);
				}, () => {
					if (live) setBalance(null);
				});
				return () => {
					live = false;
				};
			}, []);
			const refreshTokens = (0, react.useCallback)(() => {
				if (sessionId === void 0) {
					setTokens(null);
					return () => {};
				}
				let live = true;
				fetchJson(`/api/ambient/tokens?session=${encodeURIComponent(sessionId)}`).then((snapshot) => {
					if (live) setTokens(snapshot);
				}, () => {
					if (live) setTokens(null);
				});
				return () => {
					live = false;
				};
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (!enabled) return;
				const cleanup = refreshBalance();
				const timer = window.setInterval(refreshBalance, POLL_MS);
				const onVisibility = () => {
					if (document.visibilityState === "visible") refreshBalance();
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					cleanup();
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [enabled, refreshBalance]);
			(0, react.useEffect)(() => {
				if (!enabled) return;
				const cleanup = refreshTokens();
				const timer = window.setInterval(refreshTokens, POLL_MS);
				const onVisibility = () => {
					if (document.visibilityState === "visible") refreshTokens();
				};
				document.addEventListener("visibilitychange", onVisibility);
				return () => {
					cleanup();
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisibility);
				};
			}, [enabled, refreshTokens]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onPointerDown = (event) => {
					const root = rootRef.current;
					if (root !== null && event.target instanceof Node && root.contains(event.target)) return;
					setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
					document.removeEventListener("pointerdown", onPointerDown, true);
				};
			}, [open]);
			const glassSupported = (0, react.useMemo)(() => backdropFilterSupported(), []);
			const glassStyle = (0, react.useMemo)(() => glassVars({
				dark,
				opacity: value.opacity,
				blur: value.blur,
				supported: glassSupported
			}), [
				dark,
				value.opacity,
				value.blur,
				glassSupported
			]);
			if (!enabled) return null;
			const total = balance?.total;
			const currency = balance?.currency ?? balance?.balances[0]?.currency;
			const mixedCurrencies = balance !== null && balance.error === void 0 && balance.balances.length > 1 && new Set(balance.balances.map((b) => b.currency)).size > 1;
			const balanceLabel = balance === null ? "…" : balance.error !== void 0 ? "余额不可用" : mixedCurrencies === true ? `${balance.balances.length} 币种` : total === void 0 || currency === void 0 ? "--" : `${formatAmount(total)} ${currency}`;
			const tokenLabel = tokens?.ok === true ? `${formatTokens(tokens.totalTokens)} tok` : void 0;
			const refresh = () => {
				refreshBalance();
				refreshTokens();
			};
			const dotClass = balance !== null && balance.error !== void 0 ? styles_module_css_default.dotError : balance?.available === true ? styles_module_css_default.dotOk : styles_module_css_default.dot;
			const detailsId = "ambient-balance-details";
			const announcement = tokenLabel === void 0 ? balanceLabel : `${balanceLabel}，${tokenLabel}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.balanceWidget,
				style: glassStyle,
				ref: rootRef,
				"data-testid": "ambient-widget",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: styles_module_css_default.srOnly,
						role: "status",
						"aria-live": "polite",
						children: announcement
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: styles_module_css_default.balanceCard,
						onClick: () => {
							setOpen((v) => !v);
							refresh();
						},
						title: "DeepSeek 账户余额 / 会话 token 用量",
						"aria-expanded": open,
						"aria-controls": detailsId,
						"data-testid": "ambient-balance",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: dotClass,
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles_module_css_default.balanceText,
								children: balanceLabel
							}),
							tokenLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles_module_css_default.sep,
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles_module_css_default.tokenText,
								children: tokenLabel
							})] })
						]
					}),
					open && balance !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: styles_module_css_default.balanceDetails,
						id: detailsId,
						role: "group",
						"aria-label": "余额明细",
						children: [
							balance.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: styles_module_css_default.detailRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "状态" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: styles_module_css_default.rowRight,
									children: balance.error
								})]
							}),
							balance.balances.map((b) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: styles_module_css_default.detailRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: b.currency }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: styles_module_css_default.rowRight,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											title: "授予余额",
											children: formatAmount(Number(b.granted_balance))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "+" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											title: "充值余额",
											children: formatAmount(Number(b.topped_up_balance))
										})
									]
								})]
							}, b.currency)),
							tokens?.ok === true && tokens.totalTokens !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: styles_module_css_default.detailRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "会话 tokens" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: styles_module_css_default.rowRight,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatTokens(tokens.totalTokens) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: styles_module_css_default.dim,
										children: [
											"(surface ",
											formatTokens(tokens.surfaceTokens),
											")"
										]
									})]
								})]
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/AmbientRow.tsx
		/**
		* The Ambient UI settings row, mounted in the Settings panel's General
		* section (settings.general.item). Reads and writes the plugin configuration
		* through the shared ambient config store, which is fed by the entry's form
		* from `ctx.configForms` — the `ambient` Config schema the Host declares — so
		* edits persist into the profile's Cordis patch through the DSH settings
		* transport.
		*
		* @module dsh-ambient-ui/AmbientRow
		*/
		/** Slider field that shows a live draft while dragging and commits on release. */
		function SliderField(props) {
			const [draft, setDraft] = (0, react.useState)(null);
			const shown = draft ?? props.value;
			const commit = () => {
				if (draft === null) return;
				props.onCommit(draft);
				setDraft(null);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: styles_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: styles_module_css_default.fieldLabel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: props.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: styles_module_css_default.fieldValue,
						children: props.format !== void 0 ? props.format(shown) : String(shown)
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "range",
					className: styles_module_css_default.slider,
					min: props.min,
					max: props.max,
					step: props.step,
					value: shown,
					onChange: (event) => setDraft(Number(event.target.value)),
					onPointerUp: commit,
					onKeyUp: commit,
					onBlur: commit
				})]
			});
		}
		/** Toggle row. */
		function ToggleField(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: styles_module_css_default.field,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: styles_module_css_default.fieldLabel,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					className: styles_module_css_default.toggle,
					checked: props.checked,
					onChange: (event) => props.onToggle(event.target.checked)
				})]
			});
		}
		/**
		* The Ambient UI preference row in the Settings panel.
		* @param props - the composed settings-row entry props.
		*/
		function AmbientRow(_props) {
			const { value, set } = useAmbientConfig();
			const commit = (field, next) => {
				set(field, next).then(() => {
					console.info("[dsh-ambient-ui] saved", field, next);
				}, (error) => {
					console.error("[dsh-ambient-ui] save failed", field, next, error);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.settingsRow,
				"data-testid": "ambient-settings-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles_module_css_default.settingsHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles_module_css_default.settingsTitle,
						children: "Ambient UI"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles_module_css_default.settingsDesc,
						children: "毛玻璃余额悬浮窗与像素轨迹动画的外观设置"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles_module_css_default.settingsFields,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SliderField, {
							label: "玻璃浓度",
							value: value.opacity,
							min: .3,
							max: 1,
							step: .05,
							format: (v) => `${Math.round(glassTintAlpha(v) * 100)}%`,
							onCommit: (v) => commit("opacity", v)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SliderField, {
							label: "毛玻璃模糊",
							value: value.blur,
							min: 0,
							max: 30,
							step: 1,
							format: (v) => `${v}px`,
							onCommit: (v) => commit("blur", v)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SliderField, {
							label: "轨迹速度",
							value: value.speed,
							min: 1,
							max: 10,
							step: 1,
							format: (v) => `${v}`,
							onCommit: (v) => commit("speed", v)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleField, {
							label: "显示余额悬浮窗",
							checked: value.showBalance,
							onToggle: (v) => commit("showBalance", v)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleField, {
							label: "显示像素轨迹",
							checked: value.showTrail,
							onToggle: (v) => commit("showTrail", v)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleField, {
							label: "弹窗毛玻璃（设置/菜单/提示全局生效）",
							checked: value.glass,
							onToggle: (v) => commit("glass", v)
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/trailFeed.ts
		/** Stable zero counters (safe to hold across renders). */
		const EMPTY_TRAIL_COUNTS = {
			think: 0,
			tool: 0,
			output: 0
		};
		/** Decode the Chat target's legacy projection into trail activity. */
		function deriveChatActivity(snapshot) {
			const legacy = snapshot.legacy;
			let think = 0;
			let tool = 0;
			let output = 0;
			for (const block of legacy.partial?.blocks ?? []) if (block.kind === "reasoning") think += 1;
			else if (block.kind === "text") output += 1;
			else if (block.kind === "tool-call") tool += 1;
			tool += legacy.runningCalls.length;
			return {
				running: legacy.partial !== null || legacy.runningCalls.length > 0,
				counts: {
					think,
					tool,
					output
				}
			};
		}
		/** The step kinds whose counts grew between two consecutive feed windows. */
		function countDeltas(prev, next) {
			const spawned = [];
			if (next.think > prev.think) spawned.push("think");
			if (next.tool > prev.tool) spawned.push("tool");
			if (next.output > prev.output) spawned.push("output");
			return spawned;
		}
		/** The kind the trail should drip while running with no fresh blocks. */
		function streamKind(activity) {
			const { counts, running } = activity;
			if (!running) return "idle";
			if (counts.think > 0) return "think";
			if (counts.tool > 0) return "tool";
			if (counts.output > 0) return "output";
			return "output";
		}
		/** Every trail kind, in a stable order. */
		const TRAIL_KINDS = [
			"think",
			"tool",
			"output",
			"idle"
		];
		/**
		* The DSH alias token each trail kind draws from.
		*
		* The trail has no palette of its own: mixing hand-picked neon hexes with DSH's
		* own tokens was the core reason the strip looked bolted on. `output` must use
		* `--dsw-alias-state-business-primary` (the DeepSeek blue) — `brand-primary` is
		* DSH's *text* colour and resolves to near-black/near-white.
		*/
		const TRAIL_TOKEN = {
			think: "--dsw-alias-state-success-primary",
			tool: "--dsw-alias-state-warn-primary",
			output: "--dsw-alias-state-business-primary",
			idle: "--dsw-alias-label-tertiary"
		};
		/**
		* Fallbacks used when a token is absent (older or stripped theme build).
		*
		* Mirrors what DSH actually resolves, not what looks best on dark: in the theme
		* bundle only `state-business-primary` and `label-tertiary` are re-pointed to the
		* lighter 400 variants under the dark theme, while `state-success-primary` and
		* `state-warn-primary` stay on the theme-independent static green-500/amber-500
		* in BOTH themes.
		*/
		const TRAIL_FALLBACK = {
			light: {
				think: "#22c55e",
				tool: "#f59e0b",
				output: "#4176e6",
				idle: "#81858c"
			},
			dark: {
				think: "#22c55e",
				tool: "#f59e0b",
				output: "#7aaaff",
				idle: "#adb2b8"
			}
		};
		/**
		* Resolve the four trail colours from the live theme.
		* @param dark - whether the DSH dark theme is active.
		* @param read - token reader, injected so this stays DOM-free and testable.
		* @returns one concrete colour per kind.
		*/
		function trailPalette(dark, read) {
			const fallback = dark ? TRAIL_FALLBACK.dark : TRAIL_FALLBACK.light;
			const palette = {};
			for (const kind of TRAIL_KINDS) palette[kind] = read(TRAIL_TOKEN[kind], fallback[kind]);
			return palette;
		}
		/** Clamp a finite number into [min, max]. */
		function clamp(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}
		/** Round to three decimals (keeps the emitted alpha and the tests stable). */
		function round3(value) {
			return Math.round(value * 1e3) / 1e3;
		}
		/**
		* A small deterministic PRNG (mulberry32).
		*
		* The previous implementation called `Math.random()` inside a `setState`
		* updater, which is impure and double-fires under React StrictMode. Seeding one
		* generator per simulation keeps the trail reproducible and testable.
		* @param seed - 32-bit seed.
		* @returns a function returning values in [0, 1).
		*/
		function createTrailRng(seed) {
			let state = seed >>> 0;
			return () => {
				state = state + 1831565813 >>> 0;
				let t = state;
				t = Math.imul(t ^ t >>> 15, t | 1);
				t ^= t + Math.imul(t ^ t >>> 7, t | 61);
				return ((t ^ t >>> 14) >>> 0) / 4294967296;
			};
		}
		/**
		* Milliseconds per cell of travel for a trail-speed setting.
		* @param speed - the `speed` setting, 1 – 10.
		* @returns the tick length in ms, from ~256 ms (slow) down to 24 ms (fast).
		*/
		function trailTickMs(speed) {
			return Math.max(24, 280 - clamp(speed, 1, 10) * 24);
		}
		/**
		* Fade curve for a pixel's remaining life.
		* @param life - remaining life in ticks.
		* @returns the draw alpha, between 0.06 and 0.92.
		*/
		function trailAlpha(life) {
			const t = clamp(life / 18, 0, 1);
			return round3(Math.max(.06, t ** 1.35 * .92));
		}
		/** Create one pixel entering at the right edge. */
		function spawnPixel(sim, kind) {
			sim.pixels.push({
				id: sim.nextId,
				kind,
				x: 29,
				y: Math.floor((sim.rng() * .6 + .2) * 8),
				life: 18
			});
			sim.nextId += 1;
		}
		/**
		* Build a fresh simulation.
		* @param seed - RNG seed; the same seed replays the same trail.
		* @returns mutable simulation state with no live pixels.
		*/
		function createTrailSim(seed = 49734321) {
			return {
				pixels: [],
				counts: EMPTY_TRAIL_COUNTS,
				nextId: 0,
				dripMs: 0,
				idleMs: 0,
				rng: createTrailRng(seed)
			};
		}
		/**
		* Advance the simulation by one frame delta (mutates `sim`).
		* @param sim - the simulation to advance.
		* @param input - feed window, frame delta and speed setting.
		*/
		function stepTrailSim(sim, input) {
			const dt = clamp(input.dtMs, 0, 250);
			const tick = trailTickMs(input.speed);
			const ticks = dt / tick;
			const activity = input.activity;
			if (activity === void 0) {
				sim.counts = EMPTY_TRAIL_COUNTS;
				sim.dripMs = 0;
			} else {
				const previous = sim.counts;
				const changed = countDeltas(previous, activity.counts);
				sim.counts = activity.counts;
				for (const kind of changed) {
					const delta = kind === "think" ? activity.counts.think - previous.think : kind === "tool" ? activity.counts.tool - previous.tool : activity.counts.output - previous.output;
					const count = Math.max(1, Math.min(delta, 6));
					for (let i = 0; i < count; i += 1) spawnPixel(sim, kind);
				}
				if (activity.running) {
					sim.dripMs += dt;
					if (changed.length === 0 && sim.dripMs >= tick) {
						sim.dripMs = 0;
						const kind = streamKind(activity);
						if (kind !== "idle") spawnPixel(sim, kind);
					}
				} else sim.dripMs = 0;
			}
			if (!(activity?.running === true) && sim.pixels.length === 0) {
				sim.idleMs += dt;
				if (sim.idleMs >= 2600) {
					sim.idleMs = 0;
					spawnPixel(sim, "idle");
				}
			} else sim.idleMs = 0;
			const surviving = [];
			for (const pixel of sim.pixels) {
				pixel.x -= ticks;
				pixel.life -= ticks;
				if (pixel.x >= 0 && pixel.life > 0) surviving.push(pixel);
			}
			if (surviving.length > 240) surviving.splice(0, surviving.length - 240);
			sim.pixels = surviving;
		}
		/**
		* Deterministic still frame for `prefers-reduced-motion`.
		*
		* Instead of freezing a moving comet at an arbitrary column, the trail shows
		* the live activity as a stable row-major block: one pixel per counted block,
		* filled with the same kind colours and never moving. Same information, no
		* motion.
		* @param activity - the live feed window, or undefined.
		* @returns at most TRAIL_MAX_PIXELS pixels with a full life.
		*/
		function staticTrailPixels(activity) {
			if (activity === void 0 || !activity.running) return [];
			const counts = activity.counts;
			const kinds = [];
			for (let i = 0; i < counts.think; i += 1) kinds.push("think");
			for (let i = 0; i < counts.tool; i += 1) kinds.push("tool");
			for (let i = 0; i < counts.output; i += 1) kinds.push("output");
			const total = Math.min(kinds.length, 240);
			const pixels = [];
			for (let i = 0; i < total; i += 1) {
				const row = 7 - Math.floor(i / 30);
				pixels.push({
					id: i,
					kind: kinds[i],
					x: i % 30,
					y: Math.max(0, row),
					life: 18
				});
			}
			return pixels;
		}
		//#endregion
		//#region src/TrailAnimation.tsx
		/**
		* The Agent pixel trail.
		*
		* Sits above the composer (`conversation.input.dock`) and turns Agent activity
		* into pixels crawling right-to-left: reasoning, tool calls and output each get
		* their own colour, taken from the live DSH theme.
		*
		* Rewritten from 240 absolutely-positioned React `<span>`s (re-rendered up to
		* ~41×/s, each with its own `box-shadow`) into a single device-pixel-ratio
		* scaled `<canvas>` driven by one animation frame. Pixel motion is now
		* time-based and fractional instead of one whole 8px cell per tick, which is
		* what made the old strip look coarse next to the rest of the UI. Nothing here
		* re-renders React per frame: the simulation lives in a ref and the canvas is
		* painted imperatively.
		*
		* @module dsh-ambient-ui/TrailAnimation
		*/
		/** Canvas width in CSS px (grid width × cell size). */
		const CANVAS_W = 240;
		/** Canvas height in CSS px (grid height × cell size). */
		const CANVAS_H = 64;
		/** Transparent margin baked around each sprite so the glow is not clipped. */
		const SPRITE_PAD = 6;
		/** Sprite edge length in px. */
		const SPRITE_SIZE = 20;
		/** Core square edge length inside a sprite. */
		const SPRITE_CORE = 6;
		/** Frame interval used while the trail is empty and the agent is idle, in ms. */
		const QUIET_FRAME_MS = 250;
		/** Idle pixels are dimmed so at-rest breathing never competes with the composer. */
		const IDLE_DIM = .5;
		/**
		* Add a rounded-rect sub-path, falling back to a plain rect on engines without
		* `CanvasRenderingContext2D.roundRect`.
		*/
		function addRoundRect(ctx, x, y, w, h, r) {
			ctx.beginPath();
			if (typeof ctx.roundRect === "function") {
				ctx.roundRect(x, y, w, h, r);
				return;
			}
			ctx.rect(x, y, w, h);
		}
		/**
		* Build one glow sprite per kind for the current theme.
		*
		* Baking the halo with `shadowBlur` once means the animation frame draws a
		* single `drawImage` per pixel instead of recomputing a shadow every frame.
		* @param dark - whether the DSH dark theme is active.
		* @returns one canvas per trail kind.
		*/
		function buildSprites(dark) {
			const palette = trailPalette(dark, readThemeToken);
			const sprites = {};
			for (const kind of Object.keys(palette)) {
				const color = palette[kind];
				const sprite = typeof document === "undefined" ? null : document.createElement("canvas");
				if (sprite === null) continue;
				sprite.width = SPRITE_SIZE;
				sprite.height = SPRITE_SIZE;
				const ctx = sprite.getContext("2d");
				if (ctx === null) {
					sprites[kind] = sprite;
					continue;
				}
				const inset = 7;
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 5;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 0;
				addRoundRect(ctx, inset, inset, SPRITE_CORE, SPRITE_CORE, 2);
				ctx.fill();
				ctx.fill();
				ctx.shadowBlur = 0;
				ctx.shadowColor = "transparent";
				ctx.fill();
				sprites[kind] = sprite;
			}
			return sprites;
		}
		/** Clear the whole backing store and restore the DPR transform. */
		function clearCanvas(canvas, ctx, dpr) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		/** Composite the live pixels. */
		function paintPixels(ctx, sprites, pixels) {
			for (const pixel of pixels) {
				const sprite = sprites[pixel.kind];
				if (sprite === void 0) continue;
				const dim = pixel.kind === "idle" ? IDLE_DIM : 1;
				ctx.globalAlpha = Math.max(.02, Math.min(1, trailAlpha(pixel.life) * dim));
				ctx.drawImage(sprite, pixel.x * 8 - SPRITE_PAD, pixel.y * 8 - SPRITE_PAD);
			}
			ctx.globalAlpha = 1;
		}
		/**
		* The canvas itself. Owns the simulation and the frame loop.
		* @param props - feed-derived activity and the trail-speed setting.
		*/
		function TrailCanvas({ activity, speed }) {
			const canvasRef = (0, react.useRef)(null);
			const simRef = (0, react.useRef)(null);
			const activityRef = (0, react.useRef)(activity);
			const speedRef = (0, react.useRef)(speed);
			const dark = useDarkTheme();
			const reduced = usePrefersReducedMotion();
			if (simRef.current === null) simRef.current = createTrailSim();
			const sim = simRef.current;
			const sprites = (0, react.useMemo)(() => buildSprites(dark), [dark]);
			(0, react.useEffect)(() => {
				activityRef.current = activity;
			}, [activity]);
			(0, react.useEffect)(() => {
				speedRef.current = speed;
			}, [speed]);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const ctx = canvas.getContext("2d");
				if (ctx === null) return;
				let dpr = 1;
				const size = () => {
					dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
					canvas.width = Math.round(CANVAS_W * dpr);
					canvas.height = Math.round(CANVAS_H * dpr);
					clearCanvas(canvas, ctx, dpr);
					if (reduced) paintPixels(ctx, sprites, staticTrailPixels(activityRef.current));
				};
				size();
				window.addEventListener("resize", size);
				return () => {
					window.removeEventListener("resize", size);
				};
			}, [reduced, sprites]);
			(0, react.useEffect)(() => {
				if (!reduced) return;
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const ctx = canvas.getContext("2d");
				if (ctx === null) return;
				clearCanvas(canvas, ctx, canvas.width > 0 ? canvas.width / CANVAS_W : 1);
				paintPixels(ctx, sprites, staticTrailPixels(activity));
			}, [
				reduced,
				activity,
				sprites
			]);
			(0, react.useEffect)(() => {
				if (reduced) return;
				const canvas = canvasRef.current;
				if (canvas === null) return;
				const ctx = canvas.getContext("2d");
				if (ctx === null) return;
				const dpr = canvas.width > 0 ? canvas.width / CANVAS_W : 1;
				let raf = 0;
				let last = performance.now();
				const frame = (now) => {
					raf = requestAnimationFrame(frame);
					if (sim.pixels.length === 0 && activityRef.current?.running !== true && now - last < QUIET_FRAME_MS) return;
					const dt = now - last;
					last = now;
					stepTrailSim(sim, {
						activity: activityRef.current,
						dtMs: dt,
						speed: speedRef.current
					});
					clearCanvas(canvas, ctx, dpr);
					paintPixels(ctx, sprites, sim.pixels);
				};
				raf = requestAnimationFrame(frame);
				return () => {
					cancelAnimationFrame(raf);
				};
			}, [
				sprites,
				reduced,
				sim
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.trail,
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					className: styles_module_css_default.trailCanvas,
					width: CANVAS_W,
					height: CANVAS_H,
					style: {
						width: `${CANVAS_W}px`,
						height: `${CANVAS_H}px`
					}
				})
			});
		}
		/**
		* Chat-feed adapter. Calls `useChat` unconditionally — the previous version
		* guarded the call with `typeof props.useChat === 'function'`, which is a
		* rules-of-hooks violation that breaks as soon as the host swaps the prop.
		*/
		function ChatTrail(props) {
			const chat = props.useChat((snapshot) => snapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrailCanvas, {
				activity: deriveChatActivity(chat),
				speed: props.speed
			});
		}
		/** Session-feed fallback adapter; unconditional `useSession` for the same reason. */
		function SessionTrail(props) {
			const activity = {
				running: props.useSession((snapshot) => snapshot)?.running === true,
				counts: EMPTY_TRAIL_COUNTS
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrailCanvas, {
				activity,
				speed: props.speed
			});
		}
		/**
		* Trail seat entry point.
		*
		* `useAmbientConfig` is the only hook called here; the feed hooks live in the
		* child components so that returning `null` while hidden never changes this
		* component's hook order.
		* @param props - dock seat props from the host.
		* @returns the trail, or null when the trail is switched off.
		*/
		function TrailAnimation(props) {
			const { value } = useAmbientConfig();
			const speed = value.speed;
			if (value.showTrail === false) return null;
			const { useChat, useSession } = props;
			if (typeof useChat === "function") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatTrail, {
				useChat,
				speed
			});
			if (typeof useSession === "function") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTrail, {
				useSession,
				speed
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrailCanvas, {
				activity: void 0,
				speed
			});
		}
		//#endregion
		//#region src/client/glass.ts
		/**
		* Global glass effect for DSH's own popup surfaces.
		*
		* Two mechanisms, deliberately different:
		*
		* 1. **Token steering.** DSH declares `--dsw-mask-blur` (modal scrims, `none` by
		*    default) and `--dsw-menu-backdrop-filter` (menus) on `body`, and its own
		*    stylesheets consume them. Overriding those tokens on `body` upgrades every
		*    DSH surface at once instead of fighting it with a weaker `[role="menu"]`
		*    override — the previous revision replaced DSH's built-in `blur(40px)` menu
		*    frost with `blur(12px)` while leaving the panel 85% opaque, which is
		*    strictly worse on both counts.
		*
		*    The scrim's *veil* (`--dsw-alias-bg-mask-1`) is deliberately left alone.
		*    `withAlpha()` scales a colour that already carries an alpha, so multiplying
		*    DSH's `#0000003d` (0.24) by a density factor produced a 0.06 scrim — three
		*    times *lighter* than DSH's own — and native dialogs ended up floating over
		*    an undimmed page.
		*
		* 2. **One injected stylesheet** for the surfaces DSH has no token for
		*    (`[role="dialog"][aria-modal="true"]`, `[data-menu-material]`,
		*    `[role="tooltip"]`). DSH paints those with hashed module classes and has no
		*    rule of its own for the role selectors, so these rules are the *only* ones
		*    and win on specificity.
		*
		* Everything is set on `document.body`: DSH re-declares the tokens it owns on
		* `body`, so anything written to `documentElement` is overridden and reads back
		* as an empty string. The previous revision did exactly that, which is why none
		* of its overrides ever took effect.
		*
		* @module dsh-ambient-ui/glass
		*/
		/** Id of the injected stylesheet. */
		const STYLE_ID = "dsh-ambient-glass";
		/** Body custom properties this installer owns; every one is removed on dispose. */
		const OWNED_VARS = [
			"--dsw-mask-blur",
			"--dsw-menu-backdrop-filter",
			"--ambient-glass-fill",
			"--ambient-glass-rim",
			"--ambient-glass-shadow",
			"--ambient-glass-blur",
			"--ambient-glass-radius"
		];
		/**
		* The injected rules.
		*
		* `@supports` rather than a JS check: with no `backdrop-filter` the block simply
		* does not apply and every DSH surface keeps the appearance DSH gave it, which
		* is the correct fallback — a 34%-tinted dialog with no blur is unreadable.
		*
		* The dialog rule is the one that matters: DSH paints `.dialog` with the opaque
		* `--dsw-alias-bg-layer-2`, and its scrim is `--dsw-mask-blur: none` on top of a
		* 24%-black veil, so a native DSH dialog is a solid card under a plain dark
		* wash. Replacing the fill with the reference tint (and blurring the scrim via
		* `--dsw-mask-blur` below) is what turns those popups into glass.
		*
		* DSH's own elevations are preserved by composing them with our rim rather than
		* replacing them, so the half-pixel elevation stroke DSH draws survives.
		*
		* Menus are left alone apart from the blur and the rim: DSH already paints
		* `--dsw-menu-surface-fill` = `#f8f9fa94` / `#43454a73` under `blur(40px)`, which
		* is the reference recipe with a stronger blur. Re-mixing that fill only risked
		* making the menus *more* opaque than DSH ships them.
		*/
		const STYLE_TEXT = `@supports ((backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px))) {
  [role="dialog"][aria-modal="true"] {
    background: var(--ambient-glass-fill);
    backdrop-filter: var(--ambient-glass-blur);
    -webkit-backdrop-filter: var(--ambient-glass-blur);
    box-shadow: 0 0 0 1px var(--ambient-glass-rim), var(--ambient-glass-shadow), var(--dsw-elevation-prominent);
  }
  [data-menu-material] {
    backdrop-filter: var(--dsw-menu-backdrop-filter);
    -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter);
    box-shadow: 0 0 0 1px var(--ambient-glass-rim), var(--dsw-elevation-panel);
  }
  [role="menu"] {
    backdrop-filter: var(--dsw-menu-backdrop-filter);
    -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter);
  }
  [role="tooltip"] {
    backdrop-filter: var(--ambient-glass-blur);
    -webkit-backdrop-filter: var(--ambient-glass-blur);
  }
}`;
		/** Apply the glass styles from the current config. */
		function applyGlass() {
			const body = document.body;
			if (body === null || body === void 0) return;
			const { value } = getAmbientConfigSnapshot();
			const style = body.style;
			if (value.glass !== true) {
				for (const name of OWNED_VARS) style.removeProperty(name);
				document.getElementById(STYLE_ID)?.remove();
				return;
			}
			const dark = isDarkTheme();
			const supported = backdropFilterSupported();
			const vars = glassVars({
				dark,
				opacity: value.opacity,
				blur: value.blur,
				supported
			});
			const blur = glassBlurFilter(value.blur);
			style.setProperty("--ambient-glass-fill", vars["--ambient-glass-fill"]);
			style.setProperty("--ambient-glass-rim", vars["--ambient-glass-rim"]);
			style.setProperty("--ambient-glass-shadow", vars["--ambient-glass-shadow"]);
			style.setProperty("--ambient-glass-blur", vars["--ambient-glass-blur"]);
			style.setProperty("--ambient-glass-radius", vars["--ambient-glass-radius"]);
			style.setProperty("--dsw-mask-blur", blur);
			style.setProperty("--dsw-menu-backdrop-filter", blur);
			let styleEl = document.getElementById(STYLE_ID);
			if (styleEl === null) {
				styleEl = document.createElement("style");
				styleEl.id = STYLE_ID;
				styleEl.setAttribute("data-plugin", "dsh-ambient-ui");
				document.head.appendChild(styleEl);
			}
			styleEl.textContent = STYLE_TEXT;
		}
		/**
		* Install the glass effect: subscribe to the shared config and to DSH theme
		* changes, and re-apply on either.
		* @returns a disposer that restores DSH's own surfaces.
		*/
		function installGlass() {
			let disposed = false;
			const apply = () => {
				if (!disposed) applyGlass();
			};
			const offConfig = subscribeAmbientConfig(apply);
			apply();
			const offTheme = subscribeTheme(apply);
			return () => {
				disposed = true;
				offConfig();
				offTheme();
				const body = document.body;
				if (body !== null && body !== void 0) for (const name of OWNED_VARS) body.style.removeProperty(name);
				document.getElementById(STYLE_ID)?.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Stable cordis plugin name. */
		const name = "dsh-ambient-ui-client";
		/** Required client services before either widget mounts. */
		const inject = ["slots", "configForms"];
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
		function apply(ctx) {
			const detachScope = attachAmbientConfigScope(ctx.configForms.get(AMBIENT_SETTINGS_NAMESPACE));
			ctx.effect(() => {
				const disposers = [
					detachScope,
					ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
						name: "conversation.input.right",
						id: "ambient-balance",
						order: 20
					}, BalanceWidget)),
					ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
						name: "conversation.input.dock",
						id: "ambient-trail",
						order: 10
					}, TrailAnimation)),
					ctx.slots.inject("settings.general.item", () => ctx.slots.register({
						name: "settings.general.item",
						id: "ambient-ui",
						order: 100
					}, AmbientRow)),
					installGlass()
				];
				return () => {
					for (const dispose of disposers) dispose();
				};
			}, "dsh-ambient-ui: widget registration");
		}
		//#endregion
		exports.AmbientRow = AmbientRow;
		exports.BalanceWidget = BalanceWidget;
		exports.TrailAnimation = TrailAnimation;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map