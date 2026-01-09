# Feature Specification: Async Action Coordinator（统一异步 Action 协调面）

**Feature Branch**: `088-async-action-coordinator`  
**Created**: 2026-01-10  
**Status**: Draft  
**Input**: 新增 Async Action / Transition 协调抽象：为一次用户交互的异步链路提供统一的 pending/完成/失败/取消语义，并绑定稳定标识（linkId/txnId/opSeq）；React 与 Devtools 可基于统一事件模型呈现忙碌/进度与因果链路，业务代码只声明 action 而不再手写 loading 协调。

## Context

Logix 目前已经具备：

- 实例级串行队列 + 事务窗口（避免写竞态；commit 0/1 次通知）。
- `dispatchLowPriority` + React ExternalStore 的低优先级通知调度（减少高频渲染压力）。
- `RuntimeProvider` 的 `suspend/sync/defer` 冷启动策略与统一 fallback（让“默认异步”成为可能）。
- 稳定锚点与 Slim 诊断事件（`instanceId/txnSeq/opSeq/linkId` 等可串因果链）。

但业务侧仍缺一个“框架层默认存在”的协调单元：一次交互触发的 **异步链路**（pending → IO → writeback → settle）。缺口导致：

- loading/pending 分散在各处（闪烁、过度反馈、状态难以解释）。
- optimistic、资源加载、busy 指示、错误重试/取消等语义无法共享同一条因果链与稳定标识。

本特性以 “Async Action” 为一等公民，把异步链路的协调复杂性收敛到 Runtime/React/Devtools 层，业务只声明“做什么”。

## Terminology

- **Async Action**：一次用户交互触发的异步链路（可包含 0..N 次事务写入 + 0..N 次 IO），但对外呈现为一个可解释、可跟踪的协调单元。
- **ActionId**：Async Action 的稳定定义标识（稳定字符串），用于合并/取消/诊断聚合；不得依赖匿名函数地址或随机值。
- **Action Run**：某一次 Async Action 的具体运行实例（一次点击/一次提交），需要稳定标识并可取消/可收敛。
- **Pending**：Action Run 的“未完成”状态；用于 UI busy/disabled、诊断与调度。
- **Settle**：Action Run 的终态（success/failure/cancelled），必须可解释并可与事务/EffectOp 链路对齐。

## Assumptions

- 事务窗口仍是同步红线：事务窗口内禁止 IO/await；异步必须拆分为多段事务（pending 事务 → IO → 回写事务）。
- 诊断默认近零成本：`diagnostics=off` 下不得引入常驻分配/深拷贝。
- 稳定标识去随机化：不得依赖 random/time 默认；链路必须可复现。

## Clarifications

### Session 2026-01-10

- AUTO: Q: ActionRun 的稳定锚点是什么？ → A: 复用 `linkId` 作为 ActionRunId；`linkId` MUST 可确定重建（instance-local 单调序号衍生），推荐格式 `<instanceId>::o<opSeq>`；不新增随机 runId。
- AUTO: Q: Async Action 是否必须显式 `actionId`？ → A: 必须；`actionId` MUST 为稳定字符串，用于合并/取消/诊断聚合（不得依赖匿名函数地址/随机值）。
- AUTO: Q: 同一 `actionId` 的默认并发/覆盖策略？ → A: 默认 `latest-wins`：新 run 覆盖并取消旧 run，旧 run 必须 settle=`cancelled`（禁止悬挂）；不同 `actionId` 允许并发；如需队列/并发放开，必须显式声明策略。
- AUTO: Q: 取消与乱序如何裁决？ → A: 取消必须尽量传播到 IO（优先 AbortController）；无法中止时必须用 generation/linkId guard 丢弃旧结果，禁止污染当前 run。
- AUTO: Q: 失败语义如何分类？ → A: 明确区分业务错误（settle=`failure`，输出可序列化 errorSummary）与 defect（非预期 throwable / Promise reject；同样输出可序列化 errorSummary，但类别为 defect）；禁止把不可序列化对象塞进 exportable payload。
- AUTO: Q: action 事件模型的最小集合是什么？ → A: 至少包含 `action:trigger`、`action:pending`、`action:settle`；事件必须 Slim/JsonValue，且可通过稳定锚点字段关联到 `txnSeq/txnId/opSeq`。
- AUTO: Q: ActionRun 状态是否允许业务写入？ → A: 不允许；业务不可写 `SubscriptionRef`/快照源；React 侧以 Viewer hooks 消费快照并触发 action（避免 useEffect 数据胶水）。

