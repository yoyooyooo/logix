# Kernel Performance Convergence Local Agent Handoff

## Objective

Implement the staged P0/P1/P2 convergence work packages in the real repository, collect local evidence, and classify the result with `ci.kernel-performance-convergence-stage-gate.ts`. The local agent must preserve public API, runtime semantics, source authority, selector route ownership, and evidence comparability.

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
