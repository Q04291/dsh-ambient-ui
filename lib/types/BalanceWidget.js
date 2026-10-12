import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAmbientConfig } from "./client/useAmbientConfig.js";
import { useDarkTheme } from "./client/theme.js";
import { backdropFilterSupported, glassVars } from "./glassRecipe.js";
import css from './styles.module.css';
/** Poll interval for the Host snapshots. */
const POLL_MS = 30_000;
/** Same-origin JSON fetch helper. */
async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok)
        throw new Error(`ambient ${path} failed: ${response.status}`);
    return (await response.json());
}
/** Format a number with up to two decimals. */
function formatAmount(value) {
    if (value === undefined || Number.isNaN(value))
        return '--';
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Format a token count with thousands separators. */
function formatTokens(value) {
    if (value === undefined || Number.isNaN(value))
        return '--';
    return value.toLocaleString();
}
/**
 * The balance/token chip.
 * @param props - the composed composer-seat props.
 */
export function BalanceWidget(props) {
    const { value } = useAmbientConfig();
    const sessionId = props.sessionId;
    const [balance, setBalance] = useState(null);
    const [tokens, setTokens] = useState(null);
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const dark = useDarkTheme();
    // The widget is hidden by a setting, but hooks still run; gating the poll
    // effects on the setting is what actually stops the network traffic.
    const enabled = value.showBalance !== false;
    const refreshBalance = useCallback(() => {
        let live = true;
        fetchJson('/api/ambient/balance').then((snapshot) => {
            if (live)
                setBalance(snapshot);
        }, () => {
            if (live)
                setBalance(null);
        });
        return () => { live = false; };
    }, []);
    const refreshTokens = useCallback(() => {
        if (sessionId === undefined) {
            setTokens(null);
            return () => { };
        }
        let live = true;
        fetchJson(`/api/ambient/tokens?session=${encodeURIComponent(sessionId)}`).then((snapshot) => {
            if (live)
                setTokens(snapshot);
        }, () => {
            if (live)
                setTokens(null);
        });
        return () => { live = false; };
    }, [sessionId]);
    useEffect(() => {
        if (!enabled)
            return;
        const cleanup = refreshBalance();
        const timer = window.setInterval(refreshBalance, POLL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'visible')
                refreshBalance();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cleanup();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, refreshBalance]);
    useEffect(() => {
        if (!enabled)
            return;
        const cleanup = refreshTokens();
        const timer = window.setInterval(refreshTokens, POLL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'visible')
                refreshTokens();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cleanup();
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, refreshTokens]);
    // Dismiss the popover with Escape or a click outside it — an absolutely
    // positioned panel that only closes on the chip is easy to get stuck behind.
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        const onPointerDown = (event) => {
            const root = rootRef.current;
            if (root !== null && event.target instanceof Node && root.contains(event.target))
                return;
            setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown, true);
        };
    }, [open]);
    const glassSupported = useMemo(() => backdropFilterSupported(), []);
    const glassStyle = useMemo(() => glassVars({ dark, opacity: value.opacity, blur: value.blur, supported: glassSupported }), [dark, value.opacity, value.blur, glassSupported]);
    if (!enabled)
        return null;
    const total = balance?.total;
    const currency = balance?.currency ?? balance?.balances[0]?.currency;
    // Multiple distinct currencies cannot be summed into one total; show a
    // placeholder label (the per-currency breakdown is in the expanded card).
    const mixedCurrencies = balance !== null && balance.error === undefined
        && balance.balances.length > 1
        && new Set(balance.balances.map((b) => b.currency)).size > 1;
    const balanceLabel = balance === null
        ? '…'
        : balance.error !== undefined
            ? '余额不可用'
            : mixedCurrencies === true
                ? `${balance.balances.length} 币种`
                : total === undefined || currency === undefined
                    ? '--'
                    : `${formatAmount(total)} ${currency}`;
    const tokenLabel = tokens?.ok === true
        ? `${formatTokens(tokens.totalTokens)} tok`
        : undefined;
    const refresh = () => {
        refreshBalance();
        refreshTokens();
    };
    const dotClass = balance !== null && balance.error !== undefined
        ? css.dotError
        : balance?.available === true
            ? css.dotOk
            : css.dot;
    const detailsId = 'ambient-balance-details';
    const announcement = tokenLabel === undefined ? balanceLabel : `${balanceLabel}，${tokenLabel}`;
    return (_jsxs("div", { className: css.balanceWidget, style: glassStyle, ref: rootRef, "data-testid": "ambient-widget", children: [_jsx("span", { className: css.srOnly, role: "status", "aria-live": "polite", children: announcement }), _jsxs("button", { type: "button", className: css.balanceCard, onClick: () => { setOpen((v) => !v); refresh(); }, title: "DeepSeek \u8D26\u6237\u4F59\u989D / \u4F1A\u8BDD token \u7528\u91CF", "aria-expanded": open, "aria-controls": detailsId, "data-testid": "ambient-balance", children: [_jsx("span", { className: dotClass, "aria-hidden": "true" }), _jsx("span", { className: css.balanceText, children: balanceLabel }), tokenLabel !== undefined && (_jsxs(_Fragment, { children: [_jsx("span", { className: css.sep, "aria-hidden": "true" }), _jsx("span", { className: css.tokenText, children: tokenLabel })] }))] }), open && balance !== null && (_jsxs("div", { className: css.balanceDetails, id: detailsId, role: "group", "aria-label": "\u4F59\u989D\u660E\u7EC6", children: [balance.error !== undefined && (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: "\u72B6\u6001" }), _jsx("span", { className: css.rowRight, children: balance.error })] })), balance.balances.map((b) => (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: b.currency }), _jsxs("span", { className: css.rowRight, children: [_jsx("span", { title: "\u6388\u4E88\u4F59\u989D", children: formatAmount(Number(b.granted_balance)) }), _jsx("span", { children: "+" }), _jsx("span", { title: "\u5145\u503C\u4F59\u989D", children: formatAmount(Number(b.topped_up_balance)) })] })] }, b.currency))), tokens?.ok === true && tokens.totalTokens !== undefined && (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: "\u4F1A\u8BDD tokens" }), _jsxs("span", { className: css.rowRight, children: [_jsx("span", { children: formatTokens(tokens.totalTokens) }), _jsxs("span", { className: css.dim, children: ["(surface ", formatTokens(tokens.surfaceTokens), ")"] })] })] }))] }))] }));
}
