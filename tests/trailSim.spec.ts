import { describe, expect, it } from 'vitest'
import type { TrailActivity, TrailCounts } from '../src/trailFeed.ts'
import {
  TRAIL_COLS,
  TRAIL_IDLE_INTERVAL_MS,
  TRAIL_MAX_FRAME_MS,
  TRAIL_MAX_LIFE,
  TRAIL_MAX_PIXELS,
  TRAIL_MAX_SPAWNS_PER_FRAME,
  TRAIL_ROWS,
  createTrailRng,
  createTrailSim,
  staticTrailPixels,
  stepTrailSim,
  trailAlpha,
  trailPalette,
  trailTickMs,
} from '../src/trailSim.ts'

/** Build a feed window. */
function feed(counts: TrailCounts, running = true): TrailActivity {
  return { running, counts }
}

describe('trail timing', () => {
  it('maps the speed setting onto a tick length and clamps out-of-range input', () => {
    expect(trailTickMs(1)).toBe(256)
    expect(trailTickMs(10)).toBe(40)
    expect(trailTickMs(0)).toBe(256)
    expect(trailTickMs(99)).toBe(40)
  })

  it('fades monotonically between a floor and a ceiling', () => {
    expect(trailAlpha(0)).toBe(0.06)
    expect(trailAlpha(TRAIL_MAX_LIFE)).toBeCloseTo(0.92, 3)
    expect(trailAlpha(TRAIL_MAX_LIFE / 2)).toBeGreaterThan(trailAlpha(1))
  })
})

describe('trail simulation', () => {
  it('spawns one pixel per new block at the right edge', () => {
    const sim = createTrailSim()
    stepTrailSim(sim, { activity: feed({ think: 1, tool: 0, output: 0 }), dtMs: 0, speed: 5 })
    expect(sim.pixels).toHaveLength(1)
    expect(sim.pixels[0].kind).toBe('think')
    expect(sim.pixels[0].x).toBe(TRAIL_COLS - 1)
    expect(sim.pixels[0].life).toBe(TRAIL_MAX_LIFE)
  })

  it('moves pixels fractionally instead of one whole cell per tick', () => {
    const sim = createTrailSim()
    const activity = feed({ think: 1, tool: 0, output: 0 })
    stepTrailSim(sim, { activity, dtMs: 0, speed: 5 })
    const before = sim.pixels[0].x
    // Half a tick of travel must move the pixel by half a cell: the old
    // integer stepping made every pixel jump a full 8px cell at a time.
    stepTrailSim(sim, { activity, dtMs: trailTickMs(5) / 2, speed: 5 })
    expect(sim.pixels[0].x).toBeCloseTo(before - 0.5, 6)
    expect(sim.pixels).toHaveLength(1)
  })

  it('caps how many pixels a single frame can spawn', () => {
    const sim = createTrailSim()
    stepTrailSim(sim, { activity: feed({ think: 100, tool: 0, output: 0 }), dtMs: 0, speed: 5 })
    expect(sim.pixels).toHaveLength(TRAIL_MAX_SPAWNS_PER_FRAME)
  })

  it('never exceeds the pixel budget', () => {
    const sim = createTrailSim()
    let think = 0
    for (let i = 0; i < 80; i += 1) {
      think += TRAIL_MAX_SPAWNS_PER_FRAME
      // dtMs 0 means nothing ages, so only the budget can bound the array.
      stepTrailSim(sim, { activity: feed({ think, tool: 0, output: 0 }), dtMs: 0, speed: 1 })
    }
    expect(sim.pixels.length).toBeLessThanOrEqual(TRAIL_MAX_PIXELS)
  })

  it('drips while running and expires the trail once its life runs out', () => {
    const sim = createTrailSim()
    const activity = feed({ think: 1, tool: 0, output: 0 })
    stepTrailSim(sim, { activity, dtMs: 0, speed: 10 })
    // Enough frames to outlive TRAIL_MAX_LIFE at the fastest tick.
    for (let i = 0; i < 40; i += 1) {
      stepTrailSim(sim, { activity, dtMs: trailTickMs(10), speed: 10 })
    }
    expect(sim.pixels.every((pixel) => pixel.life > 0)).toBe(true)
    expect(sim.pixels.length).toBeLessThan(40)
  })

  it('never emits idle pixels while the agent is running', () => {
    const sim = createTrailSim()
    for (let i = 0; i < 20; i += 1) {
      stepTrailSim(sim, { activity: feed({ think: 0, tool: 0, output: 0 }), dtMs: 250, speed: 5 })
    }
    expect(sim.pixels.length).toBeGreaterThan(0)
    expect(sim.pixels.every((pixel) => pixel.kind !== 'idle')).toBe(true)
  })

  it('breathes a single idle pixel only after the strip drains', () => {
    const sim = createTrailSim()
    const steps = Math.ceil(TRAIL_IDLE_INTERVAL_MS / TRAIL_MAX_FRAME_MS) + 1
    for (let i = 0; i < steps; i += 1) {
      stepTrailSim(sim, { activity: undefined, dtMs: TRAIL_MAX_FRAME_MS, speed: 5 })
    }
    expect(sim.pixels).toHaveLength(1)
    expect(sim.pixels[0].kind).toBe('idle')
  })

  it('is reproducible for a fixed seed and frame cadence', () => {
    const run = (): number[] => {
      const sim = createTrailSim(1234)
      const rows: number[] = []
      for (let i = 0; i < 20; i += 1) {
        stepTrailSim(sim, { activity: feed({ think: i + 1, tool: 0, output: 0 }), dtMs: 0, speed: 5 })
        rows.push(...sim.pixels.map((pixel) => pixel.y))
      }
      return rows
    }
    expect(run()).toEqual(run())
  })

  it('generates a deterministic random sequence', () => {
    const a = createTrailRng(7)
    const b = createTrailRng(7)
    const first = [a(), a(), a()]
    expect(first).toEqual([b(), b(), b()])
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
  })
})

