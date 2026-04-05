# 联动与 IR 对齐（从 Flow 文档拆分）

## 4.1 L1：单 Module 内联动（IR 视角）

L1 IntentRule 负责抽象表达单 Module 内部的同步联动，其代码侧推荐写法是 Fluent DSL：

```ts
// 字段联动：State -> State（业务写法）
yield* $.onState<MyShape>((s) => s.country)
  .mutate((draft) => {
    draft.province = ""
  })
```

抽象语义不变：

- “监听某个 State 视图的变化，并在每次变化时更新当前 Module 的 State”。

## 4.2 L2：跨 Module 协作（Coordinate IntentRule）

L2 IntentRule（Coordinate）用于表达跨 Module 的标准协作模式，例如 Search → Detail。
代码侧推荐写法是通过 `$.use` 获取远端 StoreHandle + Fluent DSL：

```ts
// 业务代码（Fluent 写法）
const $Search = yield* $.use(Search)
const $Detail = yield* $.use(Detail)

yield* $.on($Search.changes((s) => s.results))
  .filter((results) => results.length > 0)
  .run(
    Effect.gen(function* () {
      yield* $Detail.dispatch({ _tag: "detail/initialize", payload: /* ... */ })
    })
  )
```

在 IR 中，这一规则会被归纳为一条 L2 IntentRule，`source.context = SearchStoreId`，`sink.context = DetailStoreId`，`pipeline/sink.handler` 分别反映 filter 与 dispatch 逻辑。

> 约定
>
> - 不再定义单独的 `Intent` 运行时命名空间；
> - 业务代码一律通过 Fluent DSL（`$.onState` / `$.onAction` / `$.on` + `.update/.mutate/.run*`）表达规则，由 Parser 负责生成/更新对应的 IntentRule；
> - 平台/工具在 IR 层只操作 `IntentRule` 结构，而不是某个 `Intent.*` API。

## 4.3 Primary Reducer 与 `$.reducer`（语义补充）

在当前主线中，「状态主路径」与 watcher 明确分层：

- **Primary Reducer**：
  - 来自 `Logix.Module` 定义中的 `reducers` 字段，或在 Logic 中通过 `$.reducer` 注册；
  - 形态固定为同步纯函数：`(state, action) => nextState`；
  - 由 `ModuleRuntime.dispatch` 在发布 Action 之前同步应用，是 Action → State 的权威路径（State Intent）。
- **Watcher (`$.onAction / $.onState / $.on`)**：
  - 基于 `actions$ / changes(selector)` 的 Stream + Flow；
  - 承载联动、派生字段与副作用（Flow Intent），可以访问 Env、发起 IO 等。

运行时时序（简化）：

1. 调用 `dispatch(action)`；
2. 如果存在对应 `_tag` 的 primary reducer，先同步更新 State（`SubscriptionRef`）；
3. 记录一次 `action:dispatch` Debug 事件（`state:update` 事件由内部 `setState` 记录）；
4. 将 Action 广播到 `actions$`，触发所有 watcher。

Bound API 提供 `$.reducer` 作为在 Logic 中注册 primary reducer 的语法糖：

```ts
export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // 1. 主路径：同步、纯状态变换
    yield* $.reducer(
      "set",
      Logix.Module.Reducer.mutate((draft, payload) => {
        draft.count = payload;
      }),
    );

    // 2. watcher：派生字段 / 副作用
    yield* $.onState((s) => s.count)
      .run(($count) =>
        $.state.update((prev) => ({
          ...prev,
          isZero: $count === 0,
        })),
      );
  }),
);
```

约束与实践建议：

- primary reducer 不访问 Env，不做 IO，不再 dispatch，只负责「当前 Action 对 State 的主效果」；
- watcher 则专注「在 State / Action 变化之后需要发生的联动与副作用」；
- `Logix.Module.Reducer.mutate` 提供与 `$.state.mutate` 一致的 draft 写法（mutator 回调为 `(draft, payload)`），内部通过 `mutative` 映射为不可变更新。

## 4.4 Watcher handler 上下文：payload-first +（可选）prevState

默认形态下，Fluent DSL 的 watcher handler 一律以 **payload 优先** 作为第一参数：

- `$.onAction(predicate).run((payload) => ...)` 中的 `payload` 始终代表触发源本身：
  - 对 Action watcher：`payload = ActionOf<Sh>`（例如 `{ _tag: "inc"; payload: void }`）；
  - 对 State watcher：`payload = selector(state)` 的返回值。
- 这一写法不携带额外上下文（如 `state`、`env`），便于与 IntentRule 中的“source → pipeline → sink(handler)” 一一对应。

当 handler 需要读取当前模块 State 时，当前实现推荐两种方式：

1. 使用 `.update((prev, payload) => next)` / `.mutate((draft, payload) => void)`：
   - `prev`/`draft` 即当前事务内的 State 快照（避免额外的“先读再写”样板代码）；
   - 性能：只有显式使用 `update/mutate` 的 watcher 才会在每次事件上读取 State（payload-only 的 `.run` 不引入额外读取）。
2. 在 `.run((payload) => Effect.gen(...))` 内显式 `yield* $.state.read`：
   - 适合“读取 State，但不一定写 State”的场景；
   - 代价与语义更显式，便于后续平台 IR 做精确标注。
