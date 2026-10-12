/**
 * The balance / token chip.
 *
 * Sits on the composer's right seat (`conversation.input.right`) and shows the
 * DeepSeek account balance plus the session's token usage; clicking it expands a
 * per-currency breakdown.
 *
 * Glassmorphism here follows the reference recipe in `src/glassRecipe.ts`: a
 * LOW-alpha `hsla()` tint, a bright translucent white rim and a tight soft
 * shadow, with the real `backdrop-filter` left to work on the backdrop. The
 * previous revision painted an OPAQUE `--dsw-alias-bg-overlay` background, so
 * its `backdrop-filter` had nothing to blur, and it spent the `opacity` setting
 * on container CSS `opacity`, which faded the text along with the chrome.
 *
 * @module dsh-ambient-ui/BalanceWidget
 */
import { type ReactElement } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AmbientSettings } from './config.ts';
/** Props for the composer's right seat. */
export type BalanceWidgetProps = PropsRuntime<'conversation.input.right'>;
/** Balance view served by the Host `/api/ambient/balance` route. */
export interface BalanceView {
    fetchedAt: number;
    available: boolean;
    balances: {
        currency: string;
        total_balance: string;
        granted_balance: string;
        topped_up_balance: string;
    }[];
    total?: number;
    currency?: string;
    error?: string;
}
/** Token view served by the Host `/api/ambient/tokens` route. */
export interface TokenView {
    ok: boolean;
    totalTokens?: number;
    surfaceTokens?: number;
    error?: string;
}
/**
 * The balance/token chip.
 * @param props - the composed composer-seat props.
 */
export declare function BalanceWidget(props: BalanceWidgetProps): ReactElement | null;
/** Re-exported so the settings row can describe the same values it edits. */
export type { AmbientSettings };
//# sourceMappingURL=BalanceWidget.d.ts.map