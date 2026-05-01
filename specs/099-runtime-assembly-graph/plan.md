# Implementation Plan: O-006 Runtime Assembly Graph

**Branch**: `[099-runtime-assembly-graph]` | **Date**: 2026-02-25 | **Spec**: `specs/099-runtime-assembly-graph/spec.md`
**Input**: Feature specification from `specs/099-runtime-assembly-graph/spec.md`

## Summary

O-006 目标是在不改变业务使用层入口的前提下，重构 Runtime 冷启动装配链路：
将当前隐式且分段的 build/merge/patch 流程收敛为显式 assembly graph，显式化 RootContext ready/merge 生命周期，并输出 Slim、可序列化、可回放对齐的启动证据。

计划交付聚焦三件事：
1. 启动路径可解释（成功/失败都可视化、可定位）。
2. 启动行为稳定（结构与标识可复现，可做回归 diff）。
3. 诊断成本可预算（off 近零成本，light/full 可量化）。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: 本特性暂不新增/变更 NS 绑定。
- **Kill Features (KF)**: 无。

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）
**Primary Dependencies**: `effect` v3、`@logixjs/core`、`@effect/vitest`、Vitest
**Storage**: N/A（运行时内存结构 + 证据文件落盘到 `specs/099-runtime-assembly-graph/perf/`）
**Testing**: `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`，以及 `packages/logix-core` 定向测试
**Target Platform**: Node.js 20+（核心验证）+ 浏览器 Devtools 消费面（协议兼容验证）
**Project Type**: pnpm workspace（runtime core + docs/spec artifacts）
**Performance Goals**: 冷启动 p95 回归 ≤ 5%；`diagnostics=off` 开销接近零并可量化
**Constraints**: 统一最小 IR 口径不漂移；诊断事件 Slim 且可序列化；事务窗口禁止 IO；稳定锚点去随机化
**Scale/Scope**: 仅覆盖 Runtime 装配链路（`AppRuntime` / RootContext 相关）与其测试、诊断协议、文档/证据

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Research Gate（2026-02-25）

- **North Stars / Kill Features**: 本 spec 未声明 NS/KF 编号，不存在 traceability 漏配问题。
- **Intent → Flow/Logix → Code → Runtime 映射**: 本特性属于 Runtime 装配与观测层；不改变业务 Intent/Flow 写法，主要影响 Runtime 内部启动链路的可解释性与稳定性。
- **Docs-first & SSoT 依赖**: 以 `docs/ssot/runtime/00-principles.md`、`docs/ssot/runtime/logix-core/runtime/05-runtime-implementation.02-app-runtime-makeapp.md`、`docs/ssot/runtime/logix-core/observability/09-debugging.02-eventref.md` 为约束源；实现后需同步回写相应 runtime SSoT。
- **Effect/Logix contracts**: 对外业务 API 预期不变；内部新增/调整装配证据与启动报告契约时，必须在 runtime 文档中显式定义字段与语义。
- **IR & anchors**: 不引入并行 IR 真相源；仅在 Dynamic Trace/启动证据层补充 assembly graph 摘要，不改变统一最小 IR 原则。
- **Deterministic identity（稳定标识）**: 装配节点/事件必须使用稳定锚点语义（instanceId/txnSeq/opSeq + 阶段稳定序号），禁止 random/time 默认 ID。
- **Transaction boundary（事务窗口）**: 保持“事务窗口禁止 IO/等待”硬约束；本次装配改造不得引入事务内异步或可写逃逸。
- **React consistency / external reactive sources**: 本特性不变更 React 订阅协议与外部源接入语义；判定为 N/A（保持现状）。
- **Internal contracts & trial runs**: 装配链路中的隐式协作点需收敛为显式 runtime service / assembly graph 节点语义，支持实例隔离与证据导出。
- **Dual kernels（core + core-ng）**: 本轮只在 `@logixjs/core` 主线落地；不得引入 consumer 对 `@logixjs/core-ng` 的直接依赖；后续 core-ng 对齐由独立 spec 跟进。
- **Performance budget（性能预算）**: 重点关注冷启动路径（AppRuntime 装配阶段）；必须有 before/after/diff 证据并满足回归门槛。
- **Diagnosability & explainability（诊断成本）**: 新增/调整的启动诊断事件必须 Slim 且可序列化；需明确 off/light/full 成本差异与上限。
- **User-facing performance mental model**: 本特性主要面向 Runtime 维护者，不改变业务 API；文档仍需给出统一关键词与成本模型，避免诊断/基线术语漂移。
- **Breaking changes & migration（迁移说明）**: 预期无对外破坏；若出现破坏性变化，必须在 `specs/099-runtime-assembly-graph/migration.md` 与相关文档给出迁移说明，无兼容层/无弃用期。
- **Public submodules**: 主要改动 `src/internal/**`；如需触及 public submodule，必须保持 `src/index.ts` 与导出边界不泄漏 internal。
- **Large modules/files decomposition**: 若 `AppRuntime.ts` 等文件接近复杂度阈值，实施中需同步给出分解方案，确保单向依赖与可验证重构。
- **Quality gates**: 实施完成前必须通过 `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`，并补跑 O-006 相关定向测试与性能证据脚本。

