# Implementation Plan: Runtime Reflection Manifest vNext

**Branch**: `167-runtime-reflection-manifest` | **Date**: 2026-04-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/167-runtime-reflection-manifest/spec.md`

## Summary

167 creates the repo-internal reflection layer used by Playground, CLI self-verification and Devtools. It now has two closure tracks: 167A unblocks 166 with the minimum action manifest slice and Cross-tool Consumption Law; 167B completes full Program manifest, payload validation depth, runtime event collection, CLI/Devtools reuse and 165 bridge hardening.

This plan also fixes the 166/167 split: 166 owns Playground source bundling, sandbox transport, product session state and UI. 167 owns shared action/payload/operation interpretation. Any capability that must be rendered consistently by Playground, CLI and Devtools belongs here; any capability that is only product interaction, layout or project registry stays in 166. 166 depends only on 167A.

## Technical Context

**Language/Version**: TypeScript 5.9, Effect 4.0.0-beta.28
**Primary Dependencies**: `@logixjs/core`, Effect Schema, existing runtime debug and verification internals
**Owner**: `packages/logix-core/src/internal/reflection/**` and `packages/logix-core/src/internal/reflection-api.ts`
**Consumers**: `packages/logix-playground`, CLI/control-plane internals, `packages/logix-devtools-react`
**Public Surface**: none in this phase
**Performance Goal**: no hot-path reflection extraction unless explicitly requested; 167B observability collection near-zero when disabled
**166 Boundary**: 167 does not implement `ProjectSnapshot -> executable module`, sandbox transport, Driver/Scenario metadata or Playground UI state.

## Constitution Check

- Public API minimalism: pass only if no public `Logix.Reflection` root is added.
- Runtime clarity: pass if manifest remains projection/context and does not replace reports or runtime state.
- Diagnostics authority: pass if manifest/observability feed 165 without inventing findings.
- Performance: required when 167B observability collection touches dispatch/run/check/trial paths.
- Forward-only: remove source regex authority rather than preserving it as accepted design.
- Owner lane: pass only if 166 can consume repo-internal DTOs without 167 importing Playground product types.

## Phase 0 - Research

Research output: [research.md](./research.md)

Adopted decisions:

1. Keep reflection repo-internal first.
2. 166 consumes minimum manifest slice.
3. Full manifest includes Program-level and Module-level data.
4. Payload validation is reflection-owned projection.
5. Runtime event law uses stable runtime coordinates; collection is 167B or follow-up work.
6. 165 bridge is adapter, not new truth.
7. Runtime consumption split: 166 calls existing Runtime faces; 167 supplies shared manifest/payload/observability interpretation for their outputs.
8. 167A/167B split: 167A is minimum manifest plus consumption law; terminal reflection tails belong to 167B.

## Phase 1 - Design Artifacts

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/README.md](./contracts/README.md)
- [quickstart.md](./quickstart.md)

Target files:

```text
packages/logix-core/src/internal/reflection/
  manifest.ts
  programManifest.ts
  payloadSummary.ts
  payloadValidation.ts
  runtimeOperationEvents.ts
  consumptionContract.ts
  workbenchBridge.ts

packages/logix-core/src/internal/reflection-api.ts
packages/logix-playground/src/internal/action/actionManifest.ts
```

## Phase 2 - Implementation Strategy

### Slice A - 167A Minimum Manifest For 166

- Add `extractMinimumProgramActionManifest`.
- Include action tag, payload kind, optional payload summary, authority and digest.
- Expose through repo-internal reflection API.
- Define Cross-tool Consumption Law so 166 can adapt the minimum manifest without defining private terminal schema.
- Classify `fallback-source-regex` as evidence gap outside manifest authority.
- Leave Playground UI wiring to 166 after this slice exposes the contract.

### Slice A2 - Cross-tool Consumption Law

- Define classes `authority`, `contextRef`, `debugEvidence`, `hostViewState` and `evidenceGap`.
- Add tests proving Driver/Scenario declarations, Scenario `expect` and UI state cannot enter authority classes.
- Add consumer adapter examples for Playground and CLI without importing Playground product types.

### Slice B - 167B Payload Summary And Validation

- Extract bounded schema summaries from Effect Schema.
- Validate JSON-decoded unknown payloads through owner-approved schema path.
- Return stable issue list.
- Preserve evidence gap for unknown schema.
- Keep text parsing and UI presentation consumer-owned.

### Slice C - 167B Full Program Manifest

- Add Program-level manifest DTO.
- Include root module manifest, initial state summary, imports/services summary and run/check/trial availability.
- Apply deterministic budgets and digest.

### Slice D - 167B Runtime Event Collection

- Define event law first: `operation.accepted`, `operation.completed`, `operation.failed`, `evidence.gap`.
- Use `operationKind` for dispatch/run/check/trial.
- Keep state/log/trace as bounded attachment refs.
- Connect dispatch lifecycle first only after the law is stable.
- Ensure diagnostics disabled overhead is near-zero.
- Keep Playground product session state out of the DTO; accept session/source revision only as host context.

### Slice E - 167B CLI And Workbench Bridge

- Export manifest digest/diff with CLI trial/run/check.
- Add bridge from manifest/observability to 165 authority bundle.
- Add evidence gap handling for missing source coordinate, unknown payload schema and missing manifest.
- Prove Playground and Devtools can consume the same action/payload/operation DTOs through repo-internal adapters without private schema forks.

## Verification Strategy

Required focused commands:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Perf evidence is required if dispatch/run/check/trial hot paths are modified:

```bash
rtk pnpm check:effect-v4-matrix
```

Record outcomes in:

```text
specs/167-runtime-reflection-manifest/notes/verification.md
specs/167-runtime-reflection-manifest/notes/perf-evidence.md
```

## Negative Sweep

```bash
rtk rg -n "export \\* as Reflection|Logix\\.Reflection|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Program\\.capabilities\\.mocks" packages/logix-core packages/logix-react packages/logix-sandbox packages/logix-playground docs specs/167-runtime-reflection-manifest specs/166-playground-driver-scenario-surface
```

Remaining hits must be forbidden-shape text or spec negative contracts.

## Writeback Targets

- `specs/166-playground-driver-scenario-surface/spec.md`
- `specs/166-playground-driver-scenario-surface/plan.md`
- `specs/166-playground-driver-scenario-surface/tasks.md`
- `docs/ssot/runtime/17-playground-product-workbench.md`
- `docs/ssot/runtime/15-cli-agent-first-control-plane.md` if CLI export shape changes
- `docs/ssot/runtime/14-dvtools-internal-workbench.md` if Devtools consumption shape changes
- `specs/167-runtime-reflection-manifest/contracts/README.md`

## Post-Design Constitution Check

Pass if:

- reflection remains repo-internal
- 166 minimum manifest is usable without regex primary authority
- CLI/Playground/Devtools do not own private manifest schemas
- diagnostics disabled overhead remains bounded
- public surface sweep passes
- 167 does not import or depend on Playground product metadata or UI types
