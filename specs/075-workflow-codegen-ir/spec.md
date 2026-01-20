# Feature Specification: Workflow Codegen IR（出码层：Canonical AST + Static IR）

**Feature Branch**: `075-workflow-codegen-ir`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: 073 完成后的新视角：tick 是观测参考系；traits 是受限绑定；多步协议/时间算子属于自由编排，必须 IR 化并纳入 tick 证据链。

**Model (SSoT)**:

- `docs/ssot/platform/foundation/01-the-one.md`（`Π`/`C_T`/`Δ⊕`/tick 参考系）
- `docs/ssot/platform/contracts/03-control-surface-manifest.md`（控制面 Root IR：actions/services/traits/workflows/opaque 收口）

## Context

Logix 当前已经具备强大的“命令式”动态能力（`$.onAction().runLatest/runTask/...` + FlowRuntime），但它仍然存在两个结构性缺口：

1. **自由工作流缺少可导出的静态形态**：业务要表达“点击提交 → 调 API → 成功后跳转/刷新”，往往退回 `$.logic` 手写 watcher。代码能跑，但：
   - 依赖与因果链不可导出（Devtools 只能看运行期事件，缺“结构图”）；
   - 时间算子（delay/retry/timeout）容易变成黑盒 `setTimeout/Promise` 链，导致 replay/解释断链；
   - 难以在系统层做预算、降级与统一治理（每个 Flow 都是黑箱）。
2. **与 073 的 tick 参考系尚未“同一语言”**：073 明确 no-tearing 依赖 `RuntimeStore + tickSeq`；但自由工作流如果绕开 tick（影子时间线/影子调度），仍会把系统拉回“双真相源”与不可解释的状态组合。

因此需要一个**可编译、可导出、可诊断**的控制律表示：把“Action/事件 → 操作序列（服务调用/dispatch/延迟）”固化为 Program，并以 tick 作为证据与调度边界。

## Clarifications

### Session 2026-01-19

- Q: 对“Workflow 里的 service 调用”，Platform-Grade/LLM 出码的规范形是哪一种？ → A: 强制规范形为 `callById('<serviceId>')`（字面量）；`call(Tag)` 仅作 TS sugar，Parser/Autofill 不要求解析 Tag。
- Q: 在 `WorkflowDef` 里，Platform-Grade/LLM 出码是否要求所有 identity 字段都必须是字符串字面量？ → A: 是；`workflowLocalId` / `trigger.actionTag` / `steps[*].key` / `dispatch.actionTag` / `callById.serviceId` 等必须为字符串字面量，否则降级为 Raw Mode（不参与回写/补全）。
- Q: v1 的 Workflow step kind 是否要严格最小集（`dispatch/call/delay`），其它跨域副作用一律通过 `callById('logix/kernel/<...>')` 表达？ → A: 是；v1 严格三种 step kind，navigate/toast/sourceRefresh 等都必须下沉为 KernelPorts service ports，并通过 `callById('logix/kernel/<...>')` 表达。
- Q: v1 是否坚持 `call` 不产生结果数据流，且 Workflow 内不提供条件分支/计算表达式？ → A: 是；v1 只表达控制流与时序，任何基于结果的分支/计算必须下沉到 service 或拆成多个 Workflow 通过 action 串联。
- Q: v1 是否允许人类手写 watcher，但必须显式登记为 `opaque effect`，且不作为可回写/可结构化编辑对象？ → A: 是；允许手写 watcher，但必须显式登记为 `opaque effect` 并进入 Root IR 的 `opaqueEffects` 索引；Parser/Autofill/Studio 不把它当作可回写的结构对象。

## Positioning（本次裁决：075 的主定位）

本特性将 **Workflow** 明确定位为 **AI/平台专属的出码层（IR DSL）**：

- 目标对象是“可导出/可 diff/可校验/可解释”的结构化产物，而不是“让人类手写更爽”的 DSL；
- 业务侧“少胶水”的收益主要来自 **Recipe/Studio/AI 生成**（或更高层 Pattern），而不是要求人类日常直接拼 IR 图；
- 运行时只消费编译后的 Static IR / 执行计划，不承担“解压/推导/修复”的逻辑；所有确定性与校验前置到导出期。

