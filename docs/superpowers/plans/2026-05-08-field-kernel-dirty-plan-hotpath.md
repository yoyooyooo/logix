# Field Kernel Dirty Plan Hot Path Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a transaction-level canonical dirty plan and use it to remove repeated dirty/scope inference across field-kernel converge, source idle sync, validate, row companion, selector overlap, deferred backlog, external store writeback, and React runtime snapshots.

**Architecture:** The implementation is forward-only and internal-only. First introduce `TxnDirtyPlanSnapshot` as the transaction authority for raw dirty evidence, canonical root ids, stable root hash, dirty-all reason, immutable list evidence, and per-transaction memoization. Then move build-time dependency indexes into the compiled field program so selector overlap, source, validate, row-scoped computed, converge, and deferred backlog consume the same transaction plan instead of rebuilding local evidence. Finally close external-store and React snapshot tail costs without adding public FieldKernel API.

**Tech Stack:** TypeScript, Effect V4, pnpm, Vitest, @effect/vitest where needed, React 19 host tests, Playwright perf boundaries, `@logixjs/perf-evidence`.

---

## References

- `docs/proposals/field-kernel-perf.md`
- `docs/ssot/runtime/02-hot-path-direction.md`
- `docs/adr/2026-04-12-field-kernel-declaration-cutover.md`
- `docs/ssot/runtime/06-form-field-kernel-boundary.md`
- `docs/standards/logix-api-next-guardrails.md`
- `specs/039-field-converge-int-exec-evidence/perf.md`
- `specs/073-logix-external-store-tick/data-model.md`
- `specs/169-kernel-selector-route/plan.md`
- @test-driven-development
- @verification-before-completion

## Execution Rules

- Run this in a dedicated worktree if possible.
- Prefix all shell commands with `rtk`.
- Do not run watch-mode tests.
- Do not run `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git clean`, `git stash`, or `git checkout -- <path>` unless the user explicitly asks.
- Commit checkpoints below are handoff markers only. Skip them unless the user explicitly authorizes commits.
- Do not add public `FieldKernel` helpers, expert subpaths, compatibility aliases, or a second authoring route.
- Do not write performance conclusions into `docs/perf/**`. Current hot-path evidence belongs in the active spec `perf/` directory or the existing perf evidence spec noted above.
- Diagnostics-off hot paths must avoid debug object allocation and avoid new O(n) scans when the relevant dirty plan is exact.
- Empty dirty is exact no-op evidence. It must never be represented as `dirtyAll`.
- `TxnDirtyPlanSnapshot` is a phase snapshot. It must not expose mutable transaction `Set` or `Map` references.
- Fresh dirty-plan reads are required before converge, validate, and source, but repeated reads with unchanged dirty/list evidence must hit the per-transaction memo.
- Each exact-gating hot chunk should add or extend a diagnostics-off guard when a focused unit test can prove no fallback/full-scan allocation. Use behavior-first names ending in `.Perf.off.test.ts`.

# Implementation Readiness Addendum: Dirty Plan Hot Path

This plan is an implementation-lowering plan. It must only execute after the dirty-plan design law is closed.

`write-plans` is responsible for converting an implementation-ready design into executable chunks, tests, evidence commands, and final handoff status. It is not responsible for inventing missing kernel semantics during implementation planning.

If any design law below is not already closed, the worker must stop and report an `Implementation readiness blocker` instead of filling the gap by assumption.

## 0. Scope Boundary

This plan may decide:

- which files to modify
- which tests to write first
- which chunks to execute
- which perf evidence to collect
- which public-surface text sweep to run
- which final status fields to report

This plan must not invent:

- dirty-state algebra
- selector dirty/read overlap semantics
- list structural-change fallback law
- consumer ownership law
- performance-claim admissibility law
- public FieldKernel surface changes
- fallback rules that affect correctness

Any missing item in those categories is a design blocker, not an implementation detail.

## 1. Dirty Plan Authority Law

`TxnDirtyPlanSnapshot` is the single transaction-level authority for dirty evidence consumed by field-kernel hot paths.

It must represent the following states explicitly:

```ts
type DirtyPlanState =
  | { kind: "empty-exact" }
  | { kind: "roots-exact"; rootIds: Int32Array; rootKeyHash: number }
  | { kind: "dirty-all"; reason: DirtyAllReason }
```

Implementation may keep the existing boolean shape:

```ts
dirtyAll: boolean
dirtyAllReason?: DirtyAllReason
rootIds: Int32Array
rootKeyHash: number
rootCount: number
authority: TxnDirtyPlanAuthority
```

But the semantics must be equivalent to the state algebra above.

Rules:

- empty dirty is exact no-op evidence
- empty dirty must never be encoded as `dirtyAll`
- exact dirty roots must be canonical, prefix-free, stable, and write-order independent
- unknown write must be `dirtyAll` with a reason
- missing path registry authority must fail closed to `dirtyAll`
- structural list changes must fall back to full list scope where exact row evidence is not sufficient
- false positives are allowed
- false negatives are not allowed

The existing plan already introduces `TxnDirtyPlanSnapshot`, stable root hash, dirty-all reason, immutable list evidence, and per-transaction memoization; this addendum makes those semantics mandatory rather than implicit.

## 2. Snapshot Isolation Law

`TxnDirtyPlanSnapshot` is a phase snapshot, not a live view of transaction internals.

Required rules:

- it must not expose mutable transaction `Set` or `Map` references
- list evidence must be cloned or represented as immutable sorted arrays/maps
- later transaction writes must not mutate an earlier dirty-plan snapshot
- repeated reads with unchanged dirty/list evidence must hit the per-transaction memo
- fresh reads are required before converge, validate, and source idle sync
- committed transactions must attach the committed dirty plan so selector routing consumes the same authority after commit

Do not keep two parallel dirty evidence authorities. If temporary adapters are needed during the chunk, remove redundant handoff fields before closing the chunk.

## 3. Root Canonicalization Law

Dirty roots must be canonicalized by field path authority.

Required behavior:

```text
dirty paths:
  user.name
  settings.locale

canonical roots:
  user.name
  settings.locale

dirty paths:
  user
  user.name

canonical roots:
  user
```

Required invariants:

- root ids are sorted deterministically
- root hash is stable for the same logical dirty set regardless of write order
- parent roots collapse child paths
- exact roots require `authority = "field-path-registry"`
- dirty-all fallback must not claim field-path-registry authority
- `fieldPathsKey` may remain optional, but generation/registry mismatch must not create false exactness

The failing tests must prove at least:

```ts
expect(sameDirtySetDifferentWriteOrder.rootKeyHash).toBeSame()
expect(parentPlusChild.rootCount).toBe(1)
expect(unknownWrite.dirtyAll).toBe(true)
expect(emptyDirty.dirtyAll).toBe(false)
expect(snapshotAfterLaterWrite).not.toMutate(previousSnapshot)
```

The existing plan already asks for stable root hash, child collapse, unknown-write non-exactness, empty exactness, and snapshot immutability tests; those tests should be treated as law tests, not just implementation smoke tests.

## 4. Selector Dirty/Read Overlap Law

Selector invalidation must be based on prefix reachability, not exact string equality.

A selector read path `r` overlaps dirty root `d` if either direction is prefix-reachable under the same field path registry:

```text
d is prefix of r
OR
r is prefix of d
```

Examples:

```text
dirty root = user
read path  = user.name
=> overlap, must notify

dirty root = user.name
read path  = user
=> overlap, must notify

dirty root = settings.locale
read path  = user.name
=> no overlap

dirtyAll = true
=> overlap all

dynamic/broad/unregistered selector
=> fail closed / fallback, never false negative
```

Required rules:

- selector routing must consume the committed `dirtyPlan`
- selector routing must not rematerialize local raw dirty evidence
- broad/dynamic fallback must be explicit and diagnosable
- diagnostics may explain fallback reason
- diagnostics-off path must not allocate debug objects or perform avoidable O(n) scans when exact dirty plan exists

The current plan already includes `SelectorGraph.ts`, `selectorRoute.dirty.ts`, selector overlap/fallback tests, and committed dirty-plan consumption; this section freezes the overlap law those tasks must prove.

## 5. List and Row Scope Law

List evidence has two modes:

```text
exact changed-row mode
full fallback mode
```

Exact changed-row mode is allowed only when:

- dirty plan is exact
- dirty plan authority is field-path-registry
- list evidence exists for the list instance
- the list root itself was not structurally touched
- changed row indices are available and immutable
- nested list key is produced by the existing list instance key helper

Full fallback is required when:

- dirtyAll is true
- list evidence is missing
- list root was structurally touched
- list index binding is absent
- row identity cannot be proven
- nested list path cannot be matched by existing authority

Required row behavior:

- row-scoped companion/computed may run only changed row indices when exact evidence exists and the compiled step is proven row-local safe
- structural list changes must keep existing full behavior
- changed row indices must be sorted deterministically
- no second list key format may be introduced
- no public row/list dirty helper may be added

The row-scope plan may use a local function equivalent to:

