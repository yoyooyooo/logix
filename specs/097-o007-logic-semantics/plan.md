# Implementation Plan: O-007 Logic 执行语义收敛（淘汰多重兼容分支）

**Branch**: `097-o007-logic-semantics` | **Date**: 2026-02-25 | **Spec**: `specs/097-o007-logic-semantics/spec.md`  
**Input**: Feature specification from `specs/097-o007-logic-semantics/spec.md`

## Summary

本特性将 `ModuleRuntime` 的 logic 启动链路收敛为单一 canonical setup/run 模型：

- 所有 raw logic（单相 / plan / plan effect）统一先 normalize 成 canonical plan；
- 执行层只保留一条 setup→run 管线，删除历史兼容执行分支；
- phase 违规统一走 `LogicPhaseError -> logic::invalid_phase` 诊断链路；
- 交付前后采集 perf evidence，证明核心启动路径无回归并可复现。

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: N/A（本任务是 runtime 内核收敛）
- **Kill Features (KF)**: N/A

## Technical Context

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3、`@effect/vitest`、`@logixjs/core` runtime 内核  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest`（重点覆盖 `ModuleRuntime`）  
**Target Platform**: Node.js（runtime 单测）  
**Project Type**: pnpm workspace（packages/* + specs/*）  
**Performance Goals**: `ModuleRuntime` logic 启动开销无 >5% 回归，并减少执行链路分支复杂度（以 perf diff + 代码路径证明）  
**Constraints**: forward-only evolution、事务窗口禁 IO、诊断事件 Slim 可序列化、稳定标识不可随机化  
**Scale/Scope**: 仅聚焦 `logix-core` runtime logic 启动链路与对应诊断/测试/文档

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Answers (Pre-Design)

- **Intent → Flow/Logix → Code → Runtime 映射**：
  - Intent/Flow 层不改 DSL；
  - Logix 层统一为 canonical setup/run 语义；
  - Code 落点聚焦 `ModuleRuntime.logics`；
  - Runtime 层以统一 normalize+execute 管线承载。
- **依赖/更新的规范与文档（docs-first）**：
  - 读取并遵循：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.03-module-logic.md`、`docs/ssot/runtime/logix-core/observability/09-debugging.05-diagnostics.md`、`docs/ssot/runtime/logix-core/impl/README.07-env-and-bootstrap.md`；
  - 本次会同步更新中文文档以反映 canonical 语义与迁移口径。
- **Effect/Logix 契约变化**：
  - 不新增对外 DSL；
  - 内部执行契约变更为“先 canonicalize，再统一执行”，并通过 contracts 文档显式化。
- **IR 与锚点漂移**：
  - 不新增并行 IR；
  - Static IR / Dynamic Trace 锚点（moduleId/instanceId/phase/diagnostic code）保持单一来源；
  - 漂移风险点：phaseRef 复用与 plan effect 解析阶段，需在实现和测试中锁定。
- **稳定标识**：
  - 不引入随机/时间默认值；
  - 继续复用既有稳定 instanceId/txnSeq/opSeq/event 字段。
- **事务边界**：
  - setup 仅同步注册；
  - run 承载 Env/IO；
  - 禁止事务窗口内新增异步 IO 分支。
- **React 一致性/外部源**：
  - 本特性不触及 React 与 external store 协议，记为 N/A。
- **内部协作契约**：
  - 新增 canonical normalize helper 属于 runtime 内部契约，需保持可测试、可诊断、可替换（不引入魔法字段）。
- **Dual kernels（core/core-ng）**：
  - 本次只改 `@logixjs/core`；不引入 `core-ng` 依赖。
- **性能预算**：
  - 必做 before/after perf 证据；
  - 预算：logic 启动关键指标回归不得超过 5%。
- **诊断成本**：
  - 仅复用既有 `logic::invalid_phase` 诊断协议；
  - 诊断关闭时保持接近零成本；
  - 诊断事件保持 Slim 且可序列化。
- **用户性能心智模型（≤5 关键词）**：`canonical` / `setup` / `run` / `phase` / `diagnostic`。
- **破坏性变更与迁移说明**：
  - 允许 forward-only 破坏性收敛；
  - 在 `contracts/migration.md` 与 PR 描述中提供迁移说明，不保留兼容层。
- **公共子模块规则**：
  - 若新增内部 helper，放 `src/internal/runtime/core/**`；
  - 不暴露 internal 到 package exports。
- **大文件拆分策略（≥1000 LOC）**：
  - `ModuleRuntime.logics.ts` 若继续膨胀，优先把 normalize/execution 子流程拆到互斥 helper（保持单向依赖）。
- **质量门**：
  - 必跑：`pnpm typecheck`、`pnpm lint`、`pnpm test:turbo`；
  - 需要时补 `packages/logix-core` 包级测试。

### Gate Result (Pre-Design)

- PASS（进入实现阶段）

## Perf Evidence Plan（MUST）

- **Baseline 语义**：代码前后（Before/After）
- **envId**：`macOS-arm64.node20`（本机一致环境）
- **profile**：`default`（交付口径；`quick` 仅排查时使用）
- **collect (before)**：
  - `pnpm perf collect -- --profile default --out specs/097-o007-logic-semantics/perf/before.local.macOS-arm64.node20.default.json`
- **collect (after)**：
  - `pnpm perf collect -- --profile default --out specs/097-o007-logic-semantics/perf/after.local.macOS-arm64.node20.default.json`
- **diff**：
  - `pnpm perf diff -- --before specs/097-o007-logic-semantics/perf/before.local.macOS-arm64.node20.default.json --after specs/097-o007-logic-semantics/perf/after.local.macOS-arm64.node20.default.json --out specs/097-o007-logic-semantics/perf/diff.before__after.local.macOS-arm64.node20.default.json`
- **Failure Policy**：
  - 若出现 `stabilityWarning/timeout/missing suite`，必须复测；
  - `comparable=false` 时禁止下性能结论。

## Project Structure

### Documentation (this feature)

```text
specs/097-o007-logic-semantics/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│  ├── canonical-logic-execution.md
│  ├── diagnostics.md
│  └── migration.md
├── perf/
│  ├── before.*.json
│  ├── after.*.json
│  └── diff.*.json
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/internal/runtime/core/
├── ModuleRuntime.logics.ts
├── LogicDiagnostics.ts
└── (optional) ModuleRuntime.logics.normalize.ts

packages/logix-core/test/internal/Runtime/ModuleRuntime/
└── ModuleRuntime.test.ts

docs/ssot/runtime/logix-core/
├── api/02-module-and-logic-api.03-module-logic.md
└── impl/README.07-env-and-bootstrap.md
```

**Structure Decision**: 本次保持在 `logix-core` runtime core 内聚改造，优先通过“新增 normalize helper + 主执行管线收敛”降低主文件分支复杂度；测试继续在现有 `ModuleRuntime.test.ts` 扩展，文档聚焦 runtime SSoT 中文页面同步。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| N/A | N/A | N/A |
