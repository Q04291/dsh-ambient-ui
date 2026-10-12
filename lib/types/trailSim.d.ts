/**
 * Pure pixel-trail simulation (no React, no DOM), so the trail's motion,
 * spawning, palette and reduced-motion fallback are unit-testable.
 *
 * The simulation advances in *time*, not in frames: a pixel's `x` and `life`
 * are fractional and step by `dt / tickMs` where `tickMs` is the crawl cadence
 * derived from the `speed` setting. That replaces the previous integer
 * per-tick stepping, which made every pixel jump a whole 8px cell at a time —
 * the main reason the strip read as coarse next to DSH's smooth UI.
 *
 * Motion is deliberately allocation-free after construction: the renderer owns
 * one `TrailSim` in a ref and mutates it inside the animation frame, so no
 * pixel array is rebuilt per frame and nothing re-renders React.
 *
 * @module dsh-ambient-ui/trailSim
 */
import { type TrailActivity, type TrailCounts, type TrailKind } from './trailFeed.ts';
/** Grid width in cells (the strip is `TRAIL_COLS × TRAIL_ROWS` pixels). */
export declare const TRAIL_COLS = 30;
/** Grid height in cells. */
export declare const TRAIL_ROWS = 8;
/** Cell size in CSS px; the canvas is scaled by the device pixel ratio. */
export declare const TRAIL_CELL_PX = 8;
/** Pixel lifetime in ticks: how far a pixel travels before it fades out. */
export declare const TRAIL_MAX_LIFE = 18;
/** Upper bound on live pixels (memory guard; also the reduced-motion cap). */
export declare const TRAIL_MAX_PIXELS = 240;
/** Expected idle spark cadence in ms, used when nothing is running. */
export declare const TRAIL_IDLE_INTERVAL_MS = 2600;
/** Hard cap on pixels spawned by one frame, so a token burst cannot flood. */
export declare const TRAIL_MAX_SPAWNS_PER_FRAME = 6;
/** Largest frame delta folded into the simulation, in ms (tab-resume guard). */
export declare const TRAIL_MAX_FRAME_MS = 250;
/** Every trail kind, in a stable order. */
export declare const TRAIL_KINDS: readonly TrailKind[];
/**
 * The DSH alias token each trail kind draws from.
 *
 * The trail has no palette of its own: mixing hand-picked neon hexes with DSH's
 * own tokens was the core reason the strip looked bolted on. `output` must use
 * `--dsw-alias-state-business-primary` (the DeepSeek blue) — `brand-primary` is
 * DSH's *text* colour and resolves to near-black/near-white.
 */
export declare const TRAIL_TOKEN: Record<TrailKind, string>;
/**
 * Fallbacks used when a token is absent (older or stripped theme build).
 *
 * Mirrors what DSH actually resolves, not what looks best on dark: in the theme
 * bundle only `state-business-primary` and `label-tertiary` are re-pointed to the
 * lighter 400 variants under the dark theme, while `state-success-primary` and
 * `state-warn-primary` stay on the theme-independent static green-500/amber-500
 * in BOTH themes.
 */
export declare const TRAIL_FALLBACK: Record<'light' | 'dark', Record<TrailKind, string>>;
/**
 * Resolve the four trail colours from the live theme.
 * @param dark - whether the DSH dark theme is active.
 * @param read - token reader, injected so this stays DOM-free and testable.
 * @returns one concrete colour per kind.
 */
export declare function trailPalette(dark: boolean, read: (name: string, fallback: string) => string): Record<TrailKind, string>;
/** One animated pixel. */
export interface TrailPixel {
    id: number;
    kind: TrailKind;
    /** Fractional column, counted from the left edge; decreases as it scrolls. */
    x: number;
    /** Row index, 0 – TRAIL_ROWS-1. */
    y: number;
    /** Remaining life in ticks; drives the fade. */
    life: number;
}
/** Mutable simulation state; hold one per canvas in a ref. */
export interface TrailSim {
    pixels: TrailPixel[];
    counts: TrailCounts;
    nextId: number;
    /** ms accumulated toward the next drip while the agent is running. */
    dripMs: number;
    /** ms accumulated toward the next idle spark. */
    idleMs: number;
    /** Deterministic per-instance RNG, so React StrictMode cannot desync it. */
    rng: () => number;
}
/** Inputs for one simulation step. */
export interface TrailStepInput {
    /** Live feed window, or undefined when no feed is mounted. */
    activity: TrailActivity | undefined;
    /** Frame delta in ms. */
    dtMs: number;
    /** The `speed` setting, 1 (slow) – 10 (fast). */
    speed: number;
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
export declare function createTrailRng(seed: number): () => number;
/**
 * Milliseconds per cell of travel for a trail-speed setting.
 * @param speed - the `speed` setting, 1 – 10.
 * @returns the tick length in ms, from ~256 ms (slow) down to 24 ms (fast).
 */
export declare function trailTickMs(speed: number): number;
/**
 * Fade curve for a pixel's remaining life.
 * @param life - remaining life in ticks.
 * @returns the draw alpha, between 0.06 and 0.92.
 */
export declare function trailAlpha(life: number): number;
/**
 * Build a fresh simulation.
 * @param seed - RNG seed; the same seed replays the same trail.
 * @returns mutable simulation state with no live pixels.
 */
export declare function createTrailSim(seed?: number): TrailSim;
/**
 * Advance the simulation by one frame delta (mutates `sim`).
 * @param sim - the simulation to advance.
 * @param input - feed window, frame delta and speed setting.
 */
export declare function stepTrailSim(sim: TrailSim, input: TrailStepInput): void;
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
export declare function staticTrailPixels(activity: TrailActivity | undefined): TrailPixel[];
//# sourceMappingURL=trailSim.d.ts.map