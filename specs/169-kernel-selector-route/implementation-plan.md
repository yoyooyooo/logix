# Kernel Selector Route Contract Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `169-kernel-selector-route` cutover so React host reads use exact selector inputs by default, core owns selector precision and route decisions, dirty/read fallback is explicit, and public guidance cannot teach broad host reads.

**Architecture:** The cutover is single-track and forward-only. Core runtime owns selector precision, fingerprint identity, dirty/read path authority, route decision, and selector-quality diagnostics; React host consumes that route through `useSyncExternalStore` and does not keep a parallel eligibility policy. Public authoring keeps one hook gate, `useSelector(handle, selector, equalityFn?)`, with selector input vocabulary only.

**Tech Stack:** TypeScript, React 19, Effect V4, pnpm, Vitest, React Testing Library, test-dts, Logix runtime core, Logix React host, Markdown SSoT docs

---

## Execution Rules

- Use `specs/169-kernel-selector-route/spec.md` as the requirement source.
- Use `specs/169-kernel-selector-route/tasks.md` as the task index.
- Keep `specs/169-kernel-selector-route/discussion.md` non-authoritative. Do not implement deferred items unless the spec or plan promotes them.
- Prefix shell commands with `rtk`.
- Do not run watch-mode tests.
- Do not run `git add`, `git commit`, `git push`, `git restore`, `git checkout --`, `git reset`, `git clean`, or `git stash` unless the user explicitly authorizes that command.
- Commit steps below are handoff markers only. Execute them only after explicit user authorization.

## Scope Check

This plan covers several connected subsystems, but they are not independent projects:

- React public hook surface
- Core selector route and fingerprint identity
- Dirty/read path authority and fallback policy
- Verification control-plane evidence layering
- Docs, README, Agent guidance, and proposal cross-links

They must be implemented in one terminal cutover because keeping any old public route or React-owned fallback creates a second truth source.

## File Structure

### Core Runtime Route

- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`
  - Owns internal-only selector route data types, diagnostic codes, route decision shapes, selector-quality artifacts, and internal marker brand.
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.fingerprint.ts`
  - Owns stable selector fingerprint calculation from static shape, reads digest, equality semantics, projection/operator digest, and path-authority digest or epoch.
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts`
  - Owns path normalization authority for read paths and dirty paths.
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.precision.ts`
  - Owns selector precision classification: exact, broad-root, broad-state, dynamic, debug, unknown.
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
  - Owns dirty precision classification and fallback reasons.
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - Stops reusing entries by `selectorId` alone.
  - Uses selector fingerprint for graph identity and topic identity.
  - Emits route and precision diagnostics.
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
  - Uses read-query topic keys based on selector fingerprint.
  - Exposes internal route/query topic helpers consumed by React.
- Modify: `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
  - Keep internal compile support.
  - Add only the metadata needed by selector route if the new route cannot derive it externally.
- Modify: `packages/logix-core/src/Runtime.ts`
  - Allows `runtime.check` to report static selector-quality artifacts only.
- Modify: `packages/logix-core/src/internal/observability/trialRunModule.ts`
  - Allows startup trial to report selector-policy wiring artifacts.
- Modify: `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
  - Keeps selector-quality report payload slim and stage-bound.

### State Transaction Decomposition

- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
  - Dirty evidence snapshot, dirty key materialization, dirty path recording helpers.
- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
  - Patch record building and patch path normalization helpers.
- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
  - Transaction snapshot and committed transaction assembly helpers.
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - Retains coordinator API: `makeContext`, `beginTransaction`, `updateDraft`, `recordPatch`, `markDirtyPath`, `readDirtyEvidence`, `commitWithState`, `commit`, `abort`.

### React Host

- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
  - Removes public no-arg overloads.
  - Removes local `selectorTopicEligible`.
  - Requests core route and consumes the returned decision.
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - Uses core route topic identity.
  - Prevents rejected reads from falling back to broad module topic.
  - Emits explicit host selector-quality evidence only when a host harness/scenario exists.
- Modify if still in use: `packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
  - Aligns cache key with selector fingerprint if this store remains reachable.

### Tests

- Create: `packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorRouteDecision.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts`
- Create: `packages/logix-core/test/Contracts/VerificationSelectorQualityLayering.contract.test.ts`
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorPublicSurface.contract.test.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorDocsSurface.contract.test.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorQualityEvidence.contract.test.ts`
- Create: `packages/logix-react/test/Hooks/useSelector.coreRoute.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.dirtyFallback.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.businessFormRow.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.businessMasterDetail.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.businessDashboard.contract.test.tsx`

### Docs And Evidence

