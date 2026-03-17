# 2026-03-16 · P0-1 txn direct fast path 独立 worktree 复核

## 前提

- 本次执行目录：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.p0-1-txn-direct`
- 进入 worktree 时，`HEAD=11dfce72`，且与母线 `v4-perf` 同指向。
- `P0-1` 代码与首轮证据已经在母线历史内：
  - `9f2242ec` `perf(txn): add off idle direct enqueue fastpath`
  - `69ccc579` `docs(perf): add off comparable evidence for txn fastpath`

这次不再新增运行时代码，只补齐独立 worktree 下的 RED 复放、当前 HEAD 绿灯与 targeted perf 复核，确认该刀在当前母线仍可归类为 `accepted_with_evidence`。

## RED

做法：

1. 用 `git archive 9f2242ec^` 导出基线快照到 `.tmp/p0-1-red`。
2. 复用当前 `ModuleRuntime.txnQueue.Lanes.test.ts`，只跑 direct-path 用例。

命令：

```bash
git archive 9f2242ec^ | tar -x -C .tmp/p0-1-red
cp packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  .tmp/p0-1-red/packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts
pnpm -C .tmp/p0-1-red/packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  -t "should skip policy resolution for uncontended idle executions when diagnostics are off"
```

结果：

- 用例如预期失败。
- 失败点与首轮记录一致：`resolveCalls` 实际为 `2`，预期为 `0`。
- 这说明 direct fast path 用例对原始缺口仍然有真实杀伤力。

## GREEN

命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.TransactionOverrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.LinkIdFallback.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.DiagnosticsScopePropagation.test.ts
```

结果：

- `4` 个文件通过
- `9` 个测试通过

## 类型门

命令：

```bash
pnpm -C packages/logix-core typecheck:test
```

结果：

- 通过

## Targeted Perf

口径：

- 当前实现：`HEAD=11dfce72`
- 对照基线：`9f2242ec^=d3f726e0`
- 同机、同依赖链接、同脚本、同参数
- 场景：单 reducer、单字段写入、`diagnostics=off`、纯 `runtime.dispatch(...)`
- 参数：`iterations=800`，`warmup=120`

当前实现 5 轮：

- run1: `p50=0.053ms`, `p95=0.105ms`, `avg=0.066ms`
- run2: `p50=0.055ms`, `p95=0.103ms`, `avg=0.068ms`
- run3: `p50=0.056ms`, `p95=0.126ms`, `avg=0.075ms`
- run4: `p50=0.056ms`, `p95=0.117ms`, `avg=0.068ms`
- run5: `p50=0.053ms`, `p95=0.094ms`, `avg=0.065ms`

基线快照 5 轮：

- run1: `p50=0.074ms`, `p95=0.147ms`, `avg=0.089ms`
- run2: `p50=0.069ms`, `p95=0.115ms`, `avg=0.081ms`
- run3: `p50=0.071ms`, `p95=0.119ms`, `avg=0.083ms`
- run4: `p50=0.072ms`, `p95=0.125ms`, `avg=0.088ms`
- run5: `p50=0.073ms`, `p95=0.131ms`, `avg=0.089ms`

5 轮中位：

- 当前实现：`p50=0.055ms`, `p95=0.105ms`, `avg=0.068ms`
- 基线快照：`p50=0.072ms`, `p95=0.125ms`, `avg=0.088ms`

相对变化：

- `p50`: `-0.017ms`
- `p95`: `-0.020ms`
- `avg`: `-0.020ms`

## 裁决

- 分类：`accepted_with_evidence`
- 原因：
  - RED 在基线快照里可复放
  - 当前 HEAD 的最小相关测试与 `typecheck:test` 都是绿灯
  - targeted perf 继续给出同方向正收益，且幅度高于 2026-03-15 首轮记录

## 本次落盘范围

- 保留：这份 dated note
- 不新增运行时代码
- 不改动既有 `P0-1` 实现提交
