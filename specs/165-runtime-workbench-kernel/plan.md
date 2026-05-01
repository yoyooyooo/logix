# Runtime Workbench Kernel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development if subagents are explicitly requested, or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private projection-only Runtime Workbench Kernel that turns authoritative runtime inputs into a session-rooted interpretation index shared by Playground, DVTools and CLI.

**Architecture:** The kernel lives under `packages/logix-core/src/internal/workbench/**` and exports through one repo-internal subpath for monorepo consumers only. It consumes `truthInputs`, `contextRefs` and `selectionHints`, derives an internal `RuntimeWorkbenchProjectionIndex`, and never owns report, evidence, source, UI selection or repair scheduling truth. Playground, DVTools and CLI each keep thin adapters and host state while removing private session/finding/artifact derivation truth. Playground product capability and display law is owned by [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md); Driver/Scenario product capability is owned by [../166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md). This plan only supplies the shared projection substrate they need after outputs and evidence exist.

**Tech Stack:** TypeScript 5.x, ESM, Effect V4 baseline where existing runtime code requires it, Vitest, `@logixjs/core/ControlPlane`, existing canonical evidence/debug APIs.

---

## Summary

`165` implements the plan-optimality-loop adopted candidate: `AuthorityBundle -> ProjectionOnly Kernel`.

This plan intentionally starts with core internal contracts before touching Playground, DVTools or CLI. The first closure target is a pure projection law with tests. Host adoption follows only after the law proves authority preservation, shape separation, coordinate gap completeness and host-state exclusion.

The implementation must not create:

- public `Runtime.workbench` or `runtime.workbench`
- public `Runtime.devtools`, `Runtime.inspect`, `Runtime.playground`
- public `@logixjs/core` workbench API
- public `@logixjs/sandbox` workbench or playground API
- CLI machine report protocol owned by the kernel
- DVTools protocol consumed by CLI
- private Playground/DVTools/CLI session/finding/artifact truth

## Stage Role

- This file records implementation sequencing only.
- [spec.md](./spec.md) remains the authority contract.
- [docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md) delegates cross-host projection semantics to this spec.
- [docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) owns Playground product capabilities, authority layering and final display layout.
- [specs/166-playground-driver-scenario-surface/spec.md](../166-playground-driver-scenario-surface/spec.md) owns no-UI driver and scenario playback product semantics.
- This plan does not redefine `VerificationControlPlaneReport`, canonical evidence envelope, artifact output keys or `focusRef`.
- Any implementation discovery that changes core control-plane report semantics must go back to `docs/ssot/runtime/09-verification-control-plane.md` before code closure.

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `@logixjs/core/ControlPlane`, `@logixjs/core/repo-internal/debug-api`, `@logixjs/core/repo-internal/evidence-api`, existing DVTools workbench state, CLI evidence selection input, Playground snapshot/summary state.  
**Storage**: No storage. Projection index is derived per input bundle and can be discarded.  
**Testing**: Vitest unit and contract tests in core, DVTools, CLI and Playground packages.  
**Target Platform**: Node.js 20+ for tests; browser tests only where host integration already uses browser harnesses.  
**Project Type**: pnpm workspace packages.  
**Performance Goals**: Projection is side-effect free, bounded, deterministic and cheap. It does not start runtime, run trial, export evidence, parse raw traces as default, or allocate unbounded payloads.  
**Constraints**: Core internal owner; repo-internal consumption only; publish config blocks repo-internal subpath. `selectionHints` and `contextRefs` cannot affect projection truth.  
**Scale/Scope**: First closure covers projection law plus one proof each for Playground, DVTools and CLI consumption. It does not own Playground shell layout, Driver declaration, payload schema, raw action dispatch, scenario playback execution, evidence export protocol, CLI command schema or Playground project declaration. Playground shell layout follows `docs/ssot/runtime/17-playground-product-workbench.md`; Driver/Scenario semantics follow `specs/166-playground-driver-scenario-surface/spec.md`; DVTools UI layout remains out of scope.

## Constitution Check

Pre-design result: pass, under 165 constraints.

- Authority starts from `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/14-dvtools-internal-workbench.md`, `specs/164-logix-playground/spec.md`, and this spec.
- The kernel is internal and private. It cannot become public authoring surface.
- The kernel is projection-only. It cannot start runtime, run trial, perform compare, write evidence or schedule repair.
- The implementation uses final runtime semantics in code names. `Probe`, `Witness`, `Pressure`, task ids and migration names do not enter production code.
- Runtime hot-path impact should be zero unless a host explicitly calls the projection function.
- Any debug/evidence event without stable coordinate produces a gap or drilldown locator, not a diagnostic finding.
- `Runtime.run` result projection and `VerificationControlPlaneReport` remain shape-separated.
- Compatibility aliases are forbidden.

Post-design result: pass if the proof matrix below is implemented without public surface expansion.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) defines owner, input partition, authority lattice, coordinate ownership, proof matrix, must-cut and reopen bar.

