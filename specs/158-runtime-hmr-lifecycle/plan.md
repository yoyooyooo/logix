# Implementation Plan: Runtime HMR Lifecycle

**Branch**: `158-runtime-hmr-lifecycle` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/158-runtime-hmr-lifecycle/spec.md`

## Summary

本计划把开发期热更新下的 Logix Runtime 生命周期收敛为一个显式 host lifecycle contract。

第一版采用单轨策略：

- 默认对开发热更新执行 runtime reset，保证 active demo 自动恢复交互
- 明确 runtime owner，hot boundary，cleanup evidence，residual resource evidence
- Core 提供可诊断、可测试的 runtime lifecycle primitive，host dev lifecycle carrier 通过 Effect DI 把 owner、registry、evidence services 注入 runtime 内核
- React/Vite/Vitest 提供单点开发期集成，普通 example 代码保持目标用户写法，不出现 `createExampleRuntimeOwner(...)`
- React host 负责投递宿主边界、维护 snapshot safety、汇总 host cleanup summary，但不成为 core lifecycle truth
- 当前 lifecycle decision 只承接 `reset | dispose`，state survival 进入后续安全门

## Stage Role

- This file records execution constraints only.
- This file MUST NOT invent a second owner truth beside `spec.md`.
- This file MUST name where stable results will be written back after implementation.

## North Stars & Kill Features _(optional)_

- **North Stars (NS)**: NS-5, NS-8, NS-10
- **Kill Features (KF)**: KF-6, KF-8

## Technical Context

**Language/Version**: TypeScript 5.x, Effect V4 baseline  
**Primary Dependencies**: `@logixjs/core`, `@logixjs/react`, React 19, Vite dev HMR, Vitest browser, Playwright-compatible browser harness where needed, Effect DI layers  
**Storage**: In-memory runtime state and slim serialized evidence files under `specs/158-runtime-hmr-lifecycle/**`  
**Testing**: Vitest, `@effect/vitest`, Vitest browser, targeted example integration tests, repo typecheck and lint  
**Target Platform**: Node.js 20+ and modern browsers  
**Project Type**: pnpm workspace monorepo  
**Performance Goals**: no steady-state production overhead; development bookkeeping O(number of runtime-owned resources being closed); diagnostics-disabled path must avoid additional hot-path scans  
**Constraints**: forward-only, no compatibility layer, no hidden global correctness dependency, no transaction-window IO, no render-level tearing, slim serializable diagnostics, dev-only lifecycle code must be statically separable from production bundles  
**Scale/Scope**: `packages/logix-core`, `packages/logix-react`, `examples/logix-react`, lifecycle docs in `docs/ssot/**` and `apps/docs/**`

## Constitution Check

_GATE: PASS before Phase 0 research. Re-checked after Phase 1 design below._

- **North Stars / Kill Features**: PASS. `spec.md` and this plan record NS-5 / NS-8 / NS-10 and KF-6 / KF-8.
- **Fact-source freshness**: PASS WITH NOTE. Current project instructions and `docs/standards/effect-v4-baseline.md` supersede the constitution's stale Effect V3 wording. Implementation must use Effect V4.
- **Intent to Runtime chain**: PASS. User intent is stable development feedback while editing active Logix demos. Flow/Logix impact is runtime owner lifecycle, scoped resource cleanup, and diagnostic evidence. Code impact is core lifecycle primitive plus React host adapter and examples. Runtime impact is explicit cleanup and recovery under hot replacement.
- **Docs-first and SSoT**: PASS WITH WRITEBACK. New React owner law must be written back to `docs/ssot/runtime/10-react-host-projection-boundary.md`. Lifecycle evidence and evidence artifact law must be written back to `docs/ssot/runtime/09-verification-control-plane.md`. `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` must state that this wave does not add a new `runtime.*` root command. User docs under `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime*.md`, `apps/docs/content/docs/guide/essentials/react-integration*.md`, `apps/docs/content/docs/guide/recipes/react-integration*.md`, and `apps/docs/content/docs/guide/advanced/troubleshooting*.md` must be updated.
- **Effect / Logix contracts**: PASS WITH BREAKING GATE. This introduces a development lifecycle contract and may change example/runtime owner patterns. Breaking changes use migration notes only.
- **IR / anchors**: PASS. No Static IR expansion. Dynamic evidence gains hot lifecycle event summaries.
- **Deterministic identity**: PASS WITH ACTION. Hot lifecycle evidence must identify runtime owner key, runtime instance id, lifecycle event id, cleanup operation id, and affected resource ids without random defaults.
- **Transaction boundary**: PASS. Cleanup and disposal may be async at scope boundaries, but no state write may escape transaction discipline. Interrupted tasks must not write back after owner disposal.
- **React consistency**: PASS WITH ACTION. React host transition must avoid mixed-runtime snapshots by replacing runtime context atomically and cleaning previous subscriptions through existing external store cleanup. React may carry the host lifecycle boundary and cleanup summary, while core lifecycle truth remains in injected runtime services.
- **External sources**: PASS. Existing pull-based external store law remains. Hot cleanup must close subscriptions rather than enqueue payload replay.
- **Internal contracts and trial runs**: PASS WITH ACTION. Lifecycle coordination must be modeled as explicit runtime or host contracts, not ad hoc magic fields. Verification must export slim evidence without relying on devtools global state.
- **Dual kernels**: PASS. `@logixjs/core` remains the only hard dependency. Kernel support matrix is `core: supported`, `core-ng: not-yet`.
- **Performance budget**: PASS WITH EVIDENCE REQUIRED. Before implementation, record current hot update failure baseline or targeted lifecycle bookkeeping baseline. After implementation, compare cleanup and recovery behavior plus production steady-state overhead.
- **Diagnosability**: PASS WITH ACTION. Add slim lifecycle evidence for owner decision, cleanup result, interrupted resource counts, residual resource status, and recovery outcome.
- **User-facing mental model**: PASS WITH WRITEBACK. Keywords: host dev lifecycle carrier, owner, boundary, reset, cleanup, evidence.
- **Breaking changes**: PASS. Any public helper or example pattern change must be documented in this plan and user docs. No compatibility layer.
- **Single-track implementation**: PASS. Default reset path is the first-class first wave. Dispose is the no-successor closure branch. State survival is deferred behind an explicit safety gate.
- **Public submodules**: PASS WITH ACTION. New public API, if any, must use PascalCase public submodule rules. Internal implementation stays under `src/internal/**`.
- **Large modules/files**: PASS WITH REQUIRED DECOMPOSITION. `ModuleCache.ts` is already over 1000 LOC. `RuntimeProvider.tsx` is large enough to avoid further semantic growth. A decomposition brief is included below.
- **Quality gates**: PASS. Final implementation must pass targeted tests, `pnpm typecheck`, `pnpm lint`, and relevant package/browser tests.

## Entry Gates

### Gate A: Planning Admission

PASS. `spec.md` answers owner, boundary, and closure gate:

- owner: Logix Runtime lifecycle contract with React host dogfooding
- boundary: development hot-update owner replacement, no-successor dispose, runtime-owned resources, host binding cleanup evidence
- closure: active examples recover without manual refresh and expose cleanup evidence
- user surface: examples use normal `Runtime.make` and `RuntimeProvider`; HMR lifecycle is enabled by one host-level integration path

### Gate B: Implementation Admission

Implementation starts only after this plan's Phase 0 and Phase 1 artifacts exist and tasks name exact files, evidence targets, and writeback targets.

## Perf Evidence Plan（MUST）

- Baseline 语义：代码前后
- envId：`darwin-arm64.local-browser.headless`
- profile：default for gate, quick only for investigation
- collect before:
  - targeted browser scenario that reproduces active demo failure before fix
  - targeted lifecycle bookkeeping micro-benchmark if a lifecycle owner registry is added
  - production steady-state smoke showing disabled lifecycle diagnostics do not add observable overhead
- collect after:
  - same browser scenario with 20 consecutive hot lifecycle events
  - same lifecycle bookkeeping measurement
  - same production steady-state smoke
- diff:
  - write artifacts under `specs/158-runtime-hmr-lifecycle/perf/`
  - if current perf CLI lacks a matching suite, tasks must add or document a targeted evidence command in `quickstart.md`
- Failure Policy:
  - `comparable=false`, timeout, or missing suite blocks performance claims
  - functional recovery may still pass only with explicit note that perf conclusion is withheld

## Project Structure

### Documentation (this feature)

```text
specs/158-runtime-hmr-lifecycle/
├── checklists/
│   └── requirements.md
├── contracts/
│   └── README.md
├── data-model.md
├── discussion.md
├── plan.md
├── quickstart.md
├── research.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/logix-core/src/
├── Runtime.ts
└── internal/
    ├── debug-api.ts
    └── runtime/
        ├── AppRuntime.ts
        └── core/
            ├── DebugSink.ts
            ├── ModuleRuntime*.ts
            ├── TaskRunner.ts
            ├── env.ts
            ├── runtimeInternalsAccessor.ts
            └── process/
                └── triggerStreams.ts

packages/logix-react/src/
├── RuntimeProvider.ts
└── internal/
    ├── provider/
    │   ├── RuntimeProvider.tsx
    │   └── runtimeBindings.ts
    ├── hooks/
    │   ├── useModule.ts
    │   └── useModuleRuntime.ts
    └── store/
        ├── ModuleCache.ts
        ├── RuntimeExternalStore.ts
        ├── ModuleRuntimeExternalStore.ts
        └── resolveImportedModuleRef.ts

examples/logix-react/src/
├── demos/
├── modules/
└── runtime/
    └── development host lifecycle support only when it is not user-facing

apps/docs/content/docs/guide/
├── advanced/scope-and-resource-lifetime*.md
├── essentials/react-integration*.md
└── advanced/troubleshooting*.md

docs/ssot/runtime/
├── 04-capabilities-and-runtime-control-plane.md
├── 09-verification-control-plane.md
└── 10-react-host-projection-boundary.md
```

**Structure Decision**: Core owns lifecycle evidence and cleanup primitive. Host dev lifecycle carriers own boundary delivery and inject lifecycle services through Effect DI. React owns host projection, snapshot safety, and host cleanup summary. Examples dogfood the final user-facing surface and must not expose lifecycle helper calls. Docs and SSoT carry the stable mental model.

## Frozen Owner Topology

First-wave topology is fixed as:

1. A host dev lifecycle carrier is enabled once in the development host setup.
2. The carrier detects hot update boundaries and derives a stable runtime owner key from host boundary metadata, runtime label, or explicit host configuration.
3. The carrier provides lifecycle owner, registry, and evidence services through an internal Effect Layer during runtime construction or runtime host adaptation.
4. Runtime-owned resources register against the injected lifecycle context from creation time.
5. The carrier applies `reset` when a successor runtime is created.
6. The carrier applies `dispose` when no successor runtime is created.
7. `RuntimeProvider` projects the current runtime into React and contributes host cleanup summary. It does not replace the injected core lifecycle truth.
8. Examples remain user-facing references and use normal runtime creation. Any repo-local `createExampleRuntimeOwner(...)` helper is an implementation intermediate to be removed before closure.
9. Core evidence remains host-neutral; React host cleanup is summarized separately from core runtime resources.

The current wave does not generalize `remount`, `root teardown`, `manual dispose`, or `RuntimeProvider.layer` scope into separate closure targets unless a task produces direct blocker evidence. Host carrier activation may have Vite, React, or Vitest entrypoints, but those entrypoints must feed the same internal lifecycle services.

## Closure Matrix

| Boundary | Owner | Decision | Evidence | Evidence | Writeback |
| --- | --- | --- | --- | --- | --- |
| `CM-01` development hot-update replaces runtime owner | host dev lifecycle carrier | `reset` | core lifecycle event with previous runtime id, next runtime id, cleanup summary, residual summary, host cleanup summary | browser hot lifecycle integration test with active timer/task recovery | `10` owner law, `09` evidence artifact law, user docs |
| `CM-02` development hot-update leaves no successor runtime | host dev lifecycle carrier | `dispose` | core lifecycle event with previous runtime id, no next runtime id, cleanup summary, residual summary | runtime evidence contract test for dispose and idempotency | `09` evidence artifact law |
| `CM-03` child module invalidation while root runtime call site is stable | Vite/React host dev lifecycle carrier forwards boundary to injected owner | `reset` | same event shape as `CM-01`, reason `hot-update` | browser hot lifecycle integration test targeting module-only edit | `10` boundary delivery law |
| `CM-04` React projection changes during owner replacement | React host projection layer plus injected lifecycle owner | follows owner decision | host cleanup summary for external-store listener, provider layer overlay, host subscription binding, HMR boundary adapter inside the lifecycle evidence envelope | React no-tearing and subscription cleanup tests | `10` projection law, `09` evidence artifact law, React docs |
| `CM-05` diagnostics disabled | core lifecycle primitive | `reset` or `dispose` | no correctness dependency on event allocation; optional evidence artifact may request capture | runtime evidence contract test for disabled diagnostics path | `09` artifact law |
| `CM-06` HMR lifecycle evidence enters verification without changing root control-plane commands | runtime control-plane authority | no new `runtime.*` root command | negative control-plane surface statement plus existing evidence envelope | docs snapshot or lint check for control-plane writeback | `04` negative control-plane statement and `09` evidence artifact law |
| `CM-07` production bundle imports normal runtime/react paths | package static module boundary | no lifecycle decision | dev lifecycle implementation absent unless a dev entrypoint is imported | package export or bundle static guard | user docs and package docs |

## Verification Matrix

| Evidence | Package or path | Stage | Report or artifact | Gate level | Writeback |
| --- | --- | --- | --- | --- | --- |
| Browser hot lifecycle integration test | `examples/logix-react/test/**` | host-specific upgrade layer above `runtime.trial(mode="scenario")` | feature artifact under `specs/158-runtime-hmr-lifecycle/perf/**` plus lifecycle evidence envelope | required for feature closure, not default repo gate | `09` states artifact-backed host evidence law |
| Runtime lifecycle evidence contract | `packages/logix-core/test/**` | `runtime.trial(mode="startup")` compatible evidence close check | slim lifecycle evidence artifact | required targeted package gate | `09` evidence artifact law |
| React no-tearing and host cleanup | `packages/logix-react/test/**` | host-specific evidence | host cleanup summary inside lifecycle evidence envelope | required targeted package gate | `10` projection law and `09` evidence artifact law |
| Example dogfood sweep | `examples/logix-react/test/**` and covered `examples/logix` references | static plus targeted host evidence | example coverage artifact proving normal authoring surface | required feature closure gate | user docs and `10` |
| Performance baseline and disabled diagnostics smoke | feature perf artifact | compare after implementation | comparable perf note or withheld conclusion | required for performance claim | `09` artifact law |
| Control-plane negative writeback doc check | `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md` | docs closure check | doc snapshot or lint artifact | required feature closure gate | `04` states no new `runtime.*` root command |

This wave does not add a new `runtime.*` root command. HMR evidence artifacts must map back to the same evidence envelope and report shell law in `09`, without creating a second verification lane.

## Decomposition Brief

### Targets

- `packages/logix-react/src/internal/store/ModuleCache.ts`: 1008 LOC, already above threshold.
- `packages/logix-react/src/internal/provider/RuntimeProvider.tsx`: 677 LOC, likely to grow if lifecycle logic is added.
- `packages/logix-core/src/Runtime.ts`: 616 LOC, must avoid absorbing internal lifecycle implementation.

### Split Shape

- Use internal directory ownership, not public submodule expansion.
- `ModuleCache.ts` keeps public internal facade only. Extract lifecycle bookkeeping into `internal/store/ModuleCache.lifecycle.ts` or `internal/store/ModuleCacheDisposal.ts`.
- `RuntimeProvider.tsx` keeps component assembly only. Extract host lifecycle binding into `internal/provider/runtimeHotLifecycle.ts` and development carrier entrypoints outside user-facing example modules.
- Core lifecycle primitive lands under `packages/logix-core/src/internal/runtime/core/**`. This wave does not add any HMR lifecycle public API, `Runtime.ts` route, or control-plane route.

### Dependency Direction

- React lifecycle binding may depend on core lifecycle contract.
- Core lifecycle contract must not depend on React, Vite, or browser HMR APIs.
- Host dev lifecycle carriers may depend on React, Vite, Vitest, or browser HMR APIs through dev-only entrypoints.
- Example source must not depend on lifecycle helper APIs.
- No deep internal file imports top-level `src/*.ts` files.

### Rollout Rule

- First task performs no-loss extraction where needed.
- Semantic lifecycle changes land after extraction.
- Verification runs after extraction and after semantic change.

## Required Evidence Set

- Browser hot lifecycle integration test for `CM-01` and `CM-03` that reproduces active task/timer failure and proves recovery without manual refresh.
- Repeated hot lifecycle test with at least 20 consecutive `reset` events and no duplicate active timer/watcher/task copies after cleanup settles.
- Runtime lifecycle evidence contract test for `reset`, `dispose`, repeated cleanup, cleanup after already disposed runtime, and diagnostic-disabled path.
- React no-tearing test for runtime context replacement, selector subscriptions, and host binding cleanup summary.
- ModuleCache/imports-scope cleanup test extended to hot lifecycle replacement as core runtime resource cleanup.
- Example dogfood sweep proving covered examples use normal runtime authoring code and do not call `createExampleRuntimeOwner(...)`.
- Host carrier activation test proving a single dev integration point injects lifecycle services for covered examples.
- Static package boundary guard proving production imports do not pull dev lifecycle carrier modules.
- Documentation snapshot or lint check proving lifecycle mental model is present in SSoT and user docs.
- Perf evidence artifact or explicit comparable-failure note under `specs/158-runtime-hmr-lifecycle/perf/`.

## Result Writeback

- Authority pages:
  - `docs/ssot/runtime/10-react-host-projection-boundary.md`
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/standards/logix-api-next-guardrails.md` only if implementation discovers a cross-cutting guardrail
- User docs:
  - `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md`
  - `apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md`
  - `apps/docs/content/docs/guide/essentials/react-integration.md`
  - `apps/docs/content/docs/guide/essentials/react-integration.cn.md`
  - `apps/docs/content/docs/guide/recipes/react-integration.md`
  - `apps/docs/content/docs/guide/recipes/react-integration.cn.md`
  - `apps/docs/content/docs/guide/advanced/troubleshooting.md`
  - `apps/docs/content/docs/guide/advanced/troubleshooting.cn.md`
- Spec state sync:
  - keep `spec.md` Planned until implementation starts
  - update to Active during implementation
  - update to Done after acceptance
- Discussion cleanup:
  - adopted decisions from closed discussion items must move into `plan.md`, `data-model.md`, or `contracts/README.md`
  - rejected alternatives remain only as plan/research rationale
- Evidence surfaces:
  - tests under `packages/logix-core/test/**`, `packages/logix-react/test/**`, `examples/logix-react/test/**`, and covered `examples/logix` verification references
  - evidence under `specs/158-runtime-hmr-lifecycle/perf/**` or equivalent evidence note

## Non-Goals

- No production live patching.
- No default state survival across arbitrary code edits.
- No devtools UI redesign.
- No compatibility path for old example runtime ownership patterns.
- No hidden process-global registry required for correctness.
- No full scenario language expansion for HMR testing.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Touches large existing files | Current lifecycle gap crosses provider, module cache, runtime cleanup, and examples | Adding per-demo cleanup would leave the runtime contract undefined and fail the closure gate |

## Phase 0: Research

Output: [research.md](./research.md)

Research decisions already resolved:

1. Default first wave is reset after hot update, not state survival.
2. Evidence uses a core-owned internal lifecycle event captured by the existing evidence envelope. This wave does not add a new `runtime.*` root command.
3. React host is the first dogfood target. Core contract stays host-neutral.
4. Host dev lifecycle carrier is the authoring boundary. Example helper is no longer accepted as the user-facing dogfood route and must be removed before closure.
5. Production hot path must not pay for development lifecycle support.
6. Development lifecycle implementation must live behind dev-only static module boundaries or equivalent package exports. A core runtime boolean option is not the tree-shaking guarantee.

## Phase 1: Design

Outputs:

- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)
- [quickstart.md](./quickstart.md)

Design commitments:

1. Model `RuntimeOwner`, `HotLifecycleEvent`, `RuntimeResource`, `HostBindingCleanup`, `LifecycleDecision`, and `ResidualResourceEvidence`.
2. Define the event contract before implementation.
3. Define the host dev lifecycle carrier contract before sweeping examples.
4. Keep state survival behind a future safety gate and out of the current decision set.

## Phase 1 Constitution Re-check

PASS.

- Design uses one runtime lifecycle contract with React/Vite/Vitest host carriers as first dogfood.
- No parallel truth source is introduced.
- Core remains host-neutral.
- React keeps no-tearing as a hard gate.
- Docs writeback is mandatory before closure.
- Large-file split is required before semantic growth.
