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
import { backdropFilterSupported, glassBlurFilter, glassVars } from "../glassRecipe.js";
import { getAmbientConfigSnapshot, subscribeAmbientConfig } from "./ambientConfigStore.js";
import { isDarkTheme, subscribeTheme } from "./theme.js";
/** Id of the injected stylesheet. */
const STYLE_ID = 'dsh-ambient-glass';
/** Body custom properties this installer owns; every one is removed on dispose. */
const OWNED_VARS = [
    '--dsw-mask-blur',
    '--dsw-menu-backdrop-filter',
    '--ambient-glass-fill',
    '--ambient-glass-rim',
    '--ambient-glass-shadow',
    '--ambient-glass-blur',
    '--ambient-glass-radius',
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
    if (body === null || body === undefined)
        return;
    const { value } = getAmbientConfigSnapshot();
    const style = body.style;
    if (value.glass !== true) {
        for (const name of OWNED_VARS)
            style.removeProperty(name);
        document.getElementById(STYLE_ID)?.remove();
        return;
    }
    const dark = isDarkTheme();
    const supported = backdropFilterSupported();
    const vars = glassVars({ dark, opacity: value.opacity, blur: value.blur, supported });
    const blur = glassBlurFilter(value.blur);
    // The dialog reads the same tint the widget computes, so card and popups can
    // never drift apart; the widget's own inline value still wins inside it.
    style.setProperty('--ambient-glass-fill', vars['--ambient-glass-fill']);
    style.setProperty('--ambient-glass-rim', vars['--ambient-glass-rim']);
    style.setProperty('--ambient-glass-shadow', vars['--ambient-glass-shadow']);
    style.setProperty('--ambient-glass-blur', vars['--ambient-glass-blur']);
    style.setProperty('--ambient-glass-radius', vars['--ambient-glass-radius']);
    style.setProperty('--dsw-mask-blur', blur);
    style.setProperty('--dsw-menu-backdrop-filter', blur);
    let styleEl = document.getElementById(STYLE_ID);
    if (styleEl === null) {
        styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.setAttribute('data-plugin', 'dsh-ambient-ui');
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = STYLE_TEXT;
}
/**
 * Install the glass effect: subscribe to the shared config and to DSH theme
 * changes, and re-apply on either.
 * @returns a disposer that restores DSH's own surfaces.
 */
export function installGlass() {
    let disposed = false;
    const apply = () => {
        if (!disposed)
            applyGlass();
    };
    const offConfig = subscribeAmbientConfig(apply);
    apply();
    const offTheme = subscribeTheme(apply);
    return () => {
        disposed = true;
        offConfig();
        offTheme();
        const body = document.body;
        if (body !== null && body !== undefined) {
            for (const name of OWNED_VARS)
                body.style.removeProperty(name);
        }
        document.getElementById(STYLE_ID)?.remove();
    };
}
