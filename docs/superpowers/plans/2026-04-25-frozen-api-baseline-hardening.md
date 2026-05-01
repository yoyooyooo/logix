# Frozen API Baseline Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the last implementation gaps against the current frozen Logix API baseline by adding `Runtime.check` and hardening public surface drift guards.

**Architecture:** Keep the frozen public shape unchanged. Add the missing static verification facade on `Logix.Runtime`, then lock the existing Form, React, row-owner, selector, scenario, compare, docs, and example boundaries with focused tests. `runtime.compare` root productization and companion `void` callback exact inference remain deferred.

**Tech Stack:** TypeScript, Effect v4 beta, Vitest, `@effect/vitest`, pnpm, Markdown control-plane docs

---

## Bound Inputs

- `docs/ssot/capability/03-frozen-api-shape.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/next/logix-api-planning/gap-sweep-001-frozen-shape-implementation-inventory.md`
- `docs/next/logix-api-planning/api-implementation-gap-ledger.md`
- `docs/next/logix-api-planning/post-conv-implementation-task-queue.md`

## Non-Goals

- Do not implement `TASK-003`.
- Do not add `Runtime.compare` root productization.
- Do not add public scenario carrier vocabulary.
- Do not add public `Form.Path`, schema path builder, public row owner token, Form-owned hook family, or generic `Fact / SoftFact`.
- Do not reopen companion imperative `void` callback exact inference.
- Do not add compatibility shells.

## File Structure

- `packages/logix-core/src/Runtime.ts`
  - Add `Runtime.check` and its type aliases.
  - Reuse existing manifest/static IR extraction and `VerificationControlPlaneReport`.
- `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
  - New focused contract for static control-plane check.
- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
  - Keep report shell and stage/mode guard coverage current.
- `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
  - Confirm root namespace stays at `ControlPlane / Module / Program / Runtime`.
- `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`
  - New root export allowlist for `@logixjs/form`.
- `packages/logix-react/src/FormProjection.ts`
  - Keep only public projection helpers and type exports.
- `packages/logix-react/src/internal/formProjection.ts`
  - New internal home for descriptor normalization and raw landing-path readers consumed by hooks.
- `packages/logix-react/src/internal/hooks/useSelector.ts`
  - Import internal descriptor helpers from the internal file.
- `packages/logix-react/test/Contracts/ReactRootBarrel.allowlist.test.ts`
  - New root export and forbidden helper leak guard.
- `packages/logix-react/test/Hooks/useSelector.type-safety.test.ts`
  - Strengthen sealed selector input and helper leak type checks.
- `packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx`
  - Keep companion descriptor runtime behavior green through the single host gate.
- `packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts`
  - Keep Form-owned descriptor opacity and negative-space checks.
- `packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts`
  - Keep row owner retained harness green.
- `apps/docs/content/docs/form/selectors.md`
- `apps/docs/content/docs/form/selectors.cn.md`
- `apps/docs/content/docs/api/react/use-selector.md`
- `apps/docs/content/docs/api/react/use-selector.cn.md`
- `apps/docs/content/docs/api/core/runtime.md`
- `apps/docs/content/docs/api/core/runtime.cn.md`
  - Only update if implementation changes require wording alignment.
- `docs/next/logix-api-planning/api-implementation-gap-ledger.md`
- `docs/next/logix-api-planning/post-conv-implementation-task-queue.md`
- `docs/next/logix-api-planning/run-state.md`
  - Close `TASK-010` after implementation and validation.

## Chunk 1: Runtime.check Static Gate

### Task 1: Add the missing static control-plane facade

**Files:**
- Modify: `packages/logix-core/src/Runtime.ts`
- Create: `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`
- Modify: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

- [ ] **Step 1: Write the failing `Runtime.check` contract**

Create `packages/logix-core/test/Contracts/RuntimeCheck.contract.test.ts`:

