# Contract: 外部查询引擎注入（`Query.Engine` / `Query.Engine.layer`）× `Query.Engine.middleware`

> 目标：把第三方引擎（默认 TanStack Query）的知识从 Query 领域逻辑中抽离；Query 领域仅依赖可注入的 Engine 服务契约获得缓存/去重/失效/可选观察/可选缓存快读能力。

## 1) 职责边界（必须清晰）

### 1.1 Engine（外部引擎）负责什么

- cache：staleTime/gcTime、命中与回收（引擎自管）
- in-flight 去重：同一 queryKey 的并发请求合并（引擎自管）
- invalidate：按 key/resource/tag 失效（引擎能力）
- observe（可选）：订阅 queryKey 结果变化（仅高级场景需要）
- peekFresh（可选）：只读快路径（用于避免 loading 抖动；不得触发 IO）

### 1.2 `@logixjs/query` / Logix Runtime 负责什么

- 统一 keySchema/keyHash：稳定、可回放、可比较
- triggers/concurrency：何时触发、触发频率、switch/exhaust 体验语义
- 写回事实源：ResourceSnapshot 写回模块 state（不引入并行真相源）
- stale 丢弃：写回前按 keyHash 门控（只认最新）
- 可解释链路：触发原因 → keyHash → 并发策略 → 写回结果（Slim 且可序列化）

## 2) 注入边界（Effect DI）

- `@logixjs/query` MUST 通过 `Query.Engine` 向宿主索取引擎服务（Effect Context.Tag）。
- `@logixjs/query` MUST 提供便捷 Layer：`Query.Engine.layer(engine)`，语义等价于在 Runtime scope 内注册该实例。
- 同一 Runtime scope SHOULD 只有一个引擎实例（保证缓存与去重语义一致）；不同 scope MAY 注入不同实例（缓存隔离），但 keyHash/写回门控语义必须保持一致。
- TanStack 适配器 MUST 收敛在 `Query.TanStack.*`：推荐注入形状为 `Query.Engine.layer(Query.TanStack.engine(new QueryClient()))`。

## 3) 降级与强制失败（只在需要引擎时失败）

- 四种组合语义（必须可解释）：
  1. **无 `Query.Engine.layer` + 无 `Query.Engine.middleware`**：完全降级为 `ResourceSpec.load`（无缓存/去重，但语义可回放）。
  2. **有 `Query.Engine.layer` + 无 `Query.Engine.middleware`**：仍走 `ResourceSpec.load`（Engine 不接管 fetch）；仅允许被用于 `peekFresh`（避免 loading 抖动）与 `invalidate`（可选调用）等“非接管”能力；不作为推荐默认。
  3. **无 `Query.Engine.layer` + 有 `Query.Engine.middleware`**：必须以配置错误显式失败（禁止静默退化）。
  4. **有 `Query.Engine.layer` + 有 `Query.Engine.middleware`**：外部引擎接管 fetch（缓存/去重/失效），推荐默认（TanStack 为默认实现）。

- 当调用方未启用任何“引擎接管点”middleware（见 `Query.Engine.middleware`）时，Query 领域的降解路径 MUST 仍然成立：
  - Query 规则降解为 `StateTrait.source`；
  - source 的加载通过 `ResourceSpec.load` 执行；
  - 不具备外部引擎的缓存/去重能力，但语义仍可回放与可解释。
- 当调用方启用了 `Query.Engine.middleware(...)` 时：
  - 若运行时缺少 `Query.Engine` 注入，系统 MUST 显式失败，并给出可操作提示（禁止静默退化）。

## 4) Engine 服务契约（建议口径）

> 这里的签名是“契约级示意”，实现可以是任意第三方引擎的适配器（默认 TanStack）。

