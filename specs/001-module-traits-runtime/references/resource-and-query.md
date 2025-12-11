# Reference: Resource / Query 集成与 StateTrait.source

> 作用：把 spec / research / data-model / quickstart 中分散的 Resource / Query 设计集中拆开说明，作为 Phase 3 的设计 SSoT。  
> 对应 spec：FR-011、US5、US8；research 中的 Decision 4.1 ~ 4.5、7.x；data-model 第 8 节。

---

## 1. 用户视角回顾：Module 只写 resourceId + key

以 quickstart 中的 `CounterWithProfile` 为例，模块作者在图纸层只需要：

```ts
profileResource: StateTrait.source({
  resource: "user/profile",
  key: (s: Readonly<State>) => ({ userId: s.profile.id }),
})
```

心智模型：

- `resource`：逻辑资源 ID，描述“我要用什么资源”；  
- `key(state)`：从 State 计算访问该资源所需的 key，语义类似“强类型 queryKey”；  
- 资源访问逻辑（HTTP / RPC / DB / QueryClient 等）全部在 Runtime 层通过 Resource / Query 命名空间配置，而不是写进 Module。

StateTraitProgram / Plan 只保留：

- `resourceId: string`；  
- `keySelector: (state: Readonly<S>) => Key`。

Runtime 再基于这两个信息决定走哪条访问路径。

---

## 2. Resource 命名空间：定义逻辑资源规格

### 2.1 ResourceSpec 概念

ResourceSpec 描述“一个逻辑资源长什么样、如何访问”，由 Resource 命名空间负责定义和注册。

典型草图：

```ts
interface ResourceSpec<Key, Out, Err, Env> {
  readonly id: string                    // 逻辑资源 ID（与 StateTrait.source.resource 对齐）
  readonly keySchema: Schema.Schema<Key, any>
  readonly load: (key: Key) => Effect.Effect<Out, Err, Env>
  readonly meta?: {
    cacheGroup?: string
    description?: string
    [k: string]: unknown
  }
}
```

对外 API 形态（概念，对应 `Logix.Resource.*`）：

```ts
export type Spec<Key, Out, Err, Env> = ResourceSpec<Key, Out, Err, Env>

export function make<Key, Out, Err, Env>(
  spec: ResourceSpec<Key, Out, Err, Env>,
): ResourceSpec<Key, Out, Err, Env>

export function layer(
  specs: ReadonlyArray<ResourceSpec<any, any, any, any>>,
): Layer.Layer<never, never, ResourceRegistry>
```

约束：

- ResourceSpec 中的 `load` 基于 Service Tag / Layer 实现，保持 Effect-Native；  
- ResourceSpec 注册在 RuntimeProvider 的环境下（通过 `Resource.layer([...])`），在 dev 模式可做 `id` 冲突检测；  
- StateTrait / Module 图纸层永远只知道 `resourceId` 字符串，不直接接触 ResourceSpec 类型。

### 2.2 作用域与 RuntimeProvider

- 根 Runtime 挂载“全局必备资源”的 Resource.layer；  
- 路由级别或子树可以通过 RuntimeProvider 追加 Resource.layer，这样：
  - 资源声明仍留在 Module 图纸（`resourceId + key`）；  
  - 具体实现按运行范围划分，避免一个巨大且稀疏的全局 Registry。

效果：

- 在某个路由子树可以“开一组资源实现”，退出该子树后自动失效；  
- Devtools 可以基于「StateTraitGraph + ResourceRegistry」渲染“某个模块/路由依赖了哪些资源，由谁实现”。

---

## 3. Query 命名空间：查询引擎的可插拔接线

Query 命名空间负责把某些 `resourceId` 映射到带缓存/重试能力的查询引擎（例如 TanStack Query），但不改变 StateTrait.source / Program 的结构。

概念 API：

```ts
export namespace Query {
  function layer<Client>(
    client: Client, // 例如 TanStack QueryClient
  ): Layer.Layer<never, never, never>

  function middleware(
    config?: QueryMiddlewareConfig,
  ): EffectOpMiddleware
}
```

行为：

- `Query.layer(client)`：在 RuntimeProvider 范围内注入 QueryClient 实例；  
- `Query.middleware(config)`：订阅 `EffectOp(kind = "service")`，基于 `resourceId + key + config` 决定：
  - 直接调用 ResourceSpec.load（不走查询引擎）；  
  - 还是把 key 作为 queryKey 交给 QueryClient 管理（缓存/重试/失效策略等）。

