# Implementation Plan: 003-trait-txn-lifecycle（StateTrait 状态事务 / 生命周期分层 + Devtools 升级）

**Branch**: `003-trait-txn-lifecycle` | **Date**: 2025-12-11 | **Spec**: `specs/003-trait-txn-lifecycle/spec.md`  
**Input**: Feature specification from `/specs/003-trait-txn-lifecycle/spec.md`

## Summary

本特性围绕「Trait + 状态事务 + Devtools」打通从 Runtime 到调试视图的完整链路，并为后续表单/复杂联动等高 Trait 密度场景打好运行时地基：

- 在 `@logix/core` 中引入显式的 `StateTransaction / StateTxnContext` 内核，将一次逻辑入口（dispatch / traits.source.refresh / service 回写 / devtools 操作）视为一个状态事务，在事务内部聚合所有 Reducer / Trait / Middleware 的状态修改，只在 commit 时写入底层 store 并对订阅者发出一次聚合通知。
- 将 StateTrait 生命周期拆分为「蓝图 → setup → run」三段：蓝图层只负责基于 stateSchema + traitsSpec 构建 Program/Graph/Plan，setup 层只做 Env 无关的结构接线（source 刷新入口、Debug/Devtools 锚点），run 层在 StateTransaction 内执行 Trait 步骤与 Effect 行为。
- 在 Devtools 中以「Module → Instance → Transaction → Event」组织视图，提供 TraitGraph + 事务时间线 + 时间旅行能力，并引入事务观测策略（Instrumentation Policy）与性能观测/预警：
  - Runtime 支持 `"full"` / `"light"` 等观测强度配置，在不破坏“单入口 = 单事务 = 单次订阅通知”语义的前提下，按环境/模块调整 Patch/快照/Debug 事件的记录开销；
  - Devtools 在主 Timeline 列表之上提供“时间轴总览条”（overview strip），按时间 bucket 可视化事务/渲染等事件频率，并支持框选时间段联动下方列表，同时派生简单性能指标和软性预警。
- 在 React 集成层纳入 `kind = "react-render"` 的 Debug 事件，将组件渲染纳入事务视图，使 Trait + 事务下的 UI 行为可回放、可比较。

研究结论与数据模型已分别固化在 `research.md`、`data-model.md` 与 `contracts/devtools-runtime-contracts.md` 中，`quickstart.md` 给出了从 TraitForm Demo 出发的一条完整验证路径，`tasks.md` 将实现拆分为 Phase 1/2 + US1–US5 + Polish 的任务列表。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+，React 18，effect v3  
**Primary Dependencies**:

- Runtime & React：`@logix/core`、`@logix/react`、`@logix-devtools-react`、`effect`、React Testing Library
- Devtools UI：`shadcn/ui`、`@radix-ui/*`（基础组件与可访问性）、`recharts`（时间轴总览条 / 频率图表）
  - Devtools 配置持久化：浏览器 `localStorage`（仅限客户端；默认 dev/test 场景使用，但若业务显式开启 devtools 也可在 prod 生效；localStorage 不可用时必须优雅降级到内存态配置）  
    **Storage**: N/A（仅管理内存状态与 Devtools 视图模型，不引入持久化）  
    **Testing**: Vitest（单元 + 集成），通过 workspace 脚本与包内脚本组合：
- 根脚本：`pnpm typecheck`、`pnpm lint`、`pnpm test`
- 包内：`pnpm test --filter @logix/core` / `--filter @logix/react` / `--filter @logix-devtools-react`  
  **Target Platform**: 浏览器（现代 Chromium/Firefox/Safari） + Node.js 20（测试与 Devtools host）  
  **Project Type**: Monorepo（runtime + React 绑定 + Devtools + 示例 + 文档）  
  **Performance Goals**:
- 对齐 spec 中 SC-001：在包含 ~50 Trait 节点的示例模块中，一次用户交互对应的单次 StateTransaction 执行时间通常 < 50ms；对外状态提交 1 次，订阅通知 1 次，React 渲染次数不超过 3 次（StrictMode 额外渲染除外）。
- Devtools Timeline 在 ~500 条 RuntimeDebugEvent 内保持流畅滚动与筛选；时间轴总览条的 bucket 聚合与框选操作不成为瓶颈。  
  **Constraints**:
