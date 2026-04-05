# 3. Flow (The Time & Concurrency Layer)

Flow 负责围绕领域模块的运行时容器构造时间轴与并发语义，其职责是回答：
**“什么时候触发？以何种并发语义执行？”**

在当前主线中：

- 业务代码优先使用 **`$.onState` / `$.onAction` / `$.on + .update/.mutate/.run*`** 这套 Fluent DSL；
- 底层库 / Pattern 内部可以直接使用 `Flow.*` 命名空间级 DSL（时间/并发）配合 Effect 原生结构算子（分支/错误/并发），将 ModuleRuntime 暴露为 Stream 源；
- `$.flow.*` 主要作为 Bound API 上的逃生舱和高级用法入口，一般业务场景不推荐直接使用；其接口与 `Flow.Api` 一致，只是预绑定了当前 Env。

## 3.1 触发源 (Triggers)

```ts
// 从 Action 流中筛选某一类 Action（通常使用类型守卫）
$.flow.fromAction((a): a is SubmitAction => a._tag === "submit");

// 从 State 的某个 selector 构造变化流
$.flow.fromState(s => s.form.keyword);
```

## 3.2 变换与过滤 (Transformers)

```ts
$.flow.debounce(300);                     // 防抖
$.flow.throttle(500);                     // 节流
$.flow.filter(keyword => keyword !== ""); // 过滤
```

这些算子都是 `Stream -> Stream` 的变换，平台可以将它们渲染为中间处理节点（计时器、漏斗等）。

## 3.3 运行策略 (Runners)

```ts
// 串行：默认逐个处理事件（单 watcher 内顺序执行）
$.flow.run(effect);

// 并行：显式无界并发，适用于日志/打点等高吞吐副作用
$.flow.runParallel(effect);

// 最新：后触发的 Effect 会取消仍在执行的旧 Effect（典型搜索联动）
$.flow.runLatest(effect);

// 阻塞：当前 Effect 尚未完成时直接丢弃新的触发（防重复提交）
$.flow.runExhaust(effect);

// 串行：按触发顺序排队，一个完成后才执行下一个（默认语义）
$.flow.run(effect);
```

所有 `run*` 的类型形态统一为：

```ts
run*<A, E, R2>(
  eff: Effect.Effect<A, E, R2>,
): (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>;
```

即保留 Effect 的错误通道与环境类型，只改变其为“挂在某个流上的执行器”。

> 实现说明（与当前实现对齐）
>
> - 在推荐实现中，`$.flow.run` 使用 `Stream.runForEach` 消费源流，保证同一条 watcher 内的 Effect 串行执行；
> - `$.flow.runParallel` 使用 `Stream.mapEffect(..., { concurrency: "unbounded" })` + `Stream.runDrain` 实现显式无界并发；
> - 其余 `run*` 变体通过内部状态（如 latest/exhaust/queue）控制在单 watcher 内的并发语义；
> - Fluent API（`$.onState / $.onAction / $.on`）上的 `.update/.mutate/.run*` 在语义上必须等价于“先通过 `$.flow.from*` 拿到源流，再串上相应的 `Flow.run*` 或直接进行 `Stream.runForEach + state.update`”，
> - **不要求机械地通过 Flow.Api 组合实现**，但要求错误语义、并发语义与上述 `Flow.run*` 描述保持一致，便于 Parser 与 DevTools 在这两层之间建立一一对应关系。

## 3.4 Watcher 数量与性能基线

在推荐的 Fluent 写法中，高频模式为：

- `$.onAction(predicate).update/mutate/run*`：在 Module 的 `actions$` 流上挂多条 watcher；
- `$.onState(selector).update/mutate/run*`：在 `changes(selector)` 产生的视图流上挂多条 watcher；
- `$.on(source).update/mutate/run*`：在任意 Stream 上挂多条 watcher。

心智模型：

- 每条 watcher 本质是一段长期运行的 Flow/Effect 程序，生命周期绑定在 ModuleRuntime 的 Scope 上；
- 对于某次 Action / State 变更，所有 watcher 都会各自“看一眼”事件（跑一遍 predicate/selector 与流式管道），再决定是否把事件交给 handler；
- 真正的性能成本主要来自 handler（例如 `state.update/mutate`、网络请求、复杂计算），而不是单次 selector 本身。

当前在 Chromium + Vitest Browser 模式下的测量（仅作量级参考）：

