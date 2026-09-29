# dsh-ambient-ui

> Ambient UI components for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web — 为 DSH 界面添加毛玻璃余额悬浮窗与 Agent 轨迹像素动画。

| 毛玻璃余额悬浮窗                                 | Agent 轨迹像素动画                              |
| ------------------------------------------------ | ----------------------------------------------- |
| <img width="1920" height="991" alt="balance-widget" src="https://github.com/user-attachments/assets/1a010c67-d758-491f-8ce8-94878a93567d" /> |<img width="981" height="492" alt="image" src="https://github.com/user-attachments/assets/b3a1d950-2a73-4174-aab0-194c60b674dd" />

## 功能一览

| 功能               | 位置                             | 说明                                                         |
| ------------------ | -------------------------------- | ------------------------------------------------------------ |
| API 余额悬浮窗     | 输入框右侧工具条（与输入框持平） | 毛玻璃卡片，实时显示账户余额 + 当前会话 token 用量           |
| Agent 轨迹像素动画 | 输入框上方（30×8 点阵条）        | 将 Agent 执行步骤映射为流动像素：`think → #00ff88`、`tool → #ff8800`、`output → #4488ff` |

两个功能均为纯 CSS 实现（CSS Modules），跟随 DSH 明暗主题（通过 `--dsw-alias-*` token），无额外运行时依赖（仅需官方 Harness 包 + React）。

> 插件 ID：`dsh-ambient-ui` · 当前版本：`1.3.0`（已适配 DSH 0.2.0-rc.2；仍用 DSH 0.1.2-rc.1 运行时请留在 `1.2.0`）

## 环境要求

- DSH `0.2.0-rc.2`。`0.2.0` 把设置模型换成“插件自己的 `Config`”：Host 侧用 schemastery
  `.volatile()` 声明可即时编辑的字段，表单按 profile 条目 id 下发，浏览器侧通过
  `ctx.configForms.get(entryId)` 读写；`ctx.settingsScope` 与
  `ctx.settings.installSection` 均已移除，旧版插件必须按本次适配更新。
  仍跑在 DSH `0.1.2-rc.1` 上的运行时请安装本插件的 `1.2.0`，不要升级到 `1.3.0`。
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
# Web 端
dsh plugin --profile web add https://github.com/Q04291/dsh-ambient-ui

# 桌面端
dsh plugin --profile desktop add https://github.com/Q04291/dsh-ambient-ui
```

> 仓库已提交构建产物（`lib/`），从 Git 安装**不需要**执行构建脚本，pnpm 11+ 也不会要求 `allowBuilds` 放行。
> 如果仍报 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`（提示在 profile 的 `pnpm-workspace.yaml` 里写 `allowBuilds`），说明装到的是仍带 `prepare` 脚本的旧提交（`v1.2.0` 及更早）：改用上面的 npm 安装，或拉取最新提交后重装。
>
> 版本与运行时对应关系：DSH `0.2.0-rc.2` → 插件 `1.3.0+`；DSH `0.1.2-rc.1` → 插件 `1.2.0`（peer 范围不含 0.2，装错版本会被 DSH 的兼容性检查拒绝）。

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
2. 配置行依赖 profile 里的 `ambient` 条目被 `@deepseek-ai/dsh-settings` 描述给浏览器
   （`dsh-base` 组合包已包含该服务）；缺少它时，行会回退到默认值且编辑不生效。

### 配置存在哪里 / 改动如何生效

- 六个界面字段是插件 `Config` 里的 volatile 字段：表单写入当前 profile 的 Cordis patch
  （`~/.dsh/profiles/<profile>/cordis.patch.yml` 的 `ambient` 条目），运行中的引用随之更新，
  改动即时生效，无需轮询，也不用重启。
- `apiKeyEnv` / `baseUrl` / `refreshIntervalSeconds` 是普通字段，属于组合层配置：直接写在
  Cordis 配置里，不出现在设置表单中。
- 若以非 loopback 方式远程访问 GUI，表单可能处于 `memory` 模式（改动仅本次会话内生效），属 DSH 设置传输的既定行为。

### 设置 → 插件 页里的 `ambient` 条目

设置表单以 profile 条目 id 标识插件，本插件的条目 id 就是 `ambient`（见 `cordis.patch.yml`）。
配置入口在 **General → Ambient UI**；`apply` 已用 `ctx.settings.configure({ auto: false })`
关掉按 schema 自动生成的页面，因此不会出现第二个入口。

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
├── index.ts                  # Host 侧：声明 ambient Config（设置表单 schema）+ /api/ambient/* 路由
├── config.ts                 # 共享配置类型、默认值与命名空间常量
├── service.ts                # 余额查询（credentials + Get User Balance）+ token-meter 读取
├── routes.ts                 # API 路由：/balance, /balance/refresh, /tokens
├── AmbientRow.tsx            # 设置面板中的 Ambient UI 配置行
├── BalanceWidget.tsx         # 毛玻璃余额 / 用量悬浮窗组件
├── TrailAnimation.tsx        # 30×8 像素轨迹动画组件
├── trailFeed.ts              # 轨迹数据映射的纯函数（可单测）
├── styles.module.css         # 纯 CSS 样式（CSS Modules，跟随主题）
└── client/
    ├── index.ts              # Client 侧：取 ambient 表单（configForms）+ 注册三个插槽
    ├── ambientConfigStore.ts # 配置共享 store（由原生设置表单驱动，无轮询）
    ├── feed.ts               # rc.1 会话标准 props 的轻量类型声明
    ├── glass.ts              # 全局弹窗毛玻璃（mask token 覆盖）
    └── useAmbientConfig.ts   # 配置消费 Hook
tests/                        # vitest 测试（config / store / client / trailFeed / service / routes）
shared/                       # 官方 DSH client bundle 构建预设（MIT）
cordis.patch.yml              # bundle patch（dsh plugin 安装用）
```

## License

MIT. `shared/` 目录下的构建预设派生自 [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)（MIT）。
