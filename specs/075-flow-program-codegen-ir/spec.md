# Feature Specification: FlowProgram Codegen IR（出码层：Canonical AST + Static IR）

**Feature Branch**: `075-flow-program-codegen-ir`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: 073 完成后的新视角：tick 是观测参考系；traits 是受限绑定；多步协议/时间算子属于自由编排，必须 IR 化并纳入 tick 证据链。

**Model (SSoT)**: `docs/ssot/platform/foundation/01-the-one.md`（`Π`/`C_T`/`Δ⊕`/tick 参考系）。

## Context

Logix 当前已经具备强大的“命令式”动态能力（`$.onAction().runLatest/runTask/...` + FlowRuntime），但它仍然存在两个结构性缺口：

1. **自由工作流缺少可导出的静态形态**：业务要表达“点击提交 → 调 API → 成功后跳转/刷新”，往往退回 `$.logic` 手写 watcher。代码能跑，但：
   - 依赖与因果链不可导出（Devtools 只能看运行期事件，缺“结构图”）；
   - 时间算子（delay/retry/timeout）容易变成黑盒 `setTimeout/Promise` 链，导致 replay/解释断链；
   - 难以在系统层做预算、降级与统一治理（每个 Flow 都是黑箱）。
2. **与 073 的 tick 参考系尚未“同一语言”**：073 明确 no-tearing 依赖 `RuntimeStore + tickSeq`；但自由工作流如果绕开 tick（影子时间线/影子调度），仍会把系统拉回“双真相源”与不可解释的状态组合。

因此需要一个**可编译、可导出、可诊断**的控制律表示：把“Action/事件 → 操作序列（服务调用/dispatch/延迟）”固化为 Program，并以 tick 作为证据与调度边界。

## Positioning（本次裁决：075 的主定位）

本特性将 **FlowProgram** 明确定位为 **AI/平台专属的出码层（IR DSL）**：

- 目标对象是“可导出/可 diff/可校验/可解释”的结构化产物，而不是“让人类手写更爽”的 DSL；
- 业务侧“少胶水”的收益主要来自 **Recipe/Studio/AI 生成**（或更高层 Pattern），而不是要求人类日常直接拼 IR 图；
- 运行时只消费编译后的 Static IR / 执行计划，不承担“解压/推导/修复”的逻辑；所有确定性与校验前置到导出期。

为支撑“从意图逐层解压”的协作与出码，我们采用固定的分层链路（单一真相源）：

```text
Recipe（压缩输入，可选） / AI・Studio（可选直接出码）
  ↓ expand（纯数据，确定性）
Canonical AST（唯一规范形：无语法糖/默认值落地/显式分支/stepKey 完整）
  ↓ compile（纯数据，确定性）
Static IR（version+digest+nodes/edges；给 Devtools/Alignment Lab 与 Runtime 消费）
  ↓ interpret
Runtime Execution Plan + Slim Trace（tickSeq 参考系锚点）
```

> 注：Canonical AST 是本特性裁决下的“语义规范形”；Static IR 是其可导出投影（不同层级，职责不同）。

## Goals / Scope

### In Scope

- 提供 **FlowProgramSpec → FlowProgramIR → mount/run** 的闭环：
  - 业务用声明式 DSL 定义“触发源 + 操作步骤 + 并发/重试/超时策略”；
  - 运行时将其编译为可执行 watcher（复用既有 FlowRuntime 语义）；
  - 同时导出最小 Static IR 供 Devtools/Alignment Lab 解释与 diff。
- 组合性（build-time）：提供可复用/可组合的 authoring primitives（例如 fragment/compose/withPolicy），但其产物必须仍可被编译为单一 Static IR（禁止把组合性押在运行时闭包上）。
- 时间算子成为一等公民：`delay/timeout/retry` 必须：
  - 被 tick 参考系吸收（不产生影子调度）；
  - 进入 Dynamic Trace（至少能归因到 `tickSeq`）。
- 写侧安全：默认只允许通过 `dispatch` 产生可追踪写入；禁止把 direct state write 作为 FlowProgram 的主写路径（避免写逃逸破坏 txn/tick 纪律）。

### Out of Scope

- 在本特性内修改 Module 蓝图为“新增 flows 槽位”的最终形态：先提供可被 `Module.withLogic(...)` 挂载的 Program 形态，蓝图槽位作为后续 DX 演进（forward-only）。
- 把任意黑盒 Effect/Promise 代码自动提升为 IR（不做“自动反编译”）。
- 承诺黑盒 `Process.link` 的强一致（强一致仍只对可识别 IR 生效）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 声明式提交工作流（Priority: P1）

作为业务开发者，我希望用声明式 Program 表达：
“点击 submit → 调用 API → 成功后跳转路由 + 刷新某些 source/query”，而无需写 `$.onAction('submit')...` 的胶水 watcher。

**Why this priority**：这是最典型、最高频的 Action→Action 链路；它决定 FlowProgram 是否能替代手写逻辑成为主路径。

**Independent Test**：在一个最小模块中声明 submit Program，断言：
- 触发 submit 后发生一次 service call（可观测 EffectOp/service）；
- 成功分支 dispatch 出后续 action（或触发 router ExternalStore 更新）；
- Devtools 能导出该 Program 的 Static IR（节点/边 + 稳定 id）。

**Acceptance Scenarios**：

1. **Given** 模块声明了 submit FlowProgram，**When** dispatch `submit`，**Then** 按声明顺序执行 `serviceCall → dispatch(success) → navigate`，且所有事件能通过 `tickSeq` 关联。
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
- FlowProgram 有可导出的 Static IR（结构可视化、diff、审查）；
- 运行期有 Slim 的 trace（不把整张图塞进事件流）；
- diagnostics=off 时开销接近零。

