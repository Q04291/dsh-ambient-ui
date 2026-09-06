/**
 * The Ambient UI settings row, mounted in the Settings panel's General
 * section (settings.general.item). Reads and writes the plugin config through
 * the Host route (GET/PUT /api/ambient/config), which persists through the
 * in-process `ctx.settings` seam to the `ambient:` section of settings.yaml.
 * (The `ambient` namespace is also described to the browser by the settings
 * controller, so any native settings surface sees it too.)
 *
 * @module dsh-ambient-ui/AmbientRow
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
export type AmbientRowProps = PropsRuntime<'settings.general.item'>;
/**
 * The Ambient UI preference row in the Settings panel.
 * @param props - the composed settings-row entry props.
 */
export declare function AmbientRow(_props: AmbientRowProps): React.ReactElement;
//# sourceMappingURL=AmbientRow.d.ts.map