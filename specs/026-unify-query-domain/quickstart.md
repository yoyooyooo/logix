# Quickstart: Query 收口到 `@logixjs/query`（与 Form 同形）

**Date**: 2025-12-23
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/026-unify-query-domain/spec.md`

## 0) 五个关键词（≤5）

1. **queries**：规则声明（deps/autoRefresh/key/concurrency）
2. **keyHash**：稳定键（门控/诊断锚点）
3. **engine**：外部引擎（缓存/去重/失效/可选快读）
4. **middleware**：引擎接管点（EffectOp）
5. **snapshot**：模块 state 的事实源（ResourceSnapshot）

## 1) 你将获得什么

- Query 相关能力只有一个入口：`@logixjs/query`（仓库内不再出现 `@logixjs/core/Middleware/Query`）。
- 与 `@logixjs/form` 同构的领域包形状：domain-module 工厂 + controller 句柄扩展 +（高级）traits/building blocks（含外部引擎集成）。
- 外部查询引擎注入边界清晰：启用需要引擎的能力时，缺失注入会给出可操作的配置错误（不再静默退化）。

> 说明：与 Form 的“同形”只约束对外入口与 controller 句柄扩展，不强求 Query 去类比 Form 的 authoring DSL（`from/$.rules/derived`）。

## 2) 最小用法（推荐形状）

```ts
import { Layer } from "effect"
import * as Logix from "@logixjs/core"
import * as Query from "@logixjs/query"
// import { QueryClient } from "@tanstack/query-core"

// 1) 定义 ResourceSpec（resourceId + keySchema + load）
export const SearchSpec = Logix.Resource.make({
  id: "demo/query/search",
  keySchema: /* ... */,
  load: /* ... */,
})

// 2) 定义 Query Module（params/ui + queries 规则）
export const SearchQuery = Query.make("SearchQuery", {
  params: /* ... */,
  initialParams: /* ... */,
  ui: /* ... */,
  queries: ($) => ({
    search: $.source({
      resource: SearchSpec,
      deps: ["params.q", "ui.query.autoEnabled"],
      autoRefresh: { onMount: true, onDepsChange: true, debounceMs: 200 },
      concurrency: "switch",
      key: (q, autoEnabled) => (autoEnabled ? { q } : undefined),
    }),
  }),
})

// 3) Runtime 装配：Resource +（可选）外部引擎 + middleware
const layer = Layer.mergeAll(
  Logix.Resource.layer([SearchSpec]),
  // 启用外部引擎时注入（否则省略）
  // Query.Engine.layer(Query.TanStack.engine(new QueryClient())),
)