### Session 2026-01-12

- Q: Async Action 的“业务实现函数”接口选哪种？ → A: 同时支持 `Effect` 与 `Promise/async`，但 SSoT 是 `Effect`；Promise 仅通过显式 adapter 接入，且 reject 默认归为 defect，除非被映射为业务错误。

## Out of Scope

- Optimistic 具体协议（由 `specs/089-optimistic-protocol/` 负责）。
- Resource/Query 的缓存/去重/预取策略（由 `specs/090-suspense-resource-query/` 负责）。
- Busy 指示的 UX 策略（阈值/最短时长/防闪烁）（由 `specs/091-busy-indicator-policy/` 负责）。
- 端到端渲染/paint 级别采样与归因（由 `specs/092-e2e-latency-trace/` 负责）。

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 业务只声明 action，不再手写 loading 协调（Priority: P1）

作为业务开发者，我可以把一个“异步行为”声明为 Async Action，并在 UI 中直接触发它；框架自动提供 pending/disabled/busy 协调，且不会制造闪烁或不可解释的中间态。

**Why this priority**: 这是后续 optimistic/resource/busy/trace 的共同基座；没有统一 action 协调面，后续能力会各自为政。

**Independent Test**: 在一个最小示例（按钮触发一次异步请求/延时）中，只写“触发 action”，即可观察到 pending/settle 的稳定状态变化与一次性提交（不需要业务手写计时器/多处 setLoading）。

**Acceptance Scenarios**:

1. **Given** 一个 action 触发后会进行一次异步 IO 并回写 state，**When** 用户触发 action，**Then** 系统立即进入 pending（可被 UI 观察到），且 IO 结束后进入 settle 并完成回写。
2. **Given** 用户连续快速触发同一 action，**When** 新 run 覆盖旧 run（按策略合并/取消），**Then** 系统可解释地取消/收敛旧 run，不产生“悬挂的 pending”。

---

### User Story 2 - Devtools 能解释一次 action 的因果链（Priority: P2）

作为开发/排障人员，我能在 Devtools/诊断事件中看到一次 action run 的完整因果链：是谁触发、何时 pending、等待了什么、写回了哪些事务、最终以何种结果 settle。

**Why this priority**: “协调问题”最终要落到可解释链路，否则只是在 UI 上更好看但无法定位问题。

**Independent Test**: 在示例中触发 success/failure/cancel 三种路径，Devtools 事件能用稳定标识把它们串起来，并且事件 payload Slim/可序列化。

**Acceptance Scenarios**:

1. **Given** action run 触发了至少一次事务提交，**When** 查看诊断事件，**Then** 能把该事务（txnSeq/txnId）与 action run（linkId 或等价稳定 id）关联起来。
2. **Given** action run 失败（业务错误），**When** 查看诊断事件，**Then** 能看到可序列化的错误摘要与失败原因分类（不把不可序列化对象塞进 payload）。

---

### User Story 3 - 设计系统/路由能用 Action Props 接入（Priority: P3）

作为框架/组件库维护者，我能把 Async Action 暴露为“Action Props”风格的能力：组件接收一个异步 action，自动处理 pending 与禁用态；路由/入口层可以默认异步并把导航作为 action run。

**Why this priority**: 把复杂性封装到框架/设计系统层，业务不再到处写 `startTransition/useOptimistic` 等碎片化逻辑。

**Independent Test**: 一个按钮组件只接收 action（不接收 loading/pending 布尔），仍能呈现一致的 pending 状态；路由导航作为 action run 时也能被诊断链路解释。

**Acceptance Scenarios**:

1. **Given** 一个组件只接收 action 函数，**When** action pending，**Then** 组件能稳定展示“忙碌/禁用”状态并在 settle 时恢复。

