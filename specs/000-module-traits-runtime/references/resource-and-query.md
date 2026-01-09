# Reference: Resource / Query 集成与 StateTrait.source

> 作用：把 spec / research / data-model / quickstart 中分散的 Resource / Query 设计集中拆开说明，作为 Phase 3 的设计 SSoT。  
> 对应 spec：FR-011、US5、US8；research 中的 Decision 4.1 ~ 4.5、7.x；data-model 第 8 节。

---

## 1. 用户视角回顾：Module 只写 resourceId + key

以 quickstart 中的 `CounterWithProfile` 为例，模块作者在图纸层只需要：

```ts
// 资源 id 常量（纯数据：供 Traits/Devtools/生成使用；不承载 load 实现）
const UserProfileResource = {
  id: "user/profile",
  meta: { label: "用户资料" },
} as const

profileResource: StateTrait.source({
  // 推荐：复用 ResourceRef.id（或直接传 ResourceRef），避免散落字符串常量
  resource: UserProfileResource,
  key: (s: Readonly<State>) => ({ userId: s.profile.id }),
})
```

心智模型：

- `resource`：逻辑资源 ID（或 ResourceRef：`{ id, meta? }`），描述“我要用什么资源”；  
- `key(state)`：从 State 计算访问该资源所需的 key，语义类似“强类型 queryKey”；允许返回 `undefined` 表示“当前无有效 key / 禁用”，此时不触发 IO；  
- 资源访问逻辑（HTTP / RPC / DB / QueryClient 等）全部在 Runtime 层通过 Resource / Query 命名空间配置，而不是写进 Module。
- 推荐在工程内维护一组 `ResourceRef` 常量（只包含 `id/meta`），并在 Traits/Module 图纸层引用它们；避免在图纸层 import 带 `load` 的 ResourceSpec 值对象，以降低 bundle 体积与循环依赖风险。  
  该拆分不强制：允许在小项目或局部场景把 ResourceRef 与 ResourceSpec 放在同一个文件里。ResourceSpec 仍然可以复用 `ResourceRef.id` 来保证 “id 的单一事实源”。
- `ResourceRef.meta` 仅用于 Devtools/文档/生成等展示/诊断用途，不得影响运行时语义。若同一 resourceId 在同一 Program 内出现多个不同 meta，dev 环境应 warning，并采用确定性的 first-wins（按 ownerFields 字典序最小者作为 canonical meta）；最佳实践是“每个 id 一个 ResourceRef 常量”，避免 meta 分叉。
- `ResourceRef.meta` 必须是白名单字段集合（`label/description/tags/owner/docUrl`），避免把 meta 演进成半套配置系统；运行时语义字段（cache/retry/concurrency 等）必须留在 ResourceSpec.meta / Middleware 配置中。
- Devtools/诊断展示资源信息时，采用展示合并：`ResourceRef.meta` 优先；缺失字段再 fallback 到 `ResourceSpec.meta` 的同名字段（例如 description）。该合并只用于展示，不得反向影响任何运行时语义。
- 若 `ResourceRef.meta` 与 `ResourceSpec.meta` 的同名展示字段同时存在且值不一致，dev 环境 SHOULD 给出 warning（按 resourceId+字段去重），提示“展示元信息分叉”；展示仍遵循 ResourceRef 优先与 fallback 规则。
- `ResourceRef.meta.tags` 的语义为展示侧“分类标签”，用于 Devtools 的过滤/分组/检索；Devtools 在展示与索引时 SHOULD 对 tags 做去重与字典序排序，保证稳定可对比。tags 不得影响运行时语义。

StateTraitProgram / Plan 只保留：

- `resourceId: string`；  
- `keySelector: (state: Readonly<S>) => Key | undefined`。

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
- StateTrait / Module 图纸层不直接依赖 ResourceSpec（实现对象）；对外 DSL 层允许 `resource: string | ResourceRef`，但 build/runtime 事实源永远只保留 string resourceId。

### 2.2 作用域与 RuntimeProvider

- 根 Runtime 挂载“全局必备资源”的 Resource.layer；  
- 路由级别或子树可以通过 RuntimeProvider 追加 Resource.layer，这样：
  - 资源声明仍留在 Module 图纸（`resourceId + key`）；  
  - 具体实现按运行范围划分，避免一个巨大且稀疏的全局 Registry。

效果：

- 在某个路由子树可以“开一组资源实现”，退出该子树后自动失效；  
- Devtools 可以基于「StateTraitGraph + ResourceRegistry」渲染“某个模块/路由依赖了哪些资源，由谁实现”。

---

## 3. Query：外部引擎的可插拔接线（`@logixjs/query`）

查询引擎接线由 `@logixjs/query` 提供：它把第三方引擎（默认 TanStack Query）的知识封装为一个可注入的 **Engine**，并通过 EffectOp middleware 作为唯一接管点。

概念 API（以 `@logixjs/query` 的 public barrel 为准）：

