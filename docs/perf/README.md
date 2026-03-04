# Perf Docs（长期维护）

这里是性能维护专题区，目标是让后续 agent 可以直接拿结论继续推进，而不是从零分析。

注意：正式 perf 证据（PerfReport/PerfDiff）仍归档在 `specs/<id>/perf/`，本目录负责“结论、约束、路线、执行手册”。

## 当前主线（无存量用户）

- `05-forward-only-vnext-plan.md`
  - 在“零存量用户”前提下的唯一主线方案（破坏式收敛 + API vNext + 执行波次）。

## 专题导航（先读）

- `01-architecture-keep-vs-change.md`
  - 明确哪些架构/语义不建议改，哪些必须改。
- `02-externalstore-bottleneck-map.md`
  - `externalStore.ingest.tickNotify` 的热路径分解与已确认瓶颈。
- `03-next-stage-major-cuts.md`
  - 下一阶段定向大改（A/B/C/D）与 API forward-only 演进方案。
- `04-agent-execution-playbook.md`
  - 后续 agent 直接执行用：步骤、命令、门禁、回写要求。

## 时间线记录（按日期回看）

- `2026-03-04-s2-kernel-perf-cuts.md`
  - S2 已完成切刀与验证记录。
- `2026-03-04-next-cut-analysis.md`
  - 本轮“下一刀”分析快照（时间点结论）。
