/**
 * Pure trail feed logic (no React, no DOM) so the pixel trail's data mapping
 * can be unit-tested in isolation.
 *
 * At 0.1.2-rc.1 the running agent stream lives in the Chat target's
 * `ChatSnapshot.legacy` projection: `partial.blocks` (the in-progress
 * assistant stream, blocks tagged `reasoning` / `text` / `tool-call` / …) and
 * `runningCalls` (live tool calls). When no Chat target is mounted, the trail
 * falls back to the session lifecycle (`session.running`).
 *
 * @module dsh-ambient-ui/trailFeed
 */
import type { AmbientChatSnapshot } from './client/feed.ts';
/** The agent-step kinds the trail renders. */
export type TrailKind = 'think' | 'tool' | 'output' | 'idle';
/** Step-kind counters behind the trail's current feed. */
export interface TrailCounts {
    think: number;
    tool: number;
    output: number;
}
/** Stable zero counters (safe to hold across renders). */
export declare const EMPTY_TRAIL_COUNTS: TrailCounts;
/** One decoded feed window: whether the agent is visibly producing output, and how. */
export interface TrailActivity {
    running: boolean;
    counts: TrailCounts;
}
/** Decode the Chat target's legacy projection into trail activity. */
export declare function deriveChatActivity(snapshot: AmbientChatSnapshot): TrailActivity;
/** The step kinds whose counts grew between two consecutive feed windows. */
export declare function countDeltas(prev: TrailCounts, next: TrailCounts): TrailKind[];
/** The kind the trail should drip while running with no fresh blocks. */
export declare function streamKind(activity: TrailActivity): TrailKind;
//# sourceMappingURL=trailFeed.d.ts.map