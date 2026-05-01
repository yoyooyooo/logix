# Verification Notes: Kernel-to-Playground Verification Parity

**Status**: Implementation evidence recorded  
**Created**: 2026-04-30

168 implementation is complete for dependency spine parity, Run value lossiness, Workbench report identity, CLI transport parity, Playground run failure projection, sandbox runtime error cause projection, reflection bridge expansion, Playground capture refs and curated diagnostics route authority classes.

## Dominance Audit

Recorded from the 2026-04-30 implementation pass.

| Path | Evidence | Disposition | Required action |
| --- | --- | --- | --- |
| `packages/logix-core/src/Runtime.ts` | `VerificationDependencyCauseSpine.contract.test.ts` proves missing service, config and Program import emit `dependencyCauses`, findings and `repairHints.focusRef` with stable owner coordinates. | keep | Keep `VerificationDependencyCause` as first dependency spine. |
| `packages/logix-core/src/internal/workbench/findings.ts` | `RuntimeRunProjection.contract.test.ts` and Playground shape tests prove accepted failed Run projects as `run-failure-facet`. | keep | Keep `run-failure-facet`; consume bounded result-face failure only. |
| `packages/logix-core/src/internal/workbench/authority.ts` | `RuntimeWorkbenchIdentity.contract.test.ts` proves control-plane report authority ref does not vary with summary wording. | rewrite-under-owner | Use run id, stage, mode, errorCode, focusRef, artifact output key and owner digest. |
| `packages/logix-core/src/internal/workbench/projection.ts` | `RuntimeRunProjection.contract.test.ts` proves run-result preview carries `valueKind / lossy / lossReasons`. | rewrite-under-owner | Preserve lossiness metadata in projection preview. |
| `packages/logix-core/src/internal/reflection/workbenchBridge.ts` | `WorkbenchBridge.test.ts` proves reflection action, payload and dependency nodes are projected beyond manifest artifact refs, and missing/unknown/stale/fallback cases become evidence gaps. | rewrite-under-owner | Keep reflection owner in 167 and project only owner-approved facts. |
| `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts` | `project-snapshot-runtime-evidence.contract.test.ts` proves failed Run writes `runtimeOutput.status="failed"` with failure detail and evidence gap. | rewrite-under-owner | Keep result-face failure and evidence gap separation. |
| `packages/logix-playground/src/internal/runner/sessionCapture.ts` | `session-capture.contract.test.ts` proves Check/Trial reports and Run failures produce capture refs; compare proof consumes captured report refs. | keep | Keep capture as host state and not report truth. |
| `packages/logix-playground/src/internal/runner/runProjection.ts` | `run-value-lossiness.contract.test.ts` proves business `null`, projected `undefined` and truncation are distinguishable. | rewrite-under-owner | Keep `undefined-to-null` and truncation loss reasons. |
| `packages/logix-playground/src/internal/summary/workbenchProjection.ts` | `workbenchProjection.test.ts` proves preview-only and host compile failures are evidence gaps, while runtime evidence Run failure becomes `run-failure-facet`. | rewrite-under-owner | Keep preview/compile demotion and runtime evidence acceptance. |
| `examples/logix-react/src/playground/projects/diagnostics/**` | Registry and browser tests prove diagnostics routes declare runtime authority class and include Run null, Run undefined, Run failure, payload validator unavailable and reflection action evidence-gap routes. | keep | Keep owner-backed diagnostics demos. |
| `examples/logix-react/src/playground/projects/pressure/**` | Registry test proves pressure fixtures carry `authorityClass: "visual-pressure-only"`. | demote-to-host-state | Keep pressure rows visual-only. |

## Planning Artifact Checks

To verify the planning files:

```bash
rtk find specs/168-kernel-to-playground-verification-parity -maxdepth 2 -type f | sort
rtk rg -n "blocking implementation item|fake diagnostic|Runtime\\.playground|Logix\\.Reflection" specs/168-kernel-to-playground-verification-parity
```