```ts
import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.check static control-plane facade', () => {
  it.effect('returns a static VerificationControlPlaneReport without booting the program', () =>
    Effect.gen(function* () {
      let booted = false

      const Root = Logix.Module.make('RuntimeCheck.Contract.Root', {
        state: Schema.Struct({ count: Schema.Number }),
        actions: {},
      })

      const program = Logix.Program.make(Root, {
        initial: { count: 0 },
        logics: [
          Root.logic(() =>
            Effect.sync(() => {
              booted = true
            }),
          ),
        ],
      })

      const report = yield* Logix.Runtime.check(program, {
        runId: 'run:test:runtime-check-contract',
        includeStaticIr: true,
      })

      expect(booted).toBe(false)
      expect(report.kind).toBe('VerificationControlPlaneReport')
      expect(report.stage).toBe('check')
      expect(report.mode).toBe('static')
      expect(report.verdict).toBe('PASS')
      expect(report.nextRecommendedStage).toBe('trial')
      expect(report.artifacts.some((artifact) => artifact.outputKey === 'module-manifest')).toBe(true)
    }),
  )
})
```

- [ ] **Step 2: Run the focused red test**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/RuntimeCheck.contract.test.ts
```

Expected: fail because `Logix.Runtime.check` is currently missing.

- [ ] **Step 3: Implement the minimal facade**

In `packages/logix-core/src/Runtime.ts`:

- Import `extractManifest` from `./internal/reflection/manifest.js`.
- Add `CheckOptions` with `runId?: string`, `includeStaticIr?: boolean`, and `budgets?: { manifest?: { maxBytes?: number } }`.
- Add `CheckReport = VerificationControlPlaneReport`.
- Add `check(root, options?)` returning `Effect.Effect<CheckReport, never, never>`.
- Resolve root through existing `resolveRootImpl`.
- Extract manifest without booting runtime.
- Return `makeVerificationControlPlaneReport({ stage: 'check', mode: 'static', verdict: 'PASS', ... })`.
- Include an artifact ref `{ outputKey: 'module-manifest', kind: 'ModuleManifest', digest: manifest.digest }`.

- [ ] **Step 4: Prove the focused test passes**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/RuntimeCheck.contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Re-run the existing control-plane contract**

Run:

```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/VerificationControlPlaneContract.test.ts
```

Expected: PASS.

## Chunk 2: Public Surface Drift Guards

### Task 2: Lock root exports to the frozen surface

**Files:**
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Create: `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`
- Create: `packages/logix-react/test/Contracts/ReactRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-react/src/FormProjection.ts`
- Create: `packages/logix-react/src/internal/formProjection.ts`
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`

- [ ] **Step 1: Add Form root allowlist**

Create `packages/logix-form/test/Contracts/FormRootBarrel.allowlist.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

const allowedRootExports = ['Companion', 'Error', 'Rule', 'make'] as const

describe('form root barrel allowlist', () => {
  it('only exposes frozen root exports', () => {
    expect(Object.keys(Form).sort()).toEqual(Array.from(allowedRootExports).sort())
  })
})
```

- [ ] **Step 2: Add React root forbidden-leak guard**

