# Public Surface Sweep After 163 Implementation

Date: 2026-04-27

Forbidden vocabulary command:

```bash
rtk rg -n "Runtime\\.runProgram|PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|Runtime\\.playground" docs apps packages examples -g '!docs/archive/**'
```

Findings:

- No `Runtime.runProgram` hit remains in live runtime SSoT, runtime API docs, `packages/logix-core/src/Runtime.ts`, `packages/logix-core/src/index.ts`, sandbox public source, or examples.
- No public `Runtime.playground` implementation exists.
- No public `PlaygroundRunResult` type exists.
- No public worker action family `RUN_EXAMPLE / RUNTIME_CHECK / RUNTIME_TRIAL` exists.
- Remaining forbidden-vocabulary hits are negative guard assertions in `packages/logix-sandbox/test/Client/Client.TrialBoundary.test.*`, proposal/review planning history under `docs/next`, `docs/review-plan`, `docs/proposals`, `docs/superpowers/plans`, and the core trial failure code `RUNTIME_TRIAL_FAILED` in runtime source and sandbox bundled runtime fixtures.
- `RUNTIME_TRIAL_FAILED` is a trial error code, not a public worker action family.

Runtime result-face residue command:

```bash
rtk rg -n "Runtime\\.runProgram|runProgram" packages/logix-core packages/logix-sandbox apps/docs docs/ssot docs/standards examples -g '!docs/archive/**'
```

Allowed residue:

- `packages/logix-core/test/Contracts/RuntimeRun.contract.test.*` contains negative assertions proving `Runtime.runProgram` is not public.
- `packages/logix-core/test/internal/Flow/FlowRuntime.test.*` uses a local helper variable named `runProgram`, unrelated to `Logix.Runtime.runProgram`.
- `examples/logix-react/test/module-flows.integration.test.*` calls `TestProgram.runProgram`, a test package helper, not the runtime public face.

Conclusion:

- Public runtime vocabulary is `Runtime.run / Runtime.trial / Runtime.check`.
- Sandbox public root stays transport-only and does not expose a playground result/report contract.
