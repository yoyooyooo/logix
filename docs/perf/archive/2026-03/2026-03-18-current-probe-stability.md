# 2026-03-18 · Current Probe Stability Audit

## 结论

`clear_unstable`

## 审计范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.current-probe-stability`
- branch：`agent/v4-perf-current-probe-stability`
- 命令：连续 5 轮 `python3 fabfile.py probe_next_blocker --json`
- 基线：`externalStore.ingest.tickNotify` 仍按 `full/off<=1.25 (minDeltaMs=0.6)` 口径执行
- 证据落盘：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-18-current-probe-stability.r1.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-18-current-probe-stability.r2.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-18-current-probe-stability.r3.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-18-current-probe-stability.r4.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-18-current-probe-stability.r5.json`

## 5 轮结果摘要

| 轮次 | status | blocker suite | failure_kind | 关键信息 |
| --- | --- | --- | --- | --- |
| r1 | `clear` | `-` | `-` | 三条默认 probe suite 全绿 |
| r2 | `clear` | `-` | `-` | 三条默认 probe suite 全绿 |
| r3 | `blocked` | `form.listScopeCheck` | `threshold` | `auto<=full*1.05` 在 `diagnostics=light` 处失败（`firstFailLevel=100`, `maxLevel=30`） |
| r4 | `blocked` | `form.listScopeCheck` | `threshold` | `auto<=full*1.05` 在 `diagnostics=off` 处失败（`firstFailLevel=30`, `maxLevel=10`） |
| r5 | `clear` | `-` | `-` | 三条默认 probe suite 全绿 |

补充观察：
- 五轮都能执行到阈值判定阶段，`externalStore.ingest.tickNotify` 与 `runtimeStore.noTearing.tickNotify` 在 5 轮里均未成为 blocker。
- 波动集中在 `form.listScopeCheck`，表现为同一预算在不同 diagnostics 维度偶发跌出门限。

## 分类判定依据

本次三选一判定为 `clear_unstable`，依据如下：
1. 5 轮中存在 `clear`（r1/r2/r5），因此不满足 `still_blocked`。
2. 5 轮中存在 `blocked`（r3/r4），且 blocker 为真实阈值失败，不满足 `clear_stable`。
3. `blocked` 与 `clear` 在同口径命令下交替出现，符合“可清空但不稳定”的 `clear_unstable`。

## 对 routing 的影响

1. 当前仍不建议重开新代码切口，先按同口径继续做稳定性复测与证据积累。
2. routing 口径从“环境阻塞”切换为“current-head clear_unstable，波动点在 form.listScopeCheck 阈值门”。
3. `README / 06 / 07` 已同步更新到同一分类口径。
