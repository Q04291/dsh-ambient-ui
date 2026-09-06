/**
 * dsh-ambient-ui HTTP routes: the browser half talks to the host through plain
 * same-origin JSON endpoints (`/api/ambient/balance` and
 * `/api/ambient/tokens`), which the host answers by querying the DeepSeek
 * Get User Balance endpoint and the session token-meter. The client never
 * sees the API key.
 *
 * Configuration no longer rides a plugin route: the `ambient` settings
 * namespace is registered through `ctx.settings` at boot, so the browser reads
 * and writes it through the native settings describe/scope transport.
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
 * Build the ambient balance/token route family for one service.
 * @param service - the ambient service.
 * @param resolveSession - resolve a session id to the session (undefined when absent).
 */
export function makeAmbientRoutes(service, resolveSession) {
    return [
        getRoute(`${AMBIENT_API_PREFIX}/balance`, () => service.view()),
        getRoute(`${AMBIENT_API_PREFIX}/balance/refresh`, () => service.refresh()),
        {
            kind: 'exact',
            path: `${AMBIENT_API_PREFIX}/tokens`,
            handler: (req, res) => {
                if (!requireMethod(req, res, 'GET'))
                    return;
                let value;
                const id = sessionParam(req);
                if (id === undefined) {
                    value = { ok: false, error: 'missing-session' };
                }
                else {
                    const session = resolveSession(id);
                    value = session === undefined ? { ok: false, error: 'unknown-session' } : service.tokens(session);
                }
                json(res, 200, value);
            },
        },
    ];
}
