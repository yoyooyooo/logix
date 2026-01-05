# Quickstart：ExternalStore + TickScheduler（无 tearing）

> 目标：用最少代码展示 “外部输入 → state → source/query → React UI” 的无 tearing 闭环。

## 0) 心智模型（1 分钟）

- 你只需要提供 `ExternalStore<T>`：同步 `getSnapshot()` + `subscribe(listener)`。
- listener 只需要 **Signal Dirty**（点亮变化并触发一次 tick），不要把 payload 入队（tick flush 会 pull 最新 snapshot）。
- 若需要 SSR：为 ExternalStore 提供 `getServerSnapshot()`（同步、无 IO），并由宿主保证 server/client 初始快照一致以避免 hydration mismatch（本特性不提供自动注水/rehydrate）。
- 把外部输入 declaratively 接进模块：`StateTrait.externalStore`（不再手写订阅胶水）。
- React 继续用 `useSelector`；底层通过 RuntimeStore 保证跨模块同一 `tickSeq` 快照（无 tearing）。
- React 侧尽量不写“数据胶水 useEffect”：订阅/同步/拉取应在 Trait/ExternalStore/Source 中表达；`useEffect` 只保留给 DOM/第三方组件 integration（focus/scroll/measure/动画等）。
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
    key: (userId) => (userId ? { userId } : undefined),
  }),
})
```

## 2.5) Module 组合：模块也可以作为 ExternalStore 来源

> 目标：把 “模块 A 的某个 selector 结果” 当作模块 B 的输入源，并在同一 tick 内与 B 的其它派生一起收敛（FR-012 / SC-005）。

```ts
const UserFromA = Logix.ExternalStore.fromModule(ModuleA, (s) => s.user)

const TraitsB = Logix.StateTrait.from(StateB)({
  "inputs.user": Logix.StateTrait.externalStore({
    store: UserFromA,
  }),
})
```

语义要点：

- `fromModule` 必须是 IR 可识别依赖（module readQuery → trait writeback），不能实现为 runtime 黑盒订阅；否则无法在 tick 内稳定化与解释链路。
- `module` 参数语义上是 ModuleHandleUnion（tag 或 runtime 实例）；多例场景必须指向具体实例（避免把多个 instance 混成一个源）。
- 值语义：Runtime 不会自动 clone；写回的是 selector 返回值本身（按引用共享）。把返回值当作只读快照，并保持 selector 小且稳定（避免“镜像大状态”）。

## 2.6) 选择指南：如何少写胶水（避免决策迷茫）

> 目标：让“声明式表达”有默认路径，减少 `useEffect` 数据胶水与模块组合时的决策负担。

优先级（从推荐到谨慎）：

1. **同模块内派生**：优先用 `computed` / `source` / `StateTraitProgram` 表达依赖与收敛（单一事实源，最少同步点）。
2. **只读跨模块**：如果你只是“用一下别的模块的值”，用 `ReadQuery` / `$.use(OtherModule).read(...)`，不要复制到本模块 state。
3. **跨模块作为输入进入 state graph**：只有当下游模块必须把某个上游值作为 **自身状态机输入**（例如 source keyHash、idle 同步回收、稳定化链路的一部分）时，才用 `ExternalStore.fromModule(A, selector)` + `StateTrait.externalStore` 写回到 `inputs.*`（external-owned）。
4. **跨模块写动作**：跨模块交互优先用 declarative link（dispatch-only，IR 可识别）；黑盒 `Process.link` 仅作为 escape hatch，并接受 Next Tick best-effort 的边界。

硬约束（防止组合失控）：

- **不要用 fromModule 镜像大状态**：它的目标是把“必要输入”纳入收敛图谱，不是做全量 state 同步；保持 selector 小、稳定、可解释。
- **避免深链与环**：模块组合尽量保持 DAG；若不可避免，需要显式 nonUrgent + 接受 partial fixpoint，并依赖 `trace:tick` 解释与定位。
- **写回只落在 inputs**：推荐把跨模块/外部源写回集中到 `inputs.*`，其它字段用 computed/source 派生（更符合 SRP，减少冲突）。

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
- `Runtime.batch` **不是事务**：无 rollback；callback 抛错也可能产生 partial commit（已写入的更新仍会 flush）。不要用它实现“全有全无”，需要原子性请自行设计两阶段/补偿。

## 6) 调试

- 开启 devtools/diagnostics 后，在事件流中观察：
  - `trace:tick`（start/settled/budgetExceeded）
    - 若因预算/循环推迟了 nonUrgent external input，应在 Warn 级别下看到 `backlog.deferredPrimary`（帮助解释“关键数据为何延迟”）
  - `state:update`（commitMode/tickSeq 关联）
  - `trace:react-selector`（commit 阶段记录 selector 信息）
