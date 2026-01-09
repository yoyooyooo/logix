# Data Model: 060 Txn Lanes（事务后续工作优先级调度 / 可解释调度）

> 本文件定义 060 涉及的关键实体与关系，用于实现阶段对齐配置面、证据面与回归用例。

## Entities

### TxnLane

- `urgent`：必须优先完成的更新与工作
- `nonUrgent`：可延后但必须追平的更新与工作

### TxnLanePolicy

- `enabled: boolean`（默认 false）
- `budgetMs: number`（nonUrgent work loop 单片预算）
- `debounceMs: number`（合并窗口：聚合 nonUrgent 请求）
- `maxLagMs: number`（最长滞后上界：超过则触发饥饿保护）
- `allowCoalesce: boolean`（是否允许合并/取消中间态；默认 true）
- `configScope: "provider" | "runtime_module" | "runtime_default" | "builtin"`（生效来源，用于解释与回退）

> 默认值（建议，最终以实现为准）：
>
> - `maxLagMs` 初期建议与 043 对齐：`200ms`（见 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts` 的 builtin 默认值）。该值对应“交互仍高频时尽量让路、但空闲后尽快追平”的用户预期。
> - 对不同 Follow-up Work，可进一步细分默认上界（不扩展 public lane 枚举）：以 `TxnWorkKind` 作为分类键提供 `maxLagMsByKind`（可选 override）。例如：
>   - `notify:lowPriority`：建议 `≤50ms`（对齐 `packages/logix-react/src/internal/store/ModuleRuntimeExternalStore.ts` 的 lowPriorityMaxDelayMs 默认）；
>   - `trait:deferred_flush`：建议 `200ms`（对齐 043 的 time-slicing maxLag 默认）。

### TxnWorkKind

- `trait:deferred_flush`：043 deferred converge flush（首个落地的 nonUrgent Follow-up Work）
- `notify:lowPriority`：低优先级通知 flush（保持与现有 `meta.priority` 协同）
- `custom`：未来扩展（例如 selector graph 重算、watcher flush），但不得引入并行真相源

### TxnBacklogState（按实例隔离）

- `pendingCount: number`（当前积压 work item 数量或等价 proxy 指标）
- `dirtySummary?: { dirtyPathCount?: number }`（可选：仅用于解释，不作为正确性主锚点）
- `firstPendingAtMs?: number` / `firstPendingTxnSeq?: number`（用于 age/maxLag 判定；具体选用由实现裁决）
- `coalescedCount: number`（累计合并次数）
- `canceledCount: number`（累计取消次数）

### TxnLaneEvidence（Slim）

用于 Devtools/证据导出的可序列化摘要（不含闭包/Effect/大对象图）。

- `anchor`: `{ moduleId: string; instanceId: string; txnSeq: number; opSeq?: number }`
- `lane: TxnLane`
- `policy: TxnLanePolicy`
- `kind: TxnWorkKind`
- `backlog`: `{ pendingCount: number; ageMs?: number; coalescedCount?: number; canceledCount?: number }`
- `reasons: ReadonlyArray<string>`（有限枚举；用于解释“为何延后/为何合并/为何强制追平/为何让路”）
- `budget`: `{ budgetMs: number; sliceDurationMs?: number; yieldCount?: number }`
- `starvation`: `{ triggered: boolean; reason?: string }`

> Note：本 evidence 会与 Read Lanes（`specs/057-core-ng-static-deps-without-proxy/`）在同一处 Devtools 汇总视图中并排展示，因此字段命名/锚点/序列化口径必须保持一致性约束（避免 “lane” 被拆成两套协议）。

## Relationships

- TxnLanePolicy 影响 lane-aware queue 与 Work loop：决定 nonUrgent 的预算/合并/上界策略。
- TxnBacklogState 是 per-instance 的内部状态，但其摘要必须可被 TxnLaneEvidence 解释（在 diagnostics=light/sampled/full 下）。
- TxnLaneEvidence 必须与统一锚点体系对齐（016）：能用 `moduleId/instanceId/txnSeq/opSeq` 关联到 `state:update` 与 trait converge trace。
