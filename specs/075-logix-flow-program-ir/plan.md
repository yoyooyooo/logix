# Implementation Plan: FlowProgram IR（可编译控制律：Action→Action + 时间算子）

**Branch**: `075-logix-flow-program-ir` | **Date**: 2026-01-05 | **Spec**: `specs/075-logix-flow-program-ir/spec.md`  
**Input**: Feature specification from `specs/075-logix-flow-program-ir/spec.md`

**Note**: This template is copied into `specs/[###-feature-name]/plan.md` by
`.specify/scripts/bash/setup-plan.sh` (invoked by the feature workflow).

## Summary

交付一个“可导出、可编译、可诊断”的 FlowProgram 能力：

- 业务用声明式 DSL 描述“触发源（action/lifecycle/timer）→ 步骤（dispatch/serviceCall/delay）→ 并发策略”；
- 编译为运行期 watcher（复用现有 FlowRuntime/EffectOp），且严格遵守 txn-window 禁 IO；
- 以 073 的 tick 作为观测参考系：时间算子必须可归因到 tickSeq（禁止影子 setTimeout/Promise 链）；
- 导出 JSON 可序列化 Static IR（版本号 + digest），供 Devtools/Alignment Lab 可视化与 diff。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9.x（ESM）  
**Primary Dependencies**: `effect` v3，`@logix/core`（FlowRuntime/EffectOp），依赖 073 的 tick/contracts  
**Storage**: N/A  
**Testing**: Vitest（涉及 tick/时间语义的测试优先 `@effect/vitest`）  
**Target Platform**: Node.js + browsers  
**Project Type**: pnpm workspace（`packages/*`）  
**Performance Goals**: timer 触发 + watcher 运行的 tick overhead 不得显著回归（需 perf evidence）  
**Constraints**: 统一最小 IR（Static IR + Dynamic Trace）；标识去随机化；事务窗口禁 IO；no shadow time  
**Scale/Scope**: 面向“典型业务工作流”（提交/跳转/刷新/重试），不追求全量 BPMN

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- Answer the following BEFORE starting research, and re-check after Phase 1:
  - How does this feature map to the
    `Intent → Flow/Logix → Code → Runtime` chain?
  - Which `docs/specs/*` specs does it depend on or modify, and are they
    updated first (docs-first & SSoT)?
  - Does it introduce or change any Effect/Logix contracts? If yes, which
    `.codex/skills/project-guide/references/runtime-logix/*` docs capture the new contract?
  - IR & anchors: does it change the unified minimal IR or the Platform-Grade
    subset/anchors; are parser/codegen + docs updated together (no drift)?
  - Deterministic identity: are instance/txn/op IDs stable and reproducible
    (no random/time defaults); is the identity model documented?
  - Transaction boundary: is any IO/async work occurring inside a transaction
    window; are write-escape hatches (writable refs) prevented and diagnosed?
  - React consistency (no tearing): if this touches React integration or external
    reactive sources, is there a single snapshot anchor (e.g. `tickSeq`) for
    `useSyncExternalStore` consumers, with no dual truth source and no data-glue
    `useEffect` syncing state?
  - External sources (signal dirty): are subscriptions pull-based (signal dirty +
    deduped scheduling) rather than payload/queue based (no thundering herd)?
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Dual kernels (core + core-ng): if this feature touches kernel/hot paths or
    Kernel Contract / Runtime Services, does the plan define a kernel support
    matrix (core vs core-ng), avoid direct @logix/core-ng dependencies in
    consumers, and specify how contract verification + perf evidence gate changes?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes (forward-only evolution): does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer / no deprecation period)?
  - Public submodules: if this touches any `packages/*`, does it preserve the
    `src/index.ts` barrel + PascalCase public submodules (top-level `src/*.ts`,
    except `index.ts`/`global.d.ts`), move non-submodule code into
    `src/internal/**`, and keep `package.json#exports` from exposing internals?
  - Large modules/files (decomposition): if this touches any existing file/module
    that is ≥1000 LOC (or is expected to exceed the threshold), does the plan
    include a decomposition brief with mutually exclusive submodules, chosen
    structure (flat `*.*.ts` vs directory), one-way dependency topology, and an
    incremental rollout + verification strategy (keep refactor separate from
    semantic changes)?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

Baseline 语义：FlowProgram 引入前后（before=手写 watcher；after=FlowProgram watcher），对比 tick overhead 与分配。

- envId：按 `.codex/skills/logix-perf-evidence/assets/matrix.json`
- profile：default（交付）/ soak（更稳）
- collect（before/after/diff）沿用 073 的 perf 证据脚本；点位最小要求：
  - 含 `delay` 的 timer 触发（证明不引入影子时间线的同时仍可控）
  - 含 `serviceCall + dispatch` 的 submit 工作流（证明 watcher 执行链路可控）

Failure Policy：同 073（`comparable=false` 禁止下硬结论）。

## Project Structure

### Documentation (this feature)

```text
specs/075-logix-flow-program-ir/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── public-api.md
    ├── ir.md
    ├── diagnostics.md
    ├── tape.md
    └── migration.md
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
packages/logix-core/
├── src/
│   ├── FlowProgram.ts                         # NEW: public module (DSL + types)
│   └── internal/
│       └── runtime/core/FlowProgramRuntime.ts # NEW: compiler + mount (uses FlowRuntime/EffectOp)
└── test/
    └── internal/runtime/FlowProgram.*.test.ts # NEW: semantics (submit/delay/cancel) + trace anchors

packages/logix-react/
└── test/browser/**                            # 如需验证 tickSeq 关联：复用 073 runtime-store 场景
```

**Structure Decision**: FlowProgram 作为 `@logix/core` 的公共子模块对外暴露（DSL + 类型）；编译与 mount 下沉 `src/internal/runtime/core/FlowProgramRuntime.ts`，复用既有 FlowRuntime/EffectOp，并通过测试与 perf evidence 守住 tick 参考系与成本门控。

## Complexity Tracking

N/A