- MUST 避免在 React render 阶段做副作用（包含 Debug 事件上报与性能统计），所有 Debug/统计只能在 effect 中完成；
- MUST 保证 dev/test 环境下充分可观测（事务视图 + TraitGraph + 时间旅行 + 渲染事件 + overview strip），同时允许在生产环境通过观测策略退化为轻量模式；
- 新增的 Debug/Devtools 观测结构默认仅在 dev/test 环境生效；但当调用方显式传入 `Logix.Runtime.make(..., { devtools: true | DevtoolsRuntimeOptions })` 时，视为强制 override，Runtime/React 必须无视 `isDevEnv()` 全量启用 Devtools Hub / DebugObserver / `trace:react-render` 采集；是否在生产环境启用由业务自行判断，用户文档需明确提示开销与风险；
- Devtools 所有影响 Runtime 开销的观测开关（模式、Trait 明细、时间旅行控件、overview 维度等）必须通过统一的设置面板暴露给用户，并按浏览器 localStorage 持久化，localStorage 不可用时不得影响当前会话功能（回退到内存态）。
- StateTransaction 的观测策略（Instrumentation）配置面 MUST 收敛到 Runtime / ModuleImpl 两层：
  - 在 `@logix/core` 中通过 `Logix.Runtime.make(root, { stateTransaction?: { instrumentation?: "full" \| "light" } })` 提供应用级默认观测级别（`root` 可为 program module 或其 `.impl`）；
  - 在 `ModuleDef.implement({ initial, logics?, imports?, processes?, stateTransaction?: { instrumentation?: "full" \| "light" } })` 上允许为少数高频/性能敏感模块覆写观测级别；
  - 优先级约束：ModuleImpl 级配置 > Runtime.make 级配置 > `getDefaultStateTxnInstrumentation()`（基于 `NODE_ENV` 的默认值）；
  - React 层的 `RuntimeProvider` / `LogixProvider` 仅负责透传已构造好的 Runtime 与 Layer，不得在 Provider 级别引入新的事务观测模式或关闭事务模型。  
    **Scale/Scope**:
- 首批覆盖 `examples/logix-react` 中 TraitForm 等 Demo（包括高 Trait 密度版本）；
- 作为 runtime-logix 文档与未来 Studio 的基础能力，为后续表单 Helper / ResourceField / Origin-first Timeline / **长链路 Task Runner（run\*Task）** 等特性预留扩展空间，但本轮不直接实现这些上层语法糖。

## Constitution Check

_GATE: 已在 Phase 0/1 级别完成自检，当前 Plan 对齐宪章约束。_

- 本特性如何映射到 `Intent → Flow/Logix → Code → Runtime` 链路？
  - Intent：模块作者与平台维护者希望在 Trait 规模化后仍然可以以“事务 + 生命周期”的视角推理与调试状态变化；业务开发者希望以 Timeline/Origin 视角观察 Trait 行为与渲染成本，而不是在零散日志中摸索。
  - Flow/Logix：在 Module / StateTraitProgram / ModuleRuntime 层引入 StateTransaction 与 Trait 生命周期语义；在 Devtools 层以事务视图 + 时间线 + 性能概览条暴露观测与时间旅行能力。
  - Code：在 `packages/logix-core` / `packages/logix-react` / `packages/logix-devtools-react` 中实现事务内草稿状态、TraitPlan 执行、RuntimeDebugEvent 标准化、React 渲染事件以及 Devtools UI；
  - Runtime：通过 Devtools（Module → Instance → Transaction → Event + overview strip）与示例模块验证“一次交互 = 有界事务 + 可控渲染”的行为，并以时间旅行与性能预警支撑日常调试。

- 依赖或修改哪些 `docs/specs/*` 规范？是否已按文档先行更新？
  - 直接依赖：
    - `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`（StateTransaction / Trait 生命周期 / Devtools 术语需在实现后登记）；
    - `.codex/skills/project-guide/references/runtime-logix/logix-core/*`（Module / Logic / State / Debug 契约）；
    - `.codex/skills/project-guide/references/runtime-logix/logix-core/impl/README.md`（运行时实现要点）；
    - `docs/specs/drafts/topics/trait-system/*`（作为高 Trait 场景参考与回归样本清单）。
  - 本 feature 目录下的 spec/plan/research/data-model/contracts/quickstart 已先行更新，后续在实现稳定后会通过 T041 将经验回写到 runtime-logix SSoT 文档。

