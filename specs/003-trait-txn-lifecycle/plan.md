# Implementation Plan: 003-trait-txn-lifecycle（StateTrait 状态事务 / 生命周期分层 + Devtools 升级）

**Branch**: `003-trait-txn-lifecycle` | **Date**: 2025-12-11 | **Spec**: `specs/003-trait-txn-lifecycle/spec.md`  
**Input**: Feature specification from `/specs/003-trait-txn-lifecycle/spec.md`

**Note**: 本计划围绕 Trait 状态事务模型、蓝图/setup/run 分层与 Devtools 时间线/时间旅行能力展开，遵守 Constitution 中的「文档先行 & 引擎优先」约束。

## Summary

本特性围绕「Trait + 状态事务 + Devtools」打通一条从 Runtime 到调试视图的完整链路，核心目标是：

- 在 `@logix/core` 中引入显式的 StateTransaction / StateTxnContext 模型，将一次逻辑入口（dispatch / traits.source.refresh / service 回写 / devtools 操作）视为一个状态事务，在事务内部聚合所有 Reducer / Trait / Middleware 的状态修改，只在提交时写入底层 store 并对订阅者发出一次聚合通知（对齐 FR-001 ~ FR-003）。  
- 将 StateTrait 生命周期拆分为「蓝图 → setup → run」三段：蓝图层只负责基于 stateSchema + traitsSpec 构建 Program/Graph/Plan，setup 层只做 Env 无关的结构接线（source 刷新入口、Debug/Devtools 锚点），run 层在 StateTransaction 内执行 Trait 步骤与 Effect 行为（对齐 FR-004 ~ FR-005）。  
- 在 Devtools 中以「Module → Instance → Transaction → Event」组织视图，提供 TraitGraph + 事务时间线 + 时间旅行能力：  
  - 左侧导航按 Module / Instance / Transaction 三层组织（FR-006）；  
  - 中心视图支持 TraitGraph、Trait 生命周期状态、事务详情（Patch + 步骤）与时间线游标（FR-007 ~ FR-009）；  
  - 提供 `applyTransactionSnapshot` 式运行时接口与 UI 操作，支持按事务前/后状态进行时间旅行，并标记 time-travel 状态（FR-010 ~ FR-011）。  
- 对 Debug / Devtools 可见事件做统一标准化，形成 RuntimeDebugEvent 模型，并在 `@logix/react` 中新增 `kind = "react-render"` 事件类型，将组件渲染纳入事务视图，使 Trait + 事务下的 UI 行为可回放、可比较（FR-013）。

