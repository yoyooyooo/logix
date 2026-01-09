# Implementation Plan: 007 Trait 系统统一（Form 形状 × Kernel 性能 × 可回放）

**Branch**: `007-unify-trait-system` | **Date**: 2025-12-13 | **Spec**: `specs/007-unify-trait-system/spec.md`  
**Input**: `specs/007-unify-trait-system/spec.md`

## Summary

007 的目标是把 004 的“对外形状”（Form/Query 领域入口、数组 index 语义、同构错误树、交互态全双工、Blueprint/Controller + imports 同源组合）与 006 的“内核红线”（显式依赖 + 依赖图、反向闭包 scoped validate、事务内 0/1 次提交、诊断/预算/降级）合并为一套无冲突的 Trait 系统。落地策略：

- 以 `StateTrait` 作为首个“可推导中间表示”，强制 `computed/source/check` 显式声明 `deps`，并构建可解释的 `Program + DependencyGraph(+reverseAdj) + Plan`。
- 以内核归属的 `TraitLifecycle` 统一承载 `install / Ref / scoped validate / scoped execute / cleanup`，让 Form/Query 默认逻辑同源下沉，避免各领域各造一套 glue。
- 异步资源统一为快照状态机（idle/loading/success/error）+ `keySchema normalize → keyHash` 门控；key 变空必须同步写回 idle 并清空 data/error，避免 tearing。
- 回放以“结果重赛（re-emit）”为准：Replay Mode 不发真实网络请求；依赖可回放事件日志复现资源快照演进。
- 数组对外保持 index 语义；对内引入 RowID 虚拟身份层复用图节点/缓存，并预留 `trackBy/identityHint` 为极端规模优化开口。
- Form/Query 都是“特殊 Module”：通过 `impl` + Root `imports` 同源组合，避免出现“Form/Query vs Store 何时同步”的双事实源长期维护难题。

