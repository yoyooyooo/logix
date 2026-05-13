# Handoff — Kernel Performance Evidence Lock

## Preflight

```text
repo_head_before: 6d625a61648dcdf2aaa2433fda7de928a23adda7
dirty_worktree_before: only kernel-performance-evidence-lock-bundle.zip was untracked
existing_unrelated_changes: none observed
agent_start_time: 2026-05-12T04:20:36Z
cloud_bundle_created_at: 2026-05-12
cloud_source_snapshot: source.xml uploaded 2026-05-12T00:05:47Z / docs.xml uploaded 2026-05-12T00:05:25Z / specs.xml uploaded 2026-05-12T00:05:28Z
```

## Scope Decision

```text
started: yes
blocked: no for patch application and structural validation; yes for any hard performance lock claim until local default/soak evidence exists
waiver_if_any: none
```

## Delivery Mode

```text
mixed:
- performance / hot path
- requirements/spec
- implementation plan
- smoke / command
- docs-only evidence protocol
```

## Objective

Apply an additive evidence-lock patch that classifies kernel performance evidence without changing runtime behavior. The patch must make missing/fallback evidence explicit and must prevent quick-only or cloud-only evidence from becoming a hard performance claim.

## Scope

This delivery may change:

| Path | Allowed change | Why |
|---|---|---|
| `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts` | create | classifier/report CLI |
| `packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts` | create | focused contract tests |
| `docs/next/kernel-performance-evidence-lock.md` | create | evidence-lock rules |
| `specs/230-kernel-performance-evidence-lock/**` | create | speckit requirements, plan, tasks, handoff, perf artifact home |

This delivery must not change:

| Path / subsystem | Forbidden change | Why |
|---|---|---|
| runtime core semantics | any mutation | this is an evidence lock, not an optimizer |
| public package exports | new exports/submodules | avoid public API expansion |
| packed XML snapshots | edits | snapshots are read-only context |
| existing perf thresholds | weakening | avoid fake pass |

## Apply Procedure

```bash
git status --short
git rev-parse HEAD
git apply --check patches/0001-kernel-performance-evidence-lock.patch
git apply patches/0001-kernel-performance-evidence-lock.patch
```

Expected: patch check and apply pass from repo root.

## Validation Procedure

```bash
pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
# Expected: PASS

pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts scripts/ci.field-kernel-dirty-work-tax-report.test.ts
# Expected: PASS or unrelated pre-existing failures documented

git diff --check -- packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts docs/next/kernel-performance-evidence-lock.md specs/230-kernel-performance-evidence-lock
# Expected: PASS
```

Optional local classification:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts \
  --manifest specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json \
  --out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.md \
  --json-out specs/230-kernel-performance-evidence-lock/perf/report.<sha>.<env>.default.json
```

## Evidence Interpretation

Hard success claim requires:

```text
profile: default or soak
comparable: true
regressions: 0
budgetExceeded: 0
timeouts: 0
stabilityWarnings: 0
missingSuites: 0
required suites: all present and passing
watched fallback counters: all present and zero
```

Quick/smoke evidence only supports `provisional`.
Missing counters or missing suites classify as `incomplete`.
Non-zero fallback counters classify as `blocked`.

## Cloud LLM Validation Limitations

The cloud LLM generated this patch package from uploaded snapshots. It did not run:

```text
pnpm install
package tests
browser tests
perf collect
perf diff
default profile sweep
soak profile sweep
local CI
```

The cloud may claim only:

```text
- A patch bundle was generated.
- The patch is designed against the uploaded source/docs/spec snapshots.
- The handoff and speckit files state local validation requirements.
```

The cloud must not claim:

```text
- The patch applies in the live repo.
- Tests pass locally.
- Performance improved.
- No regressions exist.
- The kernel is release-safe.
```

## Report

本次本地执行结果见下节。原始 bundle report template 已由实际值替代。

## Local Execution Report

```text
delivery_name: kernel-performance-evidence-lock
delivery_mode: mixed performance/hot-path + requirements/spec + patch
repo_head_before: 6d625a61648dcdf2aaa2433fda7de928a23adda7
repo_head_after: 6d625a61648dcdf2aaa2433fda7de928a23adda7
dirty_worktree_before: only kernel-performance-evidence-lock-bundle.zip was untracked
dirty_worktree_after: new evidence-lock files plus docs/next index update; bundle zip remains untracked
apply_result: git apply --check passed, git apply passed
commands_run:
- git status --short
- git rev-parse HEAD
- git apply --stat from bundle patch
- git apply --check from bundle patch
- git apply from bundle patch
- pnpm -C packages/logix-perf-evidence test scripts/ci.kernel-performance-evidence-lock.test.ts
- pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts scripts/ci.field-kernel-dirty-work-tax-report.test.ts
- git diff --check -- packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.test.ts docs/next/kernel-performance-evidence-lock.md specs/230-kernel-performance-evidence-lock
- pnpm -C packages/logix-perf-evidence typecheck
- pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts --manifest <tmp default manifest missing required evidence>
passed_checks:
- patch check passed
- focused classifier test passed: 6 files, 19 tests
- adjacent evidence tests passed: 7 files, 26 tests
- task-owned diff hygiene passed
- package typecheck passed
- incomplete CLI smoke exited 1 as expected
failed_checks: none
expected_failures: none
local_fixes:
- docs/next/README.md now links the active Kernel Performance Evidence Lock topic
- tasks.md now reflects completed local apply/structural-validation steps and open evidence-collection steps
files_changed_after_apply:
- docs/next/README.md
- specs/230-kernel-performance-evidence-lock/handoff.md
- specs/230-kernel-performance-evidence-lock/tasks.md
evidence_artifacts:
- none generated; no default/soak manifest was provided or collected in this handoff
classification: incomplete
claim_strength: none
risk_or_cost_migration:
- not evaluated by this structural patch
- must be checked by a later local default/soak manifest covering dirtyPlan/source/selector/store/React counters
stop_conditions_hit:
- hard performance lock claim stopped because local default/soak manifest and report are absent
scope_deviations:
- added docs/next/README.md index entry to satisfy active next topic routing
unresolved_questions:
- exact local manifest production remains a follow-up evidence collection task
allowed_claims:
- The evidence-lock classifier, tests, docs rule, and speckit handoff were applied locally.
- Local structural validation passed for the classifier and adjacent evidence scripts.
- Current kernel performance lock state is incomplete until a default/soak manifest is produced and classified.
forbidden_claims:
- Kernel Performance Evidence Lock is locked.
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Quick/smoke evidence proves release-safe performance.
recommended_next_anchor:
- collect or assemble specs/230-kernel-performance-evidence-lock/perf/manifest.<sha>.<env>.default.json, then run the classifier to generate Markdown and JSON reports
```
