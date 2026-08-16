# dsh-ambient-ui

Ambient UI for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web:

- **API 余额悬浮窗** — a glassmorphism chip in the composer tool row (level with the input box) showing the DeepSeek account balance and the current session's token pressure. Opacity and blur are adjustable from the Harness Settings panel.
- **Agent 轨迹像素动画** — a 30×8 dot-matrix strip above the input box that maps agent steps to flowing pixels: `think → #00ff88`, `tool → #ff8800`, `output → #4488ff`.

Both features are pure-CSS (CSS Modules), follow the Harness light/dark theme (via `--dsw-alias-*` tokens), and have zero runtime dependencies beyond the official Harness packages + React.

> 插件 ID：`dsh-ambient-ui`，版本 `1.0.1`

## 安装

### 从 npm（推荐）

```sh
# Web 端
dsh plugin --profile web add dsh-ambient-ui
# 桌面端
dsh plugin --profile desktop add dsh-ambient-ui
```

### 从 Git

```sh
dsh plugin --profile web add https://github.com/Q04291/dsh-ambient-ui
```

### 从本地目录（开发）

```sh
pnpm install
pnpm run build
dsh plugin --profile web add link:<绝对路径>/dsh-ambient-ui
```

安装后重启 `dsh web`（或刷新页面），在 **设置 → 插件** 里确认 `dsh-ambient-ui` 已启用。

## 设置

打开左下角 **设置（齿轮）** → 左侧列表选 **General** → 滚动到 **Ambient UI** 一行
（滑块 + 开关，改动即时生效）。对应设置项如下：

| 字段        | 范围      | 默认 | 说明                                                       |
| ----------- | --------- | ---- | ---------------------------------------------------------- |
| opacity     | 0.3 – 1.0 | 0.85 | 悬浮窗整体透明度                                           |
| blur        | 0 – 30 px | 12   | 毛玻璃模糊强度（`backdrop-filter: blur() saturate(160%)`） |
| speed       | 1 – 10    | 5    | 像素轨迹滚动速度                                           |
| showBalance | 开关      | on   | 显示余额悬浮窗                                             |
| showTrail   | 开关      | on   | 显示像素轨迹                                               |
| glass       | 开关      | on   | 全局弹窗毛玻璃（设置面板/Modal/菜单/提示）                 |

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc -b
pnpm test            # vitest（tests/ 目录）
pnpm run build       # tsc -b && tsdown（生成 lib/ 与 lib/client.js）
```

主要结构：

```
src/index.ts            # Host 半区：设置项 + /api/ambient/* 路由
src/config.ts           # 共享配置类型与默认值
src/service.ts          # 余额查询（credentials + 官方 Get User Balance）+ token-meter 读取
src/routes.ts           # /api/ambient/config, /balance, /tokens, /debug
src/client/index.ts     # Client 半区：注册 shell.overlay 与 composer.dock 插槽
src/BalanceWidget.tsx   # 输入框工具条上的毛玻璃余额/用量悬浮窗
src/TrailAnimation.tsx  # 30×8 像素轨迹动画
src/styles.module.css   # 纯 CSS 样式（CSS Modules，跟随主题）
tests/                  # vitest 测试（配置钳制 / 路由唯一性 / 配置读写）
cordis.patch.yml        # bundle patch（dsh plugin 安装用）
shared/                 # 官方 DSH client bundle 构建预设（MIT）
```

## 说明

- DeepSeek API 不暴露"剩余 Token 数"；本插件显示**账户余额**（官方 Get User Balance）和**当前会话 token 用量**（`token-meter` 服务）。
- 若 profile 里没有 `token-meter`，token 显示为"不可用"，余额功能不受影响。
- 若没有配置 `DEEPSEEK_API_KEY`，悬浮窗显示"余额不可用"，配置后自动恢复。
- 全局弹窗毛玻璃（`glass` 开关）通过覆盖 DSH 的 mask token 实现，作用于设置面板、Modal、菜单、提示，并跟随主题明暗自动重算。

## 常见问题

- 余额/Token 悬浮窗停靠在**输入框同一行的工具条**（`conversation.input.right`），与输入框持平；像素轨迹位于输入框上方（`conversation.input.dock`），输入框沉底。
- 设置面板不显示 Ambient UI 行：先重启 `dsh web`，再看终端 `[dsh-ambient-ui]` 日志。
- 余额显示"不可用"：检查 `DEEPSEEK_API_KEY` 是否已配置；token 显示"不可用"：检查 profile 中是否有 `token-meter` 服务。

## License

MIT. `shared/` 构建预设派生自 DeepSeek Harness 官方仓库（MIT）。
