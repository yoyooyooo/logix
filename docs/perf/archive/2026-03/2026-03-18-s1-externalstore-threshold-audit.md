# 2026-03-18 · S-1：externalStore threshold anomaly 三轮复核

## 目标与范围

- 目标：围绕默认 blocker `externalStore.ingest.tickNotify`，复核 `full/off<=1.25` 阈值异常是稳定 residual 还是单轮噪声。
- 约束：只做 evidence/docs 复核，不修改 runtime core、react store、perf suite、matrix budget。
- 工作区：`/Users/yoyo/Documents/code/personal/logix.worktrees/v4-perf.s1-externalstore-reprobe`。

## 执行命令

连续三轮执行同一命令，并分别落盘：

```bash
python3 fabfile.py probe_next_blocker --json
```

证据文件：

- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-externalstore-threshold-audit.r1.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-externalstore-threshold-audit.r2.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-s1-externalstore-threshold-audit.r3.json`

## 三轮结果摘要

| 轮次 | status | blocker | failure_kind | first_fail_level | returncode | 关键比值（`timePerIngestMs` p95, full/off） |
| --- | --- | --- | --- | --- | --- | --- |
| r1 | blocked | externalStore.ingest.tickNotify | threshold | 128 | 42 | watchers128=1.556, watchers256=2.000, watchers512=1.167 |
| r2 | blocked | externalStore.ingest.tickNotify | threshold | 128 | 42 | watchers128=1.333, watchers256=1.625, watchers512=1.500 |
| r3 | blocked | externalStore.ingest.tickNotify | threshold | 128 | 42 | watchers128=1.714, watchers256=1.286, watchers512=0.818 |

共同字段：

- `process_returncode=0`
- `threshold_anomaly_count=1`
- `threshold_anomalies[0].budget_id=full/off<=1.25`
- `threshold_anomalies[0].suite_id=externalStore.ingest.tickNotify`

## 裁决

结论选择：`stable blocker`（归类 residual 线）。

理由：

1. 三轮在同一 suite、同一 budget、同一 fail level（`128`）重复触发，具备稳定复现特征。
2. 阻塞来源稳定为 threshold anomaly，非环境失败、非测试执行失败。
3. 当前证据只支持 residual 线结论，尚不足以直接定位到新的 runtime core 实现切口。

## 路由动作

1. 保持 `externalStore.ingest.tickNotify` 为默认 blocker。
2. 当前阶段继续 evidence/docs 驱动，不重开 runtime core 实现线。
3. 后续若要重开实现线，前提是新增证据能把阈值异常收敛到明确实现点。

## 文档回写

本次复核已同步回写：

- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
