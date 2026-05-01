# VOB-01 Real W5 Extraction Plan

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| owner | `coordination-main-agent` |
| status | `planned` |
| decision_question | `在不发明第二套引用体系的前提下，real W5 extraction path 最小应该复用哪些现有 runtime / form 坐标` |

## Reusable Facts Already Present

- `submitAttempt.reasonSlotId`
  - owner: Form submit truth
  - source: [errors.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/errors.ts)
- row-scoped `$rowId`
  - owner: Form row identity substrate
  - sources:
    - [rowid.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/rowid.ts)
    - [Internal.RowId.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/test/internal/Internal.RowId.test.ts)
- companion ownership / source ownership export
  - source: [artifacts.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/artifacts.ts)
- bundle patch path seed
  - source: [impl.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-form/src/internal/form/impl.ts)

## Missing Facts For Real W5

- true `bundlePatchRef`
- true `ownerRef`
- true `canonicalRowIdChainDigest`
- true `transition / retention`

These are the missing runtime-owned extraction targets.  
They must be derived from existing runtime / form internals, not invented as a parallel naming system.

## Minimal Extraction Strategy

### Step 1

Keep `reasonSlotId` from current Form state truth.

### Step 2

Derive row-scoped locality from existing row identity substrate:

- list path
- `$rowId`
- current runtime rowId store

### Step 3

Derive a temporary runtime-owned `ownerRef` and `canonicalRowIdChainDigest` from the same row identity source.

### Step 4

Treat `bundlePatchRef` as the last missing runtime-owned coordinate.

That means the next real proof should aim to prove:

- `reasonSlotId`
- plus runtime-derived row locality

before it tries to prove:

- stable `bundlePatchRef`

## Recommended Next Failing Test

Create one failing test that proves the helper no longer accepts fully synthetic input.

The test should require:

- a real Form runtime
- a row-scoped duplicate or submit-blocking scenario
- extracting `reasonSlotId` from current state
- extracting row locality from rowId substrate
- then calling a narrower runtime-owned helper that still only allows synthetic `bundlePatchRef`

This keeps one fake coordinate left, instead of all coordinates being fake.

## Explicit Non-goals

- do not freeze exact `bundlePatchRef` constructor here
- do not add compare truth
- do not add public `Runtime.trial(mode="scenario")`
- do not add Form-side helper or public DSL

## Verdict

The next implementation step should narrow synthetic input from five fields to one field.  
That is the smallest honest move toward real `W5` extraction.
