/**
 * The pixel-art agent trail: a 30x8 dot-matrix strip in the composer dock
 * band (`conversation.composer.dock`). It watches the live conversation
 * snapshot and maps agent steps to flowing pixels:
 *
 * - think  -> #00ff88  (reasoning blocks)
 * - tool   -> #ff8800  (running tool calls / tool-call blocks)
 * - output -> #4488ff  (text blocks)
 *
 * Pixels enter at the right edge and scroll left, fading over their lifetime.
 * The scroll rate follows the `speed` setting (1 = slow ... 10 = fast).
 *
 * @module dsh-ambient-ui/TrailAnimation
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
export type TrailAnimationProps = PropsRuntime<'conversation.input.dock'>;
/** The agent-step kinds the trail renders. */
export type TrailKind = 'think' | 'tool' | 'output' | 'idle';
/** Step-type -> pixel color mapping (per the dsh-ambient-ui spec). */
export declare const TRAIL_COLORS: Record<TrailKind, string>;
/** Grid geometry: 30 columns x 8 rows, 8px cells. */
export declare const TRAIL_COLS = 30;
export declare const TRAIL_ROWS = 8;
export declare const TRAIL_CELL_PX = 8;
/** One animated pixel. */
export interface TrailPixel {
    id: number;
    kind: TrailKind;
    x: number;
    y: number;
    life: number;
}
/**
 * The pixel trail strip.
 * @param props - the composed composer-dock entry props.
 */
export declare function TrailAnimation(props: TrailAnimationProps): React.ReactElement | null;
//# sourceMappingURL=TrailAnimation.d.ts.map