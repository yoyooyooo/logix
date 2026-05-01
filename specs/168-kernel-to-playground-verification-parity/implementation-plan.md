# Kernel-to-Playground Verification Parity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. In this repository, do not stage, commit, push, reset, restore, checkout, clean or stash unless the user explicitly asks.

**Goal:** Make Logix core, CLI, Workbench projection and Playground share one owner-backed verification evidence chain, with no fake diagnostics, no hidden Run failure, stable Workbench identities and explicit lossy Run value projection.

**Architecture:** Start with a dominance audit that classifies existing implementation as keep, rewrite-under-owner, demote-to-host-state or delete. Then strengthen core truth carriers, project them through Workbench and CLI without adding semantics, and finally prove Playground routes consume the same authority through real demos.

**Tech Stack:** TypeScript 5.9, Effect 4.0.0-beta.28, Vitest, @effect/vitest, React 19, Vite, Playwright browser proof in `examples/logix-react`.

---

## Scope And Sequencing

This implementation touches four subsystems. Do it in chunks, in this order:

1. Dominance audit and spec writeback.
2. Core verification and Workbench owner fixes.
3. CLI parity proof.
4. Playground runtime and demo proof.
5. Docs, notes and full verification.

Do not start later chunks until earlier chunk tests pass. The core chunk can be implemented without browser work. The Playground chunk depends on accepted core/workbench shapes.

## File Structure

### Core

- Modify: `packages/logix-core/src/ControlPlane.ts`
  - Owns `VerificationControlPlaneReport`, `VerificationDependencyCause`, artifact refs and report guards.
- Modify: `packages/logix-core/src/Runtime.ts`
  - Maps trial output into control-plane reports, dependency causes, findings and repair hints.
- Modify: `packages/logix-core/src/internal/workbench/authority.ts`
  - Owns `RuntimeWorkbenchTruthInput` and authority id derivation.
- Modify: `packages/logix-core/src/internal/workbench/findings.ts`
  - Owns Workbench finding projection and run-failure facet.
- Modify or create: `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`
  - Proves dependency cause spine has stable owner/focus coordinates.
- Modify or create: `packages/logix-core/test/RuntimeRunProjection.contract.test.ts`
  - Proves run value lossiness and run failure shape if the carrier is core-owned.
- Modify or create: `packages/logix-core/test/RuntimeWorkbenchIdentity.contract.test.ts`
  - Proves Workbench ids do not depend on summary text.

### CLI

- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
  - Ensure trial output exposes core report authority and artifacts only.
- Modify: `packages/logix-cli/src/internal/commands/compare.ts`
  - Ensure compare consumes before/after report refs through core compare.
- Modify: `packages/logix-cli/src/internal/result.ts`
  - Preserve transport-only `CommandResult`.
- Modify or create: `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`
  - Proves CLI trial missing dependency matches core report fields.
- Modify or create: `packages/logix-cli/test/Integration/workbench-parity.contract.test.ts`
  - Proves CLI report artifacts can feed the same Workbench authority bundle.

### Playground Package

- Modify: `packages/logix-playground/src/internal/runner/runProjection.ts`
  - Add lossy value metadata.
- Modify: `packages/logix-playground/src/internal/runner/runtimeEvidence.ts`
  - Carry lossy value metadata and failure refs through evidence envelope when needed.
- Modify: `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
  - Ensure owner-backed Run failures become run-failure evidence, not only evidence gaps.
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
  - Remove preview-only failure from `run-result` truth input, gate compile failure classification.
- Modify: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
  - Display Run result lossiness and run failure shape.
- Modify: `packages/logix-playground/src/internal/components/WorkbenchBottomPanel.tsx`
  - Display capture refs and diagnostics authority class if needed.
- Modify or create: `packages/logix-playground/test/run-value-lossiness.contract.test.ts`
  - Proves null/undefined/void/truncated/failure are distinct.
- Modify: `packages/logix-playground/test/project-snapshot-runtime-evidence.contract.test.ts`
  - Proves evidence envelope classifies run failure correctly.
- Modify: `packages/logix-playground/test/shape-separation.contract.test.ts`
  - Extends Run/Check/Trial separation.
- Modify: `packages/logix-playground/test/workbench-projection.contract.test.ts`
  - Proves preview-only failure cannot become run-result truth.

### Examples

- Modify: `examples/logix-react/src/playground/projects/diagnostics/shared.ts`
  - Add explicit authority class metadata for diagnostics demos.
- Modify: `examples/logix-react/src/playground/projects/pressure/shared.ts`
  - Mark pressure routes as visual-only unless owner evidence is attached.
- Modify existing diagnostics routes:
  - `examples/logix-react/src/playground/projects/diagnostics/trial-missing-service/index.ts`
  - `examples/logix-react/src/playground/projects/diagnostics/trial-missing-config/index.ts`
  - `examples/logix-react/src/playground/projects/diagnostics/trial-missing-import/index.ts`
  - `examples/logix-react/src/playground/projects/diagnostics/check-imports/index.ts`
- Create if needed:
  - `examples/logix-react/src/playground/projects/diagnostics/run-undefined-value/index.ts`
  - `examples/logix-react/src/playground/projects/diagnostics/run-null-value/index.ts`
  - `examples/logix-react/src/playground/projects/diagnostics/run-failure/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
  - Register new diagnostics routes.
