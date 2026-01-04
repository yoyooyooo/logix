# Quickstart：ExternalStore + TickScheduler（无 tearing）

> 目标：用最少代码展示 “外部输入 → state → source/query → React UI” 的无 tearing 闭环。

## 0) 心智模型（1 分钟）

- 你只需要提供 `ExternalStore<T>`：同步 `getSnapshot()` + `subscribe(listener)`。
- listener 只需要 **Signal Dirty**（点亮变化并触发一次 tick），不要把 payload 入队（tick flush 会 pull 最新 snapshot）。
- 若需要 SSR：为 ExternalStore 提供 `getServerSnapshot()`（同步、无 IO），并由宿主保证 server/client 初始快照一致以避免 hydration mismatch（本特性不提供自动注水/rehydrate）。
- 把外部输入 declaratively 接进模块：`StateTrait.externalStore`（不再手写订阅胶水）。
- React 继续用 `useSelector`；底层通过 RuntimeStore 保证跨模块同一 `tickSeq` 快照（无 tearing）。
- 同一 `moduleId` 的多实例按 `ModuleInstanceKey = ${moduleId}::${instanceId}` 分片订阅：只会唤醒订阅该实例的组件（单例只是特例）。

## 1) 定义 ExternalStore（最小手写版）

```ts
type Listener = () => void

let currentUserId = 'u1'
const listeners = new Set<Listener>()

const UserIdStore: Logix.ExternalStore<string> = {
  getSnapshot: () => currentUserId,
  subscribe: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

// 外部事件发生时（WebSocket/router/session/flags...）：
currentUserId = 'u2'
listeners.forEach((l) => l())
```

也可以用 sugar（概念）：

```ts
const UserIdStore = Logix.ExternalStore.fromService(UserServiceTag, (svc) => ({
  getSnapshot: () => svc.getCurrentUserId(),
  subscribe: (listener) => svc.subscribeUserId(listener),
}))

const UserIdStore1 = Logix.ExternalStore.fromSubscriptionRef(userIdRef)

const UserIdStore2 = Logix.ExternalStore.fromStream(userId$, { initial: 'u1' })
```

> 注意：
> - `fromStream(..., { initial })` 的 `initial` 可能 stale（订阅前 stream 已 emit）；需要可靠 current 时，优先使用 `fromService/fromSubscriptionRef` 或手写 `ExternalStore.getSnapshot()`。
> - `fromStream` 若缺少 `initial/current` 必须 fail-fast（Runtime Error）。
> - `fromSubscriptionRef` 仅适用于“同步纯读”的 ref：不要把 IO/副作用藏进 `SubscriptionRef.get`。

## 2) Module：用 `StateTrait.externalStore` 写回 inputs

```ts
const State = Schema.Struct({
  inputs: Schema.Struct({ userId: Schema.optional(Schema.String) }),
  profileResource: SnapshotSchema,
})

const Traits = Logix.StateTrait.from(State)({
  "inputs.userId": Logix.StateTrait.externalStore({
    store: UserIdStore,
  }),
  profileResource: Logix.StateTrait.source({
    deps: ["inputs.userId"],
    resource: "user/profile",
    key: (s) => (s.inputs.userId ? { userId: s.inputs.userId } : undefined),
  }),
})
```

## 3) React：照常 `useSelector`，但底层订阅已无 tearing

```tsx
const runtime = useRuntime()
const profile = useSelector(UserModule, (s) => s.profileResource)
const userId = useSelector(UserModule, (s) => s.inputs.userId)
```

语义保证：

- 同一次 render 中读取到的 `userId` 与 `profileResource` 来自同一 `tickSeq`
- 预算超限时允许软降级，但必须能在 Devtools 中通过 `trace:tick` 解释原因
- 若使用多实例 handle（例如 `ModuleRef`），无关实例的更新不会唤醒当前 selector（按 `ModuleInstanceKey` 分片）

## 4) 输入优先级（urgent/nonUrgent）

- 默认：输入/交互触发的 `dispatch/setState` 与 ExternalStoreTrait 写回视为 **urgent**（不需要额外配置）。
- 显式降级：把“可延后/可合并”的链路标注为 **nonUrgent**（例如 `dispatchLowPriority` 或 `StateTrait.externalStore({ priority: "nonUrgent" })`），预算超限时只会推迟 nonUrgent backlog。

## 5) 批处理（可选）

- 若某个宿主事件会同步触发多个外部输入变化，建议用 `Runtime.batch(() => { ... })` 包裹（更强 tick 边界）。
- `Runtime.batch` 只作为同步边界：不要在 batch callback 内 `await` 期待触发 flush（扁平化语义只在 outermost 结束时 flush）。

## 6) 调试

- 开启 devtools/diagnostics 后，在事件流中观察：
  - `trace:tick`（start/settled/budgetExceeded）
    - 若因预算/循环推迟了 nonUrgent external input，应在 Warn 级别下看到 `backlog.deferredPrimary`（帮助解释“关键数据为何延迟”）
  - `state:update`（commitMode/tickSeq 关联）
  - `trace:react-selector`（commit 阶段记录 selector 信息）
