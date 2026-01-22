# Data Model: Workflow IR（统一最小 IR：Static IR + Dynamic Trace）

> 本文定义 Workflow 的“统一最小 IR”口径：Static IR 可导出/可比对；Dynamic Trace Slim 且可序列化，并以 tickSeq 作为参考系锚点。

## 0) 分层（必读）

Workflow v1 采用固定分层以服务 AI/平台出码，并保证可比对与可解释：

- **Recipe（压缩输入，可选）**：少量参数的模板层，必须可确定性展开
- **Canonical AST（唯一规范形）**：无语法糖/默认值落地/分支显式/`stepKey` 完整（语义规范形）
- **Static IR（可导出投影）**：version+digest+nodes/edges（Devtools/Alignment Lab/Runtime 的可交换对象）
- **Dynamic Trace（Slim）**：运行期锚点与摘要（以 tickSeq 为参考系）

裁决：Canonical AST 是语义规范形；Static IR 是其导出/执行投影。运行时不承担“解压/推导/修复”。

## 0.1 v1 硬裁决（数据模型层）

- `call` v1 不提供结果数据流（只 success/failure）
- 输入映射 v1：仅 `payload/payload.path/const/object/merge`
- Canonical AST 强制 `stepKey` 必填；禁止顺序派生
- 分支必须显式结构；禁止邻接推断作为真相源
- `nodeId` 以稳定 hash 为主锚点；可读性通过 `source(stepKey/fragmentId)`

## 1) Canonical AST（WorkflowDefV1）

> Canonical AST 是所有前端（Recipe/AI/Studio/TS DSL）的统一规范形：同一语义只有一种表示。

### 1.1 触发与策略

```ts
type WorkflowAstVersion = 1

type WorkflowLocalId = string
type StepKey = string
type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [k: string]: JsonValue }

type WorkflowTriggerV1 =
  | { readonly kind: 'action'; readonly actionTag: string }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

type WorkflowPolicyV1 = {
  readonly concurrency?: 'latest' | 'exhaust' | 'parallel'
  readonly priority?: 'urgent' | 'nonUrgent'
}
```

### 1.2 输入映射 DSL（InputExprV1）

仅允许引用触发输入与纯结构组合；禁止读取 state/traits；禁止条件/循环/算术；禁止引用 call 返回值。

```ts
type InputExprV1 =
  | { readonly kind: 'payload' }
  | { readonly kind: 'payload.path'; readonly pointer: string } // JSON Pointer；"" 表示整个 payload
  | { readonly kind: 'const'; readonly value: JsonValue }
  | { readonly kind: 'object'; readonly fields: { readonly [k: string]: InputExprV1 } }
  | { readonly kind: 'merge'; readonly items: ReadonlyArray<InputExprV1> } // items 必须都是 object
```

### 1.3 Canonical Step（无语法糖）

裁决：Canonical AST 中不得出现 `onSuccess/onFailure` 这类邻接 sugar；分支必须是结构字段。

```ts
type WorkflowStepV1 =
  | { readonly kind: 'dispatch'; readonly key: StepKey; readonly actionTag: string; readonly payload?: InputExprV1 }
  | { readonly kind: 'delay'; readonly key: StepKey; readonly ms: number }
  | {
      readonly kind: 'call'
      readonly key: StepKey
      readonly serviceId: string
      readonly input?: InputExprV1
      readonly timeoutMs?: number
      readonly retry?: { readonly times: number }
      readonly onSuccess: ReadonlyArray<WorkflowStepV1>
      readonly onFailure: ReadonlyArray<WorkflowStepV1>
    }

type WorkflowDefV1 = {
  readonly astVersion: WorkflowAstVersion
  readonly localId: WorkflowLocalId
  readonly trigger: WorkflowTriggerV1
  readonly policy?: WorkflowPolicyV1
  readonly steps: ReadonlyArray<WorkflowStepV1>
  /** 非语义字段：用于把 stepKey 映射回 fragment（Devtools/溯源/组合诊断） */
  readonly sources?: { readonly [stepKey: string]: { readonly fragmentId?: string } }
  readonly meta?: { readonly generator?: JsonValue } // 可选：记录 recipe/ai/studio 来源（纯 JSON）
}
```

### 1.4 Canonical AST 的不变量（必须校验）

