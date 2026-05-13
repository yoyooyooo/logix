# Contracts: Runtime Playground Terminal Runner

This feature has TypeScript/runtime contracts rather than HTTP endpoints.

## Core Runtime Surface

Terminal public vocabulary:

```ts
import * as Logix from "@logixjs/core"

Logix.Runtime.check(Program, options)
Logix.Runtime.trial(Program, options)
Logix.Runtime.run(Program, main, options)
```

Result face:

```ts
export interface RunOptions<Args = unknown> extends OpenProgramOptions {
  readonly args?: Args
  readonly exitCode?: boolean
  readonly reportError?: boolean
}

export const run: <Sh, Args, A, E, R>(
  Program: AnyProgram,
  main: (ctx: ProgramRunContext<Sh>, args: Args) => Effect.Effect<A, E, R>,
  options?: RunOptions<Args>,
) => Promise<A>
```

Rules:

- `Runtime.run` returns the business/example result, not `VerificationControlPlaneReport`.
- `Runtime.runProgram` must not remain the docs-facing terminal name.
- If `runProgram` remains in source, it must be internal-only implementation vocabulary with a guard proving it is absent from live docs and public examples.

## Control-Plane Surface

Diagnostic faces:

```ts
Logix.Runtime.check(Program, options?) // VerificationControlPlaneReport
Logix.Runtime.trial(Program, options)  // VerificationControlPlaneReport
```

Rules:

- Check output must pass `Logix.ControlPlane.isVerificationControlPlaneReport`.
- Trial output must pass `Logix.ControlPlane.isVerificationControlPlaneReport`.
- Trial remains diagnostic-only.
- Check remains static-only.

## Docs Program Source Contract

Runnable Program example:

```ts
import { Effect } from "effect"
import * as Logix from "@logixjs/core"

export const Program = Logix.Program.make(RootModule, {
  initial: { count: 0 },
})

export const main = (ctx, args: { delta: number }) =>
  Effect.gen(function* () {
    const counter = yield* ctx.module
    yield* counter.$.state.mutate((state) => {
      state.count += args.delta
    })
    return { count: counter.$.snapshot().count }
  })
```

Rules:

- `Program` is the only value consumed by Check/Trial.
- `main` is consumed only by the docs Run adapter.
- Core, CLI and sandbox public root must not accept a new “module with main” entry kind.

## Docs Run Projection Contract

App-local projection shape:

```ts
type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

type DocsRunProjection =
  | {
      readonly runId: string
      readonly ok: true
      readonly result: JsonValue
      readonly durationMs: number
      readonly truncated?: boolean
    }
  | {
      readonly runId: string
      readonly ok: false
      readonly error: {
        readonly kind: "compile" | "timeout" | "serialization" | "worker" | "runtime"
        readonly message: string
      }
      readonly durationMs: number
      readonly truncated?: boolean
    }
```

Forbidden fields:

- `stage`
- `mode`
- `verdict`
- `repairHints`
- `focusRef`
- `nextRecommendedStage`
- compare admissibility fields

Required checks:

```ts
expect(Logix.ControlPlane.isVerificationControlPlaneReport(runProjection)).toBe(false)
expect(Logix.ControlPlane.isVerificationControlPlaneReport(trialReport)).toBe(true)
```

## Sandbox Public Surface Contract

Allowed root exports:

```ts
Object.keys(await import("@logixjs/sandbox")).sort()
// ["SandboxClientLayer", "SandboxClientTag"]
```

Allowed public subpath:

```text
@logixjs/sandbox/vite
```

Forbidden public exports:

- `PlaygroundRunResult`
- `RUN_EXAMPLE`
- `RUNTIME_CHECK`
- `RUNTIME_TRIAL`
- sandbox-owned report schema

## Browser Runner Adapter Contract

The docs adapter may compile wrapper code through existing transport:

```text
source -> COMPILE -> RUN -> transport output -> app-local projection
```

Rules:

- Worker protocol may remain `COMPILE + RUN`.
- Wrapper intent is app-local implementation detail.
- Run timeout and close timeout produce Run transport failure or bounded projection.
- Serialization failure cannot be reported as Trial failure.
- Trial report shape must come from core `ControlPlane`.

## Raw Effect Smoke Contract

Raw Effect source:

```ts
export default Effect.succeed({ ok: true })
```

Rules:

- May run through smoke path.
- Must not show Check/Trial controls.
- Must not return control-plane reports.