- Create: `specs/169-kernel-selector-route/perf/.gitkeep`
- Create: `specs/169-kernel-selector-route/perf/README.md`
- Modify: `specs/169-kernel-selector-route/spec.md`
- Modify: `specs/169-kernel-selector-route/quickstart.md`
- Modify: `specs/169-kernel-selector-route/discussion.md`
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/02-hot-path-direction.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`
- Modify: `docs/ssot/capability/03-frozen-api-shape.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `packages/logix-react/README.md`
- Modify: `skills/logix-best-practices/references/agent-first-api-generation.md`
- Modify: `skills/logix-best-practices/references/logix-react-notes.md`
- Modify: `skills/logix-best-practices/references/llms/05-react-usage-basics.md`
- Modify: `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`
- Modify: `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
- Modify: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`

## Chunk 1: Activation, Baseline, And Public Surface Red Tests

### Task 1: Activate the spec and create perf evidence location

**Files:**
- Modify: `specs/169-kernel-selector-route/spec.md`
- Create: `specs/169-kernel-selector-route/perf/.gitkeep`
- Create: `specs/169-kernel-selector-route/perf/README.md`

- [ ] **Step 1: Mark the spec Active**

Change the status line:

```md
**Status**: Active
```

- [ ] **Step 2: Create perf evidence files**

Create `.gitkeep` and `README.md`. Use this README skeleton:

```md
# Selector Route Perf Evidence

Spec: `169-kernel-selector-route`

## Environment

- OS:
- CPU:
- Node:
- pnpm:
- Browser, if used:

## Commands

Before:
`pnpm perf collect -- --profile default --out specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json`

After:
`pnpm perf collect -- --profile default --out specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json`

Diff:
`pnpm perf diff -- --before specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json --after specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json`

## Results

- before:
- after:
- diff:
- comparable:
- stabilityWarning:
```

- [ ] **Step 3: Run status and prerequisite checks**

Run:

```bash
rtk /Users/yoyo/Documents/code/personal/logix.worktrees/next-api/.codex/skills/speckit/scripts/bash/check-prerequisites.sh --feature 169 --json --require-tasks
rtk git status --short specs/169-kernel-selector-route
```

Expected:

- prerequisites command exits 0
- `AVAILABLE_DOCS` includes `discussion.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

- [ ] **Step 4: Commit only if authorized**

If the user explicitly authorizes commits:

```bash
git add specs/169-kernel-selector-route/spec.md specs/169-kernel-selector-route/perf/.gitkeep specs/169-kernel-selector-route/perf/README.md
git commit -m "chore: activate selector route contract spec"
```

### Task 2: Add public no-arg read red tests

**Files:**
- Modify: `packages/logix-react/test-dts/canonical-hooks.surface.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorPublicSurface.contract.test.ts`

- [ ] **Step 1: Add the dts negative witness**

Append a small fixture near existing `useSelector` assertions:

```ts
// @ts-expect-error public no-arg host read is removed by specs/169
useSelector(handle)

const countValue = useSelector(handle, fieldValue('count'))
countValue satisfies number
```

Use the actual local handle and module names already present in the file. If no numeric state handle exists, add the smallest local fixture already accepted by this test-dts file.

- [ ] **Step 2: Add public surface guard**

Create a test that reads `packages/logix-react/src/internal/hooks/useSelector.ts` and fails if the public no-arg overload still exists:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('React selector public surface', () => {
  it('does not expose a public no-arg useSelector overload', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/internal/hooks/useSelector.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/export function useSelector<[^>]+>\\(\\s*handle:[^,]+,?\\s*\\):/)
    expect(source).not.toContain('selector?: SelectorInput')
  })
})
```

Adjust `resolve(...)` if the existing test helpers use a different repo-root helper.

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorPublicSurface.contract.test.ts
```

Expected before implementation:

- dts fails because no-arg `useSelector(handle)` still typechecks
- contract test fails because no-arg overload and optional selector implementation still exist

- [ ] **Step 4: Commit only if authorized**

```bash
git add packages/logix-react/test-dts/canonical-hooks.surface.ts packages/logix-react/test/Contracts/ReactSelectorPublicSurface.contract.test.ts
git commit -m "test: reject public no-arg selector reads"
```

## Chunk 2: No-Behavior StateTransaction Split

### Task 3: Split StateTransaction helper responsibilities without semantic changes

**Files:**
- Create: `packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts`
- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts`
- Create: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`

- [ ] **Step 1: Add guard test for current behavior**

Create tests that cover:

- explicit path patch creates `dirtyAll=false`
- missing registry degrades to `dirtyAll=true` with `fallbackPolicy`
- no patch evidence degrades to `dirtyAll=true` with `unknownWrite`
- list index evidence still appears when list paths exist

Test skeleton:

```ts
import { Effect, SubscriptionRef } from 'effect'
import { describe, expect, it } from 'vitest'
import * as Txn from '../../../src/internal/runtime/core/StateTransaction.js'

