---
title: Kernel Performance Observability Standard
status: living
version: 2
created: 2026-05-13
---

# Kernel Performance Observability Standard

## Purpose

This standard fixes the long-running performance workflow for Logix runtime/kernel work. It generalizes the 231-235 convergence evidence chain into a repeatable loop for local diagnosis, CI artifact collection, single-branch knob snapshots, trend analysis, explicit before/after convergence checks, and small-step performance optimization.

The goal is evidence-first CI, not pass/fail-only CI. A blocked run is still useful when it preserves enough artifacts to explain which pressure knob, runtime owner, counter, suite, or browser step blocked the claim.

## Operating Model

Performance work must move through this loop:

```text
local preflight
  -> focused local evidence
  -> small implementation step
  -> PR / push knob snapshot artifact
  -> same-branch trend analysis when enough snapshots exist
  -> explicit before/after convergence check only when a delta claim is needed
  -> next focused optimization
  -> nightly / soak stability check
  -> final gate only when artifacts are complete
```

Local evidence answers "what should I try next." CI or a dedicated stable runner answers "what can be claimed."

The default long-running loop is single-branch observation first. Before/after convergence is a higher-friction gate for explicit candidate or final claims, not the only way to observe runtime pressure over time.

## Layered Evidence Gates

| Layer | Trigger | Purpose | Claim Strength |
| --- | --- | --- | --- |
| Local quick | During development | Fast diagnosis, smoke the evidence path | clue |
| Local default | Before pushing a focused step | Catch obvious blockers and missing counters | preflight |
| CI evidence structure | Every PR touching evidence plumbing | Keep schemas, counters, markers, manifest assembly, and gate plumbing alive | structure evidence |
| CI knob snapshot | PR/push for runtime or perf paths | Collect current-commit pressure knob vector, counters, suite status, logs, and markers | current-state evidence |
| CI trend analyze | Scheduled/manual on a branch | Download recent same-branch snapshot artifacts and compare N commits | trend candidate evidence |
| CI convergence | Explicit manual/path-triggered run | Collect comparable base/head before/after artifacts for a specific delta claim | candidate evidence |
| CI convergence soak | Scheduled/manual/final-gate run | Tail, timeout, and stability-warning detection | hard-evidence candidate |
| Release / spec close | Explicit final gate | Full default + soak + adversarial artifacts, with required counters present and zero | hard only if complete |

Quick/smoke artifacts never support release-safe claims. They only justify the next diagnostic step.

## Artifact Authority Split

The hard evidence authority is retained artifacts from CI or an equivalent stable runner. Workflow names are roles; exact filenames may lag the target split while implementation is being tightened. Artifact content and comparability metadata are the authority, not a historical workflow name.

```text
.github/workflows/logix-perf-evidence-structure.yml
  -> schema / assembly / stage-gate / counter-census / marker plumbing
.github/workflows/logix-perf-knob-snapshot.yml
  -> single-branch current-commit knob vector, counters, suite status, logs, markers
.github/workflows/logix-perf-trend-analyze.yml
  -> same-branch recent N snapshot artifact comparison
.github/workflows/logix-perf-convergence.yml
  -> explicit default before/after artifact chain for a chosen base/head
.github/workflows/logix-perf-convergence-soak.yml
  -> soak profile collection through the convergence chain
```

The final gate reads artifacts. It does not create performance proof by itself.

Required common artifact classes:

```text
metadata/run-env.json
metadata/git.json
metadata/matrix.json
metadata/knob-manifest.json
counters/counter-census.json
reports/*.json
reports/*.md
logs/*.log
markers/*.json
SHA256SUMS
```

Snapshot-specific classes:

```text
raw/snapshot.<sha>.<env>.<profile>.json
normalized/snapshot.<sha>.<env>.<profile>.json
reports/snapshot.<profile>.json
reports/snapshot.<profile>.md
reports/adversarial.<profile>.json
reports/examples-playground.<profile>.json
```

Trend-specific classes:

```text
metadata/artifact-index.json
reports/trend.<branch>.<profile>.json
reports/trend.<branch>.<profile>.md
diff/trend.<branch>.<profile>.json
inputs/snapshot-artifacts/*.json
```

Convergence-specific classes:

```text
raw/before.<sha>.<env>.<profile>.json
raw/after.<sha>.<env>.<profile>.json
normalized/before.<sha>.<env>.<profile>.json
normalized/after.<sha>.<env>.<profile>.json
diff/diff.<profile>.json
reports/convergence.<profile>.json
reports/convergence.<profile>.md
```

The current workflow may store some files at the artifact root while the directory layout is being tightened. The required rule is stable content and references first, directory exactness second.

## External Bundle Intake

Uploaded patch or evidence bundles are design inputs, not authority. They may be used to extract missing artifact classes, marker rules, risk ledgers, or verification gaps, but they do not become the repository baseline unless the repo's current facts, standards, workflows, and tests accept them.

Bundle checks such as `git apply --check`, YAML parse, `node --check`, or generated SHA lists are plumbing evidence only. They do not prove runtime performance, browser behavior, default/soak convergence, or 231-235 final completion.

When a bundle conflicts with this standard, keep the standard as the target and translate useful bundle material into the current artifact split. Do not directly apply a bundle just because its patch validates on a reconstructed snapshot.

## Run Metadata

Every retained artifact must record:

```text
commitSha
branch / ref
baseSha when before/after or trend baseline exists
headSha when before/after or trend head exists
workflow name / run id
runner OS / arch / label
Node version
pnpm version
Playwright version
browser name / version
profile
matrixId
matrixHash
perf files
envId
startedAt / finishedAt
timeout settings
sample counts / repeat counts
```

If `matrixHash`, `profile`, `envId`, or browser version is missing, the artifact is at most triage evidence. A single snapshot without a prior comparable artifact can support current-state completeness and blocker analysis, but it cannot support an improvement claim.

## Pressure Knobs

Pressure knobs are evidence inputs, not automatically public runtime configuration. Some knobs map to existing internal/runtime modes. Others are workload shapes used only to stress an owner path.

Pressure knobs must stay inside the perf-evidence workload and report vocabulary. They may be serialized in matrix files, snapshot reports, trend reports, adversarial reports, and CI metadata. They must not become `@logixjs/core` or `@logixjs/react` public API, `Runtime.make` options, or user-facing runtime configuration unless a separate runtime SSoT explicitly promotes them.

| Pressure Knob | Logical Runtime Owner | Required Observation |
| --- | --- | --- |
| `steps` | transaction commit / scheduler | commit duration, cutoffs, queue timing |
| `dirtyRootsRatio` | dirtyPlan / source / selector | dirty fallback counters, source key eval, selector route |
| `mutationPattern` | dirty precision | unknown write, missing registry, dirty-all fallback |
| `selectorFanout` | selector graph | evaluateAll, dirtyAllFallback, notify fanout |
| `sourceListWidth` | source/list evidence | row full scan, list normalize, key eval |
| `diagnosticsLevel` | diagnostics | diagnostics payload, diagnostics-off payload, overhead |
| `storeTopicCount` | RuntimeStore | retained topics, topic notify, no-tearing notify |
| `txnQueueBacklog` | txn queue / lane policy | direct idle, queue wait, backpressure |
| `reactMode` | React host | render count, commit count, strict/suspense jitter |
| `playgroundNoise` | examples/playground isolation | runtime witness vs product/editor cost separation |

Every matrix cell should be addressable by a knob vector:

```json
{
  "cellId": "dirtyRootsRatio=high|selectorFanout=field|diagnosticsLevel=off",
  "knobs": {
    "dirtyRootsRatio": "high",
    "selectorFanout": "field",
    "diagnosticsLevel": "off",
    "txnQueueBacklog": "none",
    "reactMode": "default"
  }
}
```

The knob vector must be preserved in reports so reviewers can compare same-cell before/after and same-head cross-cell behavior.

## Runtime Mapping Rule

Each pressure knob must map to:

```text
scenario fixture
expected runtime owner
required counters
primary metric budget
forbidden migration target
```