- 所有 step 必须具备 `key`（`StepKey`）；缺失 fail-fast
- `key` 在同一 program 内必须唯一（含嵌套分支的所有 step）
- `call.onSuccess/onFailure` 必须显式存在（允许空数组，但不得缺省）
- `InputExprV1` 必须可 JSON 序列化；`merge.items` 必须都是 `object`

## 1.5 Recipe（压缩输入）到 Canonical AST 的展开

Recipe 不是另一套语义：它只是“更短的输入”，最终必须确定性展开为 `WorkflowDefV1`。

> v1 推荐 Recipe 最小集合（submit/typeahead/refreshOnLifecycle/refreshOnAction/delayThen/call），其 schema 与展开规则详见 `contracts/public-api.md` 的说明（后续可在本文件补齐为独立小节）。

<a id="workflow-composition"></a>

## 1.6 Build-time Composition（Fragments / Compose / withPolicy）

> 目标：在 **不引入运行时闭包** 的前提下提供可复用与可组合的 authoring primitives；组合的产物必须能确定性归一到 Canonical AST，并导出单一 Static IR（避免并行真相源）。

### 1.6.1 Fragment（片段）

Fragment 是 build-time 的结构单元：用于复用/组合；它本身不携带运行时语义（语义由最终 Canonical AST/Static IR 承载）。

```ts
type WorkflowFragmentId = string

type WorkflowFragmentV1 = {
  readonly fragmentId: WorkflowFragmentId
  readonly steps: ReadonlyArray<WorkflowStepV1>
}
```

约束（v1）：

- `fragmentId` MUST 稳定且可读（推荐 `moduleId.fragmentName` 或 `moduleId:fragmentName`）；不得依赖随机/时间。
- fragment 允许被复用，但 **v1 不提供自动 namespace/rekey**：复用者必须确保最终 Program 内 `stepKey` 全局唯一（见 1.6.3）。

### 1.6.2 Compose（组合）

裁决：`compose` 的语义为 **顺序拼接（sequential concatenation）**；不隐式引入并行/条件语义。

```ts
type WorkflowPartV1 = ReadonlyArray<WorkflowStepV1> | WorkflowFragmentV1

type WorkflowComposeResultV1 = {
  readonly steps: ReadonlyArray<WorkflowStepV1>
  readonly sources?: { readonly [stepKey: string]: { readonly fragmentId?: string } }
}
```

规范化规则（v1）：

- `compose(...parts)` 按参数顺序把所有 `steps` 线性展开，得到最终 `steps`。
- `sources` 是 **非语义** 溯源映射：把每个 `stepKey` 归因到 `fragmentId`（若 step 来自 fragment）；用于错误提示与 Devtools 展示。

### 1.6.3 stepKey 冲突检测（fail-fast）

Canonical AST 的硬裁决：`stepKey` 必须全局唯一（包含 `call.onSuccess/onFailure` 的嵌套 steps）。

- 当 `compose/normalize` 发现重复 `stepKey`，MUST fail-fast（禁止静默覆盖或自动改名）。
- 错误必须携带最小可修复信息（纯 JSON）：
  - `code: 'WORKFLOW_DUPLICATE_STEP_KEY'`
  - `detail.duplicateKey: string`
  - `detail.owners?: Array<{ stepKey: string; fragmentId?: string }>`（若可得）

### 1.6.4 withPolicy（默认策略注入）

`withPolicy` 是 build-time 的“默认值填充器”：把一段结构的默认策略 **物化进 Canonical AST**（避免运行时分支/闭包）。

v1 策略集合（最小完备）：

- `policy.concurrency/priority`：只允许作为 program 级默认（最终落到 `WorkflowDefV1.policy`）。
- `timeoutMs/retry.times`：只允许作为 `call` 的默认（仅在 step 未显式设置时填充）。

合并优先级（从强到弱）：

1. step 显式字段（例如 `call.timeoutMs`）
2. `withPolicy` 注入的默认
3. program 级默认（若存在）
4. 运行时默认（最后兜底；不建议依赖）

<a id="workflow-static-ir"></a>

## 2) Static IR（WorkflowStaticIrV1）

### 2.1 最小形态（V1）