研究结论与对外契约已固化为资产：`specs/007-unify-trait-system/research.md`、`specs/007-unify-trait-system/contracts/*`、`specs/007-unify-trait-system/data-model.md`、`specs/007-unify-trait-system/quickstart.md`。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM），Node.js 20+  
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@logixjs/react`、`@logixjs/devtools-react`、（Query 外部引擎）`@tanstack/query-core`  
**Storage**: N/A（内存状态 + 可回放事件日志；不要求持久化）  
**Testing**: Vitest + `@effect/vitest`（一次性运行；不使用 watch）  
**Target Platform**: Browser（React 场景/Devtools）+ Node.js（测试/基准）  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**: 单次 Operation Window 0/1 次可观察提交；p95 100ms 内完成“相关派生/错误更新”；10x 规模下 p95 劣化 ≤ 2x  
**Constraints**: 超预算阈值默认 200ms（可配置）；诊断历史默认保留 60s（可配置）；回放不发真实网络  
**Scale/Scope**: 100+ 字段、两层嵌套数组、1000 行压力场景；查询场景含 10 次快速参数变更与缓存复用/失效

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- `Intent → Flow/Logix → Code → Runtime` 映射：
  - Intent/需求：以 `specs/007-unify-trait-system/spec.md` 的用户故事与成功标准为验收口径（Form/Query 双对照 + 0/1 commit + 回放/诊断）。
  - Flow/Logix：以 Module/Logic/StateTrait 作为对外可写的声明入口；领域事件通过 `TraitLifecycle` 下沉到 scoped validate/execute/cleanup。
  - Code：主要落点在 `packages/logix-core`（StateTrait build/graph/plan、StateTransaction/dispatch、诊断/回放事件）；领域包落点在 `packages/logix-form` 与（新增）`packages/logix-query`；React 适配在 `packages/logix-react` 与领域包的 `*/react` 薄糖；Devtools 在 `packages/logix-devtools-react`。
  - Runtime：所有派生/刷新/清理必须进入同一 Operation Window 的事务草稿，最终 0/1 次提交；回放以事件重赛而非重发请求。
- 依赖或修改的 `docs/specs/*`（docs-first & SSoT）：
  - 需要把 007 的关键契约回写到 runtime SSoT：`.codex/skills/project-guide/references/runtime-logix/logix-core/runtime/05-runtime-implementation.md`（事务内收敛、deps/graph、预算/降级）与 `.codex/skills/project-guide/references/runtime-logix/logix-core/observability/09-debugging.md`（txn 聚合诊断、触发原因/输入快照/patch 口径）。
  - 若新增/调整对外公共术语（如 FieldRef、Reverse Closure、Replay Log），需要同步到 `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md`（以该处为术语裁决）。
- Effect/Logix 契约变更与落档：
  - `StateTrait` 的“显式 deps + Graph + Reverse Closure + 事务内收敛”需要在 `.codex/skills/project-guide/references/runtime-logix` 的实现与调试章节固化后再落代码。
  - `TraitLifecycle` 作为 kernel 新公共契约，需要在 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/02-module-and-logic-api.md` 或新增对应章节中明确其定位与与 ModuleLogic 的关系。
- 质量门（merge 前必须通过）：
  - `pnpm typecheck`、`pnpm lint`、`pnpm test`（一次性运行）；并按变更范围至少跑 `packages/logix-core` 与 `packages/logix-react` 的相关测试集。

## Project Structure

### Documentation (this feature)

```text
specs/007-unify-trait-system/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── checklists/
```

### Source Code (repository root)

```text
packages/logix-core/                  # Trait/StateTrait 内核、事务、诊断、回放基础能力（主落点）
packages/logix-form/                 # @logixjs/form（Blueprint/Controller/Rules/ErrorMap；可选 form/react 薄糖）
packages/logix-query/                # @logixjs/query（领域包入口；Query.Engine.layer + Query.Engine.middleware；默认 Query.TanStack.engine）
packages/logix-react/                # React 适配（RuntimeProvider/useLocalModule/useSelector 等）
packages/logix-devtools-react/       # 诊断与回放 UI（txn 聚合视图、触发原因、成本摘要）

examples/logix-react/                # 真实复杂表单基准 + 合成压力/查询基准（用于 SC 验收）
.codex/skills/project-guide/references/runtime-logix/            # Runtime SSoT（契约落档）
apps/docs/content/docs/              # 用户文档（产品视角；不出现“PoC/内部实现”措辞）
```

**Structure Decision**: 本仓为 pnpm workspace monorepo；007 的实现以“先固化 SSoT 契约，再落核心引擎，再补领域包与适配层”的顺序推进，避免在 UI/DX 上先跑偏导致事实源漂移。

## Implementation Strategy（分阶段落地与交付物）

> 说明：本节是“路线图级别”的计划；更细的可交付任务拆分在后续 `tasks.md`（$speckit tasks）中完成。

### Phase 0：验收基准与口径固化（先把“怎么衡量”写死）

- 固化至少 1 个复杂表单基准与 1 个合成压力基准，覆盖 SC-001~SC-006 的关键断言口径。
- 固化至少 1 个查询基准（搜索 + 筛选/分页），覆盖 SC-009~SC-010 的竞态与缓存复用口径。
- 固化“可观测信号”口径：txnId、触发原因、输入快照、patch 记录、Top3 成本摘要（供 Devtools 与测试共同裁决）。

### Phase 1：Kernel（StateTrait → Program/Graph/Plan）与事务内收敛

- 强制显式 deps：未声明 deps 在 build 阶段失败；Graph/诊断只认 deps 作为依赖事实源。
- 构建 Dependency Graph（含 reverse adjacency）并提供 Reverse Closure 计算，用于 scoped validate 的最小执行范围。
- 将派生/校验收敛纳入 Operation Window：在单次事务草稿内完成收敛，最终 0/1 次可观察提交；超预算/运行时错误软降级、冲突/循环硬失败。
- 数组内部引入 RowID 虚拟身份层以减少头插/重排的无谓 cache miss，并在 DSL 预留 `trackBy/identityHint`。
- RowID 映射层必须先用高强度测试矩阵锁死语义与清理：覆盖 insert/delete/move/swap 等数组操作与 `TraitLifecycle.cleanup`、以及 in-flight 结果在“删除/重排后”的门控与归属正确性，避免引入隐蔽一致性 bug。

### Phase 2：TraitLifecycle（统一下沉接口）与回放/诊断口径

- 固化 `TraitLifecycle.install / Ref / scoped validate / scoped execute / cleanup` 的数据模型与事件口径（对应 `contracts/trait-lifecycle.md`）。
- 统一诊断与回放：每次派生/刷新/丢弃/清理都必须产出稳定标识、触发原因、输入快照与 patch 记录；Replay Mode 只重赛事件，不重发请求。

### Phase 3：Module（Form-first；Query 作为对照组可延迟实现但先锁契约）

- Form：以 Blueprint/Controller 为主线（对齐 004），默认 logics 基于 TraitLifecycle；提供 `Form.Rule.make` 与 `errorMap` 逃生舱；并沉淀一套默认的 Schema Path Mapping（覆盖大多数常见重命名/结构映射/数组内对齐场景，减少 errorMap 手写负担）；React 侧仅薄投影。
- Query：作为对照领域，优先对齐 Form 的“领域包入口”心智；通过 effect DI 注入可替换 Engine（`Query.Engine` + `Query.Engine.layer()`），并以 `Query.Engine.middleware()` 作为唯一引擎接管点；默认 TanStack 适配器为 `Query.TanStack.engine(new QueryClient())`。Logix 仍做 keyHash 门控与可回放口径兜底；Query DSL 同样需要配套 dev-mode 的 deps 一致性诊断，降低显式 deps 漏写/错写的风险。

### Phase 4：Docs（SSoT 回写）与用户文档体验

- 将 007 的关键契约回写到 `.codex/skills/project-guide/references/runtime-logix/*` 并与 Devtools/示例对齐。
- 在 `apps/docs` 增补“Form/Query 作为特殊 Module（imports 同源）”的用户指南与最佳实践（不出现内部阶段性措辞）。

### 非阻塞项（Spec 为 SHOULD，可延后）

- **FR-017（Codegen-first）**：不作为 Phase 0~3 的阻塞条件；按 `spec.md` 的 TODO 口径先保证“最小可用骨架生成”能走通 DX 闭环，其余工程化（增量更新/合并策略等）等核心链路达标后再推进。
- **FR-029（Meta Info）**：不作为核心运行时语义的阻塞条件；优先在 Devtools/文档体验需要时实现白名单字段 + 稳定 canonical 选择与冲突提示，避免在 Phase 1~2 牵扯过多非核心实现成本。
