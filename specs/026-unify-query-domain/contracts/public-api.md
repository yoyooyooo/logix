# Contract: Query 对外入口收口（`@logix/query` × Form 同形）

## 1) 唯一入口

- 系统 MUST 将 Query 领域能力的对外入口收口为 `@logix/query`。
- 系统 MUST 移除 `@logix/core/Middleware/Query` 这条对外导出路径；仓库内文档/示例/脚手架不得再推荐或使用该入口。

## 2) `@logix/query` 的领域包形状（与 `@logix/form` 同构）

> 说明：这里的“同构”只约束 **对外入口与组织方式**（namespace import、module factory、handle.controller 扩展与 building blocks 的组织），不强求 Query 的 authoring DSL 去类比 Form 的 `from/$.rules/derived`（两者的问题域不同）。

### 推荐使用方式

```ts
import * as Query from "@logix/query"
```

### MUST 暴露的对外能力（概念级）

- `Query.make(id, config)`：创建 Query Module（与 Form 一样，`make` 返回 `Logix.Module.Module`，而不是 Blueprint）。
  - 类型目标：`queries` 的 key union 必须贯穿到 `state.queries[queryName]` 与 `controller.refresh(queryName?)`，尽量避免字符串拼错导致的 silent bug。
  - 类型目标：`deps` 在不牺牲“字符串路径声明式”的前提下，尽量收窄到 `StateTrait.StateFieldPath<{ params; ui }>`（深度上限 4）。
  - DX 目标：controller 只对齐 TanStack 的“语义”，不对齐其“表面积”（例如 `refresh≈refetch`、`invalidate≈invalidateQueries`；但不暴露 `queryKey/staleTime/gcTime/setQueryData` 等引擎细节）。
- `Query.traits(...)`：提供 Query 规则 → StateTraitSpec 的降解入口（不引入第二套事实源；写回到 `state.queries.*`）。
- `Query.Engine`：外部查询引擎的唯一注入/接管入口（Effect Context.Tag）。
  - `Query.Engine.layer(engine)`：在 Runtime scope 内注入外部查询引擎实例（见 `query-engine-injection.md`）。
  - `Query.Engine.middleware(...)`：外部引擎接管点（EffectOp middleware）。当启用该 middleware 时，缺失引擎注入 MUST 作为配置错误失败。
- `Query.TanStack.engine(queryClient)`：TanStack 适配器：将 TanStack QueryClient 包装成 `Engine`（只在 `Query.TanStack.*` 暴露 TanStack 细节）。

### 推荐路径 vs 高级入口

- 推荐路径（80%）：`Query.make(..., { queries: { ... } })`（只声明 queries/触发/并发/key），并按需注入 `Engine`。
- 高级入口（20%）：业务将 `Query.traits(...)` + 领域 logics 作为 building blocks，把 query 快照字段挂到自定义主模块 state 上（仍保持单一事实源与可回放链路）。

### 允许的附加能力（SHOULD / MAY）

- `Query.TanStack.observe(...)`（或等价 helper）：用于需要 TanStack observer 的高级场景（scope 内订阅与 cleanup）。
- `Query` 领域默认 logics：自动触发与 invalidate（以可回放事件进入日志）。

## 3) 禁止事项

- Query 领域能力 MUST NOT 在 `@logix/core` 中保留第二套对外入口或第二套 DI Tag（避免双协议与语义漂移）。
- Query 领域能力 MUST NOT 对外同时暴露 `Query.EngineTag` / `Query.middleware` / `Query.layer` 等重复入口（避免“同名但不同协议”与团队写法分裂）；对外唯一入口为 `Query.Engine` + `Query.Engine.layer/middleware`。
- Query 领域能力 MUST NOT 对业务暴露不可回放的第二套状态事实源（params/ui/result 都必须落在模块 state 上）。