describe('reduced-motion still frame', () => {
  it('is empty when there is nothing running', () => {
    expect(staticTrailPixels(undefined)).toEqual([])
    expect(staticTrailPixels(feed({ think: 0, tool: 0, output: 0 }, false))).toEqual([])
  })

  it('lays the counted blocks out row-major from the bottom row', () => {
    const pixels = staticTrailPixels(feed({ think: 2, tool: 1, output: 0 }))
    expect(pixels).toHaveLength(3)
    expect(pixels.map((pixel) => pixel.kind)).toEqual(['think', 'think', 'tool'])
    expect(pixels[0].x).toBe(0)
    expect(pixels[0].y).toBe(TRAIL_ROWS - 1)
    expect(pixels.every((pixel) => pixel.life === TRAIL_MAX_LIFE)).toBe(true)
  })

  it('caps the still frame at the pixel budget', () => {
    const pixels = staticTrailPixels(feed({ think: 500, tool: 500, output: 500 }))
    expect(pixels).toHaveLength(TRAIL_MAX_PIXELS)
    expect(pixels.every((pixel) => pixel.y >= 0 && pixel.y < TRAIL_ROWS)).toBe(true)
  })
})

describe('trail palette', () => {
  it('reads the live theme tokens', () => {
    const read = (name: string, fallback: string): string =>
      name.includes('success') ? '#00ff00' : fallback
    const light = trailPalette(false, read)
    expect(light.think).toBe('#00ff00')
    expect(light.tool).toBe('#f59e0b')
  })

  it('falls back per theme when a token is missing', () => {
    const dark = trailPalette(true, (_name, fallback) => fallback)
    expect(dark.output).toBe('#7aaaff')
    // success/warn are theme-independent in DSH: only business/label flip to the 400 variants.
    expect(dark.think).toBe('#22c55e')
    expect(dark.tool).toBe('#f59e0b')
    const light = trailPalette(false, (_name, fallback) => fallback)
    expect(light.output).toBe('#4176e6')
  })
})