```ts
import * as Query from "@logixjs/query"

Query.Engine.layer(engine)                         // 注入 Engine 实例（缓存/去重/失效/可选快读）
Query.Engine.middleware({ useFor?: (id) => true }) // Engine 接管点（EffectOp）

// 默认推荐：TanStack 适配器（QueryClient -> Engine）
Query.TanStack.engine(queryClient)
```

行为：

- `Query.Engine.layer(engine)`：在 RuntimeProvider 范围内注入 Engine 实例；  
- `Query.Engine.middleware(config)`：订阅 `EffectOp(kind = "trait-source")`，对带 `resourceId + keyHash` 的 op，把 `ResourceSpec.load` 的执行委托给 Engine（缓存 / 去重 / 失效 / 可选快读等）。

约束：

- StateTrait / Program 不理解引擎细节，也不区分“走不走引擎”；  
- 开启或关闭引擎能力只依赖是否装配 `Query.Engine.layer + Query.Engine.middleware`，保持可插拔；  
- 移除 middleware 后，必须退化为“直接调用 ResourceSpec.load”。

---

## 4. 与 StateTrait.source 的契约关系

StateTrait.source 的职责非常窄：

- 对 Module 作者：声明“这个字段是某逻辑资源的快照”，给出 resourceId 和 key 规则；  
- 对 StateTraitProgram：在 Graph / Plan 中标记某个字段为 `kind = "source"`，记录 resourceId 与 keySelector 的依赖字段。

Runtime 侧的责任：

1. StateTrait.install 依据 Plan 在**显式入口被调用时**触发 source-refresh（v001）：  
   - 为每个 source 字段在 Bound API / Runtime 上生成一个标准的加载入口（例如 `$.traits.source.refresh("profileResource")`），该入口在被调用时执行一次对应的 `source-refresh` 计划；  
   - 从当前 State 计算 key；若 keySelector 返回 `undefined`，则视为“当前无有效 key / 禁用”，不触发 IO；  
   - 计算稳定 `keyHash`（用于门控与可解释锚点），并构造 `EffectOp(kind = "trait-source", meta.resourceId, meta.keyHash, meta.fieldPath = ...)`；  
   - 把该 EffectOp 丢给 Middleware 总线。  
   - 默认情况下，StateTrait.install 不在模块挂载或任意 State 变化时隐式触发 source-refresh；若未来引入 `onMount` / `onKeyChange` 等自动模式，必须通过 traits 配置与 Runtime/Middleware 显式启用（见 FR-019）。
2. Middleware 总线：
   - Resource 中间件：路由到 ResourceSpec.load（key 由 source 侧计算并进入执行链路；keyHash 用于门控与诊断锚点）；  
   - Query 中间件（可选）：在有 `Query.Engine.layer + Query.Engine.middleware` 的范围内由 Engine 接管。

因此：

- StateTrait.source → Program/Plan → EffectOp → Resource / Query，中途没有“私有通道”；  
- Devtools / Debug 只需看 EffectOp 与 Graph，就能理解“哪个模块的哪个字段在访问哪个资源，用什么 key”。

---

## 5. 可选：业务侧本地语义化 helper（不属于协议）

这条链路不强制提供额外语法糖：直接使用 `StateTrait.source` 是最清晰、最稳定的写法。

如果你确实希望“在图纸上更语义化”，可以在业务侧本地包一层 helper（不属于协议的一部分）：

```ts
export const QuerySource = <S extends object, P extends StateTrait.StateFieldPath<S>>(meta: {
  readonly resource: string
  readonly deps: ReadonlyArray<StateTrait.StateFieldPath<S>>
  readonly key: (state: Readonly<S>) => unknown
}) => StateTrait.source<S, P>(meta)
```

要求：

- 在 StateTraitProgram / Graph 上必须与 `StateTrait.source` 完全等价；  
- 不引入新的 Trait kind，也不扩展 entry 的协议字段；  
- 缓存/去重/失效等策略永远由 Runtime 侧的 `Query.Engine.layer + Query.Engine.middleware` 决定（可插拔）。

---

## 6. 实现与验收要点（对应 Phase 3）

实现时需满足：

1. Resource / Query 命名空间实现与本文件/`data-model.md` 中的数据模型一致；  
2. StateTrait.install 在 source-refresh 步骤中只构造 EffectOp，不直接依赖任何具体 Resource / Query Tag；  
3. 在 RuntimeProvider 范围内叠加/移除 Resource.layer / Query.Engine.layer / Query.Engine.middleware 时：
   - 同一 Module / Trait 声明无需修改；  
   - Devtools 能清楚展示当前范围内的 ResourceSpec 与 Query 行为。  
4. 若业务侧提供语义化 helper，应有单元测试证明其 IR 等价性（与 `StateTrait.source` 生成的 Program/Graph 一致）。

这部分设计拆完后，即可按 plan 中 Phase 3 的节奏进入具体代码实现。
