# Contracts: Diagnostics（trace:tick 与外部输入证据）

> 本文定义本特性新增/调整的诊断事件口径。要求：Slim、可序列化；diagnostics=off 接近零成本。

## 1) `trace:tick`

Tick 是一致性与解释的基本单位：外部输入 ingest、跨模块联动、收敛与 flush 都必须能归因到某个 tick。

### 1.1 事件形态（概念）

```ts
type TraceTickPhase = "start" | "settled" | "budgetExceeded"

type TraceTick = {
  type: "trace:tick"
  runtimeLabel?: string
  tickSeq: number
  phase: TraceTickPhase
  timestampMs: number

  // 触发源摘要（light: summary；full: 可选附带 samples）
  triggerSummary?: {
    total: number
    kinds: ReadonlyArray<{ kind: "externalStore" | "dispatch" | "timer" | "unknown"; count: number }>
    /** light 模式下最多携带 1 个 primary 触发源样本（用于回答“为何发生”） */
    primary?: {
      kind: "externalStore" | "dispatch" | "timer" | "unknown"
      moduleId?: string
      instanceId?: string
      fieldPath?: string
      actionTag?: string
    }
    /** 可选：用于 full 模式下的去重/对齐（不要放长数组） */
    digest?: { count: number; hash: number }
  }

  // 关联锚点（至少其一可用）
  anchors?: {
    moduleId?: string
    instanceId?: string
    txnSeq?: number
    txnId?: string
    opSeq?: number
  }

  // 预算与降级（仅 budgetExceeded/settled 可能出现）
  budget?: {
    maxMs?: number
    maxSteps?: number
    maxTxnCount?: number
    elapsedMs?: number
    steps?: number
    txnCount?: number
  }

  // backlog 摘要（必须 Slim）
  backlog?: {
    pendingExternalInputs?: number
    pendingLinkNodes?: number
    pendingDeferredWork?: number
    /** light 模式下最多携带 1 个 deferred work 的样本（用于回答“哪些被推迟了”） */
    deferredPrimary?: {
      kind: "externalStore" | "link" | "source" | "unknown"
      moduleId?: string
      instanceId?: string
      fieldPath?: string
      storeId?: string
    }
  }

  // 稳定化结果
  result?: {
    stable: boolean
    degradeReason?: "budget_ms" | "budget_steps" | "budget_txnCount" | "cycle_detected" | "unknown"
  }
}
```

语义补充：

- `result.stable=true`：本 tick 达到 fixpoint（在预算内 drain 到空）。
- `result.stable=false`：本 tick 发生软降级，允许暴露 **partial fixpoint**（例如 nonUrgent backlog 被推迟导致 A(新)+B(旧)）；系统保证 no-tearing（tickSeq）但一致性降级为最终一致性，必须在后续 tick 追赶并保持可解释证据。
- 若 `result.stable=false` 且推迟工作包含 nonUrgent external input，`backlog.deferredPrimary` 应优先指向该 externalStore（`storeId/fieldPath`），以便 Devtools 在 Warn 级别下回答“关键数据为何延迟”（diagnostics=off 不产出）。
- Devtools 呈现建议：`result.stable=false` 默认标记为 Warn；若 `degradeReason="cycle_detected"`（或连续多次 budgetExceeded）可升级为 Error（可配置）。

### 1.2 成本门控

- diagnostics=off：不得分配大型对象、不得在每 tick 做 O(n) 扫描；允许完全不发 `trace:tick`（或仅在严重异常/预算触发时发极简事件）。
- diagnostics=light：允许发出 `trace:tick`，但只携带 `triggerSummary`（count+primary）等 Slim 字段；不得附带触发源长列表。
- diagnostics=full：允许附带更完整的 samples（仍需裁剪与上限），但完整 IR/图仍必须通过 Static IR export（digest 引用）处理，不进入事件流。

## 2) 可选：`trace:external-store`（外部输入 ingest）

外部输入 ingest 属于高频路径，默认不建议逐事件记录；但在调试 tearing/抖动时需要最小可解释链路。

推荐策略：

- diagnostics=light/full：仅记录“合并后的一次 ingest”（每 tick 每 store 最多 1 条）
- diagnostics=off：默认不记录

载荷建议（概念）：

```ts
type TraceExternalStoreIngest = {
  type: "trace:external-store:ingest"
  tickSeq: number
  storeId: string
  moduleId?: string
  instanceId?: string
  wrote: boolean
  coalescedCount?: number
  priority?: "urgent" | "nonUrgent"
}
```

## 3) 与既有事件的协同

- `state:update`：继续作为模块级提交证据；建议在需要时携带 `commitMode`（如 `tick:flush`）并能关联 `tickSeq`（避免并行真相源）。
- `trace:react-selector`：React commit 后上报（已存在）；应能回溯到当次 render 所见 `tickSeq`（用于定位 tearing）。

## 4) Time Travel / Replay（对齐口径）

- 回放必须以 tick 为最小可观察单位：强制对齐到 `tickSeq`（tick 边界）。
- 允许回放到 `result.stable=false` 的 tick（partial fixpoint），但仍是“一个 tick 的对外快照”，UI 无 tearing 语义仍成立。
- 不提供“回放到 tick 中间态并绑定 UI”的能力；如需排查中间态，仅允许 inspect/debug（不承诺 UI 不撕裂）。
