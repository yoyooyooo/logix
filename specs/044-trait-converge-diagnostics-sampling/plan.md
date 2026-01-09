# Implementation Plan: 044 Trait 收敛诊断的低成本采样（计时/统计）

**Branch**: `044-trait-converge-diagnostics-sampling` | **Date**: 2025-12-29 | **Spec**: `specs/044-trait-converge-diagnostics-sampling/spec.md`  
**Input**: `specs/044-trait-converge-diagnostics-sampling/spec.md`

## Summary

在不破坏 `diagnostics=off` 近零成本语义的前提下，增加一种面向生产/近生产的“采样诊断”能力：以确定性采样策略（基于稳定 `txnSeq`）在少量事务上开启 per-step 计时，输出 Slim、可序列化的 `top3` hotspots（以及采样配置摘要），用于 Devtools 定位长尾慢点；并用 browser 基线量化 `sampled vs off/light/full` 的 overhead 曲线。

## Technical Context

**Language/Version**: TypeScript 5.8.x（ESM）  
**Primary Dependencies**: `effect` v3、`@logixjs/*`（runtime: `@logixjs/core`；perf: `@logixjs/perf-evidence` path-mapping）  
**Storage**: N/A  
**Testing**: Vitest + `@effect/vitest`（Effect-heavy 用例）  
**Target Platform**: Node.js 20+ + Chromium headless（Vitest browser）  
**Project Type**: pnpm workspace（`packages/*` + `apps/*`）  
**Performance Goals**:
- `diagnostics=off`：不新增常驻采样/计时/对象分配（近零成本）
- `diagnostics=sampled`：平均额外开销显著低于 `full`（通过低采样率把 per-step 计时稀释到可接受）
**Constraints**: 事务窗口禁止 IO/async；诊断事件必须 Slim 且可序列化；采样必须确定性（不使用随机/时间做锚）  
**Scale/Scope**: 高频 converge（computed/link 多 step）与生产可观测性

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
  - Internal contracts & trial runs: does this feature introduce/modify internal
    hooks or implicit collaboration protocols; are they encapsulated as explicit
    injectable Runtime Services (no magic fields / parameter explosion), mockable
    per instance/session, and able to export evidence/IR without relying on
    process-global singletons?
  - Dual kernels (core + core-ng): if this feature touches kernel/hot paths or
    Kernel Contract / Runtime Services, does the plan define a kernel support
    matrix (core vs core-ng), avoid direct @logixjs/core-ng dependencies in
    consumers, and specify how contract verification + perf evidence gate changes?
  - Performance budget: which hot paths are touched, what metrics/baselines
    exist, and how will regressions be prevented?
  - Diagnosability & explainability: what diagnostic events/Devtools surfaces
    are added or changed, and what is the cost when diagnostics are enabled?
  - User-facing performance mental model: if this changes runtime performance
    boundaries or an automatic policy, are the (≤5) keywords, coarse cost model,
    and “optimization ladder” documented and aligned across docs/benchmarks/diagnostics?
  - Breaking changes: does this change any public API/behavior/event protocol;
    where is the migration note documented (no compatibility layer)?
  - Public submodules: if this touches any `packages/*`, does it preserve the
    `src/index.ts` barrel + PascalCase public submodules (top-level `src/*.ts`,
    except `index.ts`/`global.d.ts`), move non-submodule code into
    `src/internal/**`, and keep `package.json#exports` from exposing internals?
  - What quality gates (typecheck / lint / test) will be run before merge,
    and what counts as “pass” for this feature?

**Answers（本特性裁决）**：

