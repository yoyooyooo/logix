# Contract: `@logix/query`（对照领域）× 外部查询引擎

> 目标：Query 作为 Form 的对照组用于压力测试 API 设计。允许把缓存/去重交给外部引擎，但 Logix 必须保住触发/并发/可回放/可解释的语义事实源。

## 1. Blueprint

Blueprint SHOULD 包含：

- `id`
- `paramsSchema` + `initialParams`
- `ui`（例如 `ui.query.autoEnabled`）
- `queries`：一个或多个 query 定义（resourceId + deps + triggers + concurrency + keySelector）
- `module` / `impl` / `logics` / `controller`：按 Logix Module 标准入口暴露；Query 作为“特殊的 Module”可通过 Root `imports` 组合进应用（同源状态、同源回放/诊断）。

并且：

- Query 的 params/result/ui 都必须落在 Module state 上；不得在 UI 或外部 store 维护第二套不可回放事实源（避免“Query 与 Store 何时同步”的不确定性）。
- `Query.traits(schema)(spec)` SHOULD 存在作为可选语法糖：输出可 spread 的 StateTraitSpec 片段，用于声明“参数 → 异步快照”的依赖关系；实现必须能降解为 `StateTrait.source + computed/check`。
- `Query.Ref` SHOULD 存在作为 Ref helper：MAY 直接 re-export `TraitLifecycle.Ref`（语义所有权仍在 kernel）。
- `Query.Result` SHOULD 存在作为结果视图 helper：从 ResourceSnapshot 提取 loading/error/data 等 UI 友好视图。
- `Query.TanStack`（或等价命名）SHOULD 存在作为外部引擎集成层：把 QueryClient 的 fetch/invalidate/observer 订阅封装为可解释、可回放的执行路径。
- Query MAY 为 DX re-export：`Query.install = TraitLifecycle.install`（语义所有权仍在 kernel）。

## 2. Triggers（触发语义）

至少支持：

- `onMount`：初始触发
- `onValueChange`：参数变化触发（可选 debounce）
- `manual`：仅手动触发（必须独占）

触发来源必须可被诊断与回放复现。

## 3. 并发与竞态（正确性不依赖取消）

- 至少两种并发策略：switch（只认最新）与 exhaust(trailing)；
- stale 丢弃必须基于 keySchema normalize + keyHash；
- 即使外部引擎支持 cancel，正确性也不得依赖 cancel。

## 4. 缓存复用与 in-flight 去重（可委托外部引擎）

外部引擎可负责：

- cache / gc / staleTime
- in-flight 合并
- 可选 retry / cancel

Logix 必须负责：

- keyHash 相等性与写回门控
- 可回放事件（例如 invalidate）
- 诊断解释（复用/未复用原因、触发来源、stale 丢弃原因）

## 5. DI 注入（`Query.layer()` / QueryClientTag）

Query 领域必须通过 effect 的依赖注入向宿主索取“外部查询引擎实例”（默认实现为 QueryClient），并提供全局 Runtime 注入方式：

- `@logix/query` MUST 暴露一个 Tag（例如 `QueryClientTag`），用于在运行时获取 QueryClient 实例。
- `@logix/query` MUST 提供 `Query.layer(queryClient)`（或等价 API）作为便捷 Layer：
  - 语义等价于 `Layer.succeed(QueryClientTag, queryClient)`；
  - 供应用在 Root Runtime 层统一注入（例如合并到 `Runtime.make(..., { layer })` 或 RootImpl.layer）。
- 作用域约束：
  - 同一 Runtime 作用域内 SHOULD 只有一个 QueryClient（保证缓存/in-flight 去重语义一致）；
  - 跨 Runtime 作用域允许不同 QueryClient（缓存隔离），但 Logix 的 keyHash 门控与回放/诊断口径必须保持一致。
- 若运行时未提供该 Tag，则 Query 领域的“缓存复用/in-flight 去重”无法成立，应视为配置错误并给出可解释诊断（避免静默退化）。

## 6. TraitLifecycle（统一下沉接口）

- Query 的默认 logics MUST 基于 TraitLifecycle 的 scoped execute（见 `contracts/trait-lifecycle.md`）：
  - 自动触发（onMount/onValueChange）与手动触发（manual）都必须能被降解为同一条“触发 → 并发控制 → keyHash 门控 → 写回快照”的内核执行链路；
  - 失效/刷新必须以可回放事件进入日志，回放时按录制事实重赛（不重发真实请求）。

## 7. InvalidateRequest（失效/刷新）

失效请求必须可组合，至少支持：

- byResource
- byParams
- byTag

失效行为必须进入事件日志，回放时按录制事实重赛。
