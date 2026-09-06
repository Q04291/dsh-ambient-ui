/**
 * Ambient's structural view of the DSH 0.1.2-rc.1 client standard kit.
 *
 * At 0.1.2-rc.1 the client slot framework (ui-slots / ui-renderer) hands every
 * session-scope slot entry a standard props kit whose members are contributed
 * by other client modules at runtime:
 *
 * - `sessionId` — contributed by the ui-session scope adapter (its official
 *   merge is part of this compilation via the imported domain packages).
 * - `useChat` — contributed by the Chat target (ui-chat) through
 *   `ctx.uiSession.provide(...)`; selecting the target's `ChatSnapshot`
 *   yields the `legacy` projection with `partial.blocks` (the in-progress
 *   assistant stream) and `runningCalls` (live tool calls) — the same data
 *   the ambient trail maps to think / tool / output pixels.
 *
 * Ambient only reads these two members, so instead of depending on the full
 * ui-chat type graph this module declares a structural merge that narrows
 * `useChat`'s snapshot to the fields the trail consumes. It must stay the
 * ONLY augmentation of `SessionStandardProps` naming `useChat` in this
 * compilation: importing `@deepseek-ai/dsh-client-ui-chat/client` for types
 * here would conflict with this declaration.
 *
 * @module dsh-ambient-ui/client-feed
 */
export {};