describe('StateTransaction decomposition guard', () => {
  it('preserves dirty evidence for explicit paths', async () => {
    const registry = {
      fieldPaths: [['count']],
      pathStringToId: new Map([['count', 0]]),
    }
    const ctx = Txn.makeContext<{ count: number }>({
      instanceId: 'guard',
      getFieldPathIdRegistry: () => registry as any,
    })
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const ref = yield* SubscriptionRef.make({ count: 0 })
        Txn.beginTransaction(ctx, { kind: 'test' }, { count: 0 })
        Txn.updateDraft(ctx, { count: 1 })
        Txn.recordPatch(ctx, 'count', 'reducer')
        return yield* Txn.commitWithState(ctx, ref)
      }),
    )

    expect(result?.transaction.dirty.dirtyAll).toBe(false)
    expect(result?.transaction.dirty.dirtyPathIds).toEqual([0])
  })
})
```

- [ ] **Step 2: Run guard test before split**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.decomposition.guard.test.ts
```

Expected:

- PASS before the split

- [ ] **Step 3: Extract patch helpers**

Move these functions from `StateTransaction.ts` to `StateTransaction.patch.ts`:

- `normalizePatchStepId`
- `buildPatchRecord`
- patch-related `MutableTxnPatchRecord` if needed

Export only what `StateTransaction.ts` needs. Do not change function bodies except imports and exported names.

- [ ] **Step 4: Extract dirty helpers**

Move these functions to `StateTransaction.dirty.ts`:

- `toListInstanceKey`
- `parseNonNegativeIntMaybe`
- `recordListIndexEvidenceFromPathString`
- `recordListIndexEvidenceFromPathArray`
- `materializeDirtyPathSnapshotAndKey`
- `buildDirtyEvidenceSnapshot`
- `inferReplaceEvidence`
- `resolveAndRecordDirtyPathId`
- `recordDirtyPathId` only if it remains used

If private state types are needed, export minimal internal interfaces from `StateTransaction.ts` or place shared internal state types in `StateTransaction.dirty.ts`. Keep public exports unchanged.

- [ ] **Step 5: Extract snapshot assembly**

Move `buildCommittedTransaction` to `StateTransaction.snapshot.ts` only if doing so does not create circular imports. If it creates a cycle, leave it in `StateTransaction.ts` and document the reason in a code comment and in `specs/169-kernel-selector-route/quickstart.md`.

- [ ] **Step 6: Run focused checks after each extraction**

Run after each sub-extraction:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.decomposition.guard.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts
rtk pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:

- PASS after every extraction
- no public export change
- no cycle error

- [ ] **Step 7: Record decomposition result**

Append to `specs/169-kernel-selector-route/quickstart.md`:

```md
## StateTransaction Decomposition Result

- Split files:
- Deferred split, if any:
- Verification:
```

- [ ] **Step 8: Commit only if authorized**

```bash
git add packages/logix-core/src/internal/runtime/core/StateTransaction.ts packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts packages/logix-core/src/internal/runtime/core/StateTransaction.patch.ts packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts packages/logix-core/test/internal/Runtime/StateTransaction.decomposition.guard.test.ts specs/169-kernel-selector-route/quickstart.md
git commit -m "refactor: split state transaction helpers"
```

## Chunk 3: Core Selector Route And React Consumption

### Task 4: Add internal selector route contract and core tests

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.fingerprint.ts`
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts`
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.precision.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorRouteDecision.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts`

- [ ] **Step 1: Write precision red tests**

Cover:

- exact static read query
- broad state read
- broad root read
- dynamic fallback
- unknown selector input
- internal debug/resilience marker

Expected assertion shape:

```ts
expect(record.precisionQuality).toBe('exact')
expect(record.routeDecision.kind).toBe('exact')
```

For rejected cases:

```ts
expect(record.routeDecision.kind).toBe('reject')
expect(record.routeDecision.failureCode).toBe('selector.dynamic_fallback')
```

- [ ] **Step 2: Write fingerprint red tests**

Test:

- same `selectorId` with different reads produces different fingerprints
- same reads with different equality semantics produces different fingerprints
- path authority epoch change changes fingerprint

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts test/Runtime/Runtime.selectorRouteDecision.contract.test.ts test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts
```

