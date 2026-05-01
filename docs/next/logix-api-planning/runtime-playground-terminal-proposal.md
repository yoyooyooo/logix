---
title: Runtime Playground Terminal Proposal
status: reviewed-draft
date: 2026-04-27
review: plan-optimality-loop
adopted_candidate: private-docs-runner-program-only-trial
---

# Runtime Playground Terminal Proposal

## Review Contract

- artifact_kind: implementation-plan
- review_goal: implementation-ready
- challenge_scope: open
- target_claim: Logix can support a pure runtime playground for non-UI Program examples while keeping verification trial inside the existing runtime control plane.
- owner refs:
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md`
  - `packages/logix-core/src/Runtime.ts`
  - `packages/logix-sandbox/src/Client.ts`
- background refs:
  - `docs/ssot/runtime/01-public-api-spine.md`
  - `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`

## Adopted Summary

Adopt a private docs runner adapter for non-UI Logix Program examples.

The terminal shape is:

- Core public authority remains `Program`.
- `Runtime.check` and `Runtime.trial` remain diagnostic control-plane routes.
- Docs example execution should use terminal API name `Runtime.run(Program, main, options)` inside an app-local adapter.
- Current implementation evidence comes from `Runtime.runProgram`; the terminal plan treats it as the implementation source to be renamed or folded into `Runtime.run`.
- `main` is a docs runner convention, not a new public authoring or CLI entry surface.
- Raw Effect examples are smoke-only and can show Run output, but they do not show Check or Trial panels.
- Sandbox remains browser host wiring and transport. It does not own a second report truth or a public playground contract.

## Problem

Current sandbox can still compile and run code in a browser worker, but its current model is shaped around an older compile/run kernel. The new verification model has already converged on a single machine report:

- `Runtime.check(Program, options?)`
- `Runtime.trial(Program, options)`
- `VerificationControlPlaneReport`

Docs need a CodeSandbox-like experience for examples:

- source
- run output
- optional compact diagnostic report

The risk is vocabulary collapse. If `trial` becomes a general example runner, the verification control plane loses its diagnostic meaning. If docs execution creates a named public report or artifact contract, it becomes a second truth source.

## Terminal Target

Use two docs actions backed by one runtime stack:

### Run

Purpose:

- Execute a non-UI Logix Program example.
- Return a small JSON projection for teaching and demo feedback.

Terminal runtime primitive:

- `Runtime.run(Program, main, options)`

Current implementation source:

- `Runtime.runProgram(Program, main, options)`

Authority:

- app-local docs adapter only
- no core root noun
- no public sandbox contract
- no CLI command

### Check / Trial

Purpose:

- Produce machine diagnostics for the same Program.
- Support Agent repair, CI proof, compare, and docs diagnostics.

Runtime primitive:

- `Runtime.check(Program, options?)`
- `Runtime.trial(Program, options)`

Authority:

- `@logixjs/core/ControlPlane`
- `VerificationControlPlaneReport`

## Frozen Decisions

### D0. Runtime session has two runtime faces

`Runtime.run` and `Runtime.trial` are the two running faces of the same temporary runtime session idea:

- `Runtime.run(Program, main, options)`: result face, executes `main(ctx,args)` and returns the example/business value.
- `Runtime.trial(Program, options)`: diagnostic face, boots and closes the Program and returns `VerificationControlPlaneReport`.

`Runtime.check(Program, options?)` remains the static face. The terminal public naming set is:

```ts
Runtime.check(Program, options?)
Runtime.trial(Program, options)
Runtime.run(Program, main, options)
```

The existing `Runtime.runProgram` name is treated as current implementation vocabulary to be renamed, replaced, or kept internal during cutover. It should not be the docs-facing terminal name.

### D1. Keep `trial` diagnostic-only

`trial` remains a verification word. It must return `VerificationControlPlaneReport`.

Docs may expose:

- `Run`: example output
- `Check`: static diagnostic report
- `Trial`: startup diagnostic report

The docs UI must not make Run output look like a verification report.

### D2. Do not add `Runtime.playground`

No new core root noun is accepted for v1.

The docs runner composes existing primitives:

- terminal `Runtime.run`, backed by current `Runtime.runProgram` implementation evidence
- `Runtime.check`
- `Runtime.trial`

If docs need convenience, it lives in `apps/docs` or a private example harness.

### D3. Program is the only Logix docs verification entry

For Logix runnable examples, the source convention is:

```ts
export const Program = ...

