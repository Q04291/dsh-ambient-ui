import { jsx as _jsx } from "react/jsx-runtime";
/**
 * The pixel-art agent trail: a 30x8 dot-matrix strip in the composer dock
 * band (`conversation.input.dock`). It maps the live agent activity to flowing
 * pixels:
 *
 * - think  -> #00ff88  (reasoning blocks)
 * - tool   -> #ff8800  (running tool calls / tool-call blocks)
 * - output -> #4488ff  (text blocks)
 *
 * Pixels enter at the right edge and scroll left, fading over their lifetime.
 * The scroll rate follows the `speed` setting (1 = slow ... 10 = fast).
 *
 * Feed: at 0.1.2-rc.1 the Chat target contributes the running stream
 * (`useChat` -> `legacy.partial` + `legacy.runningCalls`). When that feed is
 * unavailable the trail degrades to a session-lifecycle pulse
 * (`useSession` -> `running`).
 *
 * @module dsh-ambient-ui/TrailAnimation
 */
import { useEffect, useRef, useState } from 'react';
import { useAmbientConfig } from "./client/useAmbientConfig.js";
import css from './styles.module.css';
import { EMPTY_TRAIL_COUNTS, countDeltas, deriveChatActivity, streamKind, } from "./trailFeed.js";
/** Step-type -> pixel color mapping (per the dsh-ambient-ui spec). */
export const TRAIL_COLORS = {
    think: '#00ff88',
    tool: '#ff8800',
    output: '#4488ff',
    idle: '#8c96aa',
};
/** Grid geometry: 30 columns x 8 rows, 8px cells. */
export const TRAIL_COLS = 30;
export const TRAIL_ROWS = 8;
export const TRAIL_CELL_PX = 8;
/** Pixel lifetime in ticks (fade length). */
const MAX_LIFE = 14;
/** Upper bound on live pixels (memory guard). */
const MAX_PIXELS = 240;
/** Idle-drip probability per tick when the trail is empty. */
const IDLE_DRIP = 0.18;
/** Create one pixel at the right edge on a random row. */
function createPixel(id, kind) {
    return {
        id,
        kind,
        x: TRAIL_COLS - 1,
        y: Math.floor(Math.random() * TRAIL_ROWS),
        life: MAX_LIFE,
    };
}
/** Bound the live pixel list. */
function trim(pixels) {
    if (pixels.length <= MAX_PIXELS)
        return [...pixels];
    return [...pixels.slice(pixels.length - MAX_PIXELS)];
}
/**
 * The pixel trail strip.
 * @param props - the composed composer-dock entry props.
 */
export function TrailAnimation(props) {
    const { value } = useAmbientConfig();
    // Chat-target feed (rich: think/tool/output). Absent when the Chat target is
    // not mounted in this GUI composition.
    const chat = typeof props.useChat === 'function' ? props.useChat((snapshot) => snapshot) : undefined;
    // Session lifecycle feed (always present on session-scope seats) — the
    // degraded pulse source while no Chat feed exists.
    const session = typeof props.useSession === 'function' ? props.useSession((snapshot) => snapshot) : undefined;
    const activity = chat !== undefined
        ? deriveChatActivity(chat)
        : session?.running === true
            ? { running: true, counts: EMPTY_TRAIL_COUNTS }
            : undefined;
    const [pixels, setPixels] = useState([]);
    const countsRef = useRef(EMPTY_TRAIL_COUNTS);
    const lastDripRef = useRef(0);
    const idRef = useRef(0);
    const speed = value.speed;
    // speed 1 -> ~256 ms/tick (slow), speed 10 -> ~40 ms/tick (fast).
    const tickMs = Math.max(24, 280 - speed * 24);
    // Feed: spawn pixels when activity grows; drip at most one pixel per tick
    // while a turn is running (a streaming snapshot can churn per token, so the
    // drip is throttled by the tick cadence rather than by snapshot frequency).
    useEffect(() => {
        if (activity === undefined)
            return;
        const counts = activity.counts;
        const prev = countsRef.current;
        const spawned = countDeltas(prev, counts);
        const now = Date.now();
        if (activity.running && spawned.length === 0 && now - lastDripRef.current >= tickMs) {
            const kind = streamKind(activity);
            if (kind !== 'idle') {
                spawned.push(kind);
                lastDripRef.current = now;
            }
        }
        else if (spawned.length > 0) {
            lastDripRef.current = now;
        }
        countsRef.current = counts;
        if (spawned.length === 0)
            return;
        setPixels((prevPixels) => {
            const next = [...prevPixels];
            for (const kind of spawned)
                next.push(createPixel(idRef.current++, kind));
            return trim(next);
        });
    }, [activity, tickMs]);
    // Ticker: scroll left and fade.
    useEffect(() => {
        const timer = window.setInterval(() => {
            setPixels((prev) => {
                if (prev.length === 0)
                    return prev;
                const next = prev
                    .map((p) => ({ ...p, x: p.x - 1, life: p.life - 1 }))
                    .filter((p) => p.x >= 0 && p.life > 0);
                if (next.length === 0 && Math.random() < IDLE_DRIP) {
                    next.push(createPixel(idRef.current++, 'idle'));
                }
                return next;
            });
        }, tickMs);
        return () => window.clearInterval(timer);
    }, [tickMs]);
    if (value.showTrail === false)
        return null;
    const gridStyle = {
        width: TRAIL_COLS * TRAIL_CELL_PX,
        height: TRAIL_ROWS * TRAIL_CELL_PX,
    };
    return (_jsx("div", { className: css.trail, "aria-hidden": "true", "data-testid": "ambient-trail", children: _jsx("div", { className: css.trailGrid, style: gridStyle, children: pixels.map((pixel) => (_jsx("span", { className: `${css.cell} ${css[`cell${pixel.kind[0].toUpperCase()}${pixel.kind.slice(1)}`]}`, style: {
                    left: pixel.x * TRAIL_CELL_PX,
                    top: pixel.y * TRAIL_CELL_PX,
                    width: TRAIL_CELL_PX,
                    height: TRAIL_CELL_PX,
                    opacity: Math.max(0.08, pixel.life / MAX_LIFE),
                } }, pixel.id))) }) }));
}
