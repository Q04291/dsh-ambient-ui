/**
 * Module-level reactive ambient config store.
 *
 * Every consumer (the settings row, the balance chip, the trail) shares ONE
 * store, so a change written by any component re-renders all of them
 * immediately instead of waiting for the next poll or a page refresh.
 *
 * @module dsh-ambient-ui/ambientConfigStore
 */

import { AMBIENT_DEFAULTS, normalizeAmbientSettings, type AmbientSettings } from '../config.ts'

/** Config fetch cadence when nobody is writing (external changes). */
const POLL_MS = 30_000

/** Shared store snapshot. */
export interface AmbientConfigSnapshot {
  status: 'loading' | 'ready'
  value: AmbientSettings
}

let state: AmbientConfigSnapshot = { status: 'loading', value: { ...AMBIENT_DEFAULTS } }
const listeners = new Set<() => void>()
let active = 0
let timer: number | undefined

function emit(): void {
  for (const listener of [...listeners]) {
    try { listener() } catch { /* keep other listeners alive */ }
  }
}

/** Same-origin JSON fetch helper. */
async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) throw new Error(`ambient ${path} failed: ${response.status}`)
  return (await response.json()) as T
}

/** Current snapshot (stable reference between updates). */
export function getAmbientConfigSnapshot(): AmbientConfigSnapshot {
  return state
}

/** Subscribe to snapshot replacements; starts a shared poller. */
export function subscribeAmbientConfig(listener: () => void): () => void {
  listeners.add(listener)
  active += 1
  if (active === 1) {
    void refreshAmbientConfig()
    timer = window.setInterval(() => { void refreshAmbientConfig() }, POLL_MS)
  }
  return () => {
    listeners.delete(listener)
    active -= 1
    if (active === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

/** Pull the latest config from the Host route. */
export async function refreshAmbientConfig(): Promise<void> {
  try {
    const next = await fetchJson<AmbientSettings>('/api/ambient/config')
    state = { status: 'ready', value: normalizeAmbientSettings(next) }
  } catch {
    // Keep the last good value; the next poll retries.
    state = { ...state, status: 'ready' }
  }
  emit()
}

/** Persist one field through the Host route and publish the new value. */
export async function setAmbientConfig(field: keyof AmbientSettings, next: unknown): Promise<void> {
  const updated = await fetchJson<AmbientSettings>('/api/ambient/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [field]: next }),
  })
  state = { status: 'ready', value: normalizeAmbientSettings(updated) }
  emit()
}
