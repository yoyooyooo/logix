# Feature Specification: Kernel Performance Evidence Lock

**Feature Branch**: `230-kernel-performance-evidence-lock`
**Created**: 2026-05-12
**Status**: Proposed / local-gate patch
**Input**: Build a controlled evidence lock for kernel performance before any further hot-path optimization claims. The gate must be patchable from the current source/docs/spec snapshot and must record what the cloud LLM cannot verify locally.

## Current Role

This spec creates a repo-local evidence lock. It does not change runtime semantics and does not claim a performance improvement. It formalizes the minimum local evidence required before maintainers or agents can say the kernel hot path is locked for a specific repo state.

The lock spans the current critical chain:

```text
StateTransaction dirtyPlan
  -> field-kernel converge / validate / source
  -> SelectorGraph dirty/read overlap
  -> RuntimeStore topic notify
  -> React ExternalStore / useSelector
  -> examples / playground witness pressure
```

## Authority Inputs

- `docs/next/field-kernel-dirty-work-tax-ledger.md`
- `docs/next/field-kernel-dirty-work-evidence-protocol.md`
- `docs/next/runtime-store-selector-notify-evidence-protocol.md`
- `docs/next/kernel-stability-report-template.md`
- `specs/213-runtime-store-notify-preflight-and-tax-ledger/**`
- `specs/214-selector-dirty-read-overlap-fanout-sentinels/**`
- `specs/219-runtime-store-no-tearing-focused-evidence-gate/**`
- `specs/220-selector-notify-tax-migration-report-gate/**`
- `specs/221-field-kernel-dirty-work-tax-wave/**`
- `specs/222-field-kernel-dirty-work-preflight-ledger/**`
- `specs/225-source-externalstore-ingest-dirty-gate/**`
- `specs/228-fieldkernel-focused-before-after-evidence-gate/**`
- `packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts`
- `packages/logix-perf-evidence/scripts/ci.field-kernel-dirty-work-tax-report.ts`

If any authority conflicts with this spec, update the authority first or record the conflict in handoff. Do not keep two evidence rules alive.

## Non-Goals

- Do not modify runtime behavior.
- Do not add public API, root exports, submodules, or authoring nouns.
- Do not introduce a new global release gate or public `KernelStabilityReport` surface.
- Do not claim performance improvement from this patch.
- Do not edit packed XML/Repomix snapshots.
- Do not weaken existing selector/source/diagnostics/no-tearing tests.

## User Scenarios & Testing

### User Story 1 - Local agent can classify kernel evidence (Priority: P1)

As a local implementation agent, I need one deterministic report that tells me whether dirtyPlan/source/selector/store/React evidence is hard-lock eligible, provisional, blocked, or incomplete.

**Independent Test**: `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts` classifies a clean default-profile manifest as `locked` and quick evidence as `provisional`.

**Acceptance Scenarios**:

1. Given a manifest with `profile=default`, `comparable=true`, zero regressions, no missing suites, and all watched counters equal to zero, when the script runs, then it returns `classification=locked` and `claimStrength=hard`.
2. Given the same counters under `profile=quick`, when the script runs, then it returns `classification=provisional` and forbids hard performance claims.

### User Story 2 - Fallback evidence cannot silently pass (Priority: P1)

As a maintainer, I need any dirtyAll/unknownWrite/source full fallback/selector evaluate-all/runSync fallback to block the lock.

**Independent Test**: the classifier blocks manifests with non-zero `dirtyPlan.unknownWrite` or `selector.evaluateAll`.

**Acceptance Scenarios**:

1. Given `dirtyPlan.unknownWrite > 0`, when the script runs, then classification is `blocked`.
2. Given `selector.evaluateAll > 0`, when the script runs, then classification is `blocked`.
3. Given a watched counter is absent, when the script runs, then classification is `incomplete`, not `locked`.

### User Story 3 - Handoff is honest about cloud limits (Priority: P2)

As a reviewer, I need the patch bundle to say what was not run in the cloud and which local commands must produce admissible evidence.

**Independent Test**: the markdown renderer includes forbidden claims and cloud validation limitations.

## Functional Requirements

- **FR-001**: The repo must contain a deterministic TypeScript evidence-lock classifier under `packages/logix-perf-evidence/scripts`.
- **FR-002**: The classifier must require `comparable=true` for hard lock.
- **FR-003**: The classifier must require `regressions=0`, `budgetExceeded=0`, `timeouts=0`, `stabilityWarnings=0`, and `missingSuites=0`.
- **FR-004**: The classifier must require all required hot-path suites to be present and passing.
- **FR-005**: The classifier must require all watched fallback counters to be present and equal to zero.
- **FR-006**: Quick/smoke evidence must be `provisional` at best.
- **FR-007**: Missing evidence must produce `incomplete`, not `PASS`.
- **FR-008**: Non-zero fallback counters must produce `blocked`.
- **FR-009**: Generated Markdown must include allowed claims, forbidden claims, blockers, missing evidence, watched counters, required suites, and cloud limitations.
- **FR-010**: Speckit/handoff artifacts must state local commands and forbid broad performance success claims without local default/soak evidence.

## Non-Functional Requirements

- **NFR-001**: The classifier must only read existing evidence; it must not run benchmarks.
- **NFR-002**: The classifier must be JSON-safe and deterministic for the same input manifest.
- **NFR-003**: The patch must not modify public package surfaces.
- **NFR-004**: The patch must be locally applicable with `git apply` from repo root.

## Success Criteria

- **SC-001**: `pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts` passes locally.
- **SC-002**: `git apply --check patches/0001-kernel-performance-evidence-lock.patch` passes from repo root.
- **SC-003**: Local default or soak manifest can be classified as `locked` only when all hard gates and counters pass.
- **SC-004**: Local quick/smoke manifest cannot produce a hard performance claim.
