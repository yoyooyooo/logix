# Quickstart: Runtime Playground Terminal Runner

This is the implementation checklist for `163`.

## 1. Confirm Planning Artifacts

```bash
rtk find specs/163-runtime-playground-terminal-runner -maxdepth 3 -type f | sort
rtk rg -n "NEEDS CLARIFICATION|TODO|placeholder|\\$ARGUMENTS|\\[FEATURE\\]|\\[DATE\\]" specs/163-runtime-playground-terminal-runner
```

Expected files:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/README.md`
- `quickstart.md`
- `checklists/requirements.md`

## 2. Start Implementation State

When implementation begins:

```bash
rtk /Users/yoyo/Documents/code/personal/logix.worktrees/next-api/.codex/skills/speckit/scripts/bash/update-spec-status.sh --ensure --status Active --feature 163
```

## 3. Core Runtime Cutover

Targets:

- `packages/logix-core/src/Runtime.ts`
- `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`
- `packages/logix-core/test/Runtime/*`
- `packages/logix-core/test/Contracts/*`

Required result:

- `Runtime.run(Program, main, options)` is public.
- `Runtime.trial(Program, options)` remains diagnostic-only.
- `Runtime.check(Program, options?)` remains static-only.
- `Runtime.runProgram` is removed from docs-facing public usage or proven internal-only.

Suggested focused checks:

```bash
rtk pnpm --filter @logixjs/core test -- test/Runtime/Runtime.run.basic.test.ts
rtk pnpm --filter @logixjs/core test -- test/Contracts/VerificationControlPlaneContract.test.ts
```

## 4. Browser Docs Runner Proof

Targets:

- `packages/logix-sandbox/src/Client.ts`
- `packages/logix-sandbox/src/Service.ts`
- `packages/logix-sandbox/src/internal/worker/sandbox.worker.ts`
- `packages/logix-sandbox/test/browser/*`
- app-local docs runner files under `apps/docs`

Required result:

- Program source exports `Program` and `main`.
- Browser Run returns bounded JSON projection.
- Same source can produce Trial report through core control plane.
- Raw Effect smoke source cannot trigger Trial.

Suggested focused checks:

```bash
rtk pnpm --filter @logixjs/sandbox typecheck
rtk pnpm --filter @logixjs/sandbox test:browser
```

## 5. Public Surface and Shape Guards

Run these sweeps during implementation:

```bash
rtk rg -n "Runtime\\.runProgram|PlaygroundRunResult|RUN_EXAMPLE|RUNTIME_CHECK|RUNTIME_TRIAL|Runtime\\.playground" docs apps packages examples -g '!docs/archive/**'
rtk rg -n "Runtime\\.run\\(|Runtime\\.trial\\(|Runtime\\.check\\(" docs apps packages/logix-core packages/logix-sandbox examples -g '!docs/archive/**'
```

Expected:

- Live docs and public examples use `Runtime.run / Runtime.trial / Runtime.check`.
- Remaining `Runtime.runProgram` hits, if any, are internal-only implementation evidence or archived/proposal history.
- No forbidden public sandbox playground vocabulary appears in live authority surfaces.

## 6. SSoT and User Docs Writeback

Update after behavior lands:

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/standards/logix-api-next-guardrails.md` if public guard vocabulary changes
- `apps/docs/content/docs/api/core/runtime.cn.md`
- `apps/docs/content/docs/api/core/runtime.md`

Required docs line:

```text
Runtime.run is the result face. Runtime.trial is the diagnostic run face. Runtime.check is the static diagnostic face.
```

## 7. Final Verification

Minimum targeted gate:

```bash
rtk pnpm --filter @logixjs/core typecheck
rtk pnpm --filter @logixjs/core test
rtk pnpm --filter @logixjs/sandbox typecheck
rtk pnpm --filter @logixjs/sandbox test
rtk pnpm --filter @logixjs/sandbox test:browser
```

Workspace gate when feasible:

```bash
rtk run 'pnpm typecheck'
rtk run 'pnpm lint'
rtk run 'pnpm test:turbo'
```

## 8. Close Spec

Only after witness set and writeback pass:

```bash
rtk /Users/yoyo/Documents/code/personal/logix.worktrees/next-api/.codex/skills/speckit/scripts/bash/update-spec-status.sh --ensure --status Done --feature 163
```
