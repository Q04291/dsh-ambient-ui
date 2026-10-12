/**
 * Global glass effect for DSH's own popup surfaces.
 *
 * Two mechanisms, deliberately different:
 *
 * 1. **Token steering.** DSH declares `--dsw-mask-blur` (modal scrims) and
 *    `--dsw-menu-backdrop-filter` (menus) on `body`, and its stylesheets consume
 *    them. Overriding those tokens on `body` upgrades every DSH surface at once
 *    instead of fighting it with a weaker `[role="menu"]` override — the previous
 *    revision replaced DSH's built-in `blur(40px)` menu frost with `blur(12px)`
 *    while leaving the panel 85% opaque, which is strictly worse on both counts.
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
/**
 * Install the glass effect: subscribe to the shared config and to DSH theme
 * changes, and re-apply on either.
 * @returns a disposer that restores DSH's own surfaces.
 */
export declare function installGlass(): () => void;
//# sourceMappingURL=glass.d.ts.map