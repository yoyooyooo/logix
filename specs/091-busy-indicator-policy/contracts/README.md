# Contracts: 091 Busy Indicator Policy（busy 策略）

本特性不新增导出级 runtime 诊断事件（避免噪音与并行真相源）；busy 的可解释链路默认复用：

- 088 Async Action 的事件（pending/settle）
- 090 Resource 的生命周期事件（pending/settle/cancel/invalidate）

因此本目录仅作为 “N/A” 占位以满足 group 门槛（见 `specs/087-async-coordination-roadmap/spec.md`），不新增 `schemas/*`。