export const main = (ctx, args) =>
  Effect.gen(function* () {
    return { count: 2 }
  })
```

Rules:

- `Program` is the only entry consumed by Check and Trial.
- `main` is consumed only by the docs runner adapter when executing Run.
- Core, CLI, Runtime facade, and public sandbox API must not accept “module with main” as a new entry kind.
- `default Effect` is allowed only for internal Effect smoke examples. It does not enter the Logix Program docs triad.

### D4. Run result is a docs projection

Do not introduce a named public `PlaygroundRunResult`.

The app-local docs projection may display:

```ts
{
  runId: string
  ok: boolean
  result?: JsonValue
  error?: {
    kind: "compile" | "timeout" | "serialization" | "worker" | "runtime"
    message: string
  }
  durationMs: number
  truncated?: boolean
}
```

Hard limits:

- no `stage`
- no `mode`
- no `verdict`
- no `repairHints`
- no `focusRef`
- no `nextRecommendedStage`
- no compare admissibility meaning
- no artifact linking authority

Logs and trace-like data can exist behind an expanded details view, but they are not part of the primary docs projection.

### D5. V1 is Program-only non-UI execution

V1 covers non-UI Logix Program examples:

- state transitions
- `main(ctx,args)` result
- service/config examples only where the example itself provides the needed layer/config
- Program imports only after the docs runner proof covers imported child identity
- mocked HTTP only as a separate docs runner extension after baseline Run/Trial proof

V1 does not cover:

- interactive UI host trial
- React provider verification
- raw trace compare
- public scenario runner
- raw Effect examples with Trial panel

### D6. Docs layout defaults to Source + Run

Default visible layout:

- Source
- Run output

Diagnostics are available on demand:

- Check compact summary
- Trial compact summary
- Full report behind a collapsible JSON/artifact view

The Trial panel is shown only for Logix Program examples. It is not shown for raw Effect smoke examples.

### D7. Keep sandbox transport narrow

The terminal public sandbox surface stays:

- root `SandboxClientTag`
- root `SandboxClientLayer`
- `@logixjs/sandbox/vite`

Do not add public `PlaygroundRunResult`, public worker action families, or a sandbox-owned report type.

Implementation may continue to use `COMPILE + RUN` transport. Docs runner intent can be encoded in app-local wrapper code:

- `intent: "example"`
- `intent: "check"`
- `intent: "trial"`

Those intents are private docs adapter details. They do not own stage authority.

### D8. Failure and budget boundaries are mandatory

The docs runner must bound:

- run timeout
- close timeout
- worker lifecycle
- JSON serialization
- result size
- log size

Run failures are docs transport failures. Program dependency localization, repair hints, and next-stage scheduling must be expressed by Check or Trial through `VerificationControlPlaneReport`.

## Architecture

```text
docs source
  -> app-local docs runner adapter
    -> sandbox compile/import transport
      -> Run intent
        -> Runtime.run(Program, main, options)
        -> docs JSON projection
      -> Check intent
        -> Runtime.check(Program, options)
        -> VerificationControlPlaneReport
      -> Trial intent
        -> Runtime.trial(Program, options)
        -> VerificationControlPlaneReport
