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
/** Stable zero counters (safe to hold across renders). */
export const EMPTY_TRAIL_COUNTS = { think: 0, tool: 0, output: 0 };
/** Decode the Chat target's legacy projection into trail activity. */
export function deriveChatActivity(snapshot) {
    const legacy = snapshot.legacy;
    let think = 0;
    let tool = 0;
    let output = 0;
    for (const block of legacy.partial?.blocks ?? []) {
        if (block.kind === 'reasoning')
            think += 1;
        else if (block.kind === 'text')
            output += 1;
        else if (block.kind === 'tool-call')
            tool += 1;
    }
    tool += legacy.runningCalls.length;
    return {
        running: legacy.partial !== null || legacy.runningCalls.length > 0,
        counts: { think, tool, output },
    };
}
/** The step kinds whose counts grew between two consecutive feed windows. */
export function countDeltas(prev, next) {
    const spawned = [];
    if (next.think > prev.think)
        spawned.push('think');
    if (next.tool > prev.tool)
        spawned.push('tool');
    if (next.output > prev.output)
        spawned.push('output');
    return spawned;
}
/** The kind the trail should drip while running with no fresh blocks. */
export function streamKind(activity) {
    const { counts, running } = activity;
    if (!running)
        return 'idle';
    if (counts.think > 0)
        return 'think';
    if (counts.tool > 0)
        return 'tool';
    if (counts.output > 0)
        return 'output';
    // Running but the feed exposes no kinded blocks yet (e.g. the session-only
    // fallback pulse): drip the generic output color.
    return 'output';
}
