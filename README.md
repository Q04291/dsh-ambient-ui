# dsh-ambient-ui

> Ambient UI components for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web — 为 DSH 界面添加毛玻璃余额悬浮窗与 Agent 轨迹像素动画。

| 毛玻璃余额悬浮窗                                 | Agent 轨迹像素动画                              |
| ------------------------------------------------ | ----------------------------------------------- |
| ![毛玻璃余额悬浮窗](./assets/balance-widget.png) | ![Agent 轨迹像素动画](./assets/agent-trail.png) |

## 功能一览

| 功能               | 位置                             | 说明                                                         |
| ------------------ | -------------------------------- | ------------------------------------------------------------ |
| API 余额悬浮窗     | 输入框右侧工具条（与输入框持平） | 毛玻璃卡片，实时显示账户余额 + 当前会话 token 用量           |
| Agent 轨迹像素动画 | 输入框上方（30×8 点阵条）        | 将 Agent 执行步骤映射为流动像素：`think → #00ff88`、`tool → #ff8800`、`output → #4488ff` |

两个功能均为纯 CSS 实现（CSS Modules），跟随 DSH 明暗主题（通过 `--dsw-alias-*` token），无额外运行时依赖（仅需官方 Harness 包 + React）。

> 插件 ID：`dsh-ambient-ui` · 当前版本：`1.0.1`

## 环境要求

- DSH ≥ 0.1.0-rc.6（当前为 rc 阶段，随 DSH 升级可能需同步更新插件）
- Node.js ≥ 22.19
- 余额提供方 API Key（默认读取 `DEEPSEEK_API_KEY`；可通过插件配置 `baseUrl` / `apiKeyEnv` 接入兼容端点）

## 安装

根据你的使用场景选择一种方式：

### 从 npm 安装（推荐）

```sh
# Web 端
dsh plugin --profile web add dsh-ambient-ui

# 桌面端
dsh plugin --profile desktop add dsh-ambient-ui
```

### 从 Git 安装（获取最新开发版）

```sh
dsh plugin --profile web add https://github.com/Q04291/dsh-ambient-ui
```

### 从本地目录安装（开发调试）

```sh
pnpm install
pnpm run build
dsh plugin --profile web add link:<绝对路径>/dsh-ambient-ui
```

安装完成后，重启 `dsh web`（或刷新页面），进入 **设置 → 插件** 确认 `dsh-ambient-ui` 已启用。

## 配置

进入 **设置（⚙️）→ General → Ambient UI**，所有改动即时生效：

| 字段        | 类型 | 范围      | 默认值 | 说明                                                 |
| ----------- | ---- | --------- | ------ | ---------------------------------------------------- |
| opacity     | 滑块 | 0.3 – 1.0 | 0.85   | 悬浮窗整体透明度                                     |
| blur        | 滑块 | 0 – 30 px | 12     | 毛玻璃模糊强度                                       |
| speed       | 滑块 | 1 – 10    | 5      | 像素轨迹滚动速度                                     |
| showBalance | 开关 | —         | on     | 是否显示余额悬浮窗                                   |
| showTrail   | 开关 | —         | on     | 是否显示像素轨迹                                     |
| glass       | 开关 | —         | on     | 全局弹窗毛玻璃效果（设置面板 / Modal / 菜单 / 提示） |

## 常见问题

### 余额显示"不可用"

- 未配置 API Key：默认读取 `DEEPSEEK_API_KEY`，配置后悬浮窗会自动恢复显示。
- 使用了 OpenAI、Moonshot/Kimi 等提供方：其原生余额接口与 DeepSeek 格式不同，无法直接查询，属正常现象；token 用量与像素轨迹动画不受影响。
- 若你的网关/中转站提供 DeepSeek 兼容的 `/user/balance` 接口，可通过插件配置 `baseUrl` / `apiKeyEnv` 接入。

### Token 显示"不可用"

当前 profile 中未包含 `token-meter` 服务。该功能不影响余额显示。

### 设置面板中看不到 Ambient UI 配置行

1. 重启 `dsh web`
2. 检查终端输出中是否有 `[dsh-ambient-ui]` 相关日志

### 悬浮窗 / 像素轨迹的位置不对

- 余额悬浮窗停靠在输入框右侧工具条（`conversation.input.right` 插槽）
- 像素轨迹位于输入框上方（`conversation.input.dock` 插槽）

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc -b
pnpm test            # vitest（tests/ 目录）
pnpm run build       # tsc -b && tsdown → 输出 lib/ 与 lib/client.js
```

### 项目结构

```
src/
├── index.ts                  # Host 侧：设置项注册 + /api/ambient/* 路由
├── config.ts                 # 共享配置类型与默认值
├── service.ts                # 余额查询（credentials + Get User Balance）+ token-meter 读取
├── routes.ts                 # API 路由：/config, /balance, /tokens, /debug
├── AmbientRow.tsx            # 设置面板中的 Ambient UI 配置行
├── BalanceWidget.tsx         # 毛玻璃余额 / 用量悬浮窗组件
├── TrailAnimation.tsx        # 30×8 像素轨迹动画组件
├── styles.module.css         # 纯 CSS 样式（CSS Modules，跟随主题）
└── client/
    ├── index.ts              # Client 侧：注册 shell.overlay 与 composer.dock 插槽
    ├── ambientConfigStore.ts # 配置共享 store
    ├── glass.ts              # 全局弹窗毛玻璃（mask token 覆盖）
    └── useAmbientConfig.ts   # 配置消费 Hook
tests/                        # vitest 测试
shared/                       # 官方 DSH client bundle 构建预设（MIT）
cordis.patch.yml              # bundle patch（dsh plugin 安装用）
```

## License

MIT. `shared/` 目录下的构建预设派生自 [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)（MIT）。
