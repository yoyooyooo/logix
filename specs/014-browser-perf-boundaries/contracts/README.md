# Contracts: 014 浏览器压测报告（Perf Report / Diff）

本目录保留 014 spec 对“可对比证据”契约的镜像与说明；契约 SSoT 统一为 `@logixjs/perf-evidence/assets/schemas/*`（物理：`.codex/skills/logix-perf-evidence/assets/schemas/*`）：

- `schemas/perf-report.schema.json`：浏览器端边界地图报告（JSON）schema（含 meta / 统计口径 / 维度结果 / 阈值 / unavailable 口径）。
- `schemas/perf-diff.schema.json`：两份报告的差异摘要 schema（用于回归定位与归因线索）。

补充约定（关键字段）：

- `meta.config.stability`：重复运行容忍阈值（用于噪声判定与提示）。
- `suites[].points[].evidence`：非时间类证据（cache 统计、cut-off 计数等；不可得需 `unavailableReason`）。
- `suites[].thresholds[].recommendations`：越界/回归时的手动杠杆提示（结构化 id + title）。
- `suites[].comparisons`：用于表达 diagnostics overhead 等“跨点对比”的派生结果（ratio/delta）。

约定：

- schema 的 `schemaVersion` 发生 breaking change 时，必须同步更新：
  - `specs/014-browser-perf-boundaries/spec.md` 的口径描述；
  - diff 工具与 `perf.md` 的固化流程说明（以及 `@logixjs/perf-evidence/assets/schemas/*`）；
  - 需要的话补迁移说明（不保留兼容层）。