### Gate B: Implementation Admission

Passed when the following files are present:

- [plan.md](./plan.md)
- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
- [checklists/requirements.md](./checklists/requirements.md)

Implementation may start only if the executor accepts:

- owner is `packages/logix-core/src/internal/workbench/**`
- repo-internal bridge is private and blocked in publish config
- host adapters remain thin
- `selectionHints` are hint-only
- finding is authority-backed projection only
- CLI transport remains CLI-owned

## File Structure

### Documentation

```text
specs/165-runtime-workbench-kernel/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── README.md
└── checklists/
    └── requirements.md
```

### Core Internal Kernel

```text
packages/logix-core/src/internal/workbench/
├── authority.ts
├── projection.ts
├── findings.ts
├── coordinates.ts
├── gaps.ts
├── indexes.ts
└── index.ts

packages/logix-core/src/internal/workbench-api.ts
packages/logix-core/test/internal/Workbench/
├── Workbench.authorityBundle.contract.test.ts
├── Workbench.projectionIndex.contract.test.ts
├── Workbench.findingAuthority.contract.test.ts
├── Workbench.coordinateGaps.contract.test.ts
├── Workbench.shapeSeparation.contract.test.ts
└── Workbench.publicSurface.guard.test.ts
```

Responsibilities:

- `authority.ts`: `RuntimeWorkbenchAuthorityBundle`, truth/context/hint input types and validators.
- `projection.ts`: top-level `deriveRuntimeWorkbenchProjectionIndex`.
- `findings.ts`: authority-backed finding projection, read-only repair mirror and fixed gap/degradation severity table.
- `coordinates.ts`: owner coordinate normalization and source digest/span handling.
- `gaps.ts`: evidence gap code set and gap constructors.
- `indexes.ts`: session-rooted index helpers and optional lookup indexes.
- `index.ts`: internal module boundary.
- `workbench-api.ts`: repo-internal bridge for monorepo consumers. It is exported only under a repo-internal subpath during workspace development and blocked in `publishConfig`.

### Package Manifest

```text
packages/logix-core/package.json
```

Responsibilities:

- Add workspace-only `./repo-internal/workbench-api` export.
- Add `publishConfig.exports["./repo-internal/workbench-api"] = null`.
- Keep `./internal/*` blocked.

### DVTools Adapter

```text
packages/logix-devtools-react/src/internal/state/workbench/
├── model.ts
├── normalize.ts
├── derive.ts
└── index.ts

packages/logix-devtools-react/test/internal/
├── workbench-derivation.contract.test.ts
├── workbench-gaps.contract.test.ts
├── workbench-export.contract.test.ts
└── workbench-state.contract.test.tsx
```

Responsibilities:

- Replace private model authority with adapter aliases or mapped types from core internal projection.
- Keep live snapshot and imported evidence normalization as host adapter code.
- Ensure old `WorkbenchModel` does not remain a second truth. If UI still needs a view model, it must be clearly named host view state and derived from projection.

### Playground Adapter

```text
packages/logix-playground/src/internal/summary/
└── derivedSummary.ts

packages/logix-playground/src/internal/session/
├── errors.ts
└── logs.ts

packages/logix-playground/test/
├── derived-summary.contract.test.ts
├── shape-separation.contract.test.ts
└── workbench-layout.contract.test.tsx
```

Responsibilities:

- Convert snapshot, preview session, Program Run, Check and Trial state into workbench authority bundle inputs.
- Keep UI summary as host view state.
- Prove Run result and report stay shape-separated through the projection law.
- Prove shell display follows `17-playground-product-workbench`: top command bar, file navigator, source editor, result panel and bottom Diagnostics/Trace/Snapshot strip stay Playground-owned host UI.

### CLI Adapter

```text
packages/logix-cli/src/internal/
├── evidenceInput.ts
├── result.ts
└── workbenchProjection.ts

packages/logix-cli/test/Integration/
├── evidence-selection-input.contract.test.ts
├── evidence-selection-roundtrip.contract.test.ts
└── workbench-projection.contract.test.ts
```

Responsibilities:

- Convert evidence package and selection manifest into truth/context/hint inputs.
- Produce CLI transport output by filtering/reordering projection refs.
- Do not define a kernel-owned CLI report schema.

## Proof Matrix

