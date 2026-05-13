# StageGateRecord: G1

- gate: `G1`
- result: `NOT_PASS`
- mode: `strict_gate`
- timestamp: `2026-03-07T01:15:00+0800`

## criteria

- `gate_a_passed`: `PASS`
- `gate_b_passed`: `PASS`
- `core_typecheck_test_passed`: `PASS`
- `core_test_passed`: `PASS`
- `strict_perf_budget_passed`: `NOT_PASS`
- `diagnostics_budget_passed`: `NOT_PASS`
- `perf_abs_gate_passed`: `NOT_PASS`
- `perf_rel_gate_passed`: `NOT_PASS`
- `baseline_debt_declared`: `PASS`
- `current_head_perf_blockers_cleared_for_implementation`: `PASS`

## commands

```bash
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-core typecheck:test
pnpm check:schema-v4-legacy
pnpm -C packages/logix-query typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/Bound/Bound.test.ts -t "ignore invalid actions"
pnpm check:forbidden-patterns -- --base HEAD
pnpm -C packages/logix-core test
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/WorkflowRuntime.075.test.ts test/internal/Runtime/Process/TriggerStreams.RuntimeSchemaCache.test.ts
pnpm perf collect -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json --allow-partial
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json --allow-partial
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json --out specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.quick.json
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json --allow-partial
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json --allow-partial
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.default.json
gh workflow run ".github/workflows/logix-perf-sweep.yml" --ref main -f base_ref=8cb40d43 -f head_ref=8d4f36b1 -f perf_files="test/browser/perf-boundaries,test/browser/watcher-browser-perf.test.tsx" -f perf_profile=quick -f diff_mode=strict
gh run view 22602840155 --json status,conclusion,url,jobs
gh run download 22602840155 --dir specs/103-effect-v4-forward-cutover/perf/gh-22602840155
pnpm perf collect -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.rs-es.tune.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.rs-es.tune.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.rs-es.tune.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.rs-es.tune.json
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/RuntimeStore.listenerSnapshot.test.ts test/internal/FieldKernel/FieldKernel.TraitCheckEvent.DiagnosticsLevels.test.ts test/Debug/Debug.RuntimeDebugEventRef.Serialization.test.ts
pnpm -C packages/logix-react exec vitest run test/internal/RuntimeExternalStore.lowPriority.test.ts
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/external-store-ingest.test.tsx test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx test/browser/perf-boundaries/form-list-scope-check.test.tsx
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw2.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw2b.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3b.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3c.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3c.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3c.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw4.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw4b.json
pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergeAuto.DiagnosticsLevels.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.CorrectnessInvariants.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.PlanCacheProtection.test.ts test/internal/FieldKernel/FieldKernel.TraitCheckEvent.DiagnosticsLevels.test.ts
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5b.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5c.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5c.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5c.json
pnpm -C packages/logix-core exec vitest run test/internal/FieldKernel/FieldKernel.EffectOpIntegration.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.DeterministicIds.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.DiagnosticsLevels.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.CorrectnessInvariants.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.PlanCacheProtection.test.ts test/internal/FieldKernel/FieldKernel.TraitCheckEvent.DiagnosticsLevels.test.ts
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx test/browser/perf-boundaries/external-store-ingest.test.tsx test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
pnpm -C packages/logix-react test -- --project browser test/browser/watcher-browser-perf.test.tsx
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6b.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6c.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6c.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6c.json
pnpm -C packages/logix-core exec vitest run test/FieldKernel/FieldKernel.ConvergeAuto.DecisionBudget.SmallSteps.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.DecisionBudget.test.ts test/FieldKernel/FieldKernel.ConvergeAuto.CorrectnessInvariants.test.ts test/internal/FieldKernel/FieldKernel.EffectOpIntegration.test.ts
pnpm -C packages/logix-react test -- --project browser test/browser/perf-boundaries/form-list-scope-check.test.tsx
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw7.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw7.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw7.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8b.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8b.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8b.json
pnpm -C packages/logix-perf-evidence collect:quick -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8c.json
pnpm -C packages/logix-perf-evidence diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8c.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8c.json
```

## evidenceRefs