```ts
const getRowScopeRunPlan = (args: {
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
  readonly listPath: string
  readonly listIndexPath?: ReadonlyArray<number>
}): RowScopeRunPlan => {
  const plan = args.dirtyPlan
  if (!plan || plan.dirtyAll || plan.authority !== "field-path-registry") {
    return { mode: "full", reason: "dirty_all" }
  }

  const key = toListInstanceKey(args.listPath, args.listIndexPath ?? [])
  const list = plan.list

  if (!list) return { mode: "full", reason: "missing_evidence" }
  if (list.rootTouched.has(key)) return { mode: "full", reason: "list_root_touched" }

  const set = list.indexBindings.get(key)
  if (!set || set.size === 0) return { mode: "full", reason: "missing_evidence" }

  return {
    mode: "changed",
    indices: Array.from(set).sort((a, b) => a - b),
  }
}
```

The existing plan already contains this shape for row-scope planning and requires fallback when exact evidence is absent; this addendum makes it the semantic gate.

## 6. Consumer Closure Law

All dirty-plan consumers must consume the same transaction authority.

Required consumers:

```text
StateTransaction
  -> converge
  -> validate
  -> source idle sync
  -> selector dirty/read overlap
  -> row-scoped companion/computed
  -> deferred reachable backlog
  -> external store writeback
  -> React runtime store snapshot
```

Forbidden pattern:

```text
consumer A rebuilds dirty evidence from raw paths
consumer B reads TxnDirtyPlanSnapshot
consumer C makes its own list evidence model
consumer D treats unknown as empty
```

Allowed transition:

```text
temporary adapter from TxnDirtyPlanSnapshot to old dirty evidence type
```

But the adapter must be same-chunk transitional only. The final implementation must not preserve a second dirty handoff route.

The implementation plan already routes dirty-plan usage through `ModuleRuntime.transaction.ts`, `SelectorGraph.ts`, converge/source/validate, row-scoped converge, deferred backlog, external store, and React runtime store; this section requires that closure to be checked as a single consumer graph.

## 7. Deferred Backlog Law

Deferred time-slicing must slice by dirty-reachable deferred steps, not by replaying the full deferred topo slice.

Required rules:

- compute dirty-reachable deferred closure once before slicing
- store deferred backlog as stable step ids
- do not store raw dirty paths as the deferred backlog authority
- do not recompute dirty reachability inside each slice
- unknown / dirtyAll / near-full / budget-cutoff falls back to full deferred topo
- sliced final state must equal full deferred final state

Required assertions:

```ts
expect(executedDeferredSteps).toBeLessThan(totalDeferredSteps)
expect(executedDeferredSteps).toEqual(expectedDirtyReachableDeferredSteps)
expect(slicedFinalState).toEqual(fullDeferredFinalState)
expect(eachSliceDidNotRecomputeDirtyReachability).toBe(true)
```

The plan already has a `Deferred Reachable Backlog` chunk with these tests; this addendum clarifies that this is part of dirty-plan consumer closure, not an optional optimization.

## 8. External Store and Runtime Store Law

External store writeback and React runtime snapshots must not reopen a second dirty/read truth.

Required external-store rules:

- raw external store bursts may be coalesced before writeback
- same-tick burst should commit once
- last value wins
- initial snapshot remains immediate
- finalizer cancels scheduled flush and clears pending writes
- low-priority burst must not block urgent transaction lanes

Required React runtime store rules:

- read committed runtimeStore module snapshot first
- active read-query listener must not force sync fallback when runtimeStore snapshot is available
- snapshot version must match topic version
- do not add production counters solely for tests

The existing plan already includes external-store coalescing, runtimeStore snapshot tests, and lane/priority preservation; this law prevents those chunks from becoming isolated patches detached from dirty-plan closure.

## 9. Performance Claim Law

No performance claim is valid unless the evidence is admissible.

A performance improvement may be claimed only if:

- before/after or diff evidence exists
- `meta.comparability.comparable=true`
- relevant suite ids are present
- claimed suites have `summary.regressions==0`
- timeout / missing suite / stability warning / comparable=false is disclosed as non-admissible
- diagnostics-off hot paths avoid debug allocation and avoid new O(n) scans when exact dirty plan exists

Required evidence locations:

```text
specs/039-field-converge-int-exec-evidence/perf/*.json
specs/073-logix-external-store-tick/perf/*.json
```

Do not write performance conclusions into `docs/perf/**`.

If evidence is after-only, report:

```text
Perf evidence collected, but no improvement claim made because comparable before/diff is missing.
```

The existing plan already requires default perf collection, before/after diff for improvement claims, and no `comparable=false` claim without matching before/diff.

## 10. Public Surface Law

This is internal-only.

Forbidden:

- public `FieldKernel` helper
- public `DirtyPlanSnapshot`
- public dirty-plan namespace
- expert subpath
- compatibility alias
- second authoring route
- public docs that teach dirty plan as user-facing API

Required text sweep:

```bash
rtk rg -n "public FieldKernel|FieldKernel helper|docs/perf|DirtyPlanSnapshot" docs packages examples specs --glob '!docs/proposals/field-kernel-perf.md'
rtk rg -n "dirtyPathIdsKeyHash|sourceIdsByDepRootId" packages
```

Expected:

- no new public FieldKernel/helper wording
- no active `docs/perf/**` writeback instruction
- `DirtyPlanSnapshot` appears only in internal code, internal tests, or implementation evidence docs
- no surviving `dirtyPathIdsKeyHash` typo in changed runtime paths
- no old `sourceIdsByDepRootId` naming after SourceDepIr switches to dirty-root buckets

The current plan already contains this public-surface sweep; this addendum makes it a release gate.

## 11. Implementation Readiness Blockers

Before executing Chunk 1, explicitly answer this checklist.

```text
[ ] DirtyPlanSnapshot state algebra is closed.
[ ] Empty dirty is exact no-op, not dirtyAll.
[ ] Unknown write fallback is dirtyAll with reason.
[ ] Root canonicalization and stable hash are specified.
[ ] Snapshot isolation and immutable list evidence are specified.
[ ] Selector overlap law is prefix reachability, not exact equality.
[ ] Broad/dynamic/unregistered selector fallback is fail-closed.
[ ] List structural-change fallback is full scope.
[ ] Exact changed-row scope only runs when list evidence is complete.
[ ] Consumer closure includes converge/source/validate/selector/row/deferred/external-store/React snapshot.
[ ] No consumer keeps a second dirty authority after transition.
[ ] Diagnostics-off allocation/O(n) constraints are explicit.
[ ] Perf admissibility rules are explicit.
[ ] Public surface non-goals are explicit.
```

If any item is not closed, output:

```text
Implementation readiness blockers:
- <missing law>
- <why implementation cannot safely infer it>
- <which design packet must be supplied before write-plans continues>
```

Do not continue into implementation chunks until the blockers are closed.

## 12. Final Status Requirements

Final status must report:

```text
- files changed
- tests run and exact results
- typecheck result
- lint result if run
- perf evidence paths
- whether improvement claims are admissible
- regressions or instability warnings
- public-surface sweep result
- proposal hygiene status
- commit checkpoints skipped unless explicitly authorized
- any remaining implementation-readiness blocker
```

No final answer may say “performance improved” unless the perf claim law is satisfied.
No final answer may say “dirty precision is exact” unless selector, list, and consumer closure tests pass.
No final answer may say “public surface unchanged” unless the text sweep passes.

## File Structure

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - Exposes `TxnDirtyPlanSnapshot` and `readDirtyPlanSnapshot(ctx)`.
- `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
  - Materializes raw dirty snapshot, canonical prefix-free root ids, stable root hash, authority, immutable list evidence, and dirty-plan memo invalidation.
- `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
  - Attaches the committed dirty plan to `StateTransaction` so post-commit selector routing consumes the same authority.
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - Reads a fresh dirty plan before converge, validate, and source idle sync.
- `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
  - Consumes canonical dirty plan for selector dirty/read overlap instead of rematerializing from raw ids.
- `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
  - Classifies dirty-plan authority/fallback reasons for selector diagnostics.
- `packages/logix-core/src/internal/field-kernel/converge.types.ts`
  - Accepts `dirtyPlan?: TxnDirtyPlanSnapshot` during the phase-local handoff, then removes redundant dirty fields once consumers switch over.
- `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
  - Uses canonical root ids and root hash for admission, cache key, inline dirty key, and fallback reason.
- `packages/logix-core/src/internal/field-kernel/build.ts`
  - Builds `sourceDepIr` and `validateIr` from explicit deps.
- `packages/logix-core/src/internal/field-kernel/model.ts`
  - Stores internal acceleration IR on built `FieldProgram` values.
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
  - Gates source idle sync by `dirtyPlan`.
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
  - Selects checks from `validateIr` and optionally uses incremental list rule protocol.
- `packages/logix-core/src/internal/field-kernel/converge-step.ts`
  - Runs row-scoped companion/computed from a conservative row-scope policy; default is full row execution, and changed-row execution is allowed only when the compiled step is explicitly marked row-local safe.
- `packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts`
  - Adds row pattern templates as needed and switches large bitsets to touched-word clear.
- `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
  - New internal planner owner introduced after DirtyPlanSnapshot is proven.
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - Uses reachable deferred step plans rather than replaying full deferred topo slices.
- `packages/logix-core/src/internal/field-kernel/external-store.ts`
  - Implements scheduled pre-write coalescing for raw external store writeback and preserves commit priority/lane.
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
  - Reads runtimeStore committed module snapshot first even when read-query listener is active.
