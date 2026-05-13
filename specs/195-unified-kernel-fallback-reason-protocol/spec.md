# 195 Unified Kernel Fallback Reason Protocol Specification

**Status:** Implemented  
**Priority:** P0  
**Created:** 2026-05-11  
**Depends On:** 190, 191, 194

## Purpose

把 source / validate / selector / converge 的 fallback reason 统一成内部协议，避免每个子系统长自己的 reason vocabulary。

## Scope

新增 internal-only fallback reason module。各子系统继续保留自己的 detailed semantics，但对 diagnostics/counters/tests 暴露统一 `KernelFallbackReason`。该协议不进入 public API，不改变 DebugSink event family，只作为 payload field 和 contract tests 的稳定词表。

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Create `KernelFallbackReason` union with at least: `missing_ir`, `dirty_all`, `missing_registry`, `field_paths_key_mismatch`, `field_path_count_mismatch`, `invalid_root_id`, `dirty_root_fallback`, `list_root_touched`, `missing_list_evidence`, `missing_validate_ir`, `legacy_dirty_input`, `unknown_write`.
- **FR-002:** Create mapping helpers for source, validate, selector, and converge local reasons.
- **FR-003:** Diagnostics payloads may include `kernelFallbackReason`, but diagnostics=off must not allocate payload objects just to compute it.
- **FR-004:** No public exports, package root exports, or docs-facing user concepts may reference `KernelFallbackReason`.
- **FR-005:** Tests must lock the vocabulary and reject ad-hoc reason strings in touched subsystems.
## Non-Goals
- **NG-001:** Do not replace all existing local reason fields at once.
- **NG-002:** Do not add a new Debug event family.
- **NG-003:** Do not expose fallback reasons to application authors as public API.
## Acceptance Criteria
- **AC-001:** Unified vocabulary contract test passes.
- **AC-002:** Source/validate/selector fallback tests assert `kernelFallbackReason` when diagnostics are enabled.
- **AC-003:** Diagnostics-off tests show no new emitted events.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/kernelFallbackReason.ts`
- `packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts`
### Modify
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
### Focused Tests
- `packages/logix-core/test/Contracts/KernelFallbackReason.contract.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- `packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- `packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