同时明确“平台最终消费的静态工件”口径：

- 平台/Devtools/Alignment Lab **只消费**控制面 Root IR：`ControlSurfaceManifest`（digest + 最小索引；按需加载 slices），见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`。
- Workflow 的 Static IR 是 Root IR 的 `workflowSurface` slice（$\Pi$ 的可导出形态）；手写 watcher 允许存在，但必须降级为 `opaque effect`（显式登记，禁止静默黑盒）。

为支撑“从意图逐层解压”的协作与出码，我们采用固定的分层链路（单一真相源）：

```text
Recipe（压缩输入，可选） / AI・Studio（可选直接出码）
  ↓ expand（纯数据，确定性）
Canonical AST（唯一规范形：无语法糖/默认值落地/显式分支/stepKey 完整）
  ↓ compile（纯数据，确定性）
Workflow Static IR（Π slice：version+digest+nodes/edges+InputExpr；供 Root IR 引用）
  ↓ bundle/index
ControlSurfaceManifest（Root IR：digest+effectsIndex；按需加载 slices）
  ↓ interpret
Runtime Execution Plan + Slim Trace（tickSeq 参考系锚点）
```

> 注：Canonical AST 是“语义规范形”（实现内）；Workflow Static IR 是可导出 slice；Root IR 是平台单一事实源（对齐 RunResult/Trace/Tape）。

## API Model（SSoT 分化 + DX 一体化）

为同时满足「平台/LLM 可落盘」与「Effect-native 的人类 DX」，v1 对外 API 采用“双层同心圆”：

1. **裁决层（SSoT）**：存在唯一权威的 `WorkflowDef`（纯 JSON、可 Schema 校验、版本化），作为 authoring 的单一事实源；所有语法糖（TS DSL / Recipe / Studio）都必须先 materialize 到 `WorkflowDef`，再进入 `normalize/validate/compile/export`。
2. **体验层（DX）**：对外暴露一个 Effect 风格的“值对象”`Workflow`，它本身可 `toJSON()` 导出 `WorkflowDef`，并提供冷路径方法 `validate()/exportStaticIr()/install(...)`。其方法只是对同一份 def 的编译操作，不引入第二语义。

硬约束（避免“IR 固定但表面任意”导致漂移）：

- 表面可以有任意语法糖，但语义必须 100% 确定性降糖到 Canonical AST（纯数据），禁止隐式降级为 opaque。
- `stepKey` 是稳定锚点与可解释地址：除了 Recipe 的确定性补全外，业务作者/平台出码必须显式提供；缺失/冲突一律 fail-fast（可机器修复）。

## Goals / Scope

### In Scope

- 提供 **WorkflowDef → Canonical AST → Static IR → mount/run** 的闭环：
  - 业务/平台用可落盘的 `WorkflowDef` 定义“触发源 + 操作步骤 + 并发/重试/超时策略”；
  - 运行时将其编译为可执行 watcher（复用既有 FlowRuntime 语义）；
  - 同时导出 Workflow Static IR（Π slice），并由 `ControlSurfaceManifest` 收口为平台可消费的 Root IR（事件只携带锚点与 digest 引用）。
- 组合性（build-time）：提供可复用/可组合的 authoring primitives（例如 fragment/compose/withPolicy），但其产物必须仍可被编译为单一 Static IR（禁止把组合性押在运行时闭包上）。
- 时间算子成为一等公民：`delay/timeout/retry` 必须：
  - 被 tick 参考系吸收（不产生影子调度）；
  - 进入 Dynamic Trace（至少能归因到 `tickSeq`）。
- 写侧安全：默认只允许通过 `dispatch` 产生可追踪写入；禁止把 direct state write 作为 Workflow 的主写路径（避免写逃逸破坏 txn/tick 纪律）。

### Out of Scope

- 在本特性内修改 Module 蓝图为“新增 flows 槽位”的最终形态：先提供可被 `Module.withLogic(...)` 挂载的 Program 形态，蓝图槽位作为后续 DX 演进（forward-only）。
- 把任意黑盒 Effect/Promise 代码自动提升为 IR（不做“自动反编译”）。
- 承诺黑盒 `Process.link` 的强一致（强一致仍只对可识别 IR 生效）。
- 完成 Root IR 的 actions/services/traits 收口实现细节（本特性只负责 workflowSurface 的 schema/导出/对齐口径；Root IR 合同在平台 SSoT 固化）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 声明式提交工作流（Priority: P1）

作为业务开发者，我希望用声明式 Program 表达：
“点击 submit → 调用 API → 成功后跳转路由 + 刷新某些 source/query”，而无需写 `$.onAction('submit')...` 的胶水 watcher。

**Why this priority**：这是最典型、最高频的 Action→Action 链路；它决定 Workflow 是否能替代手写逻辑成为主路径。

**Independent Test**：在一个最小模块中声明 submit Program，断言：
- 触发 submit 后发生一次 service call（可观测 EffectOp/service）；
- 成功分支 dispatch 出后续 action（或触发 router ExternalStore 更新）；
- Devtools 能导出该 Program 的 Static IR（节点/边 + 稳定 id）。

**Acceptance Scenarios**：

1. **Given** 模块声明了 submit Workflow，**When** dispatch `submit`，**Then** 按声明顺序执行 `call → dispatch(success) → navigate`，且所有事件能通过 `tickSeq` 关联。
2. **Given** API 返回失败，**When** dispatch `submit`，**Then** 进入 failure 分支（dispatch `submitFailed` 或等价），并且不会误触发 success side-effects。

---

### User Story 2 - 时间算子不再逃逸（Priority: P2）

作为业务开发者，我希望表达：
“onStart 后延迟 3 秒再 refresh”，并确保该延迟不通过黑盒 `setTimeout` 逃逸，而是被 tick 参考系解释与回放。

**Why this priority**：时间算子是“从牛顿到相对论”的分水岭：一旦允许影子时间线，tickSeq 的解释链就会断裂。

**Independent Test**：声明 delay Program 后，在测试时：
- `trace:tick.triggerSummary` 中能归因到 timer 触发；
- 重放/模拟时钟时能稳定复现触发顺序（不依赖真实时间）。

**Acceptance Scenarios**：

1. **Given** Program 含 `delay(3000ms)`，**When** runtime 时间推进 3 秒，**Then** 触发一次 refresh/dispatch，且事件归属于新的 `tickSeq`。

---

### User Story 3 - 可解释与可治理（Priority: P2）

作为 runtime/devtools 维护者，我希望：
- Workflow 有可导出的 Workflow Static IR（$\Pi$ slice；结构可视化、diff、审查），并能被 `ControlSurfaceManifest` 收口引用；
- 运行期有 Slim 的 trace（不把整张图塞进事件流）；
- diagnostics=off 时开销接近零。

**Independent Test**：在 diagnostics=off 与 on 下对比：
- off：不额外分配/不产出 Program 级 trace；
- on：可通过 tickSeq + EffectOp 链路解释“为何发生这次跳转/刷新”。

### Edge Cases

- Program 内部取消：latest/exhaust 并发策略下，旧请求如何中断与可解释？
- Program 中 call 抛出 defect vs 业务错误：错误通道与 trace 如何归因？
- SSR：若触发源来自 ExternalStore.getServerSnapshot，如何避免 hydration mismatch（遵循 073 合同）？

## Requirements _(mandatory)_

## Hard Decisions（v1 硬裁决：必须遵守）

为避免后续实现与出码“口径漂移”，v1 固化如下硬裁决（均为 fail-fast）：

1. **`call`（原 `serviceCall`）不提供结果数据流（v1）**：Workflow 只表达控制流（success/failure、并发/取消/时间）；任何“基于 service 结果计算后续 payload/条件分支”的需求必须下沉到 service（由 service 自己 dispatch/写 state），或拆成多个 Workflow 通过 action 串联。
2. **输入映射 DSL（v1）**：仅允许引用触发输入（`action.payload`）与纯结构组合（`payload.path/const/object/merge`）；不允许读取 state/traits，不允许条件/循环/算术运算。
3. **Canonical AST 强制 `stepKey` 必填**：所有 step 必须具备稳定 `stepKey`；缺失即 `validate/export` 失败；禁止用数组下标/遍历顺序派生（重排不得导致锚点漂移）。
4. **分支必须显式结构**：success/failure 必须以结构字段表达并编译为显式图边；禁止邻接推断作为真相源（避免重排改变语义）。
5. **`nodeId` 重构友好（v1）**：`nodeId` 必须主要由 `programId + stepKey (+kind)` 稳定派生（不依赖数组顺序/时间/随机/语义 hash）；可读性通过 `source(stepKey/fragmentId)` 提供；语义变化通过 `digest` 体现。
6. **诊断分级门控**：`diagnostics=off` 近零成本（不产出 Program 级 trace、不扫全图）；`light/sampled/full` 才逐步附带锚点 meta；运行期事件流严禁携带 IR 全量。
7. **版本治理严格 fail-fast**：`recipe/ast/ir` 均带版本；遇到未知版本必须拒绝并提示升级/迁移；forward-only 不提供运行时兼容层，迁移靠工具与文档。
8. **Root IR 收口（v1）**：平台/Devtools/Alignment Lab 只消费 `ControlSurfaceManifest`（digest + 最小索引；按需加载 slices）。Workflow 的 Workflow Static IR 必须作为 `workflowSurface` slice 被 Root IR 引用；禁止把“完整 IR 图”塞进运行期事件流。
9. **digest 算法统一（v1）**：所有 digest 必须使用 `stableStringify` + `fnv1a32`（实现权威：`packages/logix-core/src/internal/digest.ts`），并带 schema/version 前缀以避免碰撞；大对象常量必须受 budgets 约束并 deterministic 裁剪（可复用 `packages/logix-core/src/internal/observability/jsonValue.ts` 的 `oversized` 口径）。
10. **call 引用入口（v1）**：Platform-Grade/LLM 出码 MUST 使用 `callById('<serviceId>')`（字面量）；允许额外提供 `call(Tag)` 作为 TS sugar（本地 DX），但不得要求 Parser/Autofill 依赖解析 Tag 才能建立 `serviceId` 锚点。Static IR/Trace/Tape 中只存 `serviceId: string`，且派生/校验必须复用 078 的单点 helper（见 `specs/078-module-service-manifest/contracts/service-id.md`）。
11. **Platform-Grade 字面量锚点（v1）**：为保证 Parser/Autofill/回写的确定性，Platform-Grade/LLM 出码的 identity 字段 MUST 为字符串字面量（至少包含 `workflowLocalId` / `trigger.actionTag` / `steps[*].key` / `dispatch.actionTag` / `callById.serviceId`）。非字面量/经变量中转的写法允许存在，但必须视为 Raw Mode（不参与补全/回写）。
12. **step kind 最小完备集（v1）**：Workflow 的 stepKinds MUST 收敛为 `dispatch/call/delay` 三类；其它跨域副作用（navigate/toast/sourceRefresh 等）不得作为一等 step kind 引入，而必须作为 KernelPorts（service ports）通过 `callById('logix/kernel/<...>')` 表达（保证 serviceId 锚点、Port 对齐与可回放链路单一）。
13. **v1 仅控制流（无结果数据流/无表达式分支）**：`call` v1 不提供结果数据流；Workflow 内不提供条件分支/计算表达式。任何“基于 service 结果计算后续 payload/条件分支”的需求必须下沉到 service（由 service 自己 dispatch/写 state），或拆分为多个 Workflow 通过 action 串联（保持 IR 可导出/可回放/可诊断的单一事实源）。
14. **手写 watcher 的地位（v1）**：允许手写 watcher 作为逃生舱，但其必须显式登记为 `opaque effect`（进入 Root IR 的 `opaqueEffects`/索引），并在平台工具链中被视为 Gray/Black Box（可展示、可报告、但不可结构化编辑/不可自动回写）。

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Workflow 的声明式 DSL 与可导出的 Workflow Static IR（见 `contracts/ir.md`），并能被 mount 为运行时 watcher（复用既有 FlowRuntime 语义）；同时该 IR 必须能作为 `ControlSurfaceManifest.workflowSurface` slice 被 Root IR 引用（见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`）。
- **FR-002**: Workflow MUST 支持至少两类**显式触发源**：Action（dispatch）、Lifecycle（onStart/onInit 等）。时间触发来自 `delay/timeout/retry` 等时间算子（属于 Workflow 内部调度），且 timer schedule/fire/cancel 必须可归因到 `tickSeq`（参照 073 `trace:tick`）。
- **FR-003**: Workflow MUST 支持至少三类步骤：`dispatch`、`call`、`delay`；其中：
  - `dispatch` 是默认写侧（可追踪、可诊断、可预算）；
  - `call` 必须在事务窗口外执行（txn 禁 IO）；
  - `delay` 必须在 tick 参考系内调度（禁止影子 setTimeout）。