Create `packages/logix-react/test/Contracts/ReactRootBarrel.allowlist.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import * as ReactLogix from '../../src/index.js'

const requiredRootExports = [
  'RuntimeProvider',
  'fieldValue',
  'rawFormMeta',
  'shallow',
  'useDispatch',
  'useImportedModule',
  'useModule',
  'useRuntime',
  'useSelector',
] as const

const forbiddenRootExports = [
  'formFieldCompanion',
  'formFieldError',
  'formRowCompanion',
  'isFormFieldCompanionSelectorDescriptor',
  'isFormFieldErrorSelectorDescriptor',
  'isFormRowCompanionSelectorDescriptor',
  'useCompanion',
  'useFieldValue',
] as const

describe('react root barrel frozen selector surface', () => {
  it('keeps canonical host and selector helper exports present', () => {
    for (const key of requiredRootExports) {
      expect(key in ReactLogix).toBe(true)
    }
  })

  it('does not leak internal descriptor helpers or second read routes', () => {
    for (const key of forbiddenRootExports) {
      expect(key in ReactLogix).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run the red surface tests**

Run:

```bash
pnpm -C packages/logix-form exec vitest run test/Contracts/FormRootBarrel.allowlist.test.ts
pnpm -C packages/logix-react exec vitest run test/Contracts/ReactRootBarrel.allowlist.test.ts
```

Expected:
- Form should pass or expose an exact root drift.
- React should fail if internal descriptor helpers still leak through `export * from './FormProjection.js'`.

- [ ] **Step 4: Split public and internal FormProjection**

Implementation shape:

- Move current descriptor normalization and raw read helpers from `packages/logix-react/src/FormProjection.ts` to `packages/logix-react/src/internal/formProjection.ts`.
- Keep `packages/logix-react/src/FormProjection.ts` as the public helper facade exporting only:
  - `fieldValue`
  - `rawFormMeta`
  - public helper types needed by users, such as `RawFormMeta`, `FieldValueSelector`, `FieldValuePath`, `FieldValueAt`
- Update `packages/logix-react/src/internal/hooks/useSelector.ts` to import descriptor internals from `../formProjection.js`.
- Keep runtime behavior unchanged.

- [ ] **Step 5: Re-run surface tests**

Run:

```bash
pnpm -C packages/logix-form exec vitest run test/Contracts/FormRootBarrel.allowlist.test.ts
pnpm -C packages/logix-react exec vitest run test/Contracts/ReactRootBarrel.allowlist.test.ts
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts
```

Expected: PASS.

## Chunk 3: Selector And Row Owner Guardrails

### Task 3: Keep the single selector gate sealed

**Files:**
- Modify: `packages/logix-react/test/Hooks/useSelector.type-safety.test.ts`
- Modify: `packages/logix-react/test/Hooks/useSelector.formCompanionDescriptor.test.tsx`
- Modify: `packages/logix-form/test/Form/Form.CompanionSelectorPrimitive.test.ts`
- Modify: `packages/logix-form/test/Form/Form.RowIdentityProjectionWitness.test.ts`

- [ ] **Step 1: Strengthen type-level selector guard**

In `useSelector.type-safety.test.ts`, extend the `if (false)` block:

```ts
// @ts-expect-error companion descriptors must be consumed through Form.Companion
useSelector(form, { kind: 'field', path: 'profileResource' })

// @ts-expect-error no public helper leak from @logixjs/react root
ReactLogix.formFieldCompanion
```

Import `* as ReactLogix from '../../src/index.js'` if needed.

- [ ] **Step 2: Keep descriptor runtime opacity tests green**

Add assertions to `Form.CompanionSelectorPrimitive.test.ts`:

```ts
expect(JSON.stringify(Form.Companion.field('profileResource'))).toBe('{}')
expect(JSON.stringify(Form.Companion.byRowId('items', 'row-1', 'warehouseId'))).toBe('{}')
```

- [ ] **Step 3: Run focused selector and row tests**

Run:

```bash
pnpm -C packages/logix-react exec vitest run \
  test/Hooks/useSelector.type-safety.test.ts \
  test/Hooks/useSelector.formCompanionDescriptor.test.tsx

pnpm -C packages/logix-form exec vitest run \
  test/Form/Form.CompanionSelectorPrimitive.test.ts \
  test/Form/Form.RowIdentityProjectionWitness.test.ts
```

Expected: PASS.

## Chunk 4: Verification Boundary Guards

### Task 4: Prevent accidental compare and scenario productization

**Files:**
- Modify: `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`
- Modify: `packages/logix-core/test/Contracts/VerificationProbeLifecycleBoundary.contract.test.ts`

- [ ] **Step 1: Add negative public route checks**

In `VerificationControlPlaneContract.test.ts`, add assertions:

```ts
expect(typeof Logix.Runtime.check).toBe('function')
expect(typeof Logix.Runtime.trial).toBe('function')
expect('compare' in (Logix.Runtime as any)).toBe(false)
expect('ScenarioCarrier' in (Logix.Runtime as any)).toBe(false)
```

- [ ] **Step 2: Keep probe lifecycle fixture-only boundary**

In `VerificationProbeLifecycleBoundary.contract.test.ts`, keep the existing fixture demotion assertions and add a guard that production `src/internal/verification` does not expose `scenarioWitnessAdapter`, `scenarioExpectationProbe`, or `comparePerfAdmissibilityProbe`.

- [ ] **Step 3: Run verification boundary contracts**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/VerificationControlPlaneContract.test.ts \
  test/Contracts/VerificationProbeLifecycleBoundary.contract.test.ts
```

Expected: PASS.

## Chunk 5: Docs And Control-Plane Closeout

### Task 5: Update docs only where implementation changed

