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
- 注意：这里的 partial fixpoint 是 **business-level** 的“未完全收敛”，不等价于 React 语境下的 tearing。073 的 tearing 定义为“同一次 render/commit 内读到来自不同 tick/token 的混合快照”，这属于订阅真相源破坏，必须被 RuntimeStore 消灭。
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

## 3) 可选：`warn:priority-inversion`（nonUrgent + 有订阅者）

当 tick 因预算/循环等原因推迟了 nonUrgent backlog，或某个 topic 明确被标注为 nonUrgent 且存在 React 订阅者时，Devtools 需要一个 Slim 的 Warn 来回答“为什么 UI 看起来在等”。

约束：

- 只在 diagnostics=light/full 发出（diagnostics=off 不引入任何成本）。
- 不要求定位到具体组件（避免在渲染路径做昂贵采样），但必须能指到 module/instance/selectorId（若有）。

概念载荷：

```ts
type WarnPriorityInversion = {
  type: "warn:priority-inversion"
  tickSeq: number
  reason: "deferredBacklog" | "subscribedNonUrgent"
  moduleId?: string
  instanceId?: string
  selectorId?: string
}
```

Devtools 呈现建议（非合同约束）：

- Tick Timeline：当同一 `tickSeq` 出现 `warn:priority-inversion`，该 tick 行高亮（Warn 色）并展示 `reason + moduleId/instanceId/selectorId?` 的最小摘要（hover/侧栏详情）。
- 关联链路：点击该 Warn 应能跳转/过滤到同 `tickSeq` 的 `trace:tick`（尤其 `backlog.deferredPrimary`）以解释“谁被推迟/为何被推迟”。

## 4) 与既有事件的协同

- `state:update`：继续作为模块级提交证据；建议在需要时携带 `commitMode`（如 `tick:flush`）并能关联 `tickSeq`（避免并行真相源）。
- `trace:react-selector`：React commit 后上报（已存在）；应能回溯到当次 render 所见 `tickSeq`（用于定位 tearing）。

## 5) Time Travel / Replay（对齐口径）

- 回放必须以 tick 为最小可观察单位：强制对齐到 `tickSeq`（tick 边界）。
- 允许回放到 `result.stable=false` 的 tick（partial fixpoint），但仍是“一个 tick 的对外快照”，UI 无 tearing 语义仍成立。
- 不提供“回放到 tick 中间态并绑定 UI”的能力；如需排查中间态，仅允许 inspect/debug（不承诺 UI 不撕裂）。

## 6) 优化阶梯（NFR-005）

当引入预算/自动调度策略（tick 稳定化、coalesce 等）后，需要一条从“默认可用”到“可控可解释”的操作路径：**默认 → 观察 → 收敛 deps/selector → 调参/拆分**。本节把这条梯子固化为可执行的检查点，并明确每一步依赖哪些诊断证据。

### 6.1 默认（不调参）

- 以 `diagnostics=off` 为默认档：不产出 `trace:tick` 也不影响正确性；性能回归以 perf evidence gate 为准。
- 仅在必须的 bug/边界情况下打开 `diagnostics=light`（例如定位 tearing / tick 不稳定 / notify 风暴）。

### 6.2 观察（打开证据）

- 打开 `diagnostics=light`，优先看同一 `tickSeq` 的 `trace:tick`（`start/settled/budgetExceeded`）三类信息：
  - `budget.*`：时间/步数/txnCount 是否触顶；
  - `backlog.*`：哪些工作被推迟（尤其 `backlog.deferredPrimary`）；
  - `result.stable/degradeReason`：是否发生 partial fixpoint、原因是什么。
- 若出现 `warn:priority-inversion`：先确认是否把“有 UI 订阅者的链路”错误标成 nonUrgent，或预算/合并策略过于激进（导致长期 deferred）。

### 6.3 收敛依赖（减少 churn / 降低不必要唤醒）

- 优先收敛 selector：
  - `ReadQuery` static lane + 有 `readsDigest` 的 selector 才进入 selector-topic；否则回退到 module-topic（保证正确性，但不承诺零开销）。
  - 尽量避免“动态 selector 在每次 render 变形”导致的 topic churn（会表现为 retained 增长/notify 风暴）。
- ExternalStoreTrait：
  - 优先使用 `select/equals` 限制写回抖动（只让“业务可见变化”进入 committed 写回）。
  - listener 始终坚持 Signal Dirty（去重调度），避免把 payload 变成 task queue 风暴。

### 6.4 调参（只动明确旋钮）

- Lane：
  - 默认 urgent（输入/交互触发、external input 写回）；仅把“可延后链路”显式降级为 nonUrgent。
  - 预算降级只允许推迟 nonUrgent backlog；urgent 不得被推迟（否则会表现为 `warn:priority-inversion` 或长时间 deferred）。
- Budget：
  - 先调 `maxSteps/maxMs`（配合 `degradeReason`）验证“是否只是阈值过紧”；避免盲目扩大导致 UI 卡顿。
- Coalesce：
  - 仅允许在“写回层”做 pre-write 聚合：raw snapshot 允许变，committed 写回与 tick flush 才是对外可见单位；避免引入“未 notify 但可观测值已变化”的心智裂缝。

### 6.5 拆分与结构治理（长期解法）

- 若持续出现 `budgetExceeded` / backlog 常驻：优先拆分依赖链（减少跨模块依赖边数量、缩短 fixpoint 路径），而不是无限加预算。
- 若出现 retained 增长：优先检查 topic facade 的生命周期（listeners=0 必须 detach + cache 移除），再考虑引入上限策略（LRU/TTL）并纳入 retained gate。
