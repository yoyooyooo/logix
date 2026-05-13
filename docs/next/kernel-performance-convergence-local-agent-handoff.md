# Kernel Performance Convergence Local Agent Handoff

## Objective

Implement the staged P0/P1/P2 convergence work packages in the real repository, collect local evidence, and classify the result with `ci.kernel-performance-convergence-stage-gate.ts`. The local agent must preserve public API, runtime semantics, source authority, selector route ownership, and evidence comparability.

Use [Kernel Performance Observability Standard](../standards/kernel-performance-observability-standard.md) for the ongoing local/CI evidence cadence, pressure knob mapping, counter census, marker artifacts, and small-step optimization workflow. This handoff is only the 231-235 execution package.

## Execution Order

```text
1. Apply this patch package.
2. Run focused classifier tests.
3. Implement 231 adversarial matrix first or confirm an accepted equivalent already exists.
4. Implement P0 fallback precision closure.
5. Collect default evidence and run the stage gate. Stop if P0 is blocked.
6. Implement P1 fixed-cost/diagnostics/list evidence closure.
7. Collect default evidence and run the stage gate. Stop if migrated_cost/migrated_risk appears.
8. Implement P2 examples/playground isolation.
9. Collect final default or soak evidence.
10. Run the stage gate and write reports under `specs/235-kernel-performance-convergence-final-gate/perf/reports/`.
```

## CI / Stable Runner Evidence

Local evidence is a preflight. It can justify the next fix, but it must not be used as the final 231-235 completion claim. Final hard evidence should come from the split `logix-perf` CI chain or an equivalent dedicated stable runner that uploads the full artifact chain.

Primary workflows:

```text
.github/workflows/logix-perf-evidence-structure.yml
.github/workflows/logix-perf-knob-snapshot.yml
.github/workflows/logix-perf-trend-analyze.yml
.github/workflows/logix-perf-convergence.yml
.github/workflows/logix-perf-convergence-soak.yml
```

Use the split roles this way:

```text
evidence structure -> fast PR gate for evidence plumbing
knob snapshot -> default PR/push artifact for current commit pressure/counter visibility
trend analyze -> scheduled/manual comparison across recent same-branch snapshots
convergence -> explicit before/after candidate evidence for a scoped delta or final-gate input
convergence soak -> soak/tail/stability evidence
```

Required artifact chain:

```text
perf/convergence/before.<base>.<env>.<profile>.json
perf/convergence/after.<head>.<env>.<profile>.json
perf/convergence/diff.<base>__<head>.<env>.<profile>.json
perf/convergence/adversarial.<profile>.json
perf/convergence/examples-playground.<profile>.json
perf/convergence/assembly.<profile>.json
perf/convergence/convergence.<profile>.manifest.json
perf/convergence/convergence.<profile>.json
perf/convergence/summary.md
```

Use PR/push knob snapshot artifacts for recurring observability across small commits. Use trend analyze after several comparable snapshots exist on the same branch. Use `logix-perf (convergence)` only when a scoped before/after delta or final-gate input is needed. Use `logix-perf (convergence soak)` for scheduled or manual soak artifacts. Keep `fail_on_blocked=true` only when the run is acting as a final gate. Set it to `false` when collecting blocked artifacts for triage.

## Required Commands

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-convergence-stage-gate.test.ts

pnpm -C packages/logix-perf-evidence test \
  scripts/ci.kernel-performance-evidence-lock.test.ts \
  scripts/ci.selector-notify-tax-report.test.ts \
  scripts/ci.field-kernel-dirty-work-tax-report.test.ts \
  scripts/ci.dispatch-shell-tax-report.test.ts
```

After local evidence exists:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts \
  --before specs/235-kernel-performance-convergence-final-gate/perf/before.<env>.default.json \
  --after specs/235-kernel-performance-convergence-final-gate/perf/after.<env>.default.json \
  --diff specs/235-kernel-performance-convergence-final-gate/perf/diff.<env>.default.json \
  --adversarial-report specs/231-adversarial-performance-matrix/perf/reports/adversarial.<env>.default.json \
  --examples-report specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json \
  --profile adversarial-default \
  --out specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json

pnpm exec tsx packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts \
  --input specs/235-kernel-performance-convergence-final-gate/perf/assembly.default.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json

pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts \
  --manifest specs/235-kernel-performance-convergence-final-gate/perf/convergence.default.manifest.json \
  --out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.md \
  --json-out specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.default.json
```

## Stop Conditions

Stop and report if any of the following occurs:

- applying the patch requires semantic rewrite;
- P0 fallback counters are missing or non-zero in canonical examples;
- source/list/selector improvements increase React render fanout or RuntimeStore notify cost;
- diagnostics-off allocates payloads or emits heavy traces;
- example/playground cost is mixed into kernel performance evidence;
- migration.migratedCost or migration.migratedRisk is missing or positive without maintainer authority;
- quick-only evidence is requested as hard success;
- unrelated worktree changes would need to be overwritten.

## Report Template

```text
delivery_name: kernel-performance-convergence-p0p1p2
delivery_mode: mixed/performance-hot-path/spec/plan/patch
repo_head_before:
repo_head_after:
apply_result:
commands_run:
passed_checks:
failed_checks:
local_fixes:
stage_status:
manifest_path:
classification:
claim_strength:
evidence_artifacts:
risk_or_cost_migration:
stop_conditions_hit:
allowed_claims:
forbidden_claims:
recommended_next_anchor:
```
