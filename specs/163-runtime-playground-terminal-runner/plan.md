# Implementation Plan: Runtime Playground Terminal Runner

**Branch**: `163-runtime-playground-terminal-runner` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/163-runtime-playground-terminal-runner/spec.md`

## Summary

`163` turns the reviewed runtime playground terminal proposal into implementation work. The feature cuts the runtime result face to `Runtime.run(Program, main, options)`, keeps `Runtime.check` and `Runtime.trial` as diagnostic control-plane faces, and proves a browser docs runner can execute non-UI Program examples for bounded JSON output without adding `Runtime.playground` or a public sandbox playground contract.

The approach is single-track:

- Cut the core runtime public vocabulary to `Runtime.run / Runtime.trial / Runtime.check`.
- Treat existing `Runtime.runProgram` as implementation source only; public docs-facing usage must move to `Runtime.run`.
- Add a private docs runner adapter that compiles source with `export const Program` plus app-local `export const main`.
- Use existing sandbox transport as browser execution wiring while keeping root exports narrow.
- Prove Run projection and Trial report shape separation with core and browser witnesses.
- Bind the shared proof kernel to an explicit Scope so browser worker Trial does not depend on ambient scoped execution.

## Stage Role

- This file records execution constraints only.
- This file does not redefine `VerificationControlPlaneReport`, Program authoring, sandbox product surface, or CLI transport truth.
- Stable implementation results must be written back to runtime SSoT, user docs and package tests after implementation.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9

## Technical Context

**Language/Version**: TypeScript 5.x, ESM.  
**Primary Dependencies**: `effect@4.0.0-beta.28`, `@logixjs/core`, `@logixjs/sandbox`, apps/docs runtime docs stack.  
**Storage**: No persistent storage. Browser worker returns in-memory run data and bounded JSON projection.  
**Testing**: Vitest, package browser tests for sandbox, package contract tests for core, docs component tests or snapshots where available.  
**Target Platform**: Node.js 20+ for package tests and modern browsers for sandbox worker execution.  
**Project Type**: pnpm workspace with `packages/logix-core`, `packages/logix-sandbox`, `apps/docs`, SSoT docs and specs.  
**Performance Goals**: `Runtime.run` is one-shot boot -> main -> dispose with no extra control-plane report allocation. Docs Run projection is bounded by explicit result/log budgets. Browser worker action must avoid unbounded logs, unbounded result serialization and unbounded lifecycle wait.  
**Constraints**: `Runtime.trial` returns `VerificationControlPlaneReport`; Run projection is app-local; no public `PlaygroundRunResult`; no public worker action family; no compatibility alias for imagined users.  
**Scale/Scope**: V1 covers non-UI Logix Program examples, raw Effect smoke runs without Trial, browser worker proof, package guard tests and docs default Source + Run layout.

## Constitution Check

Pre-design result: pass.

- NS/KF traceability is recorded in [spec.md](./spec.md) and mirrored here.
- The feature maps to `Intent -> Flow/Logix -> Code -> Runtime` by letting docs and agents run the same Program source through result and diagnostic faces.
- Authority starts from `docs/next/logix-api-planning/runtime-playground-terminal-proposal.md`, `docs/review-plan/runs/2026-04-27-runtime-playground-terminal-plan-optimality-loop.md`, `docs/ssot/runtime/01-public-api-spine.md` and `docs/ssot/runtime/09-verification-control-plane.md`.
- The feature changes runtime public vocabulary and docs runner behavior; SSoT and user docs require writeback after implementation.
- It does not change minimal IR, React host law, scenario executor, replay, raw trace compare, or CLI transport.
- Deterministic identity is required for supplied `runId`; generated docs run ids may be local, but tests must use supplied stable ids.
- No transaction-window IO is introduced. `Runtime.run` must retain the existing guard that prevents `openProgram/run` inside synchronous StateTransaction bodies.
- React consistency is out of scope for v1 because UI host trial is excluded.
- Browser execution must not rely on process-global mutable truth for report or runner authority.
- No core-ng dependency is introduced.
- Performance risk is bounded serialization/log collection and worker lifecycle, not scheduler or field-kernel hot-path changes.
- Diagnosability improves through explicit shape separation: Run projection for display, Check/Trial report for machine diagnostics.
- Forward-only execution is required. Do not keep a public `Runtime.runProgram` compatibility alias for imagined users.
- Package exports must preserve core public submodule topology and sandbox root export guard.
- Current touched files are below 1000 LOC at planning time: `Runtime.ts` 627 LOC, `Client.ts` 683 LOC, `sandbox.worker.ts` 644 LOC. If implementation pushes any touched file to 1000 LOC, split support code into internal helpers before adding more behavior.
- Quality gates are targeted core/sandbox/docs tests, package typecheck, SSoT/spec grep guards and full workspace checks when feasible.

Post-design result: pass. Phase 1 artifacts introduce no second report authority and no unresolved clarification.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) defines owner, boundary, closure contract and reopen bar.

### Gate B: Implementation Admission

Passed when this plan plus [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md) and [quickstart.md](./quickstart.md) are present.

Implementation may start only if the executor accepts these fixed constraints:

- `Runtime.run` is the terminal public result face.
- `Runtime.trial` remains diagnostic-only.
- `main` remains app-local docs runner convention.
- Sandbox public root stays `SandboxClientTag / SandboxClientLayer`.
- Browser docs runner projection stays app-local and JSON bounded.

## Perf Evidence Plan

`163` touches runtime entry naming and browser/docs execution envelope. It should not alter runtime scheduler, field-kernel convergence, StateTransaction or subscription hot paths.

Required lightweight evidence:

- Core one-shot run tests must show `Runtime.run` reuses the existing `ProgramRunner` path without adding a control-plane report object.
- Browser tests must prove result/log budgets and serialization behavior for docs Run projection.
- Timeout and close-timeout tests must distinguish Run transport failure from Trial control-plane report failure.
- Browser Trial must prove the shared proof kernel uses explicit Scope binding and still returns the core `VerificationControlPlaneReport`.
- If implementation changes `ProgramRunner`, `Runtime.make`, transaction guard or dispose behavior beyond naming, collect before/after evidence with the package-local runtime runner benchmark or add a focused timing note in this spec directory.

Baseline command if runtime runner semantics are changed:

```bash
rtk pnpm perf collect -- --profile default --out specs/163-runtime-playground-terminal-runner/perf/before.worktree.local.default.json --files packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts
rtk pnpm perf collect -- --profile default --out specs/163-runtime-playground-terminal-runner/perf/after.worktree.local.default.json --files packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts
rtk pnpm perf diff -- --before specs/163-runtime-playground-terminal-runner/perf/before.worktree.local.default.json --after specs/163-runtime-playground-terminal-runner/perf/after.worktree.local.default.json --out specs/163-runtime-playground-terminal-runner/perf/diff.before__after.json
```

If only public naming, docs adapter and worker projection change, perf evidence can be limited to test runtime duration plus budget guard proof.

## Project Structure

### Documentation

```text
specs/163-runtime-playground-terminal-runner/
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

