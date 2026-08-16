/**
 * dsh-ambient-ui HTTP routes: the browser half talks to the host through plain
 * same-origin JSON endpoints (`/api/ambient/balance` and
 * `/api/ambient/tokens`), which the host answers by querying the DeepSeek
 * Get User Balance endpoint and the session token-meter. The client never
 * sees the API key.
 *
 * @module dsh-ambient-ui/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type { AmbientService, BalanceView, TokenView } from './service.ts'
import { normalizeAmbientSettings, type AmbientSettings } from './config.ts'
import type { Session } from '@deepseek-ai/dsh-session'

/** Browser-facing base path of the ambient API. */
export const AMBIENT_API_PREFIX = '/api/ambient'

/** Write one JSON response. */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Require the method or answer 405. */
function requireMethod(req: IncomingMessage, res: ServerResponse, method: string): boolean {
  if (req.method === method) return true
  json(res, 405, { ok: false, error: 'method-not-allowed' })
  return false
}

/** Wrap one async balance read as a GET JSON route. */
function getRoute(path: string, run: () => Promise<BalanceView> | BalanceView): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

/** Wrap one request-aware JSON route (e.g. the session-token read). */
function getRequestRoute(path: string, run: (req: IncomingMessage) => unknown): WebRoute {
  return {
    kind: 'exact',
    path,
    handler: (req: IncomingMessage, res: ServerResponse): void => {
      if (!requireMethod(req, res, 'GET')) return
      Promise.resolve(run(req)).then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

/** Read a JSON request body (bounded). */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.length === 0) { resolve(undefined); return }
      try { resolve(JSON.parse(raw)) } catch (error) { reject(error instanceof Error ? error : new Error(String(error))) }
    })
    req.on('error', reject)
  })
}

/** Read the `session` query parameter from the request URL. */
function sessionParam(req: IncomingMessage): string | undefined {
  const raw = req.url ?? ''
  const q = raw.indexOf('?')
  if (q < 0) return undefined
  const params = new URLSearchParams(raw.slice(q + 1))
  const value = params.get('session')
  return value === null || value === '' ? undefined : value
}

/**
 * Build the full ambient API route family for one service.
 * @param service - the ambient service.
 * @param resolveSession - resolve a session id to the session (undefined when absent).
 */
export function makeAmbientRoutes(
  service: AmbientService,
  resolveSession: (id: string) => Session | undefined,
  describeSettings?: () => { ns: string }[],
  settingsSeamRef?: () => unknown,
): WebRoute[] {
  return [
    {
      // One exact route for GET (read) and PUT (write): the webserver rejects
      // two exact routes with the same path, so dispatch on the method here.
      kind: 'exact',
      path: `${AMBIENT_API_PREFIX}/config`,
      handler: (req: IncomingMessage, res: ServerResponse): void => {
        if (req.method === 'GET') {
          Promise.resolve(service.readConfig()).then(
            (value) => json(res, 200, value),
            (error) => json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) }),
          )
          return
        }
        if (req.method === 'PUT') {
          Promise.resolve(readJsonBody(req)).then(async (body) => {
            const patch = typeof body === 'object' && body !== null
              ? (body as Partial<AmbientSettings>)
              : {}
            const next = await service.writeConfig(patch)
            json(res, 200, next)
          }, (error) => {
            json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          })
          return
        }
        json(res, 405, { ok: false, error: 'method-not-allowed' })
      },
    },
    getRoute(`${AMBIENT_API_PREFIX}/balance`, () => service.view()),
    getRoute(`${AMBIENT_API_PREFIX}/balance/refresh`, () => service.refresh()),
    ...(describeSettings === undefined
      ? []
      : [getRequestRoute(`${AMBIENT_API_PREFIX}/debug`, () => {
        const namespaces = describeSettings().map((d) => d.ns)
        const seam = settingsSeamRef === undefined ? undefined : settingsSeamRef()
        return {
          ok: true,
          hasSettingsService: seam !== undefined,
          settingsCtor: seam !== undefined ? (seam as { constructor?: { name?: string } }).constructor?.name ?? 'unknown' : null,
          registrationsSize: seam !== undefined && typeof (seam as { registrations?: unknown }).registrations === 'object'
            ? ((seam as { registrations: Map<string, unknown> }).registrations.size)
            : -1,
          writable: seam !== undefined && typeof (seam as { writable?: unknown }).writable === 'boolean'
            ? (seam as { writable: boolean }).writable
            : null,
          ambientValue: seam !== undefined && typeof (seam as { get?: (ns: string) => unknown }).get === 'function'
            ? (seam as { get: (ns: string) => unknown }).get('ambient')
            : null,
          namespaces,
          ambientRegistered: namespaces.includes('ambient'),
        }
      })]),
    getRequestRoute(`${AMBIENT_API_PREFIX}/tokens`, (req): TokenView => {
      const id = sessionParam(req)
      if (id === undefined) return { ok: false, error: 'missing-session' }
      const session = resolveSession(id)
      if (session === undefined) return { ok: false, error: 'unknown-session' }
      return service.tokens(session)
    }),
  ]
}
