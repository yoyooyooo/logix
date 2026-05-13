# Quickstart: Kernel Performance Evidence Lock

## 1. Apply Patch

```bash
git status --short
git rev-parse HEAD
git apply --check patches/0001-kernel-performance-evidence-lock.patch
git apply patches/0001-kernel-performance-evidence-lock.patch
```

## 2. Run Focused Tests

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
```

Adjacent checks:

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts scripts/ci.field-kernel-dirty-work-tax-report.test.ts
```

## 3. Create Local Manifest

Create a local manifest at:

```text
specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json
```

Minimal shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-12T00:00:00.000Z",
  "profile": "default",
  "comparable": true,
  "regressions": 0,
  "budgetExceeded": 0,
  "timeouts": 0,
  "stabilityWarnings": 0,
  "missingSuites": 0,
  "suites": [
    { "id": "negativeBoundaries.dirtyPattern", "status": "pass" },
    { "id": "converge.txnCommit", "status": "pass" },
    { "id": "form.listScopeCheck", "status": "pass" },
    { "id": "externalStore.ingest.tickNotify", "status": "pass" },
    { "id": "runtimeStore.noTearing.tickNotify", "status": "pass" },
    { "id": "react.strictSuspenseJitter", "status": "pass" }
  ],
  "counters": {
    "dirtyPlan.unknownWrite": 0,
    "dirtyPlan.missingRegistry": 0,
    "dirtyPlan.dirtyAll": 0,
    "dirtyPlan.nonFieldAuthority": 0,
    "dirtyPlan.legacyDirtyInput": 0,
    "source.fullFallback": 0,
    "source.rowFullScan": 0,
    "selector.evaluateAll": 0,
    "selector.dirtyAllFallback": 0,
    "selector.nonFieldAuthorityFallback": 0,
    "externalStore.runSyncFallbackAfterBoot": 0
  },
  "evidenceRefs": [
    "<local before artifact>",
    "<local after artifact>",
    "<local diff artifact>"
  ]
}
```

## 4. Classify

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts \
  --manifest specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json \
  --out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.md \
  --json-out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.json
```

Exit code is non-zero unless classification is `locked`. Use `--allow-provisional` only for quick/smoke clue collection and record that the result is not a hard claim.