Expected before implementation:

- FAIL because route modules do not exist

- [ ] **Step 4: Implement `selectorRoute.types.ts`**

Start with these internal types:

```ts
export type SelectorPrecisionQuality = 'exact' | 'broad-root' | 'broad-state' | 'dynamic' | 'debug' | 'unknown'

export type SelectorRouteKind = 'exact' | 'reject' | 'internal-resilience'

export interface SelectorFingerprint {
  readonly value: string
  readonly readsDigest?: number
  readonly pathAuthorityEpoch: number
}

export interface SelectorRouteDecision {
  readonly kind: SelectorRouteKind
  readonly selectorFingerprint: SelectorFingerprint
  readonly failureCode?: string
  readonly repairHint?: string
}

export interface SelectorPrecisionRecord {
  readonly selectorIdLabel: string
  readonly selectorFingerprint: SelectorFingerprint
  readonly precisionQuality: SelectorPrecisionQuality
  readonly routeDecision: SelectorRouteDecision
  readonly fallbackReason?: string
}
```

Keep the marker type unexported from root and package public exports.

- [ ] **Step 5: Implement fingerprint utility**

Use existing `fnv1a32` and `stableStringify` from `packages/logix-core/src/internal/digest.ts` or equivalent local digest utility already used by `ReadQuery.ts`.

Fingerprint input must include:

- selector id label
- lane
- producer
- reads digest
- normalized read paths
- equals kind
- fallback reason
- projection/operator shape string
- path authority epoch

- [ ] **Step 6: Implement path authority**

Wrap current `FieldPathIdRegistry` access. The first version can use epoch `0` when registry exists and `-1` when missing. Expose helpers:

```ts
normalizeReadPaths(reads, registry)
getPathAuthorityDigestOrEpoch(registry)
```

Do not add public APIs.

- [ ] **Step 7: Implement precision classifier**

Rules:

- `lane=static`, `readsDigest` exists, no `fallbackReason`, at least one normalized read path means `exact`
- no reads and selector returns whole state means `broad-state`
- root-level read with unsafe coarse path means `broad-root`
- `lane=dynamic` or any fallback reason means `dynamic`
- internal marker means `debug` or `internal-resilience`, depending on route request
- unrecognized input means `unknown`

- [ ] **Step 8: Run core tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts test/Runtime/Runtime.selectorRouteDecision.contract.test.ts test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts
rtk pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:

- PASS

- [ ] **Step 9: Commit only if authorized**

```bash
git add packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts packages/logix-core/src/internal/runtime/core/selectorRoute.fingerprint.ts packages/logix-core/src/internal/runtime/core/selectorRoute.pathAuthority.ts packages/logix-core/src/internal/runtime/core/selectorRoute.precision.ts packages/logix-core/test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts packages/logix-core/test/Runtime/Runtime.selectorRouteDecision.contract.test.ts packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts
git commit -m "feat: add core selector route contract"
```

### Task 5: Integrate fingerprint identity into SelectorGraph and RuntimeStore

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Modify: `packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts`
- Modify: `packages/logix-core/test/internal/Runtime/TickScheduler.topic-classification.test.ts`

- [ ] **Step 1: Add graph identity red test**

Create two compiled selectors with same `selectorId` and different reads. Subscribe both. Assert two entries and two topic keys.

- [ ] **Step 2: Run red test**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts test/internal/Runtime/TickScheduler.topic-classification.test.ts
```

Expected:

- FAIL because `SelectorGraph.ts` currently keys `selectorsById` by `selectorId`
- FAIL if topic key still uses selector id only

- [ ] **Step 3: Change `SelectorGraph` maps**

Replace:

```ts
const selectorsById = new Map<string, SelectorEntry<S, any>>()
```

with a fingerprint-keyed map:

```ts
const selectorsByFingerprint = new Map<string, SelectorEntry<S, any>>()
```

Keep `selectorId` only as a diagnostic label inside the entry.

- [ ] **Step 4: Change release path**

`releaseEntry` must release by fingerprint. If current caller only has selector id, add an internal route result object that carries both `selectorIdLabel` and `selectorFingerprint.value`, then update caller.

- [ ] **Step 5: Change `RuntimeStore` topic shape**

Replace topic helper semantics so read-query topics use fingerprint:

```ts
export const makeReadQueryTopicKey = (moduleInstanceKey: ModuleInstanceKey, selectorFingerprint: string): TopicKey =>
  `${moduleInstanceKey}::rq:${selectorFingerprint}`
