# Implementation Closure Checklist: CLI Verification Transport

**Purpose**: Track implementation closure for `162`. This checklist is separate from [requirements.md](./requirements.md), which only validates spec quality.

**Feature**: [../spec.md](../spec.md)
**Tasks**: [../tasks.md](../tasks.md)

## Status Gate

- [x] `spec.md` status is `Active` while implementation is underway.
- [x] `tasks.md` exists and all implementation tasks are checked before `Done`.
- [x] This checklist is fully checked before `spec.md` moves to `Done`.
- [x] `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` no longer lists 162-owned gaps as `open` without an explicit deferred owner.

## Witness Gate

- [x] Public surface witness proves help, parser and schema expose only `check / trial / compare`.
- [x] Transport witness proves `CommandResult` remains stdout-only transport and points to a `VerificationControlPlaneReport`.
- [x] Exact rerun witness proves same-stage rerun and stage upgrade coordinate for `check` and startup `trial`.
- [x] Stdout witness proves small inline report, truncation metadata, file fallback, artifact ordering and error report output.
- [x] Source artifact witness proves CLI source provenance is locator/ref/digest only and does not own declaration truth.
- [x] Evidence witness proves canonical evidence package and selection manifest are hint-only and use `artifacts[].outputKey`.
- [x] Compare witness proves before/after report refs route to core compare and compare input failures stop at transport gate.
- [x] Closure witness proves Program assembly, source/declaration and dependency failure families each have before -> repair -> exact rerun -> after -> compare proof pack.

## Matrix Close Gate

- [x] `GAP-EXACT-RERUN` is closed or has proof-backed residual scope outside 162.
- [x] `GAP-STDOUT-BUDGET` is closed or has proof-backed residual scope outside 162.
- [x] `GAP-DVTOOLS-ROUNDTRIP` is closed or has proof-backed residual scope outside 162.
- [x] `GAP-ARTIFACT-LINKING` has CLI transport and evidence selection proof refs.
- [x] `GAP-REPEATABILITY` has CLI transport repeatability proof refs.
- [x] `GAP-LOOP-CLOSURE` has CLI closure proof refs for the three required failure families.

## Verification Commands

- [x] `pnpm -C packages/logix-cli exec vitest run test/Integration/command-schema.guard.test.ts test/Integration/command-result-transport.contract.test.ts test/Integration/output-contract.test.ts test/Integration/output-budget.contract.test.ts test/Integration/exact-rerun-coordinate.contract.test.ts`
- [x] `pnpm -C packages/logix-cli exec vitest run test/Integration/evidence-selection-input.contract.test.ts test/Integration/evidence-selection-roundtrip.contract.test.ts test/Integration/source-artifact-boundary.contract.test.ts`
- [x] `pnpm -C packages/logix-cli exec vitest run test/Integration/compare.command.test.ts test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts`
- [x] `pnpm -C packages/logix-cli exec tsc -p tsconfig.json --noEmit`
- [x] `pnpm -C packages/logix-cli exec tsc -p tsconfig.test.json --noEmit`

## Writeback Gate

- [x] `docs/ssot/runtime/15-cli-agent-first-control-plane.md` reflects final CLI transport behavior.
- [x] `docs/ssot/runtime/14-dvtools-internal-workbench.md` reflects final evidence selection roundtrip.
- [x] `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md` has updated statuses and proof refs.
- [x] `specs/162-cli-verification-transport/quickstart.md` references final proof commands.
- [x] `specs/162-cli-verification-transport/spec.md` moves to `Done` only after all writeback items pass.