- `docs/proposals/field-kernel-perf.md`
  - Only touched if this proposal is kept as an active/consumed proposal. Do not treat it as SSoT.

## Chunk 1: Canonical Dirty Plan Authority

### Task 1: Add `TxnDirtyPlanSnapshot` and stable root hash

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts`
- Test: `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`

- [ ] **Step 1: Write the failing dirty plan tests**

Create `packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts`.

Test cases:

```ts
import { describe, expect, it } from 'vitest'
import * as StateTransaction from '../../../src/internal/runtime/core/StateTransaction.js'

describe('StateTransaction dirty plan snapshot', () => {
  it('produces stable root hash for the same dirty set in different write orders', () => {
    const a = makeDirtyPlanForPaths(['user.name', 'settings.locale'])
    const b = makeDirtyPlanForPaths(['settings.locale', 'user.name'])

    expect(Array.from(a.rootIds)).toEqual(Array.from(b.rootIds))
    expect(a.rootKeyHash).toBe(b.rootKeyHash)
    expect(a.authority).toBe('field-path-registry')
  })

  it('collapses child paths under a dirty parent root', () => {
    const plan = makeDirtyPlanForPaths(['user', 'user.name'])
    expect(plan.rootCount).toBe(1)
    expect(pathNames(plan.rootIds)).toEqual(['user'])
  })

  it('does not pretend unknown writes are exact', () => {
    const plan = makeDirtyPlanForUnknownWrite()
    expect(plan.dirtyAll).toBe(true)
    expect(plan.authority).not.toBe('field-path-registry')
    expect(plan.dirtyAllReason).toBeDefined()
  })

  it('represents no dirty as exact no dirty, not dirtyAll', () => {
    const plan = makeDirtyPlanForPaths([])
    expect(plan.dirtyAll).toBe(false)
    expect(plan.rawKeySize).toBe(0)
    expect(plan.rootCount).toBe(0)
    expect(plan.rootKeyHash).toBe(0)
    expect(plan.authority).toBe('field-path-registry')
  })

  it('does not let later transaction writes mutate an earlier phase snapshot', () => {
    const ctx = makeTxnContextWithListEvidence()
    StateTransaction.beginTransaction(ctx, { kind: 'test' }, makeInitialState())
    recordListItemPatch(ctx, 'items.1.name')
    const before = StateTransaction.readDirtyPlanSnapshot(ctx)!

    recordListItemPatch(ctx, 'items.2.name')
    const beforeIndices = before.list?.indexBindings.get('items@@')
    expect(Array.from(beforeIndices ?? [])).toEqual([1])
  })

  it('memoizes unchanged dirty/list evidence within the same transaction', () => {
    const ctx = makeTxnContextWithListEvidence()
    StateTransaction.beginTransaction(ctx, { kind: 'test' }, makeInitialState())
    recordListItemPatch(ctx, 'items.1.name')

    const a = StateTransaction.readDirtyPlanSnapshot(ctx)
    const b = StateTransaction.readDirtyPlanSnapshot(ctx)
    expect(b).toBe(a)

    recordListItemPatch(ctx, 'items.2.name')
    const c = StateTransaction.readDirtyPlanSnapshot(ctx)
    expect(c).not.toBe(a)
  })
})
```

Use local test helpers from adjacent `StateTransaction` tests if they exist. If no helper exists, build the minimal transaction context with `fieldPathIdRegistry` and `recordStatePatch`.

- [ ] **Step 2: Run the new test and confirm red**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts --reporter=dot
```

Expected: FAIL because `readDirtyPlanSnapshot` or helper methods do not exist.

- [ ] **Step 3: Implement the minimal dirty plan materializer**

In `StateTransaction.ts`, add internal-only types:

```ts
export type TxnDirtyPlanAuthority =
  | 'field-path-registry'
  | 'dirty-all'
  | 'missing-registry'
  | 'dirty-root-fallback'

export interface TxnDirtyPlanSnapshot {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly rawPathIds: ReadonlyArray<FieldPathId>
  readonly rawKeyHash: number
  readonly rawKeySize: number
  readonly rootIds: Int32Array
  readonly rootKeyHash: number
  readonly rootCount: number
  readonly authority: TxnDirtyPlanAuthority
  readonly fieldPathsKey?: string
  readonly fieldPathCount: number
  readonly list?: TxnDirtyEvidenceSnapshotList
}

export interface TxnDirtyEvidenceSnapshotList {
  readonly indexBindings: ReadonlyMap<string, ReadonlySet<number>>
  readonly indexBindingsSorted: ReadonlyMap<string, Int32Array>
  readonly rootTouched: ReadonlySet<string>
  readonly itemTouched: ReadonlyMap<string, ReadonlySet<number>>
  readonly itemTouchedSorted: ReadonlyMap<string, Int32Array>
}

export interface TxnDirtyEvidenceSnapshot {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds: ReadonlyArray<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
  readonly list?: TxnDirtyEvidenceSnapshotList
}

export interface StateTransaction<S> {
  readonly dirty: TxnDirtyEvidenceSnapshot
  readonly dirtyPlan: TxnDirtyPlanSnapshot
  // keep existing fields unchanged
}
```

In `StateTransaction.dirty.ts`, implement `materializeDirtyPlanSnapshot(state)`:

```ts
const EMPTY_ROOT_IDS = new Int32Array(0)
const EMPTY_SET: ReadonlySet<never> = new Set()
const EMPTY_INDEX_BINDINGS: ReadonlyMap<string, ReadonlySet<number>> = new Map()
const EMPTY_INDEX_BINDINGS_SORTED: ReadonlyMap<string, Int32Array> = new Map()

const cloneSortedIndexMap = (
  m: ReadonlyMap<string, ReadonlySet<number>>,
): { readonly sets: ReadonlyMap<string, ReadonlySet<number>>; readonly sorted: ReadonlyMap<string, Int32Array> } => {
  if (m.size === 0) return { sets: EMPTY_INDEX_BINDINGS, sorted: EMPTY_INDEX_BINDINGS_SORTED }
  const sets = new Map<string, ReadonlySet<number>>()
  const sorted = new Map<string, Int32Array>()
  for (const [key, indices] of m) {
    if (indices.size === 0) continue
    const arr = Array.from(indices).sort((a, b) => a - b)
    sets.set(key, new Set(arr))
    sorted.set(key, Int32Array.from(arr))
  }
  return { sets, sorted }
}

const cloneStringSet = (set: ReadonlySet<string>): ReadonlySet<string> =>
  set.size === 0 ? EMPTY_SET : new Set(set)

const snapshotListEvidence = <S>(state: StateTxnState<S>): TxnDirtyEvidenceSnapshotList | undefined => {
  if (!state.listPathSet || state.listPathSet.size === 0) return undefined
  const index = cloneSortedIndexMap(state.listIndexEvidence)
  const item = cloneSortedIndexMap(state.listItemTouched)
  return {
    indexBindings: index.sets,
    indexBindingsSorted: index.sorted,
    rootTouched: cloneStringSet(state.listRootTouched),
    itemTouched: item.sets,
    itemTouchedSorted: item.sorted,
  }
}

const cacheDirtyPlan = <S>(state: StateTxnState<S>, snapshot: TxnDirtyPlanSnapshot): TxnDirtyPlanSnapshot => {
  state.dirtyPlanCache = {
    dirtyVersion: state.dirtyVersion,
    listEvidenceVersion: state.listEvidenceVersion,
    snapshot,
  }
  return snapshot
}

export const materializeDirtyPlanSnapshot = <S>(state: StateTxnState<S>): TxnDirtyPlanSnapshot => {
  const cached = state.dirtyPlanCache
  if (
    cached &&
    cached.dirtyVersion === state.dirtyVersion &&
    cached.listEvidenceVersion === state.listEvidenceVersion
  ) {
    return cached.snapshot
  }

  const materialized = materializeDirtyPathSnapshotAndKey(state)
  const list = snapshotListEvidence(state)
  const registryKey = (state.fieldPathIdRegistry as any)?.fieldPathsKey as string | undefined

  const base = {
    rawPathIds: materialized.dirtyPathIds,
    rawKeyHash: materialized.dirtyPathsKeyHash,
    rawKeySize: materialized.dirtyPathsKeySize,
    rootIds: EMPTY_ROOT_IDS,
    rootKeyHash: 0,
    rootCount: 0,
    ...(registryKey ? { fieldPathsKey: registryKey } : null),
    fieldPathCount: state.fieldPathIdRegistry?.fieldPaths.length ?? 0,
    ...(list ? { list } : null),
  }

  if (state.dirtyAllReason) {
    return cacheDirtyPlan(state, { dirtyAll: true, dirtyAllReason: state.dirtyAllReason, authority: 'dirty-all', ...base })
  }

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    return cacheDirtyPlan(state, { dirtyAll: true, dirtyAllReason: 'fallbackPolicy', authority: 'missing-registry', ...base })
  }

  if (materialized.dirtyPathsKeySize === 0 && materialized.dirtyPathIds.length === 0) {
    return cacheDirtyPlan(state, {
      dirtyAll: false,
      authority: 'field-path-registry',
      ...base,
    })
  }

  const dirty = dirtyPathIdsToRootIds({ dirtyPathIds: materialized.dirtyPathIds, registry })
  if (dirty.dirtyAll) {
    return cacheDirtyPlan(state, {
      dirtyAll: true,
      dirtyAllReason: dirty.reason ?? 'unknownWrite',
      authority: 'dirty-root-fallback',
      ...base,
    })
  }

  return cacheDirtyPlan(state, {
    dirtyAll: false,
    rawPathIds: materialized.dirtyPathIds,
    rawKeyHash: materialized.dirtyPathsKeyHash,
    rawKeySize: materialized.dirtyPathsKeySize,
    rootIds: Int32Array.from(dirty.rootIds),
    rootKeyHash: dirty.keyHash,
    rootCount: dirty.rootCount,
    authority: 'field-path-registry',
    ...(list ? { list } : null),
  })
}
```

