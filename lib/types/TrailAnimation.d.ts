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
import { type ReactElement } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Props for the dock seat. */
export type TrailAnimationProps = PropsRuntime<'conversation.input.dock'>;
export type { TrailKind } from './trailFeed.ts';
/**
 * Trail seat entry point.
 *
 * `useAmbientConfig` is the only hook called here; the feed hooks live in the
 * child components so that returning `null` while hidden never changes this
 * component's hook order.
 * @param props - dock seat props from the host.
 * @returns the trail, or null when the trail is switched off.
 */
export declare function TrailAnimation(props: TrailAnimationProps): ReactElement | null;
//# sourceMappingURL=TrailAnimation.d.ts.map