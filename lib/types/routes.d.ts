/**
 * dsh-ambient-ui HTTP routes: the browser half talks to the host through plain
 * same-origin JSON endpoints (`/api/ambient/balance` and
 * `/api/ambient/tokens`), which the host answers by querying the DeepSeek
 * Get User Balance endpoint and the session token-meter. The client never
 * sees the API key.
 *
 * @module dsh-ambient-ui/routes
 */
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { AmbientService } from './service.ts';
import type { Session } from '@deepseek-ai/dsh-session';
/** Browser-facing base path of the ambient API. */
export declare const AMBIENT_API_PREFIX = "/api/ambient";
/**
 * Build the full ambient API route family for one service.
 * @param service - the ambient service.
 * @param resolveSession - resolve a session id to the session (undefined when absent).
 */
export declare function makeAmbientRoutes(service: AmbientService, resolveSession: (id: string) => Session | undefined, describeSettings?: () => {
    ns: string;
}[], settingsSeamRef?: () => unknown): WebRoute[];
//# sourceMappingURL=routes.d.ts.map