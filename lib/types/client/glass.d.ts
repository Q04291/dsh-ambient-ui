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
/**
 * Install the glass effect: subscribe to the shared config and re-apply on
 * theme changes. Returns a disposer.
 */
export declare function installGlass(): () => void;
//# sourceMappingURL=glass.d.ts.map