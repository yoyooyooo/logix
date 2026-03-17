# 1.0 DebugSink 接口（FiberRef 模型）

```ts
export interface TriggerRef {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type ReplayEventRef = ReplayLog.ReplayLogEvent & {
  readonly txnId?: string
  readonly trigger?: TriggerRef
}

export type Event =
  | {
      readonly type: "module:init"
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: "module:destroy"
      readonly moduleId?: string
      readonly instanceId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: "action:dispatch"
      readonly moduleId?: string
      readonly instanceId?: string
      readonly action: unknown
      readonly txnId?: string
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: "state:update"
      readonly moduleId?: string
      readonly instanceId?: string
      /**
       * 宿主内允许携带原始 state（便于本地调试/日志），但该对象图不得进入可导出事件。
       * DevtoolsHub / EvidencePackage 必须只存投影后的可序列化摘要。
       */
      readonly state: unknown
      readonly txnId?: string
      /**
       * 可选：本次提交聚合的 Patch 数量（来自 StateTransaction）；
       * - 仅在事务路径下由 Runtime 填充；
       * - Devtools 可用作事务概要信息的轻量指标。
       */
      readonly patchCount?: number
      /**
       * 可选：触发本次状态提交的事务来源种类（origin.kind）：
       * - 例如 "action" / "source-refresh" / "service-callback" / "devtools"；
       * - 仅在基于 StateTransaction 的路径下由 Runtime 填充；
       * - Devtools 可据此区分业务事务与 Devtools time-travel 操作。
       */
      readonly originKind?: string
      /**
       * 可选：触发本次状态提交的事务来源名称（origin.name）：
       * - 例如 action dispatch / fieldPath / task:success/task:failure 等；
       * - 仅在基于 StateTransaction 的路径下由 Runtime 填充。
       */
      readonly originName?: string
      /**
       * 预留：Trait 收敛摘要（用于 Devtools 展示窗口级统计/TopN 成本/降级原因等）。
       * - Phase 2：不锁死结构；
       * - 后续 Phase 会与 Trait/Replay 事件模型对齐为可解释结构。
       */
      readonly traitSummary?: unknown
      /**
       * 预留：本次事务关联的回放事件（ReplayLog 侧的 re-emit 事实源）。
       * - Phase 2：仅固化字段位；
       * - 后续 Phase 会与 ReplayLog.Event 结构对齐。
       */
      readonly replayEvent?: ReplayEventRef
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: "lifecycle:error"
      readonly moduleId?: string
      readonly instanceId?: string
      /**
       * 宿主内允许携带原始 cause，但该对象图不得进入可导出事件；
       * 导出形态必须降级为 errorSummary + downgrade。
       */
      readonly cause: unknown
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  | {
      readonly type: "diagnostic"
      readonly moduleId?: string
      readonly instanceId?: string
      readonly code: string
      readonly severity: "error" | "warning" | "info"
      readonly message: string
      readonly hint?: string
      readonly actionTag?: string
      readonly kind?: string
      readonly txnId?: string
      readonly trigger?: TriggerRef
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }
  /**
   * trace:* 事件：
   * - 作为运行时 trace / Playground / Alignment Lab 的扩展钩子；
   * - 当前只约定 type 前缀与 moduleId，具体 payload 结构由上层约定（例如 data 内挂 spanId/attributes 等）。
   */
  | {
      readonly type: `trace:${string}`
      readonly moduleId?: string
      readonly instanceId?: string
      readonly data?: unknown
      readonly runtimeLabel?: string
      readonly timestamp?: number
    }

export interface Sink {
  readonly record: (event: Event) => Effect.Effect<void>
}

// internal：唯一“真相”是 FiberRef.currentDebugSinks / currentRuntimeLabel
export const currentDebugSinks: FiberRef.FiberRef<ReadonlyArray<Sink>>
export const currentRuntimeLabel: FiberRef.FiberRef<string | undefined>
export const currentTxnId: FiberRef.FiberRef<string | undefined>
```

### 1.0.1 trace:module:\*（023 · Logic Traits in Setup）

023 引入“traits 来源/合并/冲突/冻结”的证据与锚点，统一通过 `trace:module:*` 事件对外广播（并在 DevtoolsHub/EvidencePackage 中可导出）：

- `trace:module:traits`（成功一次）：模块初始化 finalize 后发出最终 traits 快照摘要。
  - `data.digest: string`：稳定摘要（对相同输入稳定，用于对比/缓存/回放对齐）。
  - `data.count: number`：最终 traits 数量。
  - `data.traits?: Array<{ traitId; name; description? }>`：仅在 `diagnosticsLevel=full` 下携带（顺序确定）。
  - `data.provenanceIndex?: Record<traitId, { originType; originId; originIdKind; originLabel; path? }>`：仅在 `diagnosticsLevel=full` 下携带。
  - `light` 档位必须至少保留 `digest/count`（不得被裁剪为 `data: undefined`）。
- `trace:module:traits:conflict`（失败前一次）：在抛出 `ModuleTraitsConflictError` 之前发出冲突细节，避免依赖 `lifecycle:error` 的截断 message。
  - `data.conflictCount: number`：冲突条数。
  - `data.traitIds?: string[]`：`light` 下携带的 TopN traitId（用于快速定位）。
  - `data.conflicts?: Array<{ kind; traitId; sources; missing?; present? }>`：`full` 下携带全部冲突（sources 按 provenance 稳定排序）。
- `trace:module:descriptor`（既有事件补充锚点）：在 `data` 中补充 `traits?: { digest: string; count: number }` 作为关联锚点；`light` 档位必须至少保留 `traits + source`（避免完全裁剪）。

> 说明：以上 `data` 结构是 “Exportable / JsonValue hard gate” 的裁决口径；宿主内允许保留更丰富对象图，但不得进入 EvidencePackage。
