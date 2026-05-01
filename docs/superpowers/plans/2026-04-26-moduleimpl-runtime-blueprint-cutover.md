# Program Runtime Blueprint Cutover Implementation Plan

> Status: executed in this branch. Keep this file as the implementation record and final sweep checklist.

## Goal

Remove `ModuleImpl` from the public surface and main reading path.

The final public formula is:

```ts
Module.logic(id, build)
Program.make(Module, config)
Runtime.make(Program)
```

The internal runnable blueprint is `ProgramRuntimeBlueprint`. It is stored behind a symbol on `Program` and may only be reached by core internals or narrow repo-internal helpers.

## Final Decisions

- Public `Program` does not expose `.impl` or `.blueprint`.
- Public `Runtime.make`, `Runtime.check`, `Runtime.trial`, `Runtime.openProgram`, and `Runtime.runProgram` accept `Program`.
- React public host projection keeps two routes:
  - `useModule(ModuleTag)` for provider-scope lookup.
  - `useModule(Program, options?)` for local instantiation.
- `capabilities.imports` accepts child `Program` values.
- Raw runtime blueprint access is internal only.
- No permanent migration guard test is kept. Do not add `moduleimpl-boundary.test.ts` or equivalent one-off boundary tests.

## Implementation Slices

### 1. Core Runtime

- Use `packages/logix-core/src/internal/program.ts` as the symbol-owned bridge:
  - `attachProgramRuntimeBlueprint`
  - `getProgramRuntimeBlueprint`
  - `hasProgramRuntimeBlueprint`
  - `getProgramBlueprintId`
- Keep `ProgramRuntimeBlueprint` in `packages/logix-core/src/internal/runtime/core/module.ts`.
- Remove public `ModuleImpl` family names and public `Program` implementation fields.
- Keep `ModuleTag.implement(...)` as an internal construction primitive until a deeper internal assembler split lands.
- Keep `Program.make(...)` aligned with SSoT:
  - `initial`
  - `capabilities.services`
  - `capabilities.imports`
  - `logics`
  - `stateTransaction`
- Do not add `processes` or `workflows` to the public `Program.make(...)` config.

### 2. Repo-Internal Bridge

- Use `packages/logix-core/src/internal/runtime-contracts.ts` for narrow in-repo access needed by React and perf evidence.
- Expose runtime blueprint helpers from repo-internal only.
- Keep perf-only process baselines on repo-internal helpers and internal assembler paths, without reopening public root namespaces.

### 3. React Host

- Keep public examples and tests on `useModule(Program)` unless the test explicitly covers an internal blueprint helper.
- Internal blueprint hook tests may import repo-internal helpers.
- Trace and perf vocabulary uses `Program`, `programResolveMs`, and `e2e.bootToProgramReadyMs`.

### 4. Tests And Specs

- Rename formal tests by final behavior or contract, for example `ProgramRuntimeBlueprint.test.ts`.
- Do not add or keep migration-only tests such as `moduleimpl-boundary.test.ts`.
- Active docs and specs should not teach `.impl` as public authoring, imports, runtime root, or React host syntax.
- Internal implementation filenames such as `ModuleRuntime.impl.ts` or `source.impl.ts` are allowed when clearly used as file paths.

## Verification Checklist

Run the following from repo root:

```bash
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-react typecheck
pnpm -C packages/logix-test typecheck
pnpm -C packages/logix-perf-evidence typecheck
```

Focused tests:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Module/ProgramRuntimeBlueprint.test.ts \
  test/Runtime.make.Program.test.ts \
  test/Runtime.runProgram.basic.test.ts \
  --silent=passed-only --reporter=dot --hideSkippedTests

pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useModule.test.tsx \
  test/RuntimeProvider/RuntimeProvider.preload.test.tsx \
  test/internal/hooks/useProgramRuntimeBlueprint.internal.test.tsx \
  --silent=passed-only --reporter=dot --hideSkippedTests

pnpm -C packages/logix-test test
```

Final one-off sweep:

```bash
rg -n "\bModuleImpl\b|\bModuleImplementStateTransactionOptions\b|\bModuleImplOptions\b|\bModuleImplSyncOptions\b|\bModuleImplSuspendOptions\b|\buseModuleImpl\b|moduleImplMode|moduleImplResolve|bootToModuleImplReadyMs|trace:react\.moduleImpl\.resolve" \
  packages/logix-core/src packages/logix-react/src packages/logix-test/src \
  packages/logix-core/test packages/logix-react/test packages/logix-react/test-dts packages/logix-test/test \
  apps/docs/content docs/ssot docs/standards docs/proposals docs/next/logix-api-planning examples scripts specs \
  --glob '!docs/archive/**' \
  --glob '!**/perf/**' \
  --glob '!apps/docs/public/**' \
  --glob '!apps/api-reference/dist/**' \
  --glob '!packages/logix-sandbox/public/sandbox/**' \
  --glob '!packages/logix-sandbox/dist/**' \
  --glob '!node_modules/**' \
  --glob '!**/*.map'

test ! -e scripts/repo-boundaries/moduleimpl-boundary.test.ts
```

Expected result: the sweep prints no matches and the migration helper test path does not exist.

## Verified In This Run

- `pnpm -C packages/logix-core typecheck`: PASS
- `pnpm -C packages/logix-react typecheck`: PASS
- `pnpm -C packages/logix-test typecheck`: PASS
- `pnpm -C packages/logix-perf-evidence typecheck`: PASS
- `pnpm -C examples/logix-sandbox-mvp typecheck`: PASS
- `pnpm -C examples/logix typecheck`: PASS
- `pnpm -C examples/logix-react typecheck`: PASS
- Core focused tests: PASS
- React focused tests: PASS
- `pnpm -C packages/logix-test test`: PASS
- `ModuleImpl` family sweep: zero matches
- `scripts/repo-boundaries/moduleimpl-boundary.test.ts`: absent

## Allowed Residuals

- `ProgramRuntimeBlueprint` in core internals, repo-internal contracts, and internal React helper tests.
- `.impl` inside internal implementation filenames or internal service implementation variables.
- Historical perf evidence and archived docs.

## Not Allowed

- Public `Program.impl`.
- Public `Program.blueprint`.
- Public `ModuleImpl` family types, hooks, trace names, metrics, docs, examples, or tests.
- `Program.make(..., { processes })` as public authoring syntax.
