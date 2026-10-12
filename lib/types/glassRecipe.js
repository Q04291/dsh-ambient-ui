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
export const GLASS_TINT_MIN = 0.05;
/** Tint alpha at the top of the `opacity` range: dense, but still translucent. */
export const GLASS_TINT_MAX = 0.42;
/** Lowest `opacity` setting; mirrors the Config schema and the settings slider. */
export const GLASS_OPACITY_MIN = 0.3;
/** Highest `opacity` setting; mirrors the Config schema and the settings slider. */
export const GLASS_OPACITY_MAX = 1;
/** The reference recipe's border radius, in px. */
export const GLASS_RADIUS_PX = 12;
/** Clamp a finite number into [min, max]. */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/** Round to three decimals so emitted CSS stays short and comparable. */
function round3(value) {
    return Math.round(value * 1000) / 1000;
}
/**
 * Map the `opacity` setting onto a tint alpha in the reference band.
 * @param opacity - the `opacity` setting, 0.3 (clear) – 1.0 (dense).
 * @returns the tint alpha to hand to `hsla()`, within [0.05, 0.42].
 */
export function glassTintAlpha(opacity) {
    const span = GLASS_OPACITY_MAX - GLASS_OPACITY_MIN;
    const position = span <= 0 ? 0 : (clamp(opacity, GLASS_OPACITY_MIN, GLASS_OPACITY_MAX) - GLASS_OPACITY_MIN) / span;
    return round3(GLASS_TINT_MIN + position * (GLASS_TINT_MAX - GLASS_TINT_MIN));
}
/**
 * The `backdrop-filter` value for a blur radius.
 * @param blur - blur radius in px; 0 or less means no blurring.
 * @returns `none`, or `blur(<n>px)`.
 */
export function glassBlurFilter(blur) {
    const radius = Math.max(0, Math.round(blur));
    return radius <= 0 ? 'none' : `blur(${radius}px)`;
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
export function backdropFilterSupported(probe) {
    const supports = probe ?? ((property, value) => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(property, value));
    return supports('backdrop-filter', 'blur(4px)');
}
/**
 * Rewrite a colour at a new alpha.
 *
 * Handles `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`. Any
 * other notation (including `color-mix()` and unresolved CSS variables) is
 * returned untouched, so a caller can never turn a colour into garbage.
 * @param color - the base colour, usually a computed `--dsw-*` token value.
 * @param alpha - the target alpha, clamped to [0, 1].
 * @returns an `rgba()` string, or the input when the notation is unsupported.
 */
export function withAlpha(color, alpha) {
    const a = clamp(alpha, 0, 1);
    const trimmed = color.trim();
    const hex = /^#([0-9a-f]{3,8})$/i.exec(trimmed);
    if (hex !== null) {
        let h = hex[1];
        if (h.length === 3 || h.length === 4)
            h = h.split('').map((ch) => ch + ch).join('');
        if (h.length === 6) {
            return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${round3(a)})`;
        }
        if (h.length === 8) {
            const base = parseInt(h.slice(6, 8), 16) / 255;
            return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${round3(base * a)})`;
        }
        return trimmed;
    }
    const rgb = /^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(trimmed);
    if (rgb !== null) {
        const raw = rgb[4];
        const base = raw === undefined ? 1 : raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw);
        return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${round3(base * a)})`;
    }
    return trimmed;
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
export function glassVars(options) {
    const dark = options.dark;
    const supported = options.supported ?? true;
    const tint = glassTintAlpha(options.opacity);
    const fillAlpha = supported ? tint : 0.94;
    // Rim, hairline and highlight: the reference's `#ffffff2e` rim, tuned per
    // theme. On the light theme the tint is white-on-white, so the rim does the
    // edge work; on the dark theme the rim is the only bright line.
    const rim = dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.55)';
    const hairline = dark ? '0 0 0 0.5px rgba(0, 0, 0, 0.3)' : '0 0 0 0.5px rgba(15, 17, 21, 0.06)';
    const highlight = dark
        ? 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
        : 'inset 0 1px 0 rgba(255, 255, 255, 0.7)';
    const drop = dark ? '0 6px 15px 0 rgba(14, 14, 14, 0.28)' : '0 6px 15px 0 rgba(142, 142, 142, 0.19)';
    return {
        '--ambient-glass-fill': `hsla(0, 0%, ${dark ? 35 : 100}%, ${fillAlpha})`,
        '--ambient-glass-rim': rim,
        '--ambient-glass-shadow': `${highlight}, ${hairline}, ${drop}`,
        '--ambient-glass-blur': supported ? glassBlurFilter(options.blur) : 'none',
        '--ambient-glass-radius': `${GLASS_RADIUS_PX}px`,
    };
}
