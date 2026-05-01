# Implementation Plan: Kernel Selector Route Contract

**Branch**: `169-kernel-selector-route` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/169-kernel-selector-route/spec.md`

## Summary

Implement the T2 selector route contract as a forward-only runtime cutover. The plan introduces one core-owned selector precision and route contract, makes React host consume that contract, replaces selector-id-only topic identity with fingerprint identity, gates dirty/read precision loss under dev/test policy, removes public no-arg React host reads, and proves the result through core, React, type-surface, business witness, verification-control-plane, and performance evidence.

This plan treats Playground as a product witness only. The kernel route and precision law must close independently of Playground component splitting.

## Stage Role

- This file records execution constraints only.
- This file MUST NOT invent a second owner truth beside `spec.md`.
- This file names where stable results will be written back after implementation.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, `@logixjs/form`, React 19, Effect V4 baseline from workspace overrides.  
**Storage**: N/A, runtime state and in-memory selector metadata only.  
**Testing**: Vitest, React Testing Library where needed, TypeScript typecheck, package contract tests, text sweeps, perf evidence commands.  
**Target Platform**: Node.js 20+ and modern browsers through React host integration.  
**Project Type**: pnpm workspace with runtime packages under `packages/logix-core` and `packages/logix-react`.  
**Performance Goals**: No unacceptable regression for exact selector steady-state with diagnostics disabled. Measure selector graph evaluate, read-topic publish, dirty/read overlap, fingerprint calculation, strict-policy diagnostics overhead, and dynamic/broad rejection path.  
**Constraints**: Forward-only cutover, no compatibility overload, no second hook family, no public `ReadQuery`, no new selector namespace, no React-owned route decision, no public debug/resilience marker.  
**Scale/Scope**: Kernel selector route, React host subscription route, dirty/read overlap, public type surface, docs/skills/readme sweep, and three non-Playground witness fixtures.

## Constitution Check

_Gate: passed before Phase 0 research. Re-check after Phase 1 design: passed._

- **NS/KF traceability**: Spec records NS-3, NS-4, NS-8, NS-10 and KF-3, KF-4, KF-8, KF-9 in user stories and coded points. Plan mirrors those IDs.
- **Fact-source order**: SSoT cutover has already started in runtime SSoT, README, skills, and proposal ledger. Implementation must continue docs-first and write back any refined contract.
- **Intent -> Flow/Logix -> Code -> Runtime**: Intent is "exact selector input by default"; Logix contract is core-owned selector precision and route; code lands in core and React host; runtime behavior rejects imprecise host projection.
- **Dependent specs**: This spec depends on `161-verification-pressure-kernel` for control-plane report discipline and prior selector internalization proposal for public `ReadQuery` removal.
- **Effect/Logix contracts changed**: Yes. Active authority pages are `runtime/01`, `runtime/02`, `runtime/03`, `runtime/09`, `runtime/10`, `runtime/13`, capability `03`, and guardrails.
- **IR and anchors**: Minimal runtime trace and selector-quality artifacts are affected. No platform-grade authoring IR is added.
- **Deterministic identity**: Selector fingerprint and path-authority digest or epoch must be stable. `selectorId` becomes label only.
- **Transaction boundary**: No IO is introduced in transaction windows. Dirty precision metadata must remain synchronous and low cost.
- **React consistency**: React continues through `useSyncExternalStore` with one route decision from core. No dual truth and no data-glue `useEffect` syncing.
- **External sources**: N/A for external source ingestion. Subscription route still must remain pull-based snapshot consumption.
- **Internal contracts and trial runs**: Adds internal route/precision contract and selector-quality diagnostics. Verification control plane consumes artifacts by stage and does not create second truth.
- **Dual kernels**: Implementation must remain in current core runtime authority. No direct consumer dependency on a second kernel.
- **Performance budget**: Required. This touches selector route, topic identity, dirty/read overlap, and React host route.
- **Diagnosability**: Required diagnostics must be slim, serializable, and tied to stable module/instance/transaction coordinates.
- **User-facing performance mental model**: Public docs should use the compact vocabulary "selector input, broad read, dynamic fallback, dirty fallback, core route".
- **Breaking changes**: Removes public no-arg host read. Migration note belongs in plan/PR and public docs. No compatibility layer.
- **Single-track implementation**: Required. Execution may be decomposed into tasks, but no semantic coexistence of old and new public route is allowed.
- **Public submodules**: No new public submodule is planned. Internal code stays under `src/internal/**`; public exports must not expose internals.
- **Large modules/files**: `StateTransaction.ts` is over 1000 LOC. Dirty precision changes must include a decomposition brief before semantic edits in that file.
- **Quality gates**: Target gates are package typechecks, focused core/react tests, public type-surface tests, text sweeps, and perf evidence diff.

## Entry Gates

### Gate A: Planning Admission

Passed. `spec.md` answers owner, boundary, closure, must-cut list, and reopen bar.

### Gate B: Implementation Admission

Passed after this plan because it defines likely landing files, witness set, verification matrix, writeback targets, and non-goals. `discussion.md` contains no must-close blocker.

## Perf Evidence Plan

- Baseline semantics: code before/after.
- envId: record local OS, CPU, Node version, and browser version if React/browser harness is used.
- profile: `default` for delivery; `quick` may be used only for exploration; `soak` if default evidence is unstable.
- collect before: `pnpm perf collect -- --profile default --out specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json`
- collect after: `pnpm perf collect -- --profile default --out specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json`
- diff: `pnpm perf diff -- --before specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json --after specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json`
- Required focus areas:
  - selector count scale
  - dirty path count scale
  - nested path depth
  - selector fingerprint calculation
  - runtime external-store read-topic publish
  - selector graph dirty/read overlap
  - dynamic/broad rejection path
  - diagnostics disabled
  - dev/test diagnostics enabled
- Failure policy: if evidence has `stabilityWarning`, timeout, missing suite, or `comparable=false`, do not claim performance success. Re-run with a narrower file set or stronger profile.

## Project Structure

### Documentation

```text
specs/169-kernel-selector-route/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── discussion.md
├── contracts/
│   └── selector-route-contract.md
├── checklists/
│   └── requirements.md
└── perf/
    └── *.json
```

### Source Code

```text
packages/logix-core/src/internal/runtime/core/
├── ReadQuery.ts
├── ReadQueryBuildGate.ts
├── SelectorGraph.ts
├── RuntimeStore.ts
├── StateTransaction.ts
└── selectorRoute.*.ts          # if extracted as mutually exclusive internal modules

packages/logix-react/src/internal/hooks/
└── useSelector.ts

packages/logix-react/src/internal/store/
└── RuntimeExternalStore.ts

packages/logix-core/test/
├── Runtime/
└── Contracts/

packages/logix-react/test/
├── Hooks/
└── Contracts/

packages/logix-react/test-dts/
└── canonical-hooks.surface.ts
```

**Structure Decision**: Core precision and route ownership stays in `packages/logix-core/src/internal/runtime/core/**`. React only consumes the returned route in `packages/logix-react/**`. Public examples and docs are updated after behavior lands.

### Decomposition Brief

`packages/logix-core/src/internal/runtime/core/StateTransaction.ts` is currently over 1000 LOC. Any semantic dirty precision change in that file must be preceded by an isolated, no-behavior-change split into mutually exclusive internal modules.

Proposed split candidates:

- `StateTransaction.dirty.ts`: dirty path quality, dirty-all reason, inferred dirty source marking.
- `StateTransaction.patch.ts`: patch extraction and normalization helpers.
- `StateTransaction.snapshot.ts`: transaction snapshot and dirty summary assembly.
- `StateTransaction.core.ts`: public transaction orchestration retained by the original file or a small coordinator.

Rules:

- The split must preserve current behavior and tests before semantic changes.
- Import topology must be one-way from coordinator to helpers.
- No new caching, scheduling, diagnostics, or policy behavior may be introduced during the split.
- Dirty precision semantic changes start only after the split passes focused tests.

## Required Witness Set

- Public no-arg host read deletion witness in React type surface.
- Public docs/README/skills/examples text sweep witness for selector input defaults.
- Core precision classification witness for exact, broad-root, broad-state, dynamic, debug, and unknown.
- Core route decision witness for exact, reject, and internal resilience.
- Selector fingerprint collision witness.
- Dirty/read overlap and evaluate-all fallback witness.
- React host route consumption witness proving no local broad/dynamic eligibility decision.
- Verification control-plane witness for static, startup, and explicit host evidence boundaries.
- Non-Playground business witnesses:
  - form row editing with field value, error, and companion reads
  - master-detail imported child read
  - dashboard independent cards
- Playground render isolation witness remains product-level regression coverage, not kernel authority.
- Performance matrix witness under `specs/169-kernel-selector-route/perf/`.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/02-hot-path-direction.md`
  - `docs/ssot/runtime/03-canonical-authoring.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`
  - `docs/ssot/capability/03-frozen-api-shape.md`
  - `docs/standards/logix-api-next-guardrails.md`
- User and Agent material:
  - `packages/logix-react/README.md`
  - `skills/logix-best-practices/references/agent-first-api-generation.md`
  - `skills/logix-best-practices/references/logix-react-notes.md`
  - `skills/logix-best-practices/references/llms/05-react-usage-basics.md`
  - `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`
  - relevant examples that mention React host reads
- Review/proposal cross-links:
  - T2 proposal remains history.
  - Playground fanout proposal remains superseded on kernel law.
- Spec state sync:
  - keep `spec.md` Planned until implementation begins
  - update to Active when first implementation task starts
  - update to Done only after all SC points and writebacks pass
- Discussion cleanup:
  - `discussion.md` contains deferred reopen candidates only
  - must-close section must stay empty
  - keep discussion as non-blocking design memory until implementation closes or a candidate is reopened
- Witness surfaces:
  - focused tests and test-dts
  - perf evidence JSON
  - text sweep output summarized in final implementation report

## Non-Goals

- No public `ReadQuery`.
- No public `select.*` namespace.
- No second React hook family.
- No public object/struct projection descriptor.
- No compatibility overload or deprecation period for public no-arg host read.
- No React-owned selector route policy.
- No Playground-specific core API.
- No host render isolation claim from `runtime.check` or startup trial.
- No broad "advanced/internal" public escape hatch.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Touches hot-path selector and dirty routing | The feature exists to close broad subscription and dirty/read precision at the kernel level | UI-only component split leaves runtime subscription route broad |
| Requires perf matrix | Fingerprint identity, route decisions, and strict diagnostics affect hot-path behavior | Tests alone cannot prove absence of unacceptable steady-state regression |
| Requires a decomposition step for `StateTransaction.ts` | File exceeds 1000 LOC and dirty precision changes would otherwise increase coupling | Direct semantic edits in the large file would violate module-size governance |

## Phase 0 Research Output

See [research.md](./research.md).

## Phase 1 Design Output

- [data-model.md](./data-model.md)
- [contracts/selector-route-contract.md](./contracts/selector-route-contract.md)
- [quickstart.md](./quickstart.md)
- [discussion.md](./discussion.md)
