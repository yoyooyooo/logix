# 2026-03-21 · externalstore-threshold-localize-v4（docs/evidence-only）

## 任务目标

- 基于母线 `probe_next_blocker --json` 回到 `externalStore.ingest.tickNotify / full/off<=1.25` 的事实，做一轮 fresh localize。
- 先判定是真实运行时瓶颈还是门禁噪声；只有存在最小且可归因收益时才保留实现改动。

## 执行范围与约束

- 本轮仅落盘证据与文档，未保留 runtime 代码改动。
- 未改 matrix / threshold 定义。
- 工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.externalstore-threshold-localize-v4`
- 分支：`agent/v4-perf-externalstore-threshold-localize-v4`

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.probe-mixed-scan.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.focused-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-21-externalstore-threshold-localize-v4.focused-tests.txt`

## 结果摘要

1. `probe-next-blocker` 单次可直接命中 `blocked`，失败预算仍是 `full/off<=1.25`，`first_fail_level=128`。
2. `probe-wave`（5 轮）结果是 `5 clear`。
3. `probe-mixed-scan` 在 2 轮内同时观测到 `clear` 与 `blocked(first_fail_level=256)`。
4. focused 7 轮里 `fail_count=4`，失败层级在 `128/256/512` 漂移，未形成稳定单层级失败。

## 四分法分类

- 真实运行时瓶颈：未识别出可稳定复现、可单点归因的新瓶颈。
- 证据语义错误：本轮无新增语义错误结论。
- 门禁噪声：`externalStore.ingest.tickNotify / full/off<=1.25` 继续归类 `edge_gate_noise`。
- 已解决项回归：未观察到 `runtimeStore.noTearing.tickNotify` 与 `form.listScopeCheck` 回归。

## 裁决

- 本轮采用 `docs/evidence-only` 收口。
- 不开新的 runtime 实施线。
- 维持 `current-head=clear_unstable` 与 `edge_gate_noise` 口径。

## 复开条件

- 仅当 future fresh probe 连续稳定 `blocked`，并持续锁定同一预算与同一失败层级，才重开 runtime 切口。

