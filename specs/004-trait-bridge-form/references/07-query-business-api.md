# References: `@logixjs/query` 业务 API（方案 B：Blueprint + Controller）

> 本文与 `references/06-form-business-api.md` 对齐：把 Query 领域包的“业务入口形态”固化为 Blueprint + Controller，确保 Query 仍然回落到 Trait/StateTrait/Resource 的单一运行时主线，不引入第二套引擎。

---

## 0. 目标与边界

- 业务开发默认只面对 `@logixjs/query` 的高层入口（Blueprint/Controller），而不是手写“监听参数变化 + 竞态处理 + stale 丢弃 + 缓存去重 + UI 状态”。
- Query 领域的 values（参数）、结果快照、以及交互态（autoEnabled/submitCount/lastTriggeredBy 等）都落在 Module state 上，全双工可回放。
- TanStack Query 只承担缓存/in-flight 去重/（可选）取消；触发语义、并发语义、写回门控（keyHash）与可解释性仍遵循 004 的 StateTrait/Resource 约束。

---

## 1. Blueprint：`Query.make`

Query Blueprint 的本质也是一个普通 `Logix.Module`：

- 内部等价于 `Logix.Module.make(id, { state, actions, reducers?, traits })`；
- `traits` 槽位用于声明 Query 的 source/derived/check 规则（可选语法糖 + raw StateTrait mix-in）。

建议形状（只固化语义，不锁死最终字段命名）：

```ts
import type * as Logix from "@logixjs/core"
import type { Schema } from "effect"

export interface QueryBlueprint<TParams> {
  readonly id: string
  readonly module: Logix.ModuleTagType<any, any>
  /**
   * 默认 ModuleImpl（桥接“模块图纸 → 可 imports 的实现单元”）：
   * - 等价于 `query.module.implement({ initial: query.initial(), logics: query.logics })`
   */
  readonly impl: Logix.ModuleImpl<any, any, any>
  readonly initial: (params?: TParams) => unknown
  readonly logics: ReadonlyArray<Logix.ModuleLogic<any, any, any>>
  readonly traits: unknown
  readonly controller: {
    readonly make: (runtime: Logix.ModuleRuntime<any, any>) => QueryController<TParams>
  }
}

export interface QueryController<TParams> {
  readonly getState: () => unknown
  readonly dispatch: (action: unknown) => void
  readonly setParams: (params: TParams) => void
  readonly refresh: () => void
  readonly invalidate: (args: unknown) => void
}

export interface QuerySourceConfig<TParams, TUI = unknown> {
  readonly resource: { readonly id: string }
  /**
   * 004 硬语义：显式依赖（用于触发收敛/图构建/可解释性）。
   *
   * - 建议写为从模块根出发的字段路径（例如 "params.q" / "ui.query.autoEnabled"）；
   * - 允许先粗后细：不确定时可先写 ["params", "ui"]，再逐步收敛到最小 deps。
   */
  readonly deps: ReadonlyArray<string>
  readonly autoRefresh?:
    | { readonly onMount?: boolean; readonly onDepsChange?: boolean; readonly debounceMs?: number }
    | false
  readonly concurrency?: "switch" | "exhaust"
  // args 顺序与 deps 一致（推荐用 builder 写法保留 tuple，从而让 key 入参类型可推导）
  readonly key: (...depsValues: ReadonlyArray<unknown>) => unknown | undefined
}

export interface QueryMakeConfig<TParams, TUI = unknown> {
  readonly params: Schema.Schema<TParams>
  readonly initialParams: TParams

  // 全双工 UI 状态（可回放）：如 autoEnabled/submitCount/lastTriggeredBy 等
  readonly ui?: TUI

  // 领域糖：高层 query 配置（可降级为 StateTrait.source 的等价结构）
  readonly queries?: Record<string, QuerySourceConfig<TParams, TUI>>

  // 可选：允许业务/框架 mix-in raw StateTrait 片段（escape hatch）
  readonly traits?: unknown
}

export declare const make: <Id extends string, TParams, TUI = unknown>(
  id: Id,
  config: QueryMakeConfig<TParams, TUI>
) => QueryBlueprint<TParams>
```

说明：

- 结果快照建议落为 `ResourceSnapshot/QuerySnapshot`（见 `references/03-query-data-model.md`），并遵循 keySchema + keyHash 门控与 stale 丢弃语义。
- 触发策略（autoRefresh：onMount/onDepsChange + debounce；以及 autoRefresh=false 的 manual-only）与并发策略（switch/exhaust）由 Blueprint 的默认 logics/traits 协议提供，并由内核约束其语义一致性。

---

## 2. Module 集成（全局 / 局部 / 非 React）

### 2.1 AppRuntime（全局模块）

```ts
const QueryImpl = query.module.implement({
  initial: query.initial(),
  logics: query.logics,
})

const RootImpl = Root.implement({
  initial: { /* ... */ },
  imports: [QueryImpl],
})
```

### 2.2 React（局部模块）

复用 `@logixjs/react` 的 `useLocalModule/useSelector/useDispatch`：

```ts
const runtime = useLocalModule(query.module, {
  initial: query.initial(),
  logics: query.logics,
})
const controller = query.controller.make(runtime)
```

---

## 3. TanStack Query 的落点（不侵入 kernel）

建议 `@logixjs/query` 自己提供 `Query.TanStack` 集成层（见 `references/05-query-tanstack-integration.md`）：

- 通过 Layer 注入 `QueryClient`；
- 在 Query 的刷新/失效路径中使用 QueryClient 的能力（fetchQuery / invalidateQueries / refetchQueries 等）；
- 若选择 Observer 驱动自动行为，则每条 source 规则在 runtime scope 内维护一个 `QueryObserver` 并在 scope 结束 cleanup（与 004 Clarifications 对齐）。
