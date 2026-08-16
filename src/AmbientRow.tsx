/**
 * The Ambient UI settings row, mounted in the Settings panel's General
 * section (settings.general.item). Reads and writes the plugin config through
 * the Host route (GET/PUT /api/ambient/config), which works for third-party
 * namespaces the DSH wire settings allowlist does not expose.
 *
 * @module dsh-ambient-ui/AmbientRow
 */

import { useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { useAmbientConfig } from './client/useAmbientConfig.ts'
import css from './styles.module.css'

export type AmbientRowProps = PropsRuntime<'settings.general.item'>

/** Slider field that shows a live draft while dragging and commits on release. */
function SliderField(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onCommit: (value: number) => void
}): React.ReactElement {
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? props.value
  const commit = (): void => {
    if (draft === null) return
    props.onCommit(draft)
    setDraft(null)
  }
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>
        <span>{props.label}</span>
        <span className={css.fieldValue}>{props.format !== undefined ? props.format(shown) : String(shown)}</span>
      </span>
      <input
        type="range"
        className={css.slider}
        min={props.min}
        max={props.max}
        step={props.step}
        value={shown}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  )
}

/** Toggle row. */
function ToggleField(props: {
  label: string
  checked: boolean
  onToggle: (checked: boolean) => void
}): React.ReactElement {
  return (
    <label className={css.field}>
      <span className={css.fieldLabel}>{props.label}</span>
      <input
        type="checkbox"
        className={css.toggle}
        checked={props.checked}
        onChange={(event) => props.onToggle(event.target.checked)}
      />
    </label>
  )
}

/**
 * The Ambient UI preference row in the Settings panel.
 * @param props - the composed settings-row entry props.
 */
export function AmbientRow(_props: AmbientRowProps): React.ReactElement {
  const { value, set } = useAmbientConfig()

  const commit = (field: Parameters<typeof set>[0], next: unknown): void => {
    set(field, next).then(() => {
      console.info('[dsh-ambient-ui] saved', field, next)
    }, (error) => {
      console.error('[dsh-ambient-ui] save failed', field, next, error)
    })
  }

  return (
    <div className={css.settingsRow} data-testid="ambient-settings-row">
      <div className={css.settingsHeader}>
        <div className={css.settingsTitle}>Ambient UI</div>
        <div className={css.settingsDesc}>毛玻璃余额悬浮窗与像素轨迹动画的外观设置</div>
      </div>
      <div className={css.settingsFields}>
        <SliderField
          label="透明度"
          value={value.opacity}
          min={0.3}
          max={1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onCommit={(v) => commit('opacity', v)}
        />
        <SliderField
          label="毛玻璃模糊"
          value={value.blur}
          min={0}
          max={30}
          step={1}
          format={(v) => `${v}px`}
          onCommit={(v) => commit('blur', v)}
        />
        <SliderField
          label="轨迹速度"
          value={value.speed}
          min={1}
          max={10}
          step={1}
          format={(v) => `${v}`}
          onCommit={(v) => commit('speed', v)}
        />
        <ToggleField
          label="显示余额悬浮窗"
          checked={value.showBalance}
          onToggle={(v) => commit('showBalance', v)}
        />
        <ToggleField
          label="显示像素轨迹"
          checked={value.showTrail}
          onToggle={(v) => commit('showTrail', v)}
        />
        <ToggleField
          label="弹窗毛玻璃（设置/菜单/提示全局生效）"
          checked={value.glass}
          onToggle={(v) => commit('glass', v)}
        />
      </div>
    </div>
  )
}