### Source Code

```text
packages/logix-core/src/
├── Runtime.ts
├── internal/verification/
│   └── proofKernel.ts
└── internal/runtime/core/runner/
    ├── ProgramRunner.ts
    ├── ProgramRunner.context.ts
    └── ProgramRunner.errors.ts

packages/logix-core/test/
├── Runtime/
│   ├── Runtime.run.basic.test.ts
│   ├── Runtime.run.args.test.ts
│   ├── Runtime.run.dispose.test.ts
│   ├── Runtime.run.disposeTimeout.test.ts
│   ├── Runtime.run.errorCategory.test.ts
│   ├── Runtime.run.reportError.test.ts
│   └── Runtime.run.transactionGuard.test.ts
└── Contracts/
    ├── RuntimeRun.contract.test.ts
    └── VerificationControlPlaneContract.test.ts
    └── support/runtimeRunFixtures.ts

packages/logix-sandbox/src/
├── Client.ts
├── Service.ts
├── Types.ts
├── Protocol.ts
└── internal/worker/sandbox.worker.ts

packages/logix-sandbox/test/
├── Client/
│   └── Client.TrialBoundary.test.ts
└── browser/
    ├── sandbox-program-runner.browser.test.ts
    ├── sandbox-run-projection.contract.test.ts
    ├── sandbox-run-trial-shape-separation.browser.test.ts
    └── sandbox-run-budget-guards.browser.test.ts

apps/docs/
├── content/docs/api/core/runtime.cn.md
├── content/docs/api/core/runtime.md
├── content/docs/guide/recipes/runnable-examples.cn.md
├── content/docs/guide/recipes/runnable-examples.md
└── src or app-local docs components for runnable examples
```