---

### Edge Cases

- 快速成功（< busy 阈值）与慢速成功（> 阈值）对 UI 的差异应由统一策略控制（busy 策略在 091 裁决，但 088 必须提供足够的信号/事件以支持）。
- 并发与幂等：同一 action 的多次触发如何合并/取消；不同 action 并发时 pending 的聚合/隔离语义。
- 失败语义：业务错误 vs defect；是否允许 retry；失败后是否保留 lastError（可诊断）但不强迫业务渲染。
- 取消：用户主动取消、路由切换导致取消、后续 run 覆盖旧 run；必须避免“永不 settle”的悬挂状态。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 Async Action 的对外语义：pending → settle（success/failure/cancelled），并能在业务侧以最小 API 触发与观测；Action 的业务实现 SSoT MUST 为 `Effect`，并提供 `Promise/async` 的显式 adapter 接入（reject 默认归为 defect，除非显式映射为业务错误）。
- **FR-002**: 系统 MUST 为每个 Action Run 分配稳定标识，并与稳定锚点贯穿：ActionRunId MUST 复用 `linkId`（可确定重建），并能串起该 run 期间的 `txnSeq/txnId` 与关键边界操作 `opSeq`（或等价字段）；每个 Async Action MUST 有稳定 `actionId`。
- **FR-003**: 系统 MUST 支持取消与收敛：默认支持同一 `actionId` 的 `latest-wins` 覆盖取消语义，并保证旧 run 最终 settle=`cancelled`（禁止悬挂）；乱序/不可中止 IO 不得污染当前 run。
- **FR-004**: 系统 MUST 保证事务边界：任何 IO/async 必须发生在事务窗口之外；pending/回写必须通过事务提交表达（0/1 commit 通知）。
- **FR-005**: 系统 MUST 向诊断/Devtools 输出 Slim、可序列化的 action 事件，能解释“谁触发/等了什么/写回了什么/为何 settle”，并与稳定标识对齐。
- **FR-006**: 系统 MUST 提供框架层接入点：支持设计系统的 Action Props 模式与路由/入口的默认异步（具体 busy/transition 策略由 091/090 裁决，但 088 必须提供统一协调信号）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 本特性触及 Runtime/React/Devtools 关键链路，MUST 定义性能预算并产出可复现基线（before/after/diff），预算与证据落点写入 `specs/088-async-action-coordinator/plan.md`。
- **NFR-002**: `diagnostics=off` 下新增能力必须接近零成本：不得引入常驻分配；不得在每次 dispatch/commit 上无条件构造事件 payload。
- **NFR-003**: 所有 action 相关标识 MUST 稳定、可复现（禁止 random/time 默认），并能与现有锚点对齐。
- **NFR-004**: React 一致性 MUST 可证明：同一 render/commit 中读取到的 action 状态与模块快照必须锚定在同一稳定版本（避免双真相源/tearing）。
- **NFR-005**: 若引入新的对外心智模型（Async Action），必须同步补齐文档（≤5 关键词 + 粗成本模型 + 优化梯子），并保证术语与诊断/证据字段一致。

### Key Entities _(include if feature involves data)_

- **ActionRun**：一次 action 的运行实例（pending/settle + 稳定标识 + 可取消语义）。
- **ActionOutcome**：run 的终态摘要（success/failure/cancelled + 可序列化错误摘要）。
- **ActionTrace (Slim)**：面向诊断/Devtools 的事件模型（可序列化、与锚点对齐）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 在一个最小示例中（一次按钮触发 async IO + 回写），业务代码不再需要手写 pending 状态机：只声明 action 即可观察 pending→settle，并满足“事务窗口禁 IO”。
- **SC-002**: Devtools/诊断事件能把一次 run 串成单条因果链：包含触发源、pending/settle、关联 txn 与错误摘要（可序列化），并能 drill-down 到稳定锚点。
- **SC-003**: `diagnostics=off` 下的性能证据达标：新增 action 协调能力对核心路径（dispatch/commit/notify）的 p95 与分配无显著回归（阈值在 plan.md 固化）。
