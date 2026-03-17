# 2026-03-20 · P0-2 operation shell next（operation resolver 壳层下沉）

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是
- accepted_with_evidence：`true`

## 本刀目标

- 在已吸收的 `P0-2 / hot-snapshot-next / rollout-next / operation-rollout` 基线上，继续把 snapshot / resolve-shell 复用下沉到 `ModuleRuntime.operation.ts` 下一层最小切口。
- 仅动 runtime core 内部文件，不触碰 public API 与禁区目录。
- 若无法拿到硬收益则按 docs/evidence-only 收口，本轮优先验证收益是否成立。

## 实施改动

1. `operation` 层新增 runtime snapshot 入口与解析结果对象复用
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.operation.ts`
- 改动：
  - 新增 `OperationRuntimeSnapshot` + `captureOperationRuntimeSnapshot`。
  - `resolveOperationRuntimeServices` 支持可选 snapshot 参数。
  - 按 `middlewareEnv + runSession` 建立 WeakMap 级别 canonical cache，复用 `OperationRuntimeServices` 对象，减少重复壳层对象与 hot-context 重新构造。
  - `readHotOperationRuntimeContext` 在从 `txnContext.current.operationRuntimeServices` 派生 hot-context 后回写，稳定复用链路。

2. `transaction` 入口改为显式消费 operation snapshot
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
- 改动：
  - `captureTxnEntryHotContext` 中先捕获 `operationRuntimeSnapshot`，再走 `resolveOperationRuntimeServices(snapshot)`。
  - 保持原有事务窗口语义，未改变 commit / lane / trait 行为。

3. 新增复用语义守门
- 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.FastPath.test.ts`
- 改动：
  - 新增测试断言：同一 middleware/session 绑定下，`resolveOperationRuntimeServices` 与 snapshot 路径返回同一对象引用，确保壳层复用可持续。

## 语义与风险边界

- 未修改对外 API。
- 未触碰 `StateTransaction.ts`、`RuntimeStore.ts`、`TickScheduler.ts`。
- cache 仅按对象引用复用，不跨对象合并。
- middleware stack 若在同一 env 对象上替换为新引用，解析层会按新引用更新缓存条目，避免陈旧引用残留。

## 证据

1. resolve-shell 贴边收益
- 证据文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.validation.vitest.txt`
- 结果：
  - `noSnapshot.avg=0.633ms`
  - `snapshot.avg=0.258ms`
  - `speedup=2.458x`
  - `saved=59.32%`

2. 相对基线（`v4-perf@97be4b0c`，即 `operation-rollout` 验证口径）增益
- 基线锚点：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.validation.vitest.txt`
- 对比：
  - resolve-shell `noSnapshot.avg: 0.715ms -> 0.633ms`（降低约 `11.47%`）
  - resolve-shell `snapshot.avg: 0.302ms -> 0.258ms`（降低约 `14.57%`）
  - operationRunner `batch=256 speedup: 1.452x -> 1.544x`
  - operationRunner `batch=1024 speedup: 1.497x -> 1.642x`

3. blocker probe
- 证据文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.probe-next-blocker.json`
- 结果：`status=clear`

## 最小验证

1. `pnpm -C packages/logix-core typecheck:test`
- 结果：通过
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.validation.typecheck.txt`

2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- 结果：通过（`Test Files 3 passed`, `Tests 3 passed`）
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.validation.vitest.txt`

3. `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=clear`
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-shell-next.probe-next-blocker.json`