- Modify or create browser tests:
  - `examples/logix-react/test/browser/playground-diagnostics-authority.contract.test.tsx`
  - `examples/logix-react/test/browser/playground-run-value-lossiness.contract.test.tsx`

### Specs And Docs

- Modify: `specs/168-kernel-to-playground-verification-parity/notes/verification.md`
  - Record dominance audit table and verification output.
- Modify: `specs/168-kernel-to-playground-verification-parity/discussion.md`
  - Remove or demote closed discussion items.
- Modify: `specs/168-kernel-to-playground-verification-parity/tasks.md`
  - Mark implementation progress only after tests pass.
- Modify as needed:
  - `docs/ssot/runtime/09-verification-control-plane.md`
  - `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
  - `docs/ssot/runtime/17-playground-product-workbench.md`
  - `specs/165-runtime-workbench-kernel/spec.md`
  - `specs/166-playground-driver-scenario-surface/spec.md`
  - `specs/167-runtime-reflection-manifest/spec.md`

## Chunk 1: Dominance Audit And Frozen Worklist

### Task 1.1: Record the dominance audit

**Files:**
- Modify: `specs/168-kernel-to-playground-verification-parity/notes/verification.md`
- Modify: `specs/168-kernel-to-playground-verification-parity/discussion.md`

- [ ] **Step 1: Read the audit targets**

Run:

```bash
rtk sed -n '120,290p' packages/logix-core/src/Runtime.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/workbench/authority.ts
rtk sed -n '1,220p' packages/logix-core/src/internal/workbench/findings.ts
rtk sed -n '1,460p' packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts
rtk sed -n '1,180p' packages/logix-playground/src/internal/runner/runProjection.ts
rtk sed -n '1,220p' packages/logix-playground/src/internal/summary/workbenchProjection.ts
rtk find examples/logix-react/src/playground/projects -maxdepth 4 -type f | sort
```

Expected: files show the paths listed in `spec.md` TD-011.

- [ ] **Step 2: Update the audit table**

In `notes/verification.md`, replace initial dispositions with a table containing:

```markdown
| Path | Evidence | Disposition | Required action |
| --- | --- | --- | --- |
```

Use only these dispositions:

- `keep`
- `rewrite-under-owner`
- `demote-to-host-state`
- `delete`

- [ ] **Step 3: Move non-open defects out of discussion**

If an item is now a known defect, remove it from `discussion.md` and create a concrete task in `tasks.md`. Keep only design choices that still need a decision.

- [ ] **Step 4: Verify text sweep**

Run:

```bash
rtk rg -n "T""ODO|T""BD|不""是.*而""是" specs/168-kernel-to-playground-verification-parity
```

Expected: no output.

## Chunk 2: Core Verification Spine

### Task 2.1: Prove `VerificationDependencyCause` as the first dependency spine

**Files:**
- Modify: `packages/logix-core/src/ControlPlane.ts`
- Modify: `packages/logix-core/src/Runtime.ts`
- Test: `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts`

- [ ] **Step 1: Write failing dependency spine tests**

Create or update `packages/logix-core/test/VerificationDependencyCauseSpine.contract.test.ts` with tests for missing service, config and Program import. The assertions must check:

```ts
expect(report.dependencyCauses?.[0]).toMatchObject({
  kind: 'service',
  phase: 'startup-boot',
  ownerCoordinate: 'service:BusinessService',
  providerSource: 'runtime-overlay',
  focusRef: { declSliceId: 'service:BusinessService' },
  errorCode: 'MissingDependency',
})
expect(report.findings?.[0]).toMatchObject({
  kind: 'dependency',
  code: 'MissingDependency',
  ownerCoordinate: 'service:BusinessService',
})
expect(report.repairHints[0]?.focusRef).toEqual({ declSliceId: 'service:BusinessService' })
```

Use the existing missing dependency fixtures from `packages/logix-core/test/observability/Observability.trialRunModule.missingService.test.ts` as the source pattern.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run VerificationDependencyCauseSpine.contract.test.ts --reporter=dot
```

