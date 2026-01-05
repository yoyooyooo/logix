# 4. Resource / Query（逻辑资源与查询环境）

> 注意：`specs/*` 中的 **ReadQuery / SelectorSpec** 指“读状态依赖与投影（selector）”的可编译协议；它不是这里的 **Query（服务/缓存/请求）**，也不等同于 `@logix/query`。

- **Resource（逻辑资源规格）**
  - 概念上是「某类外部资源访问的规格说明」，由 ResourceSpec 描述：
    - `id`：逻辑资源 ID（例如 `"user/profile"`），与 StateTrait.source 中的 `resource` 对齐；
    - `keySchema`：用于描述访问 key 形状的 Schema（类似强类型 queryKey）；
    - `load(key)`：给定 key 如何访问该资源（Effect-native 实现，通常基于 Service Tag + Layer 注入）；
    - `meta`：缓存分组、描述信息等扩展位。
  - ResourceSpec 注册在 Runtime 环境中（通过 `Resource.layer([...])`），不同 RuntimeProvider 子树可以为同一资源 ID 提供不同实现。
- **Query（查询环境与中间件）**
  - 概念上是「针对部分资源接入查询引擎（如 QueryClient）的可插拔适配层」，不改变 StateTraitProgram 的结构：
    - `Query.Engine.layer(engine)`：在 Runtime scope 内注入外部查询引擎实例（默认推荐 `Query.TanStack.*` 适配）；
    - `Query.Engine.middleware(config)`：订阅 `EffectOp(kind="trait-source")`，基于 `resourceId + key + config` 决定某些调用是否由外部引擎接管（缓存/in-flight 去重/失效）。
  - StateTrait / Program **不理解** Query 细节，它们只负责在 Plan 中标记哪些字段是 Source、对应的 resourceId 与 key 规则；是否启用 Query 完全由 Runtime 层是否装配 `Query.Engine.layer + Query.Engine.middleware` 决定。
- **Runtime 协作关系（StateTrait.source ↔ Resource/Query）**
  - Module 图纸：只写 `StateTrait.source({ deps, resource, key })`（`key(...depsValues)`）；
  - StateTraitProgram：在 Graph/Plan 中标记 source 字段与 resourceId/keySelector；
  - Runtime：在显式入口（例如 `$.traits.source.refresh("profileResource")`）被调用时构造 `EffectOp(kind="trait-source", name = resourceId, meta.resourceId/meta.key/meta.keyHash)`，交给 Middleware 总线；
  - Resource / Query 中间件：根据 resourceId + key 决定走 ResourceSpec.load 还是 QueryClient，DevTools 则在 Timeline 中观察这些 Service 调用与 State 更新。
