# 201 Kernel Stability Report Gate Specification

**Status:** Implemented  
**Priority:** P2  
**Created:** 2026-05-11  
**Depends On:** 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200

## Purpose

建立非性能型 KernelStabilityReport，把 public surface、authoring spine、field declaration、runtime lifecycle、transaction safety、selector precision、diagnostics-off、control plane、domain boundary、legacy residue 汇总成 release gate。

## Scope

This report is an internal release gate artifact, not public API. It should collect results from existing guard/contract tests and static sweeps, without running benchmark suites or claiming perf. The first implementation may be a script plus contract tests that produce deterministic JSON/Markdown from explicit inputs. 

## Global Guardrails

- Do not add public root exports, public submodules, or public authoring nouns.
- Do not add benchmark/perf collection scripts in this wave. Existing focused contract/perf-off tests may be run only as correctness guards.
- Do not claim performance improvement. The goal is architecture stabilization and regression-proofing.
- Do not use destructive git operations (`git reset`, `git clean`, `git checkout -- <path>`, `git restore`, `git stash`).
- Keep every PR small and reviewable. Commit after each passing task group.
- Diagnostics-level `off` must not allocate trace payloads or emit debug events.
- Runtime owns truth. React, Playground, Devtools, CLI, and domain packages may only consume/project existing truth.

## Functional Requirements
- **FR-001:** Report shape must include PASS/FAIL/UNKNOWN for `publicSurface`, `authoringSpine`, `fieldDeclarationCompiler`, `runtimeLifecycle`, `transactionSafety`, `selectorPrecision`, `diagnosticsOffCost`, `controlPlaneShape`, `domainBoundary`, and `legacyResidueSweep`.
- **FR-002:** Report must explicitly exclude broad perf success claims while architecture is still being refactored.
- **FR-003:** Script must be deterministic, JSON-safe, and able to emit Markdown summary.
- **FR-004:** Report generation must not require browser perf suites or benchmark collection.
- **FR-005:** Contract tests must verify shape, stable ordering, no public export, and no accidental `perfBroadStrict: PASS` claim when no perf artifact is provided.
## Non-Goals
- **NG-001:** Do not block on actual broad perf evidence.
- **NG-002:** Do not expose report as public Runtime API.
- **NG-003:** Do not integrate into CI unless maintainers choose to wire it after review.
## Acceptance Criteria
- **AC-001:** KernelStabilityReport contract test passes and proves JSON shape stability.
- **AC-002:** `node scripts/kernel-stability-report.mjs --dry-run` prints deterministic report with UNKNOWN where evidence is absent.
- **AC-003:** Docs template explains how to fill gates without interpreting UNKNOWN as PASS.
## Target Files

### Create
- `packages/logix-core/src/internal/runtime/core/KernelStabilityReport.ts`
- `packages/logix-core/test/Contracts/KernelStabilityReport.contract.test.ts`
- `scripts/kernel-stability-report.mjs`
- `docs/next/kernel-stability-report-template.md`
### Modify
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts`
### Focused Tests
- `packages/logix-core/test/Contracts/KernelStabilityReport.contract.test.ts`
- `packages/logix-core/test/Contracts/RuntimeHotPathPolicy.test.ts`
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- `packages/logix-form/test/Form/Form.DomainBoundary.test.ts`
## Dependency and Sequencing Notes

- Complete all dependency specs first.
- Treat this spec as independent once dependencies pass their focused tests.
- If an upstream dependency is partially complete, do not compensate here by widening public API or adding temporary shims.