### Post-Design Re-check（规划结论）

- 性能预算：已定义并纳入 Perf Evidence Plan。
- 诊断成本：已定义分级成本约束与序列化门禁。
- 事务窗口约束：已明确为不可突破的硬门。
- 稳定标识：已要求阶段与事件锚点去随机化。
- 迁移说明：已定义“如破坏则必须产出 migration 文档”的门禁。

## Perf Evidence Plan（MUST）

- **Baseline 语义**: 代码前后（before/after）
- **envId**: `darwin-arm64.node20`（实施时补齐浏览器 profile 维度）
- **profile**: `default`（交付基线），必要时补 `soak`
- **collect（before）**:
  `pnpm perf collect -- --profile default --out specs/099-runtime-assembly-graph/perf/before.<sha>.darwin-arm64.node20.default.json --files packages/logix-core/src/internal/runtime/AppRuntime.ts`
- **collect（after）**:
  `pnpm perf collect -- --profile default --out specs/099-runtime-assembly-graph/perf/after.<sha>.darwin-arm64.node20.default.json --files packages/logix-core/src/internal/runtime/AppRuntime.ts`
- **diff**:
  `pnpm perf diff -- --before specs/099-runtime-assembly-graph/perf/before.<sha>.darwin-arm64.node20.default.json --after specs/099-runtime-assembly-graph/perf/after.<sha>.darwin-arm64.node20.default.json --out specs/099-runtime-assembly-graph/perf/diff.before__after.darwin-arm64.node20.default.json`
- **Failure Policy**: 出现 `stabilityWarning/timeout/missing suite` 必须复测；`comparable=false` 禁止输出结论。

## Project Structure

### Documentation (this feature)

```text
specs/099-runtime-assembly-graph/
├── spec.md
├── plan.md
├── tasks.md
├── research.md                 # 规划阶段的决策沉淀
├── data-model.md               # assembly graph 逻辑实体
├── quickstart.md               # 冷启动验证与复现步骤
├── migration.md                # 仅在出现破坏性变化时启用
├── contracts/
│   └── assembly-boot-report.schema.json
└── perf/
    ├── before.*.json
    ├── after.*.json
    └── diff.*.json
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/
├── AppRuntime.ts
└── core/
    ├── RootContext.ts
    ├── ModuleRuntime.logics.ts
    ├── WorkflowRuntime.ts
    └── DebugSink.ts

packages/logix-core/test/internal/Runtime/
├── AppRuntime.test.ts
└── ModuleRuntime/
    └── ModuleRuntime.*.test.ts

docs/ssot/runtime/logix-core/
├── runtime/05-runtime-implementation.02-app-runtime-makeapp.md
└── observability/09-debugging.02-eventref.md
```

**Structure Decision**: 保持 `@logixjs/core` 既有目录拓扑；公共 API 不扩散，装配图与启动证据实现落在 `src/internal/runtime/**`，通过测试与文档完成契约闭环。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| None | N/A | N/A |
