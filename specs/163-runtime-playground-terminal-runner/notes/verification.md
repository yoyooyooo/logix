# Verification Record

Date: 2026-04-27

## Core

Passed:

```bash
rtk pnpm typecheck
```

Workdir: `packages/logix-core`

Passed:

```bash
rtk pnpm test -- test/Contracts/RuntimeRun.contract.test.ts
```

Result: `1` file passed, `3` tests passed.

Passed:

```bash
rtk pnpm test -- test/Contracts/RuntimeRun.contract.test.ts test/Runtime/Runtime.run.basic.test.ts test/Runtime/Runtime.run.args.test.ts test/Runtime/Runtime.run.dispose.test.ts test/Runtime/Runtime.run.disposeTimeout.test.ts test/Runtime/Runtime.run.errorCategory.test.ts test/Runtime/Runtime.run.reportError.test.ts test/Runtime/Runtime.run.transactionGuard.test.ts test/Runtime/Runtime.trial.runId.test.ts test/Contracts/RuntimeCheck.contract.test.ts test/Contracts/VerificationControlPlaneContract.test.ts
```

Result: `11` files passed, `27` tests passed after `RuntimeCheck.contract.test.js` was synchronized with the TypeScript contract.

## Sandbox

Passed:

```bash
rtk pnpm typecheck
```

Workdir: `packages/logix-sandbox`

Passed:

```bash
rtk pnpm test -- test/Client/Client.TrialBoundary.test.ts
```

Result: `1` file passed, `3` tests passed.

Passed:

```bash
rtk pnpm test:browser -- test/browser/sandbox-run-projection.contract.test.ts test/browser/sandbox-run-budget-guards.browser.test.ts
```

Result: browser project ran `8` files, `19` tests passed. This includes Program Run projection, serialization/result/log budgets, worker timeout, close timeout, same-source Run/Trial shape separation and existing worker smoke coverage.

Passed:

```bash
rtk pnpm test:browser -- test/browser/sandbox-program-runner.browser.test.ts test/browser/sandbox-run-budget-guards.browser.test.ts test/browser/sandbox-run-trial-shape-separation.browser.test.ts
```

Result: browser project ran `7` files, `18` tests passed after close-timeout witness was added.

## Docs

Passed:

```bash
rtk pnpm types:check
```

Workdir: `apps/docs`

Passed:

```bash
rtk pnpm build
```

Workdir: `apps/docs`

Observed warnings:

- existing API reference docgen warnings for undocumented internal referenced types
- existing `baseline-browser-mapping` freshness warning
- existing Next metadataBase warning

No warning blocked the docs build.

## Workspace Gates

Passed:

```bash
rtk run 'pnpm typecheck'
```

Workdir: repository root

Result: passed. The command entered the root package script and ran `pnpm -r --workspace-concurrency=1 typecheck` across `25` of `26` workspace projects.

Follow-up applied during closure:

- `package.json`: root `typecheck` now uses `pnpm -r --workspace-concurrency=1 typecheck` to keep recursive package typechecking deterministic.
- `tsconfig.json` and `tsconfig.root.d.ts`: root TypeScript config now behaves as a workspace base config with a root-only placeholder input, so accidental bare root `tsc --noEmit` no longer scans every app, example, package, script and fixture.
- `rtk pnpm typecheck` now also exits successfully, but `rtk run 'pnpm typecheck'` remains the recorded workspace gate because it proves the real root package script path.

Passed:

```bash
rtk pnpm typecheck
```

Workdir: repository root

Result: passed after the root `tsconfig` guard above.

Passed:

```bash
rtk run 'pnpm lint'
```

Workdir: repository root

Result: passed. `lint:oxlint` reported `0` warnings and `0` errors, then `lint:eslint` completed successfully.

Follow-up applied during closure:

- `packages/logix-core/src/internal/runtime/core/HostScheduler.ts` and `.js`: replaced `??=` style initialization with explicit `if`.
- `apps/docs/src/components/mdx/Mermaid.tsx` and `.js`: replaced `??=` style initialization with explicit `if`, and replaced `replaceAll` with regex `replace` to avoid root `tsc` lib drift in a touched file.

Passed:

```bash
rtk run 'pnpm test:turbo'
```

Workdir: repository root

Result: passed.

Package phase:

- `14` tasks successful, `14` total.
- Final rerun had `0` cached package tasks after closure edits, so package tests executed.

Scripts phase:

- `10` files passed.
- `32` tests passed.

Targeted public-submodules script proof:

```bash
rtk pnpm exec vitest run scripts/public-submodules/verify.test.ts scripts/public-submodules/verify.test.js --silent=passed-only --reporter=dot --hideSkippedTests
```

Result: `2` files passed, `8` tests passed.

Closure fix: `scripts/public-submodules/verify.ts` and `.js` now ignore generated `.js/.jsx` sidecars when a same-basename `.ts/.tsx` source exists. This fixed the script fixture failure that previously blocked `pnpm test:turbo`.

Known non-163 full verifier debt:

```bash
rtk pnpm verify:public-submodules
```

Result: failed with `358` broad workspace structure violations. This is outside the required 163 quickstart gates and was not treated as a 163 completion blocker. Representative categories include nonconforming root `src/` directories, internal-import test placement debt, missing package `src/`, and existing cross-package internal imports.

Closure note: all required 163 witnesses and workspace gates passed. T065 is checked and the spec status has been moved to `Done`.
