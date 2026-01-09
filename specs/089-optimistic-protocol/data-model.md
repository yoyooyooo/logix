# Data Model: 089 Optimistic Protocol

> 本文件定义 089 涉及的关键实体、标识规则与回滚语义，用于实现阶段对齐协议、测试与诊断事件（Slim/可序列化）。

## Identity Rules（稳定标识）

- `linkId`（ActionRunId）: 来自 088 的 ActionRun 锚点（复用 `linkId`）。
- `optimisticId`: 必须可确定重建（禁止 random/time 默认）；从 `linkId` + instance-local 单调序号派生。
  - 推荐格式：`<linkId>::p<seq>`。

## Entities

### OptimisticToken（运行期 token）

- `optimisticId: string`
- `linkId: string`（所属 action run）
- `status: "applied" | "confirmed" | "rolledBack"`
- `appliedAtTxnSeq?: number`（可选：apply 所在 txn）
- `settledAtTxnSeq?: number`（可选：confirm/rollback 所在 txn）
- `reason?: "success" | "failure" | "cancel" | "override" | "unknown"`（主要用于 rollback 解释）

### OptimisticInverse（可回滚记录）

> 目标：保证 rollback 在有限步内可完成。

- `changes: ReadonlyArray<{ path: ReadonlyArray<string>; before: unknown }>`（或等价“反向 patch”）
- 约束：必须有界（路径条目数/深度/总体体积有上界，超出必须拒绝或明确裁决为 override 并清理旧 token）。

### OptimisticOutcome（终态摘要）

- `kind: "confirmed" | "rolledBack"`
- `reason?: "success" | "failure" | "cancel" | "override" | "unknown"`

## Protocol Rules（强约束）

- **绑定**：optimistic 必须绑定到 ActionRun（088），并继承其取消/覆盖语义。
- **回滚顺序**：同一 instance 内 token 管理采用栈语义，**回滚强制 LIFO**（后入先出）。
- **幂等**：confirm/rollback 必须幂等（对已 settle token 只能 no-op）。
- **乱序防护**：confirm/rollback 必须按 optimisticId 精确匹配；乱序返回不得影响其他 token。

## Relationships

- OptimisticToken 的 apply/confirm/rollback 事件必须可关联到：
  - `linkId`（ActionRun）
  - `txnSeq/txnId`（事务锚点）
  - `opSeq`（边界操作序列；可选但推荐用于更细粒度关联）