- 是否引入/修改 Effect/Logix 契约？相关规范是否同步？
  - 引入：`StateTransaction / StateTxnContext / StatePatch / RuntimeDebugEventRef` 契约，以及 Devtools 与 Runtime 之间的 `listTransactions` / `getTransactionDetail` / `subscribeEffectOp` / `applyTransactionSnapshot` 接口；
  - 修改：对 Trait 生命周期（蓝图/setup/run）的约束、对 ModuleRuntime 订阅语义（以事务 commit 为粒度）的约束。
  - 契约细节已在本 feature 的 `data-model.md` 与 `contracts/devtools-runtime-contracts.md` 中定义，并将在落地后同步融入 `.codex/skills/project-guide/references/runtime-logix/logix-core/*` 与 `impl/README.md`。

- 质量门槛：在合并前会运行哪些脚本？什么算“通过”？
  - 最低门槛：`pnpm typecheck`、`pnpm lint` 必须通过；
  - 核心包：`pnpm test --filter @logix/core`、`--filter @logix/react`、`--filter @logix-devtools-react` 三者在本特性范围内必须全部通过；
  - 示例验证：按 `quickstart.md` 路径对 TraitForm Demo 进行手工验证，检查事务视图、TraitGraph、时间线游标、时间旅行、渲染事件与 overview strip 的表现；
  - 若某些 Devtools UI 细节暂时以软门槛处理（例如样式或图表细节），需在 `tasks.md` 与 PR 描述中标记，并在后续迭代中补齐。

## Project Structure

### Documentation（本特性目录）

```text
specs/003-trait-txn-lifecycle/
├── spec.md          # 需求与 FR/SC（StateTransaction + Trait 生命周期 + Devtools 功能）
├── plan.md          # 当前文件：实现方案与架构规划
├── research.md      # Phase 0：设计决策与 alternatives（Decision 1–11 等）
├── data-model.md    # Phase 1：StateTransaction / StatePatch / RuntimeDebugEvent / DevtoolsVM 实体
├── quickstart.md    # Phase 1：从 TraitForm 等 Demo 出发的验证路径
├── contracts/       # Devtools ↔ Runtime 契约（listTransactions / applyTransactionSnapshot 等）
│   └── devtools-runtime-contracts.md
├── tasks.md         # Phase 2：按 User Story 拆分的任务列表（US1–US5 + Polish）
└── references/      # 扩展设计（如 future-devtools-data-model、Trait-first Form 模式）
```

### Source Code（仓库根目录）

