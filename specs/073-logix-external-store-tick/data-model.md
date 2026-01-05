# Data Model: ExternalStore + Tick（统一外部输入与跨模块一致性）

> 本文描述本特性的“统一最小模型”（Static IR + Dynamic Trace）的数据结构口径。实现细节下沉到 `packages/*/src/internal/**`。

## 1) ExternalStore<T>

ExternalStore 是对外部输入源的归一化抽象，必须对齐 React `useSyncExternalStore` 的心智：

```ts
type ExternalStore<T> = {
  getSnapshot: () => T // 同步、无 IO
  /** SSR only: must return the same value the client will observe on first hydration to avoid mismatch (best-effort). */
  getServerSnapshot?: () => T
  subscribe: (listener: () => void) => () => void
}
```

语义补充：

- `getSnapshot()` 返回的是 **raw current value**（外部源的最新值）；任何 coalesce/延迟都必须发生在写回层（ExternalStoreTrait），而不是篡改 ExternalStore 的同步语义。
- SSR：`getServerSnapshot()` 可选；React adapter 会优先使用它作为 server render 的 snapshot。宿主需自行保证 server/client 初始快照一致（本特性不提供自动注水/rehydrate）。

### 1.1 语法糖形态（概念）

- `ExternalStore.fromService(Tag, map)`
  - `map(service) -> { getSnapshot, subscribe }`
- `ExternalStore.fromSubscriptionRef(ref)`
  - 前提：`SubscriptionRef.get(ref)` 必须 **同步纯读、无 IO/副作用**（否则不支持；不要把副作用藏进 `getSnapshot()`）
  - `getSnapshot = () => current`（概念：通过订阅 `ref.changes` 维护 `current`；实际实现必须避免在 React render 路径中 `runSync` Effect）
  - `subscribe = ...`（订阅 ref.changes，listener 只 Signal Dirty）
- `ExternalStore.fromStream(stream, { initial })`
  - 仅当提供 `initial/current` 时成立；否则应以 Runtime Error fail-fast（Stream 没有 current）。
- `ExternalStore.fromModule(module, selector)`
  - 把模块的 selector 结果当作 ExternalStore 来源（Module-as-Source）
  - 必须可被 IR 识别（moduleId/selectorId/readsDigest 等），由 TickScheduler 参与同 tick 稳定化（FR-012 / SC-005），禁止退化为 runtime 黑盒订阅

## 2) ExternalStoreTrait（StateTrait.externalStore）

ExternalStoreTrait 是 `StateTrait` 的一种 entry：声明某个 state 字段由外部输入驱动写回。

### 2.1 Trait Spec（概念）

```ts
type ReadsDigest = { readonly count: number; readonly hash: number }

type ExternalStoreSource =
  | { readonly kind: "external"; readonly storeId: string }
  | {
      readonly kind: "module"
      readonly moduleId: string
      readonly instanceKey?: string
      readonly selectorId: string
      readonly readsDigest?: ReadsDigest
    }

type ExternalStoreTraitSpec<S, P extends StateFieldPath<S>, T, V = T> = {
  kind: "externalStore"
  fieldPath: P
  storeId: string
  /** Optional (preferred): declarative source metadata for TickScheduler/IR export (e.g. Module-as-Source). */
  source?: ExternalStoreSource
  deps?: ReadonlyArray<StateFieldPath<S>> // 可选：用于把“外部输入”纳入依赖图（未来增量化）
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  select?: (t: T) => V
  equals?: (a: V, b: V) => boolean
  coalesceWindowMs?: number
  priority?: "urgent" | "nonUrgent"
  meta?: Record<string, unknown> // 可序列化（Devtools/docs）
}
```

### 2.2 写回语义（必须）

- 写回必须进入事务窗口（与 reducer/update/mutate 同队列语义），并参与：
  - converge（computed/link）
  - validate（check）
  - source idle 同步回收（避免 tearing）
- `getSnapshot()` 只能在事务窗口外调用（采样阶段），不得在事务窗口内执行 IO。
- 初始化必须保证 “getSnapshot 与 subscribe 建立之间不漏事件” 的原子语义。
- ownership：`fieldPath` 视为 **external-owned**。除 ExternalStoreTrait 写回外，任何其它写入路径（action/update/mutate/source writeback 等）触达同一路径都必须 fail-fast（推荐替代：写入独立 override 字段，再用 computed 合并）。
- coalesce：当 `coalesceWindowMs` 启用时，trait 维护 `pending(raw)` 与 `committed` 两级值；只有 **committed** 会写回 state 并进入 RuntimeStore snapshot。pending 的 raw 变化不得以“可观测值变化但未 notify”的方式泄露到 React（避免 tearing）。
- coalesceWindowMs 聚合位置：Pre-Write（写回前聚合）。外部源 subscribe 回调不延迟；仅延迟 committed 写回与 tick flush。
- 高频外部 emit 去重：外部源 listener 必须是 **Signal Dirty（Pull-based）**，同一 microtask 内最多调度一次 tick；不得把每次 emit 变成 payload task 入队（避免 thundering herd 在队列层积压）。