## Implementation Verification

Commands completed before docs writeback:

- `rtk pnpm -C packages/logix-core test -- --run VerificationDependencyCauseSpine.contract.test.ts RuntimeRunProjection.contract.test.ts RuntimeWorkbenchIdentity.contract.test.ts --reporter=dot`
- `rtk pnpm -C packages/logix-core test -- --run RuntimeCheck.contract.test.ts VerificationControlPlaneContract.test.ts VerificationProofKernelRoutes.test.ts --reporter=dot`
- `rtk pnpm -C packages/logix-core typecheck`
- `rtk pnpm -C packages/logix-cli test -- --run trial-dependency-spine.contract.test.ts workbench-projection.contract.test.ts workbench-parity.contract.test.ts --reporter=dot`
- `rtk pnpm -C packages/logix-cli typecheck`
- `rtk pnpm -C packages/logix-playground test -- --run run-value-lossiness.contract.test.ts shape-separation.contract.test.ts program-run-runtime.contract.test.ts workbenchProjection.test.ts --reporter=dot`
- `rtk pnpm -C packages/logix-playground test -- --run project-snapshot-runtime-evidence.contract.test.ts host-command-output.contract.test.tsx --reporter=dot`
- `rtk pnpm -C packages/logix-playground typecheck`
- `rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot`
- `rtk pnpm -C examples/logix-react test -- --run test/browser/playground-run-value-lossiness.contract.test.tsx --reporter=dot`
- `rtk pnpm -C examples/logix-react typecheck`

Commands completed for final task closure:

- `rtk pnpm -C packages/logix-core test -- --run test/internal/Reflection/WorkbenchBridge.test.ts --reporter=dot`
  - Result: 1 file passed, 4 tests passed.
- `rtk pnpm -C packages/logix-core test -- --run RuntimeCheck.contract.test.ts test/internal/Reflection/Manifest.Determinism.test.ts --reporter=dot`
  - Result: 2 files passed, 7 tests passed.
- `rtk pnpm -C packages/logix-core test -- --run test/internal/Reflection/ConsumptionContract.test.ts --reporter=dot`
  - Result: 1 file passed, 4 tests passed.
- `rtk pnpm -C packages/logix-cli test -- --run evidence-selection-input.contract.test.ts --reporter=dot`
  - Result: 1 file passed, 7 tests passed.
- `rtk pnpm -C packages/logix-playground test -- --run session-capture.contract.test.ts --reporter=dot`
  - Result: 1 file passed, 3 tests passed.
- `rtk pnpm -C packages/logix-playground test -- --run session-capture.contract.test.ts runtime-reflection-ui.contract.test.tsx runtime-reflection-wrapper.contract.test.ts workbenchProjection.test.ts source-regex-authority-sweep.contract.test.ts --reporter=dot`
  - Result: 5 files passed, 10 tests passed.
- `rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot`
  - Result: 1 file passed, 11 tests passed.
- `rtk pnpm -C packages/logix-core typecheck`
  - Result: passed.
- `rtk pnpm -C packages/logix-cli typecheck`
  - Result: passed.
- `rtk pnpm -C packages/logix-playground typecheck`
  - Result: passed.
- `rtk pnpm -C examples/logix-react typecheck`
  - Result: passed.

Observed warning:

- `host-command-output.contract.test.tsx` and `playground-run-value-lossiness.contract.test.tsx` print existing React sync-blocking warnings. The tests passed.

## Final Verification

Commands completed after docs writeback:

- `rtk rg -n "T""ODO|T""BD|不""是.*而""是" specs/168-kernel-to-playground-verification-parity docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/15-cli-agent-first-control-plane.md docs/ssot/runtime/17-playground-product-workbench.md specs/165-runtime-workbench-kernel/spec.md specs/166-playground-driver-scenario-surface/spec.md specs/167-runtime-reflection-manifest/spec.md`
  - Result: no output.