```text
packages/
├── logix-core/
│   └── src/
│       ├── internal/runtime/core/    # StateTxnContext / ModuleRuntime 内核 / DebugSink / DevtoolsHub 等
│       ├── state-trait.ts            # StateTraitProgram / Graph / Plan + 生命周期拆分
│       ├── Module.ts / Runtime.ts    # Module & ModuleRuntime，接入 StateTransaction
│       └── Debug.ts                  # Debug API / RuntimeDebugEventRef / DevtoolsHub 公共入口
├── logix-react/
│   └── src/
│       ├── hooks/useModule.ts        # React 绑定 + useSyncExternalStore + react-render 事件埋点
│       ├── internal/env.ts           # re-export @logix/core/Env
│       └── ...                       # 其他 hooks / Provider
├── logix-devtools-react/
│   └── src/
│       ├── state/                    # Devtools VM state & Logic（Logix Module）
│       │   ├── model.ts              # DevtoolsStateSchema / DevtoolsSettingsSchema / 类型别名
│       │   ├── storage.ts            # layout/settings 的 localStorage 读写封装
│       │   ├── compute.ts            # computeDevtoolsState / getAtPath 等纯函数
│       │   ├── module.ts             # DevtoolsModule（actions/reducers，仅调用 compute + storage）
│       │   ├── logic.ts              # DevtoolsLogic（订阅 @logix/core DevtoolsHub snapshot、拖拽、副作用）
│       │   └── runtime.ts            # DevtoolsImpl / devtoolsRuntime / devtoolsModuleRuntime
│       ├── snapshot.ts               # （将被移除）snapshot/Hub 下沉至 @logix/core，Devtools UI 改为直接消费 Debug.getDevtoolsSnapshot/subscribe
│       ├── ui/
│       │   ├── shell/
│       │   │   ├── DevtoolsShell.tsx # 主面板布局容器（3 列布局 + header/overview）
│       │   │   └── LogixDevtools.tsx # 对外暴露的 Devtools 入口组件（挂接 Runtime 与 Shell）
│       │   ├── sidebar/
│       │   │   └── Sidebar.tsx       # 左侧 Runtime/Module/Instance/Transaction 树
│       │   ├── timeline/
│       │   │   ├── Timeline.tsx              # 中部时间线容器（滚动区域）
│       │   │   └── EffectOpTimelineView.tsx  # 事件列表渲染（按 kind/txnId 分组与高亮）
│       │   ├── graph/
│       │   │   └── StateTraitGraphView.tsx   # Trait Graph 结构视图
│       │   ├── inspector/
│       │   │   └── Inspector.tsx             # 右侧事务/状态详情面板
│       │   ├── overview/
│       │   │   └── OverviewStrip.tsx         # 顶部时间轴总览条（recharts + shadcn/radix）
│       │   └── settings/
│       │       └── SettingsPanel.tsx         # 设置面板（模式 / 事件窗口大小 / 阈值等）
│       ├── DevtoolsHooks.tsx         # 与 React host 集成的少量桥接 hooks（如 useDevtoolsRuntime）
│       ├── index.tsx                 # 包导出入口
│       └── theme.css                 # Devtools 自身的 Tailwind/样式入口
examples/
└── logix-react/
    └── src/
        ├── modules/
        │   ├── trait-form.ts             # 现有 Trait Demo
        │   └── trait-form-advanced.ts    # （可选）高 Trait 密度压测场景
        └── demos/
            └── trait-txn-devtools-demo.tsx   # Demo Page：挂载 Trait 模块 + Devtools 面板，用于手工体验事务/时间旅行/性能视图

apps/docs/
└── content/docs/guide/
    ├── advanced/debugging-and-devtools.md            # 事务视图 + 时间旅行 + 渲染事件
    └── advanced/performance-and-optimization.md      # （T045）性能优化与观测策略指南
```

**Structure Decision**:

- 本特性主要落在三个核心包：`@logix/core`（事务 / Trait 生命周期 / DebugSink / DevtoolsHub + `Runtime.make({ devtools })` 一键启用）、`@logix/react`（React 渲染事件上报与 devtools 开关联动）、`@logix-devtools-react`（Devtools 视图模型与 UI，包括 overview strip；不再内置 snapshot/sink）。
- 示例与手工验证集中在 `examples/logix-react`，不会新增新的运行时包；
- 文档对齐通过本特性目录下的 spec/plan/research/data-model/contracts/quickstart，以及后续对 `.codex/skills/project-guide/references/runtime-logix` 与 `apps/docs` 的更新完成。

### Devtools 一键启用与 Hub 下沉（FR-018 增量）

> 背景：现有 Devtools 依赖调用方同时挂 `devtoolsLayer`（替换 DebugSink）+ `Middleware.withDebug`（产出 trace:effectop），使用成本高且职责分散。对齐 spec/FR-018 与 Clarifications 2025-12-12：Runtime 需提供 `devtools` 一键入口，Hub 下沉到 core，并以“追加 sinks / 显式 override”作为默认语义。

- **DevtoolsHub（core 侧全局单例）**
  - 将 `packages/logix-devtools-react/src/snapshot.ts` 中的 ring buffer / instance counter / latestStates / instanceLabels 逻辑整体下沉到 `packages/logix-core/src/internal/runtime/core/DevtoolsHub.ts`（或等价 internal/core 位置），作为**进程/页面级全局单例**收集 Debug 事件。
  - 通过 `packages/logix-core/src/Debug.ts` 暴露只读 API：
    - `Debug.getDevtoolsSnapshot()` / `Debug.subscribeDevtoolsSnapshot(listener)` / `Debug.clearDevtoolsEvents()`；
    - （可选）`Debug.setInstanceLabel(instanceId, label)` 与读取接口一并下沉，保持实例命名能力不回退。
  - 新增 `Debug.devtoolsHubLayer({ bufferSize? })`：将 Hub Sink **追加**到当前 Debug sinks 中（不替换），并在 Hub 内使用可配置缓冲区大小。
  - 为满足“追加 sinks”语义，需要在 Debug 命名空间补一个 append 原语（如 `Debug.appendSinks(extra)` / `Debug.withSinks(base, extra)`），内部通过 FiberRef 合并 sinks；`Debug.replace` 继续保留用于显式替换场景。

