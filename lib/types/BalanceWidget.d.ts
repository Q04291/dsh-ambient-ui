/**
 * The balance/token floating widget: a glassmorphism chip pinned to the
 * bottom-right corner of the app frame (the `shell.overlay` layer). It polls
 * the Host `/api/ambient/balance` endpoint for the DeepSeek account balance
 * and `/api/ambient/tokens` for the current session's token pressure, and
 * refreshes on a fixed cadence plus visibility changes. Clicking expands the
 * per-currency breakdown and forces a manual refresh.
 *
 * @module dsh-ambient-ui/BalanceWidget
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
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
 * The bottom-right balance/token chip.
 * @param props - the composed overlay entry props.
 */
export declare function BalanceWidget(props: BalanceWidgetProps): React.ReactElement | null;
//# sourceMappingURL=BalanceWidget.d.ts.map