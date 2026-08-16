/**
 * dsh-ambient-ui HTTP routes: the browser half talks to the host through plain
 * same-origin JSON endpoints (`/api/ambient/balance` and
 * `/api/ambient/tokens`), which the host answers by querying the DeepSeek
 * Get User Balance endpoint and the session token-meter. The client never
 * sees the API key.
 *
 * @module dsh-ambient-ui/routes
 */
/** Browser-facing base path of the ambient API. */
export const AMBIENT_API_PREFIX = '/api/ambient';
/** Write one JSON response. */
function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
}
/** Require the method or answer 405. */
function requireMethod(req, res, method) {
    if (req.method === method)
        return true;
    json(res, 405, { ok: false, error: 'method-not-allowed' });
    return false;
}
/** Wrap one async balance read as a GET JSON route. */
function getRoute(path, run) {
    return {
        kind: 'exact',
        path,
        handler: (req, res) => {
            if (!requireMethod(req, res, 'GET'))
                return;
            Promise.resolve(run()).then((value) => json(res, 200, value), (error) => {
                json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
            });
        },
    };
}
/** Wrap one request-aware JSON route (e.g. the session-token read). */
function getRequestRoute(path, run) {
    return {
        kind: 'exact',
        path,
        handler: (req, res) => {
            if (!requireMethod(req, res, 'GET'))
                return;
            Promise.resolve(run(req)).then((value) => json(res, 200, value), (error) => {
                json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
            });
        },
    };
}
/** Read a JSON request body (bounded). */
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > 64 * 1024) {
                reject(new Error('body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw.length === 0) {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
        req.on('error', reject);
    });
}
/** Read the `session` query parameter from the request URL. */
function sessionParam(req) {
    const raw = req.url ?? '';
    const q = raw.indexOf('?');
    if (q < 0)
        return undefined;
    const params = new URLSearchParams(raw.slice(q + 1));
    const value = params.get('session');
    return value === null || value === '' ? undefined : value;
}
/**
 * Build the full ambient API route family for one service.
 * @param service - the ambient service.
 * @param resolveSession - resolve a session id to the session (undefined when absent).
 */
export function makeAmbientRoutes(service, resolveSession, describeSettings, settingsSeamRef) {
    return [
        {
            // One exact route for GET (read) and PUT (write): the webserver rejects
            // two exact routes with the same path, so dispatch on the method here.
            kind: 'exact',
            path: `${AMBIENT_API_PREFIX}/config`,
            handler: (req, res) => {
                if (req.method === 'GET') {
                    Promise.resolve(service.readConfig()).then((value) => json(res, 200, value), (error) => json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) }));
                    return;
                }
                if (req.method === 'PUT') {
                    Promise.resolve(readJsonBody(req)).then(async (body) => {
                        const patch = typeof body === 'object' && body !== null
                            ? body
                            : {};
                        const next = await service.writeConfig(patch);
                        json(res, 200, next);
                    }, (error) => {
                        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
                    });
                    return;
                }
                json(res, 405, { ok: false, error: 'method-not-allowed' });
            },
        },
        getRoute(`${AMBIENT_API_PREFIX}/balance`, () => service.view()),
        getRoute(`${AMBIENT_API_PREFIX}/balance/refresh`, () => service.refresh()),
        ...(describeSettings === undefined
            ? []
            : [getRequestRoute(`${AMBIENT_API_PREFIX}/debug`, () => {
                    const namespaces = describeSettings().map((d) => d.ns);
                    const seam = settingsSeamRef === undefined ? undefined : settingsSeamRef();
                    return {
                        ok: true,
                        hasSettingsService: seam !== undefined,
                        settingsCtor: seam !== undefined ? seam.constructor?.name ?? 'unknown' : null,
                        registrationsSize: seam !== undefined && typeof seam.registrations === 'object'
                            ? (seam.registrations.size)
                            : -1,
                        writable: seam !== undefined && typeof seam.writable === 'boolean'
                            ? seam.writable
                            : null,
                        ambientValue: seam !== undefined && typeof seam.get === 'function'
                            ? seam.get('ambient')
                            : null,
                        namespaces,
                        ambientRegistered: namespaces.includes('ambient'),
                    };
                })]),
        getRequestRoute(`${AMBIENT_API_PREFIX}/tokens`, (req) => {
            const id = sessionParam(req);
            if (id === undefined)
                return { ok: false, error: 'missing-session' };
            const session = resolveSession(id);
            if (session === undefined)
                return { ok: false, error: 'unknown-session' };
            return service.tokens(session);
        }),
    ];
}