- **Runtime 一键启用 devtools**（`packages/logix-core/src/Runtime.ts`）
  - 扩展 `RuntimeOptions`：`devtools?: true | DevtoolsRuntimeOptions`，并在 core 侧定义 `DevtoolsRuntimeOptions`（仅含启动/桥接级字段：Hub bufferSize、DebugObserver/filter、`react-render` 采样/限频、未来的 replaceSinks 开关等）。
  - 在 `Runtime.make` 内：
    - 若 devtools 启用，自动把 `Debug.devtoolsHubLayer({ bufferSize })` merge 进 appLayer；
    - 自动对 `options.middleware ?? []` 追加 `Middleware.withDebug(..., { logger: false, observer })`，确保产出 `trace:effectop` 并携带 txnId；
    - devtools 为显式 override：只要传入即生效，不受 `isDevEnv()` 裁剪；是否在 prod 启用由业务自行判断，用户文档需提示开销与风险。

- **React 渲染事件与 devtools 开关联动**（`packages/logix-react/src/hooks/useSelector.ts`）
  - 现有 `trace:react-render` 仅在 `isDevEnv()` 下采集；需改为：devtools 启用时无视 `isDevEnv()` 也采集。
  - 最低成本做法：core 暴露 `Debug.isDevtoolsEnabled()`（由 `devtoolsHubLayer` 打开全局标记），React 侧 gating 变为 `isDevEnv() || Debug.isDevtoolsEnabled()`；采样/限频依据 `DevtoolsRuntimeOptions` 与 DevtoolsSettings 回流后的值执行。

- **devtools-react 退回纯 UI 消费者**
  - `@logix/devtools-react` 不再内置 Sink/Store：删除或空实现原 `snapshot.ts`，改为直接消费 core 的 `Debug.getDevtoolsSnapshot/subscribe`。
  - 对外入口维持 `<LogixDevtools />`，但不再要求调用方显式挂 `devtoolsLayer`；示例与用户文档统一迁移为 `Runtime.make(..., { devtools: true })` 写法。
  - `devtoolsLayer` 可暂时保留为薄别名（指向 `Debug.devtoolsHubLayer()`），用于过渡示例与避免心智断裂，但标记为 deprecated。

### StateTransaction Instrumentation 策略与实现落点

- **Runtime 级入口（全局默认）**
  - 扩展 `packages/logix-core/src/Runtime.ts` 中的 `RuntimeOptions`：增加可选字段  
    `stateTransaction?: { readonly instrumentation?: "full" | "light" }`；
  - 在 `Logix.Runtime.make` 内将该配置下沉到 `AppRuntimeImpl.LogixAppConfig`，并在构造各 `ModuleRuntime` 时一并传入（例如通过扩展 `AppModuleEntry` 或为 ModuleRuntime Layer 提供额外配置 Tag）；
  - 若调用方未显式提供 `stateTransaction.instrumentation`，Runtime 层仍使用 `getDefaultStateTxnInstrumentation()`（基于 `NODE_ENV`）作为默认值，保持与现有实现兼容。
- **ModuleImpl 级入口（按模块覆写）**
  - 扩展 `packages/logix-core/src/internal/runtime/core/module.ts` 中的 `ModuleTag["implement"]` 与 `ModuleImpl` 类型，在 `implement` 的 config 中新增可选字段  
    `stateTransaction?: { readonly instrumentation?: "full" | "light" }`；
  - 在 `packages/logix-core/src/internal/runtime/ModuleFactory.ts` 的 `Module.implement` 实现中：
    - 先基于 `config.stateTransaction?.instrumentation`、Runtime 级默认与 `getDefaultStateTxnInstrumentation()` 计算出该 Module 的有效观测级别；
    - 通过扩展 `ModuleRuntimeOptions` 向 `ModuleRuntime.make` 传入该观测级别，并在内部调用 `StateTransaction.makeContext` 时使用（替代当前仅依赖 `getDefaultStateTxnInstrumentation()` 的实现）；
    - 确保优先级逻辑与 spec/FR-015 中的“ModuleImpl > Runtime > NODE_ENV 默认”保持一致。
