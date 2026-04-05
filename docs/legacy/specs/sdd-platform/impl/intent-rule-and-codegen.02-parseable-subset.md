# 2. Code → IntentRule：可解析子集

解析器只处理特定模式的代码，超出部分视为 Gray Box。

## 2.1 Source 模式

支持两类 Source：

1. State 触发：

```ts
const country$ = $Form.flow.fromState((s) => s.country)
```

映射为：

```json
{
  "source": {
    "context": "self",
    "type": "state",
    "selector": "s => s.country" // 以字符串或 AST 序列化存储
  }
}
```

2. Action 触发：

```ts
const submit$ = $Form.flow.fromAction(
  (a): a is { _tag: "form/submit" } => a._tag === "form/submit"
)
```

映射为：

```json
{
  "source": {
    "context": "self",
    "type": "action",
    "selector": "a => a._tag === 'form/submit'"
  }
}
```

解析器在 AST 层的匹配规则：

- 调用链起点为 `$X.flow.fromState` / `$X.flow.fromAction`；
- 仅支持参数为单个箭头函数，内部是简单属性访问或 `_tag` 字面量比较。

## 2.2 Pipeline 模式

支持的 Flow 组合算子：

- `flow.debounce(ms)` → `op: "debounce", args: [ms]`
- `flow.throttle(ms)` → `op: "throttle", args: [ms]`
- `flow.filter(predicate)` → `op: "filter", args: [<predicate AST>]`
- `flow.run(...)` / `runLatest` / `runExhaust` → 影响并发语义，可编码进 pipeline 的最后一步。

代码模式（链式）：

```ts
const effect$ = source$.pipe(
  $X.flow.debounce(300),
  $X.flow.filter((v) => v.length > 2),
  $X.flow.runLatest(someEffect),
)
```

解析器策略：

1. 识别 `CallExpression` 链式结构：`source$.pipe( ... )`；
2. 逐个分析 `pipe` 参数：
   - 若是 `Identifier` 或 `PropertyAccessExpression` 指向 `$X.flow.debounce`：记录为 `debounce`；
   - 若是 `CallExpression`，检查 callee 是否是 `$X.flow.debounce/throttle/filter/run*`；
3. 将识别到的算子按顺序写入 IntentRule.pipeline。

超出可解析子集的 Pattern：

- 使用任意 Stream/Effect 组合器（非 Flow API）；
- 在 `pipe` 中传入匿名函数或复杂表达式；

这些将被标记为 `op: "custom"`，并附带原始代码片段供后续人工查看。

## 2.3 Sink 模式

支持三类 Sink：

1. State mutate：

```ts
$X.flow.run(
  $X.state.mutate((draft) => {
    draft.province = ""
  }),
)
```

映射为：

```json
{
  "sink": {
    "context": "self",
    "type": "mutate",
    "handler": "draft => { draft.province = '' }"
  }
}
```

2. State update（纯函数）：

```ts
$X.flow.run(
  $X.state.update((prev) => ({ ...prev, count: prev.count + 1 })),
)
```

同样映射为 `type: "mutate"` 或 `type: "update"`（可选区分）。

3. Action dispatch（跨 Store also）：

```ts
$Source.flow.run(
  Target.actions.dispatch({ _tag: "detail/init", payload: ... }),
)
```

映射为：

```json
{
  "sink": {
    "context": "DetailStore",    // 从 Target Tag 或变量名推导
    "type": "dispatch",
    "handler": "a => ({ _tag: 'detail/init', payload: ... })"
  }
}
```

解析器模式：

- 识别 `$X.state.mutate` / `$X.state.update` / `$X.actions.dispatch` / `OtherStore.actions.dispatch` 调用；
- 将内部箭头函数 AST 序列化为 handler 字符串。