Add `dirtyVersion`, `listEvidenceVersion`, and `dirtyPlanCache` to `StateTxnState`. Increment `dirtyVersion` whenever `dirtyPathIds` or `dirtyAllReason` changes. Increment `listEvidenceVersion` whenever `listIndexEvidence`, `listItemTouched`, or `listRootTouched` changes. Clear the cache in `beginTransaction()`.

If `FieldPathIdRegistry` does not currently expose a stable key, keep `fieldPathsKey` optional and use `fieldPathCount` plus id range checks for same-generation guards. Do not add a public registry field for this patch.

Keep the existing committed dirty evidence shape only if all selector and row consumers can move to `transaction.dirtyPlan` in this patch. Otherwise upgrade `TxnDirtyEvidenceSnapshot.list` to the immutable snapshot list shape too. Do not keep committed `list` evidence as live mutable transaction maps.

In `StateTransaction.ts`, expose:

```ts
export const readDirtyPlanSnapshot = <S>(ctx: StateTxnContext<S>): TxnDirtyPlanSnapshot | undefined => {
  const state = ctx.current as StateTxnState<S> | undefined
  return state ? Dirty.materializeDirtyPlanSnapshot(state) : undefined
}
```

In `StateTransaction.snapshot.ts`, build the committed dirty plan after `inferReplaceEvidence(ctx, state, finalState)` and before returning the transaction:

```ts
const dirtyPlan = materializeDirtyPlanSnapshot(state)
const dirty = dirtyEvidenceSnapshotFromPlan(dirtyPlan)

return {
  // existing transaction fields
  dirty,
  dirtyPlan,
}
```

`dirtyEvidenceSnapshotFromPlan()` must be explicit. Do not rely on structural overlap between dirty evidence and dirty plan.

Do not allocate a new empty `Int32Array` per dirty-all/missing-registry path.

- [ ] **Step 4: Run the dirty plan test**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Wire dirty plan into converge/validate/source transaction phases**

Modify `ModuleRuntime.transaction.ts`:

```ts
const dirtyBeforeConverge = StateTransaction.readDirtyPlanSnapshot(txnContext)
yield* FieldKernelConverge.convergeInTransaction(fieldProgram as any, {
  ...existingContext,
  dirtyPlan: dirtyBeforeConverge,
})

const dirtyBeforeValidate = StateTransaction.readDirtyPlanSnapshot(txnContext)
yield* FieldValidate.validateInTransaction(fieldProgram as any, {
  ...existingContext,
  dirtyPlan: dirtyBeforeValidate,
  txnDirtyEvidence: StateTransaction.dirtyEvidenceFromPlan(dirtyBeforeValidate),
}, deduped)

const dirtyBeforeSource = StateTransaction.readDirtyPlanSnapshot(txnContext)
yield* FieldSource.syncIdleInTransaction(fieldProgram as any, {
  ...existingContext,
  dirtyPlan: dirtyBeforeSource,
})
```

Keep existing `dirtyAllReason`, `dirtyPaths`, and key fields only until converge/source/validate consumers are converted inside this chunk, then remove redundant handoff fields instead of preserving aliases. Fix the current key typo while touching this path: use `dirtyPathsKeyHash` consistently, not `dirtyPathIdsKeyHash`, unless local type names require a same-chunk transition field.

- [ ] **Step 6: Thread `dirtyPlan` through converge/source/validate context types**

Modify:
- `packages/logix-core/src/internal/field-kernel/converge.types.ts`
- `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- `packages/logix-core/src/internal/field-kernel/validate.impl.ts`

Add `dirtyPlan?: StateTransaction.TxnDirtyPlanSnapshot` to internal context types. Add an explicit internal adapter:

```ts
export const dirtyEvidenceFromPlan = (
  plan: TxnDirtyPlanSnapshot | undefined,
): TxnDirtyEvidence | undefined => {
  if (!plan) return undefined
  return {
    dirtyAll: plan.dirtyAll,
    dirtyAllReason: plan.dirtyAllReason,
    dirtyPathIds: new Set(plan.rawPathIds),
    dirtyPathsKeyHash: plan.rawKeyHash,
    dirtyPathsKeySize: plan.rawKeySize,
    ...(plan.list ? { list: plan.list } : null),
  }
}
```

If this adapter allocation shows up on diagnostics-off hot paths, replace it with direct `dirtyPlan` consumption in `validate.impl.ts` before closing the chunk. Do not change public API, add aliases, or keep a second dirty handoff route after this chunk.

- [ ] **Step 7: Run focused runtime tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergeAuto.DirtySetFromMutate.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.UnknownWriteCoverage.test.ts test/internal/FieldKernel/FieldKernel.RefList.ChangedIndicesFromTxnEvidence.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 8: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/runtime/core/StateTransaction.ts packages/logix-core/src/internal/runtime/core/StateTransaction.dirty.ts packages/logix-core/src/internal/runtime/core/StateTransaction.snapshot.ts packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts packages/logix-core/src/internal/field-kernel/converge.types.ts packages/logix-core/src/internal/field-kernel/source.impl.ts packages/logix-core/src/internal/field-kernel/validate.impl.ts packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts
rtk git commit -m "feat(core): add canonical dirty plan snapshot"
```

## Chunk 1.5: SelectorGraph DirtyPlan Consumption

### Task 1.5: Route selector dirty/read overlap from committed `dirtyPlan`

**Files:**
- Modify: `packages/logix-core/src/internal/runtime/core/SelectorGraph.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts`
- Test: `packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts`

- [ ] **Step 1: Write failing selector dirty-plan tests**

Extend existing selector tests instead of creating a parallel fixture family.

Required assertions:

```ts
expect(selectorGraphDidNotRematerializeRawDirtyIds).toBe(true)
expect(exactSelectorOverlap).toBe('hit')
expect(parentDirtyTriggersChildSelector).toBe(true)
expect(unrelatedDirtyDoesNotWakeSelector).toBe(true)
expect(unknownWriteFallsBackToBroadcast).toBe(true)
```

Concrete cases:

- selector reads `user.name`, transaction dirty root is `user`: selector must run.
- selector reads `user.name`, transaction dirty root is `settings`: selector must not run.
- selector reads `items.3.name`, transaction dirty root is `items`: selector must run.
- `dirtyPlan.authority !== 'field-path-registry'` or `dirtyAll=true`: broadcast and emit existing fallback diagnostic when diagnostics are enabled.

- [ ] **Step 2: Run selector tests and confirm red**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts --reporter=dot
```

Expected: FAIL because `SelectorGraph.onCommit()` still consumes `transaction.dirty` and can rematerialize from raw ids.

- [ ] **Step 3: Change `SelectorGraph.onCommit()` to accept dirty plan**

In `SelectorGraph.ts`, replace the `dirty: TxnDirtyEvidenceSnapshot` parameter with `dirtyPlan: TxnDirtyPlanSnapshot`.

Execution rules:

- If `dirtyPlan.dirtyAll` or `dirtyPlan.authority !== 'field-path-registry'`, evaluate all subscribed selectors.
- If `dirtyPlan.rootCount === 0`, only selectors with no declared reads may run; exact read-query selectors must not run.
- Use `dirtyPlan.rootIds` for routing. Do not rebuild root ids from `dirty.rawPathIds`.
- Parent dirty must match descendant selector reads. Child dirty must match parent selector reads. Preserve the existing `overlaps(a, b)` semantics.
- If a root id is outside the current field-path table, fall back to broadcast and emit the existing fallback diagnostic when diagnostics are enabled.

- [ ] **Step 4: Pass committed `transaction.dirtyPlan` from ModuleRuntime**

In `ModuleRuntime.impl.ts`, change:

```ts
yield* selectorGraph.onCommit(state, meta, transaction.dirty, diagnosticsLevel, onSelectorChanged)
```

to:

```ts
yield* selectorGraph.onCommit(state, meta, transaction.dirtyPlan, diagnosticsLevel, onSelectorChanged)
```

Do not read a new dirty plan after commit. The committed transaction already owns the immutable snapshot.

- [ ] **Step 5: Keep selector fallback diagnostics slim**

In `selectorRoute.dirty.ts`, add dirty-plan authority classification only if needed:

```ts
classifyDirtyPrecision({
  dirtyAll: dirtyPlan.dirtyAll,
  dirtyAllReason: dirtyPlan.dirtyAllReason,
  hasPathAuthority: dirtyPlan.authority === 'field-path-registry',
  missingDirtyPath,
})
```

Do not add raw trace payloads or root id arrays to default diagnostics.

- [ ] **Step 6: Run selector tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/runtime/core/SelectorGraph.ts packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts packages/logix-core/test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts packages/logix-core/test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts packages/logix-core/test/Runtime/ModuleRuntime/SelectorGraph.test.ts
rtk git commit -m "feat(runtime): route selectors from dirty plan"
```