**Independent Test**：在 diagnostics=off 与 on 下对比：
- off：不额外分配/不产出 Program 级 trace；
- on：可通过 tickSeq + EffectOp 链路解释“为何发生这次跳转/刷新”。

### Edge Cases

- Program 内部取消：latest/exhaust 并发策略下，旧请求如何中断与可解释？
- Program 中 serviceCall 抛出 defect vs 业务错误：错误通道与 trace 如何归因？
- SSR：若触发源来自 ExternalStore.getServerSnapshot，如何避免 hydration mismatch（遵循 073 合同）？

## Requirements _(mandatory)_

## Hard Decisions（v1 硬裁决：必须遵守）

为避免后续实现与出码“口径漂移”，v1 固化如下硬裁决（均为 fail-fast）：

1. **`serviceCall` 不提供结果数据流（v1）**：FlowProgram 只表达控制流（success/failure、并发/取消/时间）；任何“基于 service 结果计算后续 payload/条件分支”的需求必须下沉到 service（由 service 自己 dispatch/写 state），或拆成多个 Program 通过 action 串联。
2. **输入映射 DSL（v1）**：仅允许引用触发输入（`action.payload`）与纯结构组合（`payload.path/const/object/merge`）；不允许读取 state/traits，不允许条件/循环/算术运算。
3. **Canonical AST 强制 `stepKey` 必填**：所有 step 必须具备稳定 `stepKey`；缺失即 `validate/export` 失败；禁止用数组下标/遍历顺序派生（重排不得导致锚点漂移）。
4. **分支必须显式结构**：success/failure 必须以结构字段表达并编译为显式图边；禁止邻接推断作为真相源（避免重排改变语义）。
5. **`nodeId` 以稳定 hash 为主锚点**：可读性通过 `source(stepKey/fragmentId)` 提供；禁止把可读串同时当作唯一主锚点（避免重命名导致对齐失效）。
6. **诊断分级门控**：`diagnostics=off` 近零成本（不产出 Program 级 trace、不扫全图）；`light/sampled/full` 才逐步附带锚点 meta；运行期事件流严禁携带 IR 全量。
7. **版本治理严格 fail-fast**：`recipe/ast/ir` 均带版本；遇到未知版本必须拒绝并提示升级/迁移；forward-only 不提供运行时兼容层，迁移靠工具与文档。

### Functional Requirements

- **FR-001**: 系统 MUST 提供 FlowProgram 的声明式 DSL 与可导出的 Static IR（见 `contracts/ir.md`），并能被 mount 为运行时 watcher（复用既有 FlowRuntime 语义）。
- **FR-002**: FlowProgram MUST 支持至少两类**显式触发源**：Action（dispatch）、Lifecycle（onStart/onInit 等）。时间触发来自 `delay/timeout/retry` 等时间算子（属于 Program 内部调度），且 timer schedule/fire/cancel 必须可归因到 `tickSeq`（参照 073 `trace:tick`）。
- **FR-003**: FlowProgram MUST 支持至少三类步骤：`dispatch`、`serviceCall`、`delay`；其中：
  - `dispatch` 是默认写侧（可追踪、可诊断、可预算）；
  - `serviceCall` 必须在事务窗口外执行（txn 禁 IO）；
  - `delay` 必须在 tick 参考系内调度（禁止影子 setTimeout）。
- **FR-004**: 系统 MUST 提供并发策略（至少 latest/exhaust/parallel）并与现有 FlowRuntime 语义一致；取消必须可解释（trace 能说明“为何被取消/被覆盖”）。
- **FR-005**: FlowProgram 的 Static IR MUST JSON 可序列化、带版本号与 digest；节点/边 id 与锚点必须去随机化（仅由稳定输入推导，禁止时间/随机默认）。
- **FR-006**: FlowProgram 的 DSL MUST 支持结构化组合：可把常见工作流抽成 fragment 并 compose 成 Program；组合必须是 build-time（生成可序列化 Spec/IR），禁止依赖任意运行时闭包作为结构语义来源。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 tick/调度与 run 关键路径，必须补齐可复现的 perf evidence：至少覆盖 timer 触发 + serviceCall watcher 的 tick overhead（diagnostics off/on）。
- **NFR-002**: diagnostics=off 必须接近零成本：不得在每 tick 做 O(programNodes) 扫描；Program 级 trace 必须按需采样/按需启用。
- **NFR-003**: 标识去随机化：flowInstanceId/opSeq/tickSeq 的关联必须稳定可回放（禁止随机/时间默认作为主锚点）。
- **NFR-004**: 事务窗口禁 IO：FlowProgram 不得在 reducer/txn 内执行 serviceCall；任何违反必须 fail-fast 并产出诊断。
- **NFR-005**: 必须提供“优化阶梯”（默认 → 观察 → 收敛触发源/selector → 调参/拆分 Program），并与 073 的 tick 诊断口径对齐。

### Key Entities _(include if feature involves data)_

- **FlowProgramSpec**：业务输入的声明式 DSL（触发源 + 步骤 + 策略）。
- **FlowProgramIR**：编译后的 Static IR（JSON 可序列化；节点/边 + digest；可导出）。
- **FlowProgramRuntime**：运行期 mount 的 watcher 形态（复用 FlowRuntime/EffectOp；可关联 tickSeq）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 用 FlowProgram 覆盖至少一个“submit → API → success → navigate/refresh”的端到端 demo，无需手写 `$.onAction('submit')...` 胶水。
- **SC-002**: delay/timeouts 不产生影子时间线：timer 触发必须出现在 `trace:tick.triggerSummary` 中并可回放。
- **SC-003**: diagnostics=off 时新增开销满足预算（见 plan.md 的 Perf Evidence Plan）。
