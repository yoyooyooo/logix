# 3. L1 / L2 Fluent DSL 与 Intent.IR 的映射

在当前主线形态中，业务代码推荐使用 Fluent DSL 编排 L1/L2 规则，IR 层统一使用 `IntentRule` 表达，不再单独定义任何运行时 `Intent` 命名空间。
本节说明 Fluent 写法与 IntentRule / Intent.IR 之间的映射关系。

## 3.1 L1：单 Store 内联动

代码写法（Fluent）：

```ts
yield* $.onState((s: FormState) => s.country)
  .mutate((draft) => {
    draft.province = ""
  })
```

IntentRule IR 形态：

```json
{
  "source": { "context": "self", "type": "state", "selector": "s => s.country" },
  "pipeline": [],
  "sink": { "context": "self", "type": "mutate", "handler": "(value, prev) => ({ ... })" }
}
```

## 3.2 L2：跨 Store 协作

代码写法（Fluent）：

```ts
const $Search = yield* $.use(Search);
const $Detail = yield* $.use(Detail);

yield* $.on($Search.changes((s) => s.results))
  .filter((results) => results.length > 0)
  .run((results) =>
    $Detail.dispatch({
      _tag: "detail/init",
      payload: pickFirst(results),
    }),
  );
```

IntentRule IR 形态：

```json
{
  "source": { "context": "SearchModule", "type": "state", "selector": "s => s.results" },
  "pipeline": [{ "op": "filter", "args": ["results => results.length > 0"] }],
  "sink": {
    "context": "DetailModule",
    "type": "dispatch",
    "handler": "results => ({ _tag: 'detail/init', payload: pickFirst(results) })"
  }
}
```

前提是：调用点附近能解析出 Source/Target Module 定义或 Context.Tag 信息，以便在 IR 中填充 `context` 字段。