## Chunk 2: Source Idle Dirty Gating

### Task 2: Compile source dependency IR and skip unrelated source key eval

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/model.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/build.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/source.impl.ts`
- Test: `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts`
- Test: `packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.ListDirtyGate.test.ts`

- [ ] **Step 1: Write failing source dirty gate tests**

Create tests that install a program with two unrelated source fields and count key calls.

Required assertions:

```ts
expect(unrelatedKeyEvalCount).toBe(0)
expect(affectedKeyEvalCount).toBe(1)
expect(rowKeyEvalCount).toBe(1)
expect(listRootTouchedFallbackKeyEvalCount).toBe(rowCount)
expect(parentDirtyTriggersChildDepKeyEvalCount).toBe(1)
expect(explicitEmptyDepsKeyEvalCountAfterUnrelatedDirty).toBe(0)
```

Use `FieldKernel.source({ deps, key, ... })` style already used in `FieldKernel.SourceRuntime.test.ts`. Keep counters local to the test.

Also assert build-time deps semantics:

- `deps` missing: build error, no exact gate.
- `deps: []`: explicit no-dependency source, no dirty-triggered idle re-key.
- `deps: ['user.name']` with dirty root `user`: affected source runs.

- [ ] **Step 2: Run the source dirty gate tests and confirm red**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts test/internal/FieldKernel/FieldKernel.Source.SyncIdle.ListDirtyGate.test.ts --reporter=dot
```

Expected: FAIL because all source keys are still evaluated.

- [ ] **Step 3: Add `SourceDepIr` to `FieldProgram`**

In `model.ts`:

```ts
export interface SourceDepIr {
  readonly sourcesById: ReadonlyArray<CompiledSource>
  readonly sourceIdsByDirtyRootId: ReadonlyMap<FieldPathId, Int32Array>
  readonly sourceIdsByFieldPath: ReadonlyMap<string, number>
  readonly fieldPathsKey?: string
  readonly fieldPathCount: number
}

export interface CompiledSource {
  readonly id: number
  readonly fieldPath: string
  readonly depPathIds: Int32Array
  readonly dirtyRootMatchIds: Int32Array
  readonly depsKind: 'explicit-empty' | 'exact'
  readonly listScope?: {
    readonly listPath: string
    readonly itemPath: string
  }
}

export interface FieldProgram<S> {
  readonly entries: ReadonlyArray<FieldEntry<S, string>>
  readonly sourceDepIr?: SourceDepIr
  // keep existing fields unchanged
}
```

- [ ] **Step 4: Build `sourceDepIr` from explicit deps**

In `build.ts`, after `fieldPathIdRegistry` is ready:

```ts
const getAncestorFieldPathIds = (registry, id: FieldPathId): ReadonlyArray<FieldPathId> => {
  const path = registry.fieldPaths[id]
  if (!path || path.length === 0) return []
  const out: Array<FieldPathId> = []
  for (let i = 1; i <= path.length; i++) {
    const key = path.slice(0, i).join('.')
    const ancestor = registry.pathStringToId?.get(key)
    if (ancestor != null) out.push(ancestor)
  }
  return out
}

const buildSourceDepIr = (entries, registry, fieldPathsKey?: string): SourceDepIr | undefined => {
  const sources: CompiledSource[] = []
  const idsByRoot = new Map<FieldPathId, number[]>()
  const sourceIdsByFieldPath = new Map<string, number>()

  for (const entry of entries) {
    if (entry.kind !== 'source') continue
    const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
    if (deps === undefined) {
      throw new Error(`[FieldKernel.build] Missing explicit deps for source "${entry.fieldPath}".`)
    }
    const depPathIds = deps
      .map((dep) => getFieldPathId(registry, normalizeFieldPath(dep) ?? []))
      .filter((id): id is FieldPathId => id != null)
    const dirtyRootMatchIds = Array.from(new Set(depPathIds.flatMap((id) => getAncestorFieldPathIds(registry, id)))).sort((a, b) => a - b)
    const id = sources.length
    const listItem = RowId.parseListItemFieldPath(entry.fieldPath)
    sources.push({
      id,
      fieldPath: entry.fieldPath,
      depPathIds: Int32Array.from(depPathIds),
      dirtyRootMatchIds: Int32Array.from(dirtyRootMatchIds),
      depsKind: deps.length === 0 ? 'explicit-empty' : 'exact',
      ...(listItem ? { listScope: { listPath: listItem.listPath, itemPath: listItem.itemPath } } : null),
    })
    sourceIdsByFieldPath.set(entry.fieldPath, id)
    for (const rootId of dirtyRootMatchIds) {
      const bucket = idsByRoot.get(rootId) ?? []
      bucket.push(id)
      idsByRoot.set(rootId, bucket)
    }
  }

  return sources.length === 0
    ? undefined
    : {
        sourcesById: sources,
        sourceIdsByDirtyRootId: new Map(Array.from(idsByRoot, ([k, v]) => [k, Int32Array.from(v)])),
        sourceIdsByFieldPath,
        ...(fieldPathsKey ? { fieldPathsKey } : null),
        fieldPathCount: registry.fieldPaths.length,
      }
}
```

Reuse the build-time `fieldPathsKey` already computed from the field-path table when available. If the local build flow does not expose that value cleanly, keep it omitted and rely on `fieldPathCount` plus id range guards.

If `RowId` cannot be imported into `build.ts` without creating a cycle, move list parsing into a tiny internal helper under `field-kernel/source-dep-ir.ts`.

- [ ] **Step 5: Gate source idle sync by dirty plan**

In `source.impl.ts`, keep current all-source function as `syncAllSourcesIdle`. Then add:

```ts
if (!ctx.dirtyPlan || ctx.dirtyPlan.dirtyAll || ctx.dirtyPlan.authority !== 'field-path-registry' || !program.sourceDepIr) {
  return syncAllSourcesIdle(program, ctx)
}

const sourceIds = collectAffectedSourceIds(program.sourceDepIr, ctx.dirtyPlan.rootIds)
if (sourceIds.length === 0) return
```

Before collecting, verify the plan and IR are compatible:

- if `program.sourceDepIr.fieldPathCount !== ctx.dirtyPlan.fieldPathCount` or an id is out of range, fall back to full source idle sync
- if both sides expose `fieldPathsKey`, they must match
- never treat `depsKind: 'explicit-empty'` as unknown; it means no dirty-triggered re-key

List row handling:

- If `plan.list?.rootTouched` contains the list instance key, run all rows for that source.
- If exact changed index bindings exist, evaluate only those row keys.
- If no list evidence exists for a list source whose dependency root is dirty, fall back to all rows.
- Nested list evidence must preserve instance key semantics. If uncertain, fall back to all rows.

- [ ] **Step 6: Run source tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts test/internal/FieldKernel/FieldKernel.Source.SyncIdle.ListDirtyGate.test.ts test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Run a targeted browser perf smoke for source-adjacent form path**

Run quick first:

```bash
rtk pnpm perf collect:quick -- --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-source-gating.after.quick.json --files test/browser/perf-boundaries/form-list-scope-check.test.tsx
```

Expected: report writes successfully and includes `form.listScopeCheck`.

- [ ] **Step 8: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/model.ts packages/logix-core/src/internal/field-kernel/build.ts packages/logix-core/src/internal/field-kernel/source.impl.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.DirtyGate.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.Source.SyncIdle.ListDirtyGate.test.ts
rtk git commit -m "feat(core): gate source idle sync by dirty plan"
```

## Chunk 3: Validate Static IR and Incremental List Rule Protocol

### Task 3: Move scoped validate selection to build-time IR

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/model.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/build.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/validate.impl.ts`
- Modify: `packages/logix-form/src/Rule.ts`
- Modify: `packages/logix-form/src/internal/form/rules.ts`
- Test: `packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts`
- Test: `packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts`
- Test: `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`

- [ ] **Step 1: Write failing validate IR tests**

Required assertions:

```ts
expect(buildDependencyGraphCallCountDuringValidate).toBe(0)
expect(selectedCheckNames).toEqual(['affected'])
expect(unrelatedCheckCallCount).toBe(0)
expect(parentFieldRequestSelectsChildPathCheck).toBe(true)
expect(listRequestSelectsItemScopeCheck).toBe(true)
```

Prefer not to monkey-patch module imports. If call-count injection is awkward, assert indirectly by creating a large unrelated graph and verifying only affected rules run.

- [ ] **Step 2: Write failing incremental list rule test**

Use a list-scope rule object with both `validate` and `validateChanged`:

```ts
const uniqueWarehouseRule = {
  deps: ['items[].warehouseId'],
  validate: () => {
    validateAllCallCount += 1
    return []
  },
  validateChanged: (_items, changedIndices) => {
    validateChangedCallCount += 1
    seenChangedIndices = changedIndices
    return []
  },
}
```

Required assertions:

