import { jsx as _jsx } from "react/jsx-runtime";
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
import { useEffect, useMemo, useRef } from 'react';
import { useAmbientConfig } from "./client/useAmbientConfig.js";
import { readThemeToken, useDarkTheme, usePrefersReducedMotion } from "./client/theme.js";
import css from './styles.module.css';
import { EMPTY_TRAIL_COUNTS, deriveChatActivity, } from "./trailFeed.js";
import { TRAIL_CELL_PX, TRAIL_COLS, TRAIL_ROWS, createTrailSim, staticTrailPixels, stepTrailSim, trailAlpha, trailPalette, } from "./trailSim.js";
/** Canvas width in CSS px (grid width × cell size). */
const CANVAS_W = TRAIL_COLS * TRAIL_CELL_PX;
/** Canvas height in CSS px (grid height × cell size). */
const CANVAS_H = TRAIL_ROWS * TRAIL_CELL_PX;
/** Transparent margin baked around each sprite so the glow is not clipped. */
const SPRITE_PAD = 6;
/** Sprite edge length in px. */
const SPRITE_SIZE = TRAIL_CELL_PX + SPRITE_PAD * 2;
/** Core square edge length inside a sprite. */
const SPRITE_CORE = TRAIL_CELL_PX - 2;
/** Frame interval used while the trail is empty and the agent is idle, in ms. */
const QUIET_FRAME_MS = 250;
/** Idle pixels are dimmed so at-rest breathing never competes with the composer. */
const IDLE_DIM = 0.5;
/**
 * Add a rounded-rect sub-path, falling back to a plain rect on engines without
 * `CanvasRenderingContext2D.roundRect`.
 */
function addRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
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
        const sprite = typeof document === 'undefined' ? null : document.createElement('canvas');
        if (sprite === null)
            continue;
        sprite.width = SPRITE_SIZE;
        sprite.height = SPRITE_SIZE;
        const ctx = sprite.getContext('2d');
        if (ctx === null) {
            sprites[kind] = sprite;
            continue;
        }
        const inset = SPRITE_PAD + 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        addRoundRect(ctx, inset, inset, SPRITE_CORE, SPRITE_CORE, 2);
        // Two shadowed passes deepen the halo, then one crisp pass restores the core.
        ctx.fill();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
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
        if (sprite === undefined)
            continue;
        const dim = pixel.kind === 'idle' ? IDLE_DIM : 1;
        ctx.globalAlpha = Math.max(0.02, Math.min(1, trailAlpha(pixel.life) * dim));
        ctx.drawImage(sprite, pixel.x * TRAIL_CELL_PX - SPRITE_PAD, pixel.y * TRAIL_CELL_PX - SPRITE_PAD);
    }
    ctx.globalAlpha = 1;
}
/**
 * The canvas itself. Owns the simulation and the frame loop.
 * @param props - feed-derived activity and the trail-speed setting.
 */
