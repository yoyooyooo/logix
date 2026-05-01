# Implementation Plan: Runtime Lifecycle Authoring Surface

**Branch**: `170-runtime-lifecycle-authoring-surface` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/170-runtime-lifecycle-authoring-surface/spec.md`

## Summary

Cut over public Logic authoring so lifecycle no longer exists as an authoring noun. The implementation exposes exactly one root builder readiness method, `$.readyAfter(effect, { id?: string })`, keeps lifecycle truth inside the runtime instance substrate, routes long-lived work through the returned run effect, routes dynamic cleanup through Effect Scope, routes unhandled failure observation through Runtime / Provider / diagnostics, and keeps suspend, resume, reset, and hot update ownership with Platform / host carriers.

The plan is forward-only. No compatibility alias, deprecation period, replacement namespace, public lifecycle facade, or second public phase object may be introduced.

## Stage Role

- This file records execution constraints only.
- This file does not replace the owner law in [spec.md](./spec.md).
- This file names likely landing files, witnesses, verification gates, and result writeback targets.
- [discussion.md](./discussion.md) contains only deferred reopen memory and no implementation blocker.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, ESM, Effect V4 baseline from workspace overrides.
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, Effect, React RuntimeProvider, Vitest, `@effect/vitest` where Effect-heavy tests need it.
**Storage**: N/A. Runtime status, readiness registrations, diagnostics, and scope finalizers are in-memory runtime instance state.
**Testing**: Vitest, type-level surface witnesses, focused runtime lifecycle tests, React Provider observation tests, text sweeps, and perf evidence commands when the branch is performance-comparable.
**Target Platform**: Node.js 20+ and modern browsers through React host integration.
**Project Type**: pnpm workspace with runtime packages under `packages/logix-core` and React host integration under `packages/logix-react`.
**Performance Goals**: No unacceptable regression in module runtime instance creation, readiness gate execution, returned run effect scheduling, runtime close / scope finalization, or diagnostics-off paths. Current 2026-05-01 dirty mixed-feature worktree is not performance-comparable, so this implementation closure records deferred evidence and makes no performance pass or regression claim.
**Constraints**: Forward-only, zero compatibility layer, no public `$.lifecycle.*`, no public `$.startup.*`, no public `$.ready.*`, no public `$.resources.*`, no public `$.signals.*`, no public readiness timeout / optionality / fatal policy, no transaction-window IO, no direct business writes to `SubscriptionRef`, slim serializable diagnostics.
**Scale/Scope**: Public authoring surface, internal bound API wiring, runtime readiness execution, run effect ordering, dynamic cleanup witnesses, React Provider observation boundary, Platform / host signal documentation, docs / specs / examples / skills sweep.

## Constitution Check

_Gate: passed before Phase 0 research. Re-check after Phase 1 design: passed._

- **NS/KF traceability**: `spec.md` records NS-3, NS-4, NS-8, NS-10 and KF-3, KF-4, KF-8, KF-9 across stories, FR/NFR, and SC points. This plan mirrors those IDs.
- **Fact-source order**: The terminal decision is already recorded in `spec.md`, runtime SSoT pages, guardrails, skills, and supersession notes for `011` and `136`. Implementation must keep those pages as authority and update them only when real implementation evidence refines the contract.
- **Intent -> Flow/Logix -> Code -> Runtime**: Intent is "ordinary authoring should express readiness without lifecycle noun"; Logix surface is `$.readyAfter`; code lands in bound authoring API and runtime readiness execution; runtime owns instance status and evidence.
- **Dependent specs**: This spec supersedes public lifecycle authoring language in `011-upgrade-lifecycle` and `136-declare-run-phase-contract`; it preserves `158-runtime-hmr-lifecycle` as host dev lifecycle authority.
- **Effect/Logix contracts changed**: Yes. Active authority pages are `runtime/01`, `runtime/03`, `runtime/05`, `runtime/09`, `runtime/10`, `runtime/README`, and `logix-api-next-guardrails`.
- **IR and anchors**: No new public Static IR family is added. Dynamic trace and diagnostic events must keep stable module / instance / readiness coordinates.
- **Deterministic identity**: Readiness ids use explicit `id` when provided and otherwise a deterministic declaration-order coordinate scoped by module and instance. No random or time default may identify readiness requirements.
- **Transaction boundary**: Readiness effects run during runtime startup outside state transaction windows. They must not create an implicit transaction or allow async work inside a transaction closure.
- **React consistency**: React remains a host observer. `RuntimeProvider.onError` consumes runtime diagnostics and does not register per-logic recovery hooks.
- **External sources**: N/A for external source ingestion. Dynamic resource cleanup uses Effect Scope / finalizers.
- **Internal contracts and trial runs**: Runtime readiness registration should remain an explicit internal runtime contract, visible to diagnostics and startup trial evidence without process-global state.
- **Dual kernels**: Current implementation targets `packages/logix-core`. No direct consumer dependency on a second kernel is allowed.
- **Performance budget**: Required once a comparable branch exists because runtime instance acquisition, readiness gates, run scheduling, and close paths are touched. Current closure defers collection by explicit user decision.
- **Diagnosability**: Required readiness failure diagnostics must be slim, serializable, stable under snapshot comparison, and actionable without pointing authors to public lifecycle handlers.
- **User-facing performance mental model**: Public docs should use the compact vocabulary "readiness, run effect, Scope, Runtime observer, host carrier".
- **Breaking changes**: Removes public lifecycle authoring. Migration notes live in this plan, `quickstart.md`, SSoT pages, `011`, `136`, skills, and final implementation report.
- **Single-track implementation**: Required. Execution may be phased, but semantic coexistence of old and new public authoring routes is disallowed.
- **Public submodules**: No new public package submodule is planned. Internal implementation stays under `src/internal/**`; public exports must not expose internals.
- **Large modules/files**: `BoundApiRuntime.ts` is over 1000 LOC and `ModuleRuntime.impl.ts` is over 2000 LOC. Any semantic edit in those files must be preceded by an isolated no-behavior split or a documented proof that the edit is a deletion-only public surface removal with no new branch behavior.
- **Quality gates**: Focused tests for core lifecycle / logic authoring / React Provider, feasible package typechecks, text sweeps, and performance deferral notes. Workspace lint, full test gates, and performance diff can be reopened on a stable branch.

## Entry Gates

### Gate A: Planning Admission

Passed. `spec.md` answers owner, boundary, closure, must-cut list, supersession, and reopen bar.

### Gate B: Implementation Admission

Passed after this plan and [tasks.md](./tasks.md) exist. Implementation starts only after confirming [discussion.md](./discussion.md) still has no Must Close blocker.

## Perf Evidence Plan

- Status: deferred for current implementation closure by user decision on 2026-05-01.
- Reason: the current branch mixes multiple active feature lines and is not performance-comparable.
- Rule: do not claim performance success or regression for spec 170 until a comparable before / after pair exists.
- Baseline semantics: code before / after.
- envId: record local OS, CPU, Node version, and browser version when React host evidence is collected.
- profile: `default` for delivery; `quick` only for exploration; `soak` if default evidence is unstable.
- collect before: `pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/before.<sha>.<envId>.default.json`
- collect after: `pnpm perf collect -- --profile default --out specs/170-runtime-lifecycle-authoring-surface/perf/after.<sha-or-worktree>.<envId>.default.json`
- diff: `pnpm perf diff -- --before specs/170-runtime-lifecycle-authoring-surface/perf/before.<sha>.<envId>.default.json --after specs/170-runtime-lifecycle-authoring-surface/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/170-runtime-lifecycle-authoring-surface/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json`
- Required focus areas:
  - runtime instance creation without readiness requirements
  - runtime instance creation with one and multiple readiness requirements
  - readiness failure diagnostic emission
  - returned run effect scheduling after readiness
  - runtime close and Scope finalizer execution
  - diagnostics disabled path
  - diagnostics enabled path for readiness failure
- Failure policy: if evidence is deferred, has `stabilityWarning`, timeout, missing suite, or `comparable=false`, do not claim performance success. Re-run with a narrower file set or stronger profile after the branch stabilizes.

## Project Structure

### Documentation

```text
specs/170-runtime-lifecycle-authoring-surface/
├── spec.md
├── discussion.md
├── readiness-api-naming-proposal.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/
│   └── README.md
├── checklists/
│   └── requirements.md
└── perf/
    └── *.json
```

### Source Code

```text
packages/logix-core/src/internal/runtime/core/
├── BoundApiRuntime.ts
├── BoundApiRuntime.readiness.ts        # if split before semantic edit
├── ModuleRuntime.logics.ts
├── ModuleRuntime.impl.ts               # avoid if possible; split first if semantic edit is required
├── Lifecycle.ts                        # internal substrate only
├── LifecycleDiagnostics.ts
├── LogicDiagnostics.ts
├── RuntimeInternals.ts
└── module.ts

packages/logix-core/src/internal/authoring/
└── logicDeclarationCapture.ts

packages/logix-core/test/
├── Logic/
├── Runtime/Lifecycle/
├── Runtime/ModuleRuntime/
├── Contracts/
└── internal/Runtime/Lifecycle/

packages/logix-react/src/internal/provider/
└── RuntimeProvider.tsx

packages/logix-react/test/RuntimeProvider/
└── *.test.tsx
```

**Structure Decision**: Public authoring type and runtime bound API changes live in `module.ts`, `BoundApiRuntime.ts`, and possible `BoundApiRuntime.readiness.ts`. Runtime startup ordering stays in `ModuleRuntime.logics.ts`. Lifecycle substrate files may keep internal lifecycle vocabulary, but public examples, exported types, diagnostics hints, and authoring tests must route to the terminal owner matrix.

### Decomposition Brief

`packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts` is currently over 1000 LOC. It contains bound authoring API construction and the current public lifecycle facade. Before adding new behavior in this file, extract a no-behavior helper slice:

- `BoundApiRuntime.readiness.ts`: readiness registration helper and public label / diagnostic wording for `$.readyAfter`.
- Keep `BoundApiRuntime.ts` as the coordinator that assembles the bound API.
- Do not introduce scheduling, diagnostics, or policy behavior during the split.
- Verify with existing bound API and logic authoring tests before semantic cutover.

`packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts` is currently over 2000 LOC. Prefer avoiding semantic edits there. If removal of public lifecycle wiring requires touching it, first extract the relevant runtime-internals lifecycle adapter into a mutually exclusive internal helper with no behavior change, then apply the semantic deletion.

## Required Witness Set

- Type-surface witness that `$.readyAfter(effect, { id?: string })` is available at the Logic builder root.
- Type-surface or contract witness that public `$.lifecycle.*`, `$.startup.*`, `$.ready.*`, `$.resources.*`, and `$.signals.*` are absent or rejected.
- Runtime readiness witness for declaration order, instance readiness blocking, and acquisition failure.
- Diagnostic witness for readiness failure with stable module id, instance id, readiness id or declaration coordinate, phase, and serializable failure summary.
- Run effect witness proving returned run effect starts after readiness and does not block ready status.
- Scope cleanup witness proving `Effect.acquireRelease` or equivalent finalizer releases dynamic resources on close.
- Provider observation witness proving `RuntimeProvider.onError` observes runtime diagnostics only and does not become a per-logic handler.
- Host signal witness proving suspend / resume / reset / hot update route through Platform / host carrier / dev lifecycle internals.
- Text sweep witness classifying all old lifecycle family hits as `removed-public`, `internal-only`, `negative-only`, or `archived`.
- Performance witness under `specs/170-runtime-lifecycle-authoring-surface/perf/`: current closure records explicit deferral; future stable branch should add comparable before / after artifacts.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/05-logic-composition-and-override.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/README.md`
  - `docs/standards/logix-api-next-guardrails.md`
- Supersession pages:
  - `specs/011-upgrade-lifecycle/spec.md`
  - `specs/136-declare-run-phase-contract/spec.md`
  - `specs/158-runtime-hmr-lifecycle/spec.md` only if implementation changes host dev lifecycle ownership wording
- Agent and user material:
  - `skills/logix-best-practices/references/agent-first-api-generation.md`
  - package README files and examples that mention lifecycle authoring
  - relevant test-dts and public authoring examples
- Spec state sync:
  - keep `spec.md` Planned until implementation starts
  - update to Active when the first implementation task starts
  - update to Implemented after behavior, text sweep classification, and writebacks pass; do not mark performance Done until comparable evidence exists
- Discussion cleanup:
  - keep `discussion.md` while deferred reopen candidates remain useful
  - remove or archive deferred items after implementation proves they have no follow-up value
- Witness surfaces:
  - focused tests
  - type-surface tests
  - perf evidence JSON when comparable, or perf deferral note for the dirty mixed-feature worktree
  - text sweep output summarized in final implementation report

## Non-Goals

- No public `$.lifecycle.*`.
- No public `$.startup.*`, `$.ready.*`, `$.resources.*`, or `$.signals.*`.
- No public alias for old lifecycle methods.
- No public readiness timeout, retry, optionality, fatal policy, ordering option, or progress UI in this wave.
- No public `{ setup, run }`, `lifecycle`, `processes`, or `workflows` phase object.
- No per-logic global error observer replacement.
- No Platform signal DSL for ordinary Logic authoring.
- No HMR or state survival redesign beyond preserving `158` as host dev lifecycle authority.
- No compatibility layer or deprecation period.

## Complexity Tracking

No constitution violation is accepted in this plan. Large-file edits are gated by the decomposition brief above.