约束：

- StateTrait / Program 不理解 Query 专有字段，也不区分“走不走 QueryClient”；  
- 开启或关闭 Query 行为只依赖是否装配 `Query.layer + Query.middleware`，保持可插拔。

作用域：

- 在某个 RuntimeProvider 子树装载 Query.layer + Query.middleware，即可让该子树所有 source 统一走 QueryClient；  
- 移除这些 Layer/中间件，则自动退回到“直接调用 ResourceSpec.load”的模式。

---

## 4. 与 StateTrait.source 的契约关系

StateTrait.source 的职责非常窄：

- 对 Module 作者：声明“这个字段是某逻辑资源的快照”，给出 resourceId 和 key 规则；  
- 对 StateTraitProgram：在 Graph / Plan 中标记某个字段为 `kind = "source"`，记录 resourceId 与 keySelector 的依赖字段。

Runtime 侧的责任：

1. StateTrait.install 依据 Plan 在**显式入口被调用时**触发 source-refresh（v001）：  
   - 为每个 source 字段在 Bound API / Runtime 上生成一个标准的加载入口（例如 `$.traits.source.refresh("profileResource")`），该入口在被调用时执行一次对应的 `source-refresh` 计划；  
   - 从当前 State 计算 key；  
   - 构造 `EffectOp(kind = "service", name = resourceId, meta.key = key, meta.fieldPath = ...)`；  
   - 把该 EffectOp 丢给 Middleware 总线。  
   - 默认情况下，StateTrait.install 不在模块挂载或任意 State 变化时隐式触发 source-refresh；若未来引入 `onMount` / `onKeyChange` 等自动模式，必须通过 traits 配置与 Runtime/Middleware 显式启用（见 FR-019）。
2. Middleware 总线：
   - Resource 中间件：解析 resourceId + key，路由到 ResourceSpec.load；  
   - Query 中间件（可选）：在有 Query.layer 的范围内选择性走 QueryClient。

因此：

- StateTrait.source → Program/Plan → EffectOp → Resource / Query，中途没有“私有通道”；  
- Devtools / Debug 只需看 EffectOp 与 Graph，就能理解“哪个模块的哪个字段在访问哪个资源，用什么 key”。

---

## 5. Query 语法糖：包裹而不修改 Trait IR

Query 语法糖（例如 `Query.source`）建立在 StateTrait.source 之上，目标是：让常见的资源场景更易写，但不改变 Trait IR。

最小形态示例（内部实现）：

```ts
export const Query = {
  source: <S, K>(options: {
    resource: string
    key: (state: Readonly<S>) => K
  }) => StateTrait.source(options),
}
```

Module 使用：

```ts
profileResource: Query.source<State>({
  resource: "user/profile",
  key: (s) => ({ userId: s.profile.id }),
})
```

要求：

- 在 StateTraitProgram / Graph 上，这与直接写 `StateTrait.source` 完全等价；  
- 不允许 Query 语法糖引入新的 Trait kind 或扩展 StateTraitEntry.meta 结构；  
- 所有缓存/重试/分组等 Query 相关策略，都必须通过 ResourceSpec.meta / QueryConfig / Middleware 传入。

更高阶语法糖（例如 `Query.cachedSource`、`Query.sourceByPath`）可以：

- 内部根据路径推导 key 函数；  
- 自动填充 QueryMiddlewareConfig 或 ResourceSpec.meta。  

但必须满足：

- 去掉 Query 相关 Layer/Middleware 后，模块仍然行为正确，只是失去缓存/重试等能力；  
- StateTrait 层不感知这些差异。

---

## 6. 实现与验收要点（对应 Phase 3）

实现时需满足：

1. Resource / Query 命名空间实现与本文件/`data-model.md` 中的数据模型一致；  
2. StateTrait.install 在 source-refresh 步骤中只构造 EffectOp，不直接依赖任何具体 Resource / Query Tag；  
3. 在 RuntimeProvider 范围内叠加/移除 Resource.layer / Query.layer / Query.middleware 时：
   - 同一 Module / Trait 声明无需修改；  
   - Devtools 能清楚展示当前范围内的 ResourceSpec 与 Query 行为。  
4. Query 语法糖的实现要有单元测试证明其 IR 等价性：
   - 同一 `state + traits` 用 StateTrait.source vs Query.source 生成的 Program/Graph 必须一致。

这部分设计拆完后，即可按 plan 中 Phase 3 的节奏进入具体代码实现。