- **FR-004**: 系统 MUST 提供并发策略（至少 latest/exhaust/parallel）并与现有 FlowRuntime 语义一致；取消必须可解释（trace 能说明“为何被取消/被覆盖”）。
- **FR-005**: Workflow 的 Workflow Static IR MUST JSON 可序列化、带版本号与 digest；digest 算法与裁剪口径必须与 Root IR 一致（Stable JSON + budgets；见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`）。
- **FR-006**: Workflow 的 DSL MUST 支持结构化组合：可把常见工作流抽成 fragment 并 compose 成 Workflow；组合必须是 build-time（生成可序列化 Spec/IR），禁止依赖任意运行时闭包作为结构语义来源。
- **FR-007**: Workflow MUST 提供可被 Root IR 收口的最小索引信息：至少包含 `effectId/programId/trigger/sourceKey?` 等可回链字段；Root IR 默认只存 digest + `effectsIndex`，不得内嵌全量 nodes/edges 表（见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 tick/调度与 run 关键路径，必须补齐可复现的 perf evidence：至少覆盖 timer 触发 + call watcher 的 tick overhead（diagnostics off/on）。
- **NFR-002**: diagnostics=off 必须接近零成本：不得在每 tick 做 O(programNodes) 扫描；Program 级 trace 必须按需采样/按需启用。
- **NFR-003**: 标识去随机化：flowInstanceId/opSeq/tickSeq 的关联必须稳定可回放（禁止随机/时间默认作为主锚点）。
- **NFR-004**: 事务窗口禁 IO：Workflow 不得在 reducer/txn 内执行 call；任何违反必须 fail-fast 并产出诊断。
- **NFR-005**: 必须提供“优化阶梯”（默认 → 观察 → 收敛触发源/selector → 调参/拆分 Program），并与 073 的 tick 诊断口径对齐。

### Key Entities _(include if feature involves data)_

- **WorkflowDef**：可落盘的权威输入工件（纯 JSON；触发源 + 步骤 + 策略）。
- **Workflow Static IR（Π slice）**：编译后的可导出 IR（JSON 可序列化；nodes/edges + InputExpr + digest；作为 Root IR 的 `workflowSurface` slice）。
- **WorkflowRuntime**：运行期 mount 的 watcher 形态（复用 FlowRuntime/EffectOp；可关联 tickSeq）。
- **ControlSurfaceManifest（Root IR）**：平台消费的控制面静态工件（digest + effectsIndex；按需加载 slices），见 `docs/ssot/platform/contracts/03-control-surface-manifest.md`。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 用 Workflow 覆盖至少一个“submit → API → success → navigate/refresh”的端到端 demo，无需手写 `$.onAction('submit')...` 胶水。
- **SC-002**: delay/timeouts 不产生影子时间线：timer 触发必须出现在 `trace:tick.triggerSummary` 中并可回放。
- **SC-003**: diagnostics=off 时新增开销满足预算（见 plan.md 的 Perf Evidence Plan）。
