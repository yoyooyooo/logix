# Research: 049 core-ng 线性执行 VM（Exec VM）

本 research 收敛 Exec VM 的关键裁决，避免实现阶段出现“看起来做了 Exec IR，但热循环仍在字符串/对象上打转”的负优化陷阱。

## Decision 0：runtime-only NG（JIT-style）为主线

**Chosen**：Exec VM 先走 runtime-only（构造期预编译），不以 AOT/工具链为前置；但工件形态必须 AOT-ready（未来可选）。

## Decision 1：热循环的绝对禁区

**Chosen**：执行 loop 内禁止：

- `split/join` 等字符串解析
- patch 对象 materialize
- 隐式数组分配（例如 rest 参数）
- diagnostics=off 下的 steps/top3/label 等诊断分配

**Rationale**：这些是最常见的“半成品态负优化”来源，必须作为硬门槛写进 tasks 与 perf evidence。

## Decision 2：证据门禁（Node + Browser）

**Chosen**：

- 口径：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）。
- 可比性：before/after 必须 `meta.matrixId/matrixHash` 一致；`pnpm perf diff` 的 `meta.comparability.comparable=true` 才允许下硬结论。
- 判据：`pnpm perf diff` 输出 `summary.regressions==0` 视为 Gate PASS；否则 Gate FAIL。
- 采集隔离：允许在同一 dev 工作区采集 before/after（可为 git dirty），但必须保证 `matrix/config/env` 一致；若出现 `stabilityWarning` / `comparable=false` / drift，必须复测并在结论中标注。
- 覆盖：Browser 跑 matrix `priority=P1`；Node 至少跑 `converge.txnCommit`（`pnpm perf bench:traitConverge:node`）。

## Decision 4：bitset 清零与 buffer 复用（先简单、后证据化）

**Chosen**：默认先用最简单可证据化策略（例如 bitset `fill(0)` 清零 + buffer pool 复用），只有当 perf evidence 显示清零/分配成本主导时才引入更复杂优化，并用 microbench 证明收益。

## Decision 5：半成品态 guardrails（出现即失败）

**Chosen**：必须补充守护测试/微基准，确保 txn/exec 热循环内不再出现 `split/join` 往返或 `id→string→split`；一旦出现视为 Gate FAIL。

## Decision 3：降级/回退策略

**Chosen**：如 Exec VM 需要降级/回退，必须是显式策略并证据化；不得成为默认隐式 fallback。能否进入 Full Cutover 由 047 Gate 判定。

## Decision 6：Node + Browser Gate 取 AND

**Chosen**：Node 与 Browser 的 diff 必须分别满足 `comparable=true && regressions==0`，任一 FAIL 则整体 Gate FAIL（不得 cherry-pick）。

## Decision 7：Exec VM evidence 原因码稳定化

**Chosen**：未命中/降级原因用稳定 `reasonCode`（枚举码），可选 `reasonDetail` 仅用于 light/full；diagnostics=off 不输出。

## Decision 8：AOT-ready 最低口径（版本 + hash）

**Chosen**：Exec IR 必须数据化/可序列化/可对比，包含 `execIrVersion` 与稳定 `execIrHash`；未来 AOT 只替换工件生产方式，不改变 schema 与证据口径。
