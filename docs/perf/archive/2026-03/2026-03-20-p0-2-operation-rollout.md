# 2026-03-20 · P0-2 operation rollout（concurrency resolver 壳层扩展）

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是
- accepted_with_evidence：`true`

## 本刀目标

- 在已吸收的 `P0-2 + rollout-next` 基线上，把 runtime snapshot / resolve shell 复用继续扩到下一层。
- 优先选择 `ModuleRuntime.concurrencyPolicy.ts` 的 resolver 壳层，保持语义优先级与动态覆盖行为。
- 不触碰禁止切口：`p3/p4/p5/p6`。

## 实施改动

1. `concurrencyPolicy` 增加 runtime snapshot capture + snapshot 命中缓存
- 文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.ts`
- 改动：
  - 新增 `captureSchedulingPolicyRuntimeSnapshot`（别名 `captureConcurrencyPolicyRuntimeSnapshot`）。
  - `makeResolveSchedulingPolicySurface` 支持可选 snapshot 参数，并新增 `WeakMap<snapshot, resolved>`。
  - 在原 fingerprint cache 之前新增对象引用快路径，减少重复 fingerprint 构造与壳层开销。
- 效果：同一 snapshot 对象重复解析时直接命中缓存，且非 snapshot 路径在对象引用稳定时可提前返回。

2. resolve-shell 微基准扩展到 concurrency resolver
- 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts`
- 改动：把 `resolveConcurrencyPolicy` 纳入 noSnapshot/snapshot 两组循环，并新增语义等价断言。
- 效果：新增可归因收益面覆盖到 concurrency resolver。

3. operation hot-context 微基准门禁稳定化
- 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts`
- 改动：将测试超时从 `20_000` 上调到 `30_000`，避免 CI/本机抖动造成假红。

## 语义与风险边界

- 未改变并发策略语义与优先级：`provider > runtime_module > runtime_default > builtin`。
- snapshot 缓存只对同一 snapshot 对象生效，不跨对象复用。
- 未改 public API，仅内部 runtime/core 与内部测试。

## 证据

1. expanded resolve-shell 贴边收益
- 文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.validation.vitest.txt`
- 结果：
  - `noSnapshot.avg=0.715ms`
  - `snapshot.avg=0.302ms`
  - `speedup=2.368x`，`saved=57.77%`

2. 邻近守门
- 同文件记录：
  - `operationRunner batch=256`：`speedup=1.452x`
  - `operationRunner batch=1024`：`speedup=1.497x`
- `TimeSlicing.Lanes` 通过。

3. blocker probe
- 文件：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.probe-next-blocker.json`
- 结果：`status=clear`

## 最小验证

1. `pnpm -C packages/logix-core typecheck:test`
- 结果：通过
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.validation.typecheck.txt`

2. `pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.RuntimeSnapshot.ResolveShell.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.operationRunner.TransactionHotContext.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts`
- 结果：通过（`Test Files 3 passed`, `Tests 3 passed`）
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.validation.vitest.txt`

3. `python3 fabfile.py probe_next_blocker --json`
- 结果：`status=clear`
- 证据：`specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-2-operation-rollout.probe-next-blocker.json`
