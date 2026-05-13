# StageGateRecord: Gate-B

- gate: `Gate-B`
- result: `PASS`
- mode: `strict_gate`
- timestamp: `2026-03-03T00:26:33+08:00`

## criteria

- `no_new_runtime_run_entry_direct_hits`: `PASS`
- `taskrunner_global_depth_not_on_main_path`: `PASS`
- `s2b_strict_perf_diagnostics_replay_ready`: `PASS`

## commands

```bash
rg -n "runSync\(|runFork\(|runPromise\(|runSyncExit\(|runPromiseExit\(" packages/logix-core/src packages/logix-react/src packages/logix-sandbox/src
git diff -- packages/logix-core/src packages/logix-react/src packages/logix-sandbox/src | rg "^[+-].*(runSync\(|runFork\(|runPromise\(|runSyncExit\(|runPromiseExit\()"
rg -n "enterSyncTransaction\(|exitSyncTransaction\(|isInSyncTransaction\(" packages/logix-core/src
pnpm check:forbidden-patterns -- --base HEAD
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run test/internal/ExternalStore/ExternalStore.Sugars.test.ts test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.Runtime.test.ts test/internal/FieldKernel/FieldKernel.ExternalStoreTrait.TxnWindow.test.ts test/Runtime/Runtime.runProgram.transactionGuard.test.ts test/internal/Runtime/Process/TriggerStreams.RuntimeSchemaCache.test.ts
pnpm -C packages/logix-core test
pnpm perf collect -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json
pnpm perf collect -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.json
pnpm perf bench:traitConverge:node -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json
pnpm perf bench:traitConverge:node -- --profile quick --out specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json --allow-partial
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json --allow-partial
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json --after specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json --out specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.quick.json
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json
pnpm perf collect -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.diff.local.default.json
pnpm perf bench:traitConverge:node -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json
pnpm perf bench:traitConverge:node -- --profile default --out specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json --allow-partial
pnpm perf validate -- --report specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json --allow-partial
pnpm perf diff -- --before specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json --after specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json --out specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.default.json
```

## evidenceRefs

- `specs/103-effect-v4-forward-cutover/tasks.md`
- `specs/103-effect-v4-forward-cutover/plan.md`
- `packages/logix-core/src/internal/runtime/core/process/triggerStreams.ts`
- `packages/logix-core/src/internal/runtime/core/process/ProcessRuntime.make.ts`
- `packages/logix-core/src/internal/state-field/external-store.ts`
- `packages/logix-core/src/internal/runtime/core/TaskRunner.ts`
- `packages/logix-core/src/internal/runtime/core/runner/ProgramRunner.ts`
- `scripts/checks/forbidden-patterns.ts`
- `.github/workflows/ci.yml`
- `package.json`
- `eslint.config.mjs`
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.quick.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.before.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.after.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.diff.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.before.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.after.local.default.json`
- `specs/103-effect-v4-forward-cutover/perf/s2.node.diff.local.default.json`

## notes

- 进展：`triggerStreams` 已切换为 `moduleRuntimeRegistry` 路径，动态 Module Tag 不再出现在触发流热路径。
- 进展：T086 已将 `externalStore` 的 `subscriptionRef/stream` 主路径收敛到 install 作用域执行（避免主路径直连 `Effect.runSync/runFork`）。
- 进展：T087 已将 `enter/exit/isInSyncTransaction` 旧调用点从主路径清零，改为 shadow API（`enter/exit/isInSyncTransactionShadow`）承载非 Effect 入口兜底守卫。
- 进展：T088 已新增 `scripts/checks/forbidden-patterns.ts` 并接入 CI（`ci.yml`）执行 fail-fast（事务窗口 IO、业务 `SubscriptionRef` 写入、legacy run* 入口）。
- 进展：本轮验证通过 `pnpm check:forbidden-patterns -- --base HEAD`、`pnpm -C packages/logix-core typecheck:test`、`pnpm -C packages/logix-core exec vitest run --silent --reporter=dot`（`279 passed / 634 passed / 1 skipped`）。
- 进展：已补齐本地 strict quick Browser before/after/diff（`comparability=true`，告警 `git.dirty.after=true`，摘要 `regressions=17/improvements=4`）。
- 进展：已补齐 Node before/after/diff（`comparability=true`，告警 `git.dirty.after=true`，摘要 `regressions=9/improvements=3`），并保留 `--allow-partial` validate 说明。
- 进展：`s2.before.local.quick.json` 与 `s2.node.before.local.quick.json` 均由临时 detached worktree（`8d4f36b1` clean baseline）采集，结束后已清理该 worktree。
- 进展：已补齐本地 strict default Browser before/after/diff（摘要 `regressions=14/improvements=2`）与 Node before/after/diff（摘要 `regressions=6/improvements=4`）。
- 说明：Gate-B 通过口径为 strict 证据链齐备；预算归因与发布级放行仍依赖后续 strict 判读与 GitHub `soak+strict` sweep。
