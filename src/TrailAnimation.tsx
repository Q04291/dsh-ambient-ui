/**
 * The pixel-art agent trail: a 30x8 dot-matrix strip in the composer dock
 * band (`conversation.composer.dock`). It watches the live conversation
 * snapshot and maps agent steps to flowing pixels:
 *
 * - think  -> #00ff88  (reasoning blocks)
 * - tool   -> #ff8800  (running tool calls / tool-call blocks)
 * - output -> #4488ff  (text blocks)
 *
 * Pixels enter at the right edge and scroll left, fading over their lifetime.
 * The scroll rate follows the `speed` setting (1 = slow ... 10 = fast).
 *
 * @module dsh-ambient-ui/TrailAnimation
 */

import { useEffect, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AmbientSettings } from './config.ts'
import { useAmbientConfig } from './client/useAmbientConfig.ts'
import css from './styles.module.css'

export type TrailAnimationProps = PropsRuntime<'conversation.input.dock'>

/** The agent-step kinds the trail renders. */
export type TrailKind = 'think' | 'tool' | 'output' | 'idle'

/** Step-type -> pixel color mapping (per the dsh-ambient-ui spec). */
export const TRAIL_COLORS: Record<TrailKind, string> = {
  think: '#00ff88',
  tool: '#ff8800',
  output: '#4488ff',
  idle: '#8c96aa',
}

/** Grid geometry: 30 columns x 8 rows, 8px cells. */
export const TRAIL_COLS = 30
export const TRAIL_ROWS = 8
export const TRAIL_CELL_PX = 8

/** Pixel lifetime in ticks (fade length). */
const MAX_LIFE = 14
/** Upper bound on live pixels (memory guard). */
const MAX_PIXELS = 240
/** Idle-drip probability per tick when the trail is empty. */
const IDLE_DRIP = 0.18

/** One animated pixel. */
export interface TrailPixel {
  id: number
  kind: TrailKind
  x: number
  y: number
  life: number
}

interface KindCounts {
  think: number
  tool: number
  output: number
}

/** Count currently-visible agent activity by step kind. */
function deriveCounts(snapshot: ConversationSnapshot): KindCounts {
  let think = 0
  let tool = 0
  let output = 0
  for (const block of snapshot.partial?.blocks ?? []) {
    if (block.kind === 'reasoning') think += 1
    else if (block.kind === 'text') output += 1
    else if (block.kind === 'tool-call') tool += 1
  }
  tool += snapshot.runningCalls.length
  return { think, tool, output }
}

/** Create one pixel at the right edge on a random row. */
function createPixel(id: number, kind: TrailKind): TrailPixel {
  return {
    id,
    kind,
    x: TRAIL_COLS - 1,
    y: Math.floor(Math.random() * TRAIL_ROWS),
    life: MAX_LIFE,
  }
}

/** Bound the live pixel list. */
function trim(pixels: readonly TrailPixel[]): TrailPixel[] {
  if (pixels.length <= MAX_PIXELS) return [...pixels]
  return [...pixels.slice(pixels.length - MAX_PIXELS)]
}


/**
 * The pixel trail strip.
 * @param props - the composed composer-dock entry props.
 */
export function TrailAnimation(props: TrailAnimationProps): React.ReactElement | null {
  const { value } = useAmbientConfig()
  const snapshot = props.useSession((snapshot) => snapshot)

  const [pixels, setPixels] = useState<TrailPixel[]>([])
  const countsRef = useRef<KindCounts>({ think: 0, tool: 0, output: 0 })
  const idRef = useRef(0)

  const speed = value.speed
  // speed 1 -> ~256 ms/tick (slow), speed 10 -> ~40 ms/tick (fast).
  const tickMs = Math.max(24, 280 - speed * 24)

  // Feed: spawn pixels when the snapshot shows new agent activity.
  useEffect(() => {
    const counts = deriveCounts(snapshot)
    const prev = countsRef.current
    const spawned: TrailKind[] = []
    for (const kind of ['think', 'tool', 'output'] as const) {
      for (let i = prev[kind]; i < counts[kind]; i += 1) spawned.push(kind)
    }
    // While a turn is running, keep a steady drip for the active stream kind.
    if (snapshot.running && spawned.length === 0) {
      const blocks = snapshot.partial?.blocks ?? []
      if (counts.think > 0 && blocks.some((b) => b.kind === 'reasoning')) spawned.push('think')
      else if (counts.output > 0 && blocks.some((b) => b.kind === 'text')) spawned.push('output')
    }
    countsRef.current = counts
    if (spawned.length === 0) return
    setPixels((prevPixels) => {
      const next = [...prevPixels]
      for (const kind of spawned) next.push(createPixel(idRef.current++, kind))
      return trim(next)
    })
  }, [snapshot])

  // Ticker: scroll left and fade.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPixels((prev) => {
        if (prev.length === 0) return prev
        const next = prev
          .map((p) => ({ ...p, x: p.x - 1, life: p.life - 1 }))
          .filter((p) => p.x >= 0 && p.life > 0)
        if (next.length === 0 && Math.random() < IDLE_DRIP) {
          next.push(createPixel(idRef.current++, 'idle'))
        }
        return next
      })
    }, tickMs)
    return () => window.clearInterval(timer)
  }, [tickMs])

  if (value.showTrail === false) return null

  const gridStyle: React.CSSProperties = {
    width: TRAIL_COLS * TRAIL_CELL_PX,
    height: TRAIL_ROWS * TRAIL_CELL_PX,
  }

  return (
    <div className={css.trail} aria-hidden="true" data-testid="ambient-trail">
      <div className={css.trailGrid} style={gridStyle}>
        {pixels.map((pixel) => (
          <span
            key={pixel.id}
            className={`${css.cell} ${css[`cell${pixel.kind[0].toUpperCase()}${pixel.kind.slice(1)}`]}`}
            style={{
              left: pixel.x * TRAIL_CELL_PX,
              top: pixel.y * TRAIL_CELL_PX,
              width: TRAIL_CELL_PX,
              height: TRAIL_CELL_PX,
              opacity: Math.max(0.08, pixel.life / MAX_LIFE),
            }}
          />
        ))}
      </div>
    </div>
  )
}

