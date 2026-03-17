# 2026-03-20 · externalstore-threshold-localize-v3（docs/evidence-only）

## 任务目标

- 基于母线 `v4-perf@7905c21a` 的 fresh probe 已回到 `blocked` 事实，定位 `externalStore.ingest.tickNotify` 当前失败是 runtime 真税还是阈值噪声。
- 若无可稳定证明的最小真实收益，则按 docs/evidence-only 收口。

## 执行范围与约束

- 本轮仅保留证据与文档回写。
- 最终未保留任何 runtime 实现改动。
- matrix / threshold 定义未改动。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.probe-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.focused-wave.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-externalstore-threshold-localize-v3.focused-tests.txt`

## 结果摘要

1. 单次 probe 可出现 `status=clear`，也可回到 `status=blocked`。
2. fresh probe wave（5 轮）结果：`2 blocked + 3 clear`，blocked 均为 `externalStore.ingest.tickNotify`，失败预算为 `full/off<=1.25`，`first_fail_level=128`。
3. focused wave（7 轮）结果：`2` 轮出现 `first_fail_level!=null`，其余轮次通过；`watchers=128` 的 `full-off` 平均差值约 `0.286ms`，均值低于 `minDeltaMs=0.6`，但离散样本仍可能跨过门限。

## 四分法分类

- 真实运行时瓶颈：未新增可稳定复现的主线瓶颈。
- 证据语义错误：本轮无新增语义错误结论。
- 门禁噪声：`externalStore.ingest.tickNotify / full/off<=1.25` 继续归类为 `edge_gate_noise`。
- 已解决项回归：未观察到 `runtimeStore.noTearing.tickNotify` 相关回归。

## 裁决

- 采用 `docs/evidence-only` 收口。
- 不开新的 runtime 实施线。
- 保持 `current-head=clear_unstable` 口径。

## 复开条件

- 仅当 future fresh probe 连续稳定 blocked，且失败持续锁定同一层级与同一预算，再重开 runtime 代码切口。
