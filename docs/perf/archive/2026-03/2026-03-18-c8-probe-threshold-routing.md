# 2026-03-18 · C-8：probe threshold routing 修复

## 背景

`probe_next_blocker` 之前主要依赖子命令返回码判门。  
在 browser suite 进程返回 `0`、但 `LOGIX_PERF_REPORT.thresholds` 已出现阈值失败时，顶层 probe 会误报 `clear`。

本刀目标是修复控制面判门语义，只改 `fabfile.py + docs/spec`，不触碰 runtime/perf core。

## 改动摘要

1. `fabfile.py` 新增 `LOGIX_PERF_REPORT` 解析逻辑。
2. `probe_next_blocker --json` 输出新增并固化以下字段：
- `process_returncode`
- `perf_report_count`
- `threshold_anomaly_count`
- `threshold_anomalies`
- `perf_report_parse_errors`
3. 阈值判门升级：
- 当 `process_returncode=0` 且存在 `threshold_anomalies` 时，probe 统一判为 `blocked`。
- `failure_kind=threshold`，当前约定 `returncode=42`。

## 当前样本结论（current-head）

证据文件：
- `specs/103-effect-v4-forward-cutover/perf/2026-03-18-probe-next-blocker.current-head.json`

关键字段：
- `status=blocked`
- `blocker.suite_id=externalStore.ingest.tickNotify`
- `blocker.failure_kind=threshold`
- `blocker.process_returncode=0`
- `blocker.returncode=42`
- `threshold_anomalies[0].budget_id=full/off<=1.25`
- `threshold_anomalies[0].first_fail_level=256`

## 路由裁决

1. 当前默认 blocker 为 `externalStore.ingest.tickNotify` 的 threshold anomaly。
2. 该 blocker 归类为 residual/gate 复核线。
3. 下一步执行 clean comparable evidence audit。
4. 当前不重开 runtime core 实现线。

## 文档同步

本刀已同步回写：
- `docs/perf/04-agent-execution-playbook.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/08-perf-execution-protocol.md`
- `docs/perf/README.md`
