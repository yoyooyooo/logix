# 2026-03-20 · P1-2 whole-state fallback next（mixed-known/unknown 收紧）

## 最终结论

- 结论：`accepted_with_evidence`
- mergeToMain：是
- accepted_with_evidence：`true`

## 本轮切口

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p1-2-wholestate-fallback-next`
- branch：`agent/v4-perf-p1-2-wholestate-fallback-next`
- 目标：在 `P1-2` 已部分吸收的基线上，继续减少 update/reducer 写路径落到 whole-state `'*'` fallback 的机会
- 禁止重做切口：`p3 no-prod-txn-history`、`p4 projection hints`、`p5 raw eager-only meta`、`p6 traitConverge heavy decision/detail`

## 实现摘要

代码改动：

1. `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `recordKnownTopLevelDirtyEvidence` 改为“部分已知 key 接受”：
  - 旧行为：changed keys 里只要有一个 key 不在 registry，直接返回 `false`，上层进入 `'*'` fallback。
  - 新行为：优先记录可映射的已知 key；只在“没有任何已知 key”时返回 `false`。

2. `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts`
- 新增 `mixedUnknown` 用例（同时修改已知 key 与未知 key），验证 top-level evidence 路径可用，避免退回整笔 fallback。

## 证据

- 结构性证据：
  - `mixedUnknown` 用例在 top-level 模式下通过，说明 mixed-known/unknown 不再被整笔判为不可追踪。
- 微基准证据（`validation.vitest.txt`）：
  - `mixedUnknown`：`legacy.p95=0.017ms` → `topLevel.p95=0.004ms`（约 `0.24x`）
  - `single`：`0.024ms` → `0.010ms`
  - `eight`：`0.026ms` → `0.005ms`
  - `many`：`0.014ms` → `0.012ms`
  - `listRoot`：`0.019ms` → `0.005ms`

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p1-2-wholestate-fallback-next.summary.md`

## 最小验证

1. `pnpm -C packages/logix-core typecheck:test`：通过
2. `pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts`：通过
3. `python3 fabfile.py probe_next_blocker --json`：`status=clear`

## 备注

- 本轮未修改 public API。
- 本轮未触碰禁区文件（`logix-react/**`、`Runtime.ts`、`external-store.ts`、`ModuleRuntime.txnLanePolicy.ts`）。