```ts
expect(validateChangedCallCount).toBe(1)
expect(validateAllCallCount).toBe(0)
expect(seenChangedIndices).toEqual([3])
expect(revalidateOnParentReorderFallsBackToFull).toBe(true)
```

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts --reporter=dot
```

Expected: FAIL because validate still builds graph at runtime and never calls `validateChanged`.

- [ ] **Step 4: Add `ValidateStaticIr`**

In `model.ts`:

```ts
export interface ValidateStaticIr {
  readonly checkEntries: ReadonlyArray<CompiledCheck>
  readonly reverseCheckIdsByTargetPath: ReadonlyMap<string, Int32Array>
  readonly listCheckIdsByListPath: ReadonlyMap<string, Int32Array>
  readonly itemCheckIdsByListPath: ReadonlyMap<string, Int32Array>
  readonly fieldPathsKey?: string
  readonly fieldPathCount: number
}

export interface CompiledCheck {
  readonly id: number
  readonly fieldPath: string
  readonly kind: 'field' | 'list' | 'item' | 'root'
  readonly entry: Extract<FieldEntry<any, string>, { readonly kind: 'check' }>
  readonly ruleKeySets: ReadonlyMap<string, ReadonlyArray<string>>
}
```

Build it in `build.ts` using the same `buildDependencyGraph(program)` and `reverseClosure` semantics currently used by `validate.impl.ts`. The output must preserve `toPatternPath()` target semantics for field, list, and item requests.

Add `fieldPathsKey?: string` and `fieldPathCount: number` to `ValidateStaticIr`. If a dirty/validate request comes from a different field-path generation, fall back to full scoped validate rather than skipping checks.

- [ ] **Step 5: Switch `validateInTransaction()` to `validateIr` selection**

In `validate.impl.ts`, replace runtime graph build with:

```ts
const selectedChecks = selectChecksFromValidateIr(program.validateIr, requests)
```

Make `validateIr` part of the built `FieldProgram` shape. If TypeScript exposes fixture or bootstrap programs without `validateIr`, update those builders to construct the IR instead of adding a fallback branch.

- [ ] **Step 6: Add internal optional `validateChanged` protocol**

In core model type for `CheckRule`:

```ts
readonly validateChanged?: (
  input: Input,
  changedIndices: ReadonlyArray<number>,
  ctx: Ctx,
) => unknown | undefined
```

In `evalListScopeCheck()`:

```ts
const changedIndices = ctx.scope.changedIndices
const canUseChanged =
  Array.isArray(changedIndices) &&
  changedIndices.length > 0 &&
  rule &&
  typeof rule === 'object' &&
  typeof (rule as any).validateChanged === 'function'

const out = canUseChanged
  ? (rule as any).validateChanged(input, changedIndices, ctx)
  : typeof rule === 'function'
    ? rule(input, ctx)
    : rule && typeof rule === 'object'
      ? rule.validate(input, ctx)
      : undefined
```

If `changedIndices` exists and `validateChanged` is missing, emit a slim diagnostic only when diagnostics level is not `off`:

```ts
code: 'field::validate_list_scope_full_fallback'
reason: 'rule_incremental_protocol_missing'
```

Treat this protocol as a proof hook for changed-row admission. It does not by itself make uniqueness or cross-row rules O(1). If row identity, list structure, or changed-index evidence is uncertain, call the full `validate` path.

- [ ] **Step 7: Update Form rule lowering only for internal/builtin rules that can be incremental**

Do not expose a new public Form API. If a public type expands structurally, keep it optional and compatible with existing rule objects.

For uniqueness-style builtins in `packages/logix-form/src/internal/form/rules.ts`, add `validateChanged` only where the implementation also avoids full scanning through a rule-specific index or delta protocol. If no builtin currently fits safely, prove the protocol through core tests and leave Form builtin optimization to a later small patch. Do not claim O(1) uniqueness from `validateChanged` alone.

- [ ] **Step 8: Run validate and form tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts test/internal/FieldKernel/FieldKernel.ScopedValidate.test.ts test/internal/FieldKernel/FieldKernel.ListScopeCheck.Writeback.test.ts --reporter=dot
rtk pnpm -C packages/logix-form exec vitest run test/Form/Form.ListScopeUniqueWarehouse.test.ts test/Form/Form.ListScope.ReValidateGate.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 9: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/model.ts packages/logix-core/src/internal/field-kernel/build.ts packages/logix-core/src/internal/field-kernel/validate.impl.ts packages/logix-form/src/Rule.ts packages/logix-form/src/internal/form/rules.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.StaticIr.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.Validate.ListIncrementalRule.test.ts packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts
rtk git commit -m "feat(core): precompile validate selection"
```

## Chunk 4: Row-Scoped Computed and Companion Incremental Execution

### Task 4: Use dirty list evidence to run only affected row-scoped computed steps

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/converge-step.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/build.ts`
- Modify: `packages/logix-form/src/internal/form/impl.ts`
- Test: `packages/logix-core/test/FieldKernel/FieldKernel.Converge.RowScopedComputed.Incremental.test.ts`
- Test: `packages/logix-form/test/Form/Form.Companion.RowScope.Incremental.test.ts`
- Test: `packages/logix-form/test/Form/Form.Companion.RowIdContinuity.test.ts`

- [ ] **Step 1: Write failing row scoped tests**

Required assertions:

```ts
expect(deriveCallCount).toBe(1)
expect(changedRowIds).toEqual([3])
expect(fullFallbackDeriveCallCount).toBe(rowCount)
expect(noStaleCompanionForRemovedRow).toBe(true)
expect(readCompanionByRowId('items', rowId, 'x')).toEqual(expectedCompanionValue)
expect(rowIdCompanionFallbackAfterMoveOrSwap).toBe('full')
```

Cover at least:
- `items.3.name` exact item dirty
- list root touched
- insert/remove/reorder
- nested list parent touched
- unrelated row update with stable rowId mapping
- move/swap with rowId selector fallback to full

- [ ] **Step 2: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.Converge.RowScopedComputed.Incremental.test.ts --reporter=dot
rtk pnpm -C packages/logix-form exec vitest run test/Form/Form.Companion.RowScope.Incremental.test.ts test/Form/Form.Companion.RowIdContinuity.test.ts --reporter=dot
```

Expected: FAIL because current code enumerates every row.

- [ ] **Step 3: Add helper to derive changed row indices**

In `converge-step.ts`, add a helper with conservative fallback:

```ts
type RowScopeRunPlan =
  | { readonly mode: 'changed'; readonly indices: Int32Array }
  | { readonly mode: 'full'; readonly reason: 'missing_evidence' | 'list_root_touched' | 'dirty_all' | 'nested_unknown' }

const getRowScopeRunPlan = (args: {
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
  readonly listPath: string
  readonly listIndexPath?: ReadonlyArray<number>
}): RowScopeRunPlan => {
  const plan = args.dirtyPlan
  if (!plan || plan.dirtyAll || plan.authority !== 'field-path-registry') return { mode: 'full', reason: 'dirty_all' }
  const key = toListInstanceKey(args.listPath, args.listIndexPath ?? [])
  const list = plan.list
  if (!list) return { mode: 'full', reason: 'missing_evidence' }
  if (list.rootTouched.has(key)) return { mode: 'full', reason: 'list_root_touched' }
  const sorted = list.indexBindingsSorted.get(key)
  if (!sorted || sorted.length === 0) return { mode: 'full', reason: 'missing_evidence' }
  return { mode: 'changed', indices: sorted }
}
```

Reuse the existing list instance key helper if available. Root list instance key is `${listPath}@@`; nested instance keys use comma-separated parent indices. Do not create a second key format.

- [ ] **Step 4: Replace full row enumeration where exact changed rows exist**

In `runRowScopedComputedStep()`:

- For `_companionValuePatternPath`, materialize concrete value paths only for the changed row indices when plan is exact.
- For `_rowScopeSourceListPath`, loop `indices` instead of every row when plan is exact.
- If the plan is full fallback, keep existing behavior.
- Structural list changes must stay full fallback.
- RowId-based companion selectors must stay keyed by RowId, not changed index. Index evidence only chooses which rows to execute.
- If a move/swap/reorder can invalidate index-to-rowId mapping, fall back to full row execution.

- [ ] **Step 5: Precompile row pattern template only if it reduces repeated parsing without extra public surface**

If the minimal changed-row implementation passes tests and perf is acceptable, keep pattern parsing local for this chunk. If repeated pattern split shows up in perf evidence, add internal template fields to converge exec IR:

```ts
interface RowPatternTemplate {
  readonly listPath: string
  readonly prefixSegments: ReadonlyArray<string>
  readonly suffixSegments: ReadonlyArray<string>
}
```

Do not expose this type outside internal field-kernel.

- [ ] **Step 6: Run tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.Converge.RowScopedComputed.Incremental.test.ts test/FieldKernel/FieldKernel.Converge.ExecutionSemantics.test.ts --reporter=dot
rtk pnpm -C packages/logix-form exec vitest run test/Form/Form.Companion.RowScope.Authoring.test.ts test/Form/Form.Companion.RowScope.Incremental.test.ts test/Form/Form.Companion.RowIdContinuity.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 7: Run browser form list perf quick**

Run:

```bash
rtk pnpm perf collect:quick -- --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-row-scope.after.quick.json --files test/browser/perf-boundaries/form-list-scope-check.test.tsx
```

Expected: report writes successfully and includes `form.listScopeCheck`.