Expected before implementation: fail on missing fields or missing stable coordinates if the current spine is incomplete.

- [ ] **Step 3: Implement the minimal spine additions**

Modify `packages/logix-core/src/ControlPlane.ts` and `packages/logix-core/src/Runtime.ts` only as needed. Prefer adding fields to `VerificationDependencyCause` over creating `DependencyClosureIndex`.

Do not add a new dependency graph.

- [ ] **Step 4: Run the focused test and verify pass**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run VerificationDependencyCauseSpine.contract.test.ts --reporter=dot
```

Expected: pass.

- [ ] **Step 5: Run related control-plane tests**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run RuntimeCheck.contract.test.ts VerificationControlPlaneContract.test.ts VerificationProofKernelRoutes.test.ts --reporter=dot
```

Expected: pass.

### Task 2.2: Add lossy Run value projection support

**Files:**
- Modify: `packages/logix-core/src/internal/workbench/authority.ts`
- Modify: `packages/logix-core/src/internal/workbench/projection.ts`
- Modify: `packages/logix-core/src/internal/workbench/findings.ts`
- Test: `packages/logix-core/test/RuntimeRunProjection.contract.test.ts`

- [ ] **Step 1: Write failing tests for business null, undefined and truncation**

Create `packages/logix-core/test/RuntimeRunProjection.contract.test.ts`.

Test at minimum:

```ts
expect(projectedNull.valueKind).toBe('null')
expect(projectedNull.lossy).toBe(false)
expect(projectedUndefined.valueKind).toBe('undefined')
expect(projectedUndefined.lossy).toBe(true)
expect(projectedUndefined.lossReasons).toContain('undefined-to-null')
expect(projectedFailure.status).toBe('failed')
expect(projectedFailure.value).toBeUndefined()
```

If the final projection helper lives in Playground, keep the core test limited to Workbench `RuntimeWorkbenchRunResultInput` shape and add the value projection helper in Chunk 4.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run RuntimeRunProjection.contract.test.ts --reporter=dot
```

Expected: fail because lossiness fields do not exist yet.

- [ ] **Step 3: Add minimal fields to run-result truth input**

In `packages/logix-core/src/internal/workbench/authority.ts`, extend `RuntimeWorkbenchRunResultInput` with optional fields:

```ts
readonly valueKind?: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
readonly lossy?: boolean
readonly lossReasons?: ReadonlyArray<string>
```

Keep them optional to avoid widening unrelated callers in the first patch.

- [ ] **Step 4: Preserve run failure as separate shape**

Ensure `RuntimeWorkbenchRunResultInput` with `status: 'failed'` does not require `value`, `valueKind` or lossiness fields.

- [ ] **Step 5: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run RuntimeRunProjection.contract.test.ts --reporter=dot
```

Expected: pass.

### Task 2.3: Make Workbench ids independent of summary text

**Files:**
- Modify: `packages/logix-core/src/internal/workbench/authority.ts`
- Modify: `packages/logix-core/src/internal/workbench/findings.ts`
- Test: `packages/logix-core/test/RuntimeWorkbenchIdentity.contract.test.ts`

- [ ] **Step 1: Write failing identity tests**

Create `packages/logix-core/test/RuntimeWorkbenchIdentity.contract.test.ts`.

Test two reports with same `runId`, `stage`, `mode`, `errorCode`, `focusRef` and artifact keys, but different `summary`. Assert:

```ts
expect(authorityRefOf(firstInput).id).toBe(authorityRefOf(secondInput).id)
expect(firstFinding.id).toBe(secondFinding.id)
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run RuntimeWorkbenchIdentity.contract.test.ts --reporter=dot
```

Expected: fail if summary digest is still used in ids.

- [ ] **Step 3: Rewrite id derivation**

Use stable owner coordinates in this order:

1. `report.runId`
2. `report.stage`
3. `report.mode`
4. `report.errorCode ?? report.verdict`
5. first non-null `repairHints[].focusRef`
6. sorted `artifacts[].outputKey`

Do not include `report.summary`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-core test -- --run RuntimeWorkbenchIdentity.contract.test.ts --reporter=dot
```

Expected: pass.

- [ ] **Step 5: Run full core package checks**

Run:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
```

