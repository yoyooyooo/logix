# 2026-03-22 · D-5-min diagnostics cost-class protocol + gate-plane split summary

## 决策

- 实施切口：`D-5-min`
- 标题：`Diagnostics Cost-Class Protocol + Gate Plane Split`
- 结论类型：`accepted_with_evidence`
- 是否保留代码：`是`

## 证据摘要

1. `RuntimeDebugEventRef` 与 `DevtoolsHub.exportBudget` 已带 `costClass/gateClass/samplingPolicy`
2. `devtools:projectionBudget` synthetic 事件已透传热点分类字段
3. `fabfile.py` 已完成 hard/soft split，soft anomaly 不再阻塞 `probe_next_blocker`
4. `externalStore.ingest.tickNotify / full/off<=1.25` 已标成 `gateClass=soft`，targeted suite 与整条 probe 都返回 `clear`

## 最小验证

- `pnpm -C packages/logix-core exec vitest run ...`：通过
- `pnpm -C packages/logix-devtools-react exec vitest run ...`：通过
- `python3 -m unittest test_fabfile_probe_next_blocker.py`：通过
- `pnpm -C packages/logix-react exec vitest run --project browser ...external-store-ingest...`：通过
- `python3 fabfile.py probe_next_blocker --json`：`status=clear`
- `pnpm typecheck`：通过
- `pnpm test:turbo`：失败，失败集中在母线可复现的 `@logixjs/core` 存量测试，不归因到 D-5

## 关联文档

- `docs/perf/2026-03-22-d5-diagnostics-cost-class-protocol-gate-plane-split.md`
- `docs/perf/README.md`
- `docs/perf/06-current-head-triage.md`
- `docs/perf/07-optimization-backlog-and-routing.md`
- `docs/perf/08-perf-execution-protocol.md`