- [ ] **Step 8: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/converge-step.ts packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts packages/logix-core/src/internal/field-kernel/build.ts packages/logix-form/src/internal/form/impl.ts packages/logix-core/test/FieldKernel/FieldKernel.Converge.RowScopedComputed.Incremental.test.ts packages/logix-form/test/Form/Form.Companion.RowScope.Incremental.test.ts packages/logix-form/test/Form/Form.Companion.RowIdContinuity.test.ts
rtk git commit -m "feat(core): run row scoped fields incrementally"
```

## Chunk 5: Single Converge Planner

### Task 5: Move converge decision and execution plan generation behind one planner

**Files:**
- Create: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts`
- Modify: `packages/logix-core/src/internal/field-kernel/bitset.ts`
- Test: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts`
- Test: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts`
- Test: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.NearFullReason.test.ts`

- [ ] **Step 1: Write failing planner tests**

Required assertions:

```ts
expect(plan.reason).toBe('dirty_sparse')
expect(executionDidNotRecomputeDirtyPlan).toBe(true)
expect(plan.planKeyHash).toBe(dirtyPlan.rootKeyHash ^ scopeKey)
expect(nearFullPlan.reason).toBe('near_full')
```

Use diagnostics trace or a test-only counter in the planner module. Do not add public diagnostics just to prove this.

- [ ] **Step 2: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.NearFullReason.test.ts --reporter=dot
```

Expected: FAIL because planner does not exist and execution can still recompute dirty plan.

- [ ] **Step 3: Create planner request/result types**

In `converge-planner.ts`:

```ts
export interface ConvergePlanRequest {
  readonly execIr: ConvergeExecIr
  readonly dirtyPlan: TxnDirtyPlanSnapshot | undefined
  readonly requestedMode: 'auto' | 'dirty' | 'full'
  readonly schedulingScope: 'all' | 'immediate' | 'deferred'
  readonly schedulingScopeStepIds?: Int32Array
  readonly diagnosticsLevel: 'off' | 'light' | 'full' | 'sampled'
  readonly middlewareStackEmpty: boolean
  readonly decisionBudgetMs?: number
  readonly planCache?: ConvergePlanCache
}

export interface ConvergePlanResult {
  readonly mode: 'noop' | 'full' | 'dirty'
  readonly stepIds?: Int32Array
  readonly deferredReachableStepIds?: Int32Array
  readonly stepCount: number
  readonly affectedSteps: number
  readonly reason:
    | 'no_dirty'
    | 'dirty_all'
    | 'dirty_sparse'
    | 'near_full'
    | 'cache_hit'
    | 'cache_miss'
    | 'decision_budget_cutoff'
    | 'unknown_dirty'
  readonly planKeyHash: number
  readonly fallback?: 'unknown_dirty' | 'near_full' | 'decision_budget'
}
```

- [ ] **Step 4: Phase 1 planner integration**

First only centralize canonical dirty root and cache key:

- `planKeyHash = dirtyPlan.rootKeyHash ^ scopeKey`
- inline dirty micro-cache must use root key, not raw dirty hash
- preserve existing off-fast inline strategy
- preserve existing near-full thresholds

Run tests after this step before removing execution fallback.

- [ ] **Step 5: Phase 2 planner integration**

Move actual plan generation into `planConverge()`.

In `convergeInTransaction()`:

```ts
const plan = planConverge({ execIr, dirtyPlan: ctx.dirtyPlan, requestedMode, schedulingScope, ... })
if (plan.mode === 'noop') return makeNoopOutcome(plan)
if (plan.mode === 'full') runSteps(scopeStepIds)
if (plan.mode === 'dirty') runSteps(plan.stepIds!, plan.stepCount)
```

Remove execution-stage dirty plan recomputation after all tests pass. If this increases p95 in off-fast path, keep one internal fast path inside the planner, not in execution.

- [ ] **Step 6: Add adaptive `DenseIdBitSet` clear strategy**

In `converge-exec-ir.ts`:

```ts
const dirtyClearStrategy = fieldPathCount >= 1024 ? 'touched-words' : 'fill'
const stepClearStrategy = stepCount >= 1024 ? 'touched-words' : 'fill'

dirtyPrefixBitSet: new DenseIdBitSet(fieldPathCount, { clearStrategy: dirtyClearStrategy })
reachableStepBitSet: new DenseIdBitSet(stepCount, { clearStrategy: stepClearStrategy })
```

Keep the existing `DenseIdBitSet` API unchanged.

- [ ] **Step 7: Run converge tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.NearFullReason.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.PlanCacheProtection.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.AdmissionPolicy.boundary.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 8: Run Node converge perf**

Run:

```bash
rtk pnpm perf bench:traitConverge:node -- --profile default --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-planner.after.node.default.json
```

Expected: report writes successfully and includes `converge.txnCommit`.

- [ ] **Step 9: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/converge-planner.ts packages/logix-core/src/internal/field-kernel/converge-in-transaction.impl.ts packages/logix-core/src/internal/field-kernel/converge-exec-ir.ts packages/logix-core/src/internal/field-kernel/bitset.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.StableRootHash.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DecisionExecutionSinglePath.test.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergeAuto.NearFullReason.test.ts
rtk git commit -m "feat(core): unify converge dirty planning"
```

## Chunk 5.5: Deferred Reachable Backlog

### Task 5.5: Slice only dirty-reachable deferred steps

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/converge-planner.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- Test: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DeferredReachable.test.ts`
- Test: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.DeferredReachable.test.ts`
- Test: `packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.test.tsx`

- [ ] **Step 1: Write failing deferred reachable tests**

Required assertions:

```ts
expect(executedDeferredSteps).toBeLessThan(totalDeferredSteps)
expect(executedDeferredSteps).toEqual(expectedDirtyReachableDeferredSteps)
expect(slicedFinalState).toEqual(fullDeferredFinalState)
expect(eachSliceDidNotRecomputeDirtyReachability).toBe(true)
```

Use a module with many deferred computed steps where the dirty root reaches only a small deferred closure.

- [ ] **Step 2: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergePlanner.DeferredReachable.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.DeferredReachable.test.ts --reporter=dot
```

Expected: FAIL because the worker still records raw backlog dirty paths and slices over full deferred topo order.

- [ ] **Step 3: Compute full deferred reachable plan once**

In `converge-planner.ts`, when `schedulingScope === 'immediate'` and deferred time-slicing is enabled, compute:

```ts
deferredReachableStepIds = computeDirtyStepIdsForScope({
  execIr,
  dirtyRoots,
  scopeStepIds: execIr.topoOrderDeferredInt32,
  schedulingScope: 'deferred',
})
```

Rules:

- compute the full dirty-reachable deferred closure from the same dirty plan before slicing
- do not intersect immediate dirty step ids with deferred topo; immediate scope and deferred scope must be planned independently from the same dirty roots
- keep the resulting `Int32Array` stable for the backlog
- if dirty is unknown, near-full, or budget-cut off, use full deferred topo as fallback
- do not recompute dirty roots from raw dirty paths inside individual slices

- [ ] **Step 4: Store deferred backlog as step ids, not raw dirty paths**

In `ModuleRuntime.transaction.ts`, replace `fieldConvergeTimeSlicing.backlogDirtyPaths` accumulation with a backlog of reachable deferred step ids:

```ts
if (plan.deferredReachableStepIds && plan.deferredReachableStepIds.length > 0) {
  fieldConvergeTimeSlicing.addBacklogDeferredStepIds(plan.deferredReachableStepIds)
}
```

Keep `backlogDirtyAllReason` only as the conservative fallback when the planner cannot produce exact deferred step ids.

- [ ] **Step 5: Slice precomputed deferred step ids in the worker**

In `ModuleRuntime.impl.ts`, change worker slicing from `topoOrderDeferredInt32.subarray(start, end)` to a precomputed backlog step-id array:

```ts
const sliceStepIds = fieldConvergeTimeSlicing.takeNextDeferredStepIdSlice({ maxSteps })
runFieldConvergeFlush({ deferredStepIds: sliceStepIds, ... })
```

`field:deferred_flush` transactions should mark enough dirty authority for diagnostics, but converge execution must use the explicit `schedulingScopeStepIds` from the backlog.

- [ ] **Step 6: Preserve lane behavior**

Run the existing lane tests after the worker change:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts --reporter=dot
```

Expected: PASS. Urgent transactions must not wait behind a non-urgent deferred backlog slice.

- [ ] **Step 7: Run deferred perf quick**

Run:

```bash
rtk pnpm perf collect:quick -- --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-deferred-reachable.after.quick.json --files test/browser/perf-boundaries/converge-time-slicing.test.tsx
```

Expected: report writes successfully and includes `converge.timeSlicing`.

- [ ] **Step 8: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/converge-planner.ts packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts packages/logix-core/test/FieldKernel/FieldKernel.ConvergePlanner.DeferredReachable.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.DeferredReachable.test.ts packages/logix-react/test/browser/perf-boundaries/converge-time-slicing.test.tsx
rtk git commit -m "feat(core): slice dirty reachable deferred steps"
```

## Chunk 6: ExternalStore Coalescing and RuntimeStore Snapshot Unification

### Task 6: Make raw external store coalescing real and prefer runtimeStore snapshots