export const runtime = Logix.Runtime.make(SearchQuery, {
  layer,
  // 启用外部引擎时同时启用 middleware（否则省略）
  // middleware: [Query.Engine.middleware()],
})
```

类型与句柄形状（与 Form 对齐）：

- `useModule(SearchQuery)` / `$.self`：能拿到完整的强类型 state，并获得 `controller.*` 句柄扩展。
- `useImportedModule(host, SearchQuery.tag)` / `host.imports.get(SearchQuery.tag)`：只保证 state/actions 的强类型（不附带 controller）；跨模块触发建议走 owner wiring（或调用 `actions.*`）。
- `Query.make` 对外是一发返回 Module 的入口；内部仍使用 `Module.make → implement` 两步生成可运行模块（只是对业务隐藏），以保持 Form/Query 的同构 DX 与句柄类型闭环。
- 为了类型尽可能完整：
  - React 侧优先传 `SearchQuery`（Module）给 `useModule`，避免传 `SearchQuery.impl` / `SearchQuery.tag` 导致 controller 扩展在类型层丢失；
  - Logic 侧优先用 `$.use(SearchQuery)`（ModuleLike），避免用 `$.use(SearchQuery.tag)`（Tag）导致扩展丢失。

四种组合语义（可解释）：

1. 无 `Query.Engine.layer` + 无 `Query.Engine.middleware`：降级为 `ResourceSpec.load`（无缓存/去重）。
2. 有 `Query.Engine.layer` + 无 `Query.Engine.middleware`：不接管 fetch；仅用于 `peekFresh`/`invalidate` 等非接管能力（不推荐默认）。
3. 无 `Query.Engine.layer` + 有 `Query.Engine.middleware`：配置错误，必须显式失败。
4. 有 `Query.Engine.layer` + 有 `Query.Engine.middleware`：引擎接管 fetch（缓存/去重/失效），推荐默认（TanStack）。

### 2.0 去糖化视图（De-sugared View / 透明性）

> 目的：保证“语法糖不遮蔽真相源”。遇到 Kit/Query 覆盖不到的边缘场景时，你可以直接退回内核原语定位语义边界。

- `Query.make(id, config)` 等价于：
  - 用 `Logix.Module.make(id, ...)` 定义一个包含 `{ params; ui; queries }` 的模块 state；
  - 把 `queries` 规则降解为 `StateTrait.source(...)`（写回 `state.queries.<name>` 的 `ResourceSnapshot` 字段）；
  - 挂载两条默认 logic：`autoTrigger`（onMount/onKeyChange/手动 refresh）与 `invalidate`（事件化 + optional engine.invalidate + source.refresh）；
  - 通过 handle 扩展把 `controller.*` 挂到模块句柄上（对齐 Form 的“同形 DX”）。
  - 入口实现：`packages/logix-query/src/Query.ts`

- `Query.traits({ queries })` 等价于（每条 query 一条 source 规则）：
  - `{ ['queries.<name>']: Logix.StateTrait.source({ resource: ResourceSpec.id, deps, triggers, debounceMs, concurrency, key }) }`
  - 入口实现：`packages/logix-query/src/Traits.ts`

- `Query.Engine.middleware()` 等价于一条 EffectOp middleware：
  - 命中 `kind="trait-source"` 且携带 `meta.resourceId + meta.keyHash` 的请求时，把执行委托给注入的 `Query.Engine.fetch(...)`（缓存/去重/失效由引擎负责）；
  - 同时保持 Logix 的事实源语义：写回仍由 runtime 的 `keyHash` gate 保证（正确性不依赖“网络是否真正取消”）。
  - 入口实现：`packages/logix-query/src/internal/middleware/middleware.ts`、`packages/logix-query/src/Engine.ts`

哪些字段会进入 IR/导出边界（只列“关键口径”）：

- **静态可治理**：`resourceId` / `deps` / `triggers` / `debounceMs` / `concurrency`（来自 traits；可进入 Static IR / ControlSurfaceManifest 的 slice）。
- **运行时闭包（不导出）**：`key(...)` 是运行时函数，不进入 IR；只有其派生结果 `keyHash` 会进入 replay/诊断链路，并作为写回门控锚点。
- **可导出 meta**：任何进入 IR/证据包/Devtools 的 `meta` 必须是 Slim `JsonValue`（纯 JSON）；口径对齐 `specs/016-serializable-diagnostics-and-identity` 与 `docs/ssot/platform/contracts/03-control-surface-manifest.md`。

### 2.1 典型迁移：`useStore(state) -> useQuery(queryKey)`（A/B 两种写法）

你描述的旧场景（zustand + TanStack Query）通常长这样：

- 组件里用 `useStore` 取出一些 state（例如 `q/filters/sort/page`）；
- 把它们拼成 `queryKey` 交给 `useQuery`；参数变化时 `useQuery` 自动重跑并更新 `data/loading/error`。

在 Logix 体系里，“参数变化自动刷新”仍然是声明式的：它由 `StateTrait.source` 的 `deps/autoRefresh/key/concurrency` 驱动（Query 领域只是把这套能力组织得更像 TanStack/更好用）。  
不同的是：当 Query 作为 `imports` 子模块时，组件必须先选中“具体是哪一个实例”，所以才会出现 `useImportedModule(...)` 这一步（这是把 TanStack 的“隐式全局缓存语义”显式化）。

下面给出两种等价组织方式：

#### A) `Query.traits`：把 Query 当作模块内资源字段（最接近旧写法）

适用：Query 的参数就是“这个模块自己的状态”，你希望像以前一样在**同一个模块**里同时拿到 params 与 query 快照。

要点：

- 把“查询参数”作为模块 state 的一部分（推荐命名为 `params`，与 Query 约定同名）；
- 用 `Query.traits({ queries })` 直接在该模块上声明 source 字段（每个 queryName 对应 `state.queries[queryName]` 的一个 `ResourceSnapshot` 字段）；
- 业务更新 `state.params` 时，会按 autoRefresh 自动刷新（不需要组件里再写 `refresh()`）。

概念示例（只展示关键段落）：

```ts
import { Schema } from "effect"
import * as Logix from "@logixjs/core"
import * as Query from "@logixjs/query"

// StateSchema：用于收窄可用字段路径（deps/key），运行时不会真的消费这个值。
// 注意：这里的 `queries.search` 只是示意，真实项目可用更精确的 Schema 描述 ResourceSnapshot。
const StateSchema = Schema.Struct({
  params: Schema.Struct({ q: Schema.String }),
  ui: Schema.Struct({ query: Schema.Struct({ autoEnabled: Schema.Boolean }) }),
  queries: Schema.Struct({
    search: Schema.Unknown,
  }),
})