- 单个 Module 的单段 Logic 内，随着 `on*` watcher 数量从 1 → 128 增加，“一次点击 → DOM 更新”的平均延迟基本保持在 30ms 级别内；
- 当 watcher 数量提升到约 256 时，同一条轻量 handler 的 click→paint 延迟会上升到约 40ms；
- 在 512 条 watcher、且所有 watcher 都命中同一 Action 并执行轻量 handler 的极端场景下，click→paint 延迟会接近 60ms。

开发者建议（供设计与代码评审时参考）：

- **绿区**（推荐）：单段 Logic 内的 `on*` watcher 数量控制在 **≤ 128**。此时即便 handler 稍重，交互仍然稳定；
- **黄区**（警戒）：接近 **256** 条 watcher 时，应评估单个 Action 实际命中的 handler 数量，以及 handler 内是否存在高频重逻辑（大规模 state 更新 / IO 等），必要时拆分 Logic 或合并规则；
- **红区**（避免）：单段 Logic 内 **≥ 512** 条 watcher 通常只接受为极端实验或特殊场景，正式业务建议通过拆 Module / 拆 Logic / 合并 Flow 来降低单点 fan-out。

  更详细的实现链路与压测结论见 `impl/04-watcher-performance-and-flow.md`。

## 3.5 异步 Flow 与 StateTransaction 边界（长链路模式）