**Files:**
- Modify: `packages/logix-core/src/internal/field-kernel/external-store.ts`
- Modify: `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- Modify: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- Test: `packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts`
- Test: `packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx`
- Test: `packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx`
- Test: `packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx`
- Test: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- Test: `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`

- [ ] **Step 1: Write failing external store coalescing test**

Required assertions:

```ts
expect(commitCountForSameTickBurst).toBe(1)
expect(state[fieldPath]).toBe(lastValue)
expect(initialWriteWasImmediate).toBe(true)
expect(lowPriorityBurstDoesNotBlockUrgentTxn).toBe(true)
```

Use fake timers only if existing tests already use them safely with Effect fibers. Otherwise use a small `coalesceWindowMs` and await the transaction queue deterministically.

- [ ] **Step 2: Write failing RuntimeExternalStore snapshot test**

Required assertions:

```ts
expect(activeListenerRunSyncFallbackCount).toBe(0)
expect(snapshotVersion).toBe(topicVersion)
```

Instrument the test by wrapping the module runtime `getState` effect or using an existing runtimeStore test hook. Do not add production counters for this.

- [ ] **Step 3: Run red tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts --reporter=dot
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx --reporter=dot
```

Expected: FAIL because enqueue flushes immediately and active read-query listener bypasses runtimeStore.

- [ ] **Step 4: Add scheduled flush to `ExternalStoreWritebackCoordinator`**

In `external-store.ts`, extend the coordinator:

```ts
type ExternalStoreFlushPolicy = {
  readonly immediate?: boolean
  readonly coalesceWindowMs?: number
  readonly commitPriority?: 'normal' | 'low'
  readonly lane?: 'urgent' | 'nonUrgent'
}

type ExternalStoreWritebackCoordinator = {
  readonly stage: (request: ExternalStoreWritebackRequest) => Effect.Effect<void, never, never>
  readonly scheduleFlush: (policy: ExternalStoreFlushPolicy) => Effect.Effect<void, never, never>
  readonly flush: () => Effect.Effect<void, never, never>
  readonly enqueue: (request: ExternalStoreWritebackRequest, policy?: ExternalStoreFlushPolicy) => Effect.Effect<void, never, never>
}
```

Implementation requirements:

- same-tick burst with `coalesceWindowMs=0` schedules one microtask flush
- `coalesceWindowMs > 0` delays committed writeback until the window ends
- `stage()` continues replacing by `fieldPath`, so last value wins
- finalizer cancels scheduled flush and clears pending writes
- initial snapshot keeps `writeValueSync(computeValue(after))`
- flushes inherit txn priority/lane from the source request unless an explicit urgent override is provided
- urgent transactions must not wait behind a non-urgent coalesced flush

- [ ] **Step 5: Pass coalesce policy from raw external store loop**

Change:

```ts
const enqueueWriteValue = (nextValue: unknown): Effect.Effect<void, never, any> =>
  coordinator.enqueue(request)
```

to:

```ts
const enqueueWriteValue = (nextValue: unknown): Effect.Effect<void, never, any> =>
  coordinator.enqueue(request, {
    immediate: false,
    coalesceWindowMs: (entry.meta as any)?.coalesceWindowMs ?? 0,
    commitPriority: (entry.meta as any)?.priority === 'nonUrgent' ? 'low' : 'normal',
    lane: (entry.meta as any)?.priority === 'nonUrgent' ? 'nonUrgent' : 'urgent',
  })
```

Keep module-as-source behavior separate unless tests prove it has the same bug and the same policy source.

- [ ] **Step 6: Prefer runtimeStore committed snapshot for read-query store**

In `RuntimeExternalStore.ts`, change read snapshot:

```ts
readSnapshot: () => {
  const state = runtimeStore.getModuleState(moduleInstanceKey) as S | undefined
  const current = state ?? runtime.runSync(moduleRuntime.getState as unknown as Effect.Effect<S, never, any>)
  return selectorReadQuery.select(current)
}
```

Keep `changesReadQueryWithMeta(selectorReadQuery)` drain fiber. It still owns listener registration and dirty topic publication.

- [ ] **Step 7: Run external store and React tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.Runtime.test.ts test/internal/FieldKernel/FieldKernel.ExternalStore.TxnWindow.test.ts --reporter=dot
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts test/internal/RuntimeExternalStore.lowPriority.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 8: Run browser perf quick**

Run:

```bash
rtk pnpm perf collect:quick -- --out specs/073-logix-external-store-tick/perf/field-kernel-external-store.after.quick.json --files test/browser/perf-boundaries/external-store-ingest.test.tsx --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
```

Expected: report writes successfully and includes `externalStore.ingest.tickNotify` and `runtimeStore.noTearing.tickNotify`.

Run the lane tests too:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 9: Commit checkpoint**

Only if the user explicitly authorizes commits:

```bash
rtk git add packages/logix-core/src/internal/field-kernel/external-store.ts packages/logix-react/src/internal/store/RuntimeExternalStore.ts packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.ExternalStore.CoalesceWindow.test.ts packages/logix-react/test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx packages/logix-react/test/browser/perf-boundaries/external-store-ingest.test.tsx packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts
rtk git commit -m "feat(runtime): coalesce external store writebacks"
```

## Chunk 7: Final Verification and Evidence

### Task 7: Run correctness, type, and perf gates

**Files:**
- Modify only if needed: `docs/proposals/field-kernel-perf.md`
- Modify only if active hot-path facts changed: `docs/ssot/runtime/02-hot-path-direction.md`
- Evidence output: active spec `perf/*.json`, not `docs/perf/**`

- [ ] **Step 1: Run focused package tests**

Run:

```bash
rtk pnpm -C packages/logix-core exec vitest run test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts test/Runtime/Runtime.selectorDirtyOverlap.contract.test.ts test/Runtime/Runtime.selectorDirtyFallback.contract.test.ts test/Runtime/ModuleRuntime/SelectorGraph.test.ts --reporter=dot
rtk pnpm -C packages/logix-core exec vitest run test/FieldKernel test/internal/FieldKernel test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.DeferredReachable.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts --reporter=dot
rtk pnpm -C packages/logix-form exec vitest run test/Form/Form.ListScopeUniqueWarehouse.test.ts test/Form/Form.Companion.RowScope.Authoring.test.ts test/Form/Form.Companion.RowScope.Incremental.test.ts test/Form/Form.Companion.RowIdContinuity.test.ts --reporter=dot
rtk pnpm -C packages/logix-react exec vitest run test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx test/internal/store/RuntimeExternalStore.hotLifecycle.test.ts test/internal/RuntimeExternalStore.lowPriority.test.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
rtk pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run lint if touched files introduce lint risk**

Run:

```bash
rtk pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Run default perf evidence for hot-path claims**

For converge and form:

```bash
rtk pnpm perf collect -- --profile default --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-dirty-plan.after.browser.default.json --files test/browser/perf-boundaries/converge-steps.test.tsx --files test/browser/perf-boundaries/converge-time-slicing.test.tsx --files test/browser/perf-boundaries/form-list-scope-check.test.tsx
rtk pnpm perf bench:traitConverge:node -- --profile default --out specs/039-field-converge-int-exec-evidence/perf/field-kernel-dirty-plan.after.node.default.json
```

For external store and runtime store:

```bash
rtk pnpm perf collect -- --profile default --out specs/073-logix-external-store-tick/perf/field-kernel-dirty-plan.after.browser.default.json --files test/browser/perf-boundaries/external-store-ingest.test.tsx --files test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
```

Expected:
- reports are written
- reports include relevant suite ids
- no `comparable=false` claim is made without a matching before/diff

- [ ] **Step 5: Produce before/after diff if claiming improvement**

Use current active baseline or collect a clean before in a separate baseline worktree. Then run:

```bash
rtk pnpm perf diff -- --before <before.json> --after <after.json> --out <active-spec>/perf/diff.field-kernel-dirty-plan.before__after.default.json
```

Expected:
- `meta.comparability.comparable=true`
- `summary.regressions==0` for the suites this implementation claims
- if there are regressions, classify as true runtime regression, evidence artifact, or gate noise before changing code further

- [ ] **Step 6: Text sweep for accidental public surface drift**

Run:

```bash
rtk rg -n "public FieldKernel|FieldKernel helper|docs/perf|DirtyPlanSnapshot" docs packages examples specs --glob '!docs/proposals/field-kernel-perf.md'
rtk rg -n "dirtyPathIdsKeyHash|sourceIdsByDepRootId" packages
```

Expected:
- no new public FieldKernel/helper wording
- no active `docs/perf/**` writeback instruction
- `DirtyPlanSnapshot` appears only in internal code, internal tests, or implementation evidence docs
- no surviving `dirtyPathIdsKeyHash` typo in changed runtime paths
- no old `sourceIdsByDepRootId` naming after SourceDepIr switches to dirty-root buckets

- [ ] **Step 7: Proposal hygiene**

If `docs/proposals/field-kernel-perf.md` remains in the repo, update it according to docs governance:

- add `status / owner / target-candidates / last-updated`
- add it to `docs/proposals/README.md`, or
- mark it consumed with `## 去向` pointing to this plan and any active spec evidence

If the user wants code-only execution, leave proposal hygiene for a separate docs pass and mention it in final status.

- [ ] **Step 8: Final status**

Report:

- files changed
- tests run and exact result
- perf evidence paths
- regressions or instability warnings
- any docs proposal hygiene left undone
- whether commit checkpoints were skipped due to no explicit commit authorization
