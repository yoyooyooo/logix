# 196 Hotpath Diagnostics-Off Internal Counters Specification

**Status:** Implemented  
**Priority:** P1  
**Created:** 2026-05-11  
**Depends On:** 195

## Purpose

为 source / validate / selector / converge fallback 建内部可观测计数，同时守住 diagnostics=off 无 trace 分配。

## Scope

新增 test-only/internal hotpath audit sink。生产热路径默认没有 sink，因此只有空指针/undefined 分支；diagnostics 或 tests 显式安装 sink 时才记录 counters。该需求不是 benchmark，不采集耗时，只记录 structural decision counts 和 fallback reason counts。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Create internal `KernelHotPathAudit` with optional sink and no public export.
- **FR-002:** Counters must cover source dirty gate decisions, validate static-ir/full-fallback decisions, selector dirty fallback decisions, and converge legacy/unknown dirty decisions.
- **FR-003:** When no sink is installed, recording must be a single undefined check and return; no object allocation.
- **FR-004:** When sink is installed, reason counts must use `KernelFallbackReason` values from requirement 195.
- **FR-005:** Tests must prove diagnostics=off produces no Debug events and no audit sink by default.
## Non-Goals
- **NG-001:** No timing, p95, benchmark, or browser perf collection.
- **NG-002:** No runtime public API for counters.
- **NG-003:** No persistent telemetry.
## Acceptance Criteria
- **AC-001:** Internal audit contract test can install a sink, run focused operations, and inspect counts.
- **AC-002:** Diagnostics-off tests remain green and no debug event family is added.
- **AC-003:** All touched subsystems use unified fallback reasons for counter keys.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/KernelHotPathAudit.ts`
- `packages/logix-core/test/Contracts/KernelHotPathAudit.contract.test.ts`
### Modify
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
### Focused Tests
- `packages/logix-core/test/Contracts/KernelHotPathAudit.contract.test.ts`
- `packages/logix-core/test/Debug/Debug.OffSemantics.NoDrift.test.ts`
- `packages/logix-core/test/Debug/Debug.DiagnosticsLevels.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
