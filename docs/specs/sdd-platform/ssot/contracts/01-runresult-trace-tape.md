---
title: contracts/01 · RunResult / Trace / Tape 契约（平台 Grounding）
status: living
---

> 本文定义平台侧 **RunResult** 的单一事实源：输出形态、锚点、以及 Trace/Tape 的边界。它把 `foundation/01-the-one.md` + `contracts/00-execution-model.md` 的口径落到“可传输、可对齐、可回放（可选）”的产物上，供 Studio / Alignment Lab / Agent Self-Correction 长期引用。

## 0) 上游裁决（先对齐口径）

- 形式化基线（系统方程与符号表）：`docs/specs/sdd-platform/ssot/foundation/01-the-one.md`
- 时间旅行交互（愿景与模式）：`docs/specs/sdd-platform/ssot/contracts/02-time-travel.md`
- 观测协议壳（跨宿主序列化/排序）：`specs/005-unify-observability-protocol/contracts/observability-protocol.md`
  - `ObservationEnvelope` / `EvidencePackage` schemas：`specs/005-unify-observability-protocol/contracts/schemas/*`
- 序列化硬门与稳定身份（instanceId 单一锚点）：`specs/016-serializable-diagnostics-and-identity/spec.md`
- Tape（可回放磁带：Record/Replay/Fork）：`specs/075-logix-flow-program-ir/contracts/tape.md`

## 1) RunResult 是什么

RunResult 是一次 “Scenario/Playground Run” 的输出。它的职责不是“把一切都记录下来”，而是提供一份可被平台消费的 **Grounding**：

- **可解释（Trace）**：回答“为什么发生了什么”；
- **可对齐（Anchors）**：把运行行为映射回 Static IR（$C_T$ / $\Pi$）与 Spec/Scenario；
- **可回放（Tape，可选）**：在 Sandbox/Test 等受控环境中，允许 deterministic replay / fork。

最重要的裁决：**RunResult 的主时间轴是 `tickSeq`（逻辑时间）**；wall-clock 仅用于 UI 展示，不作为系统因果与回放依据。

## 2) 最小形态（V1：EvidencePackage + Attachments）

RunResult v1 推荐形态是 “协议壳 + 可选外挂”：

```ts
type RunMode = 'live' | 'replay' | 'fork'

type RunResultV1 = {
  // 与 005 协议壳对齐：用于跨宿主消费与导出
  readonly protocolVersion: string
  readonly runId: string
  readonly mode: RunMode

  // 参考系：tickSeq 作为 simultaneity anchor；wall-clock 仅用于 UI
  readonly referenceFrame: { readonly kind: 'tick'; readonly tickSeqMax?: number }

  // Trace：解释链（可采样/可丢弃/可合并；不保证可回放完整性）
  readonly evidence: EvidencePackage

  // Tape：回放磁带（可选；受控环境开启；用于 deterministic replay/fork）
  readonly tape?: unknown

  // Snapshot/Patch：对齐与断言所需的最小状态证据（可按预算裁剪）
  readonly snapshots?: ReadonlyArray<{
    readonly tickSeq: number
    readonly moduleId: string
    readonly instanceId: string
    readonly state?: unknown
    readonly patch?: unknown
  }>

  // Static IR anchors：把运行行为锚定回结构（C_T/Π）
  readonly static?: {
    readonly moduleDescriptorsDigest?: string
    readonly traitIrDigest?: string
    readonly programIrDigest?: string
  }
}
```

说明：

- **`evidence` 是 RunResult 的核心**：它复用 `EvidencePackage(events: ObservationEnvelope[])`，以 `runId + seq` 作为唯一权威顺序。
- `tape` 是可选增强：在 `mode=replay/fork` 或明确开启 record 时才要求存在；其最小口径以 `specs/075-logix-flow-program-ir/contracts/tape.md` 为准（字段可迭代，但锚点必须稳定）。
- `snapshots` 是对齐层的“最小可用证据”，不是长期存储；体积超阈值时允许只存 digest / patch 摘要。