export const Traits = Logix.StateTrait.from(StateSchema)({
  ...Query.traits({
	    queries: {
	      search: {
	        resource: SearchSpec,
	        deps: ["params.q", "ui.query.autoEnabled"],
	        autoRefresh: { onMount: true, onDepsChange: true, debounceMs: 200 },
	        concurrency: "switch",
	        key: (q, autoEnabled) => (autoEnabled && q ? { q } : undefined),
	      },
	    },
	  }),
})
```

React 侧读写体验（类比 `useStore + useQuery`）：

- 读 params：`useSelector(ModuleRef, (s) => s.params.q)`
- 读快照：`useSelector(ModuleRef, (s) => s.queries.search)`（`idle/loading/success/error`）
- 改参数：通过模块 action/controller 更新 `params`（随后由 autoRefresh 自动刷新）

#### B) `Query.make` + `imports`：Query 作为独立子模块（复用/封装更强）

适用：Query 本身是一个可复用的领域单元（有自己的 `params/ui/controller`），你希望它被多个宿主模块复用或作为“功能块”组合。

要点：

- Host 模块通过 `imports` 引入 Query 模块实例；
- Host 负责把自己的 state 投影到 Query 的 `params/ui`（只做**状态同步**）；
- Query 模块内部依然靠 `deps/autoRefresh/key` 自动刷新；组件只订阅快照即可。

Logic 侧 owner-wiring（把 Host 的 `filters.q` 写入子模块 params；示意）：

```ts
import { Effect } from "effect"

export const HostLogic = HostModule.logic(($) =>
  Effect.gen(function* () {
    const q = yield* $.use(SearchQuery)

    // host state -> query params（只做 state 同步；刷新由 SearchQuery 自己的 autoRefresh 完成）
    yield* $.onState((s) => s.filters.q).runFork((qValue) =>
      q.controller.setParams({ q: qValue }),
    )
  }),
)
```

React 侧读取被 imports 的子模块状态：

```ts
import { useImportedModule, useModule, useSelector } from "@logixjs/react"

const host = useModule(HostModule)
const query = useImportedModule(host, SearchQuery.tag)

const q = useSelector(host, (s) => s.filters.q)
const snapshot = useSelector(query, (s) => s.queries.search)
```

> 备注：`useImportedModule(host, SearchQuery.tag)` 本质是在“host 实例的 scope”里选中被 imports 的那一个 Query 实例。  
> 如果你不希望 UI 层显式写这一步，通常意味着 Query 不该做局部 imports：要么选 A（把 query 字段收敛进主模块），要么把 Query 模块提升到更上层/根作用域（让组件用 `useModule(SearchQuery)` 直接拿到同一实例）。

## 3) 如何验证（对应 spec 的验收场景）

### 场景 A：仓库内 Query 入口收敛（SC-001）

期望结果：

- 文档/示例/脚手架中不再出现 `@logixjs/core/Middleware/Query` 的引用；
- 业务只需学习 `@logixjs/query` 的入口形状即可完成 Query 场景建模与运行。

### 场景 B：启用外部引擎但缺失注入时显式失败（FR-004 / Edge Case）

期望结果：

- 当启用 `Query.Engine.middleware()` 但未提供 `Query.Engine.layer(engine)` 时，运行时以配置错误失败；
- 错误信息包含“缺少注入 + 如何修复”的提示。

### 场景 C：与 Form 同形（SC-003）

期望结果：

- Query 的“定义 → 组合 → 调用 controller/触发刷新”的组织方式与 Form 同构；
- `scripts/logix-codegen.ts` 生成的 scaffold 在 Form/Query 两种 kind 下呈现同构 import 形状。

## 4) 性能证据（NFR-001 / NFR-002）

- 粗成本模型（直觉）：`key(state)` 计算与 deps 追踪发生在 `deps` 命中的 state 字段变更时；真正的 IO 发生在 `ResourceSpec.load`（无引擎）或 `Engine.fetch`（有引擎）阶段；诊断关闭时应接近零成本。
- 优化梯子（默认 → 可行动）：先用 `autoRefresh.debounceMs`/收窄 autoRefresh/选择并发策略，再注入 `Engine` + 启用 `Query.Engine.middleware()` 获取缓存/去重；需要避免 loading 抖动时再启用 `peekFresh`（只读快路径）。
- 本特性需要提供 Query 代表性链路的 before/after 采样（p95 时间与 heap 分配），以及 diagnostics off/on 的额外开销证据。
- 证据以 JSON 形式落在：`specs/026-unify-query-domain/perf/*`（脚本与字段口径沿用 `logix-perf-evidence`）。

## 5) 迁移入口

见：`contracts/migration.md`