function TrailCanvas({ activity, speed }) {
    const canvasRef = useRef(null);
    const simRef = useRef(null);
    const activityRef = useRef(activity);
    const speedRef = useRef(speed);
    const dark = useDarkTheme();
    const reduced = usePrefersReducedMotion();
    if (simRef.current === null)
        simRef.current = createTrailSim();
    const sim = simRef.current;
    const sprites = useMemo(() => buildSprites(dark), [dark]);
    // The frame loop reads the latest inputs from refs, so changing them must not
    // tear down and restart the loop.
    useEffect(() => {
        activityRef.current = activity;
    }, [activity]);
    useEffect(() => {
        speedRef.current = speed;
    }, [speed]);
    // Keep the backing store matched to the device pixel ratio. Declared BEFORE
    // any paint effect: assigning `canvas.width` clears the bitmap, so a still
    // frame painted first would be wiped again on mount.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas === null)
            return;
        const ctx = canvas.getContext('2d');
        if (ctx === null)
            return;
        let dpr = 1;
        const size = () => {
            dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
            canvas.width = Math.round(CANVAS_W * dpr);
            canvas.height = Math.round(CANVAS_H * dpr);
            clearCanvas(canvas, ctx, dpr);
            // A resize clears the bitmap too, and under reduced motion nothing else
            // is going to paint it again until the next feed update.
            if (reduced)
                paintPixels(ctx, sprites, staticTrailPixels(activityRef.current));
        };
        size();
        window.addEventListener('resize', size);
        return () => {
            window.removeEventListener('resize', size);
        };
    }, [reduced, sprites]);
    // Reduced motion: one deterministic still frame per feed update, no loop.
    useEffect(() => {
        if (!reduced)
            return;
        const canvas = canvasRef.current;
        if (canvas === null)
            return;
        const ctx = canvas.getContext('2d');
        if (ctx === null)
            return;
        const dpr = canvas.width > 0 ? canvas.width / CANVAS_W : 1;
        clearCanvas(canvas, ctx, dpr);
        paintPixels(ctx, sprites, staticTrailPixels(activity));
    }, [reduced, activity, sprites]);
    // The frame loop. Reads the latest inputs from refs, so changing a setting
    // must not tear down and restart it.
    useEffect(() => {
        if (reduced)
            return;
        const canvas = canvasRef.current;
        if (canvas === null)
            return;
        const ctx = canvas.getContext('2d');
        if (ctx === null)
            return;
        const dpr = canvas.width > 0 ? canvas.width / CANVAS_W : 1;
        let raf = 0;
        let last = performance.now();
        const frame = (now) => {
            raf = requestAnimationFrame(frame);
            // Nothing moving and nothing running: keep the loop alive but idle at
            // ~4fps, and let `last` advance only when real work happens so the idle
            // spark cadence stays correct.
            const quiet = sim.pixels.length === 0 && activityRef.current?.running !== true;
            if (quiet && now - last < QUIET_FRAME_MS)
                return;
            const dt = now - last;
            last = now;
            stepTrailSim(sim, { activity: activityRef.current, dtMs: dt, speed: speedRef.current });
            clearCanvas(canvas, ctx, dpr);
            paintPixels(ctx, sprites, sim.pixels);
        };
        raf = requestAnimationFrame(frame);
        return () => {
            cancelAnimationFrame(raf);
        };
    }, [sprites, reduced, sim]);
    return (_jsx("div", { className: css.trail, "aria-hidden": "true", children: _jsx("canvas", { ref: canvasRef, className: css.trailCanvas, width: CANVAS_W, height: CANVAS_H, style: { width: `${CANVAS_W}px`, height: `${CANVAS_H}px` } }) }));
}
/**
 * Chat-feed adapter. Calls `useChat` unconditionally — the previous version
 * guarded the call with `typeof props.useChat === 'function'`, which is a
 * rules-of-hooks violation that breaks as soon as the host swaps the prop.
 */
function ChatTrail(props) {
    const chat = props.useChat((snapshot) => snapshot);
    return _jsx(TrailCanvas, { activity: deriveChatActivity(chat), speed: props.speed });
}
/** Session-feed fallback adapter; unconditional `useSession` for the same reason. */
function SessionTrail(props) {
    const session = props.useSession((snapshot) => snapshot);
    // Without a chat feed there is no block detail, so the trail only knows
    // whether work is in flight.
    const activity = {
        running: session?.running === true,
        counts: EMPTY_TRAIL_COUNTS,
    };
    return _jsx(TrailCanvas, { activity: activity, speed: props.speed });
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
export function TrailAnimation(props) {
    const { value } = useAmbientConfig();
    const speed = value.speed;
    if (value.showTrail === false)
        return null;
    const { useChat, useSession } = props;
    if (typeof useChat === 'function')
        return _jsx(ChatTrail, { useChat: useChat, speed: speed });
    if (typeof useSession === 'function')
        return _jsx(SessionTrail, { useSession: useSession, speed: speed });
    return _jsx(TrailCanvas, { activity: undefined, speed: speed });
}
