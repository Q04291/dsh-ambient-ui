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

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// ambient SessionStandardProps merge (sessionId) into this compilation.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from './client/feed.ts'
import type { AmbientSettings } from './config.ts'
import { useAmbientConfig } from './client/useAmbientConfig.ts'
import { useDarkTheme } from './client/theme.ts'
import { backdropFilterSupported, glassVars } from './glassRecipe.ts'
import css from './styles.module.css'

/** Props for the composer's right seat. */
export type BalanceWidgetProps = PropsRuntime<'conversation.input.right'>

/** Balance view served by the Host `/api/ambient/balance` route. */
export interface BalanceView {
  fetchedAt: number
  available: boolean
  balances: { currency: string; total_balance: string; granted_balance: string; topped_up_balance: string }[]
  total?: number
  currency?: string
  error?: string
}

/** Token view served by the Host `/api/ambient/tokens` route. */
export interface TokenView {
  ok: boolean
  totalTokens?: number
  surfaceTokens?: number
  error?: string
}

/** Poll interval for the Host snapshots. */
const POLL_MS = 30_000

/** Same-origin JSON fetch helper. */
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`ambient ${path} failed: ${response.status}`)
  return (await response.json()) as T
}

/** Format a number with up to two decimals. */
function formatAmount(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '--'
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format a token count with thousands separators. */
function formatTokens(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '--'
  return value.toLocaleString()
}

/**
 * The balance/token chip.
 * @param props - the composed composer-seat props.
 */
export function BalanceWidget(props: BalanceWidgetProps): ReactElement | null {
  const { value } = useAmbientConfig()
  const sessionId = props.sessionId
  const [balance, setBalance] = useState<BalanceView | null>(null)
  const [tokens, setTokens] = useState<TokenView | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dark = useDarkTheme()

  // The widget is hidden by a setting, but hooks still run; gating the poll
  // effects on the setting is what actually stops the network traffic.
  const enabled = value.showBalance !== false

  const refreshBalance = useCallback(() => {
    let live = true
    fetchJson<BalanceView>('/api/ambient/balance').then((snapshot) => {
      if (live) setBalance(snapshot)
    }, () => {
      if (live) setBalance(null)
    })
    return () => { live = false }
  }, [])

  const refreshTokens = useCallback(() => {
    if (sessionId === undefined) {
      setTokens(null)
      return () => { /* nothing to cancel */ }
    }
    let live = true
    fetchJson<TokenView>(`/api/ambient/tokens?session=${encodeURIComponent(sessionId)}`).then((snapshot) => {
      if (live) setTokens(snapshot)
    }, () => {
      if (live) setTokens(null)
    })
    return () => { live = false }
  }, [sessionId])

  useEffect(() => {
    if (!enabled) return
    const cleanup = refreshBalance()
    const timer = window.setInterval(refreshBalance, POLL_MS)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') refreshBalance()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cleanup()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, refreshBalance])

  useEffect(() => {
    if (!enabled) return
    const cleanup = refreshTokens()
    const timer = window.setInterval(refreshTokens, POLL_MS)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') refreshTokens()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cleanup()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, refreshTokens])

  // Dismiss the popover with Escape or a click outside it — an absolutely
  // positioned panel that only closes on the chip is easy to get stuck behind.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: PointerEvent): void => {
      const root = rootRef.current
      if (root !== null && event.target instanceof Node && root.contains(event.target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  const glassSupported = useMemo(() => backdropFilterSupported(), [])
  const glassStyle = useMemo(
    () => glassVars({ dark, opacity: value.opacity, blur: value.blur, supported: glassSupported }) as unknown as CSSProperties,
    [dark, value.opacity, value.blur, glassSupported],
  )

  if (!enabled) return null

  const total = balance?.total
  const currency = balance?.currency ?? balance?.balances[0]?.currency
  // Multiple distinct currencies cannot be summed into one total; show a
  // placeholder label (the per-currency breakdown is in the expanded card).
  const mixedCurrencies = balance !== null && balance.error === undefined
    && balance.balances.length > 1
    && new Set(balance.balances.map((b) => b.currency)).size > 1
  const balanceLabel = balance === null
    ? '…'
    : balance.error !== undefined
      ? '余额不可用'
      : mixedCurrencies === true
        ? `${balance.balances.length} 币种`
        : total === undefined || currency === undefined
          ? '--'
          : `${formatAmount(total)} ${currency}`
  const tokenLabel = tokens?.ok === true
    ? `${formatTokens(tokens.totalTokens)} tok`
    : undefined

  const refresh = (): void => {
    refreshBalance()
    refreshTokens()
  }

  const dotClass = balance !== null && balance.error !== undefined
    ? css.dotError
    : balance?.available === true
      ? css.dotOk
      : css.dot

  const detailsId = 'ambient-balance-details'
  const announcement = tokenLabel === undefined ? balanceLabel : `${balanceLabel}，${tokenLabel}`

  return (
    <div className={css.balanceWidget} style={glassStyle} ref={rootRef} data-testid="ambient-widget">
      {/* The chip is interactive, so the live region has to live OUTSIDE it:
          `role="status"` on an ancestor of a button is invalid and made screen
          readers announce the button's whole label on every poll. */}
      <span className={css.srOnly} role="status" aria-live="polite">{announcement}</span>
      <button
        type="button"
        className={css.balanceCard}
        onClick={() => { setOpen((v) => !v); refresh() }}
        title="DeepSeek 账户余额 / 会话 token 用量"
        aria-expanded={open}
        aria-controls={detailsId}
        data-testid="ambient-balance"
      >
        <span className={dotClass} aria-hidden="true" />
        <span className={css.balanceText}>{balanceLabel}</span>
        {tokenLabel !== undefined && (
          <>
            <span className={css.sep} aria-hidden="true" />
            <span className={css.tokenText}>{tokenLabel}</span>
          </>
        )}
      </button>
      {open && balance !== null && (
        <div className={css.balanceDetails} id={detailsId} role="group" aria-label="余额明细">
          {balance.error !== undefined && (
            <span className={css.detailRow}>
              <span>状态</span>
              <span className={css.rowRight}>{balance.error}</span>
            </span>
          )}
          {balance.balances.map((b) => (
            <span key={b.currency} className={css.detailRow}>
              <span>{b.currency}</span>
              <span className={css.rowRight}>
                <span title="授予余额">{formatAmount(Number(b.granted_balance))}</span>
                <span>+</span>
                <span title="充值余额">{formatAmount(Number(b.topped_up_balance))}</span>
              </span>
            </span>
          ))}
          {tokens?.ok === true && tokens.totalTokens !== undefined && (
            <span className={css.detailRow}>
              <span>会话 tokens</span>
              <span className={css.rowRight}>
                <span>{formatTokens(tokens.totalTokens)}</span>
                <span className={css.dim}>(surface {formatTokens(tokens.surfaceTokens)})</span>
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Re-exported so the settings row can describe the same values it edits. */
export type { AmbientSettings }