- **ModuleRuntime / StateTransaction 内核调整**
  - 扩展 `packages/logix-core/src/internal/runtime/ModuleRuntime.ts` 的 `ModuleRuntimeOptions`，增加可选 `stateTransaction?: { instrumentation?: "full" | "light" }`，并在构造 `txnContext` 时优先使用该配置；
  - 保留 `StateTransaction.StateTxnRuntimeConfig` / `makeContext` 现有字段，只调整默认值来源：若 ModuleRuntimeOptions 中未指定 instrumentation，则回退到 Runtime 级默认，再回退到 `getDefaultStateTxnInstrumentation()`。
- **React 层与 RuntimeProvider 约束**
  - 在 `@logix/react` 中复查 `RuntimeProvider` / `LogixProvider`：
    - 确认其 props 不新增任何与 StateTransaction 相关的配置字段，仅接受 `runtime` 与可选 `layer`；
    - `layer` 仅用于注入 Env（Logger / DebugSink / 平台 Service 等），不得改变 StateTransaction 是否存在或其观测级别；
  - 在 `packages/logix-react/test` 中补充一组集成用例：
    - 验证相同 `Logix.Runtime.make` 配置下，无论是否包一层 `RuntimeProvider` 或叠加 `layer`，事务级别（例如 `"full"` / `"light"`）与 Debug 行为（Patch/快照是否记录）保持一致；
    - 为后续防回归提供 clear signal。

### Devtools UI 组件拆分与约束

- 组件目录结构 MUST 与上文 `logix-devtools-react/src` 规划保持一致：
  - `state/*` 只承载 Logix Module/Logic/Runtime，负责所有状态管理与副作用；
  - `ui/**` 仅包含 React 组件，视为“纯渲染层”。
- Devtools UI 组件（`ui/**`）的设计约束：
  - SHOULD 视为**受控视图组件**：绝大部分组件仅通过 props 接收视图模型（例如 DevtoolsState 的切片）与回调，不再自行持有复杂本地状态；
  - 除基础 UI 框架需要的少量 hooks（例如 `useId` / `useMemo` / `useCallback` / `useEffect` 做 DOM 尺寸测量）外，SHOULD NOT 在组件内部直接使用复杂的 `useState` / `useReducer` 管理业务状态，业务态一律交给 Logix Module；
  - 所有跨组件共享的状态（当前选中 Runtime/Module/Instance/Transaction、过滤条件、设置项等） MUST 通过 Devtools Module 暴露的 actions/state 管理，不得在多个组件之间各自维护局部 state。
- 复杂度与拆分约束：
  - 任意单个 React 组件文件（`ui/**.tsx`）的**业务逻辑**（不含类型/导入/样式）建议控制在 ~200 行以内；
  - 当组件文件总行数超过 ~300 行时，应视为“需要拆分”的预警信号：
    - 优先将纯逻辑提取到 Logix Module（`state/*`）或纯函数 helpers；
    - 将明显独立的 UI 区块拆出为子组件（仍放在 `ui/**` 目录结构下）。
  - 当组件文件总行数超过 ~500 行时 MUST 进行拆解，不允许继续在单文件内堆叠逻辑与渲染：
    - 可以按布局区块（header/sidebar/timeline/inspector）或者职责（列表渲染 / 行组件 / 控件条）拆分；
    - 重构后需要保证子组件仍然保持“纯渲染 + 轻 hooks”的特征。
  - 实现层面建议配合 lint 或简单脚本在 CI 中对 `logix-devtools-react/src/ui/**` 做文件行数检查，将 >300 行标记为 warning，>500 行标记为 error，以便在后续迭代中自动守护该约束。

### Devtools UX Polish：操作摘要 / Overview 反馈 / Settings v2