```

The app-local adapter owns source extraction and wrapper generation. Core owns runtime behavior and diagnostic reports.

## Proof Pack

### P1. Browser Program Run projection

Compile a docs source that exports `Program` and `main`.

Assert:

- Run succeeds.
- Output is JSON-safe.
- `runId` is stable when supplied.
- Result includes `durationMs`.
- Result does not pass `ControlPlane.isVerificationControlPlaneReport`.

### P2. Same-source Trial report

Use the same docs source and execute Trial against `Program`.

Assert:

- output passes `ControlPlane.isVerificationControlPlaneReport`
- `kind="VerificationControlPlaneReport"`
- `stage="trial"`
- `mode="startup"`
- `verdict` exists
- `nextRecommendedStage` exists

### P3. Shape separation guard

Assert hard separation:

- Run projection has no `stage / mode / verdict / repairHints / focusRef / nextRecommendedStage`.
- Trial report has no docs-only `result / durationMs / truncated`.
- Raw Effect smoke source cannot trigger Trial.

### P4. Failure and budget guard

Assert:

- run timeout returns docs transport failure
- close timeout returns docs transport failure for Run
- non-JSON result returns serialization failure
- oversized result is rejected or truncated with `truncated=true`
- oversized logs are truncated outside the primary projection

### Hygiene Prerequisites

These are required before docs playground confidence can be trusted, but they are not part of the minimal proof pack:

- remove skip-based `FieldKernel` sandbox smoke confidence
- replace removed public subpath examples with canonical root import examples
- remove Effect V3-style `LogLevel.greaterThanEqual` test code

## Implementation Waves

### Wave 1. Contract and tests

- Add docs runner projection tests.
- Add Trial report tests for the same Program source.
- Add shape separation tests.
- Add timeout, close, serialization, and budget tests.

### Wave 2. App-local docs adapter

- Build wrapper generation under `apps/docs` or docs-only support.
- Keep `main` private to this adapter.
- Keep sandbox root export unchanged.
- Keep worker protocol narrow.

### Wave 3. Docs UI

- Source + Run output as default visible surface.
- Check/Trial compact diagnostics as opt-in.
- Full report collapsible.
- No raw trace as first-viewport material.

### Wave 4. Future upgrades

Only after the relevant owner lands the capability:

- `trial(mode="scenario")`
- host deep trial
- UI interaction runner
- compare integration from docs examples

These upgrades must continue to return to `VerificationControlPlaneReport` for diagnostics.

## Rejected Alternatives

### A. Use `Runtime.trial` as example runner

Rejected because it overloads diagnostic vocabulary and weakens Agent repair semantics.

### B. Add `Runtime.playground`

Rejected because v1 can be assembled from existing runtime primitives without a new public noun.

### C. Publish a sandbox playground result contract

Rejected because it creates another transport authority beside sandbox `RunResult`, CLI `CommandResult`, and `VerificationControlPlaneReport`.

### D. Make raw Effect examples first-class runnable Logix docs examples

Rejected because they cannot produce Program-owned Check/Trial reports.

### E. Make UI host trial the v1 milestone

Rejected because non-UI Program execution is enough to prove docs playground value, while host deep trial remains future.

## Assumption Resolution

- A1 kept with constraint: Run and Trial labels can coexist only for Program examples; raw Effect examples only Run.
- A2 kept with constraint: terminal `Runtime.run` is the execution primitive, current `Runtime.runProgram` is implementation evidence, and `main` is private docs adapter convention.
- A3 kept with constraint: useful browser results must be JSON-safe and budgeted.
- A4 kept with constraint: sandbox public surface remains unchanged.

## Acceptance Bar

Implementation may start when the plan has:

- one Logix docs entry convention: `Program + main`
- no new core root noun
- no public sandbox playground contract
- no default Trial for raw Effect examples
- browser Run proof for non-UI Program examples
- same-source Trial proof returning `VerificationControlPlaneReport`
- shape separation proof between Run projection and Trial report
- failure and budget proof for Run
