import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Ambient UI settings row, mounted in the Settings panel's General
 * section (settings.general.item). Reads and writes the plugin config through
 * the Host route (GET/PUT /api/ambient/config), which works for third-party
 * namespaces the DSH wire settings allowlist does not expose.
 *
 * @module dsh-ambient-ui/AmbientRow
 */
import { useState } from 'react';
import { useAmbientConfig } from "./client/useAmbientConfig.js";
import css from './styles.module.css';
/** Slider field that shows a live draft while dragging and commits on release. */
function SliderField(props) {
    const [draft, setDraft] = useState(null);
    const shown = draft ?? props.value;
    const commit = () => {
        if (draft === null)
            return;
        props.onCommit(draft);
        setDraft(null);
    };
    return (_jsxs("label", { className: css.field, children: [_jsxs("span", { className: css.fieldLabel, children: [_jsx("span", { children: props.label }), _jsx("span", { className: css.fieldValue, children: props.format !== undefined ? props.format(shown) : String(shown) })] }), _jsx("input", { type: "range", className: css.slider, min: props.min, max: props.max, step: props.step, value: shown, onChange: (event) => setDraft(Number(event.target.value)), onPointerUp: commit, onKeyUp: commit, onBlur: commit })] }));
}
/** Toggle row. */
function ToggleField(props) {
    return (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: props.label }), _jsx("input", { type: "checkbox", className: css.toggle, checked: props.checked, onChange: (event) => props.onToggle(event.target.checked) })] }));
}
/**
 * The Ambient UI preference row in the Settings panel.
 * @param props - the composed settings-row entry props.
 */
export function AmbientRow(_props) {
    const { value, set } = useAmbientConfig();
    const commit = (field, next) => {
        set(field, next).then(() => {
            console.info('[dsh-ambient-ui] saved', field, next);
        }, (error) => {
            console.error('[dsh-ambient-ui] save failed', field, next, error);
        });
    };
    return (_jsxs("div", { className: css.settingsRow, "data-testid": "ambient-settings-row", children: [_jsxs("div", { className: css.settingsHeader, children: [_jsx("div", { className: css.settingsTitle, children: "Ambient UI" }), _jsx("div", { className: css.settingsDesc, children: "\u6BDB\u73BB\u7483\u4F59\u989D\u60AC\u6D6E\u7A97\u4E0E\u50CF\u7D20\u8F68\u8FF9\u52A8\u753B\u7684\u5916\u89C2\u8BBE\u7F6E" })] }), _jsxs("div", { className: css.settingsFields, children: [_jsx(SliderField, { label: "\u900F\u660E\u5EA6", value: value.opacity, min: 0.3, max: 1, step: 0.05, format: (v) => v.toFixed(2), onCommit: (v) => commit('opacity', v) }), _jsx(SliderField, { label: "\u6BDB\u73BB\u7483\u6A21\u7CCA", value: value.blur, min: 0, max: 30, step: 1, format: (v) => `${v}px`, onCommit: (v) => commit('blur', v) }), _jsx(SliderField, { label: "\u8F68\u8FF9\u901F\u5EA6", value: value.speed, min: 1, max: 10, step: 1, format: (v) => `${v}`, onCommit: (v) => commit('speed', v) }), _jsx(ToggleField, { label: "\u663E\u793A\u4F59\u989D\u60AC\u6D6E\u7A97", checked: value.showBalance, onToggle: (v) => commit('showBalance', v) }), _jsx(ToggleField, { label: "\u663E\u793A\u50CF\u7D20\u8F68\u8FF9", checked: value.showTrail, onToggle: (v) => commit('showTrail', v) }), _jsx(ToggleField, { label: "\u5F39\u7A97\u6BDB\u73BB\u7483\uFF08\u8BBE\u7F6E/\u83DC\u5355/\u63D0\u793A\u5168\u5C40\u751F\u6548\uFF09", checked: value.glass, onToggle: (v) => commit('glass', v) })] })] }));
}
