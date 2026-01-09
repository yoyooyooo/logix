# 7) `@logixjs/query`（Feature Kit：Query module + ResourceSnapshot 写回 state）

## 你在什么情况下会用它

- 需要“查询结果也进模块 state”（可订阅/可调试/可回放），并支持自动触发/竞态门控/刷新/失效。

## 核心概念

- `Query.make(id, { params, initialParams, ui?, queries })`：生成 Query Module（对外返回 `Logix.Module.Module`，并通过 handle 扩展暴露 `controller`）
- Query 结果写回 state：每个 query 字段是 `Logix.Resource.ResourceSnapshot<...>`
- **组合语义（layer × middleware）**：
  - 无 `Query.Engine.layer` + 无 `Query.Engine.middleware`：降级为 `ResourceSpec.load`（无缓存/去重）
  - 有 `Query.Engine.layer` + 无 `Query.Engine.middleware`：不接管 fetch；仅用于 `peekFresh/invalidate` 等非接管能力（不推荐默认）
  - 无 `Query.Engine.layer` + 有 `Query.Engine.middleware`：配置错误，必须显式失败（禁止静默退化）
  - 有 `Query.Engine.layer` + 有 `Query.Engine.middleware`：引擎接管 fetch（缓存/去重/失效），推荐默认（TanStack）

## 最小用法入口

- docs：`apps/docs/content/docs/guide/learn/query.md`
- 示例：`examples/logix-react/src/modules/querySearchDemo.ts`、`examples/logix/src/scenarios/middleware-resource-query.ts`
