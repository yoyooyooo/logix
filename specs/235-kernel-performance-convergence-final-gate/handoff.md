# Handoff — Kernel Performance Convergence Final Gate

## Objective

Classify the combined P0/P1/P2 convergence evidence and produce the controlled local report used for handoff. This stage is the final gate, not a runtime optimization.

## Delivery Mode

```text
mixed:
- performance / hot path
- requirements/spec
- implementation plan
- smoke / command
```

## Scope

This stage may change only the files required to implement its stated local evidence and sentinels. It must not expand public API or rewrite unrelated runtime subsystems.

## Local Execution Notes


The final gate reads evidence. It does not run benchmarks and does not create performance proof by itself. It is only as strong as the local manifest supplied to it.


## Cloud LLM Validation Limitations

The cloud LLM created this staged patch from uploaded snapshots. It did not run pnpm install, package tests, browser tests, perf collect, perf diff, default/soak profile, or local CI.

## Report Template

```text
stage: 235-kernel-performance-convergence-final-gate
repo_head_before:
repo_head_after:
commands_run:
passed_checks:
failed_checks:
local_fixes:
evidence_artifacts:
classification:
claim_strength:
risk_or_cost_migration:
stop_conditions_hit:
allowed_claims:
forbidden_claims:
```

## Cloud-Owned Patch Delivery Notes

This delivery fixes the final gate classifier syntax blocker and adds explicit risk/cost migration gating. A final convergence manifest must include `migration.migratedCost` and `migration.migratedRisk`; any positive migrated cost/risk blocks hard claims unless `acceptedByAuthority=true` is supplied with local authority notes.

Implemented source/test anchors:

- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.test.ts`

## Cloud-Owned Reconciliation Implementation — 2026-05-12

This stage now owns the manifest assembly bridge. The local agent must not hand-build the final convergence manifest except as an emergency diagnostic. Use:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.<profile>.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.<profile>.manifest.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.json
```

Assembler inputs may include:

```text
- AdversarialPerformanceMatrixReport JSON
- KernelPerformanceEvidenceLockReport JSON
- ExamplesPlaygroundIsolationReport JSON
- raw txnHotPath sentinel snapshot
- raw RuntimeExternalStore convergence sentinel snapshot
- explicit local stage/suite/counter overrides backed by local CI evidence
```

Local agent allowed work is limited to applying the patch, resolving small import/context drift, running focused tests, collecting local CI/perf/browser evidence, filling `assembly.<profile>.json`, assembling the manifest, and running the final gate. Stop if evidence requires new runtime design or broad coding.

## Local Evidence Run — 2026-05-12

```text
stage: 235-kernel-performance-convergence-final-gate
repo_head_before: da87bcbdb47c386dd342fec4af940e9dad29b3b5 (/tmp/logix-next-api-before)
repo_head_after: ea57e8b1a5a84ba9f34fe0b3a9cad029a3c0d541 (next-api)
classification: blocked
claim_strength: none
risk_or_cost_migration: migratedCost=0, migratedRisk=0, acceptedByAuthority=false
```

Local fixes were limited to apply/validation fixes:

- `packages/logix-react/test/browser/perf-boundaries/txn-lanes.test.tsx`: replaced the validation-only dynamic selector with `fieldValue(lastKey)` so before/after collection does not trip `selector.dynamic_fallback`. The same validation fix was applied in `/tmp/logix-next-api-before` for comparable baseline collection.
- `packages/logix-perf-evidence/scripts/diff.ts`: added final-gate-readable diff metadata and summary fields (`matrixId`, `matrixHash`, `profile`, `envId`, `budgetExceeded`, `timeouts`, `missingSuites`, `stabilityWarnings`).
- `packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts`: mapped current collect suite names `diagnostics.overhead.e2e` and `txnLanes.urgentBacklog` to final-gate hot paths `diagnostics.overhead` and `txnQueue.directIdle`.

Commands run:

```bash
rtk pnpm perf collect -- --profile default --out specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.default.json
rtk pnpm perf collect -- --profile default --out specs/235-kernel-performance-convergence-final-gate/perf/after.darwin-arm64.chromium-143.headless.default.json
rtk pnpm perf diff -- --before specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.default.json --after specs/235-kernel-performance-convergence-final-gate/perf/after.darwin-arm64.chromium-143.headless.default.json --out specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json
rtk pnpm exec tsx packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts --diff specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json --before specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.default.json --after specs/235-kernel-performance-convergence-final-gate/perf/after.darwin-arm64.chromium-143.headless.default.json --profile adversarial-default --out specs/231-adversarial-performance-matrix/perf/reports/adversarial.darwin-arm64.chromium-143.headless.default.md --json-out specs/231-adversarial-performance-matrix/perf/reports/adversarial.darwin-arm64.chromium-143.headless.default.json
rtk pnpm perf collect -- --profile soak --out specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.soak.json
rtk pnpm -C examples/logix-react test:browser:playground
rtk pnpm -C examples/logix-react test:browser:live-real-carrier
rtk pnpm -C examples/logix-react test:browser:live-dev-only-import
rtk pnpm exec tsx packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts --input specs/234-p2-examples-playground-perf-isolation/perf/examples-playground.default.input.json --out specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.md --json-out specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json
rtk pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json
rtk pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```

Output paths:

