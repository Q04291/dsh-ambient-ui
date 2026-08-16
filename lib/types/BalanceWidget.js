import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useState } from 'react';
import { useAmbientConfig } from "./client/useAmbientConfig.js";
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
 * The bottom-right balance/token chip.
 * @param props - the composed overlay entry props.
 */
export function BalanceWidget(props) {
    const { value } = useAmbientConfig();
    const sessionId = props.sessionId;
    const [balance, setBalance] = useState(null);
    const [tokens, setTokens] = useState(null);
    const [open, setOpen] = useState(false);
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
    }, [refreshBalance]);
    useEffect(() => {
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
    }, [refreshTokens]);
    if (value.showBalance === false)
        return null;
    const opacity = value.opacity;
    const blur = value.blur;
    const glassStyle = {
        opacity,
        backdropFilter: `blur(${blur}px) saturate(160%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
    };
    const total = balance?.total;
    const currency = balance?.currency ?? balance?.balances[0]?.currency;
    const balanceLabel = balance === null
        ? '…'
        : balance.error !== undefined
            ? '余额不可用'
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
    return (_jsxs("div", { className: css.balanceWidget, style: glassStyle, role: "status", "aria-live": "polite", children: [_jsxs("button", { type: "button", className: css.balanceCard, onClick: () => { setOpen((v) => !v); refresh(); }, title: "DeepSeek \u8D26\u6237\u4F59\u989D / \u4F1A\u8BDD token \u7528\u91CF", "aria-expanded": open, "data-testid": "ambient-balance", children: [_jsx("span", { className: balance?.available === true ? css.dotOk : css.dot, "aria-hidden": "true" }), _jsx("span", { className: css.balanceText, children: balanceLabel }), tokenLabel !== undefined && (_jsxs(_Fragment, { children: [_jsx("span", { className: css.sep, "aria-hidden": "true" }), _jsx("span", { className: css.tokenText, children: tokenLabel })] }))] }), open && balance !== null && (_jsxs("div", { className: css.balanceDetails, children: [balance.error !== undefined && (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: "\u72B6\u6001" }), _jsx("span", { className: css.rowRight, children: balance.error })] })), balance.balances.map((b) => (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: b.currency }), _jsxs("span", { className: css.rowRight, children: [_jsx("span", { title: "\u6388\u4E88\u4F59\u989D", children: formatAmount(Number(b.granted_balance)) }), _jsx("span", { children: "+" }), _jsx("span", { title: "\u5145\u503C\u4F59\u989D", children: formatAmount(Number(b.topped_up_balance)) })] })] }, b.currency))), tokens?.ok === true && tokens.totalTokens !== undefined && (_jsxs("span", { className: css.detailRow, children: [_jsx("span", { children: "\u4F1A\u8BDD tokens" }), _jsxs("span", { className: css.rowRight, children: [_jsx("span", { children: formatTokens(tokens.totalTokens) }), _jsxs("span", { className: css.dim, children: ["(surface ", formatTokens(tokens.surfaceTokens), ")"] })] })] }))] }))] }));
}
