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
		//#endregion
		//#region src/client/ambientConfigStore.ts
		/**
		* Module-level reactive ambient config store.
		*
		* Every consumer (the settings row, the balance chip, the trail) shares ONE
		* store, so a change written by any component re-renders all of them
		* immediately instead of waiting for the next poll or a page refresh.
		*
		* @module dsh-ambient-ui/ambientConfigStore
		*/
		/** Config fetch cadence when nobody is writing (external changes). */
		const POLL_MS$1 = 3e4;
		let state = {
			status: "loading",
			value: { ...AMBIENT_DEFAULTS }
		};
		const listeners = /* @__PURE__ */ new Set();
		let active = 0;
		let timer;
		function emit() {
			for (const listener of [...listeners]) try {
				listener();
			} catch {}
		}
		/** Same-origin JSON fetch helper. */
		async function fetchJson$1(path, init) {
			const response = await fetch(path, init);
			if (!response.ok) throw new Error(`ambient ${path} failed: ${response.status}`);
			return await response.json();
		}
		/** Current snapshot (stable reference between updates). */
		function getAmbientConfigSnapshot() {
			return state;
		}
		/** Subscribe to snapshot replacements; starts a shared poller. */
		function subscribeAmbientConfig(listener) {
			listeners.add(listener);
			active += 1;
			if (active === 1) {
				refreshAmbientConfig();
				timer = window.setInterval(() => {
					refreshAmbientConfig();
				}, POLL_MS$1);
			}
			return () => {
				listeners.delete(listener);
				active -= 1;
				if (active === 0 && timer !== void 0) {
					window.clearInterval(timer);
					timer = void 0;
				}
			};
		}
		/** Pull the latest config from the Host route. */
		async function refreshAmbientConfig() {
			try {
				state = {
					status: "ready",
					value: normalizeAmbientSettings(await fetchJson$1("/api/ambient/config"))
				};
			} catch {
				state = {
					...state,
					status: "ready"
				};
			}
			emit();
		}
		/** Persist one field through the Host route and publish the new value. */
		async function setAmbientConfig(field, next) {
			state = {
				status: "ready",
				value: normalizeAmbientSettings(await fetchJson$1("/api/ambient/config", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ [field]: next })
				}))
			};
			emit();
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
		//#region \0dsh-css:C:\Users\35395\Documents\Codex\2026-08-16\new-chat\outputs\dsh-ambient-ui\src\styles.module.css.mjs
		const css = ".FIl2ta_balanceWidget{flex-direction:column;align-items:flex-end;gap:4px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;display:flex}.FIl2ta_balanceCard{border:1px solid var(--dsw-alias-border-l1,#7f7f7f47);background:var(--dsw-alias-bg-overlay,#ffffff9e);color:var(--dsw-alias-label-primary,#1c1e26);cursor:pointer;user-select:none;border-radius:16px;align-items:center;gap:8px;padding:6px 10px;font-size:13px;line-height:1;display:flex;box-shadow:0 8px 32px #00000029}.FIl2ta_balanceText{font-variant-numeric:tabular-nums;font-weight:600}.FIl2ta_tokenText{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#565c6a)}.FIl2ta_sep{background:var(--dsw-alias-border-l1,#7f7f7f4d);width:1px;height:12px}.FIl2ta_dot,.FIl2ta_dotOk{border-radius:50%;flex:none;width:8px;height:8px}.FIl2ta_dot{background:var(--dsw-alias-danger,#e5484d)}.FIl2ta_dotOk{background:var(--dsw-alias-success,#30a46c);box-shadow:0 0 6px #30a46cb3}.FIl2ta_balanceDetails{border:1px solid var(--dsw-alias-border-l1,#7f7f7f40);background:var(--dsw-alias-bg-overlay,#ffffffb8);min-width:200px;color:var(--dsw-alias-label-primary,#1c1e26);border-radius:12px;flex-direction:column;gap:6px;padding:10px 12px;font-size:12px;line-height:1.5;display:flex;box-shadow:0 8px 32px #00000029}.FIl2ta_detailRow{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.FIl2ta_rowRight{font-variant-numeric:tabular-nums;align-items:baseline;gap:6px;display:inline-flex}.FIl2ta_dim{opacity:.55}.FIl2ta_trail{justify-content:center;width:100%;padding:4px 0 2px;display:flex}.FIl2ta_trailGrid{position:relative}.FIl2ta_cell{border-radius:2px;position:absolute}.FIl2ta_cellThink{background:#0f8;box-shadow:0 0 6px #00ff88bf}.FIl2ta_cellTool{background:#f80;box-shadow:0 0 6px #ff8800bf}.FIl2ta_cellOutput{background:#48f;box-shadow:0 0 6px #4488ffbf}.FIl2ta_cellIdle{box-shadow:none;background:#8c96aa}@media (prefers-color-scheme:dark){.FIl2ta_balanceCard,.FIl2ta_balanceDetails{background:var(--dsw-alias-bg-overlay,#17191fa8);color:var(--dsw-alias-label-primary,#f5f7fb)}.FIl2ta_tokenText{color:var(--dsw-alias-label-secondary,#949aa8)}}.FIl2ta_settingsRow{border-bottom:1px solid var(--dsw-alias-border-l1,#7f7f7f2e);flex-direction:column;gap:12px;padding:14px 0;display:flex}.FIl2ta_settingsHeader{flex-direction:column;gap:2px;display:flex}.FIl2ta_settingsTitle{color:var(--dsw-alias-label-primary,#1c1e26);font-size:14px;font-weight:600}.FIl2ta_settingsDesc{color:var(--dsw-alias-label-secondary,#565c6a);font-size:12px}.FIl2ta_settingsFields{flex-direction:column;gap:10px;display:flex}.FIl2ta_field{color:var(--dsw-alias-label-primary,#1c1e26);flex-direction:column;gap:6px;font-size:13px;display:flex}.FIl2ta_fieldLabel{justify-content:space-between;align-items:baseline;gap:12px;display:flex}.FIl2ta_fieldValue{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#565c6a)}.FIl2ta_slider{accent-color:var(--dsw-alias-accent,#4f8cff);width:100%}.FIl2ta_toggle{accent-color:var(--dsw-alias-accent,#4f8cff);width:16px;height:16px}.FIl2ta_settingsPending{color:var(--dsw-alias-label-secondary,#565c6a);font-size:12px}.FIl2ta_settingsWarn{border:1px solid var(--dsw-alias-border-warn,#e5484d66);color:var(--dsw-alias-danger,#e5484d);background:#e5484d14;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.5}";
		const tagId = "dsh-ambient-ui/styles.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-ambient-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var styles_module_css_default = {
			"balanceCard": "FIl2ta_balanceCard",
			"balanceDetails": "FIl2ta_balanceDetails",
			"balanceText": "FIl2ta_balanceText",
			"balanceWidget": "FIl2ta_balanceWidget",
			"cell": "FIl2ta_cell",
			"cellIdle": "FIl2ta_cellIdle",
			"cellOutput": "FIl2ta_cellOutput",
			"cellThink": "FIl2ta_cellThink",
			"cellTool": "FIl2ta_cellTool",
			"detailRow": "FIl2ta_detailRow",
			"dim": "FIl2ta_dim",
			"dot": "FIl2ta_dot",
			"dotOk": "FIl2ta_dotOk",
			"field": "FIl2ta_field",
			"fieldLabel": "FIl2ta_fieldLabel",
			"fieldValue": "FIl2ta_fieldValue",
			"rowRight": "FIl2ta_rowRight",
			"sep": "FIl2ta_sep",
			"settingsDesc": "FIl2ta_settingsDesc",
			"settingsFields": "FIl2ta_settingsFields",
			"settingsHeader": "FIl2ta_settingsHeader",
			"settingsPending": "FIl2ta_settingsPending",
			"settingsRow": "FIl2ta_settingsRow",
			"settingsTitle": "FIl2ta_settingsTitle",
			"settingsWarn": "FIl2ta_settingsWarn",
			"slider": "FIl2ta_slider",
			"toggle": "FIl2ta_toggle",
			"tokenText": "FIl2ta_tokenText",
			"trail": "FIl2ta_trail",
			"trailGrid": "FIl2ta_trailGrid"
		};
		//#endregion
		//#region src/BalanceWidget.tsx
		/**
		* The balance/token floating widget: a glassmorphism chip pinned to the
		* bottom-right corner of the app frame (the `shell.overlay` layer). It polls
		* the Host `/api/ambient/balance` endpoint for the DeepSeek account balance
		* and `/api/ambient/tokens` for the current session's token pressure, and
		* refreshes on a fixed cadence plus visibility changes. Clicking expands the
		* per-currency breakdown and forces a manual refresh.
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
		* The bottom-right balance/token chip.
		* @param props - the composed overlay entry props.
		*/
		function BalanceWidget(props) {
			const { value } = useAmbientConfig();
			const sessionId = props.sessionId;
			const [balance, setBalance] = (0, react.useState)(null);
			const [tokens, setTokens] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
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
			}, [refreshBalance]);
			(0, react.useEffect)(() => {
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
			}, [refreshTokens]);
			if (value.showBalance === false) return null;
			const opacity = value.opacity;
			const blur = value.blur;
			const glassStyle = {
				opacity,
				backdropFilter: `blur(${blur}px) saturate(160%)`,
				WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`
			};
			const total = balance?.total;
			const currency = balance?.currency ?? balance?.balances[0]?.currency;
			const balanceLabel = balance === null ? "…" : balance.error !== void 0 ? "余额不可用" : total === void 0 || currency === void 0 ? "--" : `${formatAmount(total)} ${currency}`;
			const tokenLabel = tokens?.ok === true ? `${formatTokens(tokens.totalTokens)} tok` : void 0;
			const refresh = () => {
				refreshBalance();
				refreshTokens();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: styles_module_css_default.balanceWidget,
				style: glassStyle,
				role: "status",
				"aria-live": "polite",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: styles_module_css_default.balanceCard,
					onClick: () => {
						setOpen((v) => !v);
						refresh();
					},
					title: "DeepSeek 账户余额 / 会话 token 用量",
					"aria-expanded": open,
					"data-testid": "ambient-balance",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: balance?.available === true ? styles_module_css_default.dotOk : styles_module_css_default.dot,
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
				}), open && balance !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles_module_css_default.balanceDetails,
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
				})]
			});
		}
		//#endregion
		//#region src/AmbientRow.tsx
		/**
		* The Ambient UI settings row, mounted in the Settings panel's General
		* section (settings.general.item). Reads and writes the plugin config through
		* the Host route (GET/PUT /api/ambient/config), which works for third-party
		* namespaces the DSH wire settings allowlist does not expose.
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
							label: "透明度",
							value: value.opacity,
							min: .3,
							max: 1,
							step: .05,
							format: (v) => v.toFixed(2),
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
		/** Pixel lifetime in ticks (fade length). */
		const MAX_LIFE = 14;
		/** Upper bound on live pixels (memory guard). */
		const MAX_PIXELS = 240;
		/** Idle-drip probability per tick when the trail is empty. */
		const IDLE_DRIP = .18;
		/** Count currently-visible agent activity by step kind. */
		function deriveCounts(snapshot) {
			let think = 0;
			let tool = 0;
			let output = 0;
			for (const block of snapshot.partial?.blocks ?? []) if (block.kind === "reasoning") think += 1;
			else if (block.kind === "text") output += 1;
			else if (block.kind === "tool-call") tool += 1;
			tool += snapshot.runningCalls.length;
			return {
				think,
				tool,
				output
			};
		}
		/** Create one pixel at the right edge on a random row. */
		function createPixel(id, kind) {
			return {
				id,
				kind,
				x: 29,
				y: Math.floor(Math.random() * 8),
				life: MAX_LIFE
			};
		}
		/** Bound the live pixel list. */
		function trim(pixels) {
			if (pixels.length <= MAX_PIXELS) return [...pixels];
			return [...pixels.slice(pixels.length - MAX_PIXELS)];
		}
		/**
		* The pixel trail strip.
		* @param props - the composed composer-dock entry props.
		*/
		function TrailAnimation(props) {
			const { value } = useAmbientConfig();
			const snapshot = props.useSession((snapshot) => snapshot);
			const [pixels, setPixels] = (0, react.useState)([]);
			const countsRef = (0, react.useRef)({
				think: 0,
				tool: 0,
				output: 0
			});
			const idRef = (0, react.useRef)(0);
			const speed = value.speed;
			const tickMs = Math.max(24, 280 - speed * 24);
			(0, react.useEffect)(() => {
				const counts = deriveCounts(snapshot);
				const prev = countsRef.current;
				const spawned = [];
				for (const kind of [
					"think",
					"tool",
					"output"
				]) for (let i = prev[kind]; i < counts[kind]; i += 1) spawned.push(kind);
				if (snapshot.running && spawned.length === 0) {
					const blocks = snapshot.partial?.blocks ?? [];
					if (counts.think > 0 && blocks.some((b) => b.kind === "reasoning")) spawned.push("think");
					else if (counts.output > 0 && blocks.some((b) => b.kind === "text")) spawned.push("output");
				}
				countsRef.current = counts;
				if (spawned.length === 0) return;
				setPixels((prevPixels) => {
					const next = [...prevPixels];
					for (const kind of spawned) next.push(createPixel(idRef.current++, kind));
					return trim(next);
				});
			}, [snapshot]);
			(0, react.useEffect)(() => {
				const timer = window.setInterval(() => {
					setPixels((prev) => {
						if (prev.length === 0) return prev;
						const next = prev.map((p) => ({
							...p,
							x: p.x - 1,
							life: p.life - 1
						})).filter((p) => p.x >= 0 && p.life > 0);
						if (next.length === 0 && Math.random() < IDLE_DRIP) next.push(createPixel(idRef.current++, "idle"));
						return next;
					});
				}, tickMs);
				return () => window.clearInterval(timer);
			}, [tickMs]);
			if (value.showTrail === false) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: styles_module_css_default.trail,
				"aria-hidden": "true",
				"data-testid": "ambient-trail",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: styles_module_css_default.trailGrid,
					style: {
						width: 240,
						height: 64
					},
					children: pixels.map((pixel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${styles_module_css_default.cell} ${styles_module_css_default[`cell${pixel.kind[0].toUpperCase()}${pixel.kind.slice(1)}`]}`,
						style: {
							left: pixel.x * 8,
							top: pixel.y * 8,
							width: 8,
							height: 8,
							opacity: Math.max(.08, pixel.life / MAX_LIFE)
						}
					}, pixel.id))
				})
			});
		}
		//#endregion
		//#region src/client/glass.ts
		/**
		* Global glass effect for DSH popup surfaces.
		*
		* Drives the mask tokens (--dsw-mask-blur / --dsw-alias-bg-mask-1) and adds
		* backdrop-filter + alpha-tuned backgrounds to the stable popup selectors
		* (settings panel / modals use role=dialog+aria-modal, menus role=menu,
		* tooltips role=tooltip). Re-applies whenever the shared config or the
		* active theme changes.
		*
		* @module dsh-ambient-ui/glass
		*/
		const STYLE_ID = "dsh-ambient-glass";
		/** Scale a color's alpha (supports hex and rgb()/rgba() strings). */
		function withAlpha(color, alpha) {
			const a = Math.max(0, Math.min(1, alpha));
			const trimmed = color.trim();
			const hex = /^#([0-9a-f]{3,8})$/i.exec(trimmed);
			if (hex !== null) {
				let h = hex[1];
				if (h.length === 3) h = h.split("").map((ch) => ch + ch).join("");
				if (h.length === 6) return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a.toFixed(3)})`;
				if (h.length === 8) return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${(parseInt(h.slice(6, 8), 16) / 255 * a).toFixed(3)})`;
				return trimmed;
			}
			const rgb = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(trimmed);
			if (rgb !== null) {
				const base = rgb[4] === void 0 ? 1 : Number(rgb[4]);
				return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${(base * a).toFixed(3)})`;
			}
			return trimmed;
		}
		/** Mask darkness: transparent panels need a stronger backdrop for contrast. */
		function maskAlpha(opacity) {
			return Math.max(.08, Math.min(.6, .15 + (1 - opacity) * .35));
		}
		/** Blur expression for the current setting. */
		function blurValue(blur) {
			return blur <= 0 ? "none" : `blur(${blur}px) saturate(160%)`;
		}
		/** Apply the glass styles from the current config. */
		function applyGlass() {
			const { value } = getAmbientConfigSnapshot();
			const rootStyle = document.documentElement.style;
			if (!value.glass) {
				rootStyle.removeProperty("--dsw-mask-blur");
				rootStyle.removeProperty("--dsw-alias-bg-mask-1");
				document.getElementById(STYLE_ID)?.remove();
				return;
			}
			const maskBase = getComputedStyle(document.documentElement).getPropertyValue("--dsw-alias-bg-mask-1").trim() || "rgba(0, 0, 0, 0.24)";
			rootStyle.setProperty("--dsw-mask-blur", blurValue(value.blur));
			rootStyle.setProperty("--dsw-alias-bg-mask-1", withAlpha(maskBase, maskAlpha(value.opacity)));
			let styleEl = document.getElementById(STYLE_ID);
			if (styleEl === null) {
				styleEl = document.createElement("style");
				styleEl.id = STYLE_ID;
				document.head.appendChild(styleEl);
			}
			const panelAlpha = (value.opacity * 100).toFixed(1);
			const blur = blurValue(value.blur);
			styleEl.textContent = [
				`[role="dialog"][aria-modal="true"] {`,
				`  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) ${panelAlpha}%, transparent);`,
				`  backdrop-filter: ${blur};`,
				`  -webkit-backdrop-filter: ${blur};`,
				`}`,
				`[role="menu"] {`,
				`  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) ${panelAlpha}%, transparent);`,
				`  backdrop-filter: ${blur};`,
				`  -webkit-backdrop-filter: ${blur};`,
				`}`,
				`[role="tooltip"] {`,
				`  backdrop-filter: ${blur};`,
				`  -webkit-backdrop-filter: ${blur};`,
				`}`
			].join("\n");
		}
		/**
		* Install the glass effect: subscribe to the shared config and re-apply on
		* theme changes. Returns a disposer.
		*/
		function installGlass() {
			let disposed = false;
			const apply = () => {
				if (!disposed) applyGlass();
			};
			const off = subscribeAmbientConfig(apply);
			apply();
			const observer = new MutationObserver(apply);
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme", "class"]
			});
			return () => {
				disposed = true;
				off();
				observer.disconnect();
				document.documentElement.style.removeProperty("--dsw-mask-blur");
				document.documentElement.style.removeProperty("--dsw-alias-bg-mask-1");
				document.getElementById(STYLE_ID)?.remove();
			};
		}
		//#endregion
		//#region src/client/index.ts
		/** Stable cordis plugin name. */
		const name = "dsh-ambient-ui-client";
		/** Required client services before either widget mounts. */
		const inject = ["slots", "connection"];
		/** Register both widgets and the settings row. */
		function apply(ctx) {
			ctx.effect(() => {
				const disposers = [
					ctx.slots.register({
						name: "conversation.input.right",
						id: "ambient-balance",
						order: 20
					}, BalanceWidget),
					ctx.slots.register({
						name: "conversation.input.dock",
						id: "ambient-trail",
						order: 10
					}, TrailAnimation),
					ctx.slots.register({
						name: "settings.general.item",
						id: "ambient-ui",
						order: 100
					}, AmbientRow),
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