- **操作摘要（Operation Summary）窗口**
  - 逻辑层（state.ts / compute.ts）：
    - 基于 `RuntimeDebugEventRef` 现有时间线，在 `computeDevtoolsState` 或邻近纯函数中增加一次性“操作窗口”分组：
      - 从关键逻辑入口事件（例如 `action:dispatch`、Devtools 操作）开始，维护一个可配置的短时间窗口（默认 1000ms，对应 `DevtoolsSettings.eventBufferSize` 或新字段 `operationWindowMs`）；
      - 在窗口内收集所有相关事件（action/state/service/`react-render` 等），若期间持续有新事件到达，则自动续命延长窗口；
      - 窗口结束后，产出一条结构化的“操作摘要”（统计事件数、渲染次数、持续时间等），作为 DevtoolsState 的一部分暴露给 UI（例如 `state.operationSummary` 或 `state.recentOperations[0]`）。
    - 逻辑必须保持为纯函数（不直接访问 DOM/时间），时间获取通过注入 `now()` 或在调用侧提供当前时间戳，便于单元测试。
  - UI 层（DevtoolsShell / OperationSummaryBar）：
    - 在 `DevtoolsShell` 内引入一个固定 info bar 组件（例如 `OperationSummaryBar`），位于 OverviewStrip 与 Timeline 之间或 header 下方，用于展示最近一次操作摘要；
    - info bar 为受控组件：
      - props 来源于 DevtoolsState 中的 summary 结构；
      - 默认不自动消失，由下一次操作覆盖或用户点击关闭按钮隐藏当前摘要；
      - 在窄视口下可以折叠为一行精简摘要 + tooltip 详情，避免压缩主要调试区域。

- **OverviewStrip 的“新增反馈”效果**
  - 逻辑层：
    - 在现有 `OverviewStrip` buckets 计算中引入“最近变化”标记：当某个 bucket 的 txnCount / renderCount 相较于上一帧发生变化时，为其记录 `lastChangedAt` 或等价标记；
    - 引入新的设置字段（例如 `DevtoolsSettings.overviewHighlightDurationMs`），控制“新增高亮”持续时间，默认数秒；
  - UI 层：
    - 在 `OverviewStrip` 渲染时，根据当前时间与 `lastChangedAt` + `overviewHighlightDurationMs` 判定 bucket 是否处于高亮期；
    - 处于高亮期的 bucket 在颜色与形变上与普通柱子区分：
      - 颜色上使用稍高亮的填充/描边（与 warn/danger 阶段配合，不与阈值语义冲突）；
      - 形变上使用轻微的 `transform` 动画（例如上下 1–2px 的平移或小幅 scale），强化“刚刚发生变化”的感知；
    - 动画需满足性能与可访问性约束：
      - 优先使用 CSS 动画/transition（基于 `transform`），避免在每个柱子内部挂重型 React 状态；
      - 尊重 `prefers-reduced-motion`，在该模式下仅保留静态颜色高亮，不做跳动动画。

- **Settings v2：集中设置面板与字段分层**
  - 字段收敛：
    - Core 设置（面板默认展开区域）：
      - 观测模式：`mode`（`"basic"` / `"deep"`）；
      - 事件可见性：`showTraitEvents`、`showReactRenderEvents`；
      - 时间旅行 UI：`enableTimeTravelUI`；
      - 事件窗口大小：`eventBufferSize`（用于 Debug 事件 ring buffer 与 Timeline 截断）；
      - 操作摘要窗口：`operationWindowMs`（如采用独立字段）是否启用/窗口时长。
    - Advanced 设置（可折叠区域）：
      - Overview 阈值：`overviewThresholds.txnPerSecondWarn` / `txnPerSecondDanger` / `renderPerTxnWarn` / `renderPerTxnDanger`；
      - 概览高亮持续时间：`overviewHighlightDurationMs`；
      - 采样配置：`sampling.reactRenderSampleRate`。
  - UI 结构：
    - 在 Devtools header 右侧新增 Settings 按钮（图标 + tooltip），点击后在面板内部右侧弹出/展开一个 Settings 面板（可以是侧栏或下拉卡片），默认展示 Core 设置，Advanced 部分通过折叠区或“Advanced”分组展开；
    - Settings 面板本身不直接访问 localStorage，仅通过 DevtoolsState.actions（例如 `setMode`、`setSettingsField`）更新状态，由 state 层负责持久化；
    - 保留 header 中的快速模式切换与主题切换，但将所有“影响 Runtime/Devtools 开销”的细粒度开关迁移/镜像到 Settings 面板中（header 上仅保留最常用的快捷项）。
    - 行为约束：
      - 所有设置变更必须是即时生效（更新 DevtoolsState 与 UI），并同步写入 localStorage；
      - 超出推荐范围的数值（如 eventBufferSize 过小/过大）在 Settings 面板中应做裁剪或给出轻量提示，而不是让底层 Debug 管道处于不确定状态；
      - Settings 面板在关闭后仍然保留最近配置，重新打开时展示当前状态（不重置为默认值）。

