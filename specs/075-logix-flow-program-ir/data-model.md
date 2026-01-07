# Data Model: FlowProgram IR（统一最小 IR：Static IR + Dynamic Trace）

> 本文定义 FlowProgram 的“统一最小 IR”口径：Static IR 可导出/可比对；Dynamic Trace Slim 且可序列化，并以 tickSeq 作为参考系锚点。

## 1) Static IR（FlowProgram）

### 1.1 最小形态（V1）

```ts
type FlowProgramId = string
type FlowNodeId = string
type FlowEdge = { readonly from: FlowNodeId; readonly to: FlowNodeId }

type FlowTrigger =
  | { readonly kind: 'action'; readonly actionTag: string }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }
  | { readonly kind: 'timer'; readonly timerId: string }

type FlowStep =
  | { readonly kind: 'dispatch'; readonly actionTag: string }
  | { readonly kind: 'serviceCall'; readonly serviceId: string }
  | { readonly kind: 'delay'; readonly ms: number }
  | { readonly kind: 'sourceRefresh'; readonly fieldPath: string }

type ConcurrencyPolicy = 'latest' | 'exhaust' | 'parallel'

type FlowProgramStaticIrV1 = {
  readonly version: 1
  readonly programId: FlowProgramId
  readonly digest: string
  readonly triggers: ReadonlyArray<FlowTrigger>
  readonly nodes: ReadonlyArray<{
    readonly id: FlowNodeId
    readonly kind: 'trigger' | 'step'
    readonly trigger?: FlowTrigger
    readonly step?: FlowStep
  }>
  readonly edges: ReadonlyArray<FlowEdge>
  readonly policy?: {
    readonly concurrency?: ConcurrencyPolicy
    readonly priority?: 'urgent' | 'nonUrgent'
  }
  readonly meta?: Record<string, unknown> // JSON 可序列化（白名单）
}
```

### 1.2 不变量

- `programId/nodeId/digest` 必须去随机化：仅由稳定输入推导（禁止时间/随机默认）。
- IR 必须 JSON 可序列化；闭包/Effect 本体不得进入 IR。
- 允许 V1 先表达“线性链 + success/failure 分支”的子集；未来通过新增节点 kind 扩展（同 version 内新增可选字段，解析器忽略未知字段）。

## 2) Dynamic Trace（Slim，tickSeq 关联）

FlowProgram 运行期事件不新增“巨型事件流”，原则是复用既有边界：

- `EffectOp(kind='flow')`：Program watcher 的每次触发/运行
- `EffectOp(kind='service')`：serviceCall 的边界（成功/失败由错误通道/诊断字段表达）
- `trace:tick`：tick 的参考系锚点（由 073 定义）

最低要求：所有 Program 相关的 EffectOp/meta 必须能关联到：

- `tickSeq`（观测参考系）
- `moduleId/instanceId`（作用域）
- `programId/nodeId`（结构锚点）

### 2.1 在途态 I_t 的可解释锚点（不等于业务状态）

长期公式把系统状态扩展为 `Σ_t=(S_t, I_t)`，其中 `I_t` 是 in-flight（timers/fibers/backlog…）。FlowProgram 的运行期必须至少提供“锚点级”的可解释字段来覆盖 `I_t` 的关键分量：

```ts
type FlowRunId = string
type FlowTimerId = string

type FlowRunAnchor = {
  readonly programId: string
  readonly runId: FlowRunId
  readonly instanceId: string
  readonly tickSeq: number
}

type FlowTimerAnchor = {
  readonly timerId: FlowTimerId
  readonly runId: FlowRunId
  readonly ms: number
}

type FlowCancelAnchor = {
  readonly runId: FlowRunId
  readonly reason: 'latest.replaced' | 'exhaust.ignored' | 'shutdown' | 'timeout'
  readonly cancelledByRunId?: FlowRunId
}
```

约束：

- 这些锚点字段必须 Slim 且 JSON 可序列化。
- diagnostics=off 时不要求产出完整事件，但内部仍会维护 `I_t`；diagnostics=on 时必须足以回答“为何被取消/为何 delay 没发生/为何此刻触发”。

## 3) Timer（禁止影子时间线）

`delay(ms)` 的调度必须通过可注入的时间源（TimerService/TestClock），并满足：

- schedule/cancel/fired 都可归因到 tickSeq（或能通过 tickSeq + timerId 关联）。
- 不允许默认直接使用 `setTimeout` 作为核心业务时间算子（否则 replay/解释断链）。