**Structure Decision**: Keep core one-shot execution in `ProgramRunner` and expose the public result face from `Runtime.ts`. Keep browser worker protocol at `COMPILE + RUN`; docs-specific intent and projection live in apps/docs or package-local tests as app-local adapter code. Do not export docs projection or worker action families from `@logixjs/sandbox`.

## Required Witness Set

- Runtime naming witness: `Runtime.run` exists and uses Program + main + options; public docs-facing examples use it.
- Runtime cut witness: `Runtime.runProgram` is removed from public docs-facing surface or proven internal-only with a guard.
- Existing behavior witness: one-shot run still covers args, boot, main error, dispose, dispose timeout, exit code, report error, signal behavior where relevant and transaction guard.
- Control-plane witness: `Runtime.check` and `Runtime.trial` still return `VerificationControlPlaneReport`.
- Shape separation witness: Run projection fails `ControlPlane.isVerificationControlPlaneReport`; Trial output passes it for the same Program.
- Proof-kernel browser witness: browser Trial uses `Effect.forkIn(scope)` through the shared proof kernel and returns a core report without ambient Scope failure.
- Browser Program Run witness: non-UI Program source with `export const Program` and `export const main` runs in worker and returns JSON-safe result with stable supplied `runId`.
- Budget witness: timeout, close timeout, serialization failure, result budget overflow and log budget overflow produce docs Run transport failures or bounded projections.
- Raw Effect witness: Effect smoke source can run only through smoke path and cannot trigger Check/Trial.
- Sandbox public surface witness: root export keys stay `SandboxClientLayer` and `SandboxClientTag`; no public `PlaygroundRunResult`, no public worker action family, no sandbox-owned report schema.
- Docs layout witness: runnable Program examples default to Source + Run with Check/Trial on demand.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if CLI references runtime run vocabulary
  - `docs/standards/logix-api-next-guardrails.md` if public surface guard vocabulary changes
- User docs:
  - `apps/docs/content/docs/api/core/runtime.cn.md`
  - `apps/docs/content/docs/api/core/runtime.md`
  - runnable example docs/pages that gain Source + Run
- Spec state sync:
  - `spec.md` is already `Planned`.
  - Move to `Active` when implementation starts.
  - Move to `Done` only after witness set, SSoT writeback and docs examples pass.
- Discussion cleanup:
  - No `discussion.md` exists for this spec.
- Witness surfaces:
  - Core contract/runtime tests.
  - Sandbox package root export guard and browser tests.
  - Docs component or snapshot proof.
  - Text sweep for forbidden public vocabulary in live docs and public examples.

## Non-Goals

- No `Runtime.playground`.
- No public sandbox playground API.
- No public `PlaygroundRunResult`.
- No public `RUN_EXAMPLE / RUNTIME_CHECK / RUNTIME_TRIAL` worker action family.
- No Trial panel for raw Effect smoke examples.
- No UI host deep trial in v1.
- No React provider verification in v1.
- No `Runtime.trial(mode="scenario")` success path in this spec.
- No CLI transport change; `162` owns CLI.
- No core/kernel verification pressure improvement; `161` owns pressure kernel work.
- No compatibility alias or deprecation period for public `Runtime.runProgram`.

## Complexity Tracking

No constitution violation is planned.
