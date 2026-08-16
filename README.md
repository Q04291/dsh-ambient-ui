# dsh-ambient-ui

Ambient UI for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web:

- **API 余额悬浮窗** — a glassmorphism chip in the composer tool row (level with the input box) showing the DeepSeek account balance and the current session's token pressure. Opacity and blur are adjustable from the Harness Settings panel.
- **Agent 轨迹像素动画** — a 30×8 dot-matrix strip above the input box that maps agent steps to flowing pixels: `think → #00ff88`, `tool → #ff8800`, `output → #4488ff`.

Both features are pure-CSS (CSS Modules), follow the Harness light/dark theme (via `--dsw-alias-*` tokens), and have zero runtime dependencies beyond the official Harness packages + React.

> 插件 ID：`dsh-ambient-ui`，版本 `1.0.0`

## 安装

### 从本地目录（开发）

```sh
# 构建
pnpm install
pnpm run build

# 装入 web profile
dsh plugin --profile web add link:<绝对路径>/dsh-ambient-ui
```

### 从 Git

```sh
dsh plugin --profile web add https://github.com/Q04291/dsh-ambient-ui
```

### 从 npm（发布后）

```sh
dsh plugin add dsh-ambient-ui
```

安装后重启 `dsh web`（或刷新页面），在 **设置 → 插件** 里确认 `dsh-ambient-ui` 已启用。

## 设置

打开左下角 **设置（齿轮）** → 左侧列表选 **General** → 滚动到 **Ambient UI** 一行
（滑块 + 开关，改动即时生效）。对应设置项如下：

| 字段 | 范围 | 默认 | 说明 |
| --- | --- | --- | --- |
| opacity | 0.3 – 1.0 | 0.85 | 悬浮窗整体透明度 |
| blur | 0 – 30 px | 12 | 毛玻璃模糊强度（`backdrop-filter: blur() saturate(160%)`） |
| speed | 1 – 10 | 5 | 像素轨迹滚动速度 |
| showBalance | 开关 | on | 显示余额悬浮窗 |
| showTrail | 开关 | on | 显示像素轨迹 |
| glass | 开关 | on | 全局弹窗毛玻璃（设置面板/Modal/菜单/提示） |

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc -b
pnpm test            # vitest（配置钳制 / 路由唯一性 / 配置读写）
pnpm run build       # tsc -b && tsdown（生成 lib/ 与 lib/client.js）
```

结构：

```
src/index.ts            # Host 半区：设置项 + /api/ambient/* 路由
src/config.ts           # 共享配置类型与默认值
src/service.ts          # 余额查询（credentials + 官方 Get User Balance）+ token-meter 读取
src/routes.ts           # /api/ambient/config, /balance, /tokens, /debug
src/client/index.ts     # Client 半区：注册 shell.overlay 与 composer.dock 插槽
src/BalanceWidget.tsx   # 右下角毛玻璃余额/用量悬浮窗
src/TrailAnimation.tsx  # 30×8 像素轨迹动画
src/styles.module.css   # 纯 CSS 样式（CSS Modules，跟随主题）
cordis.patch.yml        # bundle patch（dsh plugin 安装用）
shared/                 # 官方 DSH client bundle 构建预设（MIT）
```

## 工作原理（真实 DSH API）

| 你的需求 | 真实实现 |
| --- | --- |
| `@deepseek-harness/core` / `definePlugin` | `@deepseek-ai/cordis` 插件：`export const name / inject / apply(ctx)` |
| `useHarness` / `usePluginState` | 官方插槽标准 kit：`useSession` / `useSessions` + 自建 `useAmbientConfig()` 共享 store |
| `client.api.get('/v1/usage')` | Host 半区路由 `GET /api/ambient/balance`、`GET /api/ambient/tokens?session=…`（同源 JSON，凭据不出 Host） |
| `llm:call` 事件 | 余额每 30s 轮询 + visibilitychange 刷新；轨迹直接订阅会话快照（`useSession`）差分出 think/tool/output |
| `usePluginConfig` 配置 | 自建路由 `GET/PUT /api/ambient/config`（见下方"配置读写原理"），客户端共享 store 消费 |

## 配置读写原理（重要）

DSH 的 web 端 settings API（`api.settings`）对第三方命名空间有**写死的白名单限制**
（`dsh-host-apiproxy` 里的 `WEB_SETTINGS_NAMESPACES`，官方注明"插件自行暴露配置"是 deferred work）：
浏览器 describe 不到、mutate 会直接拒绝（`settings-not-exposed`）。

因此插件**不走 settings API**，而是用自建的 Host 路由 `GET/PUT /api/ambient/config` 读写配置：
- Host 半区在进程内直接调用 `ctx.settings` seam（不受白名单限制），配置持久化到 `~/.dsh/settings.yaml` 的 `ambient:` 段；
- 客户端设置行/悬浮窗/轨迹统一走这个路由，读轮询 30s + 可见性刷新，写即改即存。

这也意味着：设置面板的 **Ambient UI 行**是插件自渲染的（`settings.general.item` 插槽），
Host 侧仍调用 `installSettingsSection` 注册命名空间，等官方放开插件暴露后即可无缝切换到原生方式。

## 常见问题


- 配置通过自建路由 `GET/PUT /api/ambient/config` 读写，持久化到 `~/.dsh/settings.yaml` 的 `ambient:` 段；若设置行不显示控件，先看终端 `[dsh-ambient-ui]` 日志与 `GET /api/ambient/config` 是否返回 JSON。
- 余额/Token 悬浮窗停靠在**输入框同一行的工具条**（conversation.input.right），与输入框持平；像素轨迹位于输入框上方（conversation.input.dock），输入框沉底。
- **弹窗毛玻璃（glass）**：通过覆盖 `--dsw-mask-blur` / `--dsw-alias-bg-mask-1` 变量 + 稳定选择器
  （`[role="dialog"][aria-modal="true"]` / `[role="menu"]` / `[role="tooltip"]`）给设置面板、Modal、菜单、提示统一套用
  透明度与模糊，跟随主题（data-theme 变化自动重算）。
- **`link:` 安装 + 插件目录自带 node_modules 会导致依赖实例分裂**（settings 注册不到应用实例）。若插件目录的 `node_modules/@deepseek-ai` 是普通目录而非 junction，请执行：
  `Remove-Item -Recurse -Force <插件目录>/node_modules/@deepseek-ai` 然后
  `New-Item -ItemType Junction -Path <插件目录>/node_modules/@deepseek-ai -Target C:/Users/<你>/.dsh/profiles/node_modules/@deepseek-ai`

## 说明与取舍


- DeepSeek API 不暴露"剩余 Token 数"；本插件显示**账户余额（官方 Get User Balance）**和**当前会话 token 用量**（`token-meter` 服务）。
- 组件放在 `src/`（而非 `src/client/`）以满足你指定的文件路径；client 入口为 `src/client/index.ts`。
- 样式文件为 `src/styles.module.css`（CSS Modules）。这是 DSH 官方 client bundle 管线（tsdown + lightningcss）唯一支持的 CSS 形式——内容仍是纯 CSS，无 CSS-in-JS。
- 若 profile 里没有 `token-meter`，token 显示为"不可用"，余额功能不受影响。
- 若没有配置 `DEEPSEEK_API_KEY`，悬浮窗显示"余额不可用"，配置后自动恢复。

## License

MIT. `shared/` 构建预设派生自 DeepSeek Harness 官方仓库（MIT）。