Expected: pass.

## Chunk 3: CLI Parity Proof

### Task 3.1: Prove CLI trial preserves dependency spine

**Files:**
- Modify: `packages/logix-cli/src/internal/commands/trial.ts`
- Modify: `packages/logix-cli/src/internal/result.ts`
- Test: `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`

- [ ] **Step 1: Write failing CLI trial test**

Create `packages/logix-cli/test/Integration/trial-dependency-spine.contract.test.ts`.

Use the existing integration test style from `packages/logix-cli/test/Integration/trial.command.test.ts`. Assert the primary report artifact has:

```ts
expect(report.stage).toBe('trial')
expect(report.mode).toBe('startup')
expect(report.dependencyCauses?.[0]?.ownerCoordinate).toBe('service:BusinessService')
expect(result.primaryReportOutputKey).toBeDefined()
expect(result.artifacts.some((a) => a.outputKey === result.primaryReportOutputKey)).toBe(true)
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run trial-dependency-spine.contract.test.ts --reporter=dot
```

Expected: fail if CLI artifact projection drops dependency causes or primary report linkage.

- [ ] **Step 3: Implement minimal CLI preservation**

Keep `CommandResult` transport-only. If data is missing, fix artifact writing or report serialization, not `CommandResult` schema truth.

- [ ] **Step 4: Run focused test**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run trial-dependency-spine.contract.test.ts --reporter=dot
```

Expected: pass.

### Task 3.2: Prove CLI Workbench parity input

**Files:**
- Modify: `packages/logix-cli/test/Integration/workbench-projection.contract.test.ts`
- Test: `packages/logix-cli/test/Integration/workbench-parity.contract.test.ts`

- [ ] **Step 1: Write parity test**

Create or extend CLI Workbench projection test so a CLI trial report and a directly constructed core report produce equivalent Workbench finding ids.

Assert:

```ts
expect(cliProjection.sessions[0]?.findings?.[0]?.id).toBe(coreProjection.sessions[0]?.findings?.[0]?.id)
expect(cliProjection.sessions[0]?.findings?.[0]?.code).toBe('MissingDependency')
```

- [ ] **Step 2: Run focused CLI Workbench tests**

Run:

```bash
rtk pnpm -C packages/logix-cli test -- --run workbench-projection.contract.test.ts workbench-parity.contract.test.ts --reporter=dot
```

Expected: pass after Chunk 2 id changes.

- [ ] **Step 3: Run full CLI checks**

Run:

```bash
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot
```

Expected: pass.

## Chunk 4: Playground Runtime And Workbench Projection

### Task 4.1: Add lossy value metadata in Playground run projection

**Files:**
- Modify: `packages/logix-playground/src/internal/runner/runProjection.ts`
- Modify: `packages/logix-playground/src/internal/runner/runtimeEvidence.ts`
- Modify: `packages/logix-playground/src/internal/components/RuntimeInspector.tsx`
- Test: `packages/logix-playground/test/run-value-lossiness.contract.test.ts`
- Test: `packages/logix-playground/test/host-command-output.contract.test.tsx`

- [ ] **Step 1: Write failing lossiness tests**

Create `packages/logix-playground/test/run-value-lossiness.contract.test.ts`.

Assert:

```ts
expect(projectRunValue('r-null', null)).toMatchObject({
  status: 'passed',
  value: null,
  valueKind: 'null',
  lossy: false,
})
expect(projectRunValue('r-undefined', undefined)).toMatchObject({
  status: 'passed',
  value: null,
  valueKind: 'undefined',
  lossy: true,
})
expect(projectRunValue('r-undefined', undefined).lossReasons).toContain('undefined-to-null')
```

- [ ] **Step 2: Run focused test and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run run-value-lossiness.contract.test.ts --reporter=dot
```

Expected: fail because fields do not exist.

- [ ] **Step 3: Implement minimal projection fields**

Extend `InternalRunProjection` in `runProjection.ts`:

```ts
readonly valueKind: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
readonly lossy: boolean
readonly lossReasons?: ReadonlyArray<string>
```

Update `toJsonSafeValue` to return loss reasons. Keep failure shape unchanged.

- [ ] **Step 4: Carry metadata through evidence and UI**

Update `ProjectSnapshotRuntimeOutput` in `runtimeEvidence.ts` and Run Result rendering in `RuntimeInspector.tsx` to show lossiness metadata without changing report truth.

