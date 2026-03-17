# 2026-03-20 · P0-2 rollout-next（相邻 resolver 壳层扩展）

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是
- accepted_with_evidence：`true`

## 本刀目标

- 基于已吸收的 `P0-2 hot snapshot`，继续扩展到仍有重复 resolve/config shell 的相邻入口。
- 保持动态覆盖语义，不把覆盖层级做扁。
- 禁止重做切口保持不变：`p3/p4/p5/p6` 以及动态覆盖语义扁平化。

## 实施改动

1. `txnLanePolicy` snapshot 路径加对象级缓存
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- 改动：在 `makeResolveTxnLanePolicy` 中新增 `WeakMap<StateTransactionRuntimeSnapshot, ResolvedTxnLanePolicy>`。
- 效果：同一事务快照对象重复解析时，直接命中缓存，跳过重复 fingerprint/apply shell。

2. `traitConvergeConfig` snapshot 路径加对象级缓存
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.traitConvergeConfig.ts`
- 改动：在 `makeResolveTraitConvergeConfig` 中新增 `WeakMap<StateTransactionRuntimeSnapshot, ResolvedTraitConvergeConfig>`，并去掉 snapshot 分支里的 `Option.some` 包装壳。
- 效果：同一快照对象重复解析时直接返回，减少重复壳层开销。

## 语义与风险边界

- 动态覆盖语义未变：
  - 每次事务仍重新 capture runtime snapshot。
  - 快照缓存只对“同一个 snapshot 对象”生效，不跨快照复用。
- 优先级未变：`provider > runtime_module > runtime_default > builtin`。

## 证据

1. resolve-shell 贴边收益（同最小验证命令）
- 文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.validation.vitest.txt`
- 结果：
  - `noSnapshot.avg=0.827ms`
  - `snapshot.avg=0.264ms`
  - `speedup=3.138x`，`saved=68.13%`

2. 相对基线 `v4-perf@e97ec6d3` 的可归因提升
- 基线锚点：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-hot-snapshot-next.runtime-snapshot-resolve-shell.perf.txt`
- 该基线记录：`speedup=1.289x`，`saved=22.41%`
- 本轮验证：`speedup=3.138x`，`saved=68.13%`

3. 邻近守门
- 同文件记录：
  - `operationRunner batch=256`：`speedup=1.095x`
  - `operationRunner batch=1024`：`speedup=1.492x`
- `TimeSlicing.Lanes` 测试通过。

## 最小验证

1. `pnpm -C packages/logix-core typecheck:test`
- 结果：通过
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.validation.typecheck.txt`

2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- 结果：通过（`Test Files 3 passed`, `Tests 3 passed`）
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.validation.vitest.txt`

3. `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=clear`
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-rollout-next.probe-next-blocker.json`

