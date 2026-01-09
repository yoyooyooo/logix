# 084 · TL;DR（Loader Spy：依赖证据采集，report-only）

目标：在受控加载/构造窗口 best-effort 采集 `$.use(Tag)` 的依赖使用证据，输出 `SpyEvidenceReport@v1`；证据只用于解释/建议/校验输入，严格不作权威。

关键裁决（已回灌到 plan/spec/tasks/contracts）：

- Node-only Harness（平台/CI/CLI），浏览器侧只消费报告。
- “禁 IO”为契约要求但无法硬性证明；必须输出 `coverage.limitations` 与 violations（best-effort）。
- `usedServices[]` 去重但保留 `occurrences` 聚合计数（不记录逐次调用明细）。

下一步：M2 达标后再进入实现（080 的硬前置）；实现落点主要在 `BoundApiRuntime.$.use` 插桩与 `internal/observability/spy/*`。

