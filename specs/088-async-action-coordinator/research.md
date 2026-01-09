# Research: 088 Async Action Coordinator

## Decision: Async Action 作为“一等公民协调单元”

**Chosen**: 用 ActionRun（pending/settle + 稳定标识）作为一次交互的异步链路抽象，对外提供最小可用 API；业务不再手写 loading/pending 状态机。

**Rationale**:

- 把“协调问题”从业务代码上移到框架层：Optimistic/Resource/Busy/Trace 都需要共享同一协调锚点，否则必然碎片化。
- 与 Logix 现有不变量天然对齐：事务窗口同步红线、实例级串行队列、Slim 诊断事件、稳定锚点（instance/txn/op/link）。

**Alternatives considered**:

- 仅靠 React startTransition/useOptimistic：业务痛苦且碎片化；无法形成统一的可诊断链路。
- 每个领域包各自实现 pending：并行真相源，不可统一可观测与性能门禁。

## Decision: “稳定标识贯穿”优先于“更丰富 payload”

**Chosen**: Devtools 事件优先输出稳定标识 + Slim 元信息（可序列化）；重 payload（如大对象/函数/Error）必须降级/裁剪。

**Rationale**:

- 可解释链路必须可序列化、可聚合、可回放；否则 Devtools 只能显示“看起来像日志”的碎片。

## Decision: ActionRunId 复用 `linkId`（不另造 runId）

**Chosen**: ActionRun 的主锚点直接复用 `linkId`（EffectOp 链路 id），保证可确定重建（instance-local 单调序号衍生）；避免引入第二套随机 runId。

**Rationale**:

- `linkId` 已是跨边界因果链锚点（FiberRef 单一事实源）；复用可避免并行真相源与额外传播成本。

## Decision: 默认并发策略为 `latest-wins`

**Chosen**: 同一 instance + `actionId` 默认 `latest-wins`：新 run 覆盖并取消旧 run；旧 run 必须 settle=`cancelled`（禁止悬挂）；不同 `actionId` 允许并发。需要队列/放开并发时，必须显式声明策略。

**Rationale**:

- UI 交互的默认期望通常是“最后一次输入生效”；统一默认可降低业务侧自写取消/合并的胶水概率。