## 3) Tick / RuntimeSnapshot

Tick 是 Runtime 的一致性批次单位，默认以 microtask 为边界。

### 3.1 TickSeq

```ts
type TickSeq = number // 单调递增；不允许随机/时间默认
```

### 3.2 RuntimeSnapshot（概念）

RuntimeStore 对 React 暴露的 snapshot 必须包含 tickSeq 与模块快照视图。

```ts
type ModuleInstanceKey = string // 例如 `${moduleId}::${instanceId}`
type TopicKey = string // 例如 ModuleInstanceKey / `${ModuleInstanceKey}::rq:${selectorId}`（概念 key；内部实现可用 object-key 缓存以避免长字符串驻留）

type RuntimeSnapshot = {
  tickSeq: TickSeq
  /** monotonic version by topicKey (module + selector topics) */
  topicVersionByKey: ReadonlyMap<TopicKey, number>
  modules: ReadonlyMap<ModuleInstanceKey, unknown> // 每个模块的 state 快照视图（或 selector cache）
  // 可选：用于 devtools/diagnostics 的附加视图（必须可裁剪）
}
```

单例与多例：

- 单例模块：同一 runtime 内只有一个 `instanceId`（因此 `ModuleInstanceKey` 固定）。
- 多例模块：同一 `moduleId` 允许多个 `instanceId` 并存；所有订阅/版本/诊断锚点必须以 `ModuleInstanceKey` 为粒度隔离，禁止仅用 `moduleId` 归并。

### 3.3 Token 不变量（订阅安全）

与 DevtoolsHub 的 `SnapshotToken` 同口径：

- `tickSeq` 未变化时，RuntimeSnapshot 对外可见字段不得变化（避免 tearing/丢更新）。
- `tickSeq` 变化时，订阅者必须最终收到一次通知（允许合并/节流，但不得永不通知）。

React 适配（sharded notify）：

- `useSyncExternalStore` 的 `subscribe(onStoreChange)` 不支持传 topic；因此 React adapter 通过 **ExternalStore facade** 实现分片订阅：
  - facade 的 `subscribe` 只挂到某个 `ModuleInstanceKey`（或更细粒度 topic）的 listener 集合；
  - facade 的 `getSnapshot` 读取共享的 RuntimeSnapshot，但用 `topicVersionByKey.get(topicKey)` gate 通知，避免全局 O(N) selector 运行。
  - 直观 API 心智：`RuntimeStore.topic(topicKey): ExternalStore<RuntimeSnapshot>`（facade），而不是让所有组件订阅一个 `RuntimeStore.global`。

topicKey 约定：

- module-topic：`ModuleInstanceKey = ${moduleId}::${instanceId}`
- selector-topic（ReadQuery static lane）：`${ModuleInstanceKey}::rq:${selectorId}`

## 4) DeclarativeLinkIR（跨模块依赖 IR）

DeclarativeLinkIR 用于让 TickScheduler 识别跨模块依赖并参与稳定化；黑盒 `Process.link` 不在此 IR 范围内。

### 4.1 最小形态（概念）

```ts
// Reads 事实源：ReadQueryStaticIr（packages/logix-core/src/internal/runtime/core/ReadQuery.ts）
// type ReadsDigest 已在 2.1 定义（count+hash）

type DeclarativeLinkNodeId = string

type DeclarativeLinkIR = {
  readonly version: 1
  readonly nodes: ReadonlyArray<
    | {
        readonly id: DeclarativeLinkNodeId
        readonly kind: "readQuery"
        readonly moduleId: string
        readonly instanceKey?: string
        readonly selectorId: string
        readonly readsDigest: ReadsDigest
      }
    | {
        readonly id: DeclarativeLinkNodeId
        readonly kind: "dispatch"
        readonly moduleId: string
        readonly instanceKey?: string
        readonly actionTag: string
      }
  >
  readonly edges: ReadonlyArray<{ readonly from: DeclarativeLinkNodeId; readonly to: DeclarativeLinkNodeId }>
}
```

### 4.2 约束（必须）

- reads 的事实源必须是 ReadQuery/static deps（可 gate）；否则无法推导依赖闭包与预算。
- writes 必须通过可追踪写入路径（仅允许 dispatch），禁止写逃逸（禁止 direct state write）。
- 循环/抖动必须可检测并触发预算降级（见 `trace:tick`）。

## 5) Dynamic Trace（诊断事件）锚点

Dynamic Trace 至少需要能把 “外部输入变化 / 跨模块联动 / 状态提交 / React notify” 串起来：

- tick 级事件：`trace:tick`（start/settled/budgetExceeded）
- 可选：外部输入 ingest 事件（采样/写回/合并）
- 关联锚点：`tickSeq` + `moduleId` + `instanceId` +（可选）`txnSeq/opSeq`