**Files:**
- Modify if needed: `apps/docs/content/docs/api/core/runtime.md`
- Modify if needed: `apps/docs/content/docs/api/core/runtime.cn.md`
- Modify: `docs/next/logix-api-planning/api-implementation-gap-ledger.md`
- Modify: `docs/next/logix-api-planning/post-conv-implementation-task-queue.md`
- Modify: `docs/next/logix-api-planning/run-state.md`

- [ ] **Step 1: Update Runtime docs if `Runtime.check` is newly public**

If the docs do not already teach the static gate, add a short section:

```md
`Runtime.check(Program, options?)` is the cheap static verification gate. It returns a `VerificationControlPlaneReport` with `stage="check"` and `mode="static"`. It does not boot the program or execute behavior.
```

Chinese mirror:

```md
`Runtime.check(Program, options?)` 是低成本静态验证门禁。它返回 `stage="check"`、`mode="static"` 的 `VerificationControlPlaneReport`。它不启动 program，也不执行行为。
```

- [ ] **Step 2: Close TASK-010 in control-plane docs**

Update:

- `api-implementation-gap-ledger.md`: change `Runtime.check` to `runtime_status=implemented`, `proof_status=proven`, `gap_kind=none`, `next_route=watch-only`.
- `post-conv-implementation-task-queue.md`: change `TASK-010` to `done`.
- `run-state.md`: set cursor to `paused-watch-only-after-TASK-010`, unless a focused verification fails.

- [ ] **Step 3: Run docs and keyword smoke**

Run:

```bash
rg -n "useCompanion|Form\\.Path|SoftFact|FormProgram\\.metadata|carrier\\.selector|Form\\.Companion\\.list|runtime\\.compare.*authoring|useFieldValue|Form-owned hook|row owner token|Fact / SoftFact" \
  apps/docs/content/docs/form \
  apps/docs/content/docs/api/react/use-selector.md \
  apps/docs/content/docs/api/react/use-selector.cn.md \
  apps/docs/content/docs/api/core/runtime.md \
  apps/docs/content/docs/api/core/runtime.cn.md

pnpm -C apps/docs types:check
pnpm -C apps/docs build
```

Expected:
- Keyword hits only appear in negative constraints or boundary explanations.
- Docs typecheck passes.
- Docs build passes.

## Chunk 6: Final Verification

### Task 6: Run implementation acceptance checks

**Files:**
- No source edits unless a focused check fails.

- [ ] **Step 1: Run package typechecks**

Run:

```bash
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
```

Expected: PASS.

- [ ] **Step 2: Run focused contract tests**

Run:

```bash
pnpm -C packages/logix-core exec vitest run \
  test/Contracts/RuntimeCheck.contract.test.ts \
  test/Contracts/VerificationControlPlaneContract.test.ts \
  test/Contracts/CoreRootBarrel.allowlist.test.ts \
  test/Contracts/VerificationProbeLifecycleBoundary.contract.test.ts

pnpm -C packages/logix-form exec vitest run \
  test/Contracts/FormRootBarrel.allowlist.test.ts \
  test/Form/Form.CompanionSelectorPrimitive.test.ts \
  test/Form/Form.RowIdentityProjectionWitness.test.ts

pnpm -C packages/logix-react exec vitest run \
  test/Contracts/ReactRootBarrel.allowlist.test.ts \
  test/Hooks/useSelector.type-safety.test.ts \
  test/Hooks/useSelector.formCompanionDescriptor.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run workspace gates**

Run:

```bash
pnpm typecheck
pnpm typecheck:test
pnpm test:turbo
```

Expected: PASS.

- [ ] **Step 4: Run diff hygiene**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Stop before commit**

Do not run `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git checkout`, `git clean`, or `git stash` unless the user explicitly asks.

## Acceptance Criteria

- `Logix.Runtime.check` exists and returns `VerificationControlPlaneReport` with `stage="check"` / `mode="static"`.
- `Runtime.check` does not boot or execute the program.
- `Logix.Runtime.compare` remains absent until explicit `TASK-003` authority intake.
- `@logixjs/react` root no longer leaks internal descriptor helpers.
- `Form.Companion.*` remains opaque and consumed only through `useSelector`.
- Row owner retained harness remains green.
- Docs build and package typechecks pass.
- `TASK-010` closes in the control-plane docs.
