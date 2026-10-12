# dsh-ambient-ui

> Ambient UI components for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web — 为 DSH 界面添加毛玻璃余额悬浮窗与 Agent 轨迹像素动画。

| 毛玻璃余额悬浮窗                                 | Agent 轨迹像素动画                              |
| ------------------------------------------------ | ----------------------------------------------- |
| <img width="1920" height="991" alt="balance-widget" src="https://github.com/user-attachments/assets/1a010c67-d758-491f-8ce8-94878a93567d" /> |<img width="981" height="492" alt="image" src="https://github.com/user-attachments/assets/b3a1d950-2a73-4174-aab0-194c60b674dd" />

## 功能一览

| 功能               | 位置                             | 说明                                                         |
| ------------------ | -------------------------------- | ------------------------------------------------------------ |
| API 余额悬浮窗     | 输入框右侧工具条（与输入框持平） | 毛玻璃卡片，实时显示账户余额 + 当前会话 token 用量           |
| Agent 轨迹像素动画 | 输入框上方（30×8 点阵条）        | 用一块 canvas 把 Agent 执行步骤映射为流动像素，配色取自 DSH 主题：`think → --dsw-alias-state-success-primary`、`tool → --dsw-alias-state-warn-primary`、`output → --dsw-alias-state-business-primary`、空闲 → `--dsw-alias-label-tertiary` |
| DSH 原生弹窗毛玻璃 | 设置 / 模型选择 / 确认框         | 覆盖 DSH 自己的不透明弹窗底色（`--dsw-alias-bg-layer-2`）与 `none` 遮罩模糊，让原生弹窗与悬浮窗用同一份玻璃底色 |

两个功能都跟随 DSH 明暗主题（读 `body[data-ds-dark-theme]` + `--dsw-alias-*` token），无额外运行时依赖（仅需官方 Harness 包 + React）。毛玻璃由 CSS Modules 与一张注入的全局样式表实现，配方（底色浓度、白色描边、阴影、模糊半径）集中在 `src/glassRecipe.ts`；像素轨迹是一块按设备像素比缩放的 `<canvas>`，由 `src/trailSim.ts` 的纯函数推进。

### 毛玻璃配方

| 要素     | 取值                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| 底色     | 浅色 `hsla(0, 0%, 100%, 5%–42%)`、深色 `hsla(0, 0%, 35%, 5%–42%)`（低浓度才透出背景） |
| 描边     | `1px solid #ffffff2e` 一类的亮色半透明描边，是"玻璃感"的主要来源                 |
| 阴影     | 收紧的柔和投影 + `inset 0 1px 0` 顶边高光，而不是大范围深色阴影                   |
| 模糊     | 纯 `blur(Npx)`，**不叠加 `saturate()`**（与参考实现一致）                         |
| 圆角     | `12px`                                                                            |
| 不支持时 | `backdrop-filter` 不可用则把底色推到 94% 不透，保证文字可读                       |

作用面（三种表面共用同一份底色浓度，不会各自漂移）：

- **DSH 原生弹窗**（`[role="dialog"][aria-modal="true"]`，即设置 / 模型选择 / 确认框）：DSH 用不透明
  的 `--dsw-alias-bg-layer-2` 画面板、遮罩的 `--dsw-mask-blur` 是 `none`，所以插件把面板底色换成玻璃
  底色，并把 `--dsw-mask-blur` 指向 `blur` 滑块——遮罩和弹窗一起变成毛玻璃，而不是只有一层灰。
  圆角仍用 DSH 自己的 `--dsw-radius-panel`（28px），不改原生几何。
- **菜单**（`[data-menu-material]`）不重新上色：DSH 自己就是 `--dsw-menu-surface-fill`（浅色 58% /
  深色 45%）+ `blur(40px)`，已经是参考配方；插件只把模糊交给滑块并补一圈亮边，避免把菜单做得比原生更不透明。
- **遮罩浓度**（`--dsw-alias-bg-mask-1`）保持 DSH 原值不动：`withAlpha()` 是按比例缩放已有的 alpha，
  缩放后浅色主题只剩 0.06（DSH 自己是 0.24），弹窗会浮在没压暗的页面上。

### 像素轨迹

- 一块 240×64 的 canvas，精灵图（发光光晕）在主题变化时烘焙一次，逐帧只做 `drawImage`。
- 时间驱动的小数位移 + `requestAnimationFrame`；`prefers-reduced-motion` 下只画一帧静态点阵。
- 轨迹密度与 `speed` 解耦：像素按"新增了几块内容"生成，单帧最多 6 个，避免突发流量糊成一片。

> 插件 ID：`dsh-ambient-ui` · 当前版本：`1.3.2`（DSH 原生弹窗改用同一份玻璃底色；已适配 DSH 0.2.0-rc.2；仍用 DSH 0.1.2-rc.1 运行时请留在 `1.2.0`）

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

| 字段        | 类型 | 范围      | 默认值 | 说明                                                     |
| ----------- | ---- | --------- | ------ | -------------------------------------------------------- |
| opacity     | 滑块 | 0.3 – 1.0 | 0.85   | 玻璃浓度：映射到底色 5% – 42% 的透明度（不是整体 `opacity`，文字始终清晰） |
| blur        | 滑块 | 0 – 30 px | 12     | 毛玻璃模糊半径（0 = 关闭模糊，底色自动转为接近不透明）    |
| speed       | 滑块 | 1 – 10    | 5      | 像素轨迹滚动速度                                         |
| showBalance | 开关 | —         | on     | 是否显示余额悬浮窗                                       |
| showTrail   | 开关 | —         | on     | 是否显示像素轨迹                                         |
| glass       | 开关 | —         | on     | 全局毛玻璃：原生弹窗（设置 / 模型选择 / 确认框）用同一份玻璃底色，菜单与提示按要求只调模糊 + 描边 |
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
├── TrailAnimation.tsx        # 轨迹 canvas 组件（精灵图 + rAF，无 DOM 逻辑）
├── trailFeed.ts              # 轨迹数据映射的纯函数（可单测）
├── trailSim.ts               # 像素模拟纯函数：生成/位移/寿命/调色（可单测）
├── glassRecipe.ts            # 毛玻璃配方纯函数：浓度/描边/阴影/模糊 + 特性探测
├── styles.module.css         # CSS Modules：布局与主题 token（配方变量由 JS 注入）
└── client/
    ├── index.ts              # Client 侧：取 ambient 表单（configForms）+ 注册三个插槽
    ├── ambientConfigStore.ts # 配置共享 store（由原生设置表单驱动，无轮询）
    ├── feed.ts               # rc.1 会话标准 props 的轻量类型声明
    ├── glass.ts              # 全局毛玻璃：写 body 上的 DSH token + 注入样式表
    ├── theme.ts              # 主题读取（body[data-ds-dark-theme]）与订阅
    └── useAmbientConfig.ts   # 配置消费 Hook
tests/                        # vitest 测试（config / store / client / trailFeed / trailSim / glassRecipe / service / routes）
shared/                       # 官方 DSH client bundle 构建预设（MIT）
cordis.patch.yml              # bundle patch（dsh plugin 安装用）
```

## License

MIT. `shared/` 目录下的构建预设派生自 [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)（MIT）。
