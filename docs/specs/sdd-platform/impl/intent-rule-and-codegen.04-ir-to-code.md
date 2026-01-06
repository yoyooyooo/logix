# 4. IntentRule → Code：生成规范化 Logix 写法

从 IntentRule 生成代码时，平台应输出 **结构化且可解析的标准写法**，避免生成过于“聪明”的代码。

## 4.1 生成 L1 代码示例

给定 IntentRule：

```json
{
  "source": { "context": "self", "type": "state", "selector": "s => s.country" },
  "pipeline": [{ "op": "debounce", "args": [300] }],
  "sink": { "context": "self", "type": "mutate", "handler": "draft => { draft.province = '' }" }
}
```

生成代码（Fluent 版本；示例中的 `$Form` 概念上表示针对 FormShape 预绑定的 Bound API，当前实现中推荐在对应 ModuleDef 上通过 `ModuleDef.logic(($Form)=>...)` 获取 `$Form`）：

```ts
const $Form = {} as Logic.BoundApi<FormShape>

export const CountryProvinceLogic: Logic.Of<FormShape> = Effect.gen(function* () {
  const country$ = $Form.flow.fromState((s) => s.country)

  yield* country$.pipe(
    $Form.flow.debounce(300),
    $Form.flow.run(
      $Form.state.mutate((draft) => {
        draft.province = ""
      }),
    ),
  )
})
```

或直接生成 Fluent Intent DSL（同样假定 `$Form` 由对应 Module 注入）：

```ts
export const CountryProvinceLogic: Logic.Of<FormShape> = Effect.gen(function* () {
  yield* $Form.onState((s) => s.country)
    .debounce(300)
    .mutate((draft) => {
      draft.province = ""
    })
})
```

平台可以提供选项：优先生成 Fluent DSL，或优先生成底层 Flow 写法。

## 4.2 生成 L2 代码示例

给定跨 Store IntentRule：

```json
{
  "source": { "context": "SearchStore", "type": "state", "selector": "s => s.results" },
  "pipeline": [],
  "sink": { "context": "DetailStore", "type": "dispatch", "handler": "results => ({ ... })" }
}
```

生成代码（Fluent 版本；示例中的 `$` 概念上表示针对 CoordinatorShape 预绑定的 Bound API，当前实现中推荐在对应 ModuleDef 上通过 `ModuleDef.logic(($)=>...)` 获取 `$`）：

```ts
const $ = {} as Logic.BoundApi<CoordinatorShape>

export const SearchDetailCoordinator: Logic.Of<CoordinatorShape> = Effect.gen(function* () {
  const $Search = yield* $.use(SearchStore)
  const $Detail = yield* $.use(DetailStore)

yield* $.on($Search.changes((s) => s.results))
  .filter((results) => results.length > 0)
  .run((results) =>
    $Detail.dispatch({
      _tag: "detail/init" as const,
      payload: pickFirst(results),
    }),
  )
})
```

此类 Fluent 代码非常适合被解析器识别回 IntentRule，实现 Full‑Duplex。
