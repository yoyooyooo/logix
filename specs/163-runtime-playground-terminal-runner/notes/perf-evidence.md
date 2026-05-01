# Perf Evidence

Date: 2026-04-27

`163` changed public naming, docs/sandbox runner projection and one proof-kernel scope binding. It did not change the hot StateTransaction path, field-kernel convergence, selectors or TickScheduler.

Runtime result face:

- `Runtime.run` delegates to the existing `ProgramRunner.run` path.
- `Runtime.run` returns the `main(ctx,args)` result and does not allocate a `VerificationControlPlaneReport`.
- The public `Runtime.runProgram` alias was not retained.

Browser docs runner:

- JSON projection is bounded by `resultMaxBytes`.
- Non-JSON values fail as `serialization`.
- Log overflow marks the projection as `truncated` without adding logs to the primary projection.
- Worker timeout terminates the worker and reports a transport timeout.
- Close timeout is visible as Run transport failure, while Trial remains the diagnostic report route.

Proof-kernel adjustment:

- `internal/verification/proofKernel.ts` now forks the proof effect with explicit `Effect.forkIn(scope)` instead of relying on an ambient scoped fork.
- This fixes browser worker `Runtime.trial` execution where no ambient `Scope` service is provided by the caller.
- Core `Runtime.trial` contract and trial timeout tests passed after the change.

Benchmark collection:

- Full perf benchmark collection was not required because no runtime hot path or scheduler semantics changed.
- Evidence is limited to targeted core runtime tests and sandbox browser budget guards.