```

Update `TopicInfo` field from `selectorId` to `selectorFingerprint`.

- [ ] **Step 6: Run graph and topic tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts test/internal/Runtime/TickScheduler.topic-classification.test.ts
rtk pnpm -C packages/logix-core exec tsc --noEmit
```

Expected:

- PASS

- [ ] **Step 7: Commit only if authorized**

```bash
git add packages/logix-core/src/internal/runtime/core/SelectorGraph.ts packages/logix-core/src/internal/runtime/core/RuntimeStore.ts packages/logix-core/test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts packages/logix-core/test/internal/Runtime/TickScheduler.topic-classification.test.ts
git commit -m "feat: key selector topics by fingerprint"
```

### Task 6: Remove React-owned route eligibility

**Files:**
- Modify: `packages/logix-react/src/internal/hooks/useSelector.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts`
- Create: `packages/logix-react/test/Hooks/useSelector.coreRoute.contract.test.tsx`
- Create: `packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts`

- [ ] **Step 1: Add React owner guard**

Create a source guard that fails on local route policy:

```ts
expect(source).not.toContain('selectorTopicEligible')
expect(source).not.toMatch(/lane\\s*===\\s*['"]static['"]/)
expect(source).not.toContain('fallbackReason == null')
```

- [ ] **Step 2: Add route behavior test**

Test exact static selector:

- uses read-query store
- does not subscribe to module topic
- commits only the exact selected subscriber

Test dynamic selector:

- under dev/test policy, throws or reports a strict failure
- never falls back to `getRuntimeModuleExternalStore`

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Hooks/useSelector.coreRoute.contract.test.tsx
```

Expected:

- FAIL because `useSelector.ts` currently contains `selectorTopicEligible`

- [ ] **Step 4: Update `useSelector` public overloads**

Remove these overloads:

```ts
export function useSelector(...handle...): S
export function useSelector<H extends ReactModuleHandle>(handle: H): StateOfHandle<H>
```

Change implementation signature so `selector` is required:

```ts
export function useSelector<H extends ReactModuleHandle, V>(
  handle: H,
  selector: SelectorInput<StateOfHandle<H>, V>,
  equalityFn?: (previous: V, next: V) => boolean,
): V
```

- [ ] **Step 5: Replace local route logic**

Delete `selectorTopicEligible`. Ask core for route decision through the internal API introduced in Task 4 and Task 5.

The store selection should look conceptually like:

```ts
const route = RuntimeContracts.Selector.route(selectorReadQuery, moduleRuntime)

const store =
  route.kind === 'exact'
    ? getRuntimeReadQueryExternalStore(runtime, moduleRuntime, selectorReadQuery, route, options)
    : makeRejectedSelectorStore(route)
```

Do not re-check `lane`, `readsDigest`, or `fallbackReason` in React.

- [ ] **Step 6: Update external store topic key**

`getRuntimeReadQueryExternalStore` must accept route decision or selector fingerprint, not derive a topic from `selectorId`.

- [ ] **Step 7: Implement rejection behavior**

For dev/test strict rejection, choose one observable behavior and keep it consistent:

- throw during render with structured error, or
- return a store that throws from `getSnapshot`

The error must include:

- selector id label
- selector fingerprint
- precision quality
- failure code
- repair hint

- [ ] **Step 8: Run React focused tests**

Run:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Hooks/useSelector.coreRoute.contract.test.tsx test/Hooks/useSelector.test.tsx test/Hooks/useSelector.structMemo.test.tsx
rtk pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected:

- PASS

- [ ] **Step 9: Commit only if authorized**

```bash
git add packages/logix-react/src/internal/hooks/useSelector.ts packages/logix-react/src/internal/store/RuntimeExternalStore.ts packages/logix-react/src/internal/store/ModuleRuntimeSelectorExternalStore.ts packages/logix-react/test/Hooks/useSelector.coreRoute.contract.test.tsx packages/logix-react/test/Contracts/ReactSelectorRouteOwner.guard.test.ts
git commit -m "feat: consume core selector route in react"
```

## Chunk 4: Dirty/Read Precision And Diagnostics

### Task 7: Gate dirty/read fallback

**Files:**
- Create: `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/RuntimeStore.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- Create: `packages/logix-react/test/Hooks/useSelector.dirtyFallback.contract.test.tsx`

- [ ] **Step 1: Add dirty overlap tests**

Cover:

- nested dirty path updates only overlapping selector
- unrelated selector does not evaluate
- missing path authority fails in dev/test
- dirtyAll fails in dev/test when host projection is affected
- evaluate-all path emits strict failure