Example:

```text
dirtyRootsRatio=high
  -> owner: dirtyPlan/source/selector
  -> required counters: dirtyPlan.dirtyAll, source.fullFallback, selector.evaluateAll
  -> primary metric: runtime.txnCommitMs
  -> forbidden migration: RuntimeStore notify fanout, React render fanout
```

This mapping prevents a local optimization from hiding cost by moving it into another runtime owner.

## Counter Census

CI must produce a counter census before any final claim:

```json
{
  "counter": "dirtyPlan.dirtyAll",
  "stage": "P0",
  "status": "present",
  "value": 0,
  "sourceSuite": "negativeBoundaries.dirtyPattern",
  "sourceFile": "raw/after.<sha>.<env>.default.json"
}
```

Counter states are distinct:

```text
missing -> evidence cannot decide
0       -> fallback/risk did not occur for the recorded scope
>0      -> blocker or migration signal
```

Missing is never pass. Filling absent counters with zero is forbidden.

## Required Chain Counters

The long-running counter groups are:

```text
dirtyPlan:
  unknownWrite
  missingRegistry
  dirtyAll
  nonFieldAuthority
  legacyDirtyInput

source/list:
  fullFallback
  rowFullScan
  keyEval.unrelatedMutation
  stringNormalizeHotPath

selector:
  evaluateAll
  dirtyAllFallback
  nonFieldAuthorityFallback
  dynamicFallback
  cache hit/miss where available

txn queue:
  directIdle
  queue depth
  queue wait
  backpressure
  urgent backlog

RuntimeStore:
  topic fanout allocation
  runSyncFallbackAfterBoot
  retainedTopicLeak
  noTearing tick notify

React/form/list:
  render count
  commit count
  list scope check

diagnostics:
  payload count
  diagnostics-off payload count
  overhead duration

examples/playground:
  kernelPlaygroundCostMixed
  publicResidueViolation
```

New counters must be added only when they close a real attribution gap. They should not create a second runtime truth source.

## Failure Markers

Collection should preserve blocked evidence instead of disappearing artifacts.

If a command fails, CI should write a marker:

```json
{
  "status": "blocked",
  "reason": "timeout",
  "suite": "react.deferPreload",
  "profile": "soak",
  "command": "pnpm perf collect ...",
  "exitCode": 124,
  "startedAt": "2026-05-13T00:00:00.000Z",
  "endedAt": "2026-05-13T00:20:00.000Z",
  "logRef": "logs/react.deferPreload.soak.log"
}
```

`blocked` is better than `missing` for analysis. Missing means the evidence pipeline itself lost information.

## Claim Boundary Guards

Observation and advisory fields must not be promoted into hard authority.

Snapshot and trend reports must expose machine-readable claim boundaries:

```text
artifactRole
claimStrength
allowedClaimKinds
forbiddenClaimKinds
```

Required negative boundaries:

```text
snapshot -> may claim current-state only; must forbid improvement, final-convergence, and release-safe claims
trend    -> may claim trend prioritization only; must forbid scoped improvement, final-convergence, and release-safe claims
LLM / reviewer advisory -> may exist only as advisory; final gate must ignore it when machine-readable counters, suites, or migration gates fail
```

If an advisory summary says "pass" while required counters are missing or non-zero, the gate remains blocked or incomplete. Gate evaluators read artifact manifests, counters, suites, migration fields, and markers; they do not read natural-language summaries as proof.

## Sparse Matrix Strategy

Do not run a full Cartesian product by default. Use sparse anchor cells plus selected pair interactions.

The sparse policy is a long-term evidence design principle, not only a CI cost shortcut. Matrix builders must default to sparse mode, enforce profile-level cell budgets, and require a blocked marker or maintainer override before full Cartesian expansion.

The checked-in matrix policy lives in `packages/logix-perf-evidence/assets/matrix.json` under `matrixPolicy`, with guard logic in `packages/logix-perf-evidence/scripts/lib/adversarial-matrix-policy.ts`.

Anchor cells:

