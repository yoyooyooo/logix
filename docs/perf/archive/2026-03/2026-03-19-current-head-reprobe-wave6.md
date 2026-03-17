# 2026-03-19 · Current-Head Fresh Reprobe Wave6

## 结论

`clear_unstable`

## 审计范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.current-head-reprobe-wave6`
- branch：`agent/v4-perf-current-head-reprobe-wave6`
- HEAD：`531ca9ca4decfcd53272db1467314815354ea061`
- 基线：当前母线 HEAD（已包含 `selectorTopicEligible`） fresh 重测
- 依赖准备：先执行 `pnpm install --frozen-lockfile`
- 命令：连续 5 轮 `python3 fabfile.py probe_next_blocker --json`
- 证据落盘：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave6.r1.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave6.r2.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave6.r3.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave6.r4.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-wave6.r5.json`

## 5 轮结果摘要

| 轮次 | status | blocker suite | pending | threshold anomalies | 关键信息 |
| --- | --- | --- | --- | --- | --- |
| r1 | `blocked` | `externalStore.ingest.tickNotify` | `2` | `1` | `full/off<=1.25` 触发异常，`firstFailLevel=512`，`maxLevel=256` |
| r2 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |
| r3 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |
| r4 | `blocked` | `externalStore.ingest.tickNotify` | `2` | `1` | `full/off<=1.25` 触发异常，`firstFailLevel=128` |
| r5 | `clear` | `-` | `0` | `0` | 三条默认 probe suite 全部 `passed` |

补充观察：
- `blocked` 轮次都在第一个 suite `externalStore.ingest.tickNotify` 停止，后续 `runtimeStore.noTearing.tickNotify` 与 `form.listScopeCheck` 进入 `pending`。
- `clear` 轮次都能完整跑完三条默认 suite，且 `threshold_anomalies=[]`。
- 波动点集中在 `externalStore.ingest.tickNotify` 的相对预算 `full/off<=1.25`。

## 分类判定依据

本次三选一判定为 `clear_unstable`，依据如下：
1. 5 轮中存在 `clear`（r2/r3/r5），不满足 `still_blocked`。
2. 5 轮中存在 `blocked`（r1/r4），不满足 `clear_stable`。
3. 同口径命令下 `clear` 与 `blocked` 交替出现，符合“可清空但不稳定”的 `clear_unstable`。

## 对 routing 的影响

1. 当前 fresh reprobe 结果从上轮 `clear_stable` 退化为 `clear_unstable`。
2. 建议回母线同步 routing 口径（README/06/07）到本轮结论，避免事实源漂移。
3. 现阶段维持 `docs/evidence-only`，默认不开新 runtime 实施线。
