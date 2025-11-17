# Research: 050 core-ng 整型桥（Integer Bridge）

本 research 收敛整型化链路的关键裁决，重点是避免“半成品态”负优化与 id 不稳定导致的证据链断裂。

## Decision 0：整型化的落点顺序

**Chosen**：先把 converge/txn/dirtyset 的最热路径打穿（无 split/join 往返 + light 零分配 recording），再扩面到更多链路；每次切换默认前必须有 before/after/diff 证据。

## Decision 1：FieldPath 的表示与事务内禁止往返

**Chosen**：事务流水线必须允许透传 FieldPath（segments）；string 仅作为输入/显示，事务窗口内禁止 join→split 往返。

## Decision 2：id 的稳定性与可解释性

**Chosen**：id 必须可解释（light/full 可映射回可读信息），并在对照验证与证据中可复核；不得依赖随机/时间默认锚点。优先在 module assembly/compile 阶段预注册静态 FieldPaths/Steps（保证可重复对齐），运行期只做 O(segments) 查表。

## Decision 3：证据门禁（Node + Browser）

**Chosen**：

- 口径：以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为唯一 SSoT；交付结论必须 `profile=default`（或 `soak`）。
- 可比性：before/after 必须 `meta.matrixId/matrixHash` 一致；`pnpm perf diff` 的 `meta.comparability.comparable=true` 才允许下硬结论。
- 判据：`pnpm perf diff` 输出 `summary.regressions==0` 视为 Gate PASS；否则 Gate FAIL。
- 采集隔离：代码前后对比必须在独立 worktree/目录采集 before/after；混杂改动结果仅作线索。
- 覆盖：Browser 跑 matrix `priority=P1`；Node 至少跑 `converge.txnCommit`（`pnpm perf bench:traitConverge:node`）。

## Decision 4：动态/异常路径的处理（显式降级）

**Chosen**：动态/异常路径允许存在，但必须显式降级为 `dirtyAll=true` 并携带 `DirtyAllReason`（Slim、可序列化）；在 perf gate 覆盖场景中若出现该降级，视为 FAIL（必须先收敛/证据化再切默认）。

## Decision 5：bitset 清零策略（先简单、后证据化）

**Chosen**：默认先用最简单可证据化策略（例如每次事务 `fill(0)` 清零），只有当 perf evidence 显示清零成本主导时才引入 touched-words 等优化，并用 microbench 证明收益。

## Decision 6：半成品态 guardrails（出现即失败）

**Chosen**：必须补充守护测试/微基准，确保 txn/exec 热循环内不再出现 `split/join` 往返或 `id→string→split`；一旦出现视为 Gate FAIL。
