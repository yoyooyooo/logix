# Quickstart: Kernel Release Gate Profile

This profile is repo-local. It uses existing commands, tests, perf artifacts and text sweeps. It does not introduce `logix challenge` or a public `KernelStabilityReport`.

## 1. Verify CLI Schema And Result Boundaries

```bash
rtk diff -u packages/logix-cli/src/schema/commands.v1.json skills/logix-cli/references/commands.v1.json
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/command-schema.guard.test.ts test/Integration/command-result-transport.contract.test.ts test/Integration/live-command-result.contract.test.ts
```

Expected:

- package schema and skill mirror match
- public roots remain `check`, `trial`, `compare`, `live`
- verification output uses `primaryReportOutputKey`
- live output uses `primaryLiveOutputKey`
- live output excludes verdict, repair hints, next stage and primary report fields

## 2. Verify Offline Repair Closure Proof Exists

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/exact-rerun-coordinate.contract.test.ts test/Integration/repair-closure.program-assembly.e2e.test.ts test/Integration/repair-closure.source-declaration.e2e.test.ts test/Integration/repair-closure.dependency.e2e.test.ts test/Integration/compare.command.test.ts
```

Expected:

- before reports are machine-readable
- repair targets are linked by focus refs or artifact keys
- rerun coordinates are recoverable
- compare returns pass, fail or inconclusive with admissibility evidence

## 3. Verify Live Evidence Boundary

```bash
rtk pnpm --filter @logixjs/cli test -- --run test/Integration/live-namespace.contract.test.ts test/Integration/live-command-result.contract.test.ts test/Integration/live-evidence-handoff.e2e.test.ts
```

Expected:

- no flat live root is required
- live evidence can be handed to trial or compare
- repair hints appear only after verification consumes live-derived evidence

## 4. Verify Rejected Vocabulary

```bash
rtk rg -n "logix challenge|logix debug|logix describe|--describe-json|KernelStabilityReport|Runtime\\.compare\\(" docs/ssot specs/190-kernel-release-gate-profile skills/logix-cli packages/logix-cli/src/schema
```

Expected:

- no hits in public command contract or Agent recipe as a supported route
- any hit is explicitly rejected, out-of-scope, negative-only or historical

## 5. Verify Hot-Path Gate When Runtime Rows Are Touched

If a change touches selector route, selector fingerprint, path authority, dirty/read overlap, external store publish, RuntimeStore notify, Form list scope, diagnostics-off cost or live disabled path, follow the owner spec and `02`:

```bash
rtk pnpm perf collect -- --profile default --out specs/<active-spec>/perf/before.<sha>.<envId>.default.json
rtk pnpm perf collect -- --profile default --out specs/<active-spec>/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/<active-spec>/perf/before.<sha>.<envId>.default.json --after specs/<active-spec>/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/<active-spec>/perf/diff.before__after.json
rtk pnpm perf validate -- --report specs/<active-spec>/perf/after.<sha-or-worktree>.<envId>.default.json
```

Expected:

- comparable evidence is present
- touched claimed suites have no unexplained regressions or budget failures
- after-only evidence may classify risk but cannot close a performance improvement claim

## 6. Verify Spec Extraction And Diff Hygiene

```bash
rtk .codex/skills/speckit/scripts/bash/extract-coded-points.sh --feature 190 --json
rtk git diff --check -- docs/ssot/runtime/16-agent-self-verification-scenario-matrix.md docs/ssot/runtime/15-cli-agent-first-control-plane.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/02-hot-path-direction.md specs/189-discovery-consumption-contract/spec.md specs/190-kernel-release-gate-profile/spec.md specs/190-kernel-release-gate-profile/plan.md specs/190-kernel-release-gate-profile/tasks.md specs/190-kernel-release-gate-profile/quickstart.md specs/190-kernel-release-gate-profile/checklists/requirements.md specs/README.md skills/logix-cli/SKILL.md
```

Expected:

- FR/NFR/SC coded points are extractable
- no whitespace errors in changed files