- **Intent→Flow/Logix→Code→Runtime**：属于 Runtime 可观测性（trait converge 的执行诊断/证据）能力增强；不改变用户侧 Intent/Flow/DSL。
- **SSoT / docs-first**：采样新增字段/level 的协议裁决落在 `specs/009-*`（DynamicTrace level 枚举）与 `specs/013-*`（trait:converge data/event schema）；代码只实现，不在 feature 目录复制 schema。
- **Contracts**：扩展 `TraitConvergeDecisionSummary` 的可选采样摘要字段，并为 `DynamicTrace.level` 增加 `sampled`；同时更新对应 schema。
- **Deterministic identity**：采样决策基于稳定 `txnSeq`（同一 instance 单调），避免 random/time；证据仍以 `instanceId/txnSeq` 作为锚点。
- **Transaction boundary**：采样仅增加同步计时与少量对象创建；不得引入 IO/async。
- **Performance budget**：通过 `.codex/skills/logix-perf-evidence/assets/matrix.json` 的 `diagnostics.overhead.e2e` suite 验证 `sampled vs off/light/full`。
- **Breaking changes / docs**：新增 diagnostics 档位/字段属于“用户可见口径”（Devtools/平台侧）；需要在用户文档中补充 sampled 的定位与开销心智模型。
- **Quality gates**：`pnpm typecheck:test` + `pnpm test:turbo` +（按需）`pnpm -C packages/logix-react test -- --project browser --run test/browser/perf-boundaries/diagnostics-overhead.test.tsx`；并用 `$logix-perf-evidence` 产出 browser before/after/diff（至少 quick 探路 + default 结论）。

## Perf Evidence Plan（MUST）

> 若本特性触及 Logix Runtime 核心路径 / 渲染关键路径 / 对外性能边界：此节必须填写；否则标注 `N/A`。
> 详细口径见：`.codex/skills/logix-perf-evidence/references/perf-evidence.md`

- Baseline 语义：代码前后 / 策略 A/B（填其一）
- envId：<os-arch.cpu.browser-version.headless>
- profile：default（交付）/ soak（更稳）｜quick 仅探路
- collect（before）：`pnpm perf collect -- --profile <profile> --out specs/<id>/perf/before.<sha>.<envId>.<profile>.json [--files ...]`
- collect（after）：`pnpm perf collect -- --profile <profile> --out specs/<id>/perf/after.<sha|worktree>.<envId>.<profile>.json [--files ...]`
- diff：`pnpm perf diff -- --before specs/<id>/perf/before...json --after specs/<id>/perf/after...json --out specs/<id>/perf/diff.before...__after....json`
- Failure Policy：出现 `stabilityWarning/timeout/missing suite` → 复测（profile 升级或缩小子集），`comparable=false` 禁止下硬结论

**本特性最小证据闭环（建议）**：

- Suite：`diagnostics.overhead.e2e`（新增 axis `diagnosticsLevel=sampled`）
- 结论至少覆盖 `profile=default` 的 before/after/diff（worktree 结果仅作线索；硬结论需隔离 worktree 采集）

## Project Structure

### Documentation (this feature)

```text
specs/044-trait-converge-diagnostics-sampling/
├── plan.md              # 本文件
└── tasks.md             # $speckit tasks 产物
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
├── src/internal/runtime/core/DebugSink.ts
├── src/Debug.ts
├── src/internal/state-trait/converge.ts
├── src/internal/state-trait/model.ts
└── test/StateTrait/StateTrait.ConvergeAuto.DiagnosticsLevels.test.ts

.codex/skills/logix-perf-evidence/
└── assets/matrix.json

packages/logix-react/
└── test/browser/perf-boundaries/diagnostics-overhead.test.tsx

specs/009-txn-patch-dirtyset/
└── contracts/schemas/dynamic-trace.schema.json

specs/013-auto-converge-planner/
└── contracts/schemas/trait-converge-*.schema.json
```

**Structure Decision**: 本特性是 runtime observability + trait converge 诊断协议扩展；代码落在 `packages/logix-core`（DebugSink + converge），浏览器证据复用现有 perf boundary（`packages/logix-react/test/browser/perf-boundaries`）与 perf matrix SSoT（`@logixjs/perf-evidence/assets/matrix.json`）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| N/A                        | N/A                | N/A                                  |
