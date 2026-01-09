# Migration: 从历史 Query 入口迁移到 `@logixjs/query`

> 本仓库拒绝向后兼容：以迁移说明替代兼容层。本文档覆盖“入口/注入/行为差异”三类典型改动点（对齐 spec SC-002）。

## 1) 入口迁移（import 路径）

### Before

- `@logixjs/core/Middleware/Query`

### After

- `@logixjs/query`

推荐统一写法（与 Form 同形）：

```ts
import * as Query from "@logixjs/query"
```

## 2) 注入迁移（Runtime scope）

### 仅使用 ResourceSpec.load（不启用外部引擎）

- 不提供 Query 引擎注入；
- 不启用 Query 的外部引擎 middleware。

结果：Query 规则仍可降解为 `StateTrait.source`，并通过 ResourceSpec.load 执行；不具备缓存/去重能力。

### 仅注入 Engine（不启用 middleware）

- 在 Runtime scope 内注入外部引擎实例：`Query.Engine.layer(engine)`
- 不启用 `Query.Engine.middleware()`

结果：引擎不会接管 fetch（仍走 `ResourceSpec.load`）；仅允许用于 `peekFresh`（避免 loading 抖动）与 `invalidate`（可选调用）等“非接管”能力，不作为推荐默认。

### 启用外部引擎（缓存/去重/失效）

- 在 Runtime scope 内注入外部引擎实例：`Query.Engine.layer(engine)`（`engine` 满足 `Engine` 契约）
- 同时启用引擎接管点 middleware：`middleware: [Query.Engine.middleware()]`

默认 TanStack 适配器示例：

- `Query.Engine.layer(Query.TanStack.engine(new QueryClient()))`

缺失注入时必须显式失败（配置错误），避免静默退化。

## 3) 行为差异与对照

### A. “静默退化” → “显式配置错误”

- 旧入口可能在缺失注入时仍执行 `ResourceSpec.load`，导致缓存/去重语义悄然失效；
- 新入口在“启用了需要引擎的能力但缺少注入”时必须报错并提示修复方式。

### B. 语法糖差异

- 历史 `Query.source(...)`（如果存在）只是 `StateTrait.source(...)` 的薄包装；
- 收口后推荐直接使用：
  - Query 领域：`Query.make(..., { queries: { ... } })` 或 `Query.traits(...)`
  - 内核入口：`Logix.StateTrait.source(...)`

### C. Module 作为领域入口（对齐 Form）

- `Query.make(...)` 返回模块资产：可以直接 `Logix.Runtime.make(QueryModule, ...)`；
- 当你需要把 Query 作为子模块组合进更大的 Runtime 时，才需要使用 `imports: [QueryModule.impl]`。
- 为了保住 controller 的类型收窄：React 侧优先 `useModule(QueryModule)`、Logic 侧优先 `$.use(QueryModule)`；直接使用 `.impl/.tag` 句柄会在类型层丢失扩展。

### D. 结果快照落点（`queries` 命名空间）

- 多 query 场景下的结果快照统一落到 `state.queries[queryName]`（每条 query 一份 `ResourceSnapshot`）。
- 这样业务可以通过 IDE 提示在 `state.queries.*` 下选择需要的 query，且避免与业务自定义 state 根字段冲突。

## 4) 仓库内必须同步迁移的引用点（最小集合）

- 文档：旧 spec/教程/深潜文档中的 import
- 示例：`examples/*` 中的 Query 入口
- 脚手架：`scripts/logix-codegen.ts`（生成的 import 形状）
- 测试：core 中与 Query 入口绑定的测试应迁移到 `packages/logix-query/test/*`