- [ ] **Step 5: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run run-value-lossiness.contract.test.ts host-command-output.contract.test.tsx --reporter=dot
```

Expected: pass.

### Task 4.2: Fix Workbench projection truth classes

**Files:**
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Test: `packages/logix-playground/test/workbench-projection.contract.test.ts`
- Test: `packages/logix-playground/test/project-snapshot-runtime-evidence.contract.test.ts`

- [ ] **Step 1: Write failing preview failure test**

In `workbench-projection.contract.test.ts`, add a test that passes `previewFailure` and asserts no `truthInputs` entry has:

```ts
kind: 'run-result'
failure: { code: 'preview-only-host-error' }
```

Assert it appears as evidence gap or host context only.

- [ ] **Step 2: Write failing compile failure classification test**

Add a test that compile failure becomes run-failure facet only when it came from `ProjectSnapshotRuntimeInvoker` or transport authority. Pure host compile messages must not become Runtime truth.

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run workbench-projection.contract.test.ts project-snapshot-runtime-evidence.contract.test.ts --reporter=dot
```

Expected: fail on current preview or compile failure mapping.

- [ ] **Step 4: Rewrite mapping**

In `workbenchProjection.ts`:

- Remove `previewFailure` from `failureRunTruthInput`.
- Map preview failure to `explicitGapTruthInput(..., 'preview-only-host-error', ...)` or keep it as host context if a stronger product state exists.
- Gate compile failure through runtime evidence envelope or transport failure classification.

- [ ] **Step 5: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run workbench-projection.contract.test.ts project-snapshot-runtime-evidence.contract.test.ts --reporter=dot
```

Expected: pass.

### Task 4.3: Ensure Run failures become run-failure facets

**Files:**
- Modify: `packages/logix-playground/src/internal/runner/projectSnapshotRuntimeInvoker.ts`
- Modify: `packages/logix-playground/src/internal/summary/workbenchProjection.ts`
- Test: `packages/logix-playground/test/shape-separation.contract.test.ts`
- Test: `packages/logix-playground/test/program-run-runtime.contract.test.ts`

- [ ] **Step 1: Write failing run failure tests**

Add tests proving a failing Run:

- does not create passed Run Result
- does create failed run-result truth input
- projects to Workbench `run-failure-facet`
- does not create fabricated Trial report

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run shape-separation.contract.test.ts program-run-runtime.contract.test.ts --reporter=dot
```

Expected: fail if failure remains only evidence gap or UI error.

- [ ] **Step 3: Implement minimal failure path**

Use `runtimeOutput` for successful run only. For owner-backed failure, carry a failed run projection into summary input. Keep transport failure as evidence gap only when owner failure is unavailable.

