# Research: Query 收口到 `@logix/query`（与 Form 同形）

**Date**: 2025-12-23  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/026-unify-query-domain/spec.md`  
**Goal**: 统一 Query 领域入口与协议，消除 `@logix/core` 中的历史占位实现，让 Query 只以 `@logix/query` 的“领域包形状”存在，并给出可迁移、可测量、可诊断的落地路径。

## Decision 1：删除 `@logix/core/Middleware/Query`，Query 入口只保留 `@logix/query`

**Decision**: 将 `packages/logix-core/src/Middleware.Query.ts`（以及 `packages/logix-core/package.json` 的 `./Middleware/Query` 导出）视为历史占位入口并删除；仓库内所有 Query 相关使用（示例/文档/脚手架/测试）统一迁移到 `@logix/query`。

**Rationale**:

- 目前存在两套不兼容的注入 Tag 与语义：历史 `@logix/core/Middleware/Query` 的注入口 vs `@logix/query` 的 `Query.Engine`，会导致“同名 Query，但不是同一条协议”的隐性踩坑。
- `@logix/query` 已形成明确的领域包边界与契约（参考 `specs/007-unify-trait-system/contracts/query.md`）：module factory + controller 句柄扩展 + traits 降解 + 外部引擎注入 + 失效事件化。
- `@logix/core/Middleware/Query` 的行为包含“静默退化”路径，容易在缺少注入时让缓存/去重语义失效且不易诊断；与“显式注入/可解释配置错误”的宪章倾向冲突。

**Alternatives considered**:

- 保留 `@logix/core/Middleware/Query`，并在内部 re-export 到 `@logix/query`：仍会留下第二条入口与历史心智负担，且容易在迁移过程中出现“到底该 import 哪个”的分裂。
- 将其改为 `@logix/core/internal/*`：仍然会被示例/文档误用；收口目标明确要求“Query 相关只在 `@logix/query`”。

## Decision 2：`@logix/query` 对外形状对齐 `@logix/form`（推荐 `import * as Query from "@logix/query"`）

**Decision**: 调整 `@logix/query` 的 public barrel，使其与 `@logix/form` 同构：

- 推荐使用：`import * as Query from "@logix/query"`
- 以同名导出提供 `Query.make` / `Query.traits` / `Query.Engine`（Tag，含 `layer/middleware`）/ `Query.TanStack`（命名空间式组织），其中 `Query.make` 返回“模块资产”，并通过 ModuleHandle 扩展暴露默认 `controller`。

**Rationale**:

- Form 已在仓库内形成稳定心智（文档/示例大量使用 `import * as Form from "@logix/form"`）；Query 作为对照领域应尽量复用同一模式，降低跨领域学习成本（spec FR-003 / SC-003）。
- 脚手架（`scripts/logix-codegen.ts`）可采用同构的 import 形状生成代码，减少差异化分支与认知负担。
- “同形”的边界需要被写清：仅对齐 **领域包外形**（module factory + controller 句柄扩展 + building blocks 组织），不强求 Query 的 authoring DSL 去类比 Form 的 `from/$.rules/derived`（问题域不同，强求会增加 API 表面积与概念数量）。

**Alternatives considered**:

- 维持当前 `import { Query } from "@logix/query"` 的对象式入口：与 Form 不同构，且容易在“收口后只剩一个入口”的目标下继续产生二义性（Form 是 namespace import，Query 是 named import）。
- 同时支持两种形状：会让团队与文档出现两套写法，难以收敛“唯一推荐路径”。

## Decision 3：只在启用引擎接管点时强制引擎（避免静默退化）

**Decision**:

- 当调用方启用 `Query.Engine.middleware()` 时：若运行时缺少 `Query.Engine` 注入，行为必须是“显式失败 + 可操作提示”，避免静默退化。
- 当调用方未启用 `Query.Engine.middleware()` 时：Query 仍 MUST 可降级为直接执行 `ResourceSpec.load`（不具备缓存/去重），保证领域入口不把“引擎是否存在”作为硬前提。

**Rationale**:

- 缓存与 in-flight 去重属于语义能力，不应在缺少注入时静默消失，否则会产生难以定位的性能与正确性差异。
- 与“单一入口 + 可诊断配置”的目标一致：只有启用了接管点才要求注入，否则保持可降级路径成立。

**Alternatives considered**:

- 在 middleware 内部静默回退到 `ResourceSpec.load`：会让“是否启用了外部引擎”变成不可观测状态，违背可诊断性原则。

## Decision 4：Query × Runtime 的集成测试归属 `packages/logix-query`，core 不再携带 Query 专用测试

**Decision**:

- 删除或迁移 `packages/logix-core/test/*` 中与 Query 专用入口相关的测试（如 `QuerySource.SyntaxSugar.*`、`ResourceQuery.Integration.*`、`StateTrait.SourceRuntime.*` 中的 Query middleware 部分）。
- 在 `packages/logix-query/test/*` 内补齐等价覆盖：以 `StateTrait.source` / `EffectOp meta(resourceId/keyHash)` 为底座，验证 Query 领域的 TanStack 集成、自动触发、失效事件化与配置错误语义。

**Rationale**:

- core 的职责是提供通用内核（StateTrait/Resource/EffectOp/Debug），不应绑定 Query 领域入口或其 DI Tag。
- 将测试落到 `@logix/query` 可避免循环依赖，也更贴合“领域包应能降解到同一条 kernel 主线”的验收方式。

**Alternatives considered**:

- 保留 core 测试并改为使用 `@logix/query`：会让 core 的测试依赖领域包，破坏分层与包拓扑（core 不应依赖 query）。

## Decision 5：为本特性新增专用 perf 基线脚本与证据落点

**Decision**: 新增 Query 专用 perf 基线脚本，统一纳入 `logix-perf-evidence`（入口：`pnpm perf bench:026:query-auto-trigger`），在 `specs/026-unify-query-domain/perf/` 记录 before/after 与 diff，用于验证：

- Query 自动触发/刷新（params/ui 变化 + 并发策略）p95 时间与 heap 分配预算；
- diagnostics off/on 的额外开销预算（spec NFR-001/NFR-002）。

**Rationale**:

- 现有 perf 跑道（如 014/016/021）覆盖 runtime 通用边界，但没有直接覆盖 Query 领域的“自动触发 + 外部引擎 + 写回门控”组合链路。
- 收口会引入 API 与装配方式的调整，必须提供可复现证据证明无回退（宪章 I）。

**Alternatives considered**:

- 仅依赖现有 014/016 跑道：无法直接对 Query 领域链路给出可解释的 before/after 证据。

## Decision 6：奥卡姆 + Effect-native：`Query.Engine` 作为唯一引擎入口（含 `layer/middleware`）

**Decision**:

- `@logix/query` 对外只暴露一个引擎入口：`Query.Engine`（Effect Context.Tag）。
- 引擎注入与接管能力统一挂在 `Query.Engine.*` 上：
  - `Query.Engine.layer(engine)`：注入外部引擎服务；
  - `Query.Engine.middleware(config?)`：引擎接管点（EffectOp middleware）。
- 禁止对外同时暴露 `Query.EngineTag` / `Query.middleware` / `Query.layer` 等重复入口，避免团队写法分裂与“同名但不同协议”。（对外唯一入口为 `Query.Engine` + `Query.Engine.layer/middleware`）

**Rationale**:

- Effect-native：Tag 本身就是“服务入口”，使用侧天然写 `yield* Query.Engine`（无需额外 `EngineTag` 名称）。
- 奥卡姆：把“注入 + 接管”收敛到单一命名空间，减少 API 表面积与二义性。

**Alternatives considered**:

- 保留 `EngineTag` 并在顶层导出 `middleware`：会导致注入与接管散落在多个符号上，容易形成第二入口（或被误认为可选/可替换的多个入口）。

## Decision 7：类型尽可能完美：`Query.make` 返回 Module（但内部仍两步），并贯穿 query keys / deps 路径

**Decision**:

- `Query.make` 对外返回 `Logix.Module.Module`（与 Form 一致），而不是独立的 Blueprint；调用方不需要知道 `Module.make → implement` 两步，但 Query 内部仍会使用这两步生成可运行模块。
- `Query` 的 controller 通过 handle 扩展挂到模块 Tag 上（`Symbol.for("logix.module.handle.extend")`），确保 `useModule(QueryModule)` / `$.self` / `$.use(QueryModule)` 都能拿到 `controller.*` 且保持强类型。
- `refresh(target?)` 的 target 必须收窄为 `keyof queries`（不再是 `string`）。
- `deps` 应尽可能使用 `StateTrait.StateFieldPath<{ params; ui }>` 做类型约束（深度上限 4），让 `"params.*" / "ui.*"` 的路径拼写在编译期尽量暴露问题。

**Rationale**:

- “声明式 + LLM 友好”与“类型可靠”并不冲突：`StateFieldPath` 仍然是字符串路径，但能捕获大量低级错误（拼写/层级），同时满足 deps 作为唯一事实源的要求（对齐 deps-trace / reverse-closure）。
- 返回 Module 是“句柄类型闭环”的关键：React 的 `useModule(Module)`、Logic 的 `$.use(ModuleLike)` 都依赖 ModuleLike 的 Ext 载体（`MODULE_EXT`）与 tag 的 handle extend 才能把 controller 类型带出来；Blueprint 会把这条链路断开。

**Alternatives considered**:

- 维持 Blueprint：需要业务侧自己把 runtime 拼装进 controller，且 controller 无法自然出现在 `$.self/useModule` 上，造成 Form/Query 心智分裂。
- 只用 `string` 作为 refresh target：会留下“拼错 name 但运行期静默不生效”的坑，且很难从诊断面复盘。
