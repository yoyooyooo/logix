# Research: Runtime Playground Terminal Runner

## Decision 1: Public result face is `Runtime.run`

**Decision**: Expose the terminal result-facing one-shot entry as `Runtime.run(Program, main, options)`.

**Rationale**: The runtime session vocabulary becomes compact:

- `Runtime.check`: static diagnostic face
- `Runtime.trial`: running diagnostic face
- `Runtime.run`: running result face

This aligns with the reviewed proposal and removes the current naming mismatch where `runProgram` reads like an implementation detail while `trial` carries the diagnostic route.

**Alternatives considered**:

- Keep `Runtime.runProgram`: rejected because it remains the docs-facing terminal name and weakens the `run / trial / check` triad.
- Add `Runtime.playground`: rejected because it adds a root noun without proof of dominance and risks a second product surface.
- Make `Runtime.trial` return example results: rejected because Trial must remain machine diagnostics.

## Decision 2: `Runtime.runProgram` is implementation evidence only

**Decision**: Use existing `Runtime.runProgram` behavior as implementation evidence, then rename, replace, or internalize it during cutover. Do not keep a public compatibility alias for imagined users.

**Rationale**: The repo is forward-only and has zero compatibility burden. Existing tests around args, boot, main error, dispose, dispose timeout, reportError and transaction guard are valuable behavior witnesses, but the public name should move.

**Alternatives considered**:

- Keep both `run` and `runProgram`: rejected because it creates two public names for one result face.
- Deprecate `runProgram`: rejected because deprecation only serves non-existent stored users.

## Decision 3: Docs runner adapter is app-local

**Decision**: The docs runner consumes source that exports `Program` and `main`, then invokes `Runtime.run(Program, main, options)` for Run and `Runtime.check/trial(Program, options)` for diagnostics.

**Rationale**: `Program` remains the Logix verification entry. `main` stays a docs-local convention for example output. This prevents a new core, CLI or sandbox entry kind shaped as “module with main”.

**Alternatives considered**:

- Make `main` a core runtime entry: rejected because it expands public authoring surface.
- Make the sandbox own a docs runner contract: rejected because sandbox should remain transport and browser host wiring.
- Use default Effect as Logix docs contract: rejected because raw Effect has no Program authority for Check/Trial.

## Decision 4: Browser transport stays `COMPILE + RUN`

**Decision**: Keep sandbox worker protocol at the existing `COMPILE + RUN` transport for v1. Encode docs-specific wrapper code inside the app-local adapter or tests.

**Rationale**: The worker already compiles source and executes a default Effect. A docs adapter can compile a wrapper that imports the compiled example, calls `Runtime.run`, `Runtime.check` or `Runtime.trial`, and returns a bounded JSON value. This avoids public worker action families.

**Alternatives considered**:

- Add `RUN_EXAMPLE`, `RUNTIME_CHECK`, `RUNTIME_TRIAL`: rejected because public-looking action names duplicate control-plane stage vocabulary.
- Add a sandbox-owned Trial report schema: rejected because core `ControlPlane` owns report truth.

## Decision 5: Run projection is app-local and JSON bounded

**Decision**: Run output is a small app-local projection with `runId`, `ok`, `result` or `error`, `durationMs` and optional `truncated`. It is not named as a public type.

**Rationale**: Docs need stable display output, while agents need machine diagnostics from Check/Trial. Keeping Run projection small and unnamed prevents it from becoming a second report authority.

**Alternatives considered**:

- Public `PlaygroundRunResult`: rejected because it creates another long-lived contract.
- Reuse `VerificationControlPlaneReport` for Run: rejected because result display and diagnostic report have different semantics.

## Decision 6: Shape separation is a first-class proof

**Decision**: The same Program source must have two proof paths:

- Run projection fails `ControlPlane.isVerificationControlPlaneReport`.
- Trial output passes `ControlPlane.isVerificationControlPlaneReport`.

**Rationale**: This directly protects the core boundary the user asked about: `run` and `trial` are two faces of a temporary runtime session idea, but their result shapes must stay separate.

**Alternatives considered**:

- Rely on naming only: rejected because agents and docs code need machine-testable separation.
- Put Trial summary fields into Run projection: rejected because it blurs report authority.

## Decision 7: Raw Effect examples are smoke-only

**Decision**: Raw Effect smoke examples may show Run output, but they cannot show Check/Trial and cannot produce control-plane reports.

**Rationale**: Check/Trial require Program authority. A skipped or fake Trial for raw Effect would mislead readers and agents.

**Alternatives considered**:

- Wrap raw Effect into Program automatically: rejected because it hides a new authoring conversion path.
- Show disabled Trial panel on raw Effect examples: rejected because v1 should keep default docs surface tight.

## Decision 8: Performance evidence is bounded-envelope proof

**Decision**: Treat this as runtime entry and browser envelope work. Require perf evidence only if `ProgramRunner`, runtime lifecycle or transaction guard semantics change beyond naming. Always require budget tests for browser Run projection.

**Rationale**: The high-risk runtime hot paths are not intended to change. The meaningful v1 performance risk is unbounded browser serialization, logs and lifecycle wait.

**Alternatives considered**:

- Require full perf suite for naming and docs adapter only: rejected because it does not measure the actual risk.
- Skip perf discussion: rejected because runtime result face touches public execution vocabulary.