- [ ] **Step 2: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.dirtyFallback.contract.test.tsx
```

Expected:

- FAIL because current `SelectorGraph.ts` evaluates all on dirtyAll, missing registry, and missing dirty path

- [ ] **Step 3: Implement dirty precision record**

In `selectorRoute.dirty.ts`, expose:

```ts
export type DirtyPrecisionQuality = 'exact' | 'dirty-all' | 'missing-path-authority' | 'missing-dirty-path' | 'unsafe-coarse-root' | 'evaluate-all'

export interface DirtyPrecisionRecord {
  readonly quality: DirtyPrecisionQuality
  readonly fallbackKind?: string
  readonly reason?: string
  readonly repairHint?: string
}
```

- [ ] **Step 4: Replace silent evaluate-all branches**

In `SelectorGraph.ts`, do not call `evaluateAllSubscribedSelectors()` for these cases without first producing a dirty precision record:

- `dirty.dirtyAll`
- missing registry
- `getDirtyPath(id)` returns undefined
- selectors without exact precision
- root-level dirty that is unsafe coarse root

Under dev/test, route these to strict failure when host projection is affected.

- [ ] **Step 5: Keep production-like behavior measurable**

If production-like mode still uses resilience fallback, it must:

- emit slim diagnostics when diagnostics are enabled
- include fallback reason
- avoid unbounded cost when diagnostics disabled

- [ ] **Step 6: Run dirty precision tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.dirtyFallback.contract.test.tsx
rtk pnpm -C packages/logix-core exec tsc --noEmit
rtk pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected:

- PASS

- [ ] **Step 7: Commit only if authorized**

```bash
git add packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts packages/logix-core/src/internal/runtime/core/SelectorGraph.ts packages/logix-core/src/internal/runtime/core/RuntimeStore.ts packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts packages/logix-react/test/Hooks/useSelector.dirtyFallback.contract.test.tsx
git commit -m "feat: gate selector dirty fallback"
```

### Task 8: Add selector-quality diagnostics and verification layering

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/Runtime.ts`
- Modify: `packages/logix-core/src/internal/observability/trialRunModule.ts`
- Modify: `packages/logix-core/src/internal/observability/trialRunReportPipeline.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Create: `packages/logix-core/test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts`
- Create: `packages/logix-core/test/Contracts/VerificationSelectorQualityLayering.contract.test.ts`
- Create: `packages/logix-react/test/Contracts/ReactSelectorQualityEvidence.contract.test.ts`

- [ ] **Step 1: Add diagnostic tests**

Verify diagnostic payload is serializable and includes:

- `moduleId`
- `instanceId`
- `txnSeq` when available
- `selectorIdLabel`
- `selectorFingerprint`
- `precisionQuality`
- `routeKind`
- `fallbackReason`
- `repairHint`

- [ ] **Step 2: Add verification layering tests**

Assertions:

- `runtime.check` can report static/build selector-quality artifacts only
- startup trial can report startup wiring only
- React host precision appears only through explicit host evidence or scenario/harness artifact
- no static/startup report claims React commit, subscription fanout, or render isolation

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts test/Contracts/VerificationSelectorQualityLayering.contract.test.ts
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorQualityEvidence.contract.test.ts
```

Expected:

- FAIL before diagnostics and report plumbing

- [ ] **Step 4: Implement selector-quality artifact**

In `selectorRoute.types.ts`:

```ts
export type SelectorQualityArtifactStage = 'static' | 'startup' | 'scenario' | 'host-harness'

export interface SelectorQualityArtifact {
  readonly stage: SelectorQualityArtifactStage
  readonly producer: string
  readonly selectorFingerprint: string
  readonly precisionQuality: SelectorPrecisionQuality
  readonly routeKind: SelectorRouteKind
  readonly fallbackKind?: string
  readonly repairHint?: string
  readonly sourceRef?: string
}
```

- [ ] **Step 5: Wire `runtime.check`**

In `packages/logix-core/src/Runtime.ts`, only consume static/build artifacts already available at check time. Do not inspect React host or runtime subscriptions.

- [ ] **Step 6: Wire startup trial**

In `trialRunModule.ts` and `trialRunReportPipeline.ts`, carry startup selector-policy artifacts through report shape. Keep budget slimming behavior intact.

- [ ] **Step 7: Wire explicit React host evidence**

In `RuntimeExternalStore.ts`, only attach host selector-quality evidence when explicit host harness/scenario support is active. Do not create hidden always-on host evidence.