- `rtk rg -n "fake diagnostic|diagnosticsFixture|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Runtime\\.workbench|Logix\\.Reflection|fallback-source-regex" packages/logix-core packages/logix-cli packages/logix-playground examples/logix-react docs specs/168-kernel-to-playground-verification-parity`
  - Result: remaining hits are negative-only spec text, sweep commands, `fallback-source-regex` evidence-gap guards, historical plans or docs/next proposals. No new public surface hit was found in production package exports.
- `rtk pnpm -C packages/logix-core test -- --run VerificationDependencyCauseSpine.contract.test.ts RuntimeRunProjection.contract.test.ts RuntimeWorkbenchIdentity.contract.test.ts --reporter=dot`
  - Result: 3 files passed, 7 tests passed.
- `rtk pnpm -C packages/logix-cli test -- --run trial-dependency-spine.contract.test.ts workbench-projection.contract.test.ts workbench-parity.contract.test.ts --reporter=dot`
  - Result: 3 files passed, 4 tests passed.
- `rtk pnpm -C packages/logix-playground test -- --run run-value-lossiness.contract.test.ts shape-separation.contract.test.ts program-run-runtime.contract.test.ts workbenchProjection.test.ts project-snapshot-runtime-evidence.contract.test.ts host-command-output.contract.test.tsx --reporter=dot`
  - Result: 6 files passed, 14 tests passed.
- `rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts test/browser/playground-run-value-lossiness.contract.test.tsx --reporter=dot`
  - Result: 2 files passed, 13 tests passed.
- `rtk pnpm -C examples/logix-react test -- --run test/browser/playground-preview.contract.test.tsx --reporter=dot`
  - Result: 1 file passed, 4 tests passed after harness stabilization.
- `rtk pnpm -C packages/logix-core typecheck`
  - Result: passed.
- `rtk pnpm -C packages/logix-cli typecheck`
  - Result: passed.
- `rtk pnpm -C packages/logix-playground typecheck`
  - Result: passed.
- `rtk pnpm -C examples/logix-react typecheck`
  - Result: passed.
- `rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot`
  - Result: 319 files passed, 744 tests passed, 1 skipped.
- `rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot`
  - Result: 26 files passed, 51 tests passed.
- `rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot`
  - Result: 46 files passed, 127 tests passed.
- `rtk pnpm -C examples/logix-react test -- --run --cache --silent=passed-only --reporter=dot`
  - Result: 21 files passed, 55 tests passed.
- `rtk pnpm -C packages/logix-sandbox bundle:kernel`
  - Result: generated local sandbox public bundle with 0 warnings and 0 errors.
- `rtk pnpm -C examples/logix-react test:browser:playground`
  - Result: passed. Registry-indexed dogfood proof recipes covered `run-failure`, `payload-validator-unavailable`, `reflection-action-gap` and all registered Playground routes.
- `rtk pnpm typecheck`
  - Result: TypeScript no errors found.
- `rtk pnpm lint`
  - Result: `oxlint` found 0 warnings and 0 errors across 713 files; ESLint passed.
- `rtk pnpm test:turbo`
  - Result: passed. Turbo reported 15 successful tasks, 0 cached tasks and root-level Vitest reported 5 files passed, 16 tests passed. Key package counts included core 319 files / 744 tests, sandbox 7 files / 11 tests, CLI 26 files / 51 tests, Playground 46 files / 127 tests and examples/logix-react 11 files / 38 tests.

Resolved parallel-run observations:

- The earlier turbo failure was caused by package-level test timeout configuration under repo-level parallel load. `packages/logix-cli/vitest.config.ts` now sets the CLI test timeout explicitly, and the repo-level turbo run passed.
- Browser tests continue to print existing React render-phase sync-blocking warnings.

## Perf Evidence

No runtime hot path was changed in this slice. The implementation changes are limited to control-plane report projection, Workbench authority derivation, CLI/Playground adapters, UI projection metadata, route fixtures and docs writeback. No perf proof was required.
