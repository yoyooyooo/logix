# Implementation Plan: Logix Playground

**Branch**: `164-logix-playground` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/164-logix-playground/spec.md`

## Summary

`164` creates `packages/logix-playground` as the shell-first Playground package for docs and examples. It proves that a curated React example can open in an independent Playground route, show source, render a real React preview, and run `Runtime.run / Runtime.check / Runtime.trial(mode="startup")` from the same `ProjectSnapshot`.

After 164 closure, long-lived Playground product workbench authority is [../../docs/ssot/runtime/17-playground-product-workbench.md](../../docs/ssot/runtime/17-playground-product-workbench.md). This plan remains the implementation record for the initial package and examples proof.

Adopted implementation direction after optimality review:

- Public surface is minimal: `PlaygroundPage` plus project/registry declaration helpers and types.
- `FileModel`, `ProgramEngine`, `PreviewAdapter`, Sandpack wiring and evidence derivation stay internal.
- Sandpack is the default internal preview/edit adapter. Sandpack types and config are not public contract.
- Automated browser contracts use an internal stable preview witness to avoid third-party iframe lifecycle hangs in Vitest browser mode. Sandpack remains the normal preview adapter and is covered by snapshot-to-Sandpack projection tests.
- `@logixjs/sandbox` remains browser worker transport only.
- `ProjectSnapshot` is the single execution coordinate for preview and runtime operations. It includes current files, generated files, resolved entries, dependencies, mocks, diagnostic options and deterministic env seed.
- Runner vocabulary stays aligned with `163`: registered Program files export fixed `Program` and app-local `main`; custom `programExport/mainExport` names are not v1 contract.
- Docs readiness means a docs-style consumer imports the same Playground shell and consumes the same curated project authority or a generated index from it. Parallel docs-owned registry truth is not allowed.
- Real sandbox-backed Program Run is implemented as an internal runner boundary and covered by package tests plus sandbox browser worker witnesses. The `examples/logix-react` route does not enable sandbox-backed UI Run by default until a dedicated worker E2E witness can mount the kernel assets without stalling the browser test host.

## Stage Role

- This file records execution constraints only.
- This file does not redefine `Runtime.run`, `Runtime.check`, `Runtime.trial`, `VerificationControlPlaneReport`, React host law or sandbox transport authority.
- The acceptance matrix in this plan is the single implementation pass/fail authority for this spec.
- Stable results must be written back to runtime SSoT only if implementation changes core runtime vocabulary or control-plane semantics.

## North Stars & Kill Features

- **North Stars (NS)**: NS-3, NS-4, NS-7, NS-8, NS-10
- **Kill Features (KF)**: KF-3, KF-4, KF-8, KF-9, KF-10

## Technical Context

**Language/Version**: TypeScript 5.x, ESM, React 19, modern browser DOM.  
**Primary Dependencies**: `effect@4.0.0-beta.28`, `@logixjs/core`, `@logixjs/react`, `@logixjs/sandbox`, React, internal Sandpack adapter via `@codesandbox/sandpack-react`, Vite for example host, Vitest browser tests.  
**Storage**: In-memory project state only. Source edits, session state, logs and derived summaries are not persisted across page reloads in this spec.  
**Testing**: Vitest unit tests, browser tests through existing Playwright-backed Vitest browser projects, package public-surface guards, examples integration tests, text sweeps for forbidden public surface leakage.  
**Target Platform**: Node.js 20+ for package checks and modern Chromium-class browsers for preview/execution proof.  
**Project Type**: pnpm workspace package plus Vite example consumer.  
**Performance Goals**: Curated project open shows source/loading UI within 2 seconds on local dev. Baseline preview reset completes within 1 second excluding intentional async delays. Run/log/report panels enforce bounded projection and truncation.  
**Constraints**: `ProjectSnapshot` is mandatory. Preview, source tabs, Program Run, Check and startup Trial must read the same snapshot. Program Run result is bounded JSON-safe app-local projection. Check/Trial output must reuse core `VerificationControlPlaneReport`. `@logixjs/sandbox` public root and subpaths cannot grow Playground product API.  
**Scale/Scope**: First closure covers package shell, minimal project declaration, internal adapter boundary, internal snapshot law, 1 to 2 curated React examples, docs-ready consumer shape and automated witnesses. It does not cover arbitrary npm install, persistent projects, public adapter plugin API, UI host deep trial, scenario trial, replay, compare or full docs rollout.

## Constitution Check

Pre-design result after optimality review: pass, with public surface and authority boundaries narrowed.

- NS/KF traceability is recorded in [spec.md](./spec.md) and mirrored here.
- The feature maps to `Intent -> Flow/Logix -> Code -> Runtime` by turning docs/example intent into visible source, React behavior, runtime result and diagnostic evidence.
- Authority starts from `docs/ssot/runtime/01-public-api-spine.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/ssot/runtime/15-cli-agent-first-control-plane.md`, `docs/standards/logix-api-next-guardrails.md` and `specs/163-runtime-playground-terminal-runner/spec.md`.
- The package introduces a product shell, not a second runtime or control-plane authority.
- Public package surface is limited to `PlaygroundPage` and project/registry declaration helpers. Internal file model, runner, preview adapter and summary derivation are implementation details.
- `Runtime.run` remains result face. `Runtime.check` and `Runtime.trial(mode="startup")` remain control-plane faces. Playground must not create a second diagnostic report schema.
- Deterministic identity is required for project ids, snapshot revisions, preview session ids and Program run ids. User-visible correlation must not depend on random ids.
- No transaction-window IO is introduced. Worker compile/run, preview mount, import resolution and mock service access happen outside Logix transaction windows.
- React consistency depends on existing `@logixjs/react` host law. Playground does not add a second React state truth for the same Logix state.
- External sources for demos must be fixture-backed through the curated project authority or internal snapshot builder. Missing fixtures produce explicit errors.
- No core-ng or kernel support matrix is added.
- Performance risk is preview boot/reset, snapshot sync, worker compile/run budget and panel rendering for large logs/reports. Runtime scheduler and field-kernel hot paths are not intended to change.
- Diagnosability improves through derived Playground summaries that reference preview status, Run status, Check/Trial status and bounded errors while preserving core report ownership.
- Forward-only execution is required. Do not preserve old sandbox-mvp result shapes, mock UI intent wording, kernel picker product surface or `Runtime.runProgram` docs-facing vocabulary.
- Package exports must follow public submodule rules: `src/index.ts` barrel, PascalCase public submodules with real implementation, internal code under `src/internal/**`, and `package.json#exports` must not expose internals.
- If any planned package file reaches 1000 LOC, split before adding more behavior. Shell, project declaration, snapshot builder, preview adapter, runner and summary derivation must stay in mutually exclusive modules.
- Quality gates are the acceptance matrix below, package typecheck/lint/tests, example typecheck/browser proof, sandbox public export guard and text sweep.

Post-design result: pass. Phase 1 artifacts introduce no second report authority and no unresolved clarification after review revisions.

## Entry Gates

### Gate A: Planning Admission

Passed. [spec.md](./spec.md) defines owner, boundary, closure contract, Must Cut and Reopen Bar.

### Gate B: Implementation Admission

Passed when this plan plus [research.md](./research.md), [data-model.md](./data-model.md), [contracts/README.md](./contracts/README.md), [quickstart.md](./quickstart.md) and the review ledger are present.

Implementation may start only if the executor accepts these fixed constraints:

- `@logixjs/playground` owns the user-facing Playground shell.
- Public package surface stays shell-first.
- Sandpack is an internal preview/edit adapter.
- `@logixjs/sandbox` remains transport-only.
- Preview and internal runner consume the same `ProjectSnapshot`.
- `Runtime.run` result projection and `Runtime.check/trial(startup)` control-plane report stay shape-separated.
- Docs consume the same curated project authority or a generated index from it.

## Perf Evidence Plan

`164` touches rendering path, browser worker envelope and docs/example product surface. It should not alter core scheduler, StateTransaction, field-kernel convergence or subscription propagation.

Required evidence is captured in the acceptance matrix:

- Browser-level render proof for at least one Playground project.
- Snapshot proof that preview and runtime operations consume one revision.
- Reset lifecycle proof.
- Bounded Run/log/report proof.
- Public-surface proof for `@logixjs/playground` and `@logixjs/sandbox`.

Full runtime perf collection is not required if implementation only adds Playground package code, example integration and internal sandbox adapter usage. If implementation changes `Runtime.run`, `Runtime.trial`, proof kernel, sandbox worker protocol, `ProgramRunner`, transaction guard or React host subscription behavior, collect focused before/after evidence before closing:

```bash
rtk pnpm perf collect -- --profile default --out specs/164-logix-playground/perf/before.worktree.local.default.json --files packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts
rtk pnpm perf collect -- --profile default --out specs/164-logix-playground/perf/after.worktree.local.default.json --files packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts
rtk pnpm perf diff -- --before specs/164-logix-playground/perf/before.worktree.local.default.json --after specs/164-logix-playground/perf/after.worktree.local.default.json --out specs/164-logix-playground/perf/diff.before__after.json
```

If only package UI and example registry change, browser witness timing plus bounded-envelope tests satisfy this spec.

## Project Structure

### Documentation

```text
specs/164-logix-playground/
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
packages/logix-playground/
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── tsup.config.ts
├── vitest.config.ts
├── src/
│   ├── index.ts
│   ├── Playground.tsx
│   ├── Project.ts
│   └── internal/
│       ├── adapters/
│       │   ├── sandpack.tsx
│       │   └── sandboxRunner.ts
│       ├── components/
│       ├── snapshot/
│       ├── project/
│       ├── runner/
│       ├── summary/
│       └── session/
└── test/
    ├── public-surface.contract.test.ts
    ├── project.contract.test.ts
    ├── project-snapshot.contract.test.ts
    ├── program-runner.contract.test.ts
    ├── shape-separation.contract.test.ts
    ├── trial-startup.boundary.test.ts
    ├── derived-summary.contract.test.ts
    └── docs-consumer.contract.test.ts

examples/logix-react/
├── src/
│   ├── playground/
│   │   ├── registry.ts
│   │   ├── routes.tsx
│   │   └── projects/
│   │       ├── local-counter.ts
│   │       └── session-counter.ts
│   ├── examples/
│   │   └── shared/
│   │       └── localCounter.logic.ts
│   └── App.tsx
└── test/
    ├── playground-registry.contract.test.ts
    └── browser/
        └── playground-preview.contract.test.tsx

packages/logix-sandbox/test/
└── SandboxPublicSurface.contract.test.ts
```

**Structure Decision**: Create a new shell-first product package. Keep source/editor/preview shell in `packages/logix-playground`, curated project definitions in the consuming example package, and worker compile/run/check/startup-trial transport in `@logixjs/sandbox`. `examples/logix-react` proves integration through registry entries and a route that consumes the package.

## Acceptance Matrix

This matrix is the single implementation pass/fail authority for `164`.

| Witness | Normative rule | Proof command | Pass condition | Owner doc |
| --- | --- | --- | --- | --- |
| AM-01 public surface | `@logixjs/playground` only exposes root, `./Playground`, `./Project`, package metadata and no internal subpaths | `rtk pnpm -C packages/logix-playground exec vitest run test/public-surface.contract.test.ts` | Public keys contain no `FileModel`, `ProgramEngine`, `Preview`, `Evidence`, adapter or runner exports | `contracts/README.md` |
| AM-02 project declaration | Public project declaration accepts fixed `Program` and `main` runner convention and minimal source coordinates | `rtk pnpm -C packages/logix-playground exec vitest run test/project.contract.test.ts` | Custom `programExport/mainExport` is rejected or absent from types and fixtures | `contracts/README.md` |
| AM-03 snapshot law | Preview and internal runner consume one `ProjectSnapshot` per revision | `rtk pnpm -C packages/logix-playground exec vitest run test/project-snapshot.contract.test.ts` | Snapshot includes files, generated files, resolved entries, dependencies, mocks, diagnostic options and deterministic env seed; bypass to original files is guarded | `data-model.md` |
| AM-04 React preview | A registered React project renders visible UI and responds to user interaction | `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser` | Browser contract preview witness is non-empty and interaction changes visible state; Sandpack file projection is covered by package tests | `quickstart.md` |
| AM-05 Program Run | Registered Program project runs through `Runtime.run(Program, main, options)` from the same snapshot | `rtk pnpm -C packages/logix-playground exec vitest run test/program-runner.contract.test.ts` | Run returns bounded JSON-safe projection with stable run id and no control-plane report fields | `contracts/README.md` |
| AM-06 startup Trial | Playground v1 calls only startup Trial | `rtk pnpm -C packages/logix-playground exec vitest run test/trial-startup.boundary.test.ts` | Trial output is core `VerificationControlPlaneReport`; scenario/replay/compare are unavailable in Playground v1 | `contracts/README.md` |
| AM-07 shape separation | Run projection and Trial report are machine-distinguishable | `rtk pnpm -C packages/logix-playground exec vitest run test/shape-separation.contract.test.ts` | Run fails `ControlPlane.isVerificationControlPlaneReport`; Trial passes | `contracts/README.md` |
| AM-08 edit propagation | Editing shared source affects preview and Program Run | `rtk pnpm -C examples/logix-react exec vitest run test/browser/playground-preview.contract.test.tsx --project browser` | One shared source edit changes preview behavior and Run output | `spec.md` |
| AM-09 reset and failures | Reset clears preview session state and failure classes stay separate | `rtk pnpm -C packages/logix-playground exec vitest run test/derived-summary.contract.test.ts` | Preview crash, compile failure, Run failure and Trial failure are bounded and separately classified | `data-model.md` |
| AM-10 docs consumer | Docs-style consumer reuses shell without copying panels | `rtk pnpm -C packages/logix-playground exec vitest run test/docs-consumer.contract.test.ts` | Consumer renders `PlaygroundPage` with registry/projectId and no duplicated shell/panel implementation | `contracts/README.md` |
| AM-11 single project authority | Docs and examples consume the same curated project authority or generated index from it | `rtk pnpm -C examples/logix-react exec vitest run test/playground-registry.contract.test.ts` | No parallel docs-owned project definition for the same project id is required | `quickstart.md` |
| AM-12 sandbox boundary | `@logixjs/sandbox` exports no Playground product API | `rtk pnpm -C packages/logix-sandbox exec vitest run test/SandboxPublicSurface.contract.test.ts` | Sandbox public root and subpaths contain no Playground shell, project, adapter, runner or result contracts | `contracts/README.md` |
| AM-13 default UI hierarchy | Source/Preview/Run is the default user path and Check/Trial is on-demand diagnostics | `rtk pnpm -C packages/logix-playground exec vitest run test/default-ui-hierarchy.contract.test.tsx` | Initial render does not auto-run or auto-expand Check/Trial and keeps Source/Preview/Run primary | `spec.md` |
| AM-14 text sweep | Live public source and docs contain no forbidden product leakage | `rtk rg -n "PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|programExport|mainExport" packages/logix-sandbox/src packages/logix-sandbox/package.json specs/164-logix-playground` | Remaining matches are either absent or explicitly classified as forbidden shape in this spec | `plan.md` |

Additional worker witness:

```bash
rtk pnpm -C packages/logix-sandbox exec vitest run test/browser/sandbox-program-runner.browser.test.ts --project browser
```

This proves the existing browser worker Program Run path. It is intentionally separate from the default `examples/logix-react` Playground route until worker asset mounting has a stable example-level E2E harness.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/01-public-api-spine.md` only if implementation changes `Runtime.run/check/trial` vocabulary.
  - `docs/ssot/runtime/09-verification-control-plane.md` only if Check/Trial report semantics or default stage vocabulary changes.
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md` only if CLI/docs runtime vocabulary alignment changes.
  - `docs/standards/logix-api-next-guardrails.md` if public surface guard vocabulary expands.
- User docs and examples:
  - For this proof, the curated project authority lives in `examples/logix-react`.
  - Future `apps/docs` integration must consume the same registry or a generated index from it.
  - User docs must not copy Playground shell, source tabs, preview host, Program result panel, Check/Trial panel or snapshot logic.
- Spec state sync:
  - `spec.md` is already `Planned`.
  - Move to `Active` when implementation starts.
- Move to `Done` only after every AM witness passes and any required authority writeback is complete.
- Discussion cleanup:
  - No `discussion.md` exists for this spec.
- Witness surfaces:
  - Package tests in `packages/logix-playground/test`.
  - Browser tests in `examples/logix-react/test/browser`.
  - Sandbox public export guard.
  - Text sweep for forbidden public vocabulary in sandbox and live specs.

## Non-Goals

- No arbitrary npm install or remote project persistence.
- No account-level workspace, share link backend or saved project store.
- No public adapter plugin API.
- No public `FileModel`, `ProgramEngine`, `PreviewAdapter`, `Evidence` or runner contract.
- No custom `programExport/mainExport` names in v1.
- No UI host deep trial or replay debugger as closure blocker.
- No scenario trial, compare or raw trace compare as default user panel.
- No direct migration of `examples/logix-sandbox-mvp` old result shape, alignment lab UI, mock UI intent or kernel selection product surface.
- No Playground product exports from `@logixjs/sandbox`.
- No public sandbox worker action family named around Playground product intents.
- No second diagnostic report schema.
- No independent mutable Playground evidence ledger.
- No parallel docs-owned registry truth for the same curated project ids.
- No full rewrite of all `examples/logix-react` demos in this spec.
- No immediate full `apps/docs` integration.

## Complexity Tracking

No constitution violation is planned.
