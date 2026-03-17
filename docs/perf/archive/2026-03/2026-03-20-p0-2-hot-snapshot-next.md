# 2026-03-20 · P0-2 hot-snapshot-next（RuntimeSnapshot 壳税收口）

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是
- accepted_with_evidence：`true`

## 本刀切口

- 范围固定在 transaction / deferred slice 周围的 runtime 配置解析壳税。
- 具体改动：
  - `makeResolveTxnLanePolicy` 支持传入 `StateTransactionRuntimeSnapshot`，避免重复 `serviceOption` 与额外 `provideService` 包装。
  - `makeResolveTraitConvergeConfig` 支持同一快照输入。
  - `runWithStateTransaction` 在事务入口只捕获一次快照，并复用到 lane 与 converge 解析。
- 动态覆盖语义保持：
  - 每次事务入口仍重新捕获 snapshot。
  - provider/runtime 优先级维持 `provider > runtime_module > runtime_default > builtin`。

## 贴边证据

1. resolver 壳税对照（同进程 A/B）：
   - 文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.runtime-snapshot-resolve-shell.perf.txt`
   - 结果：
     - `noSnapshot.avg=0.574ms`
     - `snapshot.avg=0.445ms`
     - `speedup=1.289x`，`saved=22.41%`
   - 语义守门：同测试内断言 snapshot 与非 snapshot 解析结果一致。

2. 邻近热路径守门（operation/lanes）：
   - 文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.vitest.txt`
   - 结果：
     - `batch=256`：`speedup=1.608x`，`saved=37.80%`
     - `batch=1024`：`speedup=1.483x`，`saved=32.55%`
     - `Test Files 2 passed`，`Tests 2 passed`

## 最小验证

1. `pnpm -C packages/logix-core typecheck:test`
   - 结果：通过
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.typecheck.txt`

2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
   - 结果：通过（`2 passed`）
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.vitest.txt`

3. `python3 fabfile.py probe_next_blocker --json`
   - 结果：`status=clear`
   - 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.probe-next-blocker.json`

## 本轮落盘

- `docs/perf/2026-03-15-v4-perf-next-cut-candidates.md`
- `docs/perf/archive/2026-03/2026-03-20-p0-2-hot-snapshot-next.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.runtime-snapshot-resolve-shell.perf.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.probe-next-blocker.json`
