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
import { EMPTY_TRAIL_COUNTS, countDeltas, streamKind, } from "./trailFeed.js";
/** Grid width in cells (the strip is `TRAIL_COLS × TRAIL_ROWS` pixels). */
export const TRAIL_COLS = 30;
/** Grid height in cells. */
export const TRAIL_ROWS = 8;
/** Cell size in CSS px; the canvas is scaled by the device pixel ratio. */
export const TRAIL_CELL_PX = 8;
/** Pixel lifetime in ticks: how far a pixel travels before it fades out. */
export const TRAIL_MAX_LIFE = 18;
/** Upper bound on live pixels (memory guard; also the reduced-motion cap). */
export const TRAIL_MAX_PIXELS = 240;
/** Expected idle spark cadence in ms, used when nothing is running. */
export const TRAIL_IDLE_INTERVAL_MS = 2600;
/** Hard cap on pixels spawned by one frame, so a token burst cannot flood. */
export const TRAIL_MAX_SPAWNS_PER_FRAME = 6;
/** Largest frame delta folded into the simulation, in ms (tab-resume guard). */
export const TRAIL_MAX_FRAME_MS = 250;
/** Every trail kind, in a stable order. */
export const TRAIL_KINDS = ['think', 'tool', 'output', 'idle'];
/**
 * The DSH alias token each trail kind draws from.
 *
 * The trail has no palette of its own: mixing hand-picked neon hexes with DSH's
 * own tokens was the core reason the strip looked bolted on. `output` must use
 * `--dsw-alias-state-business-primary` (the DeepSeek blue) — `brand-primary` is
 * DSH's *text* colour and resolves to near-black/near-white.
 */
