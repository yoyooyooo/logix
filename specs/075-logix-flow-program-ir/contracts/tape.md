# Contracts: Tape（可回放磁带：Record/Replay/Fork）

> 本文定义 **Tape（磁带）** 的口径：它不是诊断 Trace，也不是 Static IR；它是让 Logix 拥有“可控时间线（快进/倒退/分叉）”能力所需的 **最小可回放记录**。
>
> 公式基线：`docs/specs/sdd-platform/ssot/foundation/01-the-one.md`（含 `Σ_t=(S_t,I_t)` 扩展与 Tape 口径）。

## 0) 三种产物必须区分（避免漂移）

- **Static IR（结构）**：`FlowProgramStaticIr` 描述 “可能发生什么”（节点/边/策略）。用于可视化、diff、审查。
- **Tape（回放）**：描述 “实际发生了什么” 且 **足以 deterministic replay**（给定 tape，重放不依赖真实 IO/真实时间/随机）。
- **Trace（解释）**：Slim 的诊断事件流（可采样/可丢弃/可合并），用于回答“为什么”，但 **不保证可回放完整性**。

本特性（075）负责把 Program 的时间/并发/IO 边界变成“可 record/replay 的节点”，从而让 Tape 成为可能。

## 1) Tape 的本质：开放系统边界的“客观记录”

Logix runtime 是开放系统：它与环境交换信息（外部输入、IO 结果、定时器 fire）。要做到时间旅行，必须把这些不确定性交换 **事件化并记录**，使 replay 时环境退化为“按 tape 驱动的确定性 oracle”。

在系统方程里，Tape 至少要覆盖：

- `E_t`：进入系统的事件（Action、ExternalStore snapshot、timer fire、IO outcome…）
- `Δ`：事务提交的状态增量（patch + dirtyPaths + txnSeq）
- `I_t`：关键在途态的可解释锚点变化（timers/fibers/backlog/cancel…）——不必等同业务数据，但必须能回答“为何没发生/为何被取消/为何此刻触发”

## 2) 最小 Tape Record（V1，JSON 可序列化）

> 这是 **工作模型**：字段允许迭代，但必须满足“可回放 + 稳定锚点 + 可预算”。

### 2.1 锚点（必须去随机化）

- `tickSeq`：观测参考系（同一次 UI render/commit 只能观测同一 tick）
- `instanceId`：模块实例锚点
- `txnSeq/opSeq`：事务与操作序号（可回放因果链）
- `programId/nodeId`：FlowProgram 结构锚点（来自 Static IR）
- `runId/timerId/callId`：在途态锚点（`I_t` 的最小可解释载体）

### 2.2 Record 形态

```ts
type TapeVersion = 1

type TapeRecordV1 =
  | { readonly v: TapeVersion; readonly kind: 'tick.start'; readonly tickSeq: number; readonly time?: { readonly wallClockMs?: number } }
  | { readonly v: TapeVersion; readonly kind: 'event.action'; readonly tickSeq: number; readonly instanceId: string; readonly actionTag: string; readonly payload?: unknown }
  | {
      readonly v: TapeVersion
      readonly kind: 'event.externalStore'
      readonly tickSeq: number
      readonly instanceId: string
      readonly storeId: string
      readonly snapshot: unknown
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'flow.run.start'
      readonly tickSeq: number
      readonly instanceId: string
      readonly programId: string
      readonly runId: string
      readonly trigger: { readonly kind: 'action' | 'lifecycle' | 'timer'; readonly detail?: unknown }
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'timer.schedule' | 'timer.cancel' | 'timer.fire'
      readonly tickSeq: number
      readonly instanceId: string
      readonly programId: string
      readonly runId: string
      readonly timerId: string
      readonly ms: number
      readonly reason?: 'delay' | 'debounce'
      readonly cancelledByRunId?: string
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'io.call' | 'io.result'
      readonly tickSeq: number
      readonly instanceId: string
      readonly programId: string
      readonly runId: string
      readonly callId: string
      readonly serviceId: string
      readonly input?: unknown
      readonly outcome?: { readonly _tag: 'success'; readonly value: unknown } | { readonly _tag: 'failure'; readonly error: unknown } | { readonly _tag: 'timeout' }
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'flow.run.cancel'
      readonly tickSeq: number
      readonly instanceId: string
      readonly programId: string
      readonly runId: string
      readonly reason: 'latest.replaced' | 'exhaust.ignored' | 'shutdown' | 'timeout'
      readonly cancelledByRunId?: string
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'txn.commit'
      readonly tickSeq: number
      readonly instanceId: string
      readonly txnSeq: number
      readonly patch: unknown
      readonly dirtyPaths?: ReadonlyArray<string>
    }
  | {
      readonly v: TapeVersion
      readonly kind: 'tick.settled'
      readonly tickSeq: number
      readonly stable: boolean
      readonly budgetExceeded?: boolean
      readonly notes?: { readonly kind: 'degrade' | 'deferred'; readonly detail?: unknown }
    }
```

约束：

- **必须 JSON 可序列化**（禁止闭包/Effect 本体进 tape）。
- `diagnostics=off` 不等价于 “tape=off”：trace 可以降级，但 tape 的 record/replay 模式是独立能力开关。
- 大对象（snapshot/payload/patch）若不可接受，可引入 content-addressed blob store（record 里放 digest + 外挂存储）；但 record 的锚点必须完整。

## 3) Replay/Fork 模式（运行时语义）

Tape 的价值不在“记录”，在“可控执行模式”：

- **Record Mode**：真实运行；在 IO/Timer/ExternalStore 边界记录 tape。
- **Replay Mode**：禁止真实 IO/真实 timer；所有 `io.result`/`timer.fire`/`externalStore.snapshot` 由 tape 驱动（环境变成 oracle）。
- **Fork Mode**：从某个 `tickSeq/opSeq` 切出分支，替换部分 `io.result`/`timer.fire`/`externalStore.snapshot`，在新沙箱中运行并产出新 tape（主时间线不污染）。

本特性的硬要求：`FlowProgram.delay/serviceCall` 必须走可注入的运行时服务（Clock/Timer/IO Driver），使 record/replay/fork 成为可能；禁止影子 `setTimeout/Promise` 链绕开这些边界。