> 本小节从 Logic/Flow 视角补充 StateTransaction 边界的直觉心智；运行时实现细节见 [`05-runtime-implementation.01-module-runtime-make.md#15-statetransaction-与状态提交路径`](../runtime/05-runtime-implementation.01-module-runtime-make.md#15-statetransaction-与状态提交路径) 与 [`09-debugging.md`](../observability/09-debugging.md)。

- **同一逻辑入口内的所有状态写入共用一笔事务**
  - 对于某一 `ModuleRuntime`，每次通过入口 API 进入 Runtime（例如 `dispatch` / `ModuleHandle.dispatch` / `handle.actions.xxx(...)` / `traits.source.refresh(fieldPath)` / Devtools 时间旅行）时，Runtime 会为该次入口打开一笔 StateTransaction，并在入口结束时提交：
    - 入口内部的 reducer / Trait / middleware / watcher 中的所有 `$.state.update` / `$.state.mutate` 写入都会落在这笔事务的草稿上；
    - 对外只在事务提交时写入一次底层状态，并发出一次 `state:update` Debug 事件与一次订阅通知。
  - 换句话说：**`$.onAction("x").run*/update/mutate` 只是“挂在入口产生的 Flow 上的 handler”，不会改变“单入口 = 单事务 = 单次提交”的不变量。**

- **入口内部的 `Effect.sleep` / HTTP 调用不会自动切事务**
  - 在 Logic/Flow handler 内使用 `Effect.gen` + `Effect.sleep` / 远程调用，只会让这次入口对应的 StateTransaction 挂起一段时间；
  - Runtime 不会因为 handler 中出现异步边界就自动拆分事务，也不会把 handler 内的 Effect 视为“第二次逻辑入口”；
  - 实际效果是：事务的 `durationMs` 变长，事务内部的“区域 1”更新在 commit 之前都不会对外可见。

  ```ts
  // 反例：单入口内既标记 loading，又等待 IO 再写回结果
  // 注意：runExhaust 是长期 watcher，实际使用时应放在 Effect.all(...) 中并行启动，
  // 或手动 Effect.forkScoped(...)；这里为突出事务边界省略外层启动样板。
  $.onAction("refresh").runExhaust(() =>
    Effect.gen(function* () {
      // 区域 1：在事务内更新状态，但外部暂时看不到
      yield* $.state.update((s) => ({ ...s, isLoading: true }))

      // 中间挂起 1s（事务仍在打开状态）
      yield* Effect.sleep("1 seconds")

      // 区域 2：再次更新状态
      yield* $.state.update((s) => ({ ...s, isLoading: false, data: ... }))
      // 对外只会看到「isLoading = false, data = ...」这一次提交
    }),
  )
  ```

- **推荐模式：长链路 = 多次入口（多笔事务）**
  - 规范建议：单个 StateTransaction 的窗口应只覆盖“同步计算 + 状态写入”，不跨越真实 IO；
  - 涉及「发起 IO + 等待结果 + 写回状态」的长链路逻辑，一律拆分为多次逻辑入口 = 多笔事务：

  ```ts
  // 推荐写法：用 Effect.all(...) 并行启动多条长期 watcher
  yield* Effect.all(
    [
      // 入口 1：点击 refresh，开启事务 1
      $.onAction("refresh").runExhaust(() =>
        Effect.gen(function* () {
          // 事务 1：同步标记 loading
          yield* $.state.update((s) => ({
            ...s,
            isLoading: true,
            error: undefined,
          }))

          const api = yield* $.use(UserApiTag)

          // 在事务 1 内只负责 fork IO，不等待结果再写状态
          yield* api
            .fetchUser()
            .pipe(
              Effect.matchEffect({
                onFailure: (err) =>
                  $.actions.refreshFailed(String(err)),  // 入口 3
                onSuccess: (result) =>
                  $.actions.refreshSuccess(result),      // 入口 2
              }),
              Effect.fork,
            )
        }),
      ),

      // 入口 2：IO 成功 → 事务 2（写回数据）
      $.onAction("refreshSuccess").run((action) =>
        $.state.update((s) => ({
          ...s,
          isLoading: false,
          data: action.payload,
        })),
      ),

      // 入口 3：IO 失败 → 事务 3（写回错误）
      $.onAction("refreshFailed").run((action) =>
        $.state.update((s) => ({
          ...s,
          isLoading: false,
          error: action.payload,
        })),
      ),
    ],
    { concurrency: "unbounded" },
  )
  ```

- **（新增）Task Runner：`run*Task` 语法糖（pending → IO → writeback）**
  - 当你希望“写法仍然线性”，又不想手写 `refreshSuccess/refreshFailed` 这类结果 Action 时，可以使用四个同构方法：
    - `runTask / runLatestTask / runExhaustTask / runParallelTask`
    - 并发语义分别镜像 `run / runLatest / runExhaust / runParallel`（仅在“IO 段”生效）。
  - 单次触发会被自动拆分为：
    1. **事务 1（pending）**：以 `origin.kind = "task:pending"` 开新入口提交 pending（只做同步状态写入）；
    2. **IO 段**：在事务窗口之外执行 `effect`；
    3. **事务 2（success/failure）**：IO 完成后，以 `origin.kind = "service-callback"` 写回结果。

  ```ts
  // 等价于上面的“推荐写法”，但无需显式声明 refreshSuccess/refreshFailed 结果 Action。
  yield* $.onAction("refresh").runExhaustTask({
    pending: () =>
      $.state.update((s) => ({
        ...s,
        isLoading: true,
        error: undefined,
      })),
    effect: () =>
      Effect.gen(function* () {
        const api = yield* $.use(UserApiTag)
        return yield* api.fetchUser()
      }),
    success: (result) =>
      $.state.update((s) => ({
        ...s,
        isLoading: false,
        data: result,
      })),
    failure: (cause) =>
      $.state.update((s) => ({
        ...s,
        isLoading: false,
        error: String(cause),
      })),
  })
  ```

- **一条实务口诀**
  - 想要“短事务 + 清晰时间线”：在入口 handler 内只做同步状态变更 + fork IO；
  - 想要“多笔事务串起长链路”：把「结果写回」改写为新的 Action / 入口，让 Runtime 再进一次入口 API，自然开启新事务；
  - 不要依赖 `Effect.sleep` 或其他异步调用自动切分事务。

  ## 4. Intent (L1/L2 IR Semantics)

在 Flow / 结构化控制流之上，Logix 使用 **IntentRule IR** 承载高频业务联动模式（L1/L2）：

- 业务代码通过 Fluent DSL（`$.onState` / `$.onAction` / `$.on` + `$.state` / `StoreHandle.dispatch`）表达规则；
- 平台 Parser 将这些 Fluent 链还原为结构化的 IntentRule，不再需要独立的 `Intent.*` 运行时命名空间。

> 使用优先级（代码视角）
>
> - **首选**：`$`（Bound API，包括 `$.state` / `$.actions` / `$.use` / `$.on*` / `$.match`）；
> - 库 / Pattern 内部：`Flow.*`（L3 时间/并发）配合 Effect 原生结构算子（分支/错误/并发）与底层 `Logix.ModuleRuntime`；
> - IR / 平台协议：`IntentRule`（L1/L2 规则的统一表示，包含 source/pipeline/sink/kind 等字段），不再单独定义 `Intent.*` 命名空间。
