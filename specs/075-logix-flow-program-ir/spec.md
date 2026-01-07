# Feature Specification: FlowProgram IR（可编译控制律：Action→Action + 时间算子）

**Feature Branch**: `075-logix-flow-program-ir`  
**Created**: 2026-01-05  
**Status**: Draft  
**Input**: 073 完成后的新视角：tick 是观测参考系；traits 是受限绑定；多步协议/时间算子属于自由编排，必须 IR 化并纳入 tick 证据链。

**Model (SSoT)**: `docs/specs/sdd-platform/ssot/foundation/01-the-one.md`（`Π`/`C_T`/`Δ⊕`/tick 参考系）。

## Context

Logix 当前已经具备强大的“命令式”动态能力（`$.onAction().runLatest/runTask/...` + FlowRuntime），但它仍然存在两个结构性缺口：

1. **自由工作流缺少可导出的静态形态**：业务要表达“点击提交 → 调 API → 成功后跳转/刷新”，往往退回 `$.logic` 手写 watcher。代码能跑，但：
   - 依赖与因果链不可导出（Devtools 只能看运行期事件，缺“结构图”）；
   - 时间算子（delay/retry/timeout）容易变成黑盒 `setTimeout/Promise` 链，导致 replay/解释断链；
   - 难以在系统层做预算、降级与统一治理（每个 Flow 都是黑箱）。
2. **与 073 的 tick 参考系尚未“同一语言”**：073 明确 no-tearing 依赖 `RuntimeStore + tickSeq`；但自由工作流如果绕开 tick（影子时间线/影子调度），仍会把系统拉回“双真相源”与不可解释的状态组合。

因此需要一个**可编译、可导出、可诊断**的控制律表示：把“Action/事件 → 操作序列（服务调用/dispatch/延迟）”固化为 Program，并以 tick 作为证据与调度边界。

## Goals / Scope

### In Scope

- 提供 **FlowProgramSpec → FlowProgramIR → mount/run** 的闭环：
  - 业务用声明式 DSL 定义“触发源 + 操作步骤 + 并发/重试/超时策略”；
  - 运行时将其编译为可执行 watcher（复用既有 FlowRuntime 语义）；
  - 同时导出最小 Static IR 供 Devtools/Alignment Lab 解释与 diff。
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

### Functional Requirements

- **FR-001**: 系统 MUST 提供 FlowProgram 的声明式 DSL 与可导出的 Static IR（见 `contracts/ir.md`），并能被 mount 为运行时 watcher（复用既有 FlowRuntime 语义）。
- **FR-002**: FlowProgram MUST 支持至少三类触发源：Action（dispatch）、Lifecycle（onStart/onMount 等）、Timer（delay），并且所有触发都必须可归因到 `tickSeq`（参照 073 `trace:tick`）。
- **FR-003**: FlowProgram MUST 支持至少三类步骤：`dispatch`、`serviceCall`、`delay`；其中：
  - `dispatch` 是默认写侧（可追踪、可诊断、可预算）；
  - `serviceCall` 必须在事务窗口外执行（txn 禁 IO）；
  - `delay` 必须在 tick 参考系内调度（禁止影子 setTimeout）。
- **FR-004**: 系统 MUST 提供并发策略（至少 latest/exhaust/parallel）并与现有 FlowRuntime 语义一致；取消必须可解释（trace 能说明“为何被取消/被覆盖”）。
- **FR-005**: FlowProgram 的 Static IR MUST JSON 可序列化、带版本号与 digest；节点/边 id 与锚点必须去随机化（仅由稳定输入推导，禁止时间/随机默认）。

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
