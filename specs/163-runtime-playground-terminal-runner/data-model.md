# Data Model: Runtime Playground Terminal Runner

## RuntimeRunFace

Represents the public result-facing runtime entry.

Fields:

- `Program`: required Logix Program.
- `main`: app or docs callback `(ctx, args) => Effect.Effect<A, E, R>`.
- `options`: optional `RunOptions<Args>` extending runtime open options.
- `result`: Promise-resolved business/example value.

Validation:

- `Program` must pass current Program recognition.
- `main` must only be accepted by `Runtime.run`, not by `Runtime.check`, `Runtime.trial`, CLI stage input or sandbox public root.
- Runtime execution must retain transaction-window guard.

State transitions:

```text
idle -> booting -> running main -> disposing -> resolved
idle -> booting -> failed
running main -> disposing -> failed
disposing -> dispose-timeout failure
```

## RuntimeTrialFace

Represents diagnostic startup verification.

Fields:

- `Program`: required Logix Program.
- `options`: `TrialOptions`.
- `report`: `VerificationControlPlaneReport`.

Validation:

- Output must pass `ControlPlane.isVerificationControlPlaneReport`.
- Report stage must be `trial`.
- Startup mode proof for v1 must use `mode="startup"`.
- Report must not include docs-only `result`, `durationMs` or `truncated` display fields.

State transitions:

```text
idle -> booting -> collecting evidence -> closing -> report
```

## RuntimeCheckFace

Represents static diagnostic verification.

Fields:

- `Program`: required Logix Program.
- `options`: optional `CheckOptions`.
- `report`: `VerificationControlPlaneReport`.

Validation:

- Output must pass `ControlPlane.isVerificationControlPlaneReport`.
- Report stage must be `check`.
- Report mode must be `static`.
- It must not boot or execute Program behavior.

## DocsProgramSource

Represents a runnable Logix docs source.

Fields:

- `sourceText`: TypeScript or TSX source.
- `filename`: docs-local filename.
- `Program`: named export.
- `main`: named export.
- `kind`: `"program"`.

Validation:

- Must export exactly the named `Program` consumed by Check/Trial.
- Must export named `main` consumed only by docs Run.
- Must not require UI host semantics for v1.
- Imports and mocked HTTP remain gated until explicit proof.

## EffectSmokeSource

Represents a raw Effect smoke source.

Fields:

- `sourceText`: TypeScript or TSX source.
- `filename`: docs-local filename.
- `default`: default Effect or smoke value.
- `kind`: `"effect-smoke"`.

Validation:

- May run through smoke path.
- Must not expose Check/Trial controls.
- Must not produce `VerificationControlPlaneReport`.

## DocsRunProjection

App-local display object for Run output.

Fields:

- `runId`: stable string when supplied by caller.
- `ok`: boolean.
- `result`: optional JSON value when successful.
- `error`: optional object with `kind` and `message`.
- `durationMs`: number.
- `truncated`: optional boolean.

Validation:

- Must be JSON-safe.
- Must be bounded by explicit result and log budgets.
- Must fail `ControlPlane.isVerificationControlPlaneReport`.
- Must not contain `stage`, `mode`, `verdict`, `repairHints`, `focusRef`, `nextRecommendedStage` or compare admissibility fields.

Failure kinds:

- `compile`
- `timeout`
- `serialization`
- `worker`
- `runtime`

## DocsRunnerAdapter

Private app-local runner.

Fields:

- `source`: `DocsProgramSource` or `EffectSmokeSource`.
- `intent`: `"run" | "check" | "trial"`.
- `budgets`: result/log/report budgets.
- `sandbox`: browser transport service.
- `projection`: `DocsRunProjection` for Run, `VerificationControlPlaneReport` for Check/Trial.

Validation:

- `check` and `trial` are only valid for `DocsProgramSource`.
- `run` must return app-local projection.
- Worker transport may compile a wrapper, but public sandbox API must not expose runner-specific action family.

## SandboxTransportRun

Current browser transport output from sandbox worker.

Fields:

- `runId`
- `duration`
- `stateSnapshot`
- `logs`
- `traces`
- `uiIntents`
- optional kernel selection metadata

Validation:

- Remains transport-level.
- Does not become docs Run projection.
- Does not become verification report authority.
- Root package export guard must remain unchanged.

## Relationships

```text
DocsProgramSource.Program -> RuntimeCheckFace.Program
DocsProgramSource.Program -> RuntimeTrialFace.Program
DocsProgramSource.Program + DocsProgramSource.main -> RuntimeRunFace
RuntimeRunFace.result -> DocsRunProjection.result
RuntimeTrialFace.report -> VerificationControlPlaneReport
RuntimeCheckFace.report -> VerificationControlPlaneReport
DocsRunnerAdapter -> SandboxTransportRun
SandboxTransportRun.stateSnapshot -> app-local projection input
```