| ID | Proof | Required Evidence | Command |
| --- | --- | --- | --- |
| PM-01 | Authority preservation | every projection node has `authorityRef` or `derivedFrom`; no custom report/finding/action namespace | `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.authorityBundle.contract.test.ts test/internal/Workbench/Workbench.projectionIndex.contract.test.ts` |
| PM-02 | Shape separation | Run result and Check/Trial report coexist without report shape confusion | `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.shapeSeparation.contract.test.ts` |
| PM-03 | Finding authority lattice | findings are only control-plane finding, run-failure facet, evidence-gap or degradation-notice | `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.findingAuthority.contract.test.ts` |
| PM-04 | Coordinate gap completeness | missing focusRef, artifact key, source digest and stable runtime coordinate become gaps | `rtk pnpm -C packages/logix-core exec vitest run test/internal/Workbench/Workbench.coordinateGaps.contract.test.ts` |
| PM-05 | DVTools live/imported parity | same evidence package produces equivalent session/finding/artifact projection in live and imported adapters | `rtk pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-derivation.contract.test.ts test/internal/workbench-gaps.contract.test.ts` |
| PM-06 | CLI transport boundary | CLI projection derives from kernel output but remains CLI/control-plane transport and uses no DVTools protocol | `rtk pnpm -C packages/logix-cli exec vitest run test/Integration/workbench-projection.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts` |
| PM-07 | Playground host-state exclusion and display fit | Playground summary consumes projection; source edits, preview state and selection stay host view state; shell exposes 17-owned top command bar, file navigator, source editor, result panel and bottom diagnostics strip | `rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts test/shape-separation.contract.test.ts test/workbench-layout.contract.test.tsx` |
| PM-08 | Public surface negative sweep | no public workbench/devtools/playground/runtime facade or sandbox workbench export leaks | `rtk rg -n "Runtime\\.workbench|runtime\\.workbench|Runtime\\.devtools|runtime\\.devtools|Runtime\\.inspect|runtime\\.inspect|Runtime\\.playground|runtime\\.playground|PlaygroundRunResult|SnapshotPreviewWitness" packages/logix-core/src packages/logix-core/package.json packages/logix-sandbox/src packages/logix-sandbox/package.json packages/logix-playground/src packages/logix-devtools-react/src packages/logix-cli/src` |

## Perf Evidence Plan

Runtime hot-path perf collection is not required if implementation only adds pure projection functions and host adapters. The kernel must not be called from runtime transaction, dispatch, reducer, subscription or scheduler paths.

Required lightweight evidence:

- unit tests demonstrate projection works from plain data without runtime execution.
- typecheck proves host adapters import only the repo-internal bridge.
- negative sweep proves no public exports.
- package tests prove gap/degradation table remains bounded.

If implementation adds projection calls to live runtime debug subscription paths, collect a focused before/after DevtoolsHub workbench cost baseline:

```bash
rtk pnpm -C packages/logix-devtools-react exec vitest run test/internal/workbench-cost.baseline.test.ts
```

If implementation touches runtime scheduler, transaction, `ProgramRunner`, `Runtime.make`, `Runtime.run`, `Runtime.trial` or proof kernel, stop and update this plan plus relevant SSoT before coding further.

## Acceptance Matrix

This plan closes only when PM-01 through PM-08 pass and all related docs are consistent.

Additional package gates:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-devtools-react typecheck
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-playground typecheck
```

Workspace gates after targeted closure:

```bash
rtk pnpm typecheck
rtk pnpm test:turbo
```

Run `rtk pnpm lint` if touched packages are lint-covered in the current workspace.

## Result Writeback

Required after implementation:

- update [spec.md](./spec.md) status to `Done` only after PM-01 through PM-08 pass.
- update [docs/ssot/runtime/14-dvtools-internal-workbench.md](../../docs/ssot/runtime/14-dvtools-internal-workbench.md) only if DVTools host responsibilities change.
- update [docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md) only if Playground product capability, display shape or host/projection boundary changes.
- update [docs/ssot/runtime/09-verification-control-plane.md](../../docs/ssot/runtime/09-verification-control-plane.md) only if control-plane report, repair hints, focusRef, artifact or compare semantics change.
- write verification notes under `specs/165-runtime-workbench-kernel/notes/verification.md` when implementation completes.
- write perf note under `specs/165-runtime-workbench-kernel/notes/perf-evidence.md` stating whether hot-path perf collection was required.

## Non-Goals

- No public runtime workbench facade.
- No public package workbench product.
- No new report schema.
- No new evidence envelope.
- No new trigger, driver, scenario, preview or source DSL.
- No raw action dispatch surface.
- No Driver payload schema or Scenario Playback runner in the kernel.
- No CLI command schema change unless a separate CLI spec reopens it.
- No DVTools UI layout redesign.
- No kernel-owned Playground layout. Playground display changes follow `docs/ssot/runtime/17-playground-product-workbench.md` and stay in `packages/logix-playground`.
- No Sandpack dependency changes.
- No scenario/replay/compare productization.

## Complexity Tracking

No planned constitution violation.

Potential complexity risks:

- DVTools current `WorkbenchModel` contains root-level `findings`, `artifacts`, `gaps` and `defaultDrilldown`; implementation must avoid preserving that as authority.
- Gap/degradation severity table can drift into a second diagnostic priority system; keep it fixed and bounded.
- Repo-internal bridge can drift into public surface; package manifest guards must block publish exports.
