# IntentRule ↔ TS 代码 · 解析与出码草图

> **Status**: Draft (v3 Final · Implementation Planning)
> **Scope**: 平台如何在 v3 下实现 IntentRule 与 Logix/TS 代码之间的单向/双向映射（Parser & Codegen）。

本说明文档基于 `runtime-logix/core/06-platform-integration.md` 中的 IntentRule 定义，补充平台实现视角的细节：
- 从 TS 代码中解析出 IntentRule（Code → IR）；
- 从 IntentRule 生成标准化 TS 代码（IR → Code）；
- 限定“可解析子集”，避免解析器过度复杂。

## 1. IntentRule 回顾

核心结构（简化版）：

```ts
interface IntentRule {
  source: {
    context: "self" | string
    type: "state" | "action"
    selector: string        // AST 引用或序列化表达式
  }
  pipeline: Array<{
    op: "debounce" | "throttle" | "filter" | "switchMap" | "exhaustMap" | "custom"
    args: ReadonlyArray<unknown>
  }>
  sink: {
    context: "self" | string
    type: "mutate" | "dispatch" | "service"
    handler: string        // AST 引用或序列化表达式
  }
}
```

平台职责：

- 尽可能从规范化的 Logix 代码恢复为 IntentRule；
- 在平台 UI 中编辑 IntentRule，再生成规范化的 Logix 代码。

## 2. Code → IntentRule：可解析子集

解析器只处理特定模式的代码，超出部分视为 Gray Box。

### 2.1 Source 模式

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

### 2.2 Pipeline 模式

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

### 2.3 Sink 模式

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

## 3. L1 / L2 Fluent DSL 与 Intent.IR 的映射

在 v3 最终形态中，业务代码推荐使用 Fluent DSL 编排 L1/L2 规则，IR 层统一使用 `IntentRule` 表达，不再单独定义任何运行时 `Intent` 命名空间。
本节说明 Fluent 写法与 IntentRule / Intent.IR 之间的映射关系。

### 3.1 L1：单 Store 内联动

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

### 3.2 L2：跨 Store 协作

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

## 4. IntentRule → Code：生成规范化 Logix 写法

从 IntentRule 生成代码时，平台应输出 **结构化且可解析的标准写法**，避免生成过于“聪明”的代码。

### 4.1 生成 L1 代码示例

给定 IntentRule：

```json
{
  "source": { "context": "self", "type": "state", "selector": "s => s.country" },
  "pipeline": [{ "op": "debounce", "args": [300] }],
  "sink": { "context": "self", "type": "mutate", "handler": "draft => { draft.province = '' }" }
}
```

生成代码（Fluent 版本；示例中的 `$Form` 概念上表示针对 FormShape 预绑定的 Bound API，实际 PoC 中推荐在对应 Module 上通过 `Module.logic(($Form)=>...)` 获取 `$Form`）：

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

### 4.2 生成 L2 代码示例

给定跨 Store IntentRule：

```json
{
  "source": { "context": "SearchStore", "type": "state", "selector": "s => s.results" },
  "pipeline": [],
  "sink": { "context": "DetailStore", "type": "dispatch", "handler": "results => ({ ... })" }
}
```

生成代码（Fluent 版本；示例中的 `$` 概念上表示针对 CoordinatorShape 预绑定的 Bound API，实际 PoC 中推荐在对应 Module 上通过 `Module.logic(($)=>...)` 获取 `$`）：

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

## 5. 与 ESLint / 工具链的协作

为了保持“代码可解析”，平台和 runtime 建议提供 ESLint 规则或 CLI 检查：

- 禁止在可解析子集范围内使用复杂表达式：
  - 例如 forbidding：`source.pipe(doSomethingDynamic())` 作为 IntentRule 源；
  - 引导开发者把复杂逻辑放入 Pattern / Service，而不是塞进 Flow pipeline 中。

- 提供自动修复建议：
- 将“展开写法”重构为标准 Fluent 链（e.g. 识别 `fromState + debounce + run(state.mutate)`，自动建议替换为 `$.onState(...).debounce(...).mutate(...)`）。

这可以保证随着代码库增长，越来越多的 Logic 写法落在“可解析、可 round‑trip”的子集内。

## 6. 总结

v3 在 IntentRule ↔ TS 代码映射上的策略是：

- 明确可解析子集（Fluent DSL + 常见 Flow 组合）；
- 生成规范化、结构化的代码写法，方便 Parser 反向还原；
- 利用 ESLint/工具链约束越界写法，降低解析器复杂度；
- 对解析不了的部分坦率标为 Gray/Black Box，而不是做不可靠的“智能猜测”。

这为后续 v4 级别的 Full‑Duplex（画布 ↔ 代码双向实时同步）打下稳定基础。***