研究结论已经在 `research.md`、`data-model.md` 与 `contracts/devtools-runtime-contracts.md` 中固化：  
- 决定在 Runtime 内核层面引入事务模型，而不是仅在 Devtools 做软聚合；  
- 使用蓝图/setup/run 三段式 Trait 生命周期，与 Module.reducer / lifecycle 同构；  
- 延续 useSyncExternalStore 作为 React 订阅桥梁，将 emit 粒度提升到 StateTransaction 提交；  
- Devtools 层不新增独立大面板，而是在现有面板中扩展 TraitGraph / 事务视图 / 时间线功能。*** End Patch`"/>

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+，React 18，effect v3（已确定）  
**Primary Dependencies**: `@logix/core`、`@logix/react`、`@logix-devtools-react`、`effect`、React Testing Library（已确定）  
**Storage**: N/A（仅内存状态与 Devtools 视图模型，不持久化）  
**Testing**: Vitest（单元 + 集成），`pnpm test --filter @logix/core` / `--filter @logix/react` / `--filter @logix-devtools-react`（已确定）  
**Target Platform**: 浏览器（现代 Chromium/Firefox/Safari） + Node.js 20（测试）  
**Project Type**: Monorepo，核心为 runtime + React + Devtools 包（已确定）  
**Performance Goals**:  
- 单次事务在 Trait 数量 ~50 的示例模块下，对外状态提交 <= 1 次；  
- Devtools Timeline 在 500 条 RuntimeDebugEvent 内保持流畅滚动与筛选。  
**Constraints**:  
- MUST 避免在 React render 阶段做副作用（包含 Debug 事件上报）；  
- Devtools 渲染事件噪音需可控（默认仅在启用 Devtools/trace 时采集）。  
**Scale/Scope**:  
- 首批覆盖 examples/logix-react 中的 TraitForm 等 Demo；  
- 为 runtime-logix 文档与未来 Studio 预留扩展空间。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?  
    → Intent：模块作者希望“Trait 写法规模化后仍然一次交互 = 有界事务 + 可控渲染”；  
      Flow/Logix：在 Module / StateTraitProgram / ModuleRuntime 层引入 StateTransaction 与 Trait 生命周期语义；  
      Code：在 `@logix/core` / `@logix/react` / `@logix-devtools-react` 中实现事务内草稿状态、TraitPlan 执行与 Debug 事件上报；  
      Runtime：通过 Devtools 的 Module → Instance → Transaction 视图 + 时间线 + 时间旅行验证行为。  
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?  
    → 主要依赖并需更新：  
      - `docs/specs/runtime-logix/core/02-module-and-logic-api.md`（补充 StateTransaction & ModuleRuntime 行为）；  
      - `docs/specs/runtime-logix/core/03-logic-and-flow.md`（补充 Trait 执行与事务关系、EffectOp → Debug 事件流）；  
      - 若有 Devtools 专门文档（如 future draft），需要将 RuntimeDebugEvent 模型与 FR-006~FR-013 对齐。  
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `docs/specs/runtime-logix/*` docs capture the new contract?  
    → YES：  
      - 新增状态事务契约（StateTransaction / StateTxnContext / StatePatch）；  
      - 明确 StateTraitProgram 的蓝图/setup/run 分层契约；  
      - 引入统一 RuntimeDebugEvent 模型（含 `kind = "react-render"`）；  
      → 以上均需在 runtime-logix core 系列文档中建模，并与本 feature spec 对齐。  
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?  
    → 至少：  
      - `pnpm typecheck` / `pnpm lint`（仓库根）；  
      - `pnpm test --filter @logix/core`、`pnpm test --filter @logix/react`、`pnpm test --filter @logix-devtools-react`；  
      - 手工跑 TraitForm Demo，验证：事务视图、TraitGraph、时间线游标、时间旅行、React 渲染事件可视化。

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── logix-core/           # 核心 Runtime（StateTransaction / DebugSink / TraitProgram 生命周期）
│   └── src/
│       ├── debug.ts
│       ├── state-trait.ts
│       └── internal/runtime/core/**
├── logix-react/          # React 绑定（useModule / useSelector / ModuleCache）
│   └── src/
│       ├── hooks/useModule.ts
│       └── internal/ModuleCache.ts
├── logix-devtools-react/ # Devtools UI（DevtoolsShell / Timeline / Inspector 等）
│   └── src/
│       ├── snapshot.ts
│       ├── EffectOpTimelineView.tsx
│       └── Sidebar.tsx / Inspector.tsx / ...
└── logix-sandbox/        # 如后续需要在 Sandbox 中验证 Trait + 事务，可增量调整

examples/
└── logix-react/
    └── src/modules/trait-form.ts   # 主验证场景
```

**Structure Decision**:  
- 本特性主要落在 `@logix/core`（事务 / Trait 生命周期 / DebugSink）、`@logix/react`（React 渲染事件上报与 Runtime 绑定）与 `@logix-devtools-react`（Devtools 视图模型与 UI）三条主线；  
- 示例与手工验证以 `examples/logix-react` 为主，不引入额外新包。  

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Phase 0 – Research Summary & Remaining Unknowns

> 研究与决策已在 `specs/003-trait-txn-lifecycle/research.md` 中形成完整记录，这里只摘取与实现直接相关的要点，并标记仍需在实现阶段细化的点（非阻塞）。

- **R0-1 · 状态事务建模（StateTransaction / StateTxnContext）**  
  - 已决：每个逻辑入口（action dispatch / traits.source.refresh / service 回写 / devtools 操作）对应一个 StateTransaction，内部通过 StateTxnContext 聚合草稿状态与 Patch，仅在 commit 时写入底层 store 并 emit 一次变更。  
  - 实现待拆细节：  
    - StateTxnContext 的具体类型结构（泛型参数、是否公开导出）、与 ModuleRuntime 内部 state 容器的关系；  
    - 多入口 dispatch 串行化策略（Effect 级串行 vs 简单队列），以及在 Debug 事件中如何稳定表达事务顺序。  

- **R0-2 · Trait 生命周期：蓝图 / setup / run 分层**  
  - 已决：蓝图层只负责 `StateTrait.build`，setup 层只做结构 wiring，run 层只做行为执行；Phase Guard 必须能区分三个阶段。  
  - 实现待拆细节：  
    - 在 `state-trait.ts` 中是否需要新增显式的 `installBlueprint / installSetup / installRuntime` API，还是由现有 `install` 内部委派；  
    - setup 阶段的错误语义（遇到非法字段 / resourceId 缺失时，是 fail-fast 终止 ModuleRuntime，还是仅在 Devtools 中标记 setup-error）。  

- **R0-3 · Devtools 视图分层与时间线游标**  
  - 已决：Devtools 左侧导航采用 Module → Instance → Transaction 三层；事务详情视图提供 Event 时间线 + Patch 列表，并支持事件级游标（Step k/N）与时间旅行。  
  - 实现待拆细节：  
    - Timeline 内部数据模型是否需要显式分 lane（Runtime / Trait / React / Devtools），还是仅靠 kind + 样式区分；  
    - 时间线游标与时间旅行的耦合度：第一阶段是否只做“视图游标 + 事务级回放”，第二阶段再升级为“步级回放”。  

- **R0-4 · React 渲染事件（kind = "react-render"）**  
  - 已决：在 `@logix/react` 中新增组件渲染事件，统一归入 RuntimeDebugEvent 模型，使 Devtools 能在事务维度分析渲染成本。  
  - 实现待拆细节：  
    - 埋点时机：在 `useSelector` / `useModule` 内的哪个生命周期发事件（render 后的 `useEffect` / `useLayoutEffect`，还是通过某种“debug render scope”）；  
    - StrictMode 双调用的处理策略：是通过 meta.strictModePhase 标记，还是对完全重复的 render 做合并展示。  

> 结论：Phase 0 级别的 UNKNOWN 已通过 research 收敛到上述几个实现细节点，这些都属于实现期的“策略选择”，不再阻塞规范层；无需新增 [NEEDS CLARIFICATION] 标记，后续在 tasks 里按实现策略具体化即可。

## Phase 1 – Design & Contracts Mapping

> 这一节将 spec 中的 FR/SC 映射到具体设计产物（data-model / contracts / quickstart）与代码落点，确保没有“悬空需求”。

- **D1-1 · FR-001~FR-003：状态事务与 Patch 模型**  
  - 设计落点：  
    - `data-model.md`：StateTransaction / StateTxnContext / StatePatch 实体与约束；  
    - `contracts/devtools-runtime-contracts.md`：`listTransactions` / `getTransactionDetail` 输出结构；  
    - 代码落点预期：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts` 一类文件（实际路径待确认），新增 StateTxnContext 管线与 commit 逻辑。  
  - plan 级拆解：  
    - [Runtime] 在 ModuleRuntime 内引入 StateTxnContext：封装草稿 state、Patch 集合、txnId、origin；  
    - [Runtime] 改造 state.write/emit：所有逻辑入口通过 StateTxnContext 聚合，commit 时一次性写入底层 SubscriptionRef 并 emit；  
    - [Runtime] 在 DebugSink 中为每个事务写入至少一条 `kind = "state"` 事件（state:update）与若干 Patch 映射。

- **D1-2 · FR-004~FR-005：StateTrait 蓝图 / setup / run 生命周期**  
  - 设计落点：  
    - `data-model.md`：StateTraitProgram / StateTraitGraph / StateTraitPlan / StateTraitLifecycleState；  
    - `spec.md`：蓝图/setup/run 的职责切分与 Phase Guard 约束。  
  - plan 级拆解：  
    - [Runtime] 在 `state-trait.ts` 中将现有 build/install 流程拆为：  
      - build：生成 Program / Graph / Plan；  
      - setup：在 ModuleRuntime 构造时执行结构接线（注册 source-refresh / Debug 锚点）；  
      - run：在 Runtime 启动阶段，根据 Plan 安装 watcher / Flow / Middleware，并挂到 StateTransaction 管线中。  
    - [Runtime] 衔接 ModuleRuntime 与 TraitProgram：支持按 moduleId 查询 Traits 蓝图（对齐 Debug.getModuleTraitsById），供 Devtools 调用 `getTraitBlueprint`。  
    - [Devtools] 在 TraitGraph 视图中基于 StateTraitLifecycleState 标记蓝图存在 / setup 状态 / run 行为是否发生。

- **D1-3 · FR-006~FR-009：Module → Instance → Transaction 视图与事件时间线**  
  - 设计落点：  
    - `data-model.md`：DevtoolsModuleView / DevtoolsInstanceView / DevtoolsTransactionView / RuntimeDebugEventRef；  
    - `contracts/devtools-runtime-contracts.md`：`listModules` / `listModuleInstances` / `listTransactions` / `getTransactionDetail` / `subscribeEffectOp`。  
  - plan 级拆解：  
    - [Runtime] 在 Debug 层提供 module:init/module:destroy、state:update、trace:* 等事件，用于驱动 Module/Instance 统计与 Transaction 聚合；  
    - [Devtools] 建立从 snapshot（ringBuffer + instanceCounter + latestStates）到 DevtoolsState 的转换管道，填充 Module/Instance/Transaction VM；  
    - [Devtools] 在 EffectOpTimelineView 中扩展为“按选中 Transaction + 事件游标”的视图，支持 Step k/N 高亮与按 kind 分色。

- **D1-4 · FR-010~FR-011：事务级时间旅行**  
  - 设计落点：  
    - `data-model.md`：StateTransaction 的 `initialStateSnapshot` / `finalStateSnapshot` 与 Patch 序列；  
    - `contracts/devtools-runtime-contracts.md`：`applyTransactionSnapshot(moduleId, instanceId, txnId, mode)` 契约；  
    - `quickstart.md`：时间旅行使用说明与验证步骤。  
  - plan 级拆解：  
    - [Runtime] 在 ModuleRuntime 内为 dev/test 环境提供 dev-only setState 能力，允许在不触发外部副作用的前提下写入某个实例的 state snapshot 并重新派生 Trait；  
    - [Runtime] 为时间旅行调用打上 origin.kind = "devtools" 的 StateTransaction（可选），避免与正常业务事务混淆；  
    - [Devtools] 在选中 Transaction 时提供「回到事务前/后」按钮，并在 UI 上标记当前实例的 time-travel 状态与“返回最新状态”入口。

- **D1-5 · FR-012~FR-013：RuntimeDebugEvent 标准化与 React 渲染事件**  
  - 设计落点：  
    - `data-model.md`：RuntimeDebugEventRef（扩展自 TraitRuntimeEventRef，增加 kind/label/meta 字段约定）；  
    - `contracts/devtools-runtime-contracts.md`：`subscribeEffectOp` 输出结构与 kind 约束；  
    - `quickstart.md`：在 timeline 中观察 `kind = "react-render"` 的场景说明。  
  - plan 级拆解：  
    - [Runtime] 在 DebugSink 层添加标准化转换：`Logix.Debug.Event` → RuntimeDebugEventRef（填充 eventId/moduleId/instanceId/runtimeId/txnId/kind/label/meta）；  
    - [React] 在 `@logix/react` hooks 内新增 `kind = "react-render"` 事件埋点：将组件 label、selectorKey/fieldPaths、strictModePhase、txnId 写入 meta；  
    - [Devtools] 在 Timeline 视图中识别 `react-render` 事件，提供独立的显示样式与过滤开关，并在事务视图中聚合“每事务触发的渲染次数”。

## Phase 2 – Implementation Strategy（按模块拆解）

> 本节不直接列出 tasks.md 的条目，而是从模块/包视角将实现工作拆到足够细，方便后续一一映射为任务。

### P2-A · Runtime 内核（`packages/logix-core`）

- **A1 · StateTransaction / StateTxnContext 内核实现**  
  - 在 internal runtime core 中定义 StateTxnContext 类型：  
    - 包含：txnId、origin、draftState 引用、patches[]、startedAt/endedAt、flags（如 isCommitted）；  
    - 提供 API：`beginTransaction(origin)`、`updateDraft(updater)`、`recordPatch(patch)`、`commit()`、`rollback()`。  
  - 将 ModuleRuntime 的状态写入链路改造为：  
    - 逻辑入口（action dispatch / traits.source.refresh / service 回写 / devtools 操作）→ `beginTransaction`；  
    - Reducer / Trait / Middleware 写 state 时改写为写 draft；  
    - 事务结束时统一调用 `commit()`：写底层 store + emit state:update Debug 事件 + 通知订阅者。  

- **A2 · Trait 生命周期拆分与 Phase Guard 调整**  
  - 在 `state-trait.ts` 中：  
    - 保持 StateTraitProgram 作为蓝图层唯一事实源（program.graph / program.plan）；  
    - 新增或重构 install API：  
      - `installBlueprint(module)`（如需要）；  
      - `installSetup(runtime, program)`：注册 source-refresh 入口、Debug 锚点；  
      - `installRuntime(runtime, program)`：安装 watcher / Flow / Middleware。  
  - 在 Phase Guard 中为 setup / run 行为建立白名单：  
    - setup 阶段禁止调用不允许的 Effect 能力（如真实 IO），只允许结构性注册；  
    - run 阶段允许 Effect 行为，但所有状态写必须走 StateTxnContext。  

- **A3 · Debug / RuntimeDebugEvent 标准化**  
  - 在 `debug.ts` 与 internal DebugSink 中：  
    - 设计 RuntimeDebugEventRef 的组装函数：`fromDebugEvent(e: Debug.Event): RuntimeDebugEventRef`；  
    - 针对现有事件类型（module:init/destroy、action:dispatch、state:update、trace:*）定义统一的 kind/label/meta 映射规则；  
    - 确保事件中附带 runtimeId / moduleId / instanceId / txnId（如可用），并保持 eventId 唯一。  
  - 为 DevtoolsSink（见 `packages/logix-devtools-react/src/snapshot.ts`）提供标准化事件源，而不是直接透传原始 Debug.Event。

### P2-B · React 绑定层（`packages/logix-react`）

- **B1 · React 渲染事件埋点（react-render）**  
  - 在 `hooks/useModule.ts` / `useSelector` 内：  
    - 在 render 后的 effect 中获取 runtime.id / moduleId / 实例 label / selectorKey；  
    - 通过 Runtime 上下文（或 Debug helper）发出 `kind = "react-render"` 的 Debug 事件，由 RuntimeDebugEvent 标准化为统一结构；  
    - 在 StrictMode 下通过内部计数或 React 提供的标志写入 meta.strictModePhase，避免误判渲染次数。  

- **B2 · txnId ↔ render 对齐策略**  
  - 设计将 render 与 StateTransaction 对齐的策略（不一定首次就做到完美）：  
    - 方案 1：在 state:update Debug 事件中记录 txnId，并在 Devtools 侧推断“最近一次 state:update 之后的若干 react-render”属于该 txn；  
    - 方案 2：在 Runtime 内部提供“当前提交事务 ID”的线程局部上下文，让渲染事件上报时可以直接带上 txnId。  
  - 在 plan 中将选择的方案记录清楚，后续 tasks 具体化与测试保证“单次事务 → 渲染次数”视图稳定。

### P2-C · Devtools UI 与状态（`packages/logix-devtools-react`）

- **C1 · Snapshot & DevtoolsState 扩展**  
  - 扩展 `snapshot.ts` 中的 DevtoolsSnapshot，使其：  
    - 以 RuntimeDebugEventRef 为基础（而非原始 Debug.Event）；  
    - 能按 moduleId / instanceId / txnId 分组与过滤事件。  
  - 扩展 DevtoolsState：  
    - 引入 Module / Instance / Transaction 选中状态；  
    - 引入事件游标（selectedEventIndex / stepIndex）与当前过滤条件（kindFilters）。  

- **C2 · Timeline 视图增强**  
  - 在 `EffectOpTimelineView.tsx`：  
    - 支持按 kind 区分行样式（action / state / trait-* / react-render / devtools）；  
    - 支持按类别过滤（带 toggle 按钮）；  
    - 将 Step k/N 显示在 header 区域；  
    - 点击事件时触发游标更新，并在未来与时间旅行操作对接。  

- **C3 · Module / Instance / Transaction 导航联动**  
  - 在 Sidebar/Inspector：  
    - 左侧树基于 DevtoolsModuleView / DevtoolsInstanceView / DevtoolsTransactionView 渲染；  
    - 选中 Transaction 时，中部 Timeline 自动过滤该 txn 的事件，并高亮 Patch 列表。  

### P2-D · 文档与示例对齐

- **D1 · runtime-logix 文档更新**  
  - 在 `docs/specs/runtime-logix/core/02-module-and-logic-api.md` 中新增/扩展：  
    - ModuleRuntime 的 StateTransaction 语义；  
    - Module / StateTraitProgram / Debug 之间的关系。  
  - 在 `core/03-logic-and-flow.md` 中：  
    - 描述 Flow/Effect 与 StateTransaction / Debug 事件的关系；  
    - 明确 Trait 执行与事务边界的契约。  

- **D2 · 示例 & Quickstart 校验**  
  - 对 `examples/logix-react/src/modules/trait-form.ts`：  
    - 确认其 Trait 写法与新的蓝图/setup/run 生命周期兼容；  
    - 在 quickstart 指引中以它为主例，走完“事务视图 + 时间旅行 + 渲染事件分析”的路径。  

## Phase 3 – Verification & Rollout Strategy

- **V1 · 自动化检查**  
  - 统一运行：`pnpm typecheck` / `pnpm lint` / `pnpm test --filter @logix/core` / `--filter @logix/react` / `--filter @logix-devtools-react`；  
  - 在 @logix/core 测试中增加 StateTransaction 行为用例（一次交互只 commit 一次）；  
  - 在 @logix-react 测试中增加渲染事件集成测试（至少断言 react-render Debug 事件被触发且含必要 meta）。  

- **V2 · 手工验证路径（对齐 quickstart）**  
  - 在 examples/logix-react 中验证：  
    - TraitForm 的 Trait 行为在事务视图和 TraitGraph 中可见；  
    - Timeline 中的 Step k/N 与时间旅行按规范工作；  
    - React 渲染事件可以被按事务过滤并用于分析渲染次数。  

- **V3 · 回写与后续演进**  
  - 在完成实现与验证后，将经验回写到：  
    - `docs/specs/runtime-logix/impl/README.md`（运行时实现要点）；  
    - 如有需要，补充/更新 `specs/003-trait-txn-lifecycle/references/future-devtools-data-model.md`，记录实现与设计的差异、未来扩展方向。  
  - 后续若进入 `/speckit.tasks` 阶段，可直接以 P2-A~D 为骨架拆任务，保证任务拆解与本 plan 保持一一对应。