export const TRAIL_TOKEN = {
    think: '--dsw-alias-state-success-primary',
    tool: '--dsw-alias-state-warn-primary',
    output: '--dsw-alias-state-business-primary',
    idle: '--dsw-alias-label-tertiary',
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
export const TRAIL_FALLBACK = {
    light: { think: '#22c55e', tool: '#f59e0b', output: '#4176e6', idle: '#81858c' },
    dark: { think: '#22c55e', tool: '#f59e0b', output: '#7aaaff', idle: '#adb2b8' },
};
/**
 * Resolve the four trail colours from the live theme.
 * @param dark - whether the DSH dark theme is active.
 * @param read - token reader, injected so this stays DOM-free and testable.
 * @returns one concrete colour per kind.
 */
export function trailPalette(dark, read) {
    const fallback = dark ? TRAIL_FALLBACK.dark : TRAIL_FALLBACK.light;
    const palette = {};
    for (const kind of TRAIL_KINDS)
        palette[kind] = read(TRAIL_TOKEN[kind], fallback[kind]);
    return palette;
}
/** Clamp a finite number into [min, max]. */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
/** Round to three decimals (keeps the emitted alpha and the tests stable). */
function round3(value) {
    return Math.round(value * 1000) / 1000;
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
export function createTrailRng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Milliseconds per cell of travel for a trail-speed setting.
 * @param speed - the `speed` setting, 1 – 10.
 * @returns the tick length in ms, from ~256 ms (slow) down to 24 ms (fast).
 */
export function trailTickMs(speed) {
    return Math.max(24, 280 - clamp(speed, 1, 10) * 24);
}
/**
 * Fade curve for a pixel's remaining life.
 * @param life - remaining life in ticks.
 * @returns the draw alpha, between 0.06 and 0.92.
 */
export function trailAlpha(life) {
    const t = clamp(life / TRAIL_MAX_LIFE, 0, 1);
    return round3(Math.max(0.06, t ** 1.35 * 0.92));
}
/** Create one pixel entering at the right edge. */
function spawnPixel(sim, kind) {
    sim.pixels.push({
        id: sim.nextId,
        kind,
        x: TRAIL_COLS - 1,
        // Bias rows toward the vertical centre so the strip reads as a beam rather
        // than as noise filling the whole band.
        y: Math.floor((sim.rng() * 0.6 + 0.2) * TRAIL_ROWS),
        life: TRAIL_MAX_LIFE,
    });
    sim.nextId += 1;
}
/**
 * Build a fresh simulation.
 * @param seed - RNG seed; the same seed replays the same trail.
 * @returns mutable simulation state with no live pixels.
 */
export function createTrailSim(seed = 0x2f6e2b1) {
    return {
        pixels: [],
        counts: EMPTY_TRAIL_COUNTS,
        nextId: 0,
        dripMs: 0,
        idleMs: 0,
        rng: createTrailRng(seed),
    };
}
/**
 * Advance the simulation by one frame delta (mutates `sim`).
 * @param sim - the simulation to advance.
 * @param input - feed window, frame delta and speed setting.
 */
export function stepTrailSim(sim, input) {
    const dt = clamp(input.dtMs, 0, TRAIL_MAX_FRAME_MS);
    const tick = trailTickMs(input.speed);
    const ticks = dt / tick;
    const activity = input.activity;
    if (activity === undefined) {
        sim.counts = EMPTY_TRAIL_COUNTS;
        sim.dripMs = 0;
    }
    else {
        const previous = sim.counts;
        const changed = countDeltas(previous, activity.counts);
        sim.counts = activity.counts;
        // `countDeltas` reports WHICH kinds grew; the magnitude decides how many
        // pixels enter, so a burst of reasoning reads as a burst instead of a single
        // dot. The per-frame cap is what stops one pathological snapshot flooding
        // the strip.
        for (const kind of changed) {
            const delta = kind === 'think'
                ? activity.counts.think - previous.think
                : kind === 'tool'
                    ? activity.counts.tool - previous.tool
                    : activity.counts.output - previous.output;
            const count = Math.max(1, Math.min(delta, TRAIL_MAX_SPAWNS_PER_FRAME));
            for (let i = 0; i < count; i += 1)
                spawnPixel(sim, kind);
        }
        if (activity.running) {
            // Throttle the "no fresh block" drip to one pixel per tick, so a
            // per-token snapshot churn cannot flood the strip.
            sim.dripMs += dt;
            if (changed.length === 0 && sim.dripMs >= tick) {
                sim.dripMs = 0;
                const kind = streamKind(activity);
                if (kind !== 'idle')
                    spawnPixel(sim, kind);
            }
        }
        else {
            sim.dripMs = 0;
        }
    }
    // Idle breathing: only when the strip has drained and nothing is running, so
    // the widget never looks busy while the agent is at rest.
    const running = activity?.running === true;
    if (!running && sim.pixels.length === 0) {
        sim.idleMs += dt;
        if (sim.idleMs >= TRAIL_IDLE_INTERVAL_MS) {
            sim.idleMs = 0;
            spawnPixel(sim, 'idle');
        }
    }
    else {
        sim.idleMs = 0;
    }
    const surviving = [];
    for (const pixel of sim.pixels) {
        pixel.x -= ticks;
        pixel.life -= ticks;
        if (pixel.x >= 0 && pixel.life > 0)
            surviving.push(pixel);
    }
    if (surviving.length > TRAIL_MAX_PIXELS)
        surviving.splice(0, surviving.length - TRAIL_MAX_PIXELS);
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
export function staticTrailPixels(activity) {
    if (activity === undefined || !activity.running)
        return [];
    const counts = activity.counts;
    const kinds = [];
    for (let i = 0; i < counts.think; i += 1)
        kinds.push('think');
    for (let i = 0; i < counts.tool; i += 1)
        kinds.push('tool');
    for (let i = 0; i < counts.output; i += 1)
        kinds.push('output');
    const total = Math.min(kinds.length, TRAIL_MAX_PIXELS);
    const pixels = [];
    for (let i = 0; i < total; i += 1) {
        // Row-major from the bottom-left, so growth reads like a rising bar.
        const row = TRAIL_ROWS - 1 - Math.floor(i / TRAIL_COLS);
        pixels.push({
            id: i,
            kind: kinds[i],
            x: i % TRAIL_COLS,
            y: Math.max(0, row),
            life: TRAIL_MAX_LIFE,
        });
    }
    return pixels;
}