```text
default baseline
diagnostics off
diagnostics full
dirty precision pressure
source external-store pressure
selector negative-boundary pressure
txn burst pressure
runtime store fanout pressure
list high-cardinality pressure
react strict/suspense pressure
examples/playground isolation pressure
```

Pair interaction cells:

```text
dirty precision x selector
dirty precision x source
txn burst x runtime store
diagnostics full x list high-cardinality
react strict/suspense x store notify
playground noise x runtime witness
```

Expand the matrix only after blocked artifacts show the missing interaction is material.

## Local Workflow

For each focused optimization:

```text
1. Pick one owner path and one pressure knob.
2. Run targeted tests and quick/local evidence.
3. Confirm required counters are present before optimizing.
4. Make the smallest implementation change.
5. Re-run the same local evidence.
6. Record whether the change reduced cost, moved cost, or only changed noise.
7. Push or open PR to collect stable CI artifacts.
```

Local commands may use quick/default evidence to shorten feedback, but final wording must say "preflight" unless CI artifacts confirm it.

## CI Workflow

CI should separate observation, analysis, convergence, and enforcement:

```text
structure gate
  -> schema, report assembler, manifest, and stage-gate tests
knob snapshot
  -> PR/push current-commit artifact collection for pressure vector visibility
trend analyze
  -> scheduled/manual same-branch comparison across recent snapshot artifacts
default convergence
  -> manual/path-triggered before/after artifact collection for comparable delta review
soak convergence
  -> scheduled/manual soak artifact collection for timeout and stability review
final enforcement
  -> only after artifact upload, and only for an explicit final gate run
```

Inside any collection workflow, the phase order is:

```text
collect evidence
normalize evidence
write failure markers
assemble reports
upload artifacts
enforce final gate
```

Artifact upload must run before final enforcement. A blocked final gate should still leave enough files for review.

### Evidence Structure

`logix-perf (evidence structure)` is a PR hard gate for the evidence system. It should remain fast and should not run broad runtime performance collection. It blocks when the artifact schema, counter census builder, marker writer, manifest assembler, summary writer, or final-gate reader breaks.

### Knob Snapshot

`logix-perf (knob snapshot)` is the default CI observation unit for small commits. It runs on one branch and one commit. It records:

```text
commitSha / branch / run id
profile / envId / matrixHash
pressure knob vector per cell
suite status: pass / fail / blocked / timeout / missing / skipped
required counters: present / missing / value
logs and markers
artifact checksums
```

Snapshot artifacts answer:

```text
What pressure was applied on this commit?
Which counters are observable now?
Which owner path is fragile?
Which suite or browser step is blocked?
```

If snapshot collection fails or times out, the workflow must still upload a blocked snapshot report when possible. The report may have zero cells and all required counters marked missing, but it must preserve the marker, log reference, commit/env/profile metadata, claim boundary, and checksum. Trend analysis needs this blocked snapshot so a failing commit is counted as evidence movement instead of disappearing from the artifact chain.

They do not answer:

```text
Did this commit improve performance versus another commit?
Is final 231-235 convergence complete?
```

### Trend Analyze

`logix-perf (trend analyze)` downloads recent same-branch snapshot artifacts, normally the latest N retained artifacts for the branch, and compares stable fields. It may be scheduled daily or manually dispatched.

Trend analysis should be deterministic first:

```text
artifact index resolution
env/profile/matrix comparability check
counter presence and value deltas
suite status movement
marker movement
primary metric trend
stability warning trend
```

LLM participation is optional and advisory. It may summarize likely owner attribution, but it is not the source of truth. The machine-readable trend report is the authority.

Trend artifacts support current-branch regression suspicion and prioritization. They do not replace explicit before/after convergence when a PR or final gate needs a scoped delta claim.

### Convergence

`logix-perf (convergence)` remains the explicit before/after workflow. Use it when a reviewer needs to evaluate a specific base/head claim, when a performance patch is ready for candidate evidence, or when 231-235 final-gate inputs must be assembled.

