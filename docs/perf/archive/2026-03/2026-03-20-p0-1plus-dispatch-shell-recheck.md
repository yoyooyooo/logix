# 2026-03-20 · P0-1+ dispatch/txn outer-shell residual cut · fresh recheck

## 目标与约束

- worktree: `v4-perf.p0-1plus-dispatch-shell-recheck`
- branch: `agent/v4-perf-p0-1plus-dispatch-shell-recheck`
- 唯一目标：基于新母线，复核 `P0-1+ dispatch/txn outer-shell residual cut` 在 `P0-2 / G2` 后是否还有可归因 residual 可继续砍。
- 禁止重做切口：`state write`、`react controlplane`、`selector-process`。
- 本轮结论路径：docs/evidence-only。

## 最小验证（按约束执行）

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
pnpm -C packages/logix-core typecheck:test
python3 fabfile.py probe_next_blocker --json
```

落盘产物：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.validation.vitest.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.validation.typecheck.txt`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.wave5.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-p0-1plus-dispatch-shell-recheck.validation.json`

## 证据摘要

对照锚点：

- `v4-perf@97be4b0c`（母线对照锚点）
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p0-1plus-dispatch-shell.after.json`（`P0-1+` 既有贴边指标）

本轮 5 次重复采样（同命令、顺序执行）中位数：

- `dispatch.p50.ms = 0.077`
- `dispatch.p95.ms = 0.144`
- `residual.avg.ms = 0.060`
- `bodyShell.avg.ms = 0.015`

相对 `2026-03-19-p0-1plus-dispatch-shell.after.json`：

- `dispatch.p50: -0.009ms`
- `dispatch.p95: -0.010ms`
- `residual.avg: -0.003ms`
- `bodyShell.avg: -0.001ms`

`probe_next_blocker --json`：`status=clear`，三条默认 probe suite 均通过。

## 裁决

- 结果分类：`docs/evidence-only`
- `accepted_with_evidence`：`false`
- 是否继续开实现切口：`否`

理由：

1. 当前 residual 在 5 轮样本里稳定落在 `0.058~0.063ms`，没有出现可稳定放大的新税点。
2. 主要 phase（`bodyShell/asyncEscape/txnPrelude`）均与 `P0-1+` 收口量级一致，没有新增可归因突增。
3. 继续下刀需要触碰本轮禁区或跨到非允许写入文件，收益和风险不匹配。

## 明确关闭条件与重开条件

本线当前状态设为“关闭”。

仅在以下条件成立时重开：

1. 同口径 5 轮复测中，`residual.avg.ms` 中位数连续两轮 `>=0.073`（相对 `0.063` 抬升至少 `0.010ms`）。
2. 同口径 5 轮复测中，`dispatch.p95.ms` 中位数连续两轮 `>=0.184`（相对 `0.154` 抬升至少 `0.030ms`）。
3. `probe_next_blocker --json` 连续两轮出现 `blocked`，且 `failure_kind` 非 `environment`。

在重开条件不满足前，默认保持 docs/evidence-only，不新开实现线。
