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

import { useCallback, useEffect, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { AmbientSettings } from './config.ts'
import { useAmbientConfig } from './client/useAmbientConfig.ts'
import css from './styles.module.css'

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
 * The bottom-right balance/token chip.
 * @param props - the composed overlay entry props.
 */
export function BalanceWidget(props: BalanceWidgetProps): React.ReactElement | null {
  const { value } = useAmbientConfig()
  const sessionId = props.sessionId
  const [balance, setBalance] = useState<BalanceView | null>(null)
  const [tokens, setTokens] = useState<TokenView | null>(null)
  const [open, setOpen] = useState(false)

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
  }, [refreshBalance])

  useEffect(() => {
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
  }, [refreshTokens])

  if (value.showBalance === false) return null

  const opacity = value.opacity
  const blur = value.blur
  const glassStyle: React.CSSProperties = {
    opacity,
    backdropFilter: `blur(${blur}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
  }

  const total = balance?.total
  const currency = balance?.currency ?? balance?.balances[0]?.currency
  const balanceLabel = balance === null
    ? '…'
    : balance.error !== undefined
      ? '余额不可用'
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

  return (
    <div className={css.balanceWidget} style={glassStyle} role="status" aria-live="polite">
      <button
        type="button"
        className={css.balanceCard}
        onClick={() => { setOpen((v) => !v); refresh() }}
        title="DeepSeek 账户余额 / 会话 token 用量"
        aria-expanded={open}
        data-testid="ambient-balance"
      >
        <span className={balance?.available === true ? css.dotOk : css.dot} aria-hidden="true" />
        <span className={css.balanceText}>{balanceLabel}</span>
        {tokenLabel !== undefined && (
          <>
            <span className={css.sep} aria-hidden="true" />
            <span className={css.tokenText}>{tokenLabel}</span>
          </>
        )}
      </button>
      {open && balance !== null && (
        <div className={css.balanceDetails}>
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

