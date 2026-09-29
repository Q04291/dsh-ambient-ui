/**
 * The Ambient UI settings row, mounted in the Settings panel's General
 * section (settings.general.item). Reads and writes the plugin configuration
 * through the shared ambient config store, which is fed by the entry's form
 * from `ctx.configForms` — the `ambient` Config schema the Host declares — so
 * edits persist into the profile's Cordis patch through the DSH settings
 * transport.
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