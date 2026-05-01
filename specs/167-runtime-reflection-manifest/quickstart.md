# Quickstart: Runtime Reflection Manifest vNext

## Read Authority

```bash
rtk sed -n '1,260p' specs/167-runtime-reflection-manifest/spec.md
rtk sed -n '1,260p' specs/167-runtime-reflection-manifest/plan.md
rtk sed -n '1,260p' specs/166-playground-driver-scenario-surface/spec.md
rtk sed -n '1,220p' docs/ssot/runtime/17-playground-product-workbench.md
```

## Inspect Existing Reflection

```bash
rtk sed -n '1,460p' packages/logix-core/src/internal/reflection/manifest.ts
rtk sed -n '1,180p' packages/logix-core/src/internal/reflection-api.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/ports/exportPortSpec.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/consumptionContract.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/payloadSummary.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/payloadValidation.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/runtimeOperationEvents.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/reflection/workbenchBridge.ts
rtk sed -n '1,220p' packages/logix-playground/src/internal/action/actionManifest.ts
```

## Focused Verification

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-cli test -- --run test/Integration/check.command.test.ts test/Integration/trial.command.test.ts --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
```

## Workspace Verification

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

## Negative Sweep

```bash
rtk rg -n "export \\* as Reflection|Logix\\.Reflection|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Program\\.capabilities\\.mocks" packages/logix-core packages/logix-react packages/logix-sandbox packages/logix-playground docs specs/167-runtime-reflection-manifest specs/166-playground-driver-scenario-surface
```

Expected:

- No production public export hits.
- Remaining hits are forbidden-shape docs/spec text, frozen or planning notes, or negative assertions.

## Owner Lane Sweep

```bash
rtk rg -n "logix-playground|PlaygroundProject|ProjectSnapshot|ProgramSessionState|Driver|Scenario" packages/logix-core/src/internal/reflection packages/logix-core/src/internal/reflection-api.ts
```

Expected:

- no imports from `packages/logix-playground`
- no dependency on Playground product session state
- no Driver/Scenario owner-lane hits in core reflection implementation

## Manual Proof

1. Create or use a Program with void and non-void actions.
2. Extract minimum manifest.
3. Confirm action tags, payload kind and digest.
4. Validate one valid JSON payload.
5. Validate one invalid JSON payload.
6. Project an existing runtime debug ref or operation coordinate into `RuntimeOperationEvent`.
7. Confirm operation event has stable coordinate.
8. Convert manifest + event batch into 165 authority bundle.
9. Run CLI `check` or `trial` and confirm `reflectionManifest.digest` is present in artifacts.

## Evidence Writeback

Record outcomes in:

```text
specs/167-runtime-reflection-manifest/notes/verification.md
specs/167-runtime-reflection-manifest/notes/perf-evidence.md
```
