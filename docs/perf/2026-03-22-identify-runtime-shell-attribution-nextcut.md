# 2026-03-22 · runtime-shell post N-2 attribution scout（docs/evidence-only，implementation-ready）

> 后续状态更新（2026-03-22 同日）：`N-3` 已从 design-package 推进到 contract-freeze，当前结论更新为 `implementation-ready=true`，见 `docs/perf/2026-03-22-n-3-contract-freeze.md`。

## 结论类型

- `docs/evidence-only`
- `accepted_with_evidence=false`
- 本轮不保留代码改动

## 输入基线（全局链路）

- `P0-1+ dispatch-shell fresh recheck` 已关闭：5 轮中位数 `dispatch.p95=0.144ms`、`residual.avg=0.060ms`，未出现新可归因 residual。
- `P0-2 operation-empty-default-next` 已关闭：`resolve-shell noSnapshot.avg=0.626ms`、`snapshot.avg=0.256ms`，`speedup=2.442x`，未识别遗漏的最小代码切口。
- `N-1 runtime-shell.freeze` 已证伪并回滚：试探 run 相对基线出现回退，`dispatch.p95` 与 `noSnapshot.avg` 均上升。
- `N-2 runtime-shell.ledger` 已落地：Node 端 `dispatchShell.phases.light`、`resolveShell.snapshot.off`、`operationRunner.txnHotContext.off` 三段 ledger v1 与既有指标口径已对齐。

## 核心缺口（N-2 之后仍未解决）

1. ledger v1 能给出时延分布，缺少统一的 boundary decision 字段，无法稳定回答“为什么进入 noSnapshot/fallback”。
2. `resolve-shell` 与 `operationRunner` 的复用命中语义分离，链路复盘时只能并排看两套指标，无法同键聚合。
3. 在缺少 reason 协议前直接进入新结构改造，nextcut 选择仍会受主观判断影响。

## Top2 方向

### Top1（唯一建议下一线）· `N-3 runtime-shell.resolve-boundary-attribution-contract`

目标：

- 以 `runtime-shell.ledger v1` 为底座，补齐统一归因协议，把 `dispatch-shell -> resolve-shell -> operationRunner` 串成单一 decision 链。
- 固化 shell 复用口径与 `snapshot/noSnapshot` 边界，输出唯一可实施 nextcut。

proposal（仅提案，不落实现代码）：

1. ledger 协议增量（建议 `v1.1`）：
   - `resolveShell.snapshot` sample 增加 `decision.reasonCode`、`decision.boundaryClass`、`reuseKeyHash`、`shellSource`
   - `operationRunner.txnHotContext` sample 增加同口径 `decision.*` 字段，与 `resolveShell` 共用 reason 词表
2. 统一 reason 词表（初稿）：
   - `snapshot_missing`
   - `snapshot_scope_mismatch`
   - `middleware_env_mismatch`
   - `trait_config_mismatch`
   - `concurrency_policy_mismatch`
   - `diagnostics_level_escalated`
3. 内部 API 提案（仅 runtime internal）：
   - 新增统一入口 `resolveRuntimeShellBoundary(...)`
   - 返回 `mode`、`reasonCode`、`reuseKey`、`shellRef`
   - `dispatch-shell` 与 `operationRunner` 走同一决策返回结构

成功门（后续实施线）：

1. 生成 `ledger v1.1` 工件，并保持旧指标名兼容。
2. `noSnapshot` 与 `fallback` 样本里，`reasonCode` 覆盖率 `>=95%`。
3. 输出 1 个唯一 nextcut，包含 `cutId + 主落点 + 成功门 + 失败门 + 回滚条件`。

失败门（后续实施线）：

- reason 分布无法形成稳定 Top1（头部占比持续 `<35%`），则降级为 Top2 并继续 docs-only。
- reason 覆盖率不足或字段口径漂移，立即停止进入结构改造。

API 变动判断：

- 本线默认不改 public API。
- 若 reason 协议显示需要对外暴露策略语义，再单开 API proposal。

### Top2（次选）· `N-0 runtime-shell.noSnapshot.shrink`

保留理由：

- `noSnapshot.avg` 与 `snapshot.avg` 仍有显著差距，仍然存在收益面。

暂不作为唯一下一线的原因：

- 当前缺统一 reason 协议，直接压缩 `noSnapshot` 边界会放大归因不确定性。

## 唯一建议下一线

`N-3 runtime-shell.resolve-boundary-attribution-contract`

理由：

1. 同时覆盖归因协议、shell 复用口径、`snapshot/noSnapshot` 边界三类问题。
2. 不触碰 `N-1/N-2` 已落地结论，能在现有证据链上增量推进。
3. 能把后续实现线从“试探式切口”收敛到“可证伪、可回滚”的单一切口。

## 本轮落盘与证据

- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.summary.md`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-22-identify-runtime-shell-attribution-nextcut.evidence.json`