```ts
type WorkflowStableId = string
type WorkflowNodeId = string
type WorkflowFragmentId = string
type WorkflowSource = { readonly fragmentId?: WorkflowFragmentId; readonly stepKey?: string }
type WorkflowEdgeKind = 'next' | 'success' | 'failure'
type WorkflowEdge = { readonly from: WorkflowNodeId; readonly to: WorkflowNodeId; readonly kind?: WorkflowEdgeKind }

type WorkflowStaticTrigger =
  | { readonly kind: 'action'; readonly actionTag: string }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

type WorkflowStaticStep =
  | { readonly kind: 'dispatch'; readonly actionTag: string; readonly payload?: InputExprV1 }
  | {
      readonly kind: 'call'
      readonly serviceId: string
      readonly policy?: {
        readonly timeoutMs?: number
        readonly retry?: { readonly times: number }
      }
    }
  | { readonly kind: 'delay'; readonly ms: number }

type WorkflowConcurrencyPolicy = 'latest' | 'exhaust' | 'parallel'

type WorkflowStaticIrV1 = {
  readonly version: 1
  readonly programId: WorkflowStableId
  readonly digest: string
  readonly nodes: ReadonlyArray<{
    readonly id: WorkflowNodeId
    readonly kind: 'trigger' | 'step'
    readonly trigger?: WorkflowStaticTrigger
    readonly step?: WorkflowStaticStep
    readonly source?: WorkflowSource // 可选：来源映射（用于 Devtools 展示/定位；必须可序列化）
  }>
  readonly edges: ReadonlyArray<WorkflowEdge>
  readonly policy?: {
    readonly concurrency?: WorkflowConcurrencyPolicy
    readonly priority?: 'urgent' | 'nonUrgent'
  }
  readonly meta?: Record<string, unknown> // JSON 可序列化（白名单）
}
```

### 2.2 不变量

- `programId/nodeId/digest` 必须去随机化：仅由稳定输入推导（禁止时间/随机默认）。
- IR 必须 JSON 可序列化；闭包/Effect 本体不得进入 IR。
- 分支必须显式落到图结构：`call` 的 success/failure 只能通过 `edges.kind`（`success`/`failure`）表达，禁止依赖“steps 位置约定”作为唯一真相源。
- 允许 V1 先表达“线性链 + success/failure 分支”的子集；未来通过新增节点 kind 扩展（同 version 内新增可选字段，解析器忽略未知字段）。

## 3) Dynamic Trace（Slim，tickSeq 关联）

Workflow 运行期事件不新增“巨型事件流”，原则是复用既有边界：

- `EffectOp(kind='flow')`：Program watcher 的每次触发/运行
- `EffectOp(kind='service')`：call 的边界（成功/失败由错误通道/诊断字段表达）
- `trace:tick`：tick 的参考系锚点（由 073 定义）

最低要求：所有 Program 相关的 EffectOp/meta 必须能关联到：

- `tickSeq`（观测参考系）
- `moduleId/instanceId`（作用域）
- `programId/nodeId`（结构锚点）

### 3.1 在途态 I_t 的可解释锚点（不等于业务状态）

长期公式把系统状态扩展为 `Σ_t=(S_t, I_t)`，其中 `I_t` 是 in-flight（timers/fibers/backlog…）。Workflow 的运行期必须至少提供“锚点级”的可解释字段来覆盖 `I_t` 的关键分量：

```ts
type WorkflowRunId = string
type WorkflowTimerId = string

type WorkflowRunAnchor = {
  readonly programId: string
  readonly runId: WorkflowRunId
  readonly instanceId: string
  readonly tickSeq: number
}

type WorkflowTimerAnchor = {
  readonly timerId: WorkflowTimerId
  readonly runId: WorkflowRunId
  readonly ms: number
}

type WorkflowCancelAnchor = {
  readonly runId: WorkflowRunId
  readonly reason: 'latest.replaced' | 'exhaust.ignored' | 'shutdown' | 'timeout'
  readonly cancelledByRunId?: WorkflowRunId
}
```

约束：

- 这些锚点字段必须 Slim 且 JSON 可序列化。
- diagnostics=off 时不要求产出完整事件，但内部仍会维护 `I_t`；diagnostics=on 时必须足以回答“为何被取消/为何 delay 没发生/为何此刻触发”。

## 4) Timer（禁止影子时间线）

`delay(ms)` 的调度必须通过可注入的时间源（例如 `HostScheduler.scheduleTimeout` / Effect `Clock`；测试可注入 TestClock/DeterministicHostScheduler），并满足：

- schedule/cancel/fired 都可归因到 tickSeq（或能通过 tickSeq + timerId 关联）。
- 不允许默认直接使用 `setTimeout` 作为核心业务时间算子（否则 replay/解释断链）。