### Future Work: 长链路 Task Runner（run\*Task）

> 本节细化 spec 中的“补充规划：长链路 Task Runner 语法糖”，作为本特性之后的通用演进方向；不改变现有“逻辑入口 = 事务边界”的内核不变量。

- **目标**
  - 在 Bound/Flow 的 IntentBuilder 上提供 `runTask / runLatestTask / runExhaustTask / runParallelTask` 四个方法，分别镜像 `run / runLatest / runExhaust / runParallel` 的触发并发语义。
  - 让业务用线性写法表达长链路（pending → IO → result），由底层自动拆成多入口多事务。
- **非目标**
  - 不引入隐式“异步边界自动切事务”；不允许把真实 IO 包在单笔 StateTransaction 内。
  - 不强制业务必须使用 Task Runner；手写多入口/多 action 仍是稳定后门。

- **API 形态（高层草案）**
  - 四个方法均接受同构配置对象：
    - `pending?: Logic.Of | (payload) => Logic.Of`：同步的 pending 写入；**只对被接受并启动的 task 执行**，且始终作为独立事务入口；
    - `effect: (payload) => Effect.Effect<A, E, R>`：真实 IO/异步任务；
    - `success?: (result, payload) => Logic.Of`：成功写回；
    - `failure?: (errorOrCause, payload) => Logic.Of`：失败写回；
    - `origin?: { pending?; success?; failure? }`：可选覆写三笔事务的 origin（默认使用 task/service-callback 类别）；
    - 未来可选：`priority?: number`（仅影响调试/排序，不改变事务边界）。

- **执行语义**
  - 每次触发被接受后：
    1. **事务 1（pending）**：通过 `__runWithStateTransaction` 开新入口提交 pending，并立即 commit；
    2. **IO 区**：在独立 Fiber 中运行 `effect`；
    3. **事务 2（success/failure）**：IO 完成后再开新入口写回结果。
  - `runLatestTask`：新触发到来时对旧 Fiber 发起 `interrupt`，并在写回阶段用递增 `taskId` guard 确保旧 task 永不写回。
  - `runExhaustTask`：busy 时忽略新触发，被忽略触发不产生 pending 事务。
  - `runTask`：按触发顺序串行执行 task；每次触发均产生 pending。
  - `runParallelTask`：允许并发；每个 task 独立 pending + 写回。

- **实现落点与关键复用**
  - 类型与实现 helper：新增 `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`（深层实现），由 `packages/logix-core/src/internal/runtime/BoundApiRuntime.ts` 的 IntentBuilderFactory 调用。
  - 事务入口复用：全部写回通过 `BoundApiRuntime.__runWithStateTransaction` → `ModuleRuntime.__runWithStateTransaction` → `txnQueue` 串行保证。
  - 并发语义复用：尽量复用 `FlowRuntime.runLatest/runExhaust/runParallel` 的 Stream/Fiber 模式，保持用户心智一致。

- **使用边界与风险**
  - `run*Task` 仅面向 run 段 watcher（`$.onAction/$.onState/$.on`），**不得在 Reducer/Trait-run 的同步事务 body 内直接调用**，否则可能与内部队列等待语义冲突；dev 下应给出诊断提示。

## Complexity Tracking

目前规划不引入额外 project/包层级，也不新增第二套运行时或状态引擎；复杂度主要体现在：

| Violation | Why Needed                                                           | Simpler Alternative Rejected Because |
| --------- | -------------------------------------------------------------------- | ------------------------------------ |
| （none）  | 当前方案在单一 Runtime/Devtools 体系内完成，无需超出宪章的结构性例外 | N/A                                  |
