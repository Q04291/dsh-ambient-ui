import { describe, expect, it } from 'vitest'
import {
  countDeltas, deriveChatActivity, streamKind,
  EMPTY_TRAIL_COUNTS,
} from '../src/trailFeed.ts'
import type { AmbientChatSnapshot } from '../src/client/feed.ts'

/** Minimal chat feed over the legacy projection. */
function chat(partial: { blocks: readonly { kind: string }[] } | null, runningCalls = 0): AmbientChatSnapshot {
  return {
    legacy: {
      partial: partial as AmbientChatSnapshot['legacy']['partial'],
      runningCalls: Array.from({ length: runningCalls }, (_, i) => ({ callId: `c${i}` })),
    },
  }
}

describe('deriveChatActivity', () => {
  it('maps reasoning/text/tool-call blocks and running calls to counts', () => {
    const activity = deriveChatActivity(chat(
      { blocks: [{ kind: 'reasoning' }, { kind: 'reasoning' }, { kind: 'text' }, { kind: 'tool-call' }] },
      2,
    ))
    expect(activity.running).toBe(true)
    expect(activity.counts).toEqual({ think: 2, tool: 3, output: 1 })
  })

  it('treats an absent partial with no running calls as idle', () => {
    const activity = deriveChatActivity(chat(null, 0))
    expect(activity.running).toBe(false)
    expect(activity.counts).toEqual({ think: 0, tool: 0, output: 0 })
  })

  it('ignores unknown block kinds', () => {
    const activity = deriveChatActivity(chat({ blocks: [{ kind: 'other' }] }, 0))
    expect(activity.counts).toEqual(EMPTY_TRAIL_COUNTS)
  })
})

describe('countDeltas', () => {
  it('lists only the kinds that grew', () => {
    expect(countDeltas({ think: 0, tool: 0, output: 0 }, { think: 1, tool: 2, output: 0 }))
      .toEqual(['think', 'tool'])
  })

  it('returns nothing when nothing grew', () => {
    expect(countDeltas({ think: 2, tool: 1, output: 3 }, { think: 2, tool: 1, output: 3 })).toEqual([])
  })
})

describe('streamKind', () => {
  it('drips the dominant visible kind while running', () => {
    expect(streamKind({ running: true, counts: { think: 3, tool: 0, output: 0 } })).toBe('think')
    expect(streamKind({ running: true, counts: { think: 0, tool: 1, output: 0 } })).toBe('tool')
    expect(streamKind({ running: true, counts: { think: 0, tool: 0, output: 4 } })).toBe('output')
  })

  it('falls back to output for a running feed with no kinded blocks (session pulse)', () => {
    expect(streamKind({ running: true, counts: EMPTY_TRAIL_COUNTS })).toBe('output')
  })

  it('is idle when nothing is running', () => {
    expect(streamKind({ running: false, counts: { think: 2, tool: 0, output: 0 } })).toBe('idle')
  })
})