## 3) 锚点与排序（防漂移硬约束）

### 3.1 排序与时间轴

- **唯一权威顺序**：同一 `runId` 内按 `ObservationEnvelope.seq` 升序排序（允许间隙）。
- **参考系时间轴**：`tickSeq` 用于定义“同时性/一致性快照”，回答“UI 在哪个一致帧看到什么”。
- **展示时间**：`ObservationEnvelope.timestamp` / `wallClockMs` 仅用于 UI 展示与统计，不作为回放/因果锚点。

### 3.2 必须稳定的锚点集合（最小闭环）

下列锚点用来把 `Trace/Tape/Snapshot` 三者编织为可解释链路；缺失会导致对齐/回放不可证明：

- 实例锚点：`moduleId` + `instanceId`（单一事实源；禁止第二锚点）
- 事务锚点：`txnSeq`（必要时 `txnId` 可由 `instanceId + txnSeq` 确定性重建）
- 因果锚点：`linkId`（跨边界链路串联：action→service→txn.commit）
- 参考系锚点：`tickSeq`（同一次 render/commit 的一致快照）
- 在途态锚点（覆盖 $\Sigma_t$ 的 $I_t$）：`programId/nodeId/runId`、`timerId`、`callId`、`cancelReason`

> 约束：锚点必须“去随机化”（不得默认依赖 `Math.random()/Date.now()` 作为主锚点）；事件必须 Slim 且可 JSON 序列化。

## 4) Trace vs Tape：为什么必须分层

- Trace（解释）：用于 “why”；允许采样/丢弃/合并；生产环境优先收集 Trace（成本可控）。
- Tape（回放）：用于 “how”；必须覆盖开放系统的不确定性交换（IO outcome / timer fire / external snapshot）；通常只在 Sandbox/Test 这类 **可控环境** 开启。

两者不能混用：Trace 不是 Tape；Tape 也不是“更详细的 Trace”。它们服务不同的上层能力。

## 5) IO 无法时间旅行的现实口径（平台必须诚实）

平台无法倒转真实世界的副作用（例如真实 `POST /pay`）。因此：

- **Live（现实运行）**：最多做到“只读回放”（重看发生了什么），以及在受控注入下的局部模拟；
- **Replay/Fork（受控运行）**：环境退化为 oracle（由 tape 驱动），IO/Timer/ExternalStore 的结果以事件形式注入 $E_t$，不再依赖真实网络与真实计时器。

这就是 `docs/specs/sdd-platform/ssot/foundation/01-the-one.md` 中 “开放系统与 Tape” 的工程含义：时间旅行不是“重发 IO 回到过去”，而是“用 tape 事件重放同一条因果链”。

## 6) 面向 Agent 的回流：RunResult Slice（最小纠错上下文）

为避免把整条时间线塞回模型，平台应回传 “切片”：

```ts
type RunResultSliceV1 = {
  readonly runId: string
  readonly focus: {
    readonly tickSeq?: number
    readonly instanceId?: string
    readonly txnSeq?: number
    readonly linkId?: string
    readonly anchors?: { readonly programId?: string; readonly runId?: string; readonly timerId?: string; readonly callId?: string }
  }
  readonly evidenceSeqRange?: { readonly from: number; readonly to: number }
  readonly snapshots?: ReadonlyArray<{ readonly tickSeq: number; readonly instanceId: string; readonly state?: unknown; readonly patch?: unknown }>
  readonly notes?: ReadonlyArray<{ readonly kind: 'mismatch' | 'budget' | 'downgrade'; readonly detail?: unknown }>
}
```

原则：**只回传能解释差异的最小证据**（tickSeq + anchors + 少量事件 + 必要快照），让 Coder Agent 可以在不加载全量上下文的情况下自愈。
