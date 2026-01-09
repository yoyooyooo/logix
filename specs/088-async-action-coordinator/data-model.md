# Data Model: 088 Async Action Coordinator

> 本文件定义 088 涉及的关键实体、标识规则与状态机，用于实现阶段对齐契约、测试与诊断事件（Slim/可序列化）。

## Identity Rules（稳定标识）

- `actionId`: Async Action 的稳定定义标识（稳定字符串；推荐 kebab-case）。用于合并/取消/聚合诊断；禁止依赖匿名函数地址/随机值。
- `linkId`（ActionRunId）: ActionRun 的主锚点，复用运行时既有的因果链锚点 `linkId`；必须可确定重建（instance-local 单调序号衍生）。
  - 推荐格式：`<instanceId>::o<opSeq>`（复用 `opSeq` 作为单调序号来源）。
- `txnSeq/txnId/opSeq`: 复用既有稳定锚点体系（见 `docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`）。

## Entities

### ActionDef（定义）

- `actionId: string`
- `label?: string`（用于 UI/Devtools 展示；默认可用 `actionId`）
- `concurrencyPolicy?: "latest-wins" | "queue" | "allow-concurrent"`（默认 `latest-wins`）
- `lane?: "urgent" | "nonUrgent"`（默认 `nonUrgent`；用于与 060 的 lane evidence 对齐）

### ActionRun（运行实例）

- `actionId: string`
- `linkId: string`（= ActionRunId）
- `status: "pending" | "success" | "failure" | "cancelled"`
- `startedAtMonoMs: number`（单调时钟）
- `settledAtMonoMs?: number`（单调时钟）
- `cancelReason?: "override" | "user" | "navigation" | "timeout" | "unknown"`
- `errorSummary?: SerializableErrorSummary`（仅在 `failure/defect` 场景；必须可序列化）
- `txnSeqs?: ReadonlyArray<number>`（可选：该 run 期间关联的 txnSeq 摘要；必须有界/可截断）

> 约束：
>
> - `status=pending` 必须在有限步内转为 settle（success/failure/cancelled），禁止悬挂。
> - “不可中止 IO”的结果必须通过 generation/linkId guard 丢弃，禁止污染当前 run。

### ActionOutcome（终态摘要）

- `kind: "success" | "failure" | "cancelled"`
- `errorSummary?: SerializableErrorSummary`

### AsyncActionEvent（Slim / Devtools）

用于解释 action run 的最小事件模型（导出必须 JsonValue）。

- `kind: "action"`
- `label: "async-action"`
- `linkId: string`（ActionRunId）
- `meta`: 见 `specs/088-async-action-coordinator/contracts/schemas/async-action-event-meta.schema.json`

## State Machine（最小）

```
idle
  └─ trigger → pending
pending
  ├─ settle(success) → settled
  ├─ settle(failure|defect) → settled
  └─ cancel(override|...) → settled(cancelled)
```

## Relationships

- ActionRun 是 087 路线的“协调锚点”：
  - 089 optimistic token 必须绑定到 action `linkId`。
  - 090 resource lifecycle 事件允许关联 initiator `linkId`（但缓存事实源仍以 `resourceKey` 为准）。
  - 091 busy 的事实源来自 ActionRun/Resource 的 pending。
  - 092 E2E trace 以 ActionRun 为主锚点串联 txn/notify/react commit。