- [ ] **Step 4: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-playground test -- --run shape-separation.contract.test.ts program-run-runtime.contract.test.ts --reporter=dot
```

Expected: pass.

- [ ] **Step 5: Run full Playground package checks**

Run:

```bash
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot
```

Expected: pass.

## Chunk 5: Playground Real Diagnostics Routes

### Task 5.1: Add explicit authority class metadata

**Files:**
- Modify: `examples/logix-react/src/playground/projects/diagnostics/shared.ts`
- Modify: `examples/logix-react/src/playground/projects/pressure/shared.ts`
- Modify: diagnostics and pressure route `index.ts` files listed above
- Test: `examples/logix-react/test/playground-registry.contract.test.ts`

- [ ] **Step 1: Write failing registry test**

Extend `playground-registry.contract.test.ts` to assert every diagnostics and pressure project has one authority class:

```ts
expect(project.fixtures?.diagnosticsDemo?.authorityClass).toMatch(/runtime-|reflection-|workbench-/)
expect(project.fixtures?.pressure?.authorityClass).toBe('visual-pressure-only')
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
```

Expected: fail until metadata exists.

- [ ] **Step 3: Add metadata**

Add explicit metadata:

- diagnostics routes: `runtime-trial-report`, `runtime-check-report`, `runtime-run-failure`, `payload-validation`, `reflection-manifest`, or `workbench-evidence-gap`.
- pressure routes: `visual-pressure-only`.

- [ ] **Step 4: Run registry test**

Run:

```bash
rtk pnpm -C examples/logix-react test -- --run playground-registry.contract.test.ts --reporter=dot
```

Expected: pass.

### Task 5.2: Add Run value and Run failure diagnostics routes

**Files:**
- Create: `examples/logix-react/src/playground/projects/diagnostics/run-undefined-value/index.ts`
- Create: `examples/logix-react/src/playground/projects/diagnostics/run-null-value/index.ts`
- Create: `examples/logix-react/src/playground/projects/diagnostics/run-failure/index.ts`
- Modify: `examples/logix-react/src/playground/registry.ts`
- Test: `examples/logix-react/test/browser/playground-run-value-lossiness.contract.test.tsx`

- [ ] **Step 1: Write failing browser route test**

Create `examples/logix-react/test/browser/playground-run-value-lossiness.contract.test.tsx`.

Assert:

- `run-null-value` shows business null and `lossy=false`.
- `run-undefined-value` shows projected null plus `returnKind=undefined` or equivalent UI text.
- `run-failure` shows failure and no successful `{ value: null }`.

- [ ] **Step 2: Run browser test and verify failure**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: fail until routes and UI support exist.

- [ ] **Step 3: Add routes**

Use `defineDiagnosticsDemoProject` for all three routes. Keep source minimal:

- `run-null-value`: `main = () => Effect.succeed(null)`
- `run-undefined-value`: `main = () => Effect.sync(() => undefined)`
- `run-failure`: `main = () => Effect.fail(new Error("run failure demo"))` or equivalent runtime failure pattern accepted by current runner.

- [ ] **Step 4: Register routes**

Update `examples/logix-react/src/playground/registry.ts`.

- [ ] **Step 5: Run browser proof**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: pass for new browser tests and existing playground route tests.

## Chunk 6: Docs, Spec Writeback And Final Verification

### Task 6.1: Write back adopted owner decisions

**Files:**
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/15-cli-agent-first-control-plane.md`
- Modify: `docs/ssot/runtime/17-playground-product-workbench.md`
- Modify: `specs/165-runtime-workbench-kernel/spec.md`
- Modify: `specs/166-playground-driver-scenario-surface/spec.md`
- Modify: `specs/167-runtime-reflection-manifest/spec.md`
- Modify: `specs/168-kernel-to-playground-verification-parity/discussion.md`
- Modify: `specs/168-kernel-to-playground-verification-parity/notes/verification.md`

- [ ] **Step 1: Update owner docs**

Write back only decisions actually implemented:

- dependency cause spine
- run failure facet carrier
- lossy Run value projection
- Workbench identity stability
- preview-only failure demotion
- diagnostics/pressure route authenticity

- [ ] **Step 2: Close discussion items**

Remove or demote closed `D168-*` items from `discussion.md`. Do not leave adopted decisions only in discussion.

- [ ] **Step 3: Record verification outputs**

Update `notes/verification.md` with exact commands run and outcomes.

- [ ] **Step 4: Run docs text sweep**

Run:

```bash
rtk rg -n "fake diagnostic|diagnosticsFixture|Runtime\\.playground|Runtime\\.driver|Runtime\\.scenario|Runtime\\.workbench|Logix\\.Reflection|fallback-source-regex" packages/logix-core packages/logix-cli packages/logix-playground examples/logix-react docs specs/168-kernel-to-playground-verification-parity
```

Expected: remaining hits are classified as forbidden text, evidence gap, fallback-only debt, discussion-only text or history-only text.

### Task 6.2: Final verification matrix

**Files:**
- Modify: `specs/168-kernel-to-playground-verification-parity/notes/verification.md`

- [ ] **Step 1: Run package checks**

Run:

```bash
rtk pnpm -C packages/logix-core typecheck
rtk pnpm -C packages/logix-core test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-cli typecheck
rtk pnpm -C packages/logix-cli test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C packages/logix-playground typecheck
rtk pnpm -C packages/logix-playground test -- --run --cache --silent=passed-only --reporter=dot
rtk pnpm -C examples/logix-react typecheck
```

Expected: all pass.

- [ ] **Step 2: Run browser proof**

Run:

```bash
rtk pnpm -C examples/logix-react test:browser:playground
```

Expected: pass.

- [ ] **Step 3: Run repo-level checks**

Run:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Expected: all pass.

- [ ] **Step 4: Perf check if hot paths changed**

Only if runtime hot paths, diagnostics collection or dispatch paths changed:

```bash
rtk pnpm check:effect-v4-matrix
```

Expected: pass or recorded regression with owner decision.

- [ ] **Step 5: Final status**

Run:

```bash
rtk git status --short -- specs/168-kernel-to-playground-verification-parity packages/logix-core packages/logix-cli packages/logix-playground examples/logix-react docs/ssot/runtime
```

Expected: only intended files changed. Do not stage or commit unless the user explicitly asks.
