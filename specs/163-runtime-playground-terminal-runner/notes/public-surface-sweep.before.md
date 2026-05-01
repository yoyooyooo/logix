# Public Surface Sweep Before 163 Implementation

Date: 2026-04-27

Command:

```bash
rtk rg -n "Runtime\\.runProgram|runProgram|Runtime\\.run\\(|Runtime\\.trial\\(|Runtime\\.check\\(|Runtime\\.playground|PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL" packages/logix-core packages/logix-sandbox apps/docs docs/ssot docs/standards examples/logix -g '!docs/archive/**'
```

Findings:

- `Runtime.runProgram` is public in `packages/logix-core/src/Runtime.ts`.
- `packages/logix-core/src/index.ts` comments still list `runProgram`.
- Core run behavior tests are named `Runtime.runProgram.*`.
- `packages/logix-core/test/Contracts/KernelBoundary.test.ts` expects `Logix.Runtime.runProgram`.
- `packages/logix-perf-evidence/scripts/024-root-runtime-runner.boot.ts` benchmarks the old public name.
- User docs mention `Runtime.runProgram/openProgram` in scope/resource lifetime pages.
- `Runtime.trial` and `Runtime.check` hits are expected diagnostic routes.
- No current hit for `Runtime.playground`, `PlaygroundRunResult`, `RUN_EXAMPLE`, `RUNTIME_CHECK`, or `RUNTIME_TRIAL` in the swept live paths.

Classification:

- Must cut from docs-facing public surface: `Runtime.runProgram`.
- Allowed internal-only residue after cutover: `ProgramRunner.runProgram` implementation name, if guarded from public docs-facing routes.
- Allowed diagnostics vocabulary: `Runtime.trial`, `Runtime.check`, `RUNTIME_TRIAL_FAILED`.