- `specs/103-effect-v4-forward-cutover/inventory/gate-a.md`
- `specs/103-effect-v4-forward-cutover/inventory/gate-b.md`
- `specs/103-effect-v4-forward-cutover/plan.md`
- `packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/state-field/external-store.ts`
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.record.ts`
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`
- `packages/logix-core/src/internal/state-field/validate.impl.ts`
- `packages/logix-core/src/internal/state-field/converge-in-transaction.impl.ts`
- `packages/logix-core/src/internal/state-field/converge-step.ts`
- `packages/logix-core/src/internal/state-field/reverse-closure.ts`
- `packages/logix-react/src/internal/store/RuntimeExternalStore.ts`
- `packages/logix-react/test/browser/perf-boundaries/form-list-scope-check.test.tsx`
- `packages/logix-react/test/browser/watcher-browser-perf.test.tsx`
- `scripts/checks/forbidden-patterns.ts`
- `scripts/checks/schema-v4-legacy.ts`
- `scripts/checks/schema-v4-legacy.test.ts`
- `packages/logix-query/src/Query.ts`
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
- `packages/logix-core/test/internal/Bound/Bound.test.ts`
- `docs/perf/2026-03-06-s10-txn-lanes-native-anchor.md`
- `docs/perf/2026-03-06-s11-post-s10-blocker-probe.md`
- `docs/perf/2026-03-06-s14-watchers-native-anchor-pre-handler-split.md`
- `.github/workflows/ci.yml`
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.rs-es.tune.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.rs-es.tune.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw2.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw2b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw2b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw3c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw3c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw4.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw4b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw4b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw5c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw5c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw6c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw6c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw7.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw7.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8b.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.ulw8c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.ulw8c.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.local.strict.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/s6.gh.quick.strict.broad.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/gh-22602840155/logix-perf-sweep-22602840155/before.8cb40d43.gh-Linux-X64.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/gh-22602840155/logix-perf-sweep-22602840155/after.8d4f36b1.gh-Linux-X64.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/gh-22602840155/logix-perf-sweep-22602840155/diff.8cb40d43__8d4f36b1.gh-Linux-X64.quick.json`

## baselineDebt（no-worse）

| id | owner | noWorseThreshold | status | exitCondition | evidenceRef |
| --- | --- | --- | --- | --- | --- |
| `watchers.clickToPaint.reactStrictMode=false` | `logix-react perf` | `p95(after) <= p95(before) * 1.05 且 Δp95 <= 5ms`（若两侧均 budgetExceeded） | `OPEN` | default+soak strict 下移出 budgetExceeded，且稳定性告警消失 | `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.rs-es.tune.json` |
| `negativeBoundaries.dirtyPattern.group` | `logix-core runtime` | 每个 pattern slice 满足 `afterMaxLevel >= beforeMaxLevel` | `OPEN` | broad quick/default strict 下全部 pattern 切片满足 no-worse 且无新增 after-only | `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.rs-es.tune.json` |

## notes

- 进展：core `typecheck:test` 与全量 core 测试均通过（`pnpm -C packages/logix-core exec vitest run --silent --reporter=dot` => `279 passed / 634 passed / 1 skipped`）；T088 fail-fast 脚本已接入 CI 且本轮校验通过。
- 进展：已补齐 Stage2 Browser/Node 的 local quick strict before/after/diff，且 `comparability=true`（无 config/env mismatch，仅 `git.dirty.after=true` 告警）。
- 进展：before 报告在 detached baseline worktree（`8d4f36b1`）采集，after 报告在当前工作区采集，以确保 before/after 口径分离；临时 worktree 已移除。
- 进展：已补齐 Stage2 Browser/Node 的 local default strict before/after/diff，且 `comparability=true`（无 config/env mismatch，仅 `git.dirty.after=true` 告警）。
- 判读：quick 档位为 browser `10/9`、node `9/5`；default 档位为 browser `14/2`、node `8/3`（`regressions/improvements`）。当前仍不满足 `strict_perf_budget_passed` / `diagnostics_budget_passed`。
- 对照：S6.5 的 GitHub `soak+strict`（run `22588230728`）在 workflow 默认 `perf_files=converge-steps` 范围内为 `0/0`，可作为发布口径补充证据，但不足以替代 G1 对本地 Stage2 全量 strict 预算判定。
- 对照：广覆盖 `quick+strict`（run `22602840155`）已在 GitHub 成功完成，`comparability=true`，但结论为 `regressions=11`、`head budgetExceeded=33`（`status=has_regressions`），进一步确认 G1 仍不可放行。
- 复盘：广覆盖 `soak+strict`（run `22591257199`）在 `Collect (base)` 失败并产生 `no_diff` 产物，已补充失败与修复链路证据（见 `s6.gh.quick.strict.broad.summary.md`）。
- 进展：回滚 converge 激进阈值后完成本地 broad quick 复测（`s2.diff.local.quick.rs-es.tune.json`），回归计数收敛到 `5/7`（此前 quick 为 `10/9`）。
- 双门判读：`Gate-Abs` 当前被 4 个 after-only 阻塞项卡住（`converge.txnCommit@dirtyRootsRatio=0.7`、`externalStore.ingest.tickNotify`、`runtimeStore.noTearing.tickNotify`、`form.listScopeCheck@light`）；`Gate-Rel` 因 `regressions=5` 仍未过线。
- debt 判读：`watchers.clickToPaint` 与 `negativeBoundaries.dirtyPattern` 已按 no-worse 归入 baseline debt 台账，当前为 `OPEN`，不作为“新增回归”解释，但仍保留收敛责任。
- 说明：G1 仍 `NOT_PASS`；发布级硬门禁继续以 GitHub `logix-perf-sweep.yml` 的 `perf_profile=soak + diff_mode=strict` 为准。
- 进展：ULW2/ULW3 连续 quick broad 已完成（`ulw2=14/7`、`ulw2b=12/7`、`ulw3=9/7`、`ulw3b=23/2`、`ulw3c=20/6`），确认本地噪声较高且仍存在稳定 after-only 阻塞；ULW3 三次中位为 `20/6`。
- 判读：`externalStore.ingest.tickNotify` 与 `runtimeStore.noTearing.tickNotify` 的 `full/off<=1.25` 持续不达标；`form.listScopeCheck(light)` 持续 after-only，`off/full` 档位波动显著。
- 进展：ULW4/ULW4b 复测（`21/6`、`18/6`）显示 `runtimeStore/externalStore` 有回收迹象（`full/off<=1.25` 从 `after=null` 改善到 `after=128/256`，且 externalStore 在 `ulw4b` 轮通过），但 `form.listScopeCheck@light` 仍未收敛。
- 进展：新增 `dirty_all/unknown_write` fast-path（避免在已知 dirty-all 场景执行 `dirtyPathsToRootIds`）与 `reverseClosure` O(1) 队列遍历后，`form-list-scope-check` 定向用例中 `light` 降至 `maxLevel=10`（`firstFail=30`）。
- 进展：ULW5 三轮 quick broad（`13/4`、`17/5`、`25/5`）中位为 `17/5`；`runtimeStore.noTearing.tickNotify` 稳定收敛到 `after=128`，`externalStore` 仅首轮回归，但 `form.listScopeCheck` 仍跨轮不稳定，G1 继续阻塞。
- 进展：新增 `runWriterStep` 的无 middleware 快路（避免无 stack 场景下构建 EffectOp meta），并保持 EffectOp middleware 有 stack 时语义不变；相关集成/确定性测试全部通过。
- 进展：修复 `watcher-browser-perf` 采集链路的 strict locator 歧义（改为 `getByRole(...).first()`），恢复 quick 收集稳定性。
- 进展：ULW6 三轮 quick broad（`15/4`、`17/5`、`15/8`）中位为 `15/5`；`runtimeStore/externalStore` 整体维持回收，但 `form.listScopeCheck` 在 `light/off` 仍跨轮出现 `after:budgetExceeded`，G1 继续阻塞。
- 进展：新增 tiny-graph `auto->full` 提前切换（`scopeStepCount<=2`）与 form 基准观测对齐（full/auto 同 capture sink）；ULW8 三轮 quick broad 为 `17/5`,`16/5`,`16/5`（中位 `16/5`）。
- 判读：`externalStore.ingest.tickNotify` 在 ULW8 triplet 未复现回归，`runtimeStore.noTearing.tickNotify` 仍稳定 `before=512 -> after=128`，`form.listScopeCheck` 仍在 `off/light/full` 少量切片抖动，G1 继续阻塞。
- 更新（2026-03-07）：`docs/perf` 的 current-head 结论已明确 `S-10/S-11/S-14` 后不存在默认 runtime/benchmark blocker；旧 perf 阻塞不再阻止继续实施 Stage 2 剩余迁移项。
- 更新（2026-03-07）：本记录仍保持 `result=NOT_PASS`，因为它绑定的 strict broad gate 快照与 `GP-1` 前置条件尚未被正式重算/放行；依据 `FR-015`，这只限制宣称 `G1/G2/G5` 性能 gate 通过，不限制继续实现任务。
- 更新（2026-03-07）：已完成 `T033/T036` 的 Schema 子轨第一刀：`logix-query` 移除旧的动态 union helper，并新增 `pnpm check:schema-v4-legacy` 作为 Stage 2 验收门。
- 更新（2026-03-07）：已完成 `T022` 的第一刀：`Runtime.setTraitConvergeOverride/setSchedulingPolicyOverride/setConcurrencyPolicyOverride` 已改成 effectful API，不再在公开边界直接 `runtime.runSync(...)`。
- 更新（2026-03-07）：已完成 `T022` 的第二刀：`ExternalStore.fromSubscriptionRef/fromStream` 已去除 public sugar 层的原始 `Effect.runSync/runFork` 直连，收敛到 managed runtime 生命周期控制。
- 更新（2026-03-07）：`T021` 已完成两个局部 reference 子点：`execVmMode` 与 `currentLinkId` 改为 `Context.Reference + Effect.provideService`，相关核心回归通过。
- 更新（2026-03-07）：`T020` 已完成第一刀：新增 `serviceId -> Context.Tag` / `moduleId -> runtime tag` 的单点 helper，并替换 `WorkflowRuntime` / `ProcessRuntime` 与相关 missing-streams 测试中的动态 tag 构造。
- 更新（2026-03-07）：已完成 `T031`：对照 `diagnostics/s0.snapshot.md` 的 Stage 0 基线后，事务/lifecycle/debug serialization 与 diagnostics levels 的关键回归全绿，当前无“可解释性下降”证据。
- 更新（2026-03-07）：`T024` 生产路径扫描通过，core src 不再存在直接 `yield* fiber` 风险写法。
- 更新（2026-03-07）：已完成 `T035`：`$.onAction(schema)` 现在先识别 schema，再用 `decodeUnknownEither` 做安全过滤；非法输入只会被丢弃，不会终止后续合法 action 流。