Convergence should not be the only long-running observability surface. It is heavier, harder to compare across noisy runners, and couples collection to a pair of refs. Keep it for claims that need a scoped delta.

### Soak

`logix-perf (convergence soak)` is independent from default evidence. A clean default run must not imply soak success. If soak cannot collect, write a blocked or timeout marker and classify the claim as incomplete for hard-gate purposes.

PR hard blocks:

```text
schema tests fail
assembly helper fails
required counter census cannot be generated
final gate cannot read manifest
```

PR soft blocks or review-required states:

```text
quick-only performance claim
default diff blocked
counter missing
soak skipped
artifact upload path is empty
browser P2 skipped
stability warning present
```

## Analysis Workflow

Use CI artifacts for five comparisons.

Snapshot current state:

```text
Are all required counters present with values?
Which suite/cell is blocked, missing, skipped, or timing out?
Which owner path is currently fragile under its pressure knob?
```

Same-branch trend:

```text
Across recent commits on this branch, which counter, suite status, marker, or metric moved?
Is the movement comparable by env/profile/matrixHash?
```

Same-cell before/after:

```text
Did the focused pressure scenario improve for the same knob vector?
Did required counters stay present and zero?
```

Same-head cross-cell:

```text
Which pressure knob is currently most fragile?
Which owner path starts the non-linear cost growth?
```

Single-knob attribution:

```text
When one knob is raised, which runtime owner counter moves first?
Does cost appear in the intended owner or migrate elsewhere?
```

Each analysis should classify the result:

```text
tax_removed
stable_guarded
migrated_cost
migrated_risk
blocked
inconclusive
```

## Development Cadence

Use small commits or small PRs by default:

```text
one pressure knob
one runtime owner path
one counter/cost claim
one CI artifact set
```

Do not mix unrelated runtime changes, evidence schema changes, and optimization changes unless the evidence pipeline is blocked without the schema fix. Prefer this sequence:

```text
1. evidence structure stays green
2. push focused runtime/evidence step
3. inspect knob snapshot artifact
4. use trend analyze after several comparable snapshots exist
5. run convergence only for an explicit delta or final-gate claim
6. run soak only when stability/tail behavior is the question
```

Recommended PR body fields:

```text
owner path:
pressure knob:
expected counter movement:
forbidden migration:
local preflight:
CI artifact:
classification:
next blocker:
```

## Iteration Backlog

The next infrastructure improvements should be handled in this order:

1. Keep `counter-census.json` authoritative with required counter present/missing/value/source.
2. Keep `knob-manifest.json` authoritative and preserve knob vectors per matrix cell.
3. Emit marker JSON for collect timeout, suite failure, missing suite, skipped browser suites, and blocked browser attachment.
4. Materialize snapshot artifacts in the stable `metadata/raw/normalized/counters/reports/logs/markers` layout, including blocked snapshots when raw collection is missing.
5. Materialize convergence artifacts in the stable `metadata/raw/normalized/diff/counters/reports/logs/markers` layout.
6. Add or split `logix-perf (trend analyze)` to compare recent same-branch snapshot artifacts.
7. Add sparse matrix pair interactions after counter census and snapshot stability are reliable.
8. Promote recurring implementation details into helper scripts or CI reports after they stabilize across two performance waves.

## Current 231-235 Application

For 231-235, the current conclusion remains:

```text
classification=blocked
claimStrength=none
```

The immediate use of this loop is not to claim completion. It is to turn the current blockers into actionable artifact deltas:

```text
required counters missing -> add real collection or sentinel source
default regressions -> identify owner path and pressure knob
timeouts -> write timeout markers and isolate suite/profile
stabilityWarnings -> compare same-cell repeat behavior
P2 browser anomalies -> preserve logs but keep them out of kernel hard claim unless isolated
```

For the next waves, the preferred CI path is:

```text
small commit -> knob snapshot -> same-branch trend if enough snapshots exist -> convergence only for scoped delta -> soak/final gate only for hard claim
```

Only after required counters are present, default is clean, soak is collected or explicitly scoped, and the final gate reports `complete/hard` may the convergence claim be made.
