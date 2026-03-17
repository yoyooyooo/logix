# 2026-03-19 · Current-Head Fresh Reprobe（post p1-2-2c）

## 结论

`clear_stable`

## 审计范围

- worktree：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.current-head-reprobe-post-p1-2-2c`
- branch：`agent/v4-perf-current-head-reprobe-post-p1-2-2c`
- 依赖准备：执行 `pnpm install --frozen-lockfile` 后开始复测
- 命令：连续 5 轮 `python3 fabfile.py probe_next_blocker --json`
- 证据落盘：
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r1.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r2.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r3.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r4.json`
  - `specs/103-effect-v4-forward-cutover/perf/2026-03-19-current-head-reprobe-post-p1-2-2c.r5.json`

## 5 轮结果摘要

| 轮次 | status | blocker suite | pending | threshold anomalies | 执行 suites |
| --- | --- | --- | --- | --- | --- |
| r1 | `clear` | `-` | `0` | `0` | `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` |
| r2 | `clear` | `-` | `0` | `0` | `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` |
| r3 | `clear` | `-` | `0` | `0` | `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` |
| r4 | `clear` | `-` | `0` | `0` | `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` |
| r5 | `clear` | `-` | `0` | `0` | `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` |

补充观察：
- 5 轮都执行了同一组默认 probe suite，全部 `passed`。
- 5 轮都没有 `blocker`、`pending`、`threshold_anomalies`。

## 三类清单

- `clear_stable`：
  - `externalStore.ingest.tickNotify`
  - `runtimeStore.noTearing.tickNotify`
  - `form.listScopeCheck`
- `clear_unstable`：`[]`
- `still_blocked`：`[]`

## 对 routing 的影响

1. current-head 分类从上一轮 `clear_unstable` 更新为 `clear_stable`。
2. 默认继续 `docs/evidence-only` 收口，不新增 runtime 实施线。
3. `README / 06 / 07` 已按本轮 fresh reprobe 同步到 `clear_stable` 口径。
