# 2026-03-19 · Current Probe Stability Audit v2

## 结论

`clear_unstable`

## 审计范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.current-probe-stability-v2`
- branch：`agent/v4-perf-current-probe-stability-v2`
- 命令：连续 5 轮 `python3 fabfile.py probe_next_blocker --json`
- 联合 gate 基线：
  - `externalStore.ingest.tickNotify`: `full/off<=1.25`，`minDeltaMs=0.6`
  - `form.listScopeCheck`: `auto<=full*1.05`，`minDeltaMs=0.11`
- 证据落盘：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r1.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r2.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r3.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r4.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-probe-stability-v2.r5.json`

## 5 轮结果摘要

| 轮次 | status | blocker suite | pending | threshold anomalies | 关键信息 |
| --- | --- | --- | --- | --- | --- |
| r1 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |
| r2 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |
| r3 | `blocked` | `externalStore.ingest.tickNotify` | `2` | `1` | `full/off<=1.25` 在 `watchers=128` 触发 `firstFailLevel=128` |
| r4 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |
| r5 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |

补充观察：
- `r1/r2/r4/r5` 三条默认 probe suite 全部通过，`threshold_anomalies=[]`。
- `r3` 在首个 suite `externalStore.ingest.tickNotify` 失败后即停，`pending` 留下 `runtimeStore.noTearing.tickNotify` 与 `form.listScopeCheck`。
- 本轮出现 `clear` 与 `blocked` 交替，波动点集中在 `externalStore.ingest.tickNotify` 的相对预算门。

## 分类判定依据

本次三选一判定为 `clear_unstable`，依据如下：
1. 5 轮中有 1 轮 `status=blocked`，未达到连续清空条件。
2. `blocked` 轮次只出现在 `externalStore.ingest.tickNotify`，失败类型为 `threshold`，预算为 `full/off<=1.25`，`firstFailLevel=128`。
3. 其余 4 轮为 `clear`，说明当前 head 具备可清空能力，但稳定性不足以进入 `clear_stable`。

## 对 routing 的影响

1. current-head 分类维持 `clear_unstable`。
2. 现阶段继续维持 `docs/evidence-only` 收口，默认不新开 runtime 代码切口。
3. `README / 06 / 07` 已同步到 `clear_unstable` 口径。