```ts
export type InvalidateRequest =
  | { readonly kind: "byResource"; readonly resourceId: string }
  | { readonly kind: "byParams"; readonly resourceId: string; readonly keyHash: string }
  | { readonly kind: "byTag"; readonly tag: string }

export interface EngineService {
  readonly fetch: <A>(args: {
    readonly resourceId: string
    readonly keyHash: string
    /** ResourceSpec.load 的 Effect（middleware 侧提供）。 */
    readonly effect: Effect.Effect<A, unknown, never>
    /** MUST 可序列化且 Slim；默认建议为 undefined（lazy）。 */
    readonly meta?: unknown
  }) => Effect.Effect<A, unknown, never>

  readonly invalidate: (request: InvalidateRequest) => Effect.Effect<void, unknown, never>

  /** 只读快路径：不得触发 IO；用于在 refresh 前短路为 success，避免 loading 抖动。 */
  readonly peekFresh?: <A>(args: { readonly resourceId: string; readonly keyHash: string }) => Effect.Effect<
    Option.Option<A>,
    never,
    never
  >
}
```

约束补充（必须遵守）：

- `meta` MUST 为 JsonValue（可序列化、Slim、无闭包/无大对象）；diagnostics off 时建议为 undefined（lazy）。
- `peekFresh` MUST 是只读快路径：不得触发网络/磁盘 IO。

## 5) `Query.Engine.middleware`（EffectOp 外部引擎接管点）

### 输入前提

- 仅对满足以下条件的 EffectOp 生效：
  - `kind = "trait-source" | "service"`（source 运行时是主入口，必须覆盖）
  - `meta.resourceId` 存在
  - `meta.keyHash` 存在（稳定键；写回门控的共同口径）

### 行为

- middleware MUST 将请求委托给 `engine.fetch` 以获得缓存/去重：
  - 对同一 `(resourceId, keyHash)`，应复用 in-flight 与缓存命中（由引擎实现）。
- middleware MUST 保持 Logix 的语义事实源：
  - stale 丢弃与写回门控仍由 keyHash 与底层 source/runtime 语义保证；
  - middleware 不得把不可序列化对象写入诊断事件或日志。

### 取消语义（best-effort）

- `switch` 并发下，source 运行时会中断旧的 in-flight fiber（Effect 级取消），并始终用 `keyHash` gate 防止旧结果写回（保证状态正确性不依赖“取消是否成功”）。
- 若你希望“网络层真正取消”（例如 axios），`ResourceSpec.load` 必须使用 Effect 提供的 `AbortSignal`（例如 `Effect.tryPromise({ try: (signal) => axios.get(url, { signal }) })`）。否则只能做到“结果不写回”，请求仍可能跑完。
- `ResourceSpec` 本身不提供 `unload`；清理与取消应由 `load` Effect 的中断/finalizer 承担。

### 依赖环境捕获

- Engine 的实现 MUST 保证在外部引擎的 Promise 世界执行 Effect 时仍能访问 Effect Env（例如捕获当前 Env 并在 queryFn 内 `provide`）。

## 6) CacheHook（`peekFresh`）与“避免 loading 抖动”

- Query 自动触发（onMount/onKeyChange）在发起 refresh 前 MAY 先走一次 `engine.peekFresh(...)`：
  - 若命中 fresh success，则允许直接把 success snapshot 写回模块 state，并记录可回放事件（例如 `query:cache-hit`）。
  - 若未命中，则正常走 refresh → middleware → engine.fetch 路径。

对外边界（避免泄漏引擎细节）：

- `peekFresh` 默认不暴露在 `controller` 上：controller 只表达领域意图（params/ui/refresh/invalidate），不暴露引擎缓存细节。
- 若业务确实需要“导航前预热/检查缓存”这类能力，应通过显式 Logic 在 Effect Env 中 `yield* Query.Engine` 获取 Engine 并按需调用（或使用 `Query.TanStack.*` 的高级 helper）。

## 7) invalidate（事件化 + engine.invalidate + source.refresh）

- Query 的失效请求 MUST 进入可回放事件日志（例如 `kind = "query:invalidate"`）。
- 在事件化之后：
  - 若外部引擎存在，则 MUST 调用 `engine.invalidate(request)`；
  - 若外部引擎缺失，则 MUST NOT 因此失败（降级为仅触发 refresh），但 SHOULD 留下可解释的诊断信号。
- 失效后 MUST 触发相关 query 的 `source.refresh`（写回门控仍由 keyHash 保证）。

## 8) 错误语义与诊断

- “缺失引擎注入”在 `Query.Engine.middleware` 启用时必须是配置错误（error），而不是业务错误（domain error）。
- 错误提示必须可操作：至少包含“缺少哪个 Tag/Layer、如何注入、在哪个 scope 注入”的信息。
