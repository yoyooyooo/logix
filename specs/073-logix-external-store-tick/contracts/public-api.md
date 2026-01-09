# Contracts: Public API（ExternalStore + TickScheduler）

> 本文是本特性的对外 API 口径（面向业务/平台开发者）。实现细节与内部 Runtime Services 不在此文暴露。

## 1) `@logixjs/core`：ExternalStore（对外子模块）

### 1.1 `ExternalStore<T>`

- 语义：外部输入源的归一化抽象（对齐 React external store 心智）
- 约束：`getSnapshot()` 必须同步且无 IO
- SSR：可选提供 `getServerSnapshot()`（同步、无 IO），用于 server render 的快照对齐（宿主负责保证 hydration 一致性，本特性不提供自动注水/rehydrate）
- 容错：若 `getSnapshot()` 同步抛错，Runtime 会熔断该 trait（保留 last committed 值并记录诊断），不会崩溃整个 Runtime。

概念签名：

```ts
type ExternalStore<T> = {
  getSnapshot: () => T
  getServerSnapshot?: () => T
  subscribe: (listener: () => void) => () => void
}
```

### 1.2 ExternalStore sugar（构造器）

- `ExternalStore.fromService(Tag, map)`
  - 典型：router/location、auth/session、featureFlags 等平台服务
- `ExternalStore.fromSubscriptionRef(ref)`
  - 典型：已存在的 SubscriptionRef 作为单一事实源
  - 约束：`SubscriptionRef.get(ref)` 必须同步纯读、无 IO/副作用（不要把副作用藏进 `getSnapshot()`）
- `ExternalStore.fromModule(module, selector)`
  - 典型：模块组合（Module Composition）：把模块 A 的 selector 结果作为模块 B 的输入源声明式接入
  - 约束：必须是 **IR 可识别依赖**（可导出、可诊断）；实现不得退化为 runtime 黑盒订阅（否则无法保证同 tick 稳定化与可解释链路）
  - 值语义：Runtime 不会自动 clone；写回的是 selector 返回值本身（按引用共享）。把返回值当作只读快照；如确需隔离请在 selector 中显式投影/拷贝（注意成本）
- `ExternalStore.fromStream(stream, { initial })`
  - 仅当提供 `initial/current` 时允许；否则必须以 Runtime Error fail-fast（Stream 无 current）
  - ⚠️ `initial` 可能 stale（订阅时序导致）：若业务需要可靠 current，请优先用 `fromService/fromSubscriptionRef` 或直接手写 `ExternalStore<T>` 的 `getSnapshot()`

## 2) `@logixjs/core`：StateTrait.externalStore（声明式接入）

### 2.1 DSL 入口

`StateTrait.externalStore(...)` 作为 `StateTrait` 的一个 entry，声明“某个 state field 的值来自 ExternalStore”。

概念签名（以本仓库 TypeScript 类型为准）：

```ts
type ExternalStoreTraitOptions<T, V = T> = {
  readonly store: ExternalStore<T>
  readonly select?: (snapshot: T) => V
  readonly equals?: (a: V, b: V) => boolean
  readonly coalesceWindowMs?: number
  readonly priority?: "urgent" | "nonUrgent"
  readonly meta?: Record<string, unknown>
}
```

语义要点：

- 只负责“写回 state 字段”（SRP）；派生与联动由 `computed/link/source` 表达。
- 写回字段为 **external-owned**：除 externalStore trait 外禁止其它写入路径并发修改同一路径（如需 override，使用独立字段 + computed 合并）。
- 写回进入事务窗口并参与 converge/validate；不允许事务窗口 IO。
- 初始化必须保证“getSnapshot 与 subscribe 之间不漏事件”的原子语义。
- priority：默认视为 `urgent`；当标注为 `nonUrgent` 时，预算超限只会推迟该类 backlog（允许 partial fixpoint，但必须可解释）。
- coalesce：当 `coalesceWindowMs` 启用时，只允许“committed 值”进入 state 与对外 snapshot；raw/pending 变化不得以“可观测值变化但未 notify”的形式泄露（避免 tearing）。

### 2.2 推荐的业务写法（概念）

```ts
const Traits = Logix.StateTrait.from(StateSchema)({
  "inputs.router": Logix.StateTrait.externalStore({
    store: RouterExternalStore,
    select: (snap) => ({ pathname: snap.pathname, params: snap.params }),
    priority: "urgent",
  }),
  profile: Logix.StateTrait.source({ deps: ["inputs.router.params.id"], resource: "user/profile", key: ... }),
})
```

## 3) `@logixjs/core`：Runtime TickScheduler（对外配置口径）

TickScheduler 是 Runtime 内部能力，但需要对外暴露“可控的配置入口”：

- 默认 tick 边界：microtask
- 可选：显式 `Runtime.batch(fn)`（强边界，用于平台事件或测试）
  - 预算/降级策略：可配置但必须可解释（见 diagnostics）
  - 使用约束：`Runtime.batch` 只作为同步边界；不要在 batch callback 内 `await` 期待 flush（扁平化语义只在 outermost 结束时 flush）

## 4) `@logixjs/react`：React 集成口径（RuntimeStore 单一快照真理源）

对外目标：**不引入新用法**。

- `useSelector(handle, selector?)` 继续作为主要入口；
- 底层“快照真理源”升级为 RuntimeStore，保证跨模块无 tearing；
- 订阅通知在内部按 `ModuleInstanceKey = ${moduleId}::${instanceId}`（可选按 `ReadQueryStaticIr.readsDigest`）分片，避免任意模块变动导致全局 O(N) notify；同一 `moduleId` 的多实例必须按 `instanceId` 隔离（单例只是特例）；
- topic facade 只在存在订阅者时存在，订阅归零会自动释放（避免 retained 增长）；对外不暴露 facade 概念；
- 若 selector 为 ReadQuery static lane，可复用既有 selector store 的缓存策略，但订阅锚点仍归一到 RuntimeStore 的 `tickSeq`。

## 5) 非目标（明确不提供）

- 不提供对业务代码的“可写 Ref”逃逸口（禁止绕过事务/诊断通道）。
- 不承诺黑盒 `Process.link` 能进入强一致稳定化（强一致只对 declarative IR 生效）。