- [ ] **Step 8: Run diagnostics tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts test/Contracts/VerificationSelectorQualityLayering.contract.test.ts test/Contracts/RuntimeCheck.contract.test.ts
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorQualityEvidence.contract.test.ts
rtk pnpm typecheck
```

Expected:

- PASS

- [ ] **Step 9: Commit only if authorized**

```bash
git add packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts packages/logix-core/src/internal/runtime/core/SelectorGraph.ts packages/logix-core/src/Runtime.ts packages/logix-core/src/internal/observability/trialRunModule.ts packages/logix-core/src/internal/observability/trialRunReportPipeline.ts packages/logix-react/src/internal/store/RuntimeExternalStore.ts packages/logix-core/test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts packages/logix-core/test/Contracts/VerificationSelectorQualityLayering.contract.test.ts packages/logix-react/test/Contracts/ReactSelectorQualityEvidence.contract.test.ts
git commit -m "feat: report selector quality by verification layer"
```

## Chunk 5: Business Witnesses, Docs, And Final Evidence

### Task 9: Add non-Playground business witnesses

**Files:**
- Create: `packages/logix-react/test/Hooks/useSelector.businessFormRow.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.businessMasterDetail.contract.test.tsx`
- Create: `packages/logix-react/test/Hooks/useSelector.businessDashboard.contract.test.tsx`

- [ ] **Step 1: Add form row witness**

Test a form row with:

- field value selector
- field error selector
- companion selector
- row companion selector

Assert exact selector updates do not notify unrelated row subscribers.

- [ ] **Step 2: Add master-detail witness**

Test imported child reads:

- parent selects active child id
- child selector reads exact child state
- updating an unrelated child does not notify active detail subscriber

- [ ] **Step 3: Add dashboard witness**

Test independent cards:

- each card subscribes to one exact selector input
- updating card A does not notify card B/C
- broad read attempt fails under dev/test

- [ ] **Step 4: Run witness tests**

Run:

```bash
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.businessFormRow.contract.test.tsx test/Hooks/useSelector.businessMasterDetail.contract.test.tsx test/Hooks/useSelector.businessDashboard.contract.test.tsx
```

Expected:

- PASS

- [ ] **Step 5: Commit only if authorized**

```bash
git add packages/logix-react/test/Hooks/useSelector.businessFormRow.contract.test.tsx packages/logix-react/test/Hooks/useSelector.businessMasterDetail.contract.test.tsx packages/logix-react/test/Hooks/useSelector.businessDashboard.contract.test.tsx
git commit -m "test: add selector route business witnesses"
```

### Task 10: Update docs and Agent guidance in one pass

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/02-hot-path-direction.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/09-verification-control-plane.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md`
- Modify: `docs/ssot/capability/03-frozen-api-shape.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `packages/logix-react/README.md`
- Modify: `skills/logix-best-practices/references/agent-first-api-generation.md`
- Modify: `skills/logix-best-practices/references/logix-react-notes.md`
- Modify: `skills/logix-best-practices/references/llms/05-react-usage-basics.md`
- Modify: `skills/logix-best-practices/references/diagnostics-and-perf-gates.md`
- Modify: `docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md`
- Modify: `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md`

- [ ] **Step 1: Update public vocabulary**

Use only these public-facing terms:

- selector input
- broad read
- dynamic selector fallback
- dirty fallback
- core route

Do not teach:

- public `ReadQuery`
- projection evidence
- dirty evidence
- read topic
- selector graph
- registry
- runtime topic key
- Playground product terms as primary concepts

- [ ] **Step 2: Update React README examples**

Every success example must use:

```ts
const value = useSelector(handle, fieldValue('path.to.value'))
```

No success example may use:

```ts
const state = useSelector(handle)
```

- [ ] **Step 3: Update prior proposal cross-links**

In Playground fanout proposal, mark kernel selector law as superseded by:

```md
Superseded for kernel selector law by `docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md` and `specs/169-kernel-selector-route/spec.md`.
```

Keep product-level Playground render isolation as retained witness scope.

- [ ] **Step 4: Run docs sweep**

Run:

```bash
rtk rg -n 'useSelector\(handle\)|const snapshot = useSelector|selector 保持纯函数|sealed read-query selector object|static ReadQuery 条件' docs/ssot docs/standards packages/logix-react/README.md skills/logix-best-practices/references packages/logix-react/test-dts packages/logix-core/test-dts
```

Expected:

- no success-path no-arg host reads
- any remaining hit is negative, internal, history, archived, or test-only and is labeled as such

- [ ] **Step 5: Commit only if authorized**

```bash
git add docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/02-hot-path-direction.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/09-verification-control-plane.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md docs/ssot/capability/03-frozen-api-shape.md docs/standards/logix-api-next-guardrails.md packages/logix-react/README.md skills/logix-best-practices/references/agent-first-api-generation.md skills/logix-best-practices/references/logix-react-notes.md skills/logix-best-practices/references/llms/05-react-usage-basics.md skills/logix-best-practices/references/diagnostics-and-perf-gates.md docs/review-plan/proposals/2026-04-30-playground-render-fanout-selector-closure.md docs/review-plan/proposals/2026-04-30-kernel-projection-dirty-evidence-terminal-contract.md
git commit -m "docs: align selector route contract guidance"
```

### Task 11: Run final proof and close the spec

**Files:**
- Modify: `specs/169-kernel-selector-route/perf/README.md`
- Modify: `specs/169-kernel-selector-route/discussion.md`
- Modify: `specs/169-kernel-selector-route/spec.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.decomposition.guard.test.ts test/Runtime/Runtime.selectorRoutePrecision.contract.test.ts test/Runtime/Runtime.selectorRouteDecision.contract.test.ts test/Runtime/Runtime.selectorFingerprintIdentity.contract.test.ts test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/Runtime.selectorPrecisionDiagnostics.contract.test.ts test/Contracts/VerificationSelectorQualityLayering.contract.test.ts
rtk pnpm -C packages/logix-react exec vitest run test/Contracts/ReactSelectorPublicSurface.contract.test.ts test/Contracts/ReactSelectorDocsSurface.contract.test.ts test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Contracts/ReactSelectorQualityEvidence.contract.test.ts test/Hooks/useSelector.coreRoute.contract.test.tsx test/Hooks/useSelector.dirtyFallback.contract.test.tsx test/Hooks/useSelector.businessFormRow.contract.test.tsx test/Hooks/useSelector.businessMasterDetail.contract.test.tsx test/Hooks/useSelector.businessDashboard.contract.test.tsx
rtk pnpm -C packages/logix-react exec tsc -p test-dts/tsconfig.json --noEmit
```

Expected:

- PASS

- [ ] **Step 2: Run workspace gates**

Run:

```bash
rtk pnpm typecheck
rtk pnpm lint
rtk pnpm test:turbo
```

Expected:

- PASS

- [ ] **Step 3: Collect after perf evidence**

Run:

```bash
rtk pnpm perf collect -- --profile default --out specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json
rtk pnpm perf diff -- --before specs/169-kernel-selector-route/perf/before.<sha>.<envId>.default.json --after specs/169-kernel-selector-route/perf/after.<sha-or-worktree>.<envId>.default.json --out specs/169-kernel-selector-route/perf/diff.before.<sha>__after.<sha-or-worktree>.<envId>.default.json
```

Expected:

- diff is comparable
- no stability warning before claiming performance success

- [ ] **Step 4: Update perf README**

Record:

- exact commands
- output filenames
- comparable result
- accepted overhead notes
- any rerun reason

- [ ] **Step 5: Clean discussion**

In `specs/169-kernel-selector-route/discussion.md`:

- keep deferred items only if still unresolved
- remove stale implementation watchpoints that were settled
- keep `Must Close Before Implementation` as `None`

- [ ] **Step 6: Mark spec Done**

Only after all SC points pass, change:

```md
**Status**: Done
```

- [ ] **Step 7: Commit only if authorized**

```bash
git add specs/169-kernel-selector-route/perf/README.md specs/169-kernel-selector-route/discussion.md specs/169-kernel-selector-route/spec.md
git commit -m "chore: close selector route contract spec"
```

## Final Acceptance Checklist

- [ ] Public no-arg `useSelector(handle)` is removed from public success path.
- [ ] React has no `selectorTopicEligible` or equivalent local route policy.
- [ ] Core route decision covers exact, reject, and internal resilience.
- [ ] Selector graph and runtime topic identity use fingerprint, not selector id label.
- [ ] Dirty/read path overlap uses shared internal path authority.
- [ ] dirtyAll, missing path authority, unsafe coarse root, and evaluate-all fallback are strict failures under dev/test when host projection is affected.
- [ ] Diagnostics are slim, serializable, and stage-bound.
- [ ] `runtime.check` does not claim React commit, subscription fanout, or render isolation.
- [ ] Startup trial does not claim browser host behavior.
- [ ] Host projection evidence exists only through explicit host/scenario/harness evidence.
- [ ] Form row, master-detail, and dashboard business witnesses pass.
- [ ] Performance evidence is comparable before success is claimed.
- [ ] SSoT, README, skills, proposals, spec, and quickstart agree.

## Execution Handoff

Implement in chunk order. Stop after a failing command that is not an expected red test, record the exact command and failure, and fix within the same chunk before continuing.
