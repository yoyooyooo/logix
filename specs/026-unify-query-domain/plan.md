# Implementation Plan: Query 收口到 `@logixjs/query`（与 Form 同形）

**Branch**: `026-unify-query-domain` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/yoyo/Documents/code/personal/intent-flow/specs/026-unify-query-domain/spec.md`

## Summary

本特性目标是把“Query 相关”从历史多入口收敛为单一领域包 `@logixjs/query`，并与 `@logixjs/form` 保持同构的对外形状：

- 删除 `@logixjs/core/Middleware/Query` 这条早期占位入口（含导出、测试与示例引用），避免“双 Tag / 双协议 / 静默退化”。
- 统一 Query 对外 API：以 `@logixjs/query` 为唯一入口，提供 domain-module 工厂 + controller 句柄扩展 +（高级）traits/building blocks（含外部引擎集成）。
- “形状一致”定义更精确：对外是同构的 **domain-module 工厂 + controller 句柄扩展**；对内都降解到同一条 **StateTrait/EffectOp** 主线；`Module.Manage` 只是实现封装手段，不是形状本身。
- 对齐边界（避免强求类比）：只对齐 Form 的“领域包外形与心智”，不强求 Query 去类比 Form 的 authoring DSL（`from/$.rules/derived`）与其 IR 形态。
- 延后语法糖：本特性先把入口/注入/诊断/性能收口做实；“声明式跨模块联动（owner-wiring BindingSpec）”作为后续独立特性再做（避免破坏 deps 的单一事实源与多实例语义）。
- 显式固化“外部查询引擎注入边界”：只有当启用需要外部引擎的能力（如 `Query.Engine.middleware` 引擎接管点）时才要求提供注入；缺失注入必须报可操作的配置错误。
- 奥卡姆 + Effect-native 的注入与接管：对外只暴露一个 `Query.Engine`（Tag），并在其上提供 `Query.Engine.layer(...)` + `Query.Engine.middleware(...)`；禁止 `Query.EngineTag` / `Query.middleware` / `Query.layer` 等重复入口。
- 默认推荐 TanStack：TanStack 适配层收敛在 `Query.TanStack.*`，并作为默认推荐实现；本特性将固化其注入方式、四种组合语义与测试/文档口径。
- 同步更新文档/示例/脚手架：仓库内不再出现 `@logixjs/core/Middleware/Query` 的推荐使用方式，并提供迁移说明。
- 迁移/删除 core 内与 Query 入口绑定的测试：core 仅验证通用内核；Query 领域集成测试归属 `packages/logix-query/test/*`，避免 core 反向依赖领域协议。
- 目录命名治理：将 Query/Form 领域包目录统一为 `packages/logix-query` 与 `packages/logix-form`，对齐仓库 `logix-*` 目录命名约定（npm 包名 `@logixjs/query` / `@logixjs/form` 不变）。
- 建立可复现性能基线：对 Query 自动触发/刷新链路做 before/after 采样，确保收口与 API 调整不引入回退。
- 类型尽可能完美（与声明式同等优先）：
  - `Query.make(...)` **对外一发返回 `Logix.Module.Module`**（与 Form 一致），但内部仍是 `Module.make → implement` 两步（只是不暴露给业务）；
  - QueryState/QueryAction/Controller 都必须被 Module shape/handle 扩展“带出来”，保证 `useModule(QueryModule)` / `$.self` / `$.use(QueryModule)` 拿到的句柄在 TS 下完整收窄；
  - `refresh(target?)` 的 `target` 需要收窄到 `keyof queries`（而不是 `string`），避免“拼错 name”这类 silent bug。

## Technical Context

**Language/Version**: TypeScript 5.8.2 + Node.js 22.x  
**Primary Dependencies**: effect v3（workspace 以 `effect@^3.19.8` 为基准、pnpm override 固定到 3.19.13）+ `@logixjs/*`（涉及 `@logixjs/core` / `@logixjs/query` / `@logixjs/form`）+ `@tanstack/query-core`（Query 外部引擎默认实现）  
**Storage**: N/A（本特性不引入持久化存储）  
**Testing**: Vitest 4（`vitest run`）+ `@effect/vitest`（Effect-heavy 场景）  
**Target Platform**: Node.js（测试/脚本） + 现代浏览器（React 示例/Devtools）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*` + `examples/*`）  
**Performance Goals**:

- Query 自动触发/刷新代表性场景：p95 时间与 heap 分配不超过基线 +5%（spec NFR-001 / SC-004）
- diagnostics off：额外开销不超过基线 +1%（spec NFR-002）
- 测量方法：新增本特性专用 perf 脚本（统一纳入 `logix-perf-evidence`，入口：`pnpm perf bench:026:query-auto-trigger`），并在 `specs/026-unify-query-domain/perf/` 记录 before/after 与 diff  
  **Constraints**:
- 诊断事件必须 slim、可序列化；diagnostics off 接近零成本
- 稳定 identity：沿用 moduleId/instanceId/txnSeq/opSeq/keyHash，不引入随机/时间默认作为关键标识
- 严格事务边界：事务窗口内禁止 IO/async；Query 的写回必须通过 trait/stateTrait 通道完成
- 透明性与可导出 meta：所有 Query 语法糖必须可去糖化到 `StateTrait.source`/`EffectOp` 主线；进入 IR/导出边界的 `meta` 仅承诺 Slim JsonValue（或结构化白名单），口径对齐 `specs/016-serializable-diagnostics-and-identity`（避免各处自定义 meta 规则导致漂移）
- 编译期一次性：Query 规则的 normalize/build SHOULD 在 `Query.make`（模块定义期）完成并可复用；运行期热路径不得重复解析/构图/生成规则结构（对齐 Form 028 的“定义期构建、运行期只执行”约束）
- 类型与 DX（强约束，026 裁决）：
  - `deps` 的类型约束应尽可能收窄为 `StateTrait.StateFieldPath<{ params: TParams; ui: TUI }>`（深度上限 4，避免 TS Server 退化），从而让 `"params.*" / "ui.*"` 的路径拼写尽量在编译期暴露；
  - `queries` 的 key union 必须贯穿：`state.queries[queryName]`、`controller.refresh(target)`、`invalidate` 的目标推导（至少 name union + resourceId）都应可被类型系统利用；
  - 不引入“以闭包读取路径为 deps 的隐式推导”，保持 deps 作为唯一依赖事实源（对齐 deps-trace / reverse-closure）。
- Dev 诊断（强约束）：StateTrait 全体系（computed/source/link/check）的目标字段必须在 `stateSchema` 中声明；dev 环境需对 “fieldPath/deps/link.from/check.writeback.path 不存在于 schema” 给出可定位的 warning，避免任何 traits 在宿主模块上静默写出新字段（Query.traits 只是其中一个高频场景）。
  **Scale/Scope**:
- 影响范围以“对外入口与引用点收口”为主：`@logixjs/query` public barrel、少量示例/文档/脚手架、以及 `@logixjs/core` 的历史导出清理
- 目录命名治理属于结构性重排：先完成 Query/Form 领域包目录更名（落点 `packages/logix-query` / `packages/logix-form`），再继续落地本特性的实现任务（避免路径 churn 与并行真相源）。

## Type Strategy（极致：可读 + 可写 + 可校验）

本节把“类型尽可能完美”的目标落到可执行的设计约束：既不牺牲声明式/LLM 友好，也不把关键语义藏进闭包与隐式推导。

### 1) 一发 `Query.make`，但内部仍两步

- 对外：`Query.make(...)` 直接返回 `Logix.Module.Module`（与 Form 一致）。
- 对内：仍使用 `Logix.Module.make → implement` 两步来构造模块资产；Query 只是把样板隐藏起来，并把 query 领域的默认 wiring/controller 一次性挂上去。

这样能同时满足：

- React 侧 `useModule(QueryModule)` 可拿到 handle 扩展（controller）；
- Logic 侧 `$.use(QueryModule)` / `$.self` 可拿到强类型 handle（controller + state）
- 并且不会让业务侧出现第二套“先 Def 再 implement”的写法分裂。

### 2) query keys 的类型必须贯穿（避免 silent bug）

- 定义：`QueryName = Extract<keyof queries, string>`
- 贯穿点：
  - `state.queries[queryName]`（每个 queryName 一个 snapshot 字段）
  - `controller.refresh(queryName?)`
  - `QueryAction.refresh.payload`
  - `invalidate` 的目标推导（至少能从 `queries` 推出 name union + resourceId）

### 3) deps 的类型：仍是字符串，但尽量可校验

- `deps` 仍使用字符串路径（声明式、LLM 友好），但类型约束收窄到：
  - `StateTrait.StateFieldPath<{ params: TParams; ui: TUI }>`（深度上限 4）
- 目的：把 `"params.*" / "ui.*"` 的拼写/层级错误尽量提前到编译期；同时保持 deps 作为唯一依赖事实源（支持 deps-trace / reverse-closure）。

### 4) controller 扩展的类型闭环（Form 同形）

- handle 扩展通过 `Symbol.for("logix.module.handle.extend")` 挂到 `module.tag`：这是 React/Adapter 的统一接入口。
- 类型闭环依赖 “ModuleLike 的 Ext 载体”：
  - React：`useModule(Module)` 才能在类型层拿到 `Ext`（传 `.impl` / `.tag` 会丢失扩展类型）。
  - Logic：`$.use(ModuleLike)` 才能在类型层拿到 `Ext`（传 `.tag` 会丢失扩展类型）。

### 5) `ui` 命名空间（与 Form 对齐）

- `ui` 是 Query 模块 state 内的“交互态命名空间”：不预设具体结构，但推荐把 query 相关交互态放在 `ui.query.*`（与 Form 的 `ui` 心智一致）。
- 约束：`ui` 必须是可回放/可解释的状态（避免塞不可序列化闭包/DOM/随机数等）。

### 6) `controller.refresh(target?)` 的明确语义（避免歧义）

- `controller.refresh(queryName)`：只刷新指定 query（若 key 不可用则 no-op，并提供可解释原因）。
- `controller.refresh()`：刷新模块内所有 query（等价于逐个 `refresh(queryName)`）。
- 成本边界：`refresh()` 可能触发多条 query 的 IO，应在用户文档中给出“粗成本模型 + 优化梯子”，并建议在大模块中优先用显式 target 或收窄 queries/autoRefresh。

### 7) `queries` 的保留关键字（防止 state 冲突）

- Query 的 state 根字段固定包含 `params` 与 `ui`，因此 `queries` 的 key 必须排除保留关键字：至少 `params` / `ui`。
- 约束策略：
  - 编译期：类型层面排除（让 `queries: { params: ... }` 直接报错）。
  - 运行时：`Query.make` 对冲突配置显式抛错，避免静默覆盖 state。

### 8) `peekFresh` 的对外边界（语义对齐 TanStack，但不泄漏引擎表面积）

- `peekFresh` 是 Engine 的可选能力（只读快路径），用于默认逻辑在 refresh 前短路写回 success snapshot（避免 loading 抖动）。
- 默认不把 `peekFresh` 暴露到 `controller`：controller 只表达领域意图（refresh/invalidate/params/ui），不暴露引擎缓存细节；需要“导航前预热/检查缓存”的高级场景应通过显式 Logic + `Query.Engine`（或 `Query.TanStack.*`）完成。

### 9) `deps` 类型约束的降级策略（TS 性能兜底）

- 默认推荐严格约束：`StateTrait.StateFieldPath<{ params; ui }>`（深度上限 4）。
- 若在大型 params/ui 结构下导致 TS Server 明显退化：允许业务通过类型断言将 `deps` 放宽为 `ReadonlyArray<string>` 作为兜底；运行时语义不受影响（deps 本质仍是字符串路径）。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime`：该特性属于“领域包入口与注入边界”的治理；影响业务如何表达 Query 意图（module factory/traits）以及 Runtime 如何装配外部引擎（Layer/middleware）。
- docs-first & SSoT：不引入新的平台概念；对照契约以 `specs/007-unify-trait-system/contracts/query.md` 为准；收口导致的入口/迁移说明落在本特性 `contracts/*` 与 `quickstart.md`，并同步更新仓库旧 spec/示例中错误的引用。
- Contract 变化：移除 `@logixjs/core/Middleware/Query`（public API breaking change）；统一 `@logixjs/query` 的对外入口形状（与 `@logixjs/form` 对齐）。需要在本特性 `contracts/public-api.md` 明确对外 API 与迁移路径。
- IR & anchors：不新增/不改变统一最小 IR；Query 领域能力必须可降解为 StateTrait/Resource/EffectOp 主线（`Query.traits` → `StateTrait.source`），避免第二套真相源。
- Deterministic identity：复用既有稳定字段（resourceId/keyHash + moduleId/instanceId/txnSeq/opSeq）；不引入随机/时间默认标识。
- Transaction boundary：不把外部引擎调用塞进事务窗口；EffectOp 执行与资源加载仍在事务外侧完成，写回受 keyHash 门控。
- Internal contracts & DI（收敛口径）：对外只暴露 `Query.Engine`（Effect Tag），并在其上提供 `Query.Engine.layer(...)` 与 `Query.Engine.middleware(...)`；禁止 `Query.EngineTag` / `Query.middleware` / `Query.layer` 等重复入口，避免“同名但不同协议”的隐性踩坑。
- Performance budget：热路径主要在 Query 自动触发（params/ui 变化）与 middleware 侧拦截；本特性将新增专用 perf 脚本采集 before/after，并把结果固化在 `specs/026-unify-query-domain/perf/*`。
- Diagnosability & explainability：失效/刷新进入事件日志（如 `query:invalidate`），并保持 Slim 载荷；必要时补齐能解释“触发来源/并发策略/写回结果”的证据字段，但 diagnostics off 仍需接近零成本。
- Diagnosability & dev feedback：补齐 `state_trait::schema_mismatch`（或等价）warning：当 StateTrait 全体系（computed/source/link/check）声明的 `fieldPath/deps/link.from/check.writeback.path` 不在 stateSchema 时给出提示（定位到 moduleId/fieldPath/declared vs schema），用于提前发现“写回字段未声明/字段被占用”等配置错误（Query.traits 只是其中一个典型触发点）。
- 用户心智模型：关键词（≤5）= `单一入口` / `同形 API` / `显式注入` / `可替换引擎` / `迁移说明`；并在 quickstart/迁移文档中固化。
- Form 对齐与奥卡姆：对齐仅限“模块工厂 + controller 句柄”外形；API 表面积保持最小（`Query.Engine`（含 middleware）+ `Query.TanStack.*`），不引入额外 DSL 或双入口。
- Breaking changes：删除 `@logixjs/core/Middleware/Query` 导出；可能调整 `@logixjs/query` 的推荐 import 形状。通过迁移说明替代兼容层，仓库内示例与脚手架一次性升级。
- Quality gates：`pnpm typecheck`、`pnpm lint`、`pnpm test`；以及本特性 perf 证据采集脚本（quick profile）用于 NFR/SC 验收。

## Project Structure

### Documentation (this feature)

```text
specs/026-unify-query-domain/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-query/src/
├── index.ts                    # public barrel（对齐 Form 形状）
├── Query.ts                    # Domain module factory + controller（Query.make）
├── Traits.ts                   # Query.traits → StateTrait.source 降解
├── Engine.ts                   # Query.Engine（Tag）+ Engine.layer + Engine.middleware（外部引擎注入与接管）
├── Middleware.ts               # middleware public API（最终收敛到 Engine 入口）
├── TanStack.ts                 # TanStack public API（仅 re-export internal 实现）
└── internal/
   ├── engine/tanstack.ts       # TanStack Engine 适配器
   ├── middleware/middleware.ts # EffectOp 接管点实现
	   ├── logics/auto-trigger.ts   # LEGACY: 历史 onMount/onKeyChange 触发逻辑；新口径由 076 的 StateTrait.source.autoRefresh 内核化后应删除/收敛
   ├── logics/invalidate.ts     # invalidate 事件化 +（可选）engine.invalidate + source.refresh
   └── tanstack/observer.ts     # observe（可选）

packages/logix-query/test/
└── (补齐) Query.*.test.ts      # Query 领域集成与迁移覆盖

packages/logix-core/
├── package.json                # 移除 ./Middleware/Query 导出
├── src/Middleware.Query.ts     # 删除（历史占位入口）
└── test/                       # 删除/迁移与 Query 相关的 core 测试

scripts/logix-codegen.ts        # 脚手架 import 形状对齐（Form vs Query）

examples/logix/src/scenarios/
└── middleware-resource-query.ts  # 示例引用迁移到 @logixjs/query

apps/docs/content/docs/guide/learn/
└── deep-dive.md                # 文档示例 import 形状与推荐入口对齐；并明确“外部引擎注入 × middleware”四种组合语义

specs/000-module-traits-runtime/
└── quickstart.md               # 历史示例引用迁移（不再出现 @logixjs/core/Middleware/Query）
```

**Structure Decision**: Query 领域能力与对外入口统一收敛在 `@logixjs/query`；`@logixjs/core` 仅保留 trait/stateTrait/resource 等通用内核能力，不再承载 Query 领域入口或其 DI Tag。性能与诊断证据按本特性专用 perf/contract 文档闭环。