- `specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.default.json`
- `specs/235-kernel-performance-convergence-final-gate/perf/after.darwin-arm64.chromium-143.headless.default.json`
- `specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json`
- `specs/231-adversarial-performance-matrix/perf/reports/adversarial.darwin-arm64.chromium-143.headless.default.{md,json}`
- `specs/234-p2-examples-playground-perf-isolation/perf/examples-playground.default.input.json`
- `specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.{md,json}`
- `specs/234-p2-examples-playground-perf-isolation/perf/logs/test-browser-playground.default.log`
- `specs/234-p2-examples-playground-perf-isolation/perf/logs/test-browser-live-real-carrier.default.log`
- `specs/234-p2-examples-playground-perf-isolation/perf/logs/test-browser-live-dev-only-import.default.log`
- `specs/235-kernel-performance-convergence-final-gate/perf/logs/soak-before.collect.blocked.log`
- `specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json`
- `specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json`
- `specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.{md,json}`

Key summaries:

- Default before/after diff is comparable: `comparable=true`, `matrixHash=c8f2c4cb626be089a9fb4636a9d16b70ee6e4d82afc2ad9ce44a3ce3d1a906fc`, `envId=darwin.arm64.chromium.143-0-7499-4.headless`.
- Default diff summary: `regressions=5`, `budgetExceeded=0`, `timeouts=2`, `missingSuites=0`, `stabilityWarnings=2`.
- Adversarial report: `classification=blocked`, `claimStrength=none`; blockers include `summary.regressions=5`, `summary.timeouts=2`, `summary.stabilityWarnings=2`, and systemic cells for required hot paths.
- P2 examples/playground report: `classification=isolated`, `claimStrength=hard`, suites `examples.runtimeWitness=pass` and `examples.playgroundNoiseIsolation=pass`, counters `examples.kernelPlaygroundCostMixed=0` and `examples.publicResidueViolation=0`.
- Final convergence report: `classification=blocked`, `claimStrength=none`. Main blockers are default regressions/timeouts/stability warnings, blocked `adversarialMatrix/P0/P1`, and failing `adversarial.matrix.requiredHotPaths`.
- Missing evidence remains for 16 required counters, including dirtyPlan/source/selector/dispatch/runtimeStore/diagnostics/list counters.

Failed checks and environment blockers:

- Soak before collection did not produce JSON. After about 22 minutes, no active vitest/chromium child process and no soak artifact were observed; the hung process was terminated and recorded in `perf/logs/soak-before.collect.blocked.log`. No soak before-after diff exists.
- `examples/logix-react test:browser:live-dev-only-import` failed because the test expected one browser attachment but observed two. This was recorded as an extra browser evidence failure and was not used to mark P2 runtime witness pass.
- Final gate command exited non-zero because the generated report is blocked, which is the expected result for the current evidence.

Allowed claim:

- Kernel P0/P1/P2 convergence is blocked; use the listed blockers to choose the next local fix.

Forbidden claims:

- Do not claim 235 complete.
- Do not claim global runtime performance improved.
- Do not claim no regressions exist globally.
- Do not claim soak passed or soak diff exists.

## CI Evidence Chain Update — 2026-05-13

This update adds a dedicated CI/stable-runner artifact path for the 231-235 final gate. It does not change runtime behavior and does not mark 235 complete.

The reusable long-running process is now documented in `docs/standards/kernel-performance-observability-standard.md`. It governs local preflight, CI artifact collection, pressure-knob mapping, counter census, failure markers, sparse matrix expansion, and small-step optimization cadence beyond this single final gate.

New apply/validation files:

- `.github/workflows/logix-perf-evidence-structure.yml`
- `.github/workflows/logix-perf-convergence.yml`
- `.github/workflows/logix-perf-convergence-soak.yml`
- `.github/scripts/logix-perf-convergence-summary.cjs`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts`
- `packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.test.ts`

New package hooks:

- `packages/logix-perf-evidence/package.json`: adds `ci:kernel-performance-convergence-assembly-input`.
- `packages/logix-perf-evidence/tsconfig.json`: includes the assembly input helper in package typecheck.

Purpose:

```text
pull_request / push / workflow_dispatch / nightly
  -> structure gate keeps schema, assembly, manifest, and stage-gate plumbing alive
  -> default convergence collects base/head candidate evidence
  -> soak convergence runs on manual/scheduled profile
  -> normalize matrix/browser metadata
  -> diff
  -> adversarial matrix report
  -> examples/playground browser P2 logs and report
  -> assembly input helper
  -> convergence manifest
  -> final stage gate report
  -> upload perf/convergence artifacts even when blocked
```

Operational rule:

- local workstation artifacts are preflight and triage evidence;
- PR/push knob snapshot artifacts are the preferred recurring evidence for consecutive small commits;
- trend analyze artifacts compare recent same-branch snapshots when enough retained artifacts exist;
- convergence artifacts are comparable candidate evidence only when a scoped before/after delta or final-gate input is needed;
- soak is split from default so default artifacts never imply soak passed;
- CI or a dedicated stable runner artifact chain is required before any hard 231-235 convergence claim;
- `fail_on_blocked=true` should be used for final-gate runs;
- `fail_on_blocked=false` is only for collecting blocked artifacts for diagnosis.

Validation run:

```bash
rtk pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-assembly-input.test.ts scripts/assemble-kernel-performance-convergence-manifest.test.ts scripts/ci.kernel-performance-convergence-stage-gate.test.ts scripts/ci.examples-playground-isolation-report.test.ts scripts/ci.adversarial-matrix-report.test.ts
rtk pnpm -C packages/logix-perf-evidence typecheck
```

Result:

```text
perf-evidence scripts tests: 17 files, 67 tests, passed
perf-evidence typecheck: passed
```

Current final-gate conclusion remains:

```text
classification=blocked
claimStrength=none
```